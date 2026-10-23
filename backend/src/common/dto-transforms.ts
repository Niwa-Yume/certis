import type { TransformFnParams } from 'class-transformer';

/** E-mail comparé sans casse ni espaces. */
export const normalizeEmail = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

/**
 * Texte signé : NFC, car RFC 8785 ne normalise pas l'Unicode et « Söhne » peut arriver
 * composé ou décomposé, ce qui donnerait deux signatures pour la même montre (AUDIT S6).
 */
export const cleanText = ({ value }: TransformFnParams): unknown =>
  typeof value === 'string' ? value.normalize('NFC').trim() : value;
