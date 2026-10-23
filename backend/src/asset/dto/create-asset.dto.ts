import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { cleanText } from '../../common/dto-transforms';

export class CreateAssetDto {
  @Transform(cleanText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @Transform(cleanText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  brand: string;

  @Transform(cleanText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  model: string;

  @Transform(cleanText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  reference: string;

  @IsOptional()
  @Transform(cleanText)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  imageUrl?: string;
}
