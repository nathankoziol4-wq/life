/**
 * Ce qu'on organise, et ce qu'on dit.
 *
 * Le catalogue demandait « qui vient, ce qui se dit, ce que ça coûte ». Les
 * trois sont ici : `FORMS` porte le coût et la portée, `WORDS` porte ce qui se
 * dit — et **qui vient n'est pas dans ce fichier**, parce que cela ne se
 * choisit pas. Cela se calcule sur les gens tels qu'on les a laissés.
 */

/* ------------------------------------------------------------------ */
/* Ce qu'on organise                                                   */
/* ------------------------------------------------------------------ */

export interface Form {
  id: string;
  label: string;
  emoji: string;
  /**
   * Ce que ça coûte, avant indice du pays et inflation.
   *
   * Zéro pour « rien » : **il faut qu'on puisse toujours ne rien faire.** Une
   * option qui coûte est une décision ; une option qu'on ne peut pas prendre
   * n'en est pas une, et c'est justement celle-là qui doit rester ouverte à
   * quelqu'un qui n'a rien.
   */
  cost: number;
  /**
   * Jusqu'où ça porte pour ceux du dehors, de 0 à 1.
   *
   * Ce n'est pas un nombre de places : personne n'est invité, on vient ou on
   * ne vient pas. La portée dit combien loin la nouvelle va et combien de
   * gens se déplaceront pour ça — un après-midi chez soi ne fait pas traverser
   * le pays à un cousin.
   */
  reach: number;
  /**
   * Ce qu'il en arrive à la famille du mort, de 0 à 1.
   *
   * Séparé de `reach`, et il a fallu le mesurer pour s'en apercevoir : avec un
   * seul nombre, un après-midi chez soi empêchait la fille du défunt de venir.
   * **La famille n'a pas besoin qu'on la prévienne**, elle sait. Ce que la
   * dépense lui achète est marginal — un lieu, une heure, de quoi se déplacer.
   * Seul « rien du tout » la disperse vraiment, et c'est le sens de « rien ».
   */
  near: number;
  line: string;
}

export const FORMS: Form[] = [
  {
    id: 'rien',
    label: 'Ne rien organiser',
    emoji: '🚪',
    cost: 0,
    reach: 0,
    near: 0.35,
    line: 'Il y aura une date, une adresse, et personne pour la donner.',
  },
  {
    id: 'chezSoi',
    label: 'Chez soi, entre proches',
    emoji: '🕯️',
    cost: 900,
    reach: 0.62,
    near: 0.9,
    line: 'Ceux qui savent déjà viendront. Les autres l’apprendront après.',
  },
  {
    id: 'service',
    label: 'Un service',
    emoji: '⛪',
    cost: 3_400,
    reach: 0.82,
    near: 1,
    line: 'Une heure, un lieu, et le temps de prévenir tout le monde.',
  },
  {
    id: 'grand',
    label: 'Tout ce qu’il faut',
    emoji: '🌿',
    cost: 9_800,
    reach: 1,
    near: 1,
    line: 'On fait le voyage pour ce genre de chose, même de loin.',
  },
];

export function getForm(id: string | null | undefined): Form | undefined {
  return FORMS.find((f) => f.id === id);
}

/** Ce qui se fait quand on ne s'en occupe pas : la famille fait au plus court. */
export const DEFAULT_FORM = 'chezSoi';

/* ------------------------------------------------------------------ */
/* Ce qu'on dit                                                        */
/* ------------------------------------------------------------------ */

/**
 * Ce sur quoi une phrase s'appuie.
 *
 * C'est le cœur du système : chaque phrase prétend quelque chose de vrai sur
 * la personne qu'on enterre, et **la vérité est dans la sauvegarde**. Le jeu ne
 * dit pas au joueur laquelle est juste ; il lui montre le fait, à côté, et le
 * laisse lire. Ceux qui connaissaient le défunt, eux, savent.
 */
export type Claim =
  /** « J'étais là. » — vrai si on lui a parlé récemment. */
  | 'présence'
  /** « On ne se parlait plus. » — vrai si on ne lui parlait plus. */
  | 'silence'
  /** « Il m'a appris. » — vrai si on l'a connu longtemps, tôt. */
  | 'durée'
  /** « Il ne m'a jamais pardonné. » — vrai s'il pensait du mal de nous. */
  | 'rancune'
  /** « Ce qu'il a fait de sa vie. » — vrai s'il en a fait quelque chose. */
  | 'œuvre'
  /** « Je ne sais pas quoi dire. » — vrai toujours. */
  | 'aveu';

export interface Word {
  id: string;
  label: string;
  emoji: string;
  claim: Claim;
  /** Ce qui est dit, une fois choisi. */
  line: string;
  /** Ce qu'on entend si c'était creux. */
  hollow: string;
}

export const WORDS: Word[] = [
  {
    id: 'présence', label: 'Qu’il n’a jamais été seul', emoji: '🤝', claim: 'présence',
    line: 'Tu dis que tu étais là. Ceux qui t’y ont vu hochent la tête.',
    hollow: 'Tu dis que tu étais là. Deux personnes se regardent sans rien dire.',
  },
  {
    id: 'silence', label: 'Qu’on ne se parlait plus', emoji: '🪨', claim: 'silence',
    line: 'Tu le dis comme c’était. Personne ne s’attendait à l’entendre, et personne ne te le reproche.',
    hollow: 'Tu parles d’une brouille que personne dans la salle ne se rappelle.',
  },
  {
    id: 'durée', label: 'Ce qu’il t’a appris', emoji: '🧭', claim: 'durée',
    line: 'Tu racontes une chose ancienne, et trois personnes la connaissaient déjà.',
    hollow: 'Tu racontes une enfance qu’il n’a pas passée avec toi.',
  },
  {
    id: 'rancune', label: 'Ce qu’il ne t’a pas pardonné', emoji: '🥀', claim: 'rancune',
    line: 'Tu ne le ménages pas, et tu ne te ménages pas non plus. Cela tient debout.',
    hollow: 'Tu t’accuses de quelque chose que personne ne t’a jamais reproché.',
  },
  {
    id: 'œuvre', label: 'Ce qu’il a fait de sa vie', emoji: '🏛️', claim: 'œuvre',
    line: 'Tu dis ce qu’il a bâti, et la salle se souvient d’en avoir profité.',
    hollow: 'Tu prêtes à sa vie une importance que sa vie n’a pas eue.',
  },
  {
    id: 'aveu', label: 'Que tu ne sais pas quoi dire', emoji: '🕊️', claim: 'aveu',
    line: 'Tu le dis, et tu t’arrêtes là. C’est court, et c’est vrai.',
    hollow: '',
  },
];

export function getWord(id: string | null | undefined): Word | undefined {
  return WORDS.find((w) => w.id === id);
}

/* ------------------------------------------------------------------ */
/* Les réglages                                                        */
/* ------------------------------------------------------------------ */

/** Au-dessus, on vient. */
export const COMES = 0.5;

/** Combien de personnes on a le temps d'aller prévenir soi-même. */
export const TELLS = 3;

/** Ce qu'une annonce faite en personne ajoute à la force qui fait venir. */
export const TOLD_PULL = 0.3;

/** Sous ce lien, on ne se déplace pas pour quelqu'un qu'on ne connaissait pas. */
export const STRANGER_FLOOR = 0.15;

/**
 * Ce que le lien au joueur pèse, pour ceux qui viennent pour lui et non pour le
 * défunt.
 *
 * **Calibré sur l'échelle réelle du jeu, et non sur une intuition.** Mesurée sur
 * soixante vies jouées jusqu'au bout, la force des liens ne s'étale pas de 0 à
 * 100 : la médiane d'un ami est à 9 et son neuvième décile à 21, un frère est à
 * 50, un parent à 40, un grand-parent à 33. Une première version demandait
 * l'équivalent de 47 pour se déplacer, ce qui voulait dire « la fratrie, et
 * personne d'autre, jamais ».
 *
 * Avec 1,2 le seuil tombe à 30 pour la forme la plus grande, 38 pour un
 * service, 55 pour un après-midi chez soi : un frère vient au service, un ami
 * qu'on a vraiment entretenu vient si l'on a fait les choses en grand, et un
 * ami de nom ne vient pas. C'est la pente qu'on voulait.
 */
export const FOR_YOU = 1.2;

/** Au-delà de tant d'années sans se parler, on ne se déplace plus. */
export const FORGOTTEN = 25;

/** Ce que la brouille retire. */
export const ESTRANGED = 0.35;

/** L'âge à partir duquel le voyage devient une affaire. */
export const FRAIL_AGE = 84;

/** La santé sous laquelle on ne se déplace plus. */
export const FRAIL_HEALTH = 25;

/** Ce que le grand âge et la mauvaise santé retirent. */
export const FRAIL = 0.5;

/** Ce qu'une assemblée pleine rend de bonheur, au mieux. */
export const HELD_JOY = 18;

/** Ce que le vide coûte, au pire. */
export const EMPTY_STING = 20;

/** Ce qu'une parole juste vaut auprès de ceux qui savaient. */
export const TRUE_WORD = 9;

/** Ce qu'une parole creuse coûte auprès des mêmes. */
export const HOLLOW_WORD = 12;

/** Ce que « rien du tout » coûte auprès de la famille du défunt. */
export const NOTHING_HELD = 16;
