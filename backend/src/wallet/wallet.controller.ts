import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@generated/prisma/client.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { WalletService } from './wallet.service.js';
import { WithdrawDto } from './dto/withdraw.dto.js';

@ApiTags('Wallet')
@Controller('wallet')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SELLER)
@ApiBearerAuth()
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @ApiOperation({ summary: 'Get wallet balance (Seller only)' })
  getBalance(@CurrentUser() user: Express.User) {
    return this.walletService.getBalance(user.id);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get transaction history (Seller only)' })
  getTransactions(
    @CurrentUser() user: Express.User,
    @Query() query: PaginationDto,
  ) {
    return this.walletService.getTransactions(user.id, query);
  }

  @Post('withdraw')
  @ApiOperation({ summary: 'Request a withdrawal (Seller only)' })
  withdraw(@CurrentUser() user: Express.User, @Body() dto: WithdrawDto) {
    return this.walletService.withdraw(user.id, dto);
  }
}
