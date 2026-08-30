/**
 * Ce qui se passe avant l'engagement : l'essai, et le book.
 *
 * Deux reproches du catalogue, tous deux sur ce qui précède le travail.
 *
 * **L'essai.** « On est retenu ou non selon son niveau, mais l'essai lui-même
 * ne se joue pas. » Ce qu'on vous proposait était filtré en silence par votre
 * métier : un rôle trop grand n'apparaissait jamais, et il n'y avait aucun
 * moyen de tenter sa chance. On ne pouvait donc pas rater — ce qui veut dire
 * qu'on ne pouvait pas non plus oser.
 *
 * Maintenant, une deuxième liste existe à côté des propositions : ce **pour
 * quoi on peut essayer**, jusqu'à trente points au-dessus de son niveau. On
 * choisit comment s'y prendre, on le joue, et l'on obtient le rôle ou non.
 * Trois approches, et l'arbitrage n'a pas de bonne réponse : jouer ce qu'on
 * attend passe souvent et ne mène nulle part ; jouer contre son type passe
 * rarement et change une carrière.
 *
 * **Le book.** « L'agence existe et négocie ; le book, non. » Un book n'est
 * pas un compteur : il vaut par sa **variété**, pas par son épaisseur. Quatre
 * campagnes ne remplacent pas une couverture, et une pièce vieillit — montrer
 * une couverture d'il y a douze ans dit surtout qu'on n'a rien fait depuis.
 *
 * Les deux se rejoignent : c'est le book qui décide de ce pour quoi on peut
 * essayer, et l'essai qui remplit le book.
 */

import { clamp, clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import type {
  ActionResult, BookPiece, GameState, StageState, Tryout,
} from '../engine/types.ts';
import {
  APPROACHES, PIECE_KINDS, SHOOT_COST, TRYOUTS_PER_YEAR, TRYOUT_REACH,
  bookLabel, getApproach, getPieceKind, pieceFor, pieceValue,
  type Approach, type PieceKind,
} from '../data/casting.ts';
import { getDiscipline, templatesFor, type JobTemplate } from '../data/stage.ts';
import { agentOf, crewQuality, feeUnit, jobFee, templateOf } from './stage.ts';
import { autoResolve, blend, type MiniGameContext, type MiniGameResult } from '../engine/minigame.ts';
import { shiftStats } from './stats.ts';
import { applyExperience } from './psyche.ts';

export { APPROACHES, PIECE_KINDS, bookLabel, getApproach, getPieceKind };

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

function stageOf(state: GameState): StageState | null {
  return state.player.stage;
}

export function tryoutOf(state: GameState): Tryout | null {
  return state.player.stage?.tryout ?? null;
}

/* ------------------------------------------------------------------ */
/* Le book                                                             */
/* ------------------------------------------------------------------ */

/**
 * Ce que vaut le book, 0-100.
 *
 * On ne somme pas les pièces : on prend **la meilleure de chaque type**, et
 * l'on ajoute une petite prime de profondeur. C'est ce qui fait qu'un book se
 * construit en variant les engagements plutôt qu'en répétant le même.
 */
export function bookStrength(state: GameState): number {
  const stage = stageOf(state);
  if (!stage || stage.book.length === 0) return 0;
  let total = 0;
  for (const kind of PIECE_KINDS) {
    const mine = stage.book.filter((p) => p.kindId === kind.id);
    if (mine.length === 0) continue;
    const best = Math.max(...mine.map(
      (p) => pieceValue(kind, p.quality, state.year - p.year),
    ));
    // Les suivantes du même type comptent à peine : c'est le principe.
    total += best + Math.min(mine.length - 1, 3) * kind.worth * 0.06;
  }
  return clampStat(total);
}

/** Les pièces du book, de la plus récente à la plus ancienne. */
export function bookPieces(state: GameState): BookPiece[] {
  const stage = stageOf(state);
  if (!stage) return [];
  return [...stage.book].sort((a, b) => b.year - a.year);
}

/** Les types de pièces qui manquent encore. */
export function missingPieces(state: GameState): PieceKind[] {
  const stage = stageOf(state);
  if (!stage) return [];
  return PIECE_KINDS.filter((k) => !stage.book.some((p) => p.kindId === k.id));
}

/**
 * Ajoute au book ce qu'un engagement tenu a produit.
 *
 * Appelé depuis `settleJob`. Les engagements qui ne produisent pas d'image
 * n'ajoutent rien — c'est la table de `data/casting.ts` qui décide, pas cette
 * fonction.
 */
export function addToBook(state: GameState, templateId: string, quality: number): void {
  const stage = stageOf(state);
  if (!stage) return;
  const kind = pieceFor(templateId);
  if (!kind) return;
  stage.book.push({ kindId: kind.id, year: state.year, quality: clampStat(quality) });
}

export function shootBlocker(state: GameState): string | null {
  const stage = stageOf(state);
  const discipline = stage ? getDiscipline(stage.disciplineId) : null;
  if (!stage || !discipline) return 'Tu n’as pas de carrière de ce genre.';
  if (discipline.id !== 'podium') return 'Un book, ça ne sert qu’à ce métier-là.';
  if (state.player.prison) return 'Pas depuis une cellule.';
  if (Number(state.player.yearActions.bookShoot ?? 0) >= 1) {
    return 'Tu as déjà payé une séance cette année.';
  }
  if (state.player.money < shootCost(state)) return 'Tu n’as pas de quoi la payer.';
  return null;
}

export function shootCost(state: GameState): number {
  const discipline = getDiscipline('podium');
  return discipline ? Math.round(feeUnit(state, discipline) * SHOOT_COST) : 0;
}

/**
 * Payer une séance d'essais.
 *
 * Le seul moyen de remplir le book sans attendre qu'on vous engage. Ça remplit
 * une page et pas une carrière : la pièce vaut peu, et il n'y en a qu'un type.
 */
export function shoot(ctx: Ctx): ActionResult {
  const { state, rng } = ctx;
  const stage = stageOf(state);
  if (!stage) return { ok: false, message: 'Tu n’as pas de carrière de ce genre.' };
  const blocker = shootBlocker(state);
  if (blocker) return { ok: false, title: 'Impossible', message: blocker };
  state.player.yearActions.bookShoot = 1;
  state.player.money -= shootCost(state);

  const quality = clampStat(
    stage.craft * 0.5 + state.player.stats.looks * 0.35 + rng.float(-12, 12),
  );
  stage.book.push({ kindId: 'essai', year: state.year, quality });
  return {
    ok: true,
    title: 'Une séance',
    tone: 'neutral',
    message: `Quatre heures pour six images. ${bookLabel(bookStrength(state))}.`,
  };
}

/* ------------------------------------------------------------------ */
/* L'essai                                                             */
/* ------------------------------------------------------------------ */

/**
 * La portée : jusqu'où on peut viser.
 *
 * Le métier d'abord, puis ce qui parle pour vous — un agent ouvre des portes,
 * un book aussi, et l'entourage compte là où il compte.
 */
export function reach(state: GameState): number {
  const stage = stageOf(state);
  const discipline = stage ? getDiscipline(stage.disciplineId) : null;
  if (!stage || !discipline) return 0;
  return stage.craft
    + (agentOf(state) ? 8 : 0)
    + (discipline.id === 'podium' ? bookStrength(state) * 0.18 : 0)
    + (crewQuality(state) - 50) * discipline.crewWeight * 0.1;
}

/**
 * Ce pour quoi on peut essayer.
 *
 * Au-dessus de ce qu'on vous propose spontanément, et jusqu'à trente points
 * au-dessus de votre portée. En dessous, on vous le proposerait déjà ; au
 * delà, on ne vous recevrait même pas.
 */
export function tryoutTargets(state: GameState): JobTemplate[] {
  const stage = stageOf(state);
  const discipline = stage ? getDiscipline(stage.disciplineId) : null;
  if (!stage || !discipline) return [];
  const here = reach(state);
  return templatesFor(discipline.id).filter(
    (t) => t.demands > here + 4
      && t.demands <= here + TRYOUT_REACH
      && state.player.fame.level >= t.minFame * 0.6,
  );
}

export function tryoutBlocker(state: GameState): string | null {
  const stage = stageOf(state);
  if (!stage) return 'Tu n’as pas de carrière de ce genre.';
  if (state.player.prison) return 'Pas depuis une cellule.';
  if (stage.tryout) return 'Tu en as déjà un à passer.';
  if (stage.current) return 'Tu as déjà un engagement en cours.';
  if (stage.injuredUntil > state.year) return 'Tu n’es pas en état.';
  if (Number(state.player.yearActions.stageTryout ?? 0) >= TRYOUTS_PER_YEAR) {
    return 'Tu as passé assez d’essais cette année.';
  }
  return null;
}

/** Demander à passer. Il faudra encore le tenir. */
export function askTryout(
  ctx: Ctx,
  templateId: string,
  approachId: string,
): ActionResult {
  const { state, rng } = ctx;
  const stage = stageOf(state);
  const discipline = stage ? getDiscipline(stage.disciplineId) : null;
  const approach = getApproach(approachId);
  if (!stage || !discipline || !approach) {
    return { ok: false, message: 'Tu n’as pas de carrière de ce genre.' };
  }
  const blocker = tryoutBlocker(state);
  if (blocker) return { ok: false, title: 'Impossible', message: blocker };
  const template = tryoutTargets(state).find((t) => t.id === templateId);
  if (!template) return { ok: false, message: 'On ne te recevrait pas pour ça.' };

  state.player.yearActions.stageTryout = Number(state.player.yearActions.stageTryout ?? 0) + 1;
  stage.tryout = {
    templateId: template.id,
    from: rng.pick(HOUSES),
    approachId: approach.id,
    // Ce qui est demandé : l'écart à votre portée, plus ce que l'approche
    // ajoute ou retire.
    difficulty: clampStat(template.demands - approach.odds + rng.float(-5, 8)),
    fee: jobFee(state, template),
  };
  return {
    ok: true,
    title: `${discipline.tryoutName} — ${template.label.toLowerCase()}`,
    tone: 'neutral',
    message: `${approach.what} Il reste à le tenir.`,
  };
}

/** Des maisons génériques. Aucune n'existe. */
const HOUSES = [
  'une grande maison', 'un producteur qu’on t’a présenté', 'une équipe qui monte',
  'quelqu’un qui a vu ton travail', 'une agence', 'une petite structure',
];

/** Ce que le personnage apporte à l'essai. */
export function tryoutContext(state: GameState): MiniGameContext | null {
  const stage = stageOf(state);
  const discipline = stage ? getDiscipline(stage.disciplineId) : null;
  const tryout = stage?.tryout;
  if (!stage || !discipline || !tryout) return null;
  const skill = clampStat(reach(state));
  return {
    skill,
    difficulty: tryout.difficulty,
    mode: 'normal',
    grace: {
      // Un essai est court : on n'a pas le temps de s'installer, et c'est
      // exactement ce qui le distingue d'une prestation.
      time: 0.55 + (skill / 100) * 0.2,
      pressure: 1.15 - (skill / 100) * 0.3,
      tolerance: skill * 0.45,
      insight: skill > 60,
    },
    setup: {
      label: discipline.tryoutName,
      lineName: 'ce qu’on te demande',
      beatName: 'un moment à toi',
    },
  };
}

/**
 * Le verdict.
 *
 * Ce qui décide : ce que vaut le personnage, ce que le joueur a fait, et
 * l'écart à ce qu'on demandait. L'approche a déjà joué sur la difficulté —
 * elle ne joue pas deux fois ici, elle décide seulement de ce que le rôle
 * vaut si on l'obtient.
 */
export function settleTryout(ctx: Ctx, result: MiniGameResult): ActionResult {
  const { state, rng } = ctx;
  const stage = stageOf(state);
  const discipline = stage ? getDiscipline(stage.disciplineId) : null;
  const tryout = stage?.tryout;
  const context = tryoutContext(state);
  if (!stage || !discipline || !tryout || !context) {
    return { ok: false, message: 'Tu n’as pas d’essai en cours.' };
  }
  const approach = getApproach(tryout.approachId);
  const template = templateOf({ templateId: tryout.templateId });
  if (!approach || !template) return { ok: false, message: 'Essai inconnu.' };

  const performance = blend(context, result, 0.45) * 100;
  const bar = 34 + tryout.difficulty * 0.42;
  const taken = performance >= bar;
  stage.tryout = null;

  if (!taken) {
    shiftStats(state, { happiness: -approach.sting });
    // Un essai raté n'est pas neutre : on progresse un peu, et l'on garde le
    // souvenir. C'est ce qui rend le fait d'oser supportable.
    stage.craft = clamp(stage.craft + 0.6, 0, 100);
    ctx.log('work', `${discipline.tryoutName} manqué — ${template.label.toLowerCase()}.`, 'bad');
    return {
      ok: false,
      title: 'On ne te rappellera pas',
      tone: 'bad',
      message: `${tryout.from.replace(/^./, (c) => c.toUpperCase())} a pris quelqu’un d’autre.${
        approach.id === 'contre' ? ' Tu as tenté quelque chose. Personne ne l’a vu.' : ''}`,
    };
  }

  // Obtenu : le rôle rejoint les propositions, et il faudra encore le tenir.
  stage.offers = [
    {
      id: ctx.id('eng'),
      templateId: template.id,
      from: tryout.from,
      // L'approche décide de ce que le rôle vaut : jouer contre son type
      // rapporte davantage, et c'est pour cela qu'on prend le risque.
      fee: Math.round(tryout.fee * (0.85 + approach.worth * 0.2)),
      difficulty: clampStat(template.demands + rng.float(-8, 10)),
    },
    ...stage.offers,
  ];
  state.player.flags.tryoutWorth = approach.worth;
  state.player.flags.tryoutGrowth = approach.growth;
  shiftStats(state, { happiness: 6 });
  applyExperience(ctx, 'grandeRéussite');
  ctx.log('work', `${discipline.tryoutName} réussi — ${template.label.toLowerCase()}.`, 'good');
  return {
    ok: true,
    title: 'Ils te prennent',
    tone: 'good',
    message: `${template.label} est à toi si tu le veux.${
      approach.id === 'contre' ? ' Personne ne t’attendait là, et ça se saura.' : ''}`,
  };
}

/** Laisser le personnage passer l'essai sans jouer. */
export function autoTryout(ctx: Ctx): ActionResult {
  const context = tryoutContext(ctx.state);
  if (!context) return { ok: false, message: 'Tu n’as pas d’essai en cours.' };
  return settleTryout(ctx, autoResolve(ctx.rng, context));
}

/**
 * Ce que l'approche du dernier essai réussi fait à l'engagement.
 *
 * Lu par `settleJob`. Les drapeaux sont consommés : un rôle décroché contre
 * son type ne rend pas tous les suivants exceptionnels.
 */
export function consumeTryoutBonus(state: GameState): { worth: number; growth: number } {
  const worth = Number(state.player.flags.tryoutWorth ?? 1);
  const growth = Number(state.player.flags.tryoutGrowth ?? 1);
  delete state.player.flags.tryoutWorth;
  delete state.player.flags.tryoutGrowth;
  return { worth, growth };
}

/** L'essai en attente s'efface s'il n'est pas passé dans l'année. */
export function advanceCasting(ctx: Ctx): void {
  const { state } = ctx;
  const stage = stageOf(state);
  if (!stage) return;
  if (stage.tryout) {
    ctx.log('work', 'Tu n’es pas allé à l’essai. On ne te le proposera plus.', 'bad');
    stage.tryout = null;
  }
  // Un book ne se vide pas, mais les pièces trop vieilles cessent de compter :
  // on les retire au-delà d'un certain âge pour que la liste reste lisible.
  stage.book = stage.book.filter((p) => state.year - p.year <= 25);
}

/** Ce que vaut le book en une phrase, pour l'écran. */
export function bookSummary(state: GameState): string {
  const strength = bookStrength(state);
  const missing = missingPieces(state).length;
  return `${bookLabel(strength)}${missing > 0 ? ` · ${missing} type(s) qui manque(nt)` : ''}`;
}

export type { Approach, PieceKind };
