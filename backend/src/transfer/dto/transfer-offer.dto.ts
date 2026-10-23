import { Transform } from 'class-transformer';
import { IsEmail, IsOptional } from 'class-validator';
import { normalizeEmail } from '../../common/dto-transforms';

export class TransferOfferDto {
  // Optionnel : sans destinataire, le premier compte qui scanne le QR peut accepter.
  @IsOptional()
  @Transform(normalizeEmail)
  @IsEmail()
  recipientEmail?: string;
}
