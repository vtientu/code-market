import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { PaymentsController } from './payments.controller.js';
import { PaymentsService } from './payments.service.js';
import {
  MomoIpAllowlistGuard,
  VnpayIpAllowlistGuard,
} from './guards/ip-allowlist.guard.js';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, MomoIpAllowlistGuard, VnpayIpAllowlistGuard],
  exports: [PaymentsService],
})
export class PaymentsModule {}
