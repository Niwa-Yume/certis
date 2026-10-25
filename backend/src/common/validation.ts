import { BadRequestException, ValidationError } from '@nestjs/common';

// Le nom que l'utilisateur voit dans le formulaire, pas celui du code.
const FIELDS: Record<string, string> = {
  email: 'E-mail',
  password: 'Mot de passe',
  ownerEmail: 'E-mail du premier propriétaire',
  recipientEmail: 'E-mail du destinataire',
  brand: 'Marque',
  model: 'Modèle',
  name: 'Nom',
  reference: 'Référence',
  serial: 'Numéro de série',
  movement: 'Mouvement',
  case: 'Boîtier',
  dial: 'Cadran',
  bracelet: 'Bracelet',
  imageUrl: 'Photo',
  imageCutout: 'Photo détourée',
  note: 'Note de révision',
  nonce: 'QR',
};

// class-validator met la limite dans son message anglais : on la reprend telle quelle.
const limit = (message: string) => /\d+/.exec(message)?.[0];

const RULES: Record<string, (message: string) => string> = {
  isEmail: () =>
    'saisissez une adresse e-mail complète, par exemple nom@domaine.ch',
  isNotEmpty: () => 'ce champ est obligatoire',
  isString: () => 'ce champ est obligatoire, sous forme de texte',
  isBoolean: () => 'oui ou non attendu',
  isUuid: () => 'ce QR ou ce lien est incomplet ; scannez-le à nouveau',
  minLength: (m) => `${limit(m)} caractères au moins`,
  maxLength: (m) => `${limit(m)} caractères au plus`,
};

function describe({ property, constraints = {} }: ValidationError) {
  if (constraints.whitelistValidation) {
    return `Champ inconnu « ${property} » : retirez-le de la requête.`;
  }
  const [rule, message] = Object.entries(constraints)[0] ?? ['', ''];
  // Un message écrit en français dans le DTO (ex. la photo) prime sur la règle générique.
  const text = RULES[rule]?.(message) ?? message;
  return `${FIELDS[property] ?? property} : ${text}.`;
}

/** Un seul message en français, qui nomme chaque champ à corriger et dit comment. */
export const validationError = (errors: ValidationError[]) =>
  new BadRequestException(errors.map(describe).join(' '));
