import { CreateAssetDto } from './dto/create-asset.dto';

/**
 * La pièce d'essai donnée à chaque nouveau compte (ADR-0012). Une montre qui n'existe pas, d'une
 * marque qui n'existe pas : vérifiée, elle ne peut faire passer aucune vraie montre pour authentique.
 */
export const TRIAL_PIECE: Omit<CreateAssetDto, 'ownerEmail'> = {
  brand: 'Certis',
  model: 'Pièce d’essai',
  name: 'Pièce d’essai',
  reference: 'ESSAI-01',
  // Le même pour toutes : chacun peut essayer le contrôle du numéro de série.
  serial: 'ESSAI-0001',
  movement: 'Aucun : pièce de démonstration',
  case: 'Fictif',
  dial: 'Fictif',
  bracelet: 'Fictif',
};

export const TRIAL_ISSUER = 'Certis · pièces d’essai';

// Compte système qui détient les pièces d'essai rendues. Sans domaine de premier niveau :
// l'inscription (IsEmail) le refuse, personne ne peut le réclamer.
export const TRIAL_ACCOUNT = 'essai@certis';
