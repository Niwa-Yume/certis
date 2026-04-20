import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService {
    private readonly privateKey: string;
    private readonly publicKey: string;

    constructor() {
        this.privateKey = process.env.ECDSA_PRIVATE_KEY!.replace(/\\n/g, '\n');
        this.publicKey = process.env.ECDSA_PUBLIC_KEY!.replace(/\\n/g, '\n');
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