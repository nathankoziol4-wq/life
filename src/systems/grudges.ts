/**
 * Se faire un ennemi, et vivre avec.
 *
 * Mesuré avant d'écrire une ligne : on pouvait insulter sa sœur **douze fois
 * de suite** et rester en bons termes avec elle — opinion 0, lien 54, ponts
 * intacts. Et `estranged`, le seul état hostile du jeu, n'apparaissait que
 * dans des filtres : il retirait la personne des amis, de l'exposition et des
 * actions, sans jamais rien déclencher. Se fâcher rendait quelqu'un absent,
 * jamais hostile.
 *
 * Trois choses font de ceci un système et non un libellé :
 *
 * **1. Ça part de ce qui existait.** `opinion` disait déjà ce que les gens
 * pensent du joueur, tombait bien à zéro, et n'était lu par personne. Une
 * rancune naît d'un tort commis envers quelqu'un dont l'opinion est déjà
 * basse — pas d'un compteur inventé pour l'occasion.
 *
 * **2. Un ennemi agit.** Il parle de vous, monte les autres contre vous,
 * refuse un service, vous barre la route au travail. Rien d'irréversible :
 * une rancune abîme la vie lentement, ce qui est plus juste et évite qu'une
 * brouille de jeunesse devienne une catastrophe définitive.
 *
 * **3. Ça se répare, mais pas gratuitement.** On peut s'excuser avant que ce
 * soit irrattrapable — ce que le jeu ne permettait nulle part —, il faut
 * avaler quelque chose, et l'autre peut refuser.
 */

import { clampStat, type Rng } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import { fullName } from '../engine/context.ts';
import type { ActionResult, GameState, Person } from '../engine/types.ts';
import {
  COOLS, FORGIVING_WEIGHT, HARD_FLOOR, HOSTILE_AT, SORRY, SORRY_LIMIT,
  SOURS_UNDER, SPITES, SPITE_COOLDOWN, TEMPER_WEIGHT, TIME_HEALS,
  TIME_HEALS_MAX, WRONGS, getWrong,
  type Spite, type Wrong,
} from '../data/grudges.ts';

export { SPITES, WRONGS, getWrong };
export type { Spite, Wrong };

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

/** L'intensité de sa rancune, de 0 à 100. */
export function grudgeOf(p: Person): number {
  return Math.max(0, Number(p.flags.grudge ?? 0));
}

/** Est-ce devenu une vraie inimitié ? */
export function hostile(p: Person): boolean {
  return p.alive && grudgeOf(p) >= HOSTILE_AT;
}

/** Lui en veut-il, même un peu ? */
export function sore(p: Person): boolean {
  return p.alive && grudgeOf(p) > 0;
}

/** Ce qu'il ne pardonne pas. */
export function grievance(p: Person): Wrong | undefined {
  return getWrong(String(p.flags.grudgeWhy ?? ''));
}

/** Tous ceux qui vous en veulent, du pire au moindre. */
export function enemies(state: GameState): Person[] {
  return Object.values(state.npcs)
    .filter((n) => hostile(n) && !n.petSpecies)
    .sort((a, b) => grudgeOf(b) - grudgeOf(a));
}

/** En un mot, où en est la rancune. */
export function grudgeWord(value: number): string {
  if (value >= 70) return 'Te déteste';
  if (value >= HOSTILE_AT) return 'T’en veut';
  if (value >= 15) return 'Ne t’a pas pardonné';
  return 'Un peu froid';
}

/* ------------------------------------------------------------------ */
/* Se faire un ennemi                                                  */
/* ------------------------------------------------------------------ */

/**
 * Un tort commis envers quelqu'un.
 *
 * Il ne tourne en rancune que si l'opinion est déjà basse : blesser
 * quelqu'un qui vous aime encore fait une déception, pas une inimitié. C'est
 * ce qui empêche la moindre dispute de créer un ennemi, et ce qui rend le
 * fait d'en créer un le résultat d'une accumulation plutôt que d'un clic.
 */
export function wrong(ctx: Ctx, target: Person, wrongId: string): boolean {
  const done = getWrong(wrongId);
  if (!done || !target.alive) return false;
  if (target.opinion > SOURS_UNDER) return false;

  // Le caractère décide de ce qui reste : un colérique garde tout, quelqu'un
  // de chaleureux passe l'éponge.
  const temper = 1 + ((target.personality.temper - 50) / 100) * TEMPER_WEIGHT;
  const warmth = 1 - ((target.personality.warmth - 50) / 100) * FORGIVING_WEIGHT;
  const added = done.weight * Math.max(0.25, temper * warmth);

  const before = grudgeOf(target);
  const after = Math.min(100, before + added);
  target.flags.grudge = after;
  target.flags.grudgeWhy = wrongId;
  if (!target.flags.grudgeSince) target.flags.grudgeSince = ctx.state.year;

  // Le passage à l'inimitié se dit une fois, et une seule.
  if (before < HOSTILE_AT && after >= HOSTILE_AT) {
    target.history.push({ year: ctx.state.year, text: done.line });
    ctx.log('family', `${fullName(target)} ne te le pardonnera pas.`, 'bad');
  }
  return after >= HOSTILE_AT;
}

/* ------------------------------------------------------------------ */
/* Ce qu'un ennemi fait                                                */
/* ------------------------------------------------------------------ */

/** Ce qu'il peut se permettre cette année. */
export function spitesOpen(state: GameState, p: Person): Spite[] {
  const at = grudgeOf(p);
  return SPITES.filter((s) => {
    if (at < s.from) return false;
    if (s.needsJob && !state.player.job) return false;
    return true;
  });
}

/** Les gens que les deux connaissent, et que l'un peut monter contre l'autre. */
function mutuals(state: GameState, p: Person): Person[] {
  return Object.values(state.npcs).filter(
    (n) => n.alive && n.id !== p.id && !n.petSpecies && !hostile(n) && n.relationship > 20,
  );
}

/**
 * Une année d'inimitié.
 *
 * Un ennemi n'agit pas tous les ans : il y a un délai, et l'intensité décide
 * du reste. Une rancune tiède se contente de rester tiède.
 */
export function advanceGrudge(ctx: Ctx, p: Person): void {
  const { state, rng } = ctx;
  if (!p.alive || p.petSpecies) return;
  const at = grudgeOf(p);
  if (at <= 0) return;

  // Elle refroidit, mais pas jusqu'à rien : seules des excuses acceptées
  // lèvent le plancher. Une inimitié qui se dissout toute seule en trois ans
  // n'en serait pas une.
  const floor = p.flags.forgiven ? 0 : HARD_FLOOR;
  const cooled = Math.max(floor, at - COOLS);
  p.flags.grudge = cooled;
  if (cooled <= 0) {
    delete p.flags.grudge;
    delete p.flags.grudgeWhy;
    delete p.flags.grudgeSince;
    return;
  }
  if (cooled < HOSTILE_AT) return;

  const last = Number(p.flags.spiteYear ?? -99);
  if (state.year - last < SPITE_COOLDOWN) return;

  const open = spitesOpen(state, p);
  if (open.length === 0) return;
  const spite = open[Math.floor(rng.next() * open.length)];
  // L'intensité module la chance : quelqu'un qui vous déteste s'y met plus
  // souvent que quelqu'un qui vous en veut simplement.
  if (!rng.chance(spite.odds * (cooled / 100))) return;

  p.flags.spiteYear = state.year;
  strike(ctx, p, spite);
}

/** Applique ce qu'il fait. */
export function strike(ctx: Ctx, p: Person, spite: Spite): void {
  const { state } = ctx;
  for (const [key, value] of Object.entries(spite.costs ?? {})) {
    const stat = key as 'reputation' | 'happiness' | 'stress' | 'karma';
    state.player.stats[stat] = clampStat(state.player.stats[stat] + value);
  }

  // Monter les autres contre vous : c'est la seule chose qui fasse d'un
  // ennemi autre chose qu'une ligne de statistique. Ce qu'il coûte se compte
  // en gens, pas en points.
  if (spite.turnsOthers) {
    const others = mutuals(state, p);
    for (const other of others.slice(0, 3)) {
      other.relationship = clampStat(other.relationship - spite.turnsOthers);
      other.opinion = clampStat(other.opinion - spite.turnsOthers);
    }
  }

  p.history.push({ year: state.year, text: spite.line });
  ctx.log('family', spite.told.replace('{p}', fullName(p)), 'bad');
}

/* ------------------------------------------------------------------ */
/* Réparer                                                             */
/* ------------------------------------------------------------------ */

/** Pourquoi on ne peut pas s'excuser, ou rien. */
export function sorryBlocker(state: GameState, p: Person): string | null {
  if (!p.alive) return `${p.firstName} n’est plus là.`;
  if (!sore(p)) return `${p.firstName} ne t’en veut pas.`;
  if (p.flags.forgiven) return `${p.firstName} t’a déjà pardonné.`;
  if (Number(p.flags.sorryTried ?? 0) >= SORRY_LIMIT) {
    return `Tu as essayé assez de fois. ${p.firstName} ne reviendra pas dessus.`;
  }
  const last = Number(p.flags.sorryYear ?? -99);
  if (state.year - last < SORRY.cooldown) return 'Tu viens d’essayer. Laisse passer un peu de temps.';
  return null;
}

/** La chance d'être écouté par celui-là, aujourd'hui. */
export function sorryOdds(state: GameState, p: Person): number {
  // Ce qu'on lui a fait pèse, ce qu'on a été pour lui aussi — et surtout le
  // temps passé depuis. Sans ce dernier terme, une rancune profonde était
  // définitive : mesuré, quatre tentatives, toutes refusées.
  const weight = 1 - (grudgeOf(p) / 100) * 0.4;
  const warmth = 0.7 + (p.personality.warmth / 100) * 0.6;
  const bond = 0.8 + (p.relationship / 100) * 0.4;
  const tries = Math.max(0.55, 1 - Number(p.flags.sorryTried ?? 0) * 0.09);
  const years = Math.max(0, state.year - Number(p.flags.grudgeSince ?? state.year));
  const time = 1 + Math.min(TIME_HEALS_MAX, years * TIME_HEALS);
  return Math.max(0.05, Math.min(0.92, SORRY.odds * weight * warmth * bond * tries * time));
}

/**
 * S'excuser.
 *
 * Le catalogue disait « une dispute ne se répare jamais volontairement ».
 * `reconnect` existait bien, mais ne s'ouvrait qu'une fois les ponts coupés —
 * c'est-à-dire trop tard, et pour 1,2 % des gens seulement.
 */
export function apologise(ctx: Ctx, personId: string): ActionResult {
  const { state, rng } = ctx;
  const p = state.npcs[personId];
  if (!p) return { ok: false, message: 'Personne.' };
  const why = sorryBlocker(state, p);
  if (why) return { ok: false, title: 'S’excuser', message: why };

  p.flags.sorryYear = state.year;
  p.flags.sorryTried = Number(p.flags.sorryTried ?? 0) + 1;
  for (const [key, value] of Object.entries(SORRY.costs)) {
    const stat = key as 'happiness' | 'stress';
    state.player.stats[stat] = clampStat(state.player.stats[stat] + value);
  }

  if (!rng.chance(sorryOdds(state, p))) {
    p.history.push({ year: state.year, text: 'N’a pas voulu t’écouter.' });
    ctx.log('family', `${fullName(p)} n’a pas voulu t’écouter.`, 'bad');
    return {
      ok: true,
      title: 'S’excuser',
      tone: 'bad',
      message: `${p.firstName} t’écoute jusqu’au bout, puis s’en va. Ce n’était pas le moment.`,
    };
  }

  const left = Math.max(0, grudgeOf(p) - SORRY.heals);
  p.flags.grudge = left;
  p.opinion = clampStat(p.opinion + 12);
  p.relationship = clampStat(p.relationship + 8);
  for (const [key, value] of Object.entries(SORRY.gives)) {
    const stat = key as 'happiness' | 'karma';
    state.player.stats[stat] = clampStat(state.player.stats[stat] + value);
  }

  if (left <= 0) {
    // Pardonné pour de bon : le plancher tombe, et la rancune peut s'éteindre.
    p.flags.forgiven = true;
    delete p.flags.grudge;
    delete p.flags.grudgeWhy;
    delete p.flags.grudgeSince;
    p.estranged = false;
    p.history.push({ year: state.year, text: 'T’a pardonné.' });
    ctx.log('family', `${fullName(p)} t’a pardonné.`, 'good');
    return {
      ok: true, title: 'S’excuser', tone: 'good',
      message: `Ça prend du temps, et ce n’est pas confortable. Mais ${p.firstName} te pardonne.`,
    };
  }

  p.history.push({ year: state.year, text: 'A entendu tes excuses.' });
  ctx.log('family', `${fullName(p)} a entendu tes excuses.`, 'neutral');
  return {
    ok: true, title: 'S’excuser', tone: 'neutral',
    message: `${p.firstName} t’écoute. Ce n’est pas réglé, mais quelque chose s’est desserré.`,
  };
}

/* ------------------------------------------------------------------ */
/* L'année                                                             */
/* ------------------------------------------------------------------ */

export function advanceGrudges(ctx: Ctx): void {
  for (const npc of Object.values(ctx.state.npcs)) advanceGrudge(ctx, npc);
}

/** Utilisé par les tests pour vérifier qu'un tirage reste un tirage. */
export function spiteChance(rng: Rng, spite: Spite, at: number): boolean {
  return rng.chance(spite.odds * (at / 100));
}
