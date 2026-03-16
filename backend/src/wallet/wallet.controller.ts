import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { WalletService } from './wallet.service.js';
import { WithdrawDto } from './dto/withdraw.dto.js';

class ProcessPayoutDto {
  @IsBoolean()
  approve: boolean;

  @IsOptional()
  @IsString()
  rejectionNote?: string;
}

@ApiTags('Wallet')
@Controller('wallet')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @Roles(Role.SELLER)
  @ApiOperation({ summary: 'Get wallet balance (Seller only)' })
  getBalance(@CurrentUser() user: Express.User) {
    return this.walletService.getBalance(user.id);
  }

  @Get('transactions')
  @Roles(Role.SELLER)
  @ApiOperation({ summary: 'Get transaction history (Seller only)' })
  getTransactions(
    @CurrentUser() user: Express.User,
    @Query() query: PaginationDto,
  ) {
    return this.walletService.getTransactions(user.id, query);
  }

  @Post('withdraw')
  @Roles(Role.SELLER)
  @ApiOperation({ summary: 'Request a withdrawal (Seller only)' })
  withdraw(@CurrentUser() user: Express.User, @Body() dto: WithdrawDto) {
    return this.walletService.withdraw(user.id, dto);
  }

  @Get('admin/payouts')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List all payout requests (Admin only)' })
  getPayoutRequests(@Query() query: PaginationDto) {
    return this.walletService.getPayoutRequests(query);
  }

  @Patch('admin/payouts/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Approve or reject a payout request (Admin only)' })
  processPayoutRequest(
    @Param('id') id: string,
    @Body() dto: ProcessPayoutDto,
  ) {
    return this.walletService.processPayoutRequest(
      id,
      dto.approve,
      dto.rejectionNote,
    );
  }
}
