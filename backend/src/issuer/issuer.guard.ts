import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

export type IssuerRequest = Request & {
  user: { id: string; email: string; issuerId?: string };
};

/**
 * Réservé aux comptes émetteurs (ADR-0003). Lu en base, pas dans le jeton : un rôle retiré
 * prend effet tout de suite. Un guard passe avant la validation du corps : un non-émetteur
 * reçoit 403 sans apprendre le format attendu.
 */
@Injectable()
export class IssuerGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<IssuerRequest>();
    const user = await this.prisma.user.findUnique({
      where: { id: request.user.id },
    });
    if (user?.role !== 'ISSUER' || !user.issuerId) {
      throw new ForbiddenException(
        'Seul un compte émetteur (une maison, ou un expert) peut inscrire une pièce ou enregistrer une révision : votre compte est un compte de propriétaire.',
      );
    }
    request.user.issuerId = user.issuerId;
    return true;
  }
}
