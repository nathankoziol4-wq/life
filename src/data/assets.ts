/**
 * Ce dans quoi on peut placer de l'argent.
 *
 * Tout est fictif : aucun nom réel, aucun indice réel, aucun rendement réel.
 * Ce fichier ne dit rien du monde, il décrit un jeu — et rien de ce qui s'y
 * trouve ne constitue un conseil ni une observation sur des marchés existants.
 *
 * Chaque support est décrit par quatre nombres, et ces quatre nombres sont
 * tout ce que le moteur consomme :
 *
 * - `drift` : la pente moyenne, par an. Ce qu'on gagne à ne rien faire.
 * - `beta` : à quel point le support suit la conjoncture. Négatif, il monte
 *   quand tout descend — c'est ce qui donne un sens à la diversification.
 * - `volatility` : l'écart-type du bruit propre. C'est le prix de la pente.
 * - `crashRisk` : la probabilité annuelle d'un décrochage brutal.
 *
 * Deux règles tiennent l'ensemble, et un test mesure chacune sur des
 * centaines d'années simulées.
 *
 * **À court terme, aucun support n'écrase un autre.** Une médiane plus haute
 * se paie toujours quelque part : un plancher plus bas, un blocage, un ticket
 * plus gros, des frais, ou simplement le fait qu'il faut comprendre de quoi
 * il s'agit. C'est ce qui rend le choix réel pour qui a besoin de son argent
 * dans six ans.
 *
 * **À long terme, le risque paie.** C'est vrai, et c'est ce qui récompense de
 * commencer tôt : sur quarante ans, un fonds bat un livret sur presque toutes
 * les mesures. Le jeu ne prétend pas le contraire — il fait payer l'attente
 * plutôt que l'audace.
 *
 * Et la seule chose gratuite reste de ne pas tout mettre au même endroit.
 */

export type AssetClass =
  | 'épargne' | 'obligation' | 'indice' | 'action' | 'pierre' | 'matière' | 'jeton' | 'projet';

export interface AssetDef {
  id: string;
  name: string;
  emoji: string;
  klass: AssetClass;
  /** Une phrase, sans chiffre : ce que le joueur comprend en le lisant. */
  description: string;
  /** Pente moyenne annuelle, hors conjoncture. */
  drift: number;
  /** Sensibilité à la conjoncture. Négatif = valeur refuge. */
  beta: number;
  /** Écart-type du bruit propre, par an. */
  volatility: number;
  /** Probabilité annuelle d'un décrochage brutal. */
  crashRisk: number;
  /**
   * Années pendant lesquelles on ne peut pas revendre.
   *
   * C'est la contrainte qui rend le portefeuille intéressant : sans elle,
   * il suffirait de tout vendre à la première mauvaise nouvelle.
   */
  lockYears: number;
  /** Frais prélevés à l'achat et à la vente, en fraction du montant. */
  fee: number;
  /** Ticket minimum, avant inflation et indice de coût du pays. */
  minimum: number;
  /**
   * Ce qu'il faut comprendre pour y accéder, 0-100.
   *
   * Ce n'est pas un blocage arbitraire : les supports compliqués sont
   * précisément ceux où l'on perd de l'argent sans savoir pourquoi.
   */
  literacy: number;
}

export const ASSETS: AssetDef[] = [
  {
    id: 'passbook',
    name: 'Livret d’épargne',
    emoji: '🏦',
    klass: 'épargne',
    description: 'Ne rapporte presque rien et ne perd jamais rien. C’est déjà un choix.',
    drift: 0.021, beta: 0.05, volatility: 0.004, crashRisk: 0,
    lockYears: 0, fee: 0, minimum: 100, literacy: 0,
  },
  {
    id: 'bonds',
    name: 'Obligations d’État',
    emoji: '📜',
    klass: 'obligation',
    description: 'Prêter à un État, et attendre. Tranquille, sauf quand les prix s’emballent.',
    drift: 0.035, beta: 0.12, volatility: 0.035, crashRisk: 0.01,
    lockYears: 1, fee: 0.004, minimum: 500, literacy: 10,
  },
  {
    id: 'index',
    name: 'Fonds large',
    emoji: '📈',
    klass: 'indice',
    description: 'Un peu de tout le marché à la fois. Monte avec l’économie, tombe avec elle.',
    drift: 0.068, beta: 0.85, volatility: 0.15, crashRisk: 0.05,
    lockYears: 0, fee: 0.006, minimum: 300, literacy: 20,
  },
  {
    id: 'growth',
    name: 'Fonds de croissance',
    emoji: '🚀',
    klass: 'indice',
    description: 'Les entreprises qui promettent beaucoup. Elles tiennent parfois.',
    drift: 0.092, beta: 1.35, volatility: 0.24, crashRisk: 0.07,
    lockYears: 0, fee: 0.009, minimum: 500, literacy: 35,
  },
  {
    id: 'bluechip',
    name: 'Grande entreprise cotée',
    emoji: '🏢',
    klass: 'action',
    description: 'Une seule maison, solide et lente. Une seule maison, tout de même.',
    drift: 0.072, beta: 0.95, volatility: 0.21, crashRisk: 0.05,
    lockYears: 0, fee: 0.008, minimum: 400, literacy: 30,
  },
  {
    id: 'smallcap',
    name: 'Petite société cotée',
    emoji: '🏭',
    klass: 'action',
    description: 'Trois bonnes années, puis plus rien. Ou l’inverse.',
    drift: 0.125, beta: 1.5, volatility: 0.33, crashRisk: 0.09,
    lockYears: 0, fee: 0.012, minimum: 300, literacy: 45,
  },
  {
    id: 'realestatefund',
    name: 'Pierre-papier',
    emoji: '🧱',
    klass: 'pierre',
    description: 'De l’immobilier sans les murs. On ne récupère pas sa mise du jour au lendemain.',
    drift: 0.058, beta: 0.55, volatility: 0.095, crashRisk: 0.03,
    lockYears: 3, fee: 0.028, minimum: 2_000, literacy: 25,
  },
  {
    id: 'gold',
    name: 'Métal',
    emoji: '🪙',
    klass: 'matière',
    description: 'Ne produit rien, ne promet rien. Se tient droit quand le reste s’effondre.',
    drift: 0.034, beta: -0.65, volatility: 0.14, crashRisk: 0.01,
    lockYears: 0, fee: 0.02, minimum: 500, literacy: 15,
  },
  {
    id: 'token',
    name: 'Jetons numériques',
    emoji: '🎲',
    klass: 'jeton',
    description: 'Personne ne sait ce que ça vaut, et c’est exactement pour ça qu’on en achète.',
    drift: 0.22, beta: 1.9, volatility: 0.5, crashRisk: 0.25,
    lockYears: 0, fee: 0.015, minimum: 100, literacy: 55,
  },
  {
    id: 'venture',
    name: 'Part dans un projet',
    emoji: '🧪',
    klass: 'projet',
    description: 'Le plus souvent zéro. De temps en temps, tout le reste réuni.',
    drift: 0.33, beta: 1.2, volatility: 0.55, crashRisk: 0.3,
    lockYears: 5, fee: 0.03, minimum: 5_000, literacy: 70,
  },
];

export const ASSET_MAP = new Map(ASSETS.map((a) => [a.id, a]));

export function getAsset(id: string): AssetDef | undefined {
  return ASSET_MAP.get(id);
}

/** Libellé lisible d'une classe, pour les regroupements d'écran. */
export const CLASS_LABELS: Record<AssetClass, string> = {
  épargne: 'Épargne',
  obligation: 'Obligations',
  indice: 'Fonds',
  action: 'Actions',
  pierre: 'Pierre-papier',
  matière: 'Matières',
  jeton: 'Jetons',
  projet: 'Projets',
};
