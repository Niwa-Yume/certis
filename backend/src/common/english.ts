import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import type { Request, Response } from 'express';

// Les refus en anglais, pour la version anglaise de la démo (ADR-0013, ADR-0015). Même forme :
// ce qui s'est passé, puis comment corriger. La clé est le message français, mot pour mot.
// shortcut: les erreurs de validation (champ par champ) restent en français ; à traduire si un
// formulaire anglais en produit dans la démo.
export const ENGLISH: Record<string, string> = {
  'Cette invitation est introuvable : vérifiez le lien, ou demandez-en une nouvelle à la maison.':
    'This invitation cannot be found: check the link, or ask the house for a new one.',
  'Cette invitation a expiré : elle ne vaut que sept jours. Demandez-en une nouvelle à la maison.':
    'This invitation has expired: it is valid for seven days only. Ask the house for a new one.',
  'Un compte existe déjà avec cet e-mail : connectez-vous, la pièce vous attend dans votre collection.':
    'An account already exists with this e-mail: sign in, the piece is waiting in your collection.',
  'Aucun compte Certis n’utilise cet e-mail : vérifiez-le, ou demandez à l’acheteur de créer son compte d’abord.':
    'No Certis account uses this e-mail: check it, or ask the buyer to create an account first.',
  'Aucun compte Certis n’utilise l’e-mail du premier propriétaire : vérifiez-le, ou laissez-le vide pour garder la pièce en stock.':
    'No Certis account uses the first owner’s e-mail: check it, or leave it empty to keep the piece in stock.',
  'Ce QR a déjà servi : il ne vaut qu’une fois. Demandez-en un nouveau au propriétaire.':
    'This QR has already been used: it is valid only once. Ask the owner for a new one.',
  'Ce QR a expiré : il ne vaut que quelques minutes. Demandez-en un nouveau au propriétaire.':
    'This QR has expired: it is valid for a few minutes only. Ask the owner for a new one.',
  'Ce QR ne correspond pas à cette pièce, ou à une autre action : demandez au propriétaire d’en créer un nouveau.':
    'This QR does not match this piece, or is meant for another action: ask the owner to create a new one.',
  'Cette cession est réservée à un autre compte : connectez-vous avec l’e-mail indiqué par le vendeur, ou demandez-lui un nouveau QR.':
    'This change of ownership is reserved for another account: sign in with the e-mail the seller gave, or ask for a new QR.',
  'Cette montre est déclarée volée : elle ne peut pas changer de propriétaire. Si elle a été retrouvée, son propriétaire peut lever l’alerte.':
    'This watch is reported stolen: it cannot change owner. If it has been recovered, its owner can lift the alert.',
  'Cette montre est déjà déclarée volée : l’alerte est en place, rien d’autre à faire.':
    'This watch is already reported stolen: the alert is in place, nothing else to do.',
  'Cette montre n’est pas déclarée volée : il n’y a pas d’alerte à lever.':
    'This watch is not reported stolen: there is no alert to lift.',
  'Cette pièce est introuvable : vérifiez son lien ou son numéro de registre.':
    'This piece cannot be found: check its link or its registry number.',
  'Cette pièce est introuvable, ou elle ne vous appartient pas : vérifiez le lien, ou connectez-vous avec le compte qui la détient.':
    'This piece cannot be found, or it is not yours: check the link, or sign in with the account that holds it.',
  'Cédez d’abord vos pièces : le registre ne peut pas laisser une montre sans propriétaire.':
    'Pass on your pieces first: the registry cannot leave a watch without an owner.',
  'E-mail ou mot de passe incorrect : vérifiez la saisie, ou créez un compte si vous n’en avez pas.':
    'Wrong e-mail or password: check what you typed, or create an account if you have none.',
  'La montre a changé de propriétaire depuis la création de ce QR : il ne vaut plus. Demandez-en un nouveau au propriétaire actuel.':
    'The watch has changed owner since this QR was created: it is no longer valid. Ask the current owner for a new one.',
  'La montre a changé entre-temps : rechargez la page et réessayez.':
    'The watch changed in the meantime: reload the page and try again.',
  'Mot de passe incorrect : votre compte n’a pas été supprimé. Saisissez le mot de passe de ce compte.':
    'Wrong password: your account has not been deleted. Enter this account’s password.',
  'Nombre de contrôles atteint pour ce QR : demandez-en un nouveau au vendeur.':
    'Check limit reached for this QR: ask the seller for a new one.',
  'Session absente ou expirée (elle dure une heure) : reconnectez-vous.':
    'No session, or it has expired (it lasts one hour): sign in again.',
  'Seul le propriétaire de cette pièce peut créer ce QR : connectez-vous avec le compte qui la détient.':
    'Only the owner of this piece can create this QR: sign in with the account that holds it.',
  'Seul l’émetteur de cette pièce peut y enregistrer une révision : elle a été inscrite par une autre maison.':
    'Only the issuer of this piece can record a service on it: another house registered it.',
  'Seul un compte émetteur (une maison, ou un expert) peut inscrire une pièce ou enregistrer une révision : votre compte est un compte de propriétaire.':
    'Only an issuer account (a house, or an expert) can register a piece or record a service: yours is an owner account.',
  'Trop de demandes en peu de temps : patientez une minute, puis réessayez.':
    'Too many requests in a short time: wait a minute, then try again.',
  'Un compte existe déjà avec cet e-mail : connectez-vous, ou utilisez une autre adresse.':
    'An account already exists with this e-mail: sign in, or use another address.',
  'Vous êtes déjà propriétaire de cette montre : ce QR sert à la céder à quelqu’un d’autre.':
    'You already own this watch: this QR is for passing it on to someone else.',
  'Vérifiez d’abord la pièce avec le QR du vendeur : le contrôle du numéro de série n’est ouvert que dans les 10 minutes qui suivent.':
    'Check the piece with the seller’s QR first: the serial number check is open only in the 10 minutes that follow.',
};

/** Un refus en anglais quand le client le demande (Accept-Language: en…), en français sinon. */
@Catch(HttpException)
export class EnglishRefusals implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const status = exception.getStatus();
    const raw = exception.getResponse();
    // Même corps que le filtre par défaut de Nest : un texte devient { statusCode, message }.
    const body =
      typeof raw === 'string' ? { statusCode: status, message: raw } : raw;
    const message = (body as { message?: unknown }).message;
    const english =
      typeof message === 'string' &&
      /^en\b/i.test(request.headers['accept-language'] ?? '')
        ? ENGLISH[message]
        : undefined;
    http
      .getResponse<Response>()
      .status(status)
      .json(english ? { ...body, message: english } : body);
  }
}
