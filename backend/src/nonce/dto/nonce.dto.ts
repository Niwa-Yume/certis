import { IsUUID } from 'class-validator';

/** Corps de POST /claim et /authenticate : le nonce lu dans le QR. */
export class NonceDto {
  @IsUUID('4')
  nonce: string;
}
