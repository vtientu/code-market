import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDecimal, IsOptional, IsString } from 'class-validator';

export class WithdrawDto {
  @ApiProperty({ example: '100.00' })
  @IsDecimal({ decimal_digits: '0,2' })
  amount: string;

  @ApiProperty({ example: 'Vietcombank' })
  @IsString()
  bankName: string;

  @ApiProperty({ example: '1234567890' })
  @IsString()
  bankAccount: string;

  @ApiProperty({ example: 'NGUYEN VAN A' })
  @IsString()
  accountHolder: string;

  @ApiPropertyOptional({ description: 'Optional note for this withdrawal' })
  @IsOptional()
  @IsString()
  note?: string;
}
