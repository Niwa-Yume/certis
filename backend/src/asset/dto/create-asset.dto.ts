import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsUUID,
  Matches,
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

  /** URL de l'émetteur, ou photo servie par l'API (`/public/…`), qui suit l'adresse de l'API d'un appareil à l'autre. */
  @IsOptional()
  @Transform(cleanText)
  @Matches(/^(https?:\/\/\S+|\/public\/[\w./-]+)$/, {
    message: 'une adresse qui commence par https://, ou un chemin /public/…',
  })
  @MaxLength(2048)
  imageUrl?: string;

  /** Photo détourée (fond transparent) : la montre flotte sur le fond de la page. */
  @IsOptional()
  @IsBoolean()
  imageCutout?: boolean;

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
