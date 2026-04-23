import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class MomoIpnDto {
  @IsString()
  partnerCode!: string;

  @IsString()
  orderId!: string;

  @IsString()
  requestId!: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsString()
  orderInfo!: string;

  @IsString()
  orderType!: string;

  @IsInt()
  transId!: number;

  @IsInt()
  resultCode!: number;

  @IsString()
  message!: string;

  @IsString()
  payType!: string;

  @IsInt()
  responseTime!: number;

  @IsOptional()
  @IsString()
  extraData!: string;

  @IsString()
  signature!: string;
}
