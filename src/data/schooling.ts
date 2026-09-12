/**
 * Où l'on met son enfant.
 *
 * Le catalogue disait, feuille `Relations/Enfants/Choisir son école` : « on
 * paie ce qu'il faut sans choisir d'établissement ». C'était exact, et c'était
 * d'autant plus dommage que **le catalogue d'établissements existait déjà** —
 * `data/schools.ts#SCHOOL_ARCHETYPES`, onze profils complets avec leurs frais,
 * leur niveau, leur harcèlement, leur encadrement et leur réseau. Il servait à
 * tirer l'école du joueur d'après son quartier, et personne ne pouvait rien y
 * choisir.
 *
 * Ce fichier ne redéfinit donc aucun établissement : il ajoute ce qui manquait
 * autour — **qui est ouvert à qui**, ce que chacun demande à l'enfant, et ce
 * que cela coûte à qui décide.
 *
 * Les trois côtés de l'arbitrage, et ils ne vont jamais ensemble :
 *
 * **1. Ce que ça coûte.** Les frais se paient chaque année et se disputent le
 * même argent que tout le reste de l'enfance.
 *
 * **2. Ce que ça demande à l'enfant.** Un établissement exigeant sur un enfant
 * qui ne suit pas produit des résultats et du malheur. Ce n'est pas une échelle
 * du pire au meilleur : c'est une question d'accord entre un enfant et un lieu.
 *
 * **3. Ce que ça te coûte à toi.** L'internat rend des résultats et prend
 * l'enfant ; l'instruction en famille ne coûte presque rien et prend **tes**
 * années — le même temps que compte déjà `systems/moonlight.ts`.
 */

/** Ce qu'un établissement demande à un enfant pour qu'il y tienne. */
export interface Demand {
  /** L'archétype visé, dans `data/schools.ts`. */
  id: string;
  /**
   * Ce qu'il faut de tenue pour ne pas y souffrir, 0-100.
   *
   * Comparé à la discipline de l'enfant. En dessous, il décroche : le niveau
   * ne lui profite qu'à moitié, et il est malheureux.
   */
  asks: number;
  /** Ce que l'enfant y perd d'attention parentale : l'internat l'emmène. */
  takes: number;
  /** Ce que cela prend au parent de ses propres années. */
  yours: number;
  /** Ce qu'on peut en dire en une ligne. */
  line: string;
}

export const DEMANDS: Demand[] = [
  { id: 'publicStruggling', asks: 20, takes: 0, yours: 0, line: 'Gratuit, et l’on y apprend ce qu’on peut.' },
  { id: 'publicOrdinary', asks: 34, takes: 0, yours: 0, line: 'Celle du quartier. Ni bonne ni mauvaise, et tout le monde y va.' },
  { id: 'publicSelective', asks: 62, takes: 0, yours: 0, line: 'Gratuite et exigeante : il faut suivre, et tout le monde ne suit pas.' },
  { id: 'privateContract', asks: 48, takes: 0, yours: 0, line: 'Un peu de frais, un peu d’encadrement, et beaucoup moins de casse.' },
  { id: 'privateElite', asks: 74, takes: 4, yours: 0, line: 'Ce que l’argent achète de mieux, et ce qu’il demande en retour.' },
  { id: 'international', asks: 58, takes: 2, yours: 0, line: 'Des langues, un réseau, et des camarades qui repartent tous les trois ans.' },
  { id: 'rural', asks: 26, takes: 0, yours: 0, line: 'Petite, calme, et l’on n’y rencontre jamais personne d’autre.' },
  { id: 'boarding', asks: 66, takes: 22, yours: 0, line: 'Il y dort. Tu récupères tes soirées, et tu le vois trois fois par an.' },
  { id: 'alternative', asks: 18, takes: 0, yours: 4, line: 'Il y sera heureux. Il en sortira sans la moitié de ce qu’on attend de lui.' },
  { id: 'religious', asks: 52, takes: 0, yours: 0, line: 'Cadré, prévisible, et l’on n’y discute pas beaucoup.' },
  { id: 'homeschool', asks: 30, takes: -6, yours: 34, line: 'Personne ne lui fera de mal. C’est toi qui y passes tes années.' },
];

export function getDemand(id: string | null | undefined): Demand | undefined {
  return DEMANDS.find((d) => d.id === id);
}

/* ------------------------------------------------------------------ */
/* Les réglages                                                        */
/* ------------------------------------------------------------------ */

/** L'âge où cela commence, et celui où cela finit. */
export const FROM = 6;
export const UNTIL = 18;

/**
 * Les établissements qui n'ont pas besoin d'être payés mais d'être mérités.
 *
 * Un lycée public réputé ne s'achète pas : il se demande, et l'on y entre ou
 * non selon ce que l'enfant vaut. C'est ce qui empêche le système d'être une
 * échelle de prix.
 */
export const SELECTIVE: Record<string, number> = {
  publicSelective: 12,
  privateElite: 13,
  international: 11,
};

/** Ce qu'il faut de moyenne pour être pris. */
export const MARK_FLOOR = 9;

/** Ce que le niveau de l'établissement tire l'intelligence, par an. */
export const TAUGHT = 0.09;

/** Ce que l'encadrement et le harcèlement font au bonheur, par an. */
export const MOOD = 0.14;

/** Ce que l'exigence non tenue coûte de bonheur, par an et par point manquant. */
export const STRAIN = 0.09;

/** Ce que la tenue de l'établissement donne de discipline, par an. */
export const FRAME = 0.07;

/** Ce que changer d'école coûte : on y laisse ses camarades. */
export const MOVE_STING = 9;

/**
 * Le réseau, une fois adulte : ce qu'il vaut sur le départ dans la vie.
 *
 * **Mesuré à 0,22, il ne valait rien** : la réputation de l'adulte sortait à 50
 * quel que soit l'établissement, y compris celui dont le catalogue dit que
 * quatre-vingt-seize pour cent des anciens comptent quelque part. Ce que le
 * privé d'élite vend vraiment n'est pas le niveau — le public réputé fait
 * mieux gratuitement — c'est ce carnet-là, et il fallait qu'il pèse.
 */
export const NETWORK = 1.6;
