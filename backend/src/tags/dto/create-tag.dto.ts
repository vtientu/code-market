import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CreateTagDto {
  @ApiProperty()
  @IsString()
  @MaxLength(40)
  name: string;

  @ApiProperty()
  @IsString()
  @MaxLength(50)
  slug: string;
}
