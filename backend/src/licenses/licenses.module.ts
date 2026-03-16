import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { LicensesController } from './licenses.controller.js';
import { LicensesService } from './licenses.service.js';

@Module({
  imports: [AuthModule],
  controllers: [LicensesController],
  providers: [LicensesService],
})
export class LicensesModule {}
