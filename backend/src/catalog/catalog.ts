/**
 * Références réelles, que le formulaire d'inscription d'un émetteur propose de reprendre (phase 7).
 * Relevées le 2026-10-25 sur le site de chaque marque, sauf mention ; l'adresse est dans `source`.
 * Seules les références dont on a une photo vérifiée en portent une. Aucune maison réelle n'est
 * émettrice dans Certis : l'émetteur de démonstration est fictif (ADR-0003, ADR-0012).
 */
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

const AP = 'https://www.audemarspiguet.com/ch/en/watch-collection/royal-oak/';
const royalOak41 = (suffix: string, dial: string): CatalogEntry => ({
  brand: 'Audemars Piguet',
  model: 'Royal Oak',
  name: 'Royal Oak Automatique 41 mm',
  reference: `15510ST.OO.1320ST.${suffix}`,
  movement: 'Audemars Piguet 4302',
  case: 'Acier, 41 mm',
  dial,
  bracelet: 'Acier, boucle déployante AP',
  source: `${AP}15510ST.OO.1320ST.${suffix}`,
});

export const CATALOG: CatalogEntry[] = [
  royalOak41('06', 'Bleu nuit « Nuage 50 », « Grande Tapisserie »'),
  royalOak41('07', 'Noir, « Grande Tapisserie »'),
  royalOak41('10', 'Gris, « Grande Tapisserie »'),
  royalOak41('08', 'Argenté, « Grande Tapisserie »'),
  royalOak41('04', 'Vert kaki, « Grande Tapisserie »'),
  {
    brand: 'Audemars Piguet',
    model: 'Royal Oak',
    name: 'Royal Oak « Jumbo » Extra-Plat',
    reference: '16202ST.OO.1240ST.01',
    movement: 'Audemars Piguet 7121',
    case: 'Acier, 39 mm',
    dial: 'Bleu nuit « Nuage 50 », « Petite Tapisserie »',
    bracelet: 'Acier, boucle déployante AP',
    source: `${AP}16202ST.OO.1240ST.01`,
  },
  {
    brand: 'Audemars Piguet',
    model: 'Royal Oak',
    name: 'Royal Oak Extra-Plat',
    reference: '15202ST.OO.1240ST.01',
    movement: 'Audemars Piguet 2121',
    case: 'Acier, 39 mm, 9,8 mm d’épaisseur',
    dial: 'Bleu, « Petite Tapisserie »',
    bracelet: 'Acier',
    // Remplacée par la 16202ST ; relevée le 2026-10-24.
    source:
      'https://watchbase.com/audemars-piguet/royal-oak/15202st-oo-1240st-01',
    photo: { imageUrl: '/public/watches/royal-oak.webp', imageCutout: true },
  },
  {
    brand: 'Audemars Piguet',
    model: 'Royal Oak',
    name: 'Royal Oak Chronographe Automatique 41 mm',
    reference: '26240ST.OO.1320ST.01',
    movement: 'Audemars Piguet 4401',
    case: 'Acier, 41 mm',
    dial: 'Bleu nuit « Nuage 50 », « Grande Tapisserie », compteurs bleus',
    bracelet: 'Acier, boucle déployante AP',
    source: `${AP}26240ST.OO.1320ST.01`,
  },
  {
    brand: 'Audemars Piguet',
    model: 'Royal Oak',
    name: 'Royal Oak Automatique 34 mm',
    reference: '77350ST.OO.1261ST.01',
    movement: 'Audemars Piguet 5800',
    case: 'Acier, 34 mm',
    dial: 'Argenté, « Grande Tapisserie »',
    bracelet: 'Acier, boucle déployante AP',
    source: `${AP}77350ST.OO.1261ST.01`,
  },
  {
    brand: 'Rolex',
    model: 'Submariner',
    name: 'Submariner Date',
    reference: '126610LN',
    movement: 'Rolex 3235',
    case: 'Oystersteel, 41 mm, lunette tournante Cerachrom noire',
    dial: 'Noir',
    bracelet: 'Oyster, Oystersteel',
    source: 'https://www.rolex.com/en-us/watches/submariner/m126610ln-0001',
    photo: { imageUrl: '/public/watches/submariner.webp', imageCutout: false },
  },
  {
    brand: 'Rolex',
    model: 'Submariner',
    name: 'Submariner',
    reference: '124060',
    movement: 'Rolex 3230',
    case: 'Oystersteel, 41 mm, lunette tournante Cerachrom noire',
    dial: 'Noir',
    bracelet: 'Oyster, Oystersteel',
    source: 'https://www.rolex.com/en-us/watches/submariner/m124060-0001',
  },
  {
    brand: 'Rolex',
    model: 'Cosmograph Daytona',
    name: 'Cosmograph Daytona',
    reference: '126500LN',
    movement: 'Rolex 4131',
    case: 'Oystersteel, 40 mm, lunette tachymètre Cerachrom noire',
    dial: 'Blanc, compteurs cerclés de noir',
    bracelet: 'Oyster, Oystersteel',
    source:
      'https://www.rolex.com/en-us/watches/cosmograph-daytona/m126500ln-0001',
  },
  {
    brand: 'Patek Philippe',
    model: 'Nautilus',
    name: 'Nautilus',
    reference: '5811/1G-001',
    movement: 'Patek Philippe 26-330 S C',
    case: 'Or blanc, 41 mm',
    dial: 'Bleu soleillé, dégradé noir, relief horizontal',
    bracelet: 'Or blanc',
    source: 'https://www.patek.com/en/collection/nautilus/5811-1G-001',
  },
  {
    brand: 'Patek Philippe',
    model: 'Aquanaut',
    name: 'Aquanaut Date',
    reference: '5167A-001',
    movement: 'Patek Philippe 26-330 S C',
    case: 'Acier, 40,8 mm',
    dial: 'Gris anthracite soleillé, motif Aquanaut en relief',
    bracelet: 'Bracelet en matériau composite noir',
    source: 'https://www.patek.com/en/collection/aquanaut/5167A-001',
  },
  {
    brand: 'Patek Philippe',
    model: 'Calatrava',
    name: 'Calatrava',
    reference: '5227G-010',
    movement: 'Patek Philippe 26-330 S C',
    case: 'Or blanc, 39 mm',
    dial: 'Noir laqué',
    bracelet: 'Alligator',
    source: 'https://www.patek.com/en/collection/calatrava/5227G-010',
  },
  {
    brand: 'Vacheron Constantin',
    model: 'Overseas',
    name: 'Overseas Automatique',
    reference: '4520V/210A-B128',
    movement:
      'Vacheron Constantin, automatique, masse oscillante en or 22 carats',
    case: 'Acier, 41 mm, 10,69 mm d’épaisseur',
    dial: 'Bleu laqué, soleillé',
    bracelet: 'Acier interchangeable (cuir et caoutchouc fournis)',
    source:
      'https://www.vacheron-constantin.com/us/en/collections/overseas/4520v-210a-b128.html',
  },
  {
    brand: 'Omega',
    model: 'Speedmaster',
    name: 'Speedmaster Moonwatch Professional',
    reference: '310.30.42.50.01.002',
    movement: 'Omega 3861',
    case: 'Acier, 42 mm, verre saphir',
    dial: 'Noir',
    bracelet: 'Acier',
    source:
      'https://www.omegawatches.com/en-ch/watch-omega-speedmaster-moonwatch-professional-co-axial-master-chronometer-chronograph-42-mm-31030425001002',
  },
  {
    brand: 'TAG Heuer',
    model: 'Carrera',
    name: 'Carrera Calibre S',
    reference: 'CV7A12.BA0795',
    movement: 'TAG Heuer Calibre S',
    case: 'Acier, 43 mm, lunette tachymètre',
    dial: 'Noir',
    bracelet: 'Acier',
    // Relevée le 2026-10-24.
    source: 'https://watchbase.com/tag-heuer/carrera/cv7a12-ba0795',
    photo: { imageUrl: '/public/watches/carrera.webp', imageCutout: true },
  },
];
