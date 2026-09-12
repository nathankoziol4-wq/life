/**
 * L'audience.
 *
 * **Ce que ce fichier remplace.** `justice.ts#goToTrial` : choisir un avocat
 * parmi quatre prix, payer, lancer un dé, annoncer le verdict. Le joueur
 * choisissait un niveau de gamme. Le catalogue : « le procès est un calcul :
 * aucune scène, aucune plaidoirie à conduire ».
 *
 * Ce n'est plus supportable depuis ce même chantier : `advanceTrial` fait
 * juger toute affaire qu'on laisse traîner, et `office.ts` a fait de la
 * condamnation ce qui coûte une carrière. Le moment le plus lourd du jeu
 * tenait en un lancer.
 *
 * **Ce qui se joue ici est une dépense, pas une devinette.** L'entretien
 * d'embauche fait deviner une préférence cachée ; l'audience fait gérer une
 * ressource finie contre une information partielle. On ne peut pas tout
 * contester : attaquer un point qu'ils tiennent coûte du crédit et rend les
 * suivants plus durs à emporter. Céder ce qu'ils ont vraiment est ce qui
 * laisse de quoi se battre sur ce qu'ils n'ont pas.
 *
 * **L'avocat achète de la vue, pas du résultat.** Il donnait quarante-deux
 * points de probabilité à `acquittalChance` : c'était un achat de verdict.
 * Il décide maintenant de combien de charges on peut lire avant de décider.
 * C'est la même correction que pour les médecins de `practitioners.ts`, où la
 * compétence s'affichait en clair et choisir se réduisait à une soustraction.
 *
 * **Sur l'abstraction.** Ni juridiction, ni règle de preuve, ni acte, ni
 * conseil : une charge est un objet de jeu portant un nombre caché, le crédit
 * est une jauge. Rien de ce qu'on y apprend ne s'applique ailleurs qu'ici.
 */

import { clamp } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import type { ActionResult, GameState, HearingState } from '../engine/types.ts';
import {
  CHARGES, CONCEDE_WEIGHT, CONTEST_COST, CONTEST_GAIN, CREDIT_BASE,
  CREDIT_PRIOR, CREDIT_REPUTATION, FAILED_WEIGHT, ROUNDS, SIGHT_BAND,
  SIGHT_FLOOR, SIGHT_RANGE, SILENCE_COST, SILENCE_WEIGHT, STANCES, SWING,
  SWING_PIVOT, WON_WEIGHT,
  type Charge, type Stance,
} from '../data/hearing.ts';
import { LAWYERS } from '../data/crimes.ts';
import { pendingTrial } from './justice.ts';

export { CHARGES, STANCES };
export type { Charge, Stance };

/**
 * Un tirage déterministe qui ne consomme rien.
 *
 * La solidité d'une charge doit être **la même** que le joueur ouvre l'écran
 * ou laisse faire, et rester la même s'il le rouvre : sans cela on relancerait
 * jusqu'à tomber sur un dossier creux. Elle ne peut donc pas venir du
 * générateur de la partie, dont chaque tirage décale toute la suite.
 */
function hash(seed: number, salt: number): number {
  let h = (Math.abs(Math.round(seed)) ^ (salt * 0x9e37_79b9)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85eb_ca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2_ae35) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4_294_967_296;
}

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

export function hearingOf(state: GameState): HearingState | null {
  return state.player.hearing;
}

/** Les charges de cette audience-ci, tirées de l'affaire et de rien d'autre. */
export function chargesOf(state: GameState): Charge[] {
  const trial = pendingTrial(state);
  if (!trial) return [];
  const key = state.seed + trial.year * 977 + trial.crimeId.length * 31;
  return [...CHARGES]
    .map((c, i) => ({ c, k: hash(key, i + 1) }))
    .sort((a, b) => a.k - b.k)
    .slice(0, ROUNDS)
    .map((x) => x.c);
}

/**
 * Ce qu'ils tiennent réellement sur ce point, de 0 à 100.
 *
 * Tiré de la preuve du dossier : une affaire accablante donne des charges
 * majoritairement solides, une affaire mince des charges majoritairement
 * creuses — mais **jamais toutes dans le même sens**, sinon il n'y aurait rien
 * à choisir. C'est ce qui reste caché quand on plaide sans voir.
 */
export function solidityOf(state: GameState, charge: Charge): number {
  const trial = pendingTrial(state);
  if (!trial) return 0;
  const key = state.seed + trial.year * 977 + trial.crimeId.length * 31;
  const draw = hash(key, 5_000 + charge.id.length * 17 + charge.weight);
  // Autour de la preuve, avec de quoi surprendre dans les deux sens.
  return Math.round(clamp(trial.evidence * 0.62 + 19 + (draw - 0.5) * 74, 2, 98));
}

/** Ce que l'avocat retenu laisse voir, de 0 à 1. */
export function sightOf(state: GameState): number {
  const hearing = hearingOf(state);
  const lawyer = LAWYERS.find((l) => l.id === hearing?.lawyerId);
  if (!lawyer) return SIGHT_FLOOR;
  return SIGHT_FLOOR + (lawyer.quality / 100) * SIGHT_RANGE;
}

/**
 * Ce que le joueur voit de ce point, ou rien.
 *
 * Jamais le chiffre exact : une fourchette. Un ténor du barreau ne donne pas
 * la réponse, il réduit l'incertitude — sans quoi l'audience redeviendrait un
 * calcul, comme le procès qu'elle remplace.
 */
export function readOf(state: GameState, charge: Charge): { low: number; high: number } | null {
  const hearing = hearingOf(state);
  if (!hearing) return null;
  const trial = pendingTrial(state);
  if (!trial) return null;
  const key = state.seed + trial.year * 977;
  // Quelles charges sont lisibles est décidé une fois, et pas à chaque regard.
  if (hash(key, 9_000 + charge.weight) > sightOf(state)) return null;
  const real = solidityOf(state, charge);
  const skew = (hash(key, 11_000 + charge.weight) - 0.5) * SIGHT_BAND;
  const mid = clamp(real + skew, 0, 100);
  return {
    low: Math.round(clamp(mid - SIGHT_BAND / 2, 0, 100)),
    high: Math.round(clamp(mid + SIGHT_BAND / 2, 0, 100)),
  };
}

/** Ce que dit une lecture, en mots. */
export function readSays(read: { low: number; high: number } | null): string {
  if (!read) return 'Tu ne sais pas ce qu’ils ont là-dessus.';
  const mid = (read.low + read.high) / 2;
  if (mid < 25) return `Ils n’ont presque rien (${read.low}–${read.high}).`;
  if (mid < 45) return `Ça a l’air mince (${read.low}–${read.high}).`;
  if (mid < 65) return `Difficile à dire (${read.low}–${read.high}).`;
  if (mid < 82) return `Ils tiennent quelque chose (${read.low}–${read.high}).`;
  return `N’y touche pas (${read.low}–${read.high}).`;
}

/** Le crédit dont on dispose maintenant. */
export function creditOf(state: GameState): number {
  return Math.round(hearingOf(state)?.credit ?? 0);
}

/** Le poids accumulé contre soi. */
export function weightOf(state: GameState): number {
  return Math.round(hearingOf(state)?.weight ?? 0);
}

/** La charge en cours, s'il en reste. */
export function currentCharge(state: GameState): Charge | null {
  const hearing = hearingOf(state);
  if (!hearing) return null;
  return chargesOf(state)[hearing.round] ?? null;
}

/* ------------------------------------------------------------------ */
/* Ouvrir                                                              */
/* ------------------------------------------------------------------ */

/** Pourquoi on ne peut pas tenir d'audience, ou rien. */
export function hearingBlocker(state: GameState, lawyerId: string): string | null {
  const trial = pendingTrial(state);
  if (!trial) return 'Aucune procédure en cours.';
  if (hearingOf(state)) return 'L’audience a commencé.';
  const lawyer = LAWYERS.find((l) => l.id === lawyerId);
  if (!lawyer) return 'Avocat inconnu.';
  return null;
}

/**
 * Entrer dans la salle.
 *
 * Les honoraires sont prélevés par `justice.ts#goToTrial` au moment du
 * verdict, comme avant : on ne paie pas deux fois, et l'on ne paie pas pour
 * une audience qu'on n'a pas conduite jusqu'au bout.
 */
export function openHearing(ctx: Ctx, lawyerId: string): ActionResult {
  const { state } = ctx;
  const why = hearingBlocker(state, lawyerId);
  if (why) return { ok: false, message: why };
  const p = state.player;

  const credit = clamp(
    CREDIT_BASE
    + (p.stats.reputation / 100) * CREDIT_REPUTATION
    - p.criminalRecord.convictions.length * CREDIT_PRIOR,
    8, 100,
  );
  p.hearing = { lawyerId, round: 0, credit, weight: 0, taken: [] };
  return {
    ok: true,
    title: 'L’audience s’ouvre',
    tone: 'neutral',
    message: 'Ils vont mettre des choses sur la table. Tu ne pourras pas tout contester.',
  };
}

/* ------------------------------------------------------------------ */
/* Répondre                                                            */
/* ------------------------------------------------------------------ */

/**
 * Répondre à la charge en cours.
 *
 * Tout le système est ici, et il tient en trois lignes : céder laisse peser
 * la charge entière et ne coûte rien ; se taire en laisse peser une part et
 * coûte un peu ; contester paie ou punit selon ce qu'ils tenaient — **et le
 * crédit qu'on y perd manque pour les charges suivantes**, ce qui fait de
 * l'ordre des décisions une décision à part entière.
 */
export function answer(ctx: Ctx, stance: Stance): ActionResult {
  const { state } = ctx;
  const hearing = hearingOf(state);
  const charge = currentCharge(state);
  if (!hearing || !charge) return { ok: false, message: 'Il n’y a rien à plaider.' };

  const solidity = solidityOf(state, charge);
  let line: string;
  let tone: 'good' | 'bad' | 'neutral' = 'neutral';

  if (stance === 'concéder') {
    hearing.weight += charge.weight * CONCEDE_WEIGHT;
    line = 'Tu le reconnais. Personne n’insiste, et tu gardes ce que tu as.';
  } else if (stance === 'taire') {
    hearing.weight += charge.weight * SILENCE_WEIGHT;
    hearing.credit -= SILENCE_COST;
    line = 'Tu ne réponds pas. Cela pèse moins, et cela se remarque.';
  } else {
    /*
     * **Contester coûte d'autant plus qu'on avait raison de ne pas le faire.**
     * Le crédit perdu est proportionnel à ce qu'ils tenaient : se tromper sur
     * un point solide est ce qui ruine la suite de l'audience.
     */
    const hollow = 100 - solidity;
    const won = hearing.credit >= solidity * 0.5 && hollow > solidity;
    if (won) {
      hearing.weight += charge.weight * WON_WEIGHT;
      hearing.credit = Math.min(100, hearing.credit + hollow * CONTEST_GAIN);
      tone = 'good';
      line = 'Le point tombe. Et le reste de leur dossier a l’air moins sûr.';
    } else {
      // Plus que si l'on avait cédé : on a tenté, et l'on a été démenti.
      hearing.weight += charge.weight * FAILED_WEIGHT;
      hearing.credit -= solidity * CONTEST_COST;
      tone = 'bad';
      line = 'Ils avaient de quoi. Tu viens de le montrer à tout le monde.';
    }
  }

  hearing.credit = clamp(hearing.credit, 0, 100);
  hearing.weight = Math.max(-40, hearing.weight);
  hearing.taken.push(stance);
  hearing.round += 1;

  const left = chargesOf(state).length - hearing.round;
  return {
    ok: true,
    title: charge.claim,
    tone,
    message: left > 0
      ? `${line} Crédit : ${creditOf(state)}. Encore ${left} point(s).`
      : `${line} C’est fini. Le tribunal va se prononcer.`,
  };
}

/** L'audience est-elle terminée ? */
export function hearingDone(state: GameState): boolean {
  const hearing = hearingOf(state);
  if (!hearing) return false;
  return hearing.round >= chargesOf(state).length;
}

/* ------------------------------------------------------------------ */
/* Ce que l'audience a changé                                          */
/* ------------------------------------------------------------------ */

/**
 * Ce que l'audience déplace sur la preuve retenue, en points.
 *
 * Borné des deux côtés : une audience bien conduite n'efface pas un dossier
 * accablant, et une audience ratée n'envoie pas en prison quelqu'un contre
 * qui l'on n'a rien. Elle module le calcul, elle ne le remplace pas — c'est
 * ce qu'on demande aussi à l'entretien d'embauche.
 */
export function swingOf(state: GameState): number {
  const hearing = hearingOf(state);
  if (!hearing) return 0;
  const charges = chargesOf(state);
  const total = charges.reduce((sum, c) => sum + c.weight, 0);
  if (total <= 0) return 0;
  /*
   * Rapporté à ce qu'on risquait : tout céder donne 1, tout emporter donne
   * une valeur négative. Le crédit qui reste compte aussi — finir crédible
   * vaut quelque chose même quand les points sont tombés.
   */
  const share = hearing.weight / total;
  const standing = (hearing.credit - 50) / 100;
  return Math.round(clamp((share - SWING_PIVOT) * SWING - standing * 8, -SWING, SWING));
}

/** Ce que l'audience a donné, en mots. */
export function hearingVerdict(state: GameState): string {
  const swing = swingOf(state);
  if (swing <= -18) return 'Tu as retourné la salle.';
  if (swing <= -6) return 'Tu t’en es bien sorti.';
  if (swing < 6) return 'Ni bien ni mal : le dossier décidera.';
  if (swing < 18) return 'Tu as aggravé ton cas.';
  return 'Tu n’aurais pas dû ouvrir la bouche.';
}

/** Referme l'audience. Appelé par `justice.ts` une fois le verdict rendu. */
export function closeHearing(state: GameState): void {
  state.player.hearing = null;
}

/**
 * Ce que ferait quelqu'un de raisonnable, pour qui laisse plaider son avocat.
 *
 * **Le chemin sans mini-jeu doit exister et ne doit pas être meilleur.** Un
 * joueur qui ne veut pas conduire son audience la laisse conduire, exactement
 * comme il peut laisser son personnage commettre un délit sans jouer le
 * boîtier. On cède ce qu'on voit de solide, on conteste ce qu'on voit de
 * creux, et l'on se tait sur ce qu'on ne voit pas — ce qui est raisonnable et
 * bat de peu le hasard, sans approcher ce que fait un joueur qui lit.
 */
export function autoStance(state: GameState, charge: Charge): Stance {
  const read = readOf(state, charge);
  if (!read) return 'taire';
  const mid = (read.low + read.high) / 2;
  if (mid < 40) return 'contester';
  return 'concéder';
}
