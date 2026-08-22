/**
 * La promotion.
 *
 * **Ce que ce fichier existe pour régler.** Le collège et le lycée peuplent
 * une classe entière — des camarades avec une psyché, des goûts, un
 * professeur principal, une ambiance. L'université, elle, ne construisait
 * rien : `enrollUniversity` posait `edu.stage = 'university'` et trois à cinq
 * années passaient en silence. On entrait avec un dossier, on sortait avec un
 * diplôme, et il ne s'était rien passé entre les deux.
 *
 * **Ce qui distingue une promotion d'une classe.** Une classe est subie : on
 * n'a pas choisi son collège. Une promotion est choisie — on a choisi la
 * filière — et c'est ce qui fait la valeur de ces gens-là : ils entreront
 * dans le même métier que vous. Étudier avec quelqu'un, c'est se donner un
 * confrère pour trente ans.
 *
 * D'où la mécanique, et elle tient en une phrase : **le temps passé avec sa
 * promotion se paie plus tard, à l'embauche.** Chaque année, on choisit entre
 * réviser ensemble, sortir, ou rien — trois choses qui ne donnent pas la même
 * chose. À la sortie, ceux qu'on a gardés deviennent des confrères, et un
 * confrère dans la place pèse sur une candidature.
 *
 * C'est le même levier que l'entretien, et volontairement : les deux passent
 * par le facteur de `applyToJob`, se multiplient l'un l'autre, et aucun ne
 * remplace le dossier.
 */

import { clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import type { ActionResult, GameState, JobOffer, Person } from '../engine/types.ts';
import { createPerson } from './npc.ts';
import { getMajor } from '../data/degrees.ts';

/** Ce qu'on peut faire de son temps, en dehors des cours. */
export type Together = 'réviser' | 'sortir' | 'rien';

/** À partir de quel lien un camarade de promotion reste après le diplôme. */
export const KEEPS_AT = 58;

/** Combien un seul confrère bien placé pèse sur une candidature. */
const PER_PEER = 0.09;

/** Le plafond du réseau : trois confrères pèsent déjà autant que six. */
const NETWORK_CAP = 1.28;

/** Les camarades de promotion encore en vie. */
export function cohortOf(state: GameState): Person[] {
  return Object.values(state.npcs)
    .filter((x) => x.alive && x.flags.cohort === true);
}

/** Ceux qui sont restés après le diplôme, et qui exercent le métier. */
export function peersOf(state: GameState): Person[] {
  return Object.values(state.npcs)
    .filter((x) => x.alive && typeof x.flags.peerField === 'string');
}

/**
 * Fabrique la promotion à l'entrée dans un cursus.
 *
 * Peu de monde — quatre au plus. Une promotion compte des centaines de
 * personnes ; ce qu'on suit, ce sont celles avec qui on partage un amphi et
 * des révisions, et le moteur fait vieillir chaque personne qu'il garde.
 */
export function buildCohort(ctx: Ctx, majorId: string | null): void {
  const { state, rng } = ctx;
  const p = state.player;
  // On tourne la page sur la promotion précédente, comme l'école le fait sur
  // sa classe : ceux qu'on a gardés sont déjà devenus autre chose.
  for (const person of cohortOf(state)) person.flags.cohort = false;

  const size = rng.int(3, 4);
  for (let i = 0; i < size; i++) {
    const person = createPerson(ctx, {
      relation: 'classmate',
      age: p.age + rng.int(-2, 3),
      withJob: false,
      relationship: rng.int(15, 38),
      opinion: rng.int(25, 55),
      // On n'entre pas dans une filière exigeante par hasard : la promotion
      // ressemble à qui l'a choisie.
      statsBias: { intelligence: clampStat(rng.stat(58, 22)) },
    });
    person.flags.cohort = true;
    if (majorId) person.flags.cohortMajor = majorId;
  }
}

/** Y a-t-il une promotion avec qui faire quelque chose ? */
export function hasCohort(state: GameState): boolean {
  return cohortOf(state).length > 0;
}

/** Pourquoi on ne peut pas passer du temps avec eux, le cas échéant. */
export function togetherBlocker(state: GameState): string | null {
  const p = state.player;
  if (!hasCohort(state)) return 'Tu n’as pas de promotion.';
  if (p.prison) return 'Pas depuis une cellule.';
  if (Number(p.yearActions.cohort ?? 0) >= 1) return 'Tu as déjà donné ton temps cette année.';
  return null;
}

/** Ce que chaque façon de passer l'année coûte et rapporte. */
export const TOGETHER: Record<Together, {
  label: string; note: string; emoji: string;
}> = {
  réviser: {
    label: 'Réviser ensemble',
    note: 'Les notes montent, et l’on se connaît un peu — pas beaucoup',
    emoji: '📚',
  },
  sortir: {
    label: 'Sortir avec eux',
    note: 'C’est là que les liens se font, et les notes s’en ressentent',
    emoji: '🍻',
  },
  rien: {
    label: 'Rester dans ton coin',
    note: 'Rien ne se noue, et tu gardes ton temps pour le reste',
    emoji: '🚪',
  },
};

/**
 * Passer une année avec sa promotion.
 *
 * Les trois options ne sont pas trois intensités de la même chose : réviser
 * paie tout de suite en notes, sortir paie plus tard en confrères, et ne rien
 * faire garde l'année libre pour ce qui se joue ailleurs. C'est le choix
 * qu'on veut — pas « faire plus » ou « faire moins ».
 */
export function spendYear(ctx: Ctx, how: Together): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const blocker = togetherBlocker(state);
  if (blocker) return { ok: false, title: 'Impossible', message: blocker };
  p.yearActions.cohort = 1;

  const mates = cohortOf(state);
  if (how === 'rien') {
    return {
      ok: true,
      title: 'Tu passes ton chemin',
      message: 'Tu croises les mêmes visages tous les jours sans jamais leur parler.',
      tone: 'neutral',
    };
  }

  const close = how === 'sortir' ? rng.int(7, 14) : rng.int(3, 7);
  for (const mate of mates) {
    mate.relationship = clampStat(mate.relationship + close + rng.int(-2, 3));
  }

  if (how === 'réviser') {
    p.education.grades = clampStat(p.education.grades + rng.int(3, 7));
    p.stats.happiness = clampStat(p.stats.happiness - 2);
    return {
      ok: true,
      title: 'Des soirées de révision',
      message: 'Vous vous retrouvez à la bibliothèque, et vos notes s’en ressentent.',
      tone: 'good',
    };
  }

  p.education.grades = clampStat(p.education.grades - rng.int(2, 5));
  p.stats.happiness = clampStat(p.stats.happiness + rng.int(3, 7));
  return {
    ok: true,
    title: 'Des soirées, tout court',
    message: 'Ce ne sont pas les cours dont tu te souviendras.',
    tone: 'good',
  };
}

/**
 * Le diplôme obtenu : la promotion se disperse, et ce qui restait devient un
 * réseau.
 *
 * Un camarade en dessous du seuil disparaît comme disparaît un camarade de
 * lycée — on ne garde pas trois cents visages. Au-dessus, il entre dans le
 * métier de la filière, et c'est ce qui le rend utile pour longtemps.
 */
export function graduateCohort(ctx: Ctx, majorId: string | null): void {
  const { state, rng } = ctx;
  for (const mate of cohortOf(state)) {
    mate.flags.cohort = false;
    if (mate.relationship < KEEPS_AT) {
      // Il n'était pas devenu quelqu'un pour toi : il s'efface, comme les
      // camarades de classe non gardés.
      if (mate.relation === 'classmate') delete state.npcs[mate.id];
      continue;
    }
    mate.relation = 'friend';
    const field = majorId ?? (typeof mate.flags.cohortMajor === 'string' ? mate.flags.cohortMajor : null);
    if (field) mate.flags.peerField = field;
    // Il commence sa carrière en même temps que toi : au début il ne peut pas
    // grand-chose, et son poids monte avec les années.
    mate.flags.peerSince = state.year + rng.int(0, 2);
  }
}

/**
 * Ce que le réseau vaut sur une offre donnée.
 *
 * Il ne pèse que dans **sa** filière : un confrère médecin ne fait rien pour
 * une candidature en bâtiment, et c'est tout l'intérêt d'avoir choisi une
 * filière. Il faut aussi qu'il ait eu le temps de s'installer — recommander
 * quelqu'un suppose d'avoir soi-même une place.
 */
export function networkEdge(state: GameState, offer: JobOffer): number {
  // Le lien va de l'offre vers la filière, et non l'inverse : c'est l'offre
  // qui déclare le diplôme qu'elle demande. Un confrère ne pèse donc que sur
  // les postes que **votre** diplôme ouvre — ailleurs il ne connaît personne,
  // et c'est précisément ce qui donne son prix au choix de la filière.
  if (!offer.requiresMajor || offer.requiresMajor.length === 0) return 1;
  let placed = 0;
  for (const peer of peersOf(state)) {
    const field = String(peer.flags.peerField);
    if (!getMajor(field)) continue;
    if (!offer.requiresMajor.includes(field)) continue;
    // Recommander quelqu'un suppose d'avoir soi-même une place : les deux
    // premières années après le diplôme, un confrère ne peut rien pour vous.
    const since = Number(peer.flags.peerSince ?? 0);
    if (state.year - since < 2) continue;
    placed += 1;
  }
  if (placed === 0) return 1;
  return Math.min(NETWORK_CAP, 1 + placed * PER_PEER);
}

/** Ce que le réseau donne, en une phrase, pour l'écran. */
export function networkLine(state: GameState): string {
  const peers = peersOf(state);
  if (peers.length === 0) return 'Tu n’as gardé personne de tes études.';
  return `${peers.length} confrère(s) de promotion, dans ta filière.`;
}
