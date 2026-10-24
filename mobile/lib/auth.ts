export const ACCESS_TOKEN_KEY = 'certis_access_token';

/** Page où revenir après connexion : chemin interne uniquement, jamais une autre origine. */
export function safeNext(next?: string): string {
    return next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
}
