import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PaymentsService } from './payments.service.js';
import { InitiatePaymentDto } from './dto/initiate-payment.dto.js';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate a payment and get gateway redirect URL' })
  async initiate(
    @CurrentUser() user: Express.User,
    @Body() dto: InitiatePaymentDto,
    @Req() req: Request,
  ) {
    const ip =
      (req.headers['x-forwarded-for'] as string | undefined)
        ?.split(',')[0]
        ?.trim() ??
      req.socket.remoteAddress ??
      '127.0.0.1';
    return this.paymentsService.initiatePayment(user.id, dto, ip);
  }

  @Post('webhook/momo')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'MoMo IPN webhook handler (signature verified)' })
  handleMomoWebhook(@Body() body: Record<string, unknown>) {
    return this.paymentsService.handleMomoWebhook(
      body as unknown as Parameters<PaymentsService['handleMomoWebhook']>[0],
    );
  }

  @Post('webhook/vnpay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'VNPay IPN webhook handler (checksum verified)' })
  handleVnpayWebhook(@Query() query: Record<string, string>) {
    return this.paymentsService.handleVnpayWebhook(query);
  }

  @Get('return/momo')
  @ApiOperation({ summary: 'MoMo redirect return URL' })
  handleMomoReturn(@Query() query: Record<string, string>) {
    return this.paymentsService.handleMomoReturn(query);
  }

  @Get('return/vnpay')
  @ApiOperation({ summary: 'VNPay redirect return URL' })
  handleVnpayReturn(@Query() query: Record<string, string>) {
    return this.paymentsService.handleVnpayReturn(query);
  }

  @Get(':orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment status for an order' })
  getPaymentByOrder(
    @CurrentUser() user: Express.User,
    @Param('orderId') orderId: string,
  ) {
    return this.paymentsService.getPaymentByOrder(user.id, orderId);
  }
}
