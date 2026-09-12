/**
 * Le jeu de portraits dessinés.
 *
 * **Ce que c'est.** Des images fournies par l'auteur du jeu, découpées et
 * détourées par `tools/portrait-decouper.mjs`, et rangées dans
 * `public/portraits/`. Elles remplacent le portrait vectoriel quand une
 * ressemble assez au personnage.
 *
 * **Pourquoi une table écrite à la main.** Le moteur connaît son personnage en
 * mots — « mate », « auburn », « bouclés ». Une image ne se décrit pas toute
 * seule : il faut lui attacher ces mêmes mots pour pouvoir la choisir. Cette
 * table est ce lien, et elle est le seul endroit à toucher quand de nouvelles
 * images arrivent.
 *
 * **Ce que le jeu ne peut pas encore montrer.** Ces trente-et-une images ont
 * toutes entre dix et vingt-cinq ans : aucun enfant, aucun vieillard, aucun
 * cheveu gris. Le champ `age` existe déjà et vaut `jeune` partout ; le jour où
 * des enfants ou des anciens arrivent, il suffit de les déclarer avec le bon
 * âge et le choix les prendra sans qu'une ligne de code change.
 *
 * **Quatre images écartées.** Elles portent un logo de marque — deux bonnets
 * et deux casquettes. Un jeu publié ne peut pas les embarquer, et les
 * supprimer du dossier serait perdre l'original ; elles sont simplement
 * absentes de cette table.
 */

/** Les tranches d'âge qu'un portrait peut représenter. */
export type AgePortrait = 'enfant' | 'jeune' | 'mur' | 'age';

export interface PortraitDessine {
  /** Le nom du fichier dans `public/portraits/`. */
  fichier: string;
  sexe: 'M' | 'F';
  /** Une valeur de `SKIN_TONES`. */
  peau: string;
  /** Une valeur de `HAIR_COLORS`. */
  cheveux: string;
  /** Une valeur de `HAIR_STYLES`. */
  coiffure: string;
  age: AgePortrait;
  /** Lunettes, casquette, boucles d'oreilles — de quoi le dire, pas le choisir. */
  accessoire?: string;
}

export const PORTRAITS: PortraitDessine[] = [
  { fichier: 'tete-01.webp', sexe: 'M', peau: 'claire', cheveux: 'blonds', coiffure: 'ondulés', age: 'jeune' },
  { fichier: 'tete-02.webp', sexe: 'F', peau: 'claire', cheveux: 'bruns', coiffure: 'raides', age: 'jeune', accessoire: 'lunettes' },
  { fichier: 'tete-03.webp', sexe: 'M', peau: 'claire', cheveux: 'noirs', coiffure: 'bouclés', age: 'jeune' },
  { fichier: 'tete-04.webp', sexe: 'F', peau: 'très claire', cheveux: 'roux', coiffure: 'ondulés', age: 'jeune' },
  { fichier: 'tete-05.webp', sexe: 'M', peau: 'foncée', cheveux: 'noirs', coiffure: 'crépus', age: 'jeune' },
  { fichier: 'tete-06.webp', sexe: 'F', peau: 'très claire', cheveux: 'blonds', coiffure: 'mi-longs', age: 'jeune' },
  { fichier: 'tete-07.webp', sexe: 'M', peau: 'claire', cheveux: 'noirs', coiffure: 'courts', age: 'jeune', accessoire: 'capuche' },
  { fichier: 'tete-08.webp', sexe: 'F', peau: 'brune', cheveux: 'noirs', coiffure: 'longs', age: 'jeune' },
  { fichier: 'tete-10.webp', sexe: 'F', peau: 'très claire', cheveux: 'blonds', coiffure: 'ondulés', age: 'jeune' },
  { fichier: 'tete-11.webp', sexe: 'M', peau: 'claire', cheveux: 'bruns', coiffure: 'bouclés', age: 'jeune', accessoire: 'lunettes de soleil' },
  { fichier: 'tete-12.webp', sexe: 'F', peau: 'très claire', cheveux: 'noirs', coiffure: 'raides', age: 'jeune' },
  { fichier: 'tete-13.webp', sexe: 'M', peau: 'claire', cheveux: 'châtains', coiffure: 'bouclés', age: 'jeune' },
  { fichier: 'tete-14.webp', sexe: 'F', peau: 'claire', cheveux: 'noirs', coiffure: 'mi-longs', age: 'jeune' },
  { fichier: 'tete-15.webp', sexe: 'M', peau: 'très claire', cheveux: 'blonds', coiffure: 'bouclés', age: 'jeune' },
  { fichier: 'tete-17.webp', sexe: 'M', peau: 'brune', cheveux: 'noirs', coiffure: 'crépus', age: 'jeune' },
  { fichier: 'tete-18.webp', sexe: 'F', peau: 'claire', cheveux: 'châtains', coiffure: 'raides', age: 'jeune' },
  { fichier: 'tete-19.webp', sexe: 'M', peau: 'claire', cheveux: 'noirs', coiffure: 'courts', age: 'jeune', accessoire: 'casquette' },
  { fichier: 'tete-20.webp', sexe: 'F', peau: 'mate', cheveux: 'bruns', coiffure: 'ondulés', age: 'jeune' },
  { fichier: 'tete-21.webp', sexe: 'M', peau: 'claire', cheveux: 'bruns', coiffure: 'bouclés', age: 'jeune', accessoire: 'lunettes' },
  { fichier: 'tete-22.webp', sexe: 'F', peau: 'mate', cheveux: 'bruns', coiffure: 'raides', age: 'jeune' },
  { fichier: 'tete-23.webp', sexe: 'M', peau: 'claire', cheveux: 'châtains', coiffure: 'bouclés', age: 'jeune' },
  { fichier: 'tete-24.webp', sexe: 'F', peau: 'brune', cheveux: 'bruns', coiffure: 'bouclés', age: 'jeune' },
  { fichier: 'tete-25.webp', sexe: 'M', peau: 'très claire', cheveux: 'blonds', coiffure: 'courts', age: 'jeune', accessoire: 'lunettes de soleil' },
  { fichier: 'tete-26.webp', sexe: 'F', peau: 'très claire', cheveux: 'noirs', coiffure: 'raides', age: 'jeune' },
  { fichier: 'tete-27.webp', sexe: 'M', peau: 'claire', cheveux: 'auburn', coiffure: 'bouclés', age: 'jeune' },
  { fichier: 'tete-28.webp', sexe: 'F', peau: 'très claire', cheveux: 'blonds', coiffure: 'raides', age: 'jeune' },
  { fichier: 'tete-29.webp', sexe: 'M', peau: 'claire', cheveux: 'noirs', coiffure: 'courts', age: 'jeune' },
  { fichier: 'tete-31.webp', sexe: 'M', peau: 'claire', cheveux: 'châtains', coiffure: 'bouclés', age: 'jeune' },
  { fichier: 'tete-32.webp', sexe: 'F', peau: 'mate', cheveux: 'noirs', coiffure: 'longs', age: 'jeune' },
  { fichier: 'tete-33.webp', sexe: 'M', peau: 'claire', cheveux: 'roux', coiffure: 'courts', age: 'jeune' },
  { fichier: 'tete-34.webp', sexe: 'F', peau: 'claire', cheveux: 'noirs', coiffure: 'mi-longs', age: 'jeune' },
];

/**
 * Les teints, du plus clair au plus foncé.
 *
 * Le rang sert à mesurer un *écart* plutôt qu'une égalité : à défaut du teint
 * exact, le voisin immédiat vaut bien mieux que n'importe lequel. Sans cet
 * ordre, un personnage « dorée » — teint qu'aucune image ne porte — aurait
 * autant de chances de recevoir « très claire » que « brune ».
 */
const RANG_PEAU = ['très claire', 'claire', 'mate', 'dorée', 'brune', 'foncée', 'très foncée'];

/** L'âge d'un portrait, déduit de l'âge du personnage. */
export function agePortrait(age: number): AgePortrait {
  if (age < 13) return 'enfant';
  if (age < 41) return 'jeune';
  if (age < 65) return 'mur';
  return 'age';
}

/**
 * Choisir le portrait le plus proche, ou aucun.
 *
 * **Les poids disent ce qui se voit.** Dans le médaillon de l'en-tête — 46
 * points, et c'est là qu'on regarde le portrait le plus souvent — le teint et
 * la masse des cheveux sautent aux yeux ; la couleur des yeux ne se distingue
 * pas. Les poids suivent cette hiérarchie, pas l'ordre du formulaire de
 * création.
 *
 * **Et la fonction peut renvoyer `null`.** C'est délibéré : tant que le jeu
 * d'images ne couvre pas une tranche d'âge, mieux vaut le portrait vectoriel,
 * qui suit le personnage, qu'une image d'adulte sur un enfant de six ans.
 */
export function choisirPortrait(traits: {
  sexe: 'M' | 'F'; peau: string; cheveux: string; coiffure: string; age: number;
}): PortraitDessine | null {
  const voulu = agePortrait(traits.age);
  const candidats = PORTRAITS.filter((p) => p.age === voulu);
  if (!candidats.length) return null;

  const rang = RANG_PEAU.indexOf(traits.peau);
  let meilleur: PortraitDessine | null = null;
  let meilleureNote = -1;
  for (const p of candidats) {
    let note = 0;
    if (p.sexe === traits.sexe) note += 40;
    const ecart = Math.abs(RANG_PEAU.indexOf(p.peau) - rang);
    note += Math.max(0, 30 - ecart * 10);
    if (p.cheveux === traits.cheveux) note += 20;
    if (p.coiffure === traits.coiffure) note += 14;
    if (note > meilleureNote) { meilleureNote = note; meilleur = p; }
  }
  return meilleur;
}
