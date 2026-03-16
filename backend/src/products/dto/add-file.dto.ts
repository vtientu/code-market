import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class AddProductVersionDto {
  @ApiProperty({ example: '1.0.0' })
  @IsString()
  versionNumber: string;

  @ApiPropertyOptional({ description: 'Changelog for this version' })
  @IsOptional()
  @IsString()
  changelog?: string;

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
