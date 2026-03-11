import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({
    type: [String],
    description: 'Array of product IDs to purchase',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  productIds: string[];
}
