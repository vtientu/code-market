import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto.js';

export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['slug'] as const),
) {}
