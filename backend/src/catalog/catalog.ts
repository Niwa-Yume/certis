/**
 * Le catalogue de la maison de démonstration, que son formulaire d'inscription propose de reprendre.
 * La Maison Orvène est fictive, comme ses références, ses calibres et ses photos (rendus générés,
 * sans logo). Aucune maison réelle n'apparaît dans la démo (ADR-0003, ADR-0012, ADR-0015).
 * `source` pointe sur un domaine réservé (RFC 2606) : il n'existe aucune page à consulter.
 */
import { existsSync, readFileSync } from 'node:fs';

export type CatalogEntry = {
  brand: string;
  model: string;
  name: string;
  reference: string;
  movement: string;
  case: string;
  dial: string;
  bracelet: string;
  source: string;
  photo?: { imageUrl: string; imageCutout: boolean };
};

const HOUSE = 'Maison Orvène';
const SITE = 'https://orvene.example/collection/';

const meridienne = (
  reference: string,
  dial: string,
  photo: string,
): CatalogEntry => ({
  brand: HOUSE,
  model: 'Méridienne',
  name: 'Méridienne Petite Seconde',
  reference,
  movement: 'Calibre OR-21, remontage automatique',
  case: 'Acier poli et satiné, 39 mm',
  dial,
  bracelet: 'Cuir d’alligator brun, boucle ardillon',
  source: `${SITE}${reference}`,
  photo: { imageUrl: `/public/watches/${photo}.webp`, imageCutout: false },
});

const ORVENE: CatalogEntry[] = [
  meridienne('OR-1201', 'Ardoise soleillé', 'orvene-meridienne-ardoise'),
  meridienne('OR-1202', 'Vert forêt soleillé', 'orvene-meridienne-foret'),
  {
    brand: HOUSE,
    model: 'Équinoxe',
    name: 'Équinoxe Phase de Lune',
    reference: 'OR-3101',
    movement: 'Calibre OR-34, remontage automatique, phase de lune',
    case: 'Or rose 18 carats, 40 mm',
    dial: 'Ivoire grené',
    bracelet: 'Cuir d’alligator chocolat, boucle déployante',
    source: `${SITE}OR-3101`,
    photo: {
      imageUrl: '/public/watches/orvene-equinoxe.webp',
      imageCutout: false,
    },
  },
];

/** Une pièce de client du seed, et son histoire (dates ISO, comptes de démo par e-mail). */
export type DemoWatch = {
  reference: string;
  serial: string;
  story: (
    | { type: 'MINT'; at: string; owner?: string }
    | { type: 'SERVICE'; at: string; note: string }
    | { type: 'TRANSFER'; at: string; owner: string }
  )[];
};

// Démo aux couleurs d'une autre maison : DEMO_HOUSE_FILE (dans backend/.env) désigne un fichier
// JSON local { house, catalog, watches? } qui remplace la maison fictive. Il reste hors dépôt
// (*.local.json) : les visuels d'une marque réelle n'ont rien à faire dans un dépôt public.
const file = process.env.DEMO_HOUSE_FILE;
const local =
  file && existsSync(file)
    ? (JSON.parse(readFileSync(file, 'utf8')) as {
        house: string;
        catalog: CatalogEntry[];
        watches?: DemoWatch[];
      })
    : null;

export const DEMO_HOUSE = local?.house ?? HOUSE;
export const CATALOG = local?.catalog ?? ORVENE;
export const DEMO_WATCHES = local?.watches;
