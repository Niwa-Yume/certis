import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { readEnv } from '../config/env';

@Injectable()
export class CryptoService {
  private readonly privateKey: crypto.KeyObject;
  // Dérivée de la clé privée : une seule variable d'environnement, aucune paire incohérente possible.
  private readonly publicKey: crypto.KeyObject;

  constructor() {
    this.privateKey = readEnv().signingKey;
    this.publicKey = crypto.createPublicKey(this.privateKey);
  }

  sign(data: object): string {
    const payload = JSON.stringify(data);
    const sign = crypto.createSign('SHA256');
    sign.update(payload);
    sign.end();
    return sign.sign(this.privateKey, 'base64');
  }

  verify(data: object, signature: string): boolean {
    const payload = JSON.stringify(data);
    const verify = crypto.createVerify('SHA256');
    verify.update(payload);
    verify.end();
    return verify.verify(this.publicKey, signature, 'base64');
  }
}
