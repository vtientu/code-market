import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class AddProductFileDto {
  @ApiProperty()
  @IsString()
  fileName: string;

  @ApiProperty()
  @IsUrl()
  fileUrl: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  fileSize: number;

  @ApiPropertyOptional({ default: '1.0.0' })
  @IsOptional()
  @IsString()
  version?: string;
}

export class AddProductImageDto {
  @ApiProperty()
  @IsUrl()
  imageUrl: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
