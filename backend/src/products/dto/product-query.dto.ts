import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsDecimal,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

export class ProductQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @Transform(({ value }: { value: string | string[] }) =>
    Array.isArray(value) ? value : [value],
  )
  tagIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  minPrice?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  maxPrice?: string;

  @ApiPropertyOptional({
    enum: ['price', 'rating', 'totalSales', 'createdAt'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsEnum(['price', 'rating', 'totalSales', 'createdAt'])
  sortBy?: 'price' | 'rating' | 'totalSales' | 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
