import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AssetService } from '../asset/asset.service';
import { UserService } from '../user/user.service';

const WRONG_CREDENTIALS =
  'E-mail ou mot de passe incorrect : vérifiez la saisie, ou créez un compte si vous n’en avez pas.';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly assets: AssetService,
  ) {}

  async register(email: string, password: string) {
    const existingUser = await this.userService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException(
        'Un compte existe déjà avec cet e-mail : connectez-vous, ou utilisez une autre adresse.',
      );
    }

    const user = await this.userService.create(email, password);
    // Sans pièce d'essai, le compte reste utilisable : elle n'est qu'une aide pour découvrir l'app.
    await this.assets
      .giveTrialPiece(user.email)
      .catch((error: Error) =>
        this.logger.warn(`Pièce d’essai non donnée : ${error.message}`),
      );
    const accessToken = await this.signToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      accessToken,
    };
  }

  async login(email: string, password: string) {
    const user = await this.userService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException(WRONG_CREDENTIALS);
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException(WRONG_CREDENTIALS);
    }

    const accessToken = await this.signToken(user.id, user.email);

    return {
      accessToken,
    };
  }

  /**
   * Suppression du compte, après vérification du mot de passe : un jeton volé ne suffit pas.
   * 403 et non 401 : la session est valide, seule la confirmation est fausse. Un 401 ferait
   * croire au client que la session a expiré.
   */
  async erase(userId: string, password: string) {
    const user = await this.userService.findWithIssuer(userId);
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw new ForbiddenException(
        'Mot de passe incorrect : votre compte n’a pas été supprimé. Saisissez le mot de passe de ce compte.',
      );
    }
    await this.assets.reclaimTrialPieces(userId);
    await this.userService.erase(userId);
  }

  async me(userId: string) {
    const user = await this.userService.findWithIssuer(userId);
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      issuer: user.issuer && { id: user.issuer.id, name: user.issuer.name },
    };
  }

  private async signToken(userId: string, email: string) {
    return this.jwtService.signAsync(
      {
        sub: userId,
        email,
      },
      {
        algorithm: 'HS256',
      },
    );
  }
}
