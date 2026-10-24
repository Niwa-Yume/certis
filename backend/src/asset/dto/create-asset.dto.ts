import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { cleanText, normalizeEmail } from '../../common/dto-transforms';

/** Inscription d'une pièce par son émetteur. */
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

  /** Gravé sur le boîtier. Jamais stocké : seule son empreinte entre dans le passeport (ADR-0005). */
  @Transform(cleanText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  serial: string;

  @IsOptional()
  @Transform(cleanText)
  @IsString()
  @MaxLength(120)
  movement?: string;

  @IsOptional()
  @Transform(cleanText)
  @IsString()
  @MaxLength(120)
  case?: string;

  @IsOptional()
  @Transform(cleanText)
  @IsString()
  @MaxLength(120)
  dial?: string;

  @IsOptional()
  @Transform(cleanText)
  @IsString()
  @MaxLength(120)
  bracelet?: string;

  @IsOptional()
  @Transform(cleanText)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  imageUrl?: string;

  /** Premier propriétaire, enregistré à la vente. Sans lui, la pièce reste dans le stock de l'émetteur. */
  @IsOptional()
  @Transform(normalizeEmail)
  @IsEmail()
  ownerEmail?: string;
}

export class ServiceDto {
  @Transform(cleanText)
  @IsString()
  @IsNotEmpty()
  @MaxLength(280)
  note: string;
}

export class SerialCheckDto {
  @IsUUID('4')
  nonce: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  serial: string;
}
