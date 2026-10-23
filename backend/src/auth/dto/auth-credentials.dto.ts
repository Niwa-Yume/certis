import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { normalizeEmail } from '../../common/dto-transforms';

export class RegisterDto {
  @Transform(normalizeEmail)
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt ignore tout au-delà de 72 octets
  password: string;
}

export class LoginDto {
  @Transform(normalizeEmail)
  @IsEmail()
  email: string;

  // Pas de longueur minimale ici : un compte existant garde son mot de passe.
  @IsString()
  @MinLength(1)
  @MaxLength(72)
  password: string;
}
