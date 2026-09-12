/**
 * Où l'on met son enfant.
 *
 * **Ce qui manquait, et ce qui existait déjà.** Le catalogue disait « on paie
 * ce qu'il faut sans choisir d'établissement », feuille `Relations/Enfants`.
 * Or `data/schools.ts` porte depuis toujours onze archétypes complets — frais,
 * niveau, harcèlement, encadrement, réseau, taille de classe — qui servaient à
 * **tirer** l'école du joueur d'après son quartier. Personne ne pouvait rien y
 * décider, et pour son propre enfant non plus.
 *
 * Ce fichier n'invente donc aucun établissement. Il ajoute la seule chose qui
 * manquait : **le choix, et ce qu'il coûte.**
 *
 * **1. Ce n'est pas une échelle de prix.** Trois des meilleurs établissements
 * ne s'achètent pas — ils se méritent, sur la moyenne de l'enfant et son âge.
 * Et le plus cher n'est pas le meilleur pour tout le monde : chaque
 * établissement **demande** quelque chose, et un enfant qui ne suit pas y
 * apprend moitié moins tout en y étant malheureux.
 *
 * **2. Cela se paie tous les ans**, et sur le même argent que le reste de
 * l'enfance — `upbringing.ts#rearingCost` puise dans la même poche.
 *
 * **3. Cela peut coûter l'enfant lui-même.** L'internat rend des résultats et
 * prend l'attention, qui est exactement ce dont dépend le lien — et donc ce que
 * `lineage.ts#continueAs` reprendra si l'on joue cet enfant ensuite.
 * L'instruction en famille ne coûte presque rien et prend **vos** années : elle
 * entre dans le même compte de temps que le deuxième poste et l'entreprise.
 *
 * **4. Changer coûte.** On y laisse ses camarades, et cela se voit sur son
 * humeur. Ce n'est pas un curseur qu'on ajuste tous les ans.
 */

import { clamp, clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import type { ActionResult, GameState, Person } from '../engine/types.ts';
import {
  DEMANDS, FRAME, FROM, MARK_FLOOR, MOOD, MOVE_STING, NETWORK, SELECTIVE,
  STRAIN, TAUGHT, UNTIL, getDemand,
} from '../data/schooling.ts';
import { SCHOOL_ARCHETYPES } from '../data/schools.ts';
import { getCountry } from '../data/countries.ts';
import { upbringingOf } from './upbringing.ts';

export { DEMANDS, FROM, UNTIL };

/** L'archétype, depuis le catalogue d'origine. */
export function archetypeOf(id: string | null | undefined) {
  return SCHOOL_ARCHETYPES.find((a) => a.id === id);
}

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

/** Où l'enfant est scolarisé, s'il l'est. */
export function schoolOf(child: Person): string | null {
  const id = child.upbringing?.schoolId;
  return typeof id === 'string' ? id : null;
}

/** L'enfant est-il en âge d'être quelque part ? */
export function atSchoolAge(child: Person): boolean {
  return child.age >= FROM && child.age < UNTIL;
}

/** Ce qu'un établissement coûte par an pour cet enfant. */
export function tuitionOf(state: GameState, schoolId: string): number {
  const school = archetypeOf(schoolId);
  if (!school || school.tuitionRatio <= 0) return 0;
  const country = getCountry(state.player.countryId);
  // Les frais du catalogue sont une part d'un revenu de référence : on les
  // rapporte au pays et à l'année, comme partout ailleurs.
  return Math.round(school.tuitionRatio * 42_000 * country.salaryIndex * state.world.inflation);
}

/**
 * L'accord entre un enfant et un lieu, de 0 à 1.
 *
 * **Ce qui empêche le système d'être une échelle de prix.** Un enfant dont la
 * tenue est très en dessous de ce que l'établissement demande y apprend moitié
 * moins et y est malheureux : le meilleur établissement du catalogue peut être
 * le pire choix pour cet enfant-là.
 */
export function fitOf(child: Person, schoolId: string): number {
  const demand = getDemand(schoolId);
  if (!demand) return 1;
  const held = (child.personality.discipline + child.stats.intelligence) / 2;
  const short = Math.max(0, demand.asks - held);
  return clamp(1 - short / 55, 0.3, 1);
}

/** Ce que l'accord donne à lire. */
export function fitLine(child: Person, schoolId: string): string {
  const fit = fitOf(child, schoolId);
  if (fit >= 0.95) return 'Il y sera à sa place.';
  if (fit >= 0.75) return 'Il devrait suivre, avec un peu de mal.';
  if (fit >= 0.5) return 'Il va ramer. Il en sortira quelque chose, pas tout.';
  return 'Ce n’est pas pour lui. Il y passera douze ans à ne pas y arriver.';
}

/* ------------------------------------------------------------------ */
/* Ce qui est ouvert                                                   */
/* ------------------------------------------------------------------ */

export function enrolBlocker(state: GameState, child: Person, schoolId: string): string | null {
  const school = archetypeOf(schoolId);
  if (!school || !getDemand(schoolId)) return 'Cela n’existe pas.';
  if (!atSchoolAge(child)) {
    return child.age < FROM ? `Il faut attendre ${FROM} ans.` : 'Sa scolarité est finie.';
  }
  if (schoolOf(child) === schoolId) return 'Il y est déjà.';
  const record = upbringingOf(child);
  const needed = SELECTIVE[schoolId];
  if (needed !== undefined) {
    if (child.age < needed) return `On n’y entre pas avant ${needed} ans.`;
    if (record.mark < MARK_FLOOR) return `Il faudrait au moins ${MARK_FLOOR} de moyenne. Il en a ${record.mark.toFixed(1)}.`;
  }
  const cost = tuitionOf(state, schoolId);
  if (cost > state.player.money) return 'Tu n’as pas de quoi payer l’année.';
  return null;
}

/** Les établissements qu'on peut envisager pour cet enfant. */
export function optionsFor(state: GameState, child: Person) {
  return DEMANDS.map((demand) => ({
    demand,
    school: archetypeOf(demand.id)!,
    why: enrolBlocker(state, child, demand.id),
    cost: tuitionOf(state, demand.id),
    fit: fitOf(child, demand.id),
  })).filter((row) => row.school);
}

/* ------------------------------------------------------------------ */
/* Décider                                                             */
/* ------------------------------------------------------------------ */

/**
 * L'inscrire quelque part.
 *
 * Le premier choix est gratuit ; **changer coûte**, parce qu'on y laisse ses
 * camarades. Sans cela, on optimiserait l'établissement chaque année selon la
 * trésorerie, et il n'y aurait pas de décision — seulement un curseur.
 */
export function enrol(ctx: Ctx, childId: string, schoolId: string): ActionResult {
  const { state } = ctx;
  const child = state.npcs[childId];
  if (!child) return { ok: false, message: 'Il n’est pas là.' };
  const why = enrolBlocker(state, child, schoolId);
  if (why) return { ok: false, message: why };
  const record = upbringingOf(child);
  const school = archetypeOf(schoolId)!;
  const demand = getDemand(schoolId)!;
  const moving = Boolean(schoolOf(child));

  if (moving) {
    child.stats.happiness = clampStat(child.stats.happiness - MOVE_STING);
    child.relationship = clampStat(child.relationship - 2);
  }
  record.schoolId = schoolId;
  record.schoolSince = state.year;
  child.upbringing = record;

  ctx.log(
    'family',
    `${child.firstName} entre à ${school.label.toLowerCase()}.`,
    moving ? 'neutral' : 'good',
  );
  return {
    ok: true,
    title: school.label,
    message: `${demand.line} ${fitLine(child, schoolId)}${
      moving ? ' Il laisse ses camarades derrière lui.' : ''}`,
  };
}

/* ------------------------------------------------------------------ */
/* L'année                                                             */
/* ------------------------------------------------------------------ */

/**
 * Ce qu'une année d'école fait à un enfant.
 *
 * Appelée depuis `upbringing.ts#advanceUpbringing`, **avant** que la moyenne ne
 * soit recalculée : ce que l'établissement a appris cette année doit compter
 * dans la moyenne de cette année-là.
 *
 * Un enfant sans établissement choisi n'est pas puni : il suit le tout-venant
 * de son quartier, et le calcul reste celui d'avant. Ce système ne retire rien.
 */
export function advanceSchooling(ctx: Ctx, child: Person): void {
  const { state } = ctx;
  const record = child.upbringing;
  const schoolId = schoolOf(child);
  const school = archetypeOf(schoolId);
  const demand = getDemand(schoolId);
  if (!record || !school || !demand || !atSchoolAge(child)) return;

  // Les frais, tous les ans, sur la même poche que le reste de l'enfance.
  const cost = tuitionOf(state, schoolId!);
  if (cost > 0) {
    if (state.player.money < cost) {
      // On ne peut plus payer : il rentre dans le public du quartier.
      record.schoolId = 'publicOrdinary';
      child.stats.happiness = clampStat(child.stats.happiness - MOVE_STING);
      ctx.log('family', `Tu ne peux plus payer l’école de ${child.firstName}. Il change.`, 'bad');
      return;
    }
    state.player.money -= cost;
    record.invested += cost / Math.max(1, 42_000);
  }

  const fit = fitOf(child, schoolId!);

  // Ce qu'on y apprend : le niveau de l'établissement, à hauteur de ce que
  // l'enfant en tire. Rendements décroissants, comme pour les devoirs.
  const room = 1 - child.stats.intelligence / 100;
  child.stats.intelligence = clampStat(
    child.stats.intelligence + (school.academic - 50) * TAUGHT * fit * room,
  );
  // Ce que la scolarité suivie vaut, indépendamment des gestes du parent : un
  // bon établissement enseigne même à un parent absent. C'est ce qui fait de
  // l'école une décision et non un accessoire.
  record.schooling += Math.max(0, (school.academic - 40) / 22) * fit;

  // L'humeur : l'encadrement d'un côté, le harcèlement de l'autre, et ce que
  // coûte de ne pas être à la hauteur du lieu.
  const held = (child.personality.discipline + child.stats.intelligence) / 2;
  const short = Math.max(0, demand.asks - held);
  child.stats.happiness = clampStat(
    child.stats.happiness
    + (school.support - school.bullying) * MOOD * 0.1
    - short * STRAIN,
  );

  // La tenue du lieu déteint.
  child.personality.discipline = clampStat(
    child.personality.discipline + (school.discipline - 50) * FRAME,
  );

  // Et ce que l'établissement prend : l'internat l'emmène, l'école à la maison
  // le garde. L'attention est ce dont dépend le lien — et l'héritier.
  if (demand.takes !== 0) {
    record.attention = Math.max(0, record.attention - demand.takes * 0.1);
    child.relationship = clampStat(child.relationship - demand.takes * 0.08);
  }
}

/**
 * Ce que l'établissement laisse une fois l'enfance close.
 *
 * Le réseau ne sert à rien pendant l'enfance : il sert après. Appelé par
 * `upbringing.ts#settleChildhood`, il pousse la réputation de départ de
 * l'adulte — et donc celle de l'héritier, si l'on continue avec lui.
 */
export function schoolLegacy(child: Person): number {
  const school = archetypeOf(schoolOf(child));
  if (!school) return 0;
  return (school.alumni - 40) * NETWORK * 0.1;
}

/** Ce que le parent y met de ses propres années — lu par `moonlight.ts`. */
export function schoolingLoad(state: GameState): number {
  let load = 0;
  for (const who of Object.values(state.npcs)) {
    if (!who.alive || who.relation !== 'son' && who.relation !== 'daughter') continue;
    const demand = getDemand(schoolOf(who));
    if (demand && atSchoolAge(who)) load += demand.yours / 100;
  }
  return load;
}

/* ------------------------------------------------------------------ */
/* Ce qui se lit                                                       */
/* ------------------------------------------------------------------ */

export function summary(state: GameState, child: Person): string {
  const school = archetypeOf(schoolOf(child));
  if (!atSchoolAge(child)) {
    return child.age < FROM ? 'Pas encore l’âge' : 'Sa scolarité est finie';
  }
  if (!school) return 'Le tout-venant du quartier — tu n’as rien choisi';
  const cost = tuitionOf(state, schoolOf(child)!);
  return `${school.label}${cost > 0 ? ` · ${cost} par an` : ' · gratuit'}`;
}
