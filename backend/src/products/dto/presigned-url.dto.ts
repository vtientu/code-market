import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';

export class PresignedUrlDto {
  @ApiProperty()
  @IsString()
  fileName: string;

  @ApiProperty({ enum: ['source', 'image'] })
  @IsEnum(['source', 'image'])
  type: 'source' | 'image';
}
