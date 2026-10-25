import { NotFoundException } from '@nestjs/common';

/** Une pièce introuvable, ou celle d'autrui : la même réponse, pour ne rien confirmer (AUDIT S8). */
export const pieceNotFound = () =>
  new NotFoundException(
    'Cette pièce est introuvable, ou elle ne vous appartient pas : vérifiez le lien, ou connectez-vous avec le compte qui la détient.',
  );
