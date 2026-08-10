/**
 * L'enfance, comme période jouable.
 *
 * L'audit a chiffré le trou : huit événements éligibles en moyenne avant cinq
 * ans, vingt-cinq avant dix, contre plus de quatre-vingts à l'âge adulte. Et
 * surtout, aucune *action* — un enfant de sept ans n'avait rien à faire de ses
 * journées qu'appuyer sur « +1 an ». La famille existait comme décor et comme
 * source de statistiques ; on ne pouvait rien faire *avec* elle.
 *
 * Trois idées structurent ce fichier.
 *
 * **Une activité familiale n'est pas un bouton à effet fixe.** Ce qu'on
 * retire d'un après-midi avec un parent dépend de ce parent : sa
 * participation, sa patience, son affection, et le climat du foyer. Le même
 * geste ne donne pas la même chose selon qui est en face. C'est la règle du
 * projet — aucune action à résultat unique.
 *
 * **`activityParticipation` cesse d'être décoratif.** Le champ était calculé à
 * la naissance de chaque parent et lu par personne. C'est lui qui décide
 * maintenant de ce qu'un parent accepte de faire, et de ce que ça vaut.
 *
 * **L'enfance sème.** Ce qu'on fait à sept ans ne se voit pas à sept ans : ça
 * alimente l'exposition, donc les intérêts, donc plus tard les études et le
 * métier. Les activités poussent des signaux dans le même canal que le
 * quartier et l'école — elles ne créent pas une mécanique parallèle.
 */

import { clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import { peopleByRelation, person } from '../engine/context.ts';
import type { ActionResult, GameState, Person } from '../engine/types.ts';
import { getCountry } from '../data/countries.ts';
import { FAMILY_ACTIVITIES, type FamilyActivity } from '../data/childhood.ts';
import { createPerson } from './npc.ts';

/** Un enfant, au sens de ce fichier : la période où ces actions ont un sens. */
export function isChild(state: GameState): boolean {
  return state.player.age >= 3 && state.player.age <= 15;
}

/* ------------------------------------------------------------------ */
/* Avec qui                                                            */
/* ------------------------------------------------------------------ */

/** Les adultes du foyer avec qui une activité est possible. */
export function guardians(state: GameState): Person[] {
  return peopleByRelation(state, ['mother', 'father', 'stepmother', 'stepfather'])
    .filter((x) => x.alive && !x.estranged);
}

/** Les frères et sœurs vivants. */
export function siblings(state: GameState): Person[] {
  return peopleByRelation(state, ['brother', 'sister']).filter((x) => x.alive);
}

/** Les grands-parents vivants. */
export function grandparents(state: GameState): Person[] {
  return peopleByRelation(state, ['grandmother', 'grandfather']).filter((x) => x.alive);
}

/** Qui peut accompagner cette activité, aujourd'hui. */
export function companionsFor(state: GameState, activity: FamilyActivity): Person[] {
  switch (activity.with) {
    case 'parent': return guardians(state);
    case 'fratrie': return siblings(state);
    case 'grand-parent': return grandparents(state);
    case 'famille':
    default: return [...guardians(state), ...siblings(state), ...grandparents(state)];
  }
}

/* ------------------------------------------------------------------ */
/* Ce qui est possible                                                 */
/* ------------------------------------------------------------------ */

/** Prix de l'activité, à l'échelle du pays et de l'époque. */
export function activityCost(state: GameState, activity: FamilyActivity): number {
  if (activity.cost === 0) return 0;
  const country = getCountry(state.player.countryId);
  return Math.round(activity.cost * country.costIndex * state.world.inflation);
}

export function activityBlocker(state: GameState, activity: FamilyActivity): string | null {
  const p = state.player;
  if (p.prison) return 'Pas depuis une cellule.';
  if (p.age < activity.minAge) return `Tu es trop petit pour ça.`;
  if (p.age > activity.maxAge) return 'Ce n’est plus de ton âge.';
  if (companionsFor(state, activity).length === 0) {
    return activity.with === 'fratrie' ? 'Tu n’as ni frère ni sœur.'
      : activity.with === 'grand-parent' ? 'Tes grands-parents ne sont plus là.'
        : 'Il n’y a personne pour t’accompagner.';
  }
  const cost = activityCost(state, activity);
  if (cost > 0 && cost > householdBudget(state)) {
    return 'À la maison, ce n’est pas le moment de dépenser ça.';
  }
  if ((p.yearActions.familyActivities ?? 0) >= 3) {
    return 'Tu as déjà bien occupé ton année.';
  }
  if (p.yearActions[`family_${activity.id}`]) return 'Vous l’avez déjà fait cette année.';
  return null;
}

/**
 * Ce que le foyer peut mettre dans une sortie.
 *
 * Un enfant ne paie pas : c'est le foyer qui décide, et un foyer sous tension
 * dit non. C'est la façon la plus directe de faire sentir un milieu — sans
 * jamais afficher un chiffre de revenu à un enfant de huit ans.
 */
function householdBudget(state: GameState): number {
  const o = state.player.origin;
  const country = getCountry(state.player.countryId);
  const monthly = Math.max(0, o.finance.disposableIncome) / 12;
  const strain = 1 - o.finance.financialStress / 140;
  return Math.max(0, monthly * 0.25 * strain * country.costIndex * state.world.inflation / 100);
}

/** Les activités du moment, dans l'ordre où elles se présentent. */
export function availableActivities(state: GameState): FamilyActivity[] {
  const p = state.player;
  return FAMILY_ACTIVITIES.filter((a) => p.age >= a.minAge && p.age <= a.maxAge);
}

/* ------------------------------------------------------------------ */
/* Faire quelque chose ensemble                                        */
/* ------------------------------------------------------------------ */

/**
 * Ce que l'accompagnant met dans l'activité, 0-1.
 *
 * C'est le cœur du fichier. Un parent très disponible et patient transforme
 * une après-midi ordinaire en souvenir ; un parent qui est là sans y être
 * donne exactement ce qu'il donne dans la vraie vie : rien de mémorable.
 */
export function engagementOf(state: GameState, companion: Person): number {
  const o = state.player.origin;
  const role = o.parents.find((x) => x.personId === companion.id);
  if (role) {
    // `activityParticipation` était calculé à la naissance et lu par personne.
    // C'est ici qu'il sert, et c'est le seul endroit.
    return clampStat(
      role.availability.activityParticipation * 0.5
      + role.style.patience * 0.2
      + role.style.affection * 0.2
      + companion.relationship * 0.1,
    ) / 100;
  }
  // Fratrie, grands-parents : on n'a pas de style parental, seulement un lien.
  return clampStat(
    companion.relationship * 0.55
    + (companion.psyche?.axes.generosity ?? companion.personality.generosity) * 0.25
    + (companion.psyche?.axes.patience ?? 50) * 0.2,
  ) / 100;
}

/**
 * Fait quelque chose avec quelqu'un.
 *
 * Quatre issues possibles, et ce n'est pas un tirage déguisé : la première
 * dépend de l'engagement de l'accompagnant, la deuxième du climat du foyer,
 * la troisième du hasard, la quatrième de ce que l'enfant est.
 */
export function doFamilyActivity(
  ctx: Ctx, activityId: string, companionId: string,
): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const activity = FAMILY_ACTIVITIES.find((a) => a.id === activityId);
  const companion = person(state, companionId);
  if (!activity) return { ok: false, message: 'Activité inconnue.' };
  if (!companion?.alive) return { ok: false, message: 'Cette personne n’est plus là.' };
  const blocker = activityBlocker(state, activity);
  if (blocker) return { ok: false, title: activity.label, message: blocker };

  p.yearActions.familyActivities = (p.yearActions.familyActivities ?? 0) + 1;
  p.yearActions[`family_${activity.id}`] = 1;

  const cost = activityCost(state, activity);
  if (cost > 0) {
    // L'argent sort du foyer, pas de la poche de l'enfant.
    p.origin.finance.financialStress = clampStat(p.origin.finance.financialStress + 0.6);
  }

  const engagement = engagementOf(state, companion);
  const calm = p.origin.atmosphere.calm / 100;
  const who = companion.firstName;

  /* --- Le moment tourne mal --- */
  // Un foyer tendu gâche ce qu'il touche, et l'enfant le retient.
  if (rng.chance(Math.max(0.03, 0.32 - engagement * 0.25 - calm * 0.12))) {
    companion.relationship = clampStat(companion.relationship - rng.float(1, 5));
    p.stats.happiness = clampStat(p.stats.happiness - rng.float(2, 6));
    p.stats.stress = clampStat(p.stats.stress + rng.float(2, 5));
    return {
      ok: true, title: activity.label, tone: 'bad',
      message: `${who} avait la tête ailleurs. ${activity.sour}`,
    };
  }

  /* --- Le moment ordinaire --- */
  const great = rng.chance(0.2 + engagement * 0.55);
  const bond = great ? rng.float(5, 11) : rng.float(1.5, 4.5);
  companion.relationship = clampStat(companion.relationship + bond);
  companion.opinion = clampStat(companion.opinion + bond * 0.6);
  p.stats.happiness = clampStat(p.stats.happiness + (great ? rng.float(4, 9) : rng.float(1, 4)));
  p.stats.stress = clampStat(p.stats.stress - (great ? 5 : 2));

  // Les effets propres à l'activité, amplifiés quand le moment était réussi.
  const gainFactor = great ? 1.6 : 0.7;
  for (const [stat, value] of Object.entries(activity.stats ?? {})) {
    const key = stat as keyof typeof p.stats;
    p.stats[key] = clampStat(p.stats[key] + value * gainFactor);
  }

  // Et ce qu'elle sème : le drapeau d'exposition, lu par `exposureSignals`.
  if (activity.exposes) {
    const flag = `exposé:${activity.exposes}`;
    p.flags[flag] = Math.min(6, Number(p.flags[flag] ?? 0) + (great ? 2 : 1));
  }

  if (great) {
    ctx.log('life', `${activity.label} avec ${who}.`, 'good');
  }
  return {
    ok: true,
    title: activity.label,
    tone: great ? 'good' : 'neutral',
    message: great ? `${activity.great.replace('{qui}', who)}` : `${activity.plain.replace('{qui}', who)}`,
  };
}

/* ------------------------------------------------------------------ */
/* Les amis d'enfance                                                  */
/* ------------------------------------------------------------------ */

/**
 * Les enfants du voisinage.
 *
 * Jusqu'ici, les seuls enfants du monde étaient les camarades de classe : un
 * enfant déscolarisé, en vacances ou simplement rentré chez lui ne connaissait
 * personne. Le voisinage en fournit, et leur nombre dépend de ce que le
 * quartier est réellement — densité, relations de voisinage, familles.
 */
export function neighbourhoodFriends(state: GameState): Person[] {
  return peopleByRelation(state, ['friend', 'acquaintance'])
    .filter((x) => x.alive && x.flags.neighbourChild === true);
}

export function meetNeighbourBlocker(state: GameState): string | null {
  const p = state.player;
  if (p.prison) return 'Pas depuis une cellule.';
  if (p.age < 4 || p.age > 15) return 'Ce n’est plus comme ça qu’on se fait des amis.';
  if (p.yearActions.meetNeighbour) return 'Tu as déjà fait le tour du quartier cette année.';
  if (neighbourhoodFriends(state).length >= 4) return 'Tu connais déjà tout le monde par ici.';
  return null;
}

/**
 * Sortir jouer dehors, et voir qui est là.
 *
 * Ce qu'on trouve dépend du quartier : une rue vivante et sûre met des enfants
 * dehors, une rue tendue les garde à l'intérieur.
 */
export function meetNeighbourChild(ctx: Ctx): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const blocker = meetNeighbourBlocker(state);
  if (blocker) return { ok: false, title: 'Dehors', message: blocker };
  p.yearActions.meetNeighbour = 1;

  const street = p.origin.street;
  const hood = p.origin.neighborhood;
  const odds = 0.2
    + street.neighbourRelations / 260
    + hood.safety / 320
    + hood.density / 400
    + (p.psyche.axes.sociability - 50) / 300;

  if (!rng.chance(odds)) {
    p.stats.happiness = clampStat(p.stats.happiness - 2);
    return {
      ok: true, title: 'Dehors', tone: 'neutral',
      message: 'Tu traînes un moment dans la rue. Il n’y a personne, ou personne qui te regarde.',
    };
  }

  const friend = createPerson(ctx, {
    relation: 'friend',
    age: p.age + rng.int(-2, 2),
    relationship: rng.int(35, 60),
    opinion: rng.int(40, 65),
    withJob: false,
  });
  friend.flags.neighbourChild = true;
  p.stats.happiness = clampStat(p.stats.happiness + rng.int(4, 9));
  ctx.log('life', `Tu t’es fait un ami dans le quartier : ${friend.firstName}.`, 'good');
  return {
    ok: true, title: 'Dehors', tone: 'good',
    message: `${friend.firstName} habite à quelques rues. Vous avez le même âge, et rien d’autre à faire.`,
  };
}

/* ------------------------------------------------------------------ */
/* L'année de l'enfant                                                 */
/* ------------------------------------------------------------------ */

/**
 * Ce qu'une année d'enfance fait toute seule.
 *
 * Un enfant qui ne fait rien avec sa famille s'en éloigne : ce n'est pas une
 * punition, c'est ce qui arrive. Et les amis du quartier finissent par
 * déménager ou par se perdre de vue quand on grandit.
 */
export function advanceChildhood(ctx: Ctx): void {
  const { state, rng } = ctx;
  const p = state.player;
  if (p.age > 17) {
    // On ne « perd » pas les amis d'enfance : ils cessent simplement d'être
    // des amis *d'enfance*, et rejoignent le lot commun.
    for (const friend of neighbourhoodFriends(state)) friend.flags.neighbourChild = false;
    return;
  }
  if (p.age < 3) return;

  const did = Number(p.yearActions.familyActivities ?? 0);
  if (did === 0) {
    for (const adult of guardians(state)) {
      // Une famille très participative maintient le lien même sans qu'on
      // fasse quoi que ce soit ; une famille absente laisse filer.
      const role = p.origin.parents.find((x) => x.personId === adult.id);
      const upkeep = (role?.availability.involvement ?? 40) / 100;
      adult.relationship = clampStat(adult.relationship - (1 - upkeep) * rng.float(0.5, 2.2));
    }
  }

  // Le quartier change : un ami s'en va de temps en temps.
  for (const friend of neighbourhoodFriends(state)) {
    if (rng.chance(0.07)) {
      friend.flags.neighbourChild = false;
      friend.relation = 'acquaintance';
      ctx.log('life', `${friend.firstName} a déménagé.`, 'bad');
    }
  }
}
