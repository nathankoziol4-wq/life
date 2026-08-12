/**
 * Vie scolaire : la classe, les camarades, les groupes, la popularité.
 *
 * L'établissement donne le cadre — le niveau, la pression, le budget. La
 * classe donne le quotidien, et c'est là que se joue le plus gros de
 * l'adolescence : à qui on parle, qui rit avec vous ou de vous, et si l'on
 * se sent à sa place.
 *
 * Deux principes :
 *
 * 1. **Les amitiés ne tombent pas du ciel.** Elles se calculent à partir de
 *    la proximité réelle (même classe, même rue), des intérêts communs, de la
 *    compatibilité de caractère et du temps passé ensemble.
 * 2. **Les groupes émergent.** Personne ne décide qu'il existe un « groupe
 *    des sportifs » : il se forme si assez d'élèves partagent un goût, et se
 *    défait quand ce n'est plus le cas.
 */

import type { Ctx } from '../engine/context.ts';
import { fullName } from '../engine/context.ts';
import type { GameState, Person } from '../engine/types.ts';
import type { PeerGroup, Popularity, SchoolClass, Staff, StaffRole } from '../engine/origin.ts';
import { clampStat, type Rng } from '../engine/rng.ts';
import { INTEREST_MAP } from '../data/interests.ts';
import { createPerson } from './npc.ts';
import { buildPsyche } from './psycheGen.ts';
import { seedNpcInterests } from './household.ts';
import { applyExperience, calculateCompatibility } from './psyche.ts';
import { record } from './causality.ts';

/* ------------------------------------------------------------------ */
/* Constitution de la classe                                           */
/* ------------------------------------------------------------------ */

/**
 * Crée la classe de l'année.
 *
 * On ne modélise pas trente élèves : une poignée de camarades marquants
 * suffit à produire des amitiés, des rivalités et des groupes crédibles, sans
 * faire exploser la sauvegarde.
 */
export function buildSchoolClass(ctx: Ctx, stageId: string): SchoolClass {
  const { state, rng } = ctx;
  const p = state.player;
  const school = p.origin.school;
  const size = school ? Math.max(1, school.classSize) : 25;

  // On tourne la page sur la classe précédente. Personne ne garde en mémoire
  // les trente élèves de chaque année de sa scolarité : ceux avec qui un lien
  // s'est noué restent, les autres s'effacent. Sans cela une vie traînerait
  // une soixantaine de figurants que le moteur ferait vieillir chaque année,
  // chacun avec une personnalité complète.
  dismissPreviousClass(ctx);

  // Le nombre de camarades réellement suivis augmente avec l'âge : un enfant
  // de six ans a deux copains, un lycéen a un entourage.
  const tracked = Math.min(8, Math.max(2, Math.round(size / 6 + p.age / 6)));
  const classmateIds: string[] = [];

  for (let i = 0; i < tracked; i++) {
    const person = createPerson(ctx, {
      relation: 'classmate',
      age: p.age + rng.int(-1, 1),
      withJob: false,
      relationship: rng.int(20, 45),
      opinion: rng.int(25, 55),
    });
    // Un camarade a une vraie personnalité : c'est ce qui rend les affinités
    // calculables plutôt qu'arbitraires.
    person.psyche = buildPsyche(rng, { age: person.age });
    seedNpcInterests(rng, person);
    person.flags.classmate = true;
    classmateIds.push(person.id);
  }

  const staff = buildStaff(ctx);
  const level = school ? school.peerLevel : 50;
  return {
    id: stageId,
    size,
    mainTeacherId: staff.find((s) => s.role === 'professeur principal')?.personId ?? null,
    staff,
    classmateIds,
    atmosphere: clampStat(
      60 - (school?.competition ?? 50) * 0.2 - (school?.bullying ?? 40) * 0.25 + rng.float(-12, 12),
    ),
    level: clampStat(level + rng.float(-10, 10)),
    conflict: clampStat((school?.bullying ?? 40) * 0.5 + (school?.competition ?? 50) * 0.2 + rng.float(-10, 10)),
    groups: [],
  };
}

/**
 * Solde la classe et le personnel de l'année précédente.
 *
 * Un camarade devenu ami reste ; un camarade resté camarade disparaît. Le
 * personnel disparaît toujours : on ne suit pas ses anciens professeurs.
 */
function dismissPreviousClass(ctx: Ctx): void {
  const { state } = ctx;
  const klass = state.player.origin.schoolClass;
  if (!klass) return;

  for (const id of klass.classmateIds) {
    const npc = state.npcs[id];
    if (!npc) continue;
    npc.flags.classmate = false;
    if (npc.relation !== 'classmate') continue; // devenu ami : il reste
    if (npc.relationship >= 62) { npc.relation = 'friend'; continue; }
    delete state.npcs[id];
  }
  for (const member of klass.staff) {
    const npc = state.npcs[member.personId];
    if (!npc || npc.relation !== 'teacher') continue;
    delete state.npcs[member.personId];
  }
}

/** Matières enseignées, selon l'âge : un enfant a un maître, pas huit profs. */
const SUBJECTS = [
  'Mathématiques', 'Français', 'Histoire-géographie', 'Sciences',
  'Langues', 'Éducation physique', 'Arts plastiques', 'Musique',
  'Technologie', 'Philosophie',
];

/**
 * Constitue le personnel que l'élève côtoie réellement.
 *
 * La qualité du corps enseignant n'est pas tirée au hasard : elle découle de
 * l'établissement. Une école exigeante attire des professeurs compétents et
 * sévères ; une école qui perd ses enseignants chaque année en a de moins
 * expérimentés. C'est ce qui fait qu'un même élève n'apprend pas la même
 * chose selon l'endroit où il tombe.
 */
function buildStaff(ctx: Ctx): Staff[] {
  const { state, rng } = ctx;
  const p = state.player;
  const school = p.origin.school;
  if (!school) return [];

  const turnover = school.teacherTurnover;
  const base = school.teacherQuality;
  const staff: Staff[] = [];

  const hire = (role: StaffRole, subject: string | null) => {
    const person = createPerson(ctx, {
      relation: 'teacher',
      age: rng.int(role === 'directeur' ? 45 : 26, role === 'directeur' ? 64 : 61),
      withJob: false,
      relationship: rng.int(30, 50),
      opinion: rng.int(35, 60),
    });
    person.psyche = buildPsyche(rng, { age: person.age });
    person.jobTitle = subject ? `Professeur de ${subject.toLowerCase()}` : role;
    person.flags.staff = true;
    // Un professeur usé par le renouvellement permanent enseigne moins bien.
    const skill = clampStat(base + rng.float(-16, 16) - turnover * 0.18);
    staff.push({
      personId: person.id,
      role,
      subject,
      skill,
      // La sévérité suit le règlement de l'établissement, tempérée par le
      // caractère : un professeur doux dans une école dure reste plus doux.
      strictness: clampStat(school.discipline * 0.6 + (100 - person.psyche.axes.empathy) * 0.25 + rng.float(-12, 12)),
      popularity: clampStat(person.psyche.axes.extraversion * 0.4 + skill * 0.3 + rng.float(-14, 14)),
      professionalism: clampStat(base * 0.4 + person.psyche.axes.honesty * 0.4 + rng.float(-14, 14)),
    });
  };

  // Le nombre d'adultes identifiés grandit avec l'âge : un enfant de six ans
  // a un maître et un directeur, un lycéen a plusieurs professeurs.
  const count = p.age < 11 ? 1 : p.age < 15 ? 3 : 4;
  const subjects = rng.shuffle([...SUBJECTS]).slice(0, count);
  hire('professeur principal', subjects[0]);
  for (const subject of subjects.slice(1)) hire('professeur', subject);
  hire('directeur', null);
  // Un conseiller n'existe que là où l'établissement en finance un.
  if (school.counselling > 45) hire('conseiller', null);

  return staff;
}

/** Le personnel encore en poste et vivant. */
export function staffOf(state: GameState): { staff: Staff; person: Person }[] {
  const klass = state.player.origin.schoolClass;
  if (!klass) return [];
  return klass.staff
    .map((s) => ({ staff: s, person: state.npcs[s.personId] }))
    .filter((x): x is { staff: Staff; person: Person } => Boolean(x.person?.alive));
}

/** Les camarades encore présents. */
export function classmatesOf(state: GameState): Person[] {
  const klass = state.player.origin.schoolClass;
  if (!klass) return [];
  return klass.classmateIds
    .map((id) => state.npcs[id])
    .filter((x): x is Person => Boolean(x?.alive));
}

/* ------------------------------------------------------------------ */
/* Amitiés naturelles                                                  */
/* ------------------------------------------------------------------ */

/**
 * Probabilité qu'une amitié se noue avec une personne donnée.
 *
 * C'est la formule demandée au §46 : proximité, intérêts communs,
 * personnalité, amis communs, temps passé ensemble. Chaque terme est renvoyé
 * séparément pour que le jeu puisse expliquer pourquoi telle amitié est née.
 */
export function friendshipChance(state: GameState, other: Person): {
  chance: number;
  terms: { label: string; value: number }[];
} {
  const p = state.player;
  const terms: { label: string; value: number }[] = [];
  let score = 0;

  const add = (label: string, value: number) => {
    if (Math.abs(value) < 0.01) return;
    terms.push({ label, value });
    score += value;
  };

  // Proximité : on ne devient pas ami avec quelqu'un qu'on ne croise pas.
  const sameClass = p.origin.schoolClass?.classmateIds.includes(other.id) ?? false;
  const neighbour = p.origin.neighbours.some((n) => n.childIds.includes(other.id));
  add('même classe', sameClass ? 0.28 : 0);
  add('même rue', neighbour ? 0.24 : 0);
  if (!sameClass && !neighbour) add('se croisent peu', -0.1);

  // Intérêts communs : le vrai ciment.
  if (other.psyche) {
    let shared = 0;
    let bestLabel = '';
    for (const mine of p.psyche.interests) {
      const theirs = other.psyche.interests.find((i) => i.id === mine.id);
      if (!theirs) continue;
      const strength = Math.min(mine.level, theirs.level) / 100;
      if (strength > shared) {
        shared = strength;
        bestLabel = INTEREST_MAP[mine.id]?.label ?? mine.id;
      }
    }
    if (shared > 0.25) add(`passion commune : ${bestLabel.toLowerCase()}`, shared * 0.3);

    // Compatibilité de caractère, pour une amitié précisément.
    const compat = calculateCompatibility(p.psyche, other.psyche, 'amitié');
    add('caractères compatibles', (compat.score - 50) / 190);
  }

  // Amis communs : on entre dans un groupe par quelqu'un.
  const mutual = Object.values(state.npcs).filter(
    (x) => x.alive && (x.relation === 'friend' || x.relation === 'bestFriend')
      && x.psyche && other.psyche && x.id !== other.id,
  ).length;
  add('amis communs', Math.min(0.12, mutual * 0.04));

  // Ce qu'on est soi-même.
  add('aisance sociale', (p.psyche.social.approachEase - 50) / 260);
  add('peur du jugement', -(p.psyche.social.fearOfJudgement - 50) / 320);

  // Le temps : sans temps libre, aucune amitié ne se construit.
  const free = p.origin.time.free;
  add('temps disponible', free > 6 ? 0.08 : free < 2 ? -0.16 : 0);

  return { chance: Math.max(0, Math.min(0.85, score)), terms };
}

/**
 * Fait vivre la classe : amitiés qui se nouent, conflits, harcèlement.
 */
export function advanceClassLife(ctx: Ctx): void {
  const { state, rng } = ctx;
  const p = state.player;
  const klass = p.origin.schoolClass;
  if (!klass) return;

  for (const id of klass.classmateIds) {
    const other = state.npcs[id];
    if (!other?.alive) continue;

    const { chance, terms } = friendshipChance(state, other);
    if (other.relation === 'classmate' && rng.chance(chance * 0.5)) {
      other.relation = 'friend';
      other.relationship = clampStat(other.relationship + 18);
      const why = terms.filter((t) => t.value > 0.1).map((t) => t.label);
      ctx.log('family', `Tu es devenu${p.sex === 'F' ? 'e' : ''} ami${p.sex === 'F' ? 'e' : ''} avec ${fullName(other)}.`, 'good');
      record(state, {
        source: why[0] ?? 'la classe',
        target: `ami:${other.id}`,
        strength: chance,
        reason: `amitié avec ${other.firstName}${why.length ? ` — ${why.join(', ')}` : ''}`,
        age: p.age,
      });
      // La première vraie amitié laisse une trace durable.
      if (p.age <= 12 && !p.flags.hadFirstFriend) {
        p.flags.hadFirstFriend = true;
        applyExperience(ctx, 'premierAmi', { person: other });
      }
    } else {
      // Les liens tièdes se réchauffent ou refroidissent doucement.
      other.relationship = clampStat(other.relationship + (chance - 0.3) * 14 + rng.float(-4, 4));
    }
  }

  rebuildGroups(ctx, klass);
  updatePopularity(ctx, klass);
}

/* ------------------------------------------------------------------ */
/* Groupes sociaux                                                     */
/* ------------------------------------------------------------------ */

/**
 * Reconstitue les groupes d'affinité de la classe.
 *
 * Un groupe existe s'il rassemble au moins trois personnes autour d'un même
 * goût suffisamment marqué. Personne ne les nomme d'avance : l'étiquette est
 * dérivée de ce qui rassemble, et disparaît quand le goût s'éteint.
 */
function rebuildGroups(ctx: Ctx, klass: SchoolClass): void {
  const { state } = ctx;
  const byInterest = new Map<string, string[]>();

  const consider = (id: string, psyche: { interests: { id: string; level: number }[] } | undefined) => {
    if (!psyche) return;
    for (const interest of psyche.interests) {
  if (interest.level < 42) continue;
      const list = byInterest.get(interest.id) ?? [];
      list.push(id);
      byInterest.set(interest.id, list);
    }
  };

  // Seuls les camarades constituent un groupe. Compter le joueur parmi eux
  // aurait un effet pervers : un groupe n'existerait qu'autour de ses propres
  // goûts, il en serait donc toujours déjà membre, et « tenter d'intégrer un
  // groupe » ne servirait jamais à rien.
  for (const id of klass.classmateIds) consider(id, state.npcs[id]?.psyche);

  // On garde en mémoire les groupes déjà intégrés : la reconstitution
  // annuelle ne doit pas effacer une appartenance gagnée.
  const wasMember = new Set(klass.groups.filter((g) => g.playerMember).map((g) => g.id));

  const groups: PeerGroup[] = [];
  for (const [interestId, memberIds] of byInterest) {
    // Deux camarades suffisent : on ne suit qu'une poignée d'élèves par
    // classe, en exiger trois rendrait les groupes quasi inexistants.
    if (memberIds.length < 2) continue;
    const def = INTEREST_MAP[interestId];
    if (!def) continue;
    // Le statut d'un groupe dépend de ce que la classe valorise : le sport et
    // le style rapportent, les échecs beaucoup moins. Ce n'est pas un jugement
    // du jeu, c'est une observation sur les cours de récréation.
    const standing = clampStat(
      { sport: 72, social: 76, culture: 52, technique: 44, intellect: 40, nature: 46, manuel: 48 }[def.category]
      + memberIds.length * 3,
    );
    groups.push({
      id: `grp_${interestId}`,
      label: `Ceux qui aiment ${def.label.toLowerCase()}`,
      interestId,
      memberIds,
      standing,
      playerMember: wasMember.has(`grp_${interestId}`),
    });
  }

  // Un groupe purement social, sans passion commune : le noyau des liens forts.
  const close = klass.classmateIds.filter((id) => (state.npcs[id]?.relationship ?? 0) > 62);
  if (close.length >= 3) {
    groups.push({
      id: 'grp_bande',
      label: 'La bande',
      interestId: null,
      memberIds: close,
      standing: clampStat(55 + close.length * 4),
      playerMember: true,
    });
  }

  klass.groups = groups.sort((a, b) => b.standing - a.standing).slice(0, 5);
}

/* ------------------------------------------------------------------ */
/* Popularité                                                          */
/* ------------------------------------------------------------------ */

/**
 * Popularité en plusieurs dimensions.
 *
 * Être connu n'est pas être apprécié, et être respecté n'est pas être aimé.
 * Un élève peut avoir une réputation considérable et manger seul.
 */
function updatePopularity(ctx: Ctx, klass: SchoolClass): void {
  const { state } = ctx;
  const p = state.player;
  const psyche = p.psyche;
  const pop: Popularity = p.origin.popularity;
  const size = klass.size;

  const friends = Object.values(state.npcs).filter(
    (x) => x.alive && (x.relation === 'friend' || x.relation === 'bestFriend'),
  ).length;
  const groupStanding = klass.groups
    .filter((g) => g.playerMember)
    .reduce((max, g) => Math.max(max, g.standing), 0);

  const towards = (current: number, target: number) => Math.round(current + (target - current) * 0.35);

  pop.known = towards(pop.known, Math.min(size, Math.round(
    size * (0.15 + psyche.axes.extraversion / 260 + groupStanding / 300 + p.stats.reputation / 400),
  )));
  pop.liked = towards(pop.liked, Math.min(pop.known, Math.round(
    friends * 2.2 + psyche.social.charm / 9 + psyche.axes.empathy / 12 - psyche.axes.aggression / 14,
  )));
  pop.respected = towards(pop.respected, Math.min(size, Math.round(
    p.education.grades * 0.9 + psyche.axes.confidence / 7 + groupStanding / 12 - psyche.axes.jealousy / 20,
  )));
  pop.influential = towards(pop.influential, Math.round(
    (pop.liked * 0.4 + pop.respected * 0.4) * (psyche.social.assertiveness / 90),
  ));
  pop.intimidating = towards(pop.intimidating, Math.round(
    psyche.axes.aggression / 6 + (100 - psyche.axes.empathy) / 14,
  ));
  pop.funny = towards(pop.funny, Math.round(psyche.social.humour / 5));

  for (const key of Object.keys(pop) as (keyof Popularity)[]) {
    pop[key] = Math.max(0, Math.min(size, pop[key]));
  }
}

/* ------------------------------------------------------------------ */
/* Harcèlement                                                         */
/* ------------------------------------------------------------------ */

/**
 * Le harcèlement scolaire.
 *
 * Traité sobrement : c'est l'une des expériences qui marquent le plus
 * durablement une personnalité, et le jeu doit pouvoir la représenter sans
 * la mettre en scène. Le risque dépend de l'établissement, de la place
 * sociale de l'élève et de sa capacité à répondre.
 */
/**
 * Risque d'être pris pour cible cette année, 0-1.
 *
 * La formule n'a pas bougé depuis l'audit : elle lisait déjà les bonnes
 * choses — le milieu de l'établissement, l'isolement, l'assurance, l'allure,
 * la popularité, l'accompagnement. Ce qui a changé est ce qu'on en fait :
 * elle renvoie une mesure, et `systems/bullying.ts` ouvre une situation avec
 * quelqu'un dedans. Une fonction qui mesure peut être testée et affichée ;
 * une fonction qui posait un drapeau ne pouvait ni l'un ni l'autre.
 */
export function bullyingRisk(state: GameState): number {
  const p = state.player;
  const school = p.origin.school;
  if (!school || p.age < 7 || p.age > 18) return 0;

  const psyche = p.psyche;
  const isolation = p.origin.popularity.liked < 2 ? 1 : 0;
  return Math.max(0, Math.min(0.2,
    school.bullying / 900
    + isolation * 0.05
    + (60 - psyche.social.assertiveness) / 1400
    + (p.stats.looks < 32 ? 0.02 : 0)
    - p.origin.popularity.liked / 260
    - (school.counselling - 50) / 2200,
  ));
}

/** Nombre d'élèves partageant un intérêt donné dans la classe. */
export function peersSharing(state: GameState, interestId: string): number {
  const klass = state.player.origin.schoolClass;
  if (!klass) return 0;
  return klass.classmateIds.filter((id) => {
    const psyche = state.npcs[id]?.psyche;
    return psyche?.interests.some((i) => i.id === interestId && i.level > 45) ?? false;
  }).length;
}

/** Aide au tirage d'un camarade au hasard. */
export function randomClassmate(state: GameState, rng: Rng): Person | null {
  const klass = state.player.origin.schoolClass;
  if (!klass || klass.classmateIds.length === 0) return null;
  const alive = klass.classmateIds.map((id) => state.npcs[id]).filter((x): x is Person => Boolean(x?.alive));
  return alive.length > 0 ? rng.pick(alive) : null;
}
