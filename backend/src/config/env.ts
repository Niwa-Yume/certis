import { createPrivateKey, KeyObject } from 'crypto';

export type Env = {
  databaseUrl: string;
  jwtSecret: string;
  signingKey: KeyObject;
};

// Fail-fast : l'API refuse de démarrer avec une config absente ou faible, au lieu de retomber sur une valeur par défaut.
export function readEnv(env: NodeJS.ProcessEnv = process.env): Env {
  const errors: string[] = [];

  const databaseUrl = env.DATABASE_URL ?? '';
  if (!/^postgres(ql)?:\/\//.test(databaseUrl)) {
    errors.push('DATABASE_URL doit être une URL postgres://');
  }

  const jwtSecret = env.JWT_SECRET ?? '';
  if (jwtSecret.length < 32) {
    errors.push('JWT_SECRET doit faire au moins 32 caractères');
  }

  let signingKey: KeyObject | undefined;
  try {
    // Sur Render, une clé PEM collée sur une ligne garde des "\n" littéraux.
    signingKey = createPrivateKey(
      (env.ECDSA_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
    );
    if (signingKey.asymmetricKeyDetails?.namedCurve !== 'prime256v1') {
      errors.push('ECDSA_PRIVATE_KEY doit être une clé EC P-256');
    }
  } catch {
    errors.push(
      "ECDSA_PRIVATE_KEY est absente ou n'est pas une clé privée PEM",
    );
  }

  if (errors.length > 0 || !signingKey) {
    throw new Error(`Configuration invalide :\n- ${errors.join('\n- ')}`);
  }

  return { databaseUrl, jwtSecret, signingKey };
}
