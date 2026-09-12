/**
 * Les sociétés cotées, et ce qu'elles publient.
 *
 * **Ce que ce fichier existe pour régler.** Le catalogue portait cet aveu :
 * « Entreprises cotées nommées — les supports sont des indices abstraits :
 * aucune société n'a de nom ni d'histoire ». On plaçait de l'argent dans des
 * *classes* — un fonds, un panier d'actions, un jeton — jamais dans quelque
 * chose qu'on aurait pu suivre. Il n'y avait donc rien à comprendre : on
 * répartissait, on attendait.
 *
 * **Une part de société est un support comme un autre, et c'est voulu.**
 * Chaque société ci-dessous devient un `AssetDef` ordinaire : mêmes prix,
 * mêmes frais, même portefeuille, même impôt sur la plus-value. Ce qu'elle
 * ajoute n'est pas une mécanique de plus, c'est **une chose à lire**.
 *
 * **Le panier ou le nom.** Un panier d'actions — `bluechip`, `smallcap` —
 * reste ce qu'on achète quand on ne veut rien lire : la moyenne, sans
 * surprise. Une société nommée est plus agitée qu'un panier, parce qu'elle
 * est seule ; en échange, elle publie chaque année de quoi se faire une idée.
 * Acheter une société sans lire ses publications revient donc à prendre le
 * risque sans prendre l'information — et cela se paie, ce qu'un test mesure.
 *
 * **Tout est fictif.** Aucune société réelle, aucun secteur calqué sur un
 * marché existant, aucun rendement observé. Ce fichier décrit un jeu et ne
 * dit rien du monde : rien de ce qui s'y trouve n'est un conseil, ni une
 * observation sur des entreprises ou des marchés véritables.
 */

import type { AssetDef } from './assets.ts';

export type Sector =
  | 'énergie' | 'santé' | 'transport' | 'alimentation' | 'loisirs' | 'matériaux';

export const SECTOR_LABEL: Record<Sector, string> = {
  énergie: 'Énergie',
  santé: 'Santé',
  transport: 'Transport',
  alimentation: 'Alimentation',
  loisirs: 'Loisirs',
  matériaux: 'Matériaux',
};

/**
 * La taille décide de ce qu'on risque.
 *
 * Une grande maison bouge peu et ne disparaît presque jamais ; une jeune
 * pousse fait le contraire. Entre les deux, il n'y a pas de bonne réponse —
 * seulement ce qu'on est prêt à supporter.
 */
export type Size = 'grande' | 'moyenne' | 'jeune';

export interface CompanyDef {
  id: string;
  name: string;
  emoji: string;
  sector: Sector;
  size: Size;
  /** Ce qu'elle fait, en une phrase. */
  story: string;
  /**
   * Ce que coûte une part, en multiple du ticket de sa catégorie.
   *
   * **Deux sociétés de même taille ne doivent pas être le même support sous
   * deux noms.** Elles partageaient d'abord frais, ticket et difficulté à
   * l'identique : le garde-fou du marché, qui cherche les supports qu'aucune
   * contrepartie ne rachète, finissait alors par déclarer que l'une « écrase »
   * l'autre sur un simple écart de tirage — deux choses identiques ne peuvent
   * pas se départager autrement. Une part se paie à l'unité, et une unité n'a
   * pas le même prix partout : c'est vrai, et c'est ce qui les sépare.
   */
  ticket: number;
}

export const COMPANIES: CompanyDef[] = [
  {
    id: 'halbrand', name: 'Halbrand', emoji: '🏭', sector: 'matériaux', size: 'grande',
    story: 'Fabrique des pièces que personne ne voit et que tout le monde utilise.',
    ticket: 1.6,
  },
  {
    id: 'verdania', name: 'Verdania', emoji: '🌾', sector: 'alimentation', size: 'grande',
    story: 'Nourrit une région entière et ne fait jamais parler d’elle.',
    ticket: 1.15,
  },
  {
    id: 'orbelin', name: 'Orbelin', emoji: '⚡', sector: 'énergie', size: 'grande',
    story: 'Vend du courant depuis quatre-vingts ans, avec des installations qui vieillissent.',
    ticket: 0.75,
  },
  {
    id: 'cordis', name: 'Cordis', emoji: '🩺', sector: 'santé', size: 'moyenne',
    story: 'Équipe les hôpitaux. Un seul contrat public peut faire son année.',
    ticket: 1.5,
  },
  {
    id: 'talweg', name: 'Talweg', emoji: '🚚', sector: 'transport', size: 'moyenne',
    story: 'Livre à l’heure, la plupart du temps, et compte ses camions.',
    ticket: 0.8,
  },
  {
    id: 'nimbus', name: 'Nimbus', emoji: '🎡', sector: 'loisirs', size: 'moyenne',
    story: 'Exploite des parcs et des salles. Tout dépend de l’humeur des gens.',
    ticket: 1.1,
  },
  {
    id: 'lithane', name: 'Lithane', emoji: '🔋', sector: 'énergie', size: 'jeune',
    story: 'Promet de stocker l’énergie mieux que les autres. On verra.',
    ticket: 0.7,
  },
  {
    id: 'ixora', name: 'Ixora', emoji: '🧬', sector: 'santé', size: 'jeune',
    story: 'Deux produits en cours d’essai, et pas encore un centime de recette.',
    ticket: 0.55,
  },
  {
    id: 'kelvix', name: 'Kelvix', emoji: '🛰️', sector: 'transport', size: 'jeune',
    story: 'Veut réinventer la livraison. Brûle de l’argent en attendant.',
    ticket: 0.9,
  },
  {
    id: 'basalte', name: 'Basalte', emoji: '⛏️', sector: 'matériaux', size: 'moyenne',
    story: 'Extrait et transforme. Ce qu’elle gagne dépend d’un cours qu’elle ne fixe pas.',
    ticket: 1.9,
  },
];

export function getCompany(id: string): CompanyDef | undefined {
  return COMPANIES.find((c) => c.id === id);
}

/**
 * Ce que la taille coûte et rapporte.
 *
 * Les trois lignes sont calées sur les paniers d'actions déjà en place :
 * `bluechip` (pente 0,072 · agitation 0,21) et `smallcap` (0,125 · 0,33). Une
 * société seule est **plus agitée que le panier de sa catégorie** — c'est le
 * prix de ne pas être diversifié — et sa pente moyenne n'est pas meilleure.
 * Ce qu'elle offre en échange n'est pas un rendement, c'est de la lisibilité.
 */
const BY_SIZE: Record<Size, Omit<AssetDef, 'id' | 'name' | 'emoji' | 'klass' | 'description'>> = {
  grande: {
    drift: 0.066, beta: 0.9, volatility: 0.26, crashRisk: 0.05,
    // **Moins cher à l'entrée qu'un panier**, et c'est vrai : une part se
    // paie à l'unité, un panier se paie en bloc. Sans cet écart, un panier
    // dominerait purement et simplement chaque société — mêmes frais, même
    // difficulté, moins d'agitation — et le garde-fou du marché le disait.
    lockYears: 0, fee: 0.01, minimum: 120, literacy: 30,
  },
  moyenne: {
    drift: 0.084, beta: 1.2, volatility: 0.38, crashRisk: 0.08,
    lockYears: 0, fee: 0.012, minimum: 90, literacy: 42,
  },
  jeune: {
    drift: 0.108, beta: 1.6, volatility: 0.54, crashRisk: 0.16,
    lockYears: 0, fee: 0.015, minimum: 60, literacy: 55,
  },
};

/**
 * Ce que le secteur change.
 *
 * Sans cela, deux sociétés de même taille seraient rigoureusement le même
 * support sous deux noms — et le garde-fou du marché, qui compare les
 * rendements réellement obtenus, finissait par déclarer que l'une « écrase »
 * l'autre sur un simple écart de tirage. Deux supports identiques ne peuvent
 * pas se départager autrement que par le bruit ; il fallait donc qu'ils ne
 * soient pas identiques.
 *
 * Les écarts disent quelque chose du secteur : l'énergie suit la conjoncture
 * de près et rapporte peu, la santé va son chemin sans elle, les loisirs
 * s'effondrent au premier coup de froid, l'alimentation ne bouge jamais.
 */
const BY_SECTOR: Record<Sector, { drift: number; beta: number; volatility: number }> = {
  énergie: { drift: -0.006, beta: 0.25, volatility: 0.02 },
  santé: { drift: 0.008, beta: -0.3, volatility: 0.04 },
  transport: { drift: 0, beta: 0.15, volatility: 0 },
  // Le repli le plus calme du marché — mais **une maison seule reste plus
  // agitée qu'un panier** : à −0,05, Verdania tombait exactement sur les 0,21
  // du panier de grandes valeurs, ce qui en aurait fait un panier gratuit
  // avec un rapport à lire en prime.
  alimentation: { drift: -0.01, beta: -0.35, volatility: -0.02 },
  loisirs: { drift: 0.012, beta: 0.4, volatility: 0.06 },
  matériaux: { drift: 0.004, beta: 0.2, volatility: 0.03 },
};

/** Une société vue par le marché : un support ordinaire. */
export function assetForCompany(company: CompanyDef): AssetDef {
  const size = BY_SIZE[company.size];
  const sector = BY_SECTOR[company.sector];
  return {
    id: `co_${company.id}`,
    name: company.name,
    emoji: company.emoji,
    klass: 'action',
    description: company.story,
    ...size,
    minimum: Math.round(size.minimum * company.ticket),
    drift: Math.round((size.drift + sector.drift) * 1000) / 1000,
    beta: Math.round((size.beta + sector.beta) * 100) / 100,
    volatility: Math.round((size.volatility + sector.volatility) * 1000) / 1000,
  };
}

/** L'identifiant de support d'une société, et l'inverse. */
export function assetIdOf(company: CompanyDef): string {
  return `co_${company.id}`;
}

export function companyOfAsset(assetId: string): CompanyDef | undefined {
  return assetId.startsWith('co_') ? getCompany(assetId.slice(3)) : undefined;
}

/* ------------------------------------------------------------------ */
/* Ce qu'une société publie                                            */
/* ------------------------------------------------------------------ */

/**
 * Deux natures de fait, et c'est toute la difficulté.
 *
 * **`passé`** : ce qui s'est déjà produit. Le cours l'a déjà intégré, donc le
 * lire n'apprend rien de ce qui vient — mais c'est ce qui se lit le plus
 * facilement, et c'est ce dont on parle le plus.
 *
 * **`avenir`** : ce qui est en train de se produire et que le cours n'a pas
 * encore vu. C'est ce qui compte, et c'est ce qui demande de savoir lire.
 *
 * Le jeu ne dit pas au joueur laquelle est laquelle tant qu'il ne sait pas
 * assez de finance ; il le lui montre quand il en sait assez. C'est ce que
 * mesure la culture financière, et c'est ce qui lui donne enfin un usage.
 */
export type FactKind = 'passé' | 'avenir';

export interface FactDef {
  id: string;
  kind: FactKind;
  /** La phrase, telle qu'elle s'affiche. */
  text: string;
  /**
   * Le sens : +1 = ce qui va bien, −1 = ce qui va mal.
   *
   * Pour un fait d'avenir, c'est ce que la santé de la société est en train de
   * faire. Pour un fait de passé, c'est ce que le cours a déjà fait.
   */
  way: 1 | -1;
}

export const FACTS: FactDef[] = [
  // Ce qui se voit déjà dans le cours.
  { id: 'cours_haut', kind: 'passé', way: 1, text: 'Le titre a bien monté l’an dernier.' },
  { id: 'cours_bas', kind: 'passé', way: -1, text: 'Le titre a nettement reculé l’an dernier.' },
  { id: 'prime', kind: 'passé', way: 1, text: 'La direction s’est augmentée après un bon exercice.' },
  { id: 'plan', kind: 'passé', way: -1, text: 'Un plan d’économies a été annoncé après une mauvaise année.' },
  { id: 'presse', kind: 'passé', way: 1, text: 'On en dit beaucoup de bien depuis quelques mois.' },
  { id: 'rumeur', kind: 'passé', way: -1, text: 'La maison a mauvaise presse depuis quelques mois.' },

  // Ce que le cours n'a pas encore vu.
  { id: 'commandes', kind: 'avenir', way: 1, text: 'Le carnet de commandes se remplit pour les deux ans qui viennent.' },
  { id: 'marge', kind: 'avenir', way: -1, text: 'La marge s’effrite d’un trimestre à l’autre.' },
  { id: 'dette', kind: 'avenir', way: -1, text: 'La dette a doublé sans que l’activité suive.' },
  { id: 'atelier', kind: 'avenir', way: 1, text: 'Un nouvel atelier ouvre et tourne déjà à plein.' },
  { id: 'depart', kind: 'avenir', way: -1, text: 'Trois dirigeants sont partis en six mois.' },
  { id: 'contrat', kind: 'avenir', way: 1, text: 'Un contrat vient d’être signé pour plusieurs années.' },
  { id: 'proces', kind: 'avenir', way: -1, text: 'Un procès en cours pourrait coûter cher.' },
  { id: 'brevet', kind: 'avenir', way: 1, text: 'Un brevet vient d’être accordé sur le procédé maison.' },
];

export function getFact(id: string): FactDef | undefined {
  return FACTS.find((f) => f.id === id);
}
