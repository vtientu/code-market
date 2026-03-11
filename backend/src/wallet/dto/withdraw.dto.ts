import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDecimal, IsOptional, IsString } from 'class-validator';

export class WithdrawDto {
  @ApiProperty({ example: '100.00' })
  @IsDecimal({ decimal_digits: '0,2' })
  amount: string;

  @ApiPropertyOptional({ description: 'Bank account or wallet address' })
  @IsOptional()
  @IsString()
  destination?: string;
}
