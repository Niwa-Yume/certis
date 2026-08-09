import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Personnalisation du document HTML web généré par Expo Router.
 * Contient le script de restauration SPA : si un 404.html a redirigé
 * l'utilisateur ici via sessionStorage, on remet l'URL correcte avant
 * qu'Expo Router commence à rendre, afin qu'il navigue vers la bonne page.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <ScrollViewStyleReset />
        {/* Restauration SPA : doit s'exécuter avant tout rendu */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                var redirect = sessionStorage.getItem('spa_redirect');
                if (redirect) {
                  sessionStorage.removeItem('spa_redirect');
                  window.history.replaceState(null, null, redirect);
                }
              })();
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

