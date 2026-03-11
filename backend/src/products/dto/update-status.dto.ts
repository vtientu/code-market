import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateProductStatusDto {
  @ApiProperty({ enum: ['PUBLISHED', 'REJECTED'] })
  @IsEnum(['PUBLISHED', 'REJECTED'])
  status: 'PUBLISHED' | 'REJECTED';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
