import * as crypto from 'crypto';

//ECSDA = permet d'avoir une autorité(le serv)qui signe, tout le monde peut vérifier, personne ne peut falsifier.
const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'P-256', // P-256 est une courbe elliptique de 256 bits (perf + sécu) donc 26 bits = Apple Pay, passeports biométriques, TLS
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, //pem = format pour stocker les clés
});

console.log('ECDSA_PRIVATE_KEY="' + privateKey.replace(/\n/g, '\\n') + '"');
console.log('ECDSA_PUBLIC_KEY="' + publicKey.replace(/\n/g, '\\n') + '"');