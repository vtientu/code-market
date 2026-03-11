import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import {
  InitiatePaymentDto,
  PaymentMethodEnum,
} from './dto/initiate-payment.dto.js';

const PLATFORM_FEE = 0.1; // 10%

interface MomoIpnBody {
  partnerCode: string;
  orderId: string;
  requestId: string;
  amount: number;
  orderInfo: string;
  orderType: string;
  transId: number;
  resultCode: number;
  message: string;
  payType: string;
  responseTime: number;
  extraData: string;
  signature: string;
}

interface VnpayReturnQuery {
  vnp_TxnRef?: string;
  vnp_ResponseCode?: string;
  vnp_TransactionNo?: string;
  vnp_SecureHash?: string;
  [key: string]: string | undefined;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  // ─── Initiate ────────────────────────────────────────────────────────────────

  async initiatePayment(
    buyerId: string,
    dto: InitiatePaymentDto,
    ipAddress: string,
  ) {
    const order = await this.prisma.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { payment: true },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.buyerId !== buyerId)
      throw new ForbiddenException('Access denied');
    if (order.status !== 'PENDING') {
      throw new BadRequestException('Order is not in PENDING status');
    }

    // Reuse existing PENDING payment or create a new one
    let payment = order.payment;
    if (payment && payment.status === 'COMPLETED') {
      throw new BadRequestException('Order is already paid');
    }
    if (!payment) {
      payment = await this.prisma.prisma.payment.create({
        data: {
          orderId: order.id,
          amount: order.totalAmount,
          method: dto.method as 'MOMO' | 'VNPAY',
          status: 'PENDING',
        },
      });
    }

    const payUrl =
      dto.method === PaymentMethodEnum.MOMO
        ? await this.buildMomoUrl(payment.id, Number(order.totalAmount))
        : this.buildVnpayUrl(payment.id, Number(order.totalAmount), ipAddress);

    return { paymentId: payment.id, payUrl };
  }

  // ─── MoMo ────────────────────────────────────────────────────────────────────

  private async buildMomoUrl(
    paymentId: string,
    amount: number,
  ): Promise<string> {
    const partnerCode = this.config.getOrThrow<string>('MOMO_PARTNER_CODE');
    const accessKey = this.config.getOrThrow<string>('MOMO_ACCESS_KEY');
    const secretKey = this.config.getOrThrow<string>('MOMO_SECRET_KEY');
    const apiUrl = this.config.getOrThrow<string>('MOMO_API_URL');
    const redirectUrl = this.config.getOrThrow<string>('MOMO_REDIRECT_URL');
    const ipnUrl = this.config.getOrThrow<string>('MOMO_IPN_URL');

    const requestId = `${partnerCode}${Date.now()}`;
    const orderInfo = `Payment for order ${paymentId}`;
    const requestType = 'captureWallet';
    const extraData = '';

    const rawSignature = [
      `accessKey=${accessKey}`,
      `amount=${amount}`,
      `extraData=${extraData}`,
      `ipnUrl=${ipnUrl}`,
      `orderId=${paymentId}`,
      `orderInfo=${orderInfo}`,
      `partnerCode=${partnerCode}`,
      `redirectUrl=${redirectUrl}`,
      `requestId=${requestId}`,
      `requestType=${requestType}`,
    ].join('&');

    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');

    const body = {
      partnerCode,
      accessKey,
      requestId,
      amount,
      orderId: paymentId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      extraData,
      requestType,
      signature,
      lang: 'vi',
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new InternalServerErrorException('Failed to create MoMo payment');
    }

    const data = (await response.json()) as {
      payUrl?: string;
      resultCode: number;
      message: string;
    };
    if (data.resultCode !== 0 || !data.payUrl) {
      throw new InternalServerErrorException(`MoMo error: ${data.message}`);
    }

    return data.payUrl;
  }

  async handleMomoWebhook(body: MomoIpnBody): Promise<{ message: string }> {
    const secretKey = this.config.getOrThrow<string>('MOMO_SECRET_KEY');
    const accessKey = this.config.getOrThrow<string>('MOMO_ACCESS_KEY');

    const rawSignature = [
      `accessKey=${accessKey}`,
      `amount=${body.amount}`,
      `extraData=${body.extraData}`,
      `message=${body.message}`,
      `orderId=${body.orderId}`,
      `orderInfo=${body.orderInfo}`,
      `orderType=${body.orderType}`,
      `partnerCode=${body.partnerCode}`,
      `payType=${body.payType}`,
      `requestId=${body.requestId}`,
      `responseTime=${body.responseTime}`,
      `resultCode=${body.resultCode}`,
      `transId=${body.transId}`,
    ].join('&');

    const expected = crypto
      .createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');

    if (expected !== body.signature) {
      this.logger.warn(
        `MoMo IPN invalid signature for orderId=${body.orderId}`,
      );
      return { message: 'Invalid signature' };
    }

    if (body.resultCode === 0) {
      await this.processPaymentSuccess(body.orderId, String(body.transId));
    } else {
      await this.markPaymentFailed(body.orderId);
    }

    return { message: 'OK' };
  }

  async handleMomoReturn(query: Record<string, string>) {
    // Return URL is for UI redirect — just surface the status
    const paymentId = query['orderId'];
    if (!paymentId) return { status: 'unknown' };

    const payment = await this.prisma.prisma.payment.findUnique({
      where: { id: paymentId },
      select: { status: true, orderId: true },
    });

    return { status: payment?.status ?? 'unknown', orderId: payment?.orderId };
  }

  // ─── VNPay ───────────────────────────────────────────────────────────────────

  private buildVnpayUrl(
    paymentId: string,
    amount: number,
    ipAddr: string,
  ): string {
    const tmnCode = this.config.getOrThrow<string>('VNPAY_TMN_CODE');
    const hashSecret = this.config.getOrThrow<string>('VNPAY_HASH_SECRET');
    const vnpUrl = this.config.getOrThrow<string>('VNPAY_URL');
    const returnUrl = this.config.getOrThrow<string>('VNPAY_RETURN_URL');

    const now = new Date();
    const createDate = this.formatVnpayDate(now);
    const expireDate = this.formatVnpayDate(
      new Date(now.getTime() + 15 * 60 * 1000),
    );

    const params: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Amount: String(Math.round(amount * 100)),
      vnp_CreateDate: createDate,
      vnp_CurrCode: 'VND',
      vnp_IpAddr: ipAddr,
      vnp_Locale: 'vn',
      vnp_OrderInfo: `Payment ${paymentId}`,
      vnp_OrderType: 'other',
      vnp_ReturnUrl: returnUrl,
      vnp_TxnRef: paymentId,
      vnp_ExpireDate: expireDate,
    };

    const sorted = Object.keys(params)
      .sort()
      .reduce<Record<string, string>>((acc, key) => {
        acc[key] = params[key]!;
        return acc;
      }, {});

    const signData = new URLSearchParams(sorted).toString();
    const hmac = crypto
      .createHmac('sha512', hashSecret)
      .update(signData)
      .digest('hex');

    return `${vnpUrl}?${signData}&vnp_SecureHash=${hmac}`;
  }

  async handleVnpayWebhook(
    query: VnpayReturnQuery,
  ): Promise<{ RspCode: string; Message: string }> {
    const hashSecret = this.config.getOrThrow<string>('VNPAY_HASH_SECRET');
    const secureHash = query['vnp_SecureHash'];

    const filtered = { ...query };
    delete filtered['vnp_SecureHash'];
    delete filtered['vnp_SecureHashType'];

    const sorted = Object.keys(filtered)
      .sort()
      .reduce<Record<string, string>>((acc, key) => {
        if (filtered[key] !== undefined) acc[key] = filtered[key]!;
        return acc;
      }, {});

    const signData = new URLSearchParams(sorted).toString();
    const expected = crypto
      .createHmac('sha512', hashSecret)
      .update(signData)
      .digest('hex');

    if (expected !== secureHash) {
      this.logger.warn(
        `VNPay IPN invalid checksum for txnRef=${query['vnp_TxnRef']}`,
      );
      return { RspCode: '97', Message: 'Invalid checksum' };
    }

    const paymentId = query['vnp_TxnRef'];
    const responseCode = query['vnp_ResponseCode'];
    const transactionNo = query['vnp_TransactionNo'];

    if (!paymentId) return { RspCode: '01', Message: 'Missing TxnRef' };

    if (responseCode === '00') {
      await this.processPaymentSuccess(paymentId, transactionNo ?? paymentId);
    } else {
      await this.markPaymentFailed(paymentId);
    }

    return { RspCode: '00', Message: 'Confirm Success' };
  }

  async handleVnpayReturn(query: VnpayReturnQuery) {
    const paymentId = query['vnp_TxnRef'];
    if (!paymentId) return { status: 'unknown' };

    const payment = await this.prisma.prisma.payment.findUnique({
      where: { id: paymentId },
      select: { status: true, orderId: true },
    });

    return { status: payment?.status ?? 'unknown', orderId: payment?.orderId };
  }

  // ─── Shared transaction logic ─────────────────────────────────────────────────

  private async processPaymentSuccess(paymentId: string, gatewayRef: string) {
    const payment = await this.prisma.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        order: {
          include: {
            buyer: { select: { id: true, username: true } },
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    title: true,
                    price: true,
                    sellerId: true,
                    slug: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!payment) {
      this.logger.warn(`processPaymentSuccess: payment ${paymentId} not found`);
      return;
    }

    if (payment.status === 'COMPLETED') {
      this.logger.warn(`Payment ${paymentId} already completed — skipping`);
      return;
    }

    const { order } = payment;

    await this.prisma.prisma.$transaction(async (tx) => {
      // 1. Mark payment COMPLETED
      await tx.payment.update({
        where: { id: paymentId },
        data: { status: 'COMPLETED', gatewayRef, paidAt: new Date() },
      });

      // 2. Mark order PAID
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'PAID' },
      });

      // 3. Credit sellers
      for (const item of order.items) {
        const sellerAmount = Number(item.product.price) * (1 - PLATFORM_FEE);

        const wallet = await tx.wallet.findUnique({
          where: { userId: item.product.sellerId },
          select: { id: true },
        });

        if (!wallet) continue;

        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: sellerAmount } },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'EARNING',
            amount: sellerAmount.toFixed(2),
            status: 'COMPLETED',
            description: `Sale of "${item.product.title}"`,
          },
        });
      }

      // 4. Clear buyer cart for purchased products
      await tx.cartItem.deleteMany({
        where: {
          userId: order.buyerId,
          productId: { in: order.items.map((i) => i.product.id) },
        },
      });

      // 5. Update product totalSales
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.product.id },
          data: { totalSales: { increment: 1 } },
        });
      }
    });

    // 6. Notifications (outside transaction — non-critical)
    await this.notifications.createNotification(
      order.buyerId,
      'Payment confirmed',
      `Your payment for order has been confirmed.`,
      `/orders/${order.id}`,
    );

    const sellerIds = [...new Set(order.items.map((i) => i.product.sellerId))];
    for (const sellerId of sellerIds) {
      const sellerItems = order.items.filter(
        (i) => i.product.sellerId === sellerId,
      );
      const titles = sellerItems.map((i) => i.product.title).join(', ');
      await this.notifications.createNotification(
        sellerId,
        'New sale!',
        `You sold: ${titles}`,
        `/wallet`,
      );
    }
  }

  private async markPaymentFailed(paymentId: string) {
    await this.prisma.prisma.payment
      .update({
        where: { id: paymentId },
        data: { status: 'FAILED' },
      })
      .catch((err: unknown) => {
        this.logger.error(`Failed to mark payment ${paymentId} as FAILED`, err);
      });
  }

  // ─── Query ────────────────────────────────────────────────────────────────────

  async getPaymentByOrder(buyerId: string, orderId: string) {
    const order = await this.prisma.prisma.order.findUnique({
      where: { id: orderId },
      select: { buyerId: true, payment: true },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.buyerId !== buyerId)
      throw new ForbiddenException('Access denied');
    if (!order.payment)
      throw new NotFoundException('Payment not found for this order');

    return order.payment;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private formatVnpayDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
      `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
    );
  }
}
