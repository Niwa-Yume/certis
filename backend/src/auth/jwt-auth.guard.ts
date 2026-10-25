import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<User>(error: unknown, user: User | false): User {
    if (error || !user) {
      throw new UnauthorizedException(
        'Session absente ou expirée (elle dure une heure) : reconnectez-vous.',
      );
    }
    return user;
  }
}
