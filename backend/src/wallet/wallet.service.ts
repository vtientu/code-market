import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { paginate, PaginationDto } from '../common/dto/pagination.dto.js';
import { WithdrawDto } from './dto/withdraw.dto.js';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getBalance(userId: string) {
    const wallet = await this.prisma.prisma.wallet.findUnique({
      where: { userId },
      select: { id: true, balance: true, updatedAt: true },
    });
    if (!wallet) throw new NotFoundException('Wallet not found');
    return wallet;
  }

  async getTransactions(userId: string, query: PaginationDto) {
    const { page, limit } = query;
    const skip = (page - 1) * limit;

    const wallet = await this.prisma.prisma.wallet.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const where = { walletId: wallet.id };
    const [items, total] = await this.prisma.prisma.$transaction([
      this.prisma.prisma.walletTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.prisma.walletTransaction.count({ where }),
    ]);

    return paginate(items, total, page, limit);
  }

  async withdraw(userId: string, dto: WithdrawDto) {
    return this.prisma.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new NotFoundException('Wallet not found');

      if (Number(wallet.balance) < Number(dto.amount)) {
        throw new BadRequestException('Insufficient balance');
      }

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: Number(dto.amount) } },
      });

      return tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'WITHDRAWAL',
          amount: dto.amount,
          status: 'PENDING',
          description: dto.destination
            ? `Withdrawal to ${dto.destination}`
            : 'Withdrawal request',
        },
      });
    });
  }
}
