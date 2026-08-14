/**
 * Le harcèlement scolaire, comme situation et non comme météo.
 *
 * Avant : `rollBullying` tirait une probabilité, posait un drapeau, écrivait
 * « cette année a été difficile » et n'en reparlait jamais. L'audit avait
 * raison de le classer `PLACEHOLDER` — c'était un souvenir sans événement.
 *
 * Ce que ce fichier ajoute tient en quatre points.
 *
 * **1. Quelqu'un le fait.** Le harceleur est un camarade de la classe, choisi
 * pour ce qu'il est — assurance haute, empathie basse, une place à tenir — et
 * il reste dans la partie après. On peut le croiser des années plus tard.
 *
 * **2. Ça dure et ça s'aggrave.** La situation a une ampleur qui monte toute
 * seule tant qu'on n'y touche pas, à une vitesse propre au registre. Une année
 * sans rien faire n'est pas neutre : c'est une année de plus.
 *
 * **3. D'autres regardent.** Les témoins sont nommés. Ce sont eux qui rendent
 * une réponse possible ou impossible, et ce sont eux qui changent d'avis selon
 * ce qu'on fait.
 *
 * **4. Aucune réponse ne marche à tous les coups.** C'est la règle qui fait
 * du système autre chose qu'un bouton à trouver : chacune des cinq est la
 * meilleure dans un cas et la pire dans un autre, et ce qui décide est l'état
 * de la classe, de l'établissement et du foyer — pas le tirage.
 *
 * On garde intégralement la formule de risque existante : elle lisait déjà les
 * bonnes choses (le milieu scolaire, l'isolement, l'assurance, la popularité,
 * l'accompagnement de l'établissement). Ce qui change est ce qu'elle produit.
 */

import { clamp, clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import { shiftStat } from './stats.ts';
import { agreed, fullName, peopleByRelation, person, they } from '../engine/context.ts';
import type { ActionResult, GameState, Harassment, Person } from '../engine/types.ts';
import {
  BULLYING_KINDS, RESPONSES, getBullyingKind, getResponse, intensityLabel,
  WITNESS_CHOICES,
  type Response, type ResponseId, type WitnessId,
} from '../data/bullying.ts';
import { bullyingRisk, classmatesOf } from './school.ts';
import { applyExperience } from './psyche.ts';
import { discipline } from './schoolActions.ts';
import { registerSystemResolver } from './randomEvents.ts';

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

export function harassmentOf(state: GameState): Harassment | null {
  return state.player.education.harassment ?? null;
}

export function bullyOf(state: GameState): Person | null {
  const h = harassmentOf(state);
  if (!h) return null;
  const npc = person(state, h.bullyId);
  return npc?.alive ? npc : null;
}

/** Les camarades qui voient, et qui sont encore là. */
export function witnessesOf(state: GameState): Person[] {
  const h = harassmentOf(state);
  if (!h) return [];
  return h.witnessIds
    .map((id) => person(state, id))
    .filter((x): x is Person => Boolean(x?.alive));
}

/**
 * Ce sur quoi on peut réellement s'appuyer.
 *
 * Pas le nombre de témoins : le nombre de témoins qui vous aiment assez pour
 * prendre un risque. C'est toute la différence, et c'est ce qui rend
 * l'isolement une trappe plutôt qu'un malus.
 */
export function alliesOf(state: GameState): Person[] {
  return witnessesOf(state).filter((w) => w.relationship > 52);
}

/** L'appui du harceleur : ceux qui le suivent. */
export function backingOf(state: GameState): number {
  const h = harassmentOf(state);
  const bully = bullyOf(state);
  if (!h || !bully) return 0;
  const klass = state.player.origin.schoolClass;
  if (!klass) return 0;
  // Un harceleur suivi n'est pas le même problème qu'un harceleur seul.
  //
  // Ce qui le suit n'est pas « les élèves timides » — compter ainsi donnait à
  // tout harceleur une cour permanente, et rendait l'affrontement mauvais
  // partout. Ce qui le suit, c'est la part de la classe qui n'a rien contre
  // lui **et** rien pour vous : quelqu'un d'aimé affronte un garçon seul,
  // quelqu'un d'isolé affronte une salle entière.
  const followers = klass.classmateIds.filter((id) => {
    if (id === bully.id) return false;
    const mate = person(state, id);
    if (!mate?.alive) return false;
    const indifferent = (mate.psyche?.social.assertiveness ?? 50) < 62;
    return indifferent && mate.relationship < 45;
  }).length;
  return clamp(h.backing + followers * 0.35, 0, 10);
}

export function responseBlocker(state: GameState, id: ResponseId): string | null {
  const h = harassmentOf(state);
  if (!h) return 'Il ne se passe rien de ce genre en ce moment.';
  if (h.resolvedYear) return 'C’est fini.';
  if (h.triedThisYear.includes(id)) return 'Tu as déjà essayé ça cette année.';
  if (id === 'soutien' && alliesOf(state).length === 0) {
    return 'Personne, dans ceux qui voient, ne se mouillerait pour toi.';
  }
  if (id === 'parents' && livingParents(state).length === 0) {
    return 'Il n’y a personne à qui le dire à la maison.';
  }
  if (id === 'signaler' && h.reported) return 'Tu l’as déjà signalé. Ils savent.';
  return null;
}

export function availableResponses(state: GameState): Response[] {
  return RESPONSES.filter((r) => responseBlocker(state, r.id) === null);
}

function livingParents(state: GameState): Person[] {
  return peopleByRelation(state, ['father', 'mother', 'stepfather', 'stepmother'])
    .filter((x) => x.alive);
}

/* ------------------------------------------------------------------ */
/* Que ça commence                                                     */
/* ------------------------------------------------------------------ */

/**
 * Choisit qui le fait.
 *
 * Pas au hasard : quelqu'un d'assuré, peu porté à l'empathie, et qui n'est pas
 * un ami. Un harceleur tiré uniformément dans la classe donnerait des
 * situations qu'on ne comprend pas, et le jeu perdrait le peu qu'il a à dire.
 */
export function pickBully(state: GameState, rng: { pick: <T>(a: readonly T[]) => T }): Person | null {
  const mates = classmatesOf(state).filter(
    (m) => m.relation === 'classmate' && m.relationship < 58,
  );
  if (mates.length === 0) return null;
  const scored = mates
    .map((m) => ({
      m,
      score: (m.psyche?.social.assertiveness ?? m.personality.ambition)
        + (100 - m.personality.warmth)
        + (m.stats.criminality ?? 0) * 0.5,
    }))
    .sort((a, b) => b.score - a.score);
  // Parmi les trois qui s'y prêtent le plus, pour que ce ne soit pas
  // mécaniquement toujours le même profil.
  return rng.pick(scored.slice(0, 3)).m;
}

/**
 * Ouvre une situation.
 *
 * Le registre suit ce qui rend vulnérable : on met à l'écart celui qui est
 * déjà seul, on rackette celui qui a de quoi, on bouscule quand
 * l'établissement ne surveille pas.
 */
export function openHarassment(ctx: Ctx, bully: Person): Harassment | null {
  const { state, rng } = ctx;
  const p = state.player;
  const school = p.origin.school;
  if (!school) return null;

  const weights = BULLYING_KINDS.map((k) => {
    if (k.id === 'écart') return p.origin.popularity.liked < 3 ? 3 : 1;
    if (k.id === 'racket') return p.money > 400 ? 2.5 : 0.6;
    if (k.id === 'bousculades') return school.safety < 45 ? 2.5 : 0.8;
    if (k.id === 'rumeurs') return p.origin.popularity.known > 5 ? 2 : 1;
    return 1.4;
  });
  const total = weights.reduce((s, w) => s + w, 0);
  let roll = rng.float(0, total);
  let kind = BULLYING_KINDS[0];
  for (let i = 0; i < BULLYING_KINDS.length; i++) {
    roll -= weights[i];
    if (roll <= 0) { kind = BULLYING_KINDS[i]; break; }
  }

  // Ceux qui voient : les camarades les plus proches du harceleur ou de vous.
  const witnesses = classmatesOf(state)
    .filter((m) => m.id !== bully.id)
    .slice(0, 5)
    .map((m) => m.id);

  const harassment: Harassment = {
    bullyId: bully.id,
    kindId: kind.id,
    since: state.year,
    intensity: clampStat(rng.float(18, 34) + (100 - school.safety) * 0.12),
    witnessIds: witnesses,
    backing: rng.float(0, 3),
    reported: false,
    toldParents: false,
    triedThisYear: [],
    years: 0,
    resolvedYear: null,
    outcome: null,
  };
  p.education.harassment = harassment;
  bully.flags.bulliedPlayer = true;
  bully.opinion = clampStat(bully.opinion - 20);

  ctx.log('school',
    `${fullName(bully)} s’y est mis. ${kind.what.toLowerCase()}.`, 'bad');
  applyExperience(ctx, 'harcèlement', { person: bully, scale: 0.6 });
  return harassment;
}

/* ------------------------------------------------------------------ */
/* Répondre                                                            */
/* ------------------------------------------------------------------ */

/**
 * Chances de chaque réponse.
 *
 * Exposé séparément parce que l'écran s'en sert et parce que les tests en ont
 * besoin : c'est ici que se vérifie qu'aucune réponse n'est bonne partout.
 */
export function responseOdds(state: GameState, id: ResponseId): number {
  const p = state.player;
  const h = harassmentOf(state);
  const school = p.origin.school;
  if (!h || !school) return 0;
  const kind = getBullyingKind(h.kindId);
  const psy = p.psyche;

  switch (id) {
    case 'ignorer':
      // Ne rien faire marche quand ce n'est pas encore installé, et devient
      // franchement mauvais ensuite. C'est la seule réponse dont les chances
      // s'effondrent avec le temps.
      return clamp(0.62 - h.intensity / 110 - h.years * 0.1, 0.02, 0.62);
    case 'affronter': {
      // Tenir tête à quelqu'un de seul est une chose. À quelqu'un que la
      // classe suit, c'en est une autre.
      const force = psy.social.assertiveness * 0.5 + psy.social.confrontation * 0.25
        + p.stats.fitness * 0.25;
      return clamp(force / 175 - backingOf(state) * 0.055, 0.03, 0.8);
    }
    case 'signaler':
      // Ce qui décide n'est pas le courage de le dire, c'est ce que
      // l'établissement en fait. Et ce qui ne se voit pas se signale mal.
      return clamp(
        school.counselling / 190 + (kind?.visibility ?? 50) / 320 - h.intensity / 400,
        0.04, 0.82,
      );
    case 'parents': {
      // Des parents chaleureux et présents changent tout ; des parents
      // absents ou débordés n'y peuvent rien, sans que ce soit votre faute.
      const parents = livingParents(state);
      if (parents.length === 0) return 0;
      const best = Math.max(...parents.map(
        (x) => x.personality.warmth * 0.6 + x.relationship * 0.4,
      ));
      // Le temps que les parents ont réellement est ce qui sépare « je
      // t'écoute » de « je m'en occupe ».
      return clamp(best / 165 + p.origin.time.family * 0.012, 0.05, 0.85);
    }
    case 'soutien': {
      // La seule réponse dont les chances viennent entièrement des autres.
      const allies = alliesOf(state);
      if (allies.length === 0) return 0;
      const warmth = allies.reduce((s, a) => s + a.relationship, 0) / allies.length;
      return clamp(allies.length * 0.17 + (warmth - 52) / 220 - backingOf(state) * 0.03, 0.05, 0.9);
    }
    default:
      return 0;
  }
}

/**
 * Répondre.
 *
 * Une réponse qui échoue ne laisse pas les choses en l'état : elle les aggrave
 * d'autant plus qu'elle était visible. C'est ce qui donne son poids au choix —
 * sans quoi il suffirait de tout essayer dans l'ordre.
 */
export function respond(ctx: Ctx, id: ResponseId): ActionResult {
  const { state, rng } = ctx;
  const h = harassmentOf(state);
  const bully = bullyOf(state);
  if (!h || !bully) return { ok: false, message: 'Il ne se passe rien de ce genre en ce moment.' };
  const blocker = responseBlocker(state, id);
  if (blocker) return { ok: false, title: 'Impossible', message: blocker };
  const response = getResponse(id);
  const kind = getBullyingKind(h.kindId);
  if (!response || !kind) return { ok: false, message: 'Réponse inconnue.' };

  h.triedThisYear.push(id);
  const odds = responseOdds(state, id);
  const worked = rng.chance(odds);

  switch (id) {
    case 'ignorer':
      return settleIgnore(ctx, h, bully, worked);
    case 'affronter':
      return settleConfront(ctx, h, bully, worked);
    case 'signaler':
      return settleReport(ctx, h, bully, worked);
    case 'parents':
      return settleParents(ctx, h, bully, worked);
    case 'soutien':
      return settleSupport(ctx, h, worked);
    default:
      return { ok: false, message: 'Réponse inconnue.' };
  }
}

function end(ctx: Ctx, h: Harassment, outcome: string): void {
  const { state } = ctx;
  h.resolvedYear = state.year;
  h.outcome = outcome;
  // Ce qui a été vécu ne s'efface pas avec la situation : c'est la raison
  // d'être de `psyche`. Plus ça a duré, plus ça pèse.
  applyExperience(ctx, 'harcèlement', { scale: clamp(0.4 + h.years * 0.3, 0.4, 1.6) });
}

function worsen(ctx: Ctx, h: Harassment, amount: number, why: string): void {
  h.intensity = clampStat(h.intensity + amount);
  h.backing = clamp(h.backing + amount / 14, 0, 10);
  ctx.log('school', why, 'bad');
}

function settleIgnore(ctx: Ctx, h: Harassment, bully: Person, worked: boolean): ActionResult {
  const p = ctx.state.player;
  if (worked) {
    h.intensity = clampStat(h.intensity - 22);
    if (h.intensity < 12) {
      end(ctx, h, `Ça s’est éteint tout seul. ${
        they(bully) === 'elle' ? 'Elle' : 'Il'} a trouvé quelqu’un d’autre.`);
      return {
        ok: true, title: 'Ça s’est arrêté', tone: 'good',
        message: `${bully.firstName} s’est ${agreed(bully, 'lassé')}. Ce n’était pas toi que ${
          they(bully)} visait, c’était quelqu’un.`,
      };
    }
    return {
      ok: true, title: 'Ça retombe un peu', tone: 'neutral',
      message: 'Tu n’as rien dit et c’est moins fréquent. Ce n’est pas fini pour autant.',
    };
  }
  // Ne rien faire n'est jamais neutre : c'est ce que le système doit dire.
  worsen(ctx, h, 12 * (getBullyingKind(h.kindId)?.escalation ?? 1),
    'Tu n’as rien dit. Ça a été pris pour ce que c’est : une permission.');
  p.stats.happiness = clampStat(p.stats.happiness - 6);
  p.psyche.social.assertiveness = clampStat(p.psyche.social.assertiveness - 2);
  return {
    ok: false, title: 'Ça empire', tone: 'bad',
    message: 'Tu as laissé passer. Ils ont compris qu’ils pouvaient continuer.',
  };
}

function settleConfront(ctx: Ctx, h: Harassment, bully: Person, worked: boolean): ActionResult {
  const { state } = ctx;
  const p = state.player;
  // L'établissement ne fait pas le tri : répondre est un incident comme un
  // autre, et c'est exactement ce que le joueur doit peser avant de le faire.
  const sanction = discipline(ctx, 1.4, `Altercation avec ${fullName(bully)}`);

  if (worked) {
    bully.opinion = clampStat(bully.opinion - 10);
    p.origin.popularity.respected += 1;
    p.origin.popularity.intimidating += 1;
    p.psyche.social.assertiveness = clampStat(p.psyche.social.assertiveness + 5);
    end(ctx, h, `Tu lui as tenu tête devant tout le monde, et ${they(bully)} a reculé.`);
    return {
      ok: true, title: `${they(bully) === 'elle' ? 'Elle' : 'Il'} a reculé`, tone: 'good',
      message: `Tu as tenu. ${bully.firstName} ne s’y est pas ${agreed(bully, 'remis')}.${
        sanction === 'aucune' ? '' : ` L’établissement, lui, n’a pas fait le tri : ${sanction}.`}`,
    };
  }
  worsen(ctx, h, 18,
    `Tu as répondu, et ça s’est retourné contre toi devant tout le monde.`);
  p.stats.health = clampStat(p.stats.health - ctx.rng.int(0, 6));
  p.origin.popularity.liked = Math.max(0, p.origin.popularity.liked - 1);
  return {
    ok: false, title: 'Ça a mal tourné', tone: 'bad',
    message: `${they(bully) === 'elle' ? 'Elle' : 'Il'} n’était pas ${
      agreed(bully, 'seul')}. Tu t’en souviendras.${
      sanction === 'aucune' ? '' : ` Et l’établissement a retenu ton nom : ${sanction}.`}`,
  };
}

function settleReport(ctx: Ctx, h: Harassment, bully: Person, worked: boolean): ActionResult {
  const { state } = ctx;
  const p = state.player;
  h.reported = true;

  if (worked) {
    bully.flags.sanctioned = true;
    end(ctx, h, 'L’établissement a fait ce qu’il fallait.');
    return {
      ok: true, title: 'Ils ont agi', tone: 'good',
      message: `Quelqu’un a pris ça au sérieux. ${bully.firstName} a été ${
        agreed(bully, 'convoqué')}, et ça s’est arrêté là.`,
    };
  }
  // Le coût propre au signalement : ce n'est pas que ça ne marche pas, c'est
  // que ça se sait.
  for (const w of witnessesOf(state)) {
    w.relationship = clampStat(w.relationship - ctx.rng.float(3, 11));
  }
  worsen(ctx, h, 14, 'Ton signalement n’a rien donné, et tout le monde a su que tu avais parlé.');
  p.origin.popularity.liked = Math.max(0, p.origin.popularity.liked - 1);
  return {
    ok: false, title: 'Rien n’a bougé', tone: 'bad',
    message: 'On t’a écouté poliment. Il ne s’est rien passé, sauf que ça s’est su.',
  };
}

function settleParents(ctx: Ctx, h: Harassment, bully: Person, worked: boolean): ActionResult {
  const { state } = ctx;
  const p = state.player;
  h.toldParents = true;
  const parents = livingParents(state);
  const who = parents.length > 0
    ? parents.reduce((a, b) => (a.relationship > b.relationship ? a : b))
    : null;

  if (worked && who) {
    who.relationship = clampStat(who.relationship + 8);
    p.stats.stress = clampStat(p.stats.stress - 10);
    end(ctx, h, `${who.firstName} s’en est ${agreed(who, 'mêlé')}, et ça a suffi.`);
    return {
      ok: true, title: 'Quelqu’un s’en est mêlé', tone: 'good',
      message: `${fullName(who)} n’a pas laissé passer. Il y a eu un rendez-vous, et ${bully.firstName} a lâché l’affaire.`,
    };
  }
  // Quand ça ne marche pas, ça ne coûte presque rien — c'est la réponse la
  // moins risquée, et c'est pour ça qu'elle n'est pas la plus forte.
  p.stats.stress = clampStat(p.stats.stress - 3);
  h.intensity = clampStat(h.intensity + 4);
  return {
    ok: false, title: 'Ils ont entendu', tone: 'neutral',
    message: who
      ? `${who.firstName} a dit que ça passerait. Ça n’est pas passé.`
      : 'Personne à la maison n’était en état d’entendre ça.',
  };
}

function settleSupport(ctx: Ctx, h: Harassment, worked: boolean): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const allies = alliesOf(state);
  const bully = bullyOf(state);

  if (worked) {
    for (const a of allies) a.relationship = clampStat(a.relationship + 6);
    p.origin.popularity.liked += 1;
    // La seule issue qui laisse la classe meilleure qu'avant.
    end(ctx, h, 'Vous vous y êtes mis à plusieurs, et la scène n’a plus eu de public.');
    return {
      ok: true, title: 'Tu n’étais pas seul', tone: 'good',
      message: `${allies.map((a) => a.firstName).slice(0, 3).join(', ')} ${
        allies.length > 1 ? 'se sont mis' : 's’est mis'} entre ${
        bully ? bully.firstName : 'lui'} et toi. Sans public, ça ne tient pas.`,
    };
  }
  for (const a of allies) a.relationship = clampStat(a.relationship - ctx.rng.float(2, 8));
  worsen(ctx, h, 10, 'Tu as demandé de l’aide, et ceux que tu croyais proches ont regardé ailleurs.');
  return {
    ok: false, title: 'Personne n’a bougé', tone: 'bad',
    message: 'Ils t’ont dit qu’ils étaient d’accord avec toi. Aucun n’a bougé.',
  };
}

/* ------------------------------------------------------------------ */
/* Être de l'autre côté                                                */
/* ------------------------------------------------------------------ */

export function bullyBlocker(state: GameState, target: Person): string | null {
  const p = state.player;
  if (!p.origin.schoolClass) return 'Tu n’as pas de classe.';
  if (!p.origin.schoolClass.classmateIds.includes(target.id)) {
    return 'Ce n’est pas quelqu’un de ta classe.';
  }
  if (Number(p.yearActions[`pickOn:${target.id}`] ?? 0) >= 1) {
    return 'Tu as déjà fait ça cette année.';
  }
  return null;
}

/**
 * S'en prendre à quelqu'un.
 *
 * Le jeu ne l'interdit pas : il en tient la comptabilité. On gagne ce qu'on
 * vient chercher — être craint — et on perd exactement ce qu'on ne voyait pas
 * venir : être aimé, et l'idée qu'on se fait de soi.
 */
export function pickOn(ctx: Ctx, personId: string): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const target = person(state, personId);
  if (!target?.alive) return { ok: false, message: 'Personne introuvable.' };
  const blocker = bullyBlocker(state, target);
  if (blocker) return { ok: false, title: 'Impossible', message: blocker };
  p.yearActions[`pickOn:${personId}`] = 1;

  target.relationship = clampStat(target.relationship - rng.float(14, 26));
  target.opinion = clampStat(target.opinion - rng.float(18, 32));
  target.flags.bulliedByPlayer = Number(target.flags.bulliedByPlayer ?? 0) + 1;
  shiftStat(state, 'karma', -(rng.float(5, 11)));

  // Ce qu'on vient chercher.
  const laughs = rng.chance(clamp(p.psyche.social.humour / 130 + p.origin.popularity.known / 40, 0.15, 0.75));
  if (laughs) {
    p.origin.popularity.intimidating += 1;
    p.origin.popularity.known += 1;
  } else {
    // Une classe qui ne rit pas se retourne : c'est le vrai risque, et il ne
    // vient pas des adultes.
    p.origin.popularity.liked = Math.max(0, p.origin.popularity.liked - 1);
    for (const mate of classmatesOf(state)) {
      if (mate.id === target.id) continue;
      if (mate.relationship > 55) mate.relationship = clampStat(mate.relationship - rng.float(2, 8));
    }
  }

  // Et ce qu'on ne voyait pas venir : l'établissement finit par le voir.
  const repeated = Number(target.flags.bulliedByPlayer);
  const sanction = repeated >= 2
    ? discipline(ctx, 1.2 + repeated * 0.2, `Comportement envers ${fullName(target)}`)
    : 'aucune';

  return {
    ok: true,
    title: laughs ? 'Ça a fait rire' : 'Personne n’a ri',
    tone: laughs ? 'neutral' : 'bad',
    message: laughs
      ? `${target.firstName} n’a rien dit. C’est passé, et tu sais maintenant que ça passe.${
        sanction === 'aucune' ? '' : ` L’établissement a fini par le voir : ${sanction}.`}`
      : `${target.firstName} n’a rien dit, et personne n’a trouvé ça drôle. Ça se voit sur les visages.${
        sanction === 'aucune' ? '' : ` Et l’établissement l’a vu : ${sanction}.`}`,
  };
}

/* ------------------------------------------------------------------ */
/* Être témoin                                                         */
/* ------------------------------------------------------------------ */

/**
 * Ce qu'on fait quand c'est quelqu'un d'autre.
 *
 * Résolu ici et non dans le fichier d'événements parce que les conséquences
 * appartiennent à ce système : la classe, la victime, et ce que le personnage
 * apprend de lui-même.
 */
export function witness(ctx: Ctx, victimId: string, choice: WitnessId): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const victim = person(state, victimId);
  if (!victim?.alive) return { ok: false, message: 'Personne introuvable.' };

  switch (choice) {
    case 'intervenir': {
      const able = p.psyche.social.confrontation * 0.5 + p.stats.fitness * 0.3
        + p.origin.popularity.respected * 4;
      const held = rng.chance(clamp(able / 130, 0.12, 0.85));
      victim.relationship = clampStat(victim.relationship + (held ? 22 : 12));
      victim.opinion = clampStat(victim.opinion + 18);
      shiftStat(state, 'karma', (8));
      if (held) {
        p.origin.popularity.respected += 1;
        p.psyche.social.assertiveness = clampStat(p.psyche.social.assertiveness + 4);
      } else {
        p.stats.health = clampStat(p.stats.health - rng.int(0, 5));
        discipline(ctx, 1, 'Altercation dans la cour');
      }
      return {
        ok: true, title: held ? 'Tu t’es interposé' : 'Tu as essayé',
        tone: held ? 'good' : 'neutral',
        message: held
          ? `Tu t’es mis entre les deux et ça s’est arrêté. ${victim.firstName} ne l’oubliera pas.`
          : `Tu t’es mis entre les deux et tu as pris pour deux. ${victim.firstName} ne l’oubliera pas non plus.`,
      };
    }
    case 'prévenir': {
      const school = p.origin.school;
      const heard = rng.chance(clamp((school?.counselling ?? 50) / 150, 0.1, 0.8));
      victim.relationship = clampStat(victim.relationship + 10);
      shiftStat(state, 'karma', (5));
      if (!heard) {
        for (const mate of classmatesOf(state)) {
          if (mate.id === victim.id) continue;
          mate.relationship = clampStat(mate.relationship - rng.float(1, 6));
        }
      }
      return {
        ok: true, title: heard ? 'Ils ont agi' : 'Ils ont noté',
        tone: heard ? 'good' : 'neutral',
        message: heard
          ? 'Quelqu’un est intervenu. Ça n’a pas recommencé cette semaine-là.'
          : 'On t’a remercié d’être venu. Il ne s’est rien passé, et ça s’est su.',
      };
    }
    case 'rien': {
      // Ne rien faire ne coûte rien à personne d'autre. C'est justement le
      // problème, et le jeu le porte à l'intérieur plutôt qu'au dehors.
      shiftStat(state, 'karma', -(4));
      p.psyche.self.authenticity = clampStat(p.psyche.self.authenticity - 4);
      return {
        ok: true, title: 'Tu as continué ton chemin', tone: 'neutral',
        message: `Tu as vu, et tu as continué. Personne ne t’a rien reproché.`,
      };
    }
    case 'suivre': {
      shiftStat(state, 'karma', -(12));
      victim.relationship = clampStat(victim.relationship - 30);
      victim.opinion = clampStat(victim.opinion - 35);
      victim.flags.bulliedByPlayer = Number(victim.flags.bulliedByPlayer ?? 0) + 1;
      p.origin.popularity.intimidating += 1;
      p.origin.popularity.liked = Math.max(0, p.origin.popularity.liked - 1);
      return {
        ok: true, title: 'Tu t’y es mis aussi', tone: 'bad',
        message: `C’était plus facile d’être du bon côté. ${victim.firstName} t’a regardé faire.`,
      };
    }
    default:
      return { ok: false, message: 'Choix inconnu.' };
  }
}

/**
 * La scène du témoin, proposée au joueur.
 *
 * Elle ne se déclenche que s'il y a réellement quelqu'un à regarder : un
 * camarade que le joueur a déjà croisé, et qui n'est pas lui. Sans cela, ce
 * serait une question morale posée dans le vide.
 */
export function rollWitnessScene(ctx: Ctx): void {
  const { state, rng } = ctx;
  const p = state.player;
  if (!p.origin.schoolClass || p.age < 8 || p.age > 18) return;
  if (p.yearActions.witnessScene) return;
  // Pas la même année qu'on est soi-même pris pour cible : une seule scène
  // de ce genre par an, et la sienne passe d'abord.
  if (harassmentOf(state) && !harassmentOf(state)!.resolvedYear) return;
  const school = p.origin.school;
  if (!school) return;
  if (!rng.chance(clamp(school.bullying / 260, 0.04, 0.4))) return;

  const mates = classmatesOf(state);
  if (mates.length < 2) return;
  const victim = rng.pick(mates);
  const kind = rng.pick(BULLYING_KINDS);
  p.yearActions.witnessScene = 1;

  state.pending.push({
    id: ctx.id('ev'),
    eventId: 'sc_witness',
    title: 'Dans le couloir',
    text: `${fullName(victim)} est contre les casiers, et trois autres autour. ${
      kind.what}. Personne ne bouge.`,
    choices: WITNESS_CHOICES.map((c, i) => ({ label: c.label, outcome: String(i) })),
    personId: victim.id,
    payload: { system: 'bullying', victimId: victim.id },
    icon: '👀',
  });
}

// Le résolveur : les conséquences appartiennent à ce fichier, pas au format
// déclaratif des événements.
registerSystemResolver('bullying', (ctx, pending, choiceIndex) => {
  const victimId = String(pending.payload?.victimId ?? '');
  const choice = WITNESS_CHOICES[choiceIndex] ?? WITNESS_CHOICES[2];
  const result = witness(ctx, victimId, choice.id);
  const tone = result.tone ?? 'neutral';
  ctx.log('school', `Dans le couloir — ${result.message}`, tone);
  return { text: result.message, tone };
});

/* ------------------------------------------------------------------ */
/* L'année                                                             */
/* ------------------------------------------------------------------ */

/**
 * Tire si une situation s'ouvre cette année.
 *
 * Séparé de `advanceHarassment` pour que le tirage et l'aggravation soient
 * deux choses distinctes : on ne peut pas être pris pour cible et voir la
 * situation empirer dans la même année.
 */
export function rollHarassment(ctx: Ctx): void {
  const { state, rng } = ctx;
  const p = state.player;
  if (p.education.harassment && !p.education.harassment.resolvedYear) return;
  if (p.flags.bulliedYear && state.year - Number(p.flags.bulliedYear) < 4) return;
  // On ne tire que si le risque existe : hors âge scolaire ou sans
  // établissement, il ne doit pas y avoir de tirage du tout — sinon on
  // consommerait du hasard chaque année de chaque vie, y compris celles qui
  // ne mettent jamais les pieds à l'école.
  const risk = bullyingRisk(state);
  if (risk <= 0 || !rng.chance(risk)) return;
  const bully = pickBully(state, rng);
  if (!bully) return;
  p.flags.bulliedYear = state.year;
  openHarassment(ctx, bully);
}

/**
 * Ce que fait une année sans réponse.
 *
 * C'est ici que se joue la différence avec l'ancien système : une situation
 * qu'on laisse courir monte, s'installe et finit par coûter la scolarité
 * elle-même. Elle ne se dissipe pas parce que l'année a changé.
 */
export function advanceHarassment(ctx: Ctx): void {
  const { state, rng } = ctx;
  const p = state.player;
  const h = harassmentOf(state);
  if (!h) return;
  h.triedThisYear = [];

  if (h.resolvedYear) {
    // On garde la trace deux ans, le temps que l'écran puisse la montrer,
    // puis elle passe entièrement dans la psyché.
    if (state.year - h.resolvedYear > 2) p.education.harassment = null;
    return;
  }

  const bully = bullyOf(state);
  const kind = getBullyingKind(h.kindId);
  if (!bully || !kind) {
    // Le harceleur a changé d'établissement ou n'est plus là : ça s'arrête,
    // et pas parce qu'on a fait quelque chose.
    end(ctx, h, 'Parti, sans plus. Ce n’est pas toi qui as réglé ça.');
    ctx.log('school', 'Changement d’établissement. C’est fini, comme ça.', 'neutral');
    return;
  }

  h.years += 1;
  h.intensity = clampStat(h.intensity + kind.escalation * rng.float(4, 11));
  h.backing = clamp(h.backing + rng.float(0, 0.8), 0, 10);

  // Ce que ça prend, chaque année, selon ce que ça vise.
  const bite = 0.5 + h.intensity / 100;
  if (kind.hits === 'moral') p.stats.happiness = clampStat(p.stats.happiness - 5 * bite);
  if (kind.hits === 'place') p.origin.popularity.liked = Math.max(0, p.origin.popularity.liked - 1);
  if (kind.hits === 'corps') p.stats.health = clampStat(p.stats.health - 3 * bite);
  if (kind.hits === 'argent') p.money = Math.max(0, p.money - Math.round(80 * bite));
  p.stats.stress = clampStat(p.stats.stress + 7 * bite);
  p.education.grades = clamp(p.education.grades - 0.5 * bite, 0, 20);
  p.psyche.social.fearOfJudgement = clampStat(p.psyche.social.fearOfJudgement + 3 * bite);

  ctx.log('school',
    `${kind.label} — ${intensityLabel(h.intensity).label.toLowerCase()}. ${
      fullName(bully)} n’a pas lâché.`, 'bad');

  // Passé un certain point, ça déborde de l'école.
  if (h.intensity > 82 && rng.chance(0.4)) {
    p.education.absences += rng.int(2, 8);
    ctx.log('school', 'Tu as commencé à ne plus y aller. Personne ne t’a demandé pourquoi.', 'bad');
  }
  if (h.years >= 2) applyExperience(ctx, 'harcèlement', { person: bully, scale: 0.5 });
}
