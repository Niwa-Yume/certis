import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  /**
   * Droit à l'effacement (RGPD, S-01). Le journal append-only ne contient que des pseudonymes
   * HMAC(clé, pièce:compte) : une fois le compte supprimé, plus rien ne permet de les rattacher
   * à une personne, et la chaîne des pièces reste vérifiable. Un registre ne laisse pas une montre
   * sans propriétaire : il faut d'abord céder ses pièces.
   */
  erase(id: string) {
    return this.prisma.$transaction(async (tx) => {
      if (await tx.asset.count({ where: { ownerId: id } })) {
        throw new ConflictException(
          'Cédez d’abord vos pièces : le registre ne peut pas laisser une montre sans propriétaire.',
        );
      }
      await tx.authNonce.deleteMany({
        where: { OR: [{ issuedById: id }, { recipientId: id }] },
      });
      await tx.user.delete({ where: { id } });
    });
  }

  findWithIssuer(id: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id },
      include: { issuer: true },
    });
  }

  async create(email: string, plainPassword: string) {
    const passwordHash = await bcrypt.hash(plainPassword, 10);

    return this.prisma.user.create({
      data: {
        email,
        passwordHash,
      },
    });
  }
}
