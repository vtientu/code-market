import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';

export enum PaymentMethodEnum {
  MOMO = 'MOMO',
  VNPAY = 'VNPAY',
}

export class InitiatePaymentDto {
  @ApiProperty({ example: 'uuid-of-order' })
  @IsUUID()
  orderId!: string;

  @ApiProperty({ enum: PaymentMethodEnum })
  @IsEnum(PaymentMethodEnum)
  method!: PaymentMethodEnum;
}
