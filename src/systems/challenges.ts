/**
 * Prendre un défi, le tenir, et ce qu'on en garde.
 *
 * Le catalogue reprochait deux choses au même endroit : aucun objectif à long
 * terme n'est proposé au joueur, et rien ne montre où l'on en est. Ce fichier
 * répond aux deux sans refaire ce qui existe — il **lit** le relevé de vie de
 * `systems/ribbons.ts#readLife` plutôt que d'en tenir un second, parce que
 * deux relevés du même état finissent toujours par diverger.
 *
 * Ce qui distingue un défi de tout le reste tient en trois règles.
 *
 * **1. Accepter coûte.** La plupart portent un serment : quelque chose qu'on
 * s'interdit pour le reste de la vie. Il est vérifié chaque année sur des
 * données que le jeu tenait déjà. Rompu, le défi est perdu — définitivement,
 * et pour cette vie-là seulement.
 *
 * **2. On regarde pendant, pas après.** Les étapes sont recalculées à chaque
 * année et **ne se reperdent jamais** : une étape franchie reste franchie même
 * si l'état redescend. Sans cette mémoire, un défi qui demande d'avoir eu de
 * l'argent se serait annulé à la première mauvaise année, ce qui n'est pas ce
 * qu'on avait demandé.
 *
 * **3. Le cabinet ne rend pas plus fort.** Il enregistre ce qu'on a réussi et
 * ouvre les paliers suivants. Il n'accorde ni statistique, ni argent, ni
 * avantage au départ. Un cabinet qui donnerait quelque chose ferait de la
 * difficulté une affaire de patience : il suffirait de jouer longtemps.
 */

import type { Ctx } from '../engine/context.ts';
import type { ActionResult, GameState, TakenChallenge } from '../engine/types.ts';
import {
  CHALLENGES, MAX_TAKEN, VAULT_PIECES, VOWS, getChallenge, getVaultPiece,
  getVow, scopeLabel, tierCost, tierLabel,
  type Challenge, type ChallengeView,
} from '../data/challenges.ts';
import { readLife } from './ribbons.ts';
import { vowActive, vowBroken } from './vows.ts';
import { loadVault, recordTrophy, type Trophy } from '../engine/save.ts';
import { shiftStats } from './stats.ts';
import { applyExperience } from './psyche.ts';
import { fullName } from '../engine/context.ts';

export {
  CHALLENGES, VAULT_PIECES, VOWS, getChallenge, getVaultPiece, getVow,
  scopeLabel, tierCost, tierLabel, loadVault, type Trophy,
};

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

export function takenOf(state: GameState): TakenChallenge[] {
  return state.player.challenges.filter((t) => !t.failed && t.doneYear === null);
}

export function settledOf(state: GameState): TakenChallenge[] {
  return state.player.challenges.filter((t) => t.failed || t.doneYear !== null);
}

export function entryFor(state: GameState, id: string): TakenChallenge | undefined {
  return state.player.challenges.find((t) => t.id === id);
}

/**
 * L'état de la partie tel qu'un défi le lit.
 *
 * Un seul point de lecture, et il passe par `readLife` : c'est ce qui garantit
 * qu'un défi et un titre de fin de vie parlent bien de la même chose.
 */
export function viewOf(state: GameState): ChallengeView {
  const taken = state.player.challenges;
  return {
    life: readLife(state),
    generation: Number(state.player.flags.generation ?? 1),
    year: state.year,
    yearActions: Object.values(state.player.yearActions).reduce((s, n) => s + n, 0),
    vowIntact: taken.every((t) => !t.failed),
  };
}

/**
 * Les étapes d'un défi, avec ce qui est franchi.
 *
 * `view` est passé de l'extérieur quand on en lit plusieurs d'affilée :
 * `viewOf` reconstruit tout le relevé de vie, qui parcourt les PNJ plusieurs
 * fois. L'écran en liste dix-sept — le recalculer à chaque ligne faisait
 * dix-sept relevés complets par image.
 */
export function stepsOf(state: GameState, challenge: Challenge, shared?: ChallengeView): {
  label: string; done: boolean; hidden: boolean;
}[] {
  const entry = entryFor(state, challenge.id);
  const view = shared ?? viewOf(state);
  const done = new Set(entry?.done ?? []);
  return challenge.steps.map((step, i) => {
    const isDone = done.has(i) || (Boolean(entry) && step.test(view));
    // Une chasse ne montre que le pas suivant : c'est ce qui en fait une
    // piste plutôt qu'une liste de courses.
    const hidden = challenge.scope === 'chasse' && !isDone
      && i > 0 && !done.has(i - 1);
    return { label: step.label, done: isDone, hidden };
  });
}

/** Où l'on en est, de 0 à 1. */
export function progressOf(state: GameState, challenge: Challenge, shared?: ChallengeView): number {
  const steps = stepsOf(state, challenge, shared);
  return steps.length ? steps.filter((s) => s.done).length / steps.length : 0;
}

/* ------------------------------------------------------------------ */
/* Le cabinet                                                          */
/* ------------------------------------------------------------------ */

/** Ce que le cabinet contient, toutes parties confondues. */
export function vaultPieces(): Trophy[] {
  return loadVault();
}

/** Un palier est-il ouvert ? Il faut des pièces, et elles ne s'achètent pas. */
export function tierOpen(tier: number): boolean {
  return vaultPieces().length >= tierCost(tier);
}

/** Les défis qu'on peut voir : ceux dont le palier est ouvert. */
export function shownChallenges(): Challenge[] {
  return CHALLENGES.filter((c) => tierOpen(c.tier));
}

/* ------------------------------------------------------------------ */
/* Prendre                                                             */
/* ------------------------------------------------------------------ */

export function takeBlocker(state: GameState, challenge: Challenge): string | null {
  const entry = entryFor(state, challenge.id);
  if (entry?.doneYear !== undefined && entry?.doneYear !== null) return 'Tu l’as déjà mené au bout.';
  if (entry?.failed) return 'Tu l’as perdu. Il ne se reprend pas dans cette vie.';
  if (entry) return 'Tu le portes déjà.';
  if (!tierOpen(challenge.tier)) {
    return `Il faut ${tierCost(challenge.tier)} pièce(s) au cabinet.`;
  }
  if (takenOf(state).length >= MAX_TAKEN) {
    return `Tu n’en portes pas plus de ${MAX_TAKEN} à la fois.`;
  }
  if (state.player.age < 6) return 'Tu es trop petit pour décider de ta vie.';
  // Un serment déjà rompu avant d'être prêté ne serait pas un serment.
  if (challenge.vow && vowBroken(state, challenge.vow)) {
    return `Trop tard : ${getVow(challenge.vow)?.label.toLowerCase()} n’est plus possible.`;
  }
  return null;
}

/**
 * Prendre un défi.
 *
 * Les étapes déjà satisfaites au moment où l'on accepte sont comptées tout de
 * suite : on ne demande pas de refaire ce qu'on a fait. En revanche le serment
 * ne vaut qu'à partir de maintenant — d'où le contrôle qu'il ne soit pas déjà
 * rompu.
 */
export function take(ctx: Ctx, id: string): ActionResult {
  const { state } = ctx;
  const challenge = getChallenge(id);
  if (!challenge) return { ok: false, message: 'Ce défi n’existe pas.' };
  const blocker = takeBlocker(state, challenge);
  if (blocker) return { ok: false, title: 'Impossible', message: blocker };

  const view = viewOf(state);
  // Ce qui est déjà vrai compte tout de suite : on ne demande pas de refaire
  // ce qu'on a fait. Une chasse, elle, se prend au début de la piste — sinon
  // accepter la résoudrait d'un coup, dans le désordre, et il n'y aurait
  // jamais de piste à suivre.
  const done: number[] = [];
  for (let i = 0; i < challenge.steps.length; i++) {
    if (challenge.scope === 'chasse' && i > 0 && !done.includes(i - 1)) break;
    if (challenge.steps[i].test(view)) done.push(i);
  }
  const entry: TakenChallenge = {
    id, since: state.year, done, failed: null, doneYear: null,
  };
  state.player.challenges.push(entry);

  const vow = challenge.vow ? getVow(challenge.vow) : undefined;
  ctx.log('life', `Tu prends sur toi : ${challenge.label.toLowerCase()}.`, 'neutral');
  return {
    ok: true,
    title: challenge.label,
    tone: 'neutral',
    message: vow
      ? `${challenge.brief} Et tu t’engages : ${vow.note.toLowerCase()}`
      : challenge.brief,
  };
}

/** Renoncer. Cela ne coûte rien d'autre que de ne pas l'avoir fait. */
export function abandon(ctx: Ctx, id: string): ActionResult {
  const { state } = ctx;
  const entry = entryFor(state, id);
  const challenge = getChallenge(id);
  if (!entry || !challenge || entry.failed || entry.doneYear !== null) {
    return { ok: false, message: 'Tu ne portes pas ce défi.' };
  }
  entry.failed = 'abandon';
  ctx.log('life', `Tu laisses tomber : ${challenge.label.toLowerCase()}.`, 'neutral');
  return {
    ok: true,
    title: 'Abandonné',
    tone: 'neutral',
    message: 'Personne ne t’en tiendra rigueur. Il ne se reprend pas dans cette vie.',
  };
}

/* ------------------------------------------------------------------ */
/* Les serments                                                        */
/* ------------------------------------------------------------------ */

/**
 * Un serment est-il rompu ? Voir `systems/vows.ts` — la règle y vit seule
 * pour que le moteur puisse la consulter sans dépendre de tout ce fichier.
 */
export { vowActive, vowBroken };

/* ------------------------------------------------------------------ */
/* Réussir                                                             */
/* ------------------------------------------------------------------ */

/**
 * Ce qu'un défi réussi rapporte.
 *
 * Dans la vie qui l'a mené au bout : une trace dans la personnalité, et un peu
 * de ce qu'on pense de toi. Hors de la partie : une pièce au cabinet, qui ne
 * donne rien et ouvre le palier suivant. Aucune récompense n'est chiffrée en
 * argent ou en statistique brute — ce serait une prime, et les défis
 * deviendraient une source de revenu.
 */
function award(ctx: Ctx, challenge: Challenge): void {
  const { state } = ctx;
  recordTrophy({
    pieceId: challenge.trophy,
    challengeId: challenge.id,
    who: fullName(state.player),
    year: state.year,
    age: state.player.age,
  });
  shiftStats(state, { happiness: 6 + challenge.tier * 2, reputation: challenge.tier });
  applyExperience(ctx, 'défiTenu');
  ctx.log(
    'life',
    `${challenge.label} — mené au bout. ${getVaultPiece(challenge.trophy)?.label ?? ''} entre au cabinet.`,
    'good',
  );
}

/* ------------------------------------------------------------------ */
/* L'année                                                             */
/* ------------------------------------------------------------------ */

/**
 * Une année de défis.
 *
 * L'ordre compte : on vérifie les serments d'abord, parce qu'un défi rompu ne
 * doit pas pouvoir se conclure la même année ; puis on avance les étapes ;
 * puis on conclut ce qui est complet.
 */
export function advanceChallenges(ctx: Ctx): void {
  const { state } = ctx;
  if (state.player.challenges.length === 0) return;
  const view = viewOf(state);

  for (const entry of state.player.challenges) {
    if (entry.failed || entry.doneYear !== null) continue;
    const challenge = getChallenge(entry.id);
    if (!challenge) continue;

    /* 1. Le serment. */
    if (challenge.vow && vowBroken(state, challenge.vow)) {
      entry.failed = challenge.vow;
      ctx.log(
        'life',
        `${challenge.label} : tu n’as pas tenu — ${getVow(challenge.vow)?.label.toLowerCase()}.`,
        'bad',
      );
      shiftStats(state, { happiness: -6 });
      continue;
    }

    /* 2. Les étapes. Une étape franchie le reste. */
    challenge.steps.forEach((step, i) => {
      if (entry.done.includes(i)) return;
      // Une chasse se suit dans l'ordre : on ne franchit pas la troisième
      // étape avant la deuxième, même si l'état la satisfait.
      if (challenge.scope === 'chasse' && i > 0 && !entry.done.includes(i - 1)) return;
      if (!step.test(view)) return;
      entry.done.push(i);
      if (challenge.scope === 'chasse') {
        ctx.log('life', `${challenge.label} — ${step.label.toLowerCase()}. La piste continue.`, 'good');
      }
    });

    /* 3. La conclusion. */
    if (entry.done.length >= challenge.steps.length) {
      entry.doneYear = state.year;
      award(ctx, challenge);
    }
  }
}

/**
 * Ce qui traverse la mort.
 *
 * Les défis de portée `lignée` continuent chez l'héritier — c'est le seul
 * endroit du jeu où mourir fait avancer quelque chose. Les autres se ferment :
 * une vie n'en achève pas une autre.
 */
export function carryChallenges(challenges: TakenChallenge[]): TakenChallenge[] {
  return challenges
    .filter((t) => {
      if (t.failed || t.doneYear !== null) return false;
      return getChallenge(t.id)?.scope === 'lignée';
    })
    .map((t) => ({ ...t }));
}
