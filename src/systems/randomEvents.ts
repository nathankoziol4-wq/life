/**
 * Moteur d'événements aléatoires (§19).
 *
 * Sélectionne des événements compatibles avec le contexte, les met en attente
 * de réponse, puis applique les conséquences du choix retenu. La bibliothèque
 * est purement déclarative : ce fichier est le seul à contenir de la logique.
 */

import { clampStat } from '../engine/rng.ts';
import { BASE } from '../engine/probability.ts';
import type { Ctx } from '../engine/context.ts';
import { fullName, person } from '../engine/context.ts';
import type { GameState, PendingEvent, Person, StatKey } from '../engine/types.ts';
import { ALL_EVENTS, getEvent } from '../data/events/index.ts';
import type { EventCondition, EventEffects, GameEvent } from '../data/events/types.ts';
import { getCountry } from '../data/countries.ts';
import { fire, promote, demote } from './careers.ts';
import { contractDisease, injure } from './health.ts';
import { breakUp, currentPartner, makeFriend } from './relationships.ts';
import { CRIMES } from '../data/crimes.ts';
import { arrest } from './justice.ts';
import { adoptPetSpecies } from './activities.ts';
import { getFamilyContext, getSocialContext } from './contexts.ts';

/** Événements déjà déclenchés dans cette vie (marqueurs `once`). */
function seen(state: GameState): Set<string> {
  return new Set(String(state.player.flags.seenEvents ?? '').split(',').filter(Boolean));
}

function markSeen(state: GameState, id: string): void {
  const set = seen(state);
  set.add(id);
  state.player.flags.seenEvents = Array.from(set).join(',');
}

/** Vérifie les conditions déclaratives d'un événement. */
export function matchesCondition(state: GameState, cond: EventCondition | undefined): boolean {
  if (!cond) return true;
  const p = state.player;

  if (cond.minAge !== undefined && p.age < cond.minAge) return false;
  if (cond.maxAge !== undefined && p.age > cond.maxAge) return false;
  if (cond.sex && p.sex !== cond.sex) return false;
  if (cond.inPrison !== undefined && Boolean(p.prison) !== cond.inPrison) return false;
  if (cond.retired !== undefined && p.retired !== cond.retired) return false;
  if (cond.hasJob !== undefined && Boolean(p.job) !== cond.hasJob) return false;
  if (cond.hasFreelance !== undefined && Boolean(p.freelance) !== cond.hasFreelance) return false;
  if (cond.hasBusiness !== undefined && Boolean(p.business) !== cond.hasBusiness) return false;
  if (cond.hasProperty !== undefined && (p.properties.length > 0) !== cond.hasProperty) return false;
  if (cond.hasVehicle !== undefined && (p.vehicles.length > 0) !== cond.hasVehicle) return false;
  if (cond.hasPet !== undefined && (p.pets.length > 0) !== cond.hasPet) return false;
  if (cond.minMoney !== undefined && p.money < cond.minMoney) return false;
  if (cond.maxMoney !== undefined && p.money > cond.maxMoney) return false;
  if (cond.countries && !cond.countries.includes(p.countryId)) return false;
  if (cond.hasFlag && !p.flags[cond.hasFlag]) return false;
  if (cond.lacksFlag && p.flags[cond.lacksFlag]) return false;
  if (cond.schoolStage && !cond.schoolStage.includes(p.education.stage)) return false;

  if (cond.hasPartner !== undefined && Boolean(currentPartner(state)) !== cond.hasPartner) return false;
  if (cond.isMarried !== undefined) {
    const married = Object.values(state.npcs).some((x) => x.alive && x.relation === 'spouse');
    if (married !== cond.isMarried) return false;
  }
  if (cond.hasChildren !== undefined) {
    const has = Object.values(state.npcs).some((x) => x.alive && (x.relation === 'son' || x.relation === 'daughter'));
    if (has !== cond.hasChildren) return false;
  }
  if (cond.hasSiblings !== undefined) {
    const has = Object.values(state.npcs).some((x) => x.alive && (x.relation === 'brother' || x.relation === 'sister'));
    if (has !== cond.hasSiblings) return false;
  }
  if (cond.hasParents !== undefined) {
    const has = Object.values(state.npcs).some((x) => x.alive && (x.relation === 'mother' || x.relation === 'father'));
    if (has !== cond.hasParents) return false;
  }
  if (cond.minStat) {
    for (const [key, value] of Object.entries(cond.minStat)) {
      if (p.stats[key as StatKey] < (value as number)) return false;
    }
  }
  if (cond.maxStat) {
    for (const [key, value] of Object.entries(cond.maxStat)) {
      if (p.stats[key as StatKey] > (value as number)) return false;
    }
  }
  return true;
}

/** Trouve un PNJ correspondant au type de cible attendu par l'événement. */
function findTarget(ctx: Ctx, event: GameEvent): Person | null {
  if (!event.target) return null;
  const candidates = Object.values(ctx.state.npcs).filter(
    (p) => p.alive && !p.estranged && !p.petSpecies && event.target!.includes(p.relation),
  );
  if (!candidates.length) return null;
  // On privilégie les personnes proches, plus intéressantes narrativement.
  return ctx.rng.weighted(candidates, (p) => 1 + p.relationship / 40);
}

/**
 * Délai minimal avant qu'un même événement puisse se reproduire.
 * Sans cela, « Dérapage en ligne » revient trois années de suite et la
 * bibliothèque paraît minuscule.
 */
const EVENT_COOLDOWN_YEARS = 12;

/** Événements éligibles à l'instant T. */
export function eligibleEvents(ctx: Ctx): { event: GameEvent; target: Person | null }[] {
  const { state } = ctx;
  const done = seen(state);
  const out: { event: GameEvent; target: Person | null }[] = [];
  for (const event of ALL_EVENTS) {
    if (event.once && done.has(event.id)) continue;
    const lastSeen = state.eventLog?.[event.id];
    if (lastSeen !== undefined && state.year - lastSeen < EVENT_COOLDOWN_YEARS) continue;
    if (!matchesCondition(state, event.cond)) continue;
    let target: Person | null = null;
    if (event.target) {
      target = findTarget(ctx, event);
      if (!target) continue;
    }
    out.push({ event, target });
  }
  return out;
}

/** Remplace les balises du texte par les valeurs réelles. */
export function interpolate(state: GameState, text: string, target: Person | null): string {
  const p = state.player;
  const country = getCountry(p.countryId);
  const fem = target?.sex === 'F';
  return text
    .replace(/\{name\}/g, target?.firstName ?? 'quelqu’un')
    .replace(/\{full\}/g, target ? fullName(target) : 'quelqu’un')
    .replace(/\{il\}/g, fem ? 'elle' : 'il')
    .replace(/\{le\}/g, fem ? 'la' : 'le')
    .replace(/\{lui\}/g, fem ? 'elle' : 'lui')
    .replace(/\{e\}/g, fem ? 'e' : '')
    .replace(/\{moi_e\}/g, p.sex === 'F' ? 'e' : '')
    .replace(/\{player\}/g, p.firstName)
    .replace(/\{city\}/g, p.cityName)
    .replace(/\{country\}/g, country.name)
    .replace(/\{job\}/g, p.job?.title ?? 'sans emploi')
    .replace(/\{school\}/g, p.education.schoolName ?? 'l’école');
}

/** Met un événement en file d'attente pour l'interface. */
export function queueEvent(ctx: Ctx, event: GameEvent, target: Person | null): PendingEvent {
  const { state } = ctx;
  const p = state.player;
  const choices = event.choices
    .filter((c) => {
      if (c.requiresMoney !== undefined && p.money < c.requiresMoney) return false;
      if (c.requiresStat) {
        for (const [key, value] of Object.entries(c.requiresStat)) {
          if (p.stats[key as StatKey] < (value as number)) return false;
        }
      }
      return true;
    })
    .map((c, index) => ({ label: c.label, outcome: String(index) }));

  // Un événement dont tous les choix sont filtrés n'a pas de sens.
  if (!choices.length) {
    choices.push({ label: 'Encaisser', outcome: '-1' });
  }

  const pending: PendingEvent = {
    id: ctx.id('ev'),
    eventId: event.id,
    title: event.title,
    text: interpolate(state, event.text, target),
    choices,
    personId: target?.id,
    icon: event.icon,
  };
  state.pending.push(pending);
  state.eventLog ??= {};
  state.eventLog[event.id] = state.year;
  if (event.once) markSeen(state, event.id);
  return pending;
}

/**
 * Pondération des événements par l'environnement.
 *
 * Le même événement n'a pas la même probabilité selon l'endroit où l'on vit :
 * une bagarre de rue est plus probable dans un quartier exposé, un souci
 * d'argent dans un foyer sous tension, une histoire d'école dans un milieu où
 * l'école compte. La bibliothèque d'événements reste purement déclarative :
 * c'est le moteur qui module, pas les données.
 */
function environmentWeight(state: GameState, event: GameEvent): number {
  const o = state.player.origin;
  const social = getSocialContext(state);
  const family = getFamilyContext(state);
  switch (event.kind) {
    case 'crime':
    case 'justice':
      return Math.max(0.25, social.streetExposure * family.riskTaking * 0.75);
    case 'money':
      return Math.max(0.3, 0.6 + o.difficulties.financial / 65);
    case 'school':
      return Math.max(0.4, 0.65 + o.opportunities.education / 130 + o.values.school / 220);
    case 'family':
      return Math.max(0.4, 0.7 + o.difficulties.familyInstability / 90);
    case 'love':
      return Math.max(0.35, social.datingChance);
    case 'health':
      return Math.max(0.4, 0.75 + o.difficulties.financial / 130 + o.neighborhood.pollution / 220);
    case 'work':
      return Math.max(0.4, 0.7 + o.opportunities.career / 140);
    default:
      return 1;
  }
}

/** Tire les événements de l'année et les met en attente. */
export function rollRandomEvents(ctx: Ctx): void {
  const { rng, state } = ctx;
  const pool = eligibleEvents(ctx);
  if (!pool.length) return;

  // Un événement garanti, plus éventuellement un ou deux autres.
  let count = 1;
  if (rng.chance(BASE.randomEventExtra)) count += 1;
  if (rng.chance(BASE.randomEventExtra * 0.35)) count += 1;
  // Les enfants et les détenus vivent des années plus pauvres en événements.
  if (state.player.age < 4) count = rng.chance(0.5) ? 1 : 0;

  const used = new Set<string>();
  for (let i = 0; i < count; i++) {
    const available = pool.filter((x) => !used.has(x.event.id));
    if (!available.length) break;
    const chosen = rng.weighted(available, (x) => x.event.weight * environmentWeight(state, x.event));
    used.add(chosen.event.id);
    queueEvent(ctx, chosen.event, chosen.target);
  }
}

/** Applique le choix du joueur à un événement en attente. */
export function resolvePending(ctx: Ctx, pendingId: string, choiceIndex: number): { text: string; tone: 'good' | 'bad' | 'neutral' } {
  const { state, rng } = ctx;
  const pending = state.pending.find((e) => e.id === pendingId);
  if (!pending) return { text: '', tone: 'neutral' };
  state.pending = state.pending.filter((e) => e.id !== pendingId);

  // Certaines scènes ne se résolvent pas par des effets déclaratifs : leurs
  // conséquences appartiennent à un système, qui seul sait ce qu'il fait de la
  // classe, de la victime et du dossier. Le format des événements reste donc
  // ce qu'il est — de la donnée pure — et la scène délègue.
  const system = pending.payload?.system;
  if (typeof system === 'string') {
    const handler = SYSTEM_RESOLVERS[system];
    if (handler) return handler(ctx, pending, choiceIndex);
  }

  const event = getEvent(pending.eventId);
  const target = person(state, pending.personId);
  if (!event) return { text: '', tone: 'neutral' };

  const raw = pending.choices[choiceIndex]?.outcome ?? '-1';
  const defIndex = Number(raw);
  const choice = defIndex >= 0 ? event.choices[defIndex] : null;
  if (!choice) {
    ctx.log(event.kind, `${event.title} : tu encaisses sans réagir.`, 'neutral');
    return { text: 'Tu subis la situation sans rien pouvoir y faire.', tone: 'neutral' };
  }

  const outcome = choice.outcomes.length === 1
    ? choice.outcomes[0]
    : rng.weighted(choice.outcomes, (o) => o.weight ?? 1);

  const text = interpolate(state, outcome.text, target);
  applyEffects(ctx, outcome.effects, target);
  ctx.log(event.kind, `${event.title} — ${text}`, outcome.tone);
  return { text, tone: outcome.tone };
}

/**
 * Les résolveurs de système.
 *
 * Enregistrés à l'import du système concerné, comme les mini-jeux. Une scène
 * qui a besoin d'un vrai système derrière passe par ici plutôt que de faire
 * entrer de la logique dans les fichiers d'événements.
 */
export type SystemResolver = (
  ctx: Ctx,
  pending: PendingEvent,
  choiceIndex: number,
) => { text: string; tone: 'good' | 'bad' | 'neutral' };

const SYSTEM_RESOLVERS: Record<string, SystemResolver> = {};

export function registerSystemResolver(id: string, resolver: SystemResolver): void {
  SYSTEM_RESOLVERS[id] = resolver;
}

/** Applique les effets déclaratifs d'une issue. */
export function applyEffects(ctx: Ctx, effects: EventEffects | undefined, target: Person | null): void {
  if (!effects) return;
  const { state } = ctx;
  const p = state.player;
  const country = getCountry(p.countryId);

  if (effects.stats) {
    for (const [key, delta] of Object.entries(effects.stats)) {
      const k = key as StatKey;
      p.stats[k] = clampStat(p.stats[k] + (delta as number));
    }
  }
  if (effects.money) {
    p.money += Math.round(effects.money * country.costIndex * state.world.inflation);
  }
  if (effects.moneyPct) {
    p.money += Math.round(p.money * effects.moneyPct);
  }
  if (p.money < 0) p.money = 0;
  if (effects.rel && target) target.relationship = clampStat(target.relationship + effects.rel);
  if (effects.opinion && target) target.opinion = clampStat(target.opinion + effects.opinion);
  if (effects.flag) {
    // Les marqueurs d'exposition se cumulent au lieu de se poser une fois :
    // avoir dessiné trois fois compte plus qu'avoir dessiné une fois, et
    // c'est le même canal que les activités familiales.
    p.flags[effects.flag] = effects.flag.startsWith('exposé:')
      ? Math.min(6, Number(p.flags[effects.flag] ?? 0) + 1)
      : true;
  }
  if (effects.special) applySpecial(ctx, effects.special, effects.specialArg, target);
}

function applySpecial(
  ctx: Ctx,
  special: NonNullable<EventEffects['special']>,
  arg: EventEffects['specialArg'],
  target: Person | null,
): void {
  const { state, rng } = ctx;
  const p = state.player;

  switch (special) {
    case 'loseJob':
      if (p.job) fire(ctx, 'suite aux événements');
      break;
    case 'promotion':
      promote(ctx);
      break;
    case 'demotion':
      demote(ctx);
      break;
    case 'arrest': {
      const crime = CRIMES.find((c) => c.id === String(arg)) ?? CRIMES[0];
      arrest(ctx, crime, 0);
      break;
    }
    case 'injury':
      injure(ctx, 1);
      break;
    case 'illness':
      if (typeof arg === 'string') contractDisease(ctx, arg);
      break;
    case 'newFriend':
      makeFriend(ctx);
      break;
    case 'loseFriend': {
      const friends = Object.values(state.npcs).filter((x) => x.alive && (x.relation === 'friend' || x.relation === 'bestFriend'));
      if (friends.length) {
        const lost = rng.pick(friends);
        lost.estranged = true;
        ctx.log('family', `Tu as perdu contact avec ${fullName(lost)}.`, 'bad');
      }
      break;
    }
    case 'estrange':
      if (target) {
        target.estranged = true;
        ctx.log('family', `${fullName(target)} ne te parle plus.`, 'bad');
      }
      break;
    case 'breakup': {
      const partner = currentPartner(state);
      if (partner) breakUp(ctx, partner);
      break;
    }
    case 'pregnancy':
      p.flags.pregnant = state.year;
      break;
    case 'expelled':
      p.education.stage = 'dropout';
      p.education.schoolName = null;
      ctx.log('school', 'Tu as été exclu définitivement de ton établissement.', 'bad');
      break;
    case 'gainFollowers':
      p.followers += Number(arg ?? 500);
      break;
    case 'loseFollowers':
      p.followers = Math.max(0, p.followers - Number(arg ?? 500));
      break;
    case 'vehicleDamage': {
      const v = p.vehicles[0];
      if (v) {
        v.condition = Math.max(0, v.condition - rng.int(20, 45));
        v.value = Math.round(v.value * 0.7);
        v.broken = rng.chance(0.5);
      }
      break;
    }
    case 'propertyDamage': {
      const prop = p.properties.find((x) => x.isResidence) ?? p.properties[0];
      if (prop) {
        prop.condition = Math.max(0, prop.condition - rng.int(15, 40));
        prop.value = Math.round(prop.value * 0.9);
      }
      break;
    }
    case 'newPet':
      adoptPetSpecies(ctx, rng.pick(['dog', 'cat', 'rabbit', 'hamster', 'fish']), true);
      break;
    case 'petDeath': {
      const pet = p.pets[0];
      if (pet) {
        p.pets = p.pets.filter((x) => x.id !== pet.id);
        ctx.log('family', `${pet.name} n’est plus.`, 'bad');
      }
      break;
    }
    case 'personDeath':
      if (target) {
        target.alive = false;
        target.deathYear = state.year;
        target.deathCause = 'des suites de cet événement';
        ctx.log('death', `${fullName(target)} est décédé${target.sex === 'F' ? 'e' : ''}.`, 'bad');
      }
      break;
    case 'smallInheritance': {
      const amount = Math.round(rng.float(3000, 45000) * getCountry(p.countryId).salaryIndex);
      p.money += amount;
      ctx.log('money', `Tu as reçu un héritage de ${amount}.`, 'good');
      break;
    }
    case 'jobOffer': {
      // Génère une offre nettement meilleure que le poste actuel.
      const offers = state.world.jobOffers;
      if (p.job && offers.length) {
        const better = offers.find((o) => o.salary > p.job!.salary * 1.15);
        if (better) {
          better.salary = Math.round(better.salary * 1.1);
        }
      }
      break;
    }
    case 'scholarship':
      p.education.scholarship = true;
      break;
    case 'addiction':
      p.stats.addiction = clampStat(p.stats.addiction + Number(arg ?? 15));
      break;
  }
}
