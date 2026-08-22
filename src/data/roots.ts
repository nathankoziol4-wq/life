/**
 * D'où tu viens — les façons de chercher, et ce qu'elles coûtent.
 *
 * **Ce que ce fichier répare.** `FamilyStructure` proposait « adoption » et
 * « famille d'accueil » depuis toujours. Elles faisaient exactement trois
 * choses : renommer les parents en tuteurs, ajouter une pénalité d'ambiance,
 * et figurer sur l'écran de création. Le personnage n'apprenait **jamais**
 * qu'il avait été adopté ; il n'existait aucun parent biologique nulle part ;
 * il n'y avait rien à chercher et rien à trouver. Une étiquette, et derrière,
 * le vide.
 *
 * Le système qui s'appuie sur ce catalogue tient en une question — **savoir
 * d'où l'on vient vaut-il ce que cela coûte ?** — et il faut que la réponse
 * puisse être non. D'où trois règles de conception :
 *
 * **1. La piste la moins chère est la plus douloureuse.** Demander à ceux qui
 * vous ont élevé ne coûte pas un centime, avance plus que tout le reste, et
 * abîme le lien à chaque fois. Le registre officiel ne coûte rien à personne
 * et n'ouvre qu'à dix-huit ans. Entre les deux, une enfance entière d'attente.
 *
 * **2. Une piste vaut par ce qu'elle apporte et par ce qu'elle vaut.** Chacune
 * porte une `solidité` : ce qu'on tire d'un tiroir fouillé mène quelque part,
 * mais moins sûrement qu'un dossier. La solidité décide de ce que le
 * personnage **sait avant d'y aller** — c'est-à-dire de sa capacité à renoncer
 * en connaissance de cause, qui est la vraie décision du système.
 *
 * **3. Rien ici n'est une procédure.** Un « registre », un « organisme », un
 * « service de recherche » sont des noms de jeu ; aucune démarche réelle n'est
 * décrite, aucune administration existante n'est nommée, et le résultat est un
 * tirage pondéré, pas un mode d'emploi.
 */

export interface Lead {
  id: string;
  label: string;
  emoji: string;
  /** Âge à partir duquel la piste est ouverte. */
  from: number;
  /** Ce que ça coûte, avant l'indice du pays et l'inflation. */
  cost: number;
  /** Chance que la piste donne quelque chose, avant modulation. */
  odds: number;
  /** Ce qu'elle ajoute à la piste quand elle donne, en points sur cent. */
  gives: [number, number];
  /** Ce qu'elle vaut, 0-1. Pèse sur ce qu'on sait avant d'aller voir. */
  soundness: number;
  /** Ce qu'elle coûte à ceux qui t'ont élevé, en points de tension. */
  strain: number;
  /** Ne peut-on la suivre qu'une fois ? */
  once: boolean;
  /**
   * Ce que c'est, en une phrase **courte**.
   *
   * Courte parce que la ligne porte déjà deux nombres — les chances et ce que
   * ça leur coûte — et que ces deux-là sont ce qui permet de décider. Au
   * navigateur, les premières versions faisaient quatre à cinq lignes de
   * retour à la ligne chacune : six pistes remplissaient trois écrans, et les
   * nombres se perdaient dans la prose.
   */
  line: string;
  /**
   * Ce qu'il faut avoir sous la main, s'il y a lieu.
   *
   * `foyer` demande qu'ils soient encore là **et qu'ils te parlent encore** ;
   * `maison` demande seulement qu'il y ait une maison — on n'a pas besoin de
   * leur accord pour ouvrir un tiroir. La distinction n'est pas cosmétique :
   * sans elle, une tension trop haute fermait *toutes* les pistes gratuites
   * d'un coup, et la voie sans argent n'aboutissait qu'une fois sur trente.
   * Ce n'était plus un arbitrage, c'était un piège.
   */
  needs?: 'famille' | 'foyer' | 'maison';
}

export const LEADS: Lead[] = [
  {
    id: 'demander',
    label: 'Leur demander',
    emoji: '🗣️',
    from: 8,
    cost: 0,
    odds: 0.72,
    gives: [26, 42],
    /*
     * Solide, mais pas la plus solide — et la nuance porte tout le système.
     *
     * Elle valait 1 dans la première version, ce qui la rendait à la fois la
     * moins chère, la plus généreuse **et** la mieux renseignée : il n'y avait
     * plus aucune raison de payer un registre. Ce qu'ils savent, ils l'ont
     * appris d'un tiers, il y a vingt ans, et personne n'a vérifié depuis.
     * Ils disent beaucoup et ils disent vrai ; ils ne disent pas tout.
     */
    soundness: 0.78,
    // La seule piste qui coûte cher sans coûter d'argent. C'est l'arbitrage
    // central du système : ils savent, ils peuvent dire, et chaque fois qu'on
    // demande on leur rappelle qu'on cherche ailleurs.
    strain: 26,
    once: false,
    line: 'Ils savent — et ils entendront que tu cherches.',
    needs: 'foyer',
  },
  {
    id: 'papiers',
    label: 'Fouiller les papiers de la maison',
    emoji: '🗄️',
    from: 12,
    cost: 0,
    odds: 0.38,
    gives: [14, 26],
    // Un tiroir n'est pas un dossier : on en tire un nom, une ville, une date
    // qui ne s'accordent pas toujours.
    soundness: 0.5,
    strain: 14,
    once: false,
    line: 'Discret, et rarement complet.',
    needs: 'maison',
  },
  {
    id: 'parente',
    label: 'La parente qui savait',
    emoji: '👵',
    from: 14,
    cost: 120,
    odds: 0.5,
    gives: [18, 30],
    soundness: 0.72,
    strain: 9,
    once: false,
    line: 'Quelqu’un a toujours su, et n’a jamais eu à se taire.',
    needs: 'famille',
  },
  {
    id: 'organisme',
    label: 'L’organisme qui s’en est occupé',
    emoji: '🏛️',
    from: 16,
    cost: 1400,
    odds: 0.52,
    gives: [24, 36],
    soundness: 0.85,
    strain: 4,
    once: false,
    line: 'Des archives, une attente, une ligne de réponse.',
  },
  {
    id: 'registre',
    label: 'Le registre',
    emoji: '📜',
    from: 18,
    cost: 420,
    odds: 0.58,
    gives: [30, 44],
    soundness: 0.95,
    strain: 0,
    // Une seule fois : si le dossier est scellé, il l'est pour de bon. C'est la
    // seule piste qui puisse se fermer définitivement, et c'est ce qui rend le
    // moment où on la joue important.
    once: true,
    line: 'Une seule demande. Un dossier scellé le reste.',
  },
  {
    id: 'recherche',
    label: 'Un service de recherche',
    emoji: '🔎',
    from: 20,
    cost: 6800,
    odds: 0.64,
    gives: [32, 46],
    soundness: 0.78,
    strain: 0,
    once: false,
    line: 'Efficace, et sans égard pour ce que tu trouveras.',
  },
];

export function getLead(id: string): Lead | undefined {
  return LEADS.find((l) => l.id === id);
}

/* ------------------------------------------------------------------ */
/* Les réglages                                                        */
/* ------------------------------------------------------------------ */

/** Ce qu'il faut de piste pour pouvoir aller voir. */
export const ENOUGH = 100;

/** Une piste par an : chercher prend du temps, pas de l'argent. */
export const PER_YEAR = 1;

/**
 * En dessous de cette solidité, on ne sait pas ce qu'on va trouver.
 *
 * **Le cœur de la décision.** Au-dessus, l'écran dit ce qui attend — et le
 * joueur peut renoncer. En dessous, il faut y aller pour savoir. Payer des
 * pistes solides n'accélère donc pas la recherche : cela achète le droit de
 * choisir en connaissance de cause, ce qui vaut plus cher.
 */
export const CLEAR = 0.74;

/** Ce qu'une tension à ce niveau ferme : ils cessent de répondre. */
export const CLOSED = 68;

/** Ce que la tension retombe chaque année où l'on ne demande rien. */
export const COOLS = 6;

/**
 * Comment se décide ce qu'on trouve — et pourquoi ce n'est pas un tirage.
 *
 * Deux choses séparées, et c'est toute la subtilité du système :
 *
 * — **Qui ils sont** est fixé à la naissance, par empreinte de la graine. Une
 *   piste solide finit par le révéler, donc un joueur qui a payé des pistes
 *   sérieuses peut **renoncer en connaissance de cause**. C'est ce qu'on
 *   achète : le droit de choisir, pas un meilleur résultat.
 *
 * — **S'ils sont encore là** se joue le jour où l'on y va, et la chance tombe
 *   avec l'âge du personnage. Cela ne se sait jamais à l'avance. Attendre
 *   d'être sûr coûte donc exactement ce qu'attendre coûte dans la vie.
 *
 * Un joueur bien renseigné évite les mauvaises rencontres ; il n'évite jamais
 * d'arriver trop tard.
 */
export const WELCOMES = 0.62;
export const REFUSES = 0.34;

/** À quel âge la moitié des chances de les trouver vivants a disparu. */
export const HALF_GONE = 58;
