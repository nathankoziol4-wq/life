/**
 * Demander quelque chose à ses parents.
 *
 * C'est la mécanique la plus ordinaire de l'enfance et elle manquait
 * entièrement : un enfant ne pouvait que discuter avec ses parents et leur
 * demander de l'argent. Il peut maintenant demander ce qui change réellement
 * sa vie — un téléphone, un ordinateur, un animal, une activité, la
 * permission de sortir — et chacune de ces choses est branchée sur le système
 * qui l'utilise déjà. Obtenir un ordinateur ne fait pas apparaître une ligne
 * dans un inventaire : cela change l'exposition, donc les goûts, donc parfois
 * le métier.
 *
 * Le principe : **une demande n'est pas un tirage à pile ou face**. Le parent
 * accepte, refuse, s'agace, ou pose une condition — et la condition est
 * réellement vérifiée l'année suivante. Un refus laisse une trace, une
 * promesse tenue aussi.
 */

import { clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import { fullName, person } from '../engine/context.ts';
import type { ActionResult, Condition, GameState, Person } from '../engine/types.ts';
import { invalidateContexts } from './contexts.ts';
import { adoptPetSpecies } from './activities.ts';
import { PET_SPECIES } from '../data/activities.ts';
import { record } from './causality.ts';

/* ------------------------------------------------------------------ */
/* Ce qu'on peut demander                                              */
/* ------------------------------------------------------------------ */

export type RequestId = 'phone' | 'computer' | 'pet' | 'activity' | 'curfew' | 'allowance';

export interface RequestDef {
  id: RequestId;
  label: string;
  emoji: string;
  /** Ce que ça change, dit en clair au joueur. */
  effect: string;
  /** Âge en dessous duquel la demande n'a pas de sens. */
  minAge: number;
  /** Coût pour le foyer, en part du revenu disponible annuel. */
  cost: number;
  /** La demande a-t-elle encore un objet ? */
  relevant: (state: GameState) => boolean;
}

export const REQUESTS: RequestDef[] = [
  {
    id: 'phone', label: 'Un téléphone à toi', emoji: '📱',
    effect: 'Te relie aux autres, et t’expose à tout ce qui passe dessus.',
    minAge: 9, cost: 0.02,
    relevant: (s) => s.player.origin.digital.phone !== 'personnel',
  },
  {
    id: 'computer', label: 'Un ordinateur', emoji: '💻',
    effect: 'Ouvre l’informatique, les jeux, la lecture en ligne.',
    minAge: 8, cost: 0.05,
    relevant: (s) => s.player.origin.digital.computer !== 'personnel',
  },
  {
    id: 'pet', label: 'Un animal', emoji: '🐶',
    effect: 'De la compagnie, une responsabilité, une dépense de plus.',
    minAge: 6, cost: 0.03,
    relevant: (s) => s.player.pets.length === 0,
  },
  {
    id: 'activity', label: 'T’inscrire à une activité', emoji: '⚽',
    effect: 'Un club hors de l’école : du temps pris, des gens rencontrés.',
    minAge: 6, cost: 0.04,
    relevant: (s) => !s.player.flags.paidActivity,
  },
  {
    id: 'curfew', label: 'Rentrer plus tard', emoji: '🌙',
    effect: 'Plus de liberté le soir, et plus d’occasions de mal tourner.',
    minAge: 13, cost: 0,
    relevant: (s) => s.player.origin.freedoms.curfew < 24,
  },
  {
    id: 'allowance', label: 'De l’argent de poche', emoji: '🪙',
    effect: 'De quoi décider soi-même de quelque chose, pour une fois.',
    minAge: 7, cost: 0.03,
    relevant: (s) => s.player.age < 18,
  },
];

export const REQUEST_MAP: Record<string, RequestDef> = Object.fromEntries(
  REQUESTS.map((r) => [r.id, r]),
);

/** Demandes qui ont encore un sens pour ce personnage. */
export function availableRequests(state: GameState): RequestDef[] {
  const p = state.player;
  return REQUESTS.filter((r) => p.age >= r.minAge && p.age < 20 && r.relevant(state));
}

/* ------------------------------------------------------------------ */
/* La demande                                                          */
/* ------------------------------------------------------------------ */

export type Answer = 'accepte' | 'refuse' | 'négocie' | 's’agace';

function used(state: GameState, key: string): number {
  return state.player.yearActions[key] ?? 0;
}

/**
 * Demander quelque chose à un parent.
 *
 * La réponse sort de trois choses : ce que le foyer peut se permettre, ce que
 * le parent est comme personne, et ce que l'enfant a fait jusque-là. Un parent
 * généreux mais fauché refuse aussi souvent qu'un parent aisé mais dur — pour
 * des raisons différentes, et le texte le dit.
 */
export function askParent(ctx: Ctx, personId: string, requestId: RequestId): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const parent = person(state, personId);
  const def = REQUEST_MAP[requestId];
  if (!parent?.alive) return { ok: false, message: 'Personne introuvable.' };
  if (!def) return { ok: false, message: 'Demande inconnue.' };
  if (p.age < def.minAge) return { ok: false, message: 'Tu es trop jeune pour demander ça.' };
  if (!def.relevant(state)) return { ok: false, message: 'Tu l’as déjà.' };
  if (used(state, `ask:${requestId}`) >= 1) {
    return { ok: false, message: 'Tu as déjà demandé ça cette année. Insister ne servirait à rien.' };
  }
  state.player.yearActions[`ask:${requestId}`] = 1;

  // Ce que ça pèse dans le budget du foyer : la même demande n'a pas le même
  // poids selon que le foyer est à l'aise ou déjà sous tension.
  const strain = def.cost * 100 * (1 + p.origin.finance.financialStress / 60);

  // Qui est ce parent.
  const generous = parent.psyche
    ? parent.psyche.axes.generosity
    : parent.personality.generosity;
  const strict = parent.psyche ? 100 - parent.psyche.axes.adaptability : parent.personality.temper;
  const warm = parent.personality.warmth;

  // Ce que l'enfant a fait jusque-là : les notes et le comportement pèsent
  // autant que la gentillesse du parent.
  const merit = p.education.grades * 2.2 + p.education.discipline.behaviour * 0.35
    - p.education.discipline.warnings * 4 - p.education.discipline.suspensions * 9;

  const score = 20
    + generous * 0.35
    + warm * 0.2
    + parent.relationship * 0.3
    + merit * 0.35
    - strain * 1.4
    - strict * 0.15
    - (p.origin.finance.financialStress / 3)
    + rng.float(-16, 16);

  let answer: Answer;
  if (score > 74) answer = 'accepte';
  else if (score > 44) answer = 'négocie';
  else if (score > 18) answer = 'refuse';
  else answer = 's’agace';

  switch (answer) {
    case 'accepte':
      grant(ctx, def, parent);
      parent.relationship = clampStat(parent.relationship + rng.float(2, 6));
      p.stats.happiness = clampStat(p.stats.happiness + rng.float(4, 10));
      return {
        ok: true, title: def.label, tone: 'good',
        message: `${parent.firstName} dit oui, sans faire d’histoires.`,
      };

    case 'négocie': {
      const condition = poseCondition(ctx, def, parent);
      return {
        ok: true, title: 'À une condition', tone: 'neutral',
        message: `${parent.firstName} veut bien, mais pas gratuitement : ${condition.text}`,
      };
    }

    case 'refuse': {
      p.stats.happiness = clampStat(p.stats.happiness - rng.float(2, 6));
      // Un refus pour cause d'argent ne s'encaisse pas comme un refus de
      // principe : l'un s'explique, l'autre humilie.
      const broke = p.origin.finance.financialStress > 55 && def.cost > 0;
      if (broke) {
        p.psyche.values.money = clampStat(p.psyche.values.money + rng.float(0.5, 2));
        record(state, {
          source: 'un refus faute de moyens',
          target: 'personnalité',
          strength: 0.2,
          reason: `${parent.firstName} n’a pas pu payer ${def.label.toLowerCase()}`,
          age: p.age,
        });
        return {
          ok: true, title: 'Non', tone: 'bad',
          message: `${parent.firstName} n’a pas dit non. Il a dit « pas cette année », et tu as compris.`,
        };
      }
      parent.relationship = clampStat(parent.relationship - rng.float(0, 4));
      return {
        ok: true, title: 'Non', tone: 'bad',
        message: `${parent.firstName} refuse, et n’a pas envie d’en discuter.`,
      };
    }

    case 's’agace':
      parent.relationship = clampStat(parent.relationship - rng.float(4, 11));
      p.stats.happiness = clampStat(p.stats.happiness - rng.float(4, 9));
      p.psyche.self.selfEsteem = clampStat(p.psyche.self.selfEsteem - rng.float(0.5, 2.5));
      return {
        ok: true, title: 'Mauvais moment', tone: 'bad',
        message: `${parent.firstName} s’emporte : ce n’est pas le jour, et tu n’aurais pas dû demander.`,
      };
  }
}

/** Accorde réellement ce qui a été demandé, dans le système concerné. */
function grant(ctx: Ctx, def: RequestDef, parent: Person): void {
  const { state, rng } = ctx;
  const p = state.player;
  const o = p.origin;

  switch (def.id) {
    case 'phone':
      o.digital.phone = 'personnel';
      o.digital.phoneAge = p.age;
      break;
    case 'computer':
      o.digital.computer = 'personnel';
      o.living.computer = true;
      break;
    case 'pet': {
      // Un animal offert par les parents ne coûte rien à l'enfant.
      const affordable = PET_SPECIES.filter((s) => s.price < 400);
      const species = rng.pick(affordable.length > 0 ? affordable : PET_SPECIES);
      adoptPetSpecies(ctx, species.id, true);
      break;
    }
    case 'activity':
      p.flags.paidActivity = true;
      // Une activité payante prend du temps et donne de l'assurance.
      o.time.free = Math.max(0, o.time.free - 3);
      p.stats.fitness = clampStat(p.stats.fitness + rng.float(1, 4));
      p.psyche.axes.confidence = clampStat(p.psyche.axes.confidence + rng.float(0.5, 2.5));
      break;
    case 'curfew':
      o.freedoms.curfew = Math.min(24, o.freedoms.curfew + rng.int(1, 2));
      o.freedoms.goOutAlone = Math.min(o.freedoms.goOutAlone, p.age);
      break;
    case 'allowance':
      o.allowance = Math.round(Math.max(o.allowance, 1) * rng.float(1.3, 2.1) + 20);
      o.freedoms.financialAutonomy = clampStat(o.freedoms.financialAutonomy + rng.float(3, 9));
      break;
  }

  record(state, {
    source: `${parent.firstName} a dit oui`,
    target: `obtenu:${def.id}`,
    strength: 0.5,
    reason: `a obtenu ${def.label.toLowerCase()} de ${parent.firstName}`,
    age: p.age,
  });
  ctx.log('family', `${fullName(parent)} t’a accordé : ${def.label.toLowerCase()}.`, 'good');
  // L'exposition change dès cette année : c'est tout l'intérêt.
  invalidateContexts(state);
}

/**
 * Le parent pose une condition plutôt que de dire non.
 *
 * La condition porte sur ce que l'enfant contrôle vraiment, et elle est
 * vérifiée l'année suivante par `settleConditions`.
 */
function poseCondition(ctx: Ctx, def: RequestDef, parent: Person): Condition {
  const { state, rng } = ctx;
  const p = state.player;

  const kinds: Condition['kind'][] = ['notes', 'comportement', 'corvées'];
  // Un parent qui tient aux études demande des notes ; un parent excédé par
  // le comportement demande de se tenir tranquille.
  const kind = p.education.discipline.warnings > 0 || p.education.discipline.behaviour < 55
    ? 'comportement'
    : p.origin.values.school > 60 ? 'notes' : rng.pick(kinds);

  const target = kind === 'notes'
    ? Math.min(18, Math.round((p.education.grades + rng.float(1.2, 3)) * 10) / 10)
    : kind === 'comportement'
      ? Math.min(95, Math.round(p.education.discipline.behaviour + rng.int(6, 18)))
      : Math.round(p.origin.chores.hoursPerWeek + rng.int(2, 6));

  // Le pronom suit le parent : « elle veut » pour une mère, « il veut » pour
  // un père. Une faute d'accord dans une phrase lue à chaque négociation se
  // remarque tout de suite.
  const subject = parent.sex === 'F' ? 'elle veut' : 'il veut';
  const text = kind === 'notes'
    ? `${subject} ${target}/20 de moyenne à la fin de l’année.`
    : kind === 'comportement'
      ? `${subject} que l’école cesse d’appeler à la maison.`
      : `${subject} que tu en fasses davantage à la maison (${target} h par semaine).`;

  const condition: Condition = {
    requestId: def.id, parentId: parent.id, kind, target,
    dueYear: state.year + 1, text,
  };
  state.player.conditions = [
    ...(state.player.conditions ?? []).filter((c) => c.requestId !== def.id),
    condition,
  ];
  if (kind === 'corvées') {
    p.origin.chores.hoursPerWeek = target;
    p.origin.time.free = Math.max(0, p.origin.time.free - 2);
    invalidateContexts(state);
  }
  return condition;
}

/**
 * Vérifie les promesses arrivées à échéance.
 *
 * Tenue, la promesse est honorée et le lien se resserre ; non tenue, l'objet
 * est perdu et le parent retient qu'on lui a fait perdre son temps. C'est ce
 * qui empêche la négociation d'être un « oui » déguisé.
 */
export function settleConditions(ctx: Ctx): void {
  const { state, rng } = ctx;
  const p = state.player;
  const pending = p.conditions ?? [];
  if (pending.length === 0) return;

  const remaining: Condition[] = [];
  for (const condition of pending) {
    if (state.year < condition.dueYear) { remaining.push(condition); continue; }
    const parent = state.npcs[condition.parentId];
    const def = REQUEST_MAP[condition.requestId];
    if (!parent?.alive || !def) continue;

    // Le comportement se juge sur la note du dossier, pas sur le compteur
    // d'incidents : celui-ci est remis à zéro en fin d'année scolaire, et le
    // lire ici reviendrait à valider la promesse quoi qu'il se soit passé.
    const met = condition.kind === 'notes'
      ? p.education.grades >= condition.target
      : condition.kind === 'comportement'
        ? p.education.discipline.behaviour >= condition.target
        : p.origin.chores.hoursPerWeek >= condition.target;

    if (met) {
      grant(ctx, def, parent);
      parent.relationship = clampStat(parent.relationship + rng.float(4, 10));
      p.stats.happiness = clampStat(p.stats.happiness + rng.float(5, 12));
      // Tenir une promesse difficile forge quelque chose.
      p.psyche.axes.perseverance = clampStat(p.psyche.axes.perseverance + rng.float(0.5, 2.5));
      p.psyche.self.senseOfControl = clampStat(p.psyche.self.senseOfControl + rng.float(1, 4));
      ctx.log('family', `Tu as tenu parole : ${fullName(parent)} t’accorde ${def.label.toLowerCase()}.`, 'good');
    } else {
      parent.relationship = clampStat(parent.relationship - rng.float(2, 7));
      p.stats.happiness = clampStat(p.stats.happiness - rng.float(3, 8));
      p.psyche.self.senseOfControl = clampStat(p.psyche.self.senseOfControl - rng.float(0.5, 3));
      ctx.log('family', `Promesse non tenue : ${fullName(parent)} ne t’accorde rien.`, 'bad');
    }
  }
  p.conditions = remaining;
}

/** Promesses en cours, pour l'affichage. */
export function pendingConditions(state: GameState): Condition[] {
  return state.player.conditions ?? [];
}
