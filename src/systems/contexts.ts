/**
 * Couche de contexte : ce que l'environnement change concrètement.
 *
 * C'est le seul endroit où l'environnement est traduit en chiffres
 * exploitables par le moteur. Les systèmes (école, carrière, finances,
 * relations, santé, événements) lisent ces contextes ; ils ne lisent jamais
 * directement `player.origin`. Deux conséquences :
 *
 * 1. un paramètre d'environnement qui n'apparaît nulle part ici n'a aucun
 *    effet — et l'audit `validateEnvironmentImpact()` le signale ;
 * 2. on peut expliquer *pourquoi* une probabilité vaut ce qu'elle vaut, grâce
 *    au `Composer` qui conserve la trace de chaque contribution.
 */

import type { GameState } from '../engine/types.ts';
import type { AcquiredTraits, ParentRole, WorldOrigin } from '../engine/origin.ts';
import type { Values } from '../engine/psyche.ts';
import { VALUE_KEYS, VALUE_LABELS } from '../engine/psyche.ts';
import { getCountry } from '../data/countries.ts';
import { nationalIncome } from './originGen.ts';

/* ------------------------------------------------------------------ */
/* Traçabilité                                                         */
/* ------------------------------------------------------------------ */

export interface TraceLine {
  label: string;
  /** Contribution à la valeur finale, dans l'unité de la valeur. */
  delta: number;
}

/**
 * Compose une valeur à partir d'une base et de contributions nommées, en
 * gardant la trace de chacune. C'est ce qui permet d'afficher
 * « Base 5 % · club à 10 min +7 % · un ami déjà inscrit +4 % ».
 */
export class Composer {
  readonly base: number;
  readonly baseLabel: string;
  private lines: TraceLine[] = [];
  private current: number;

  constructor(base: number, baseLabel = 'Base') {
    this.base = base;
    this.baseLabel = baseLabel;
    this.current = base;
  }

  /** Contribution additive. */
  add(label: string, delta: number): this {
    if (!Number.isFinite(delta) || Math.abs(delta) < 1e-9) return this;
    this.current += delta;
    this.lines.push({ label, delta });
    return this;
  }

  /** Contribution multiplicative, enregistrée comme son effet réel. */
  mul(label: string, factor: number): this {
    if (!Number.isFinite(factor) || Math.abs(factor - 1) < 1e-9) return this;
    const before = this.current;
    this.current *= factor;
    this.lines.push({ label, delta: this.current - before });
    return this;
  }

  /** Contribution conditionnelle : n'enregistre rien si la condition est fausse. */
  addIf(condition: boolean, label: string, delta: number): this {
    return condition ? this.add(label, delta) : this;
  }

  /**
   * Borne *douce* : la valeur s'approche des bornes sans jamais les atteindre.
   *
   * Un écrêtage sec ferait disparaître les contributions dès qu'on touche la
   * borne — un hameau isolé écrasé à zéro cesserait de réagir à quoi que ce
   * soit, et des paramètres pourtant lus deviendraient sans effet. La courbe
   * logistique est monotone : chaque contribution continue de compter, même à
   * l'extrémité du domaine.
   */
  soften(min: number, max: number): this {
    const span = max - min;
    const t = (this.current - min) / span;
    this.current = min + span / (1 + Math.exp(-4 * (t - 0.5)));
    return this;
  }

  get value(): number {
    return this.current;
  }

  get trace(): TraceLine[] {
    return [{ label: this.baseLabel, delta: this.base }, ...this.lines];
  }

  /** Explication lisible : « Base 5 % · club proche +7 % ». */
  explain(format: (n: number) => string = (n) => n.toFixed(1)): string {
    const parts = [`${this.baseLabel} ${format(this.base)}`];
    for (const l of this.lines) {
      parts.push(`${l.label} ${l.delta >= 0 ? '+' : '−'}${format(Math.abs(l.delta))}`);
    }
    return parts.join(' · ');
  }
}

/** Formateur de pourcentage pour les traces. */
export const asPercent = (n: number): string => `${(n * 100).toFixed(1)} %`;

/* ------------------------------------------------------------------ */
/* Cache annuel                                                        */
/* ------------------------------------------------------------------ */

/**
 * Les contextes sont lus des dizaines de fois par année simulée — par
 * l'école, la carrière, les finances, la santé, les événements. Les
 * recalculer à chaque appel coûtait plus cher que tout le reste du moteur
 * réuni.
 *
 * On les mémorise donc pour l'année en cours. Le cache est invalidé dès que
 * l'année ou l'âge change, et `invalidateContexts()` permet de le vider à la
 * main quand quelque chose modifie l'environnement en cours d'année — ce que
 * fait notamment l'audit, qui perturbe les champs un par un.
 */
const CACHE = new WeakMap<GameState, { key: string; values: Map<string, unknown> }>();

function cached<T>(state: GameState, key: string, compute: () => T): T {
  const stamp = `${state.year}_${state.player.age}_${state.rngState}`;
  let entry = CACHE.get(state);
  if (!entry || entry.key !== stamp) {
    entry = { key: stamp, values: new Map() };
    CACHE.set(state, entry);
  }
  if (!entry.values.has(key)) entry.values.set(key, compute());
  return entry.values.get(key) as T;
}

/** Vide le cache : à appeler après toute modification directe de l'environnement. */
export function invalidateContexts(state: GameState): void {
  CACHE.delete(state);
}

/* ------------------------------------------------------------------ */
/* Aides communes                                                      */
/* ------------------------------------------------------------------ */

function origin(state: GameState): WorldOrigin {
  return state.player.origin;
}

/** Moyenne d'un champ du style éducatif sur les parents présents au foyer. */
export function parentAverage(
  o: WorldOrigin,
  pick: (r: ParentRole) => number,
): number {
  const present = o.parents.filter((p) => p.inHousehold);
  const list = present.length > 0 ? present : o.parents;
  if (list.length === 0) return 50;
  return list.reduce((sum, r) => sum + pick(r), 0) / list.length;
}

/** Revenu disponible du foyer, rapporté au revenu médian du pays. */
export function householdRatio(state: GameState): number {
  const o = origin(state);
  return o.finance.disposableIncome / Math.max(1, nationalIncome(getCountry(state.player.countryId)));
}

/* ------------------------------------------------------------------ */
/* Contexte scolaire                                                   */
/* ------------------------------------------------------------------ */

export interface EducationContext {
  /** Points de moyenne ajoutés (ou retirés) chaque année, sur 20. */
  gradeBonus: number;
  /** Multiplicateur de l'effet de l'effort personnel. */
  effortMultiplier: number;
  /** Probabilité qu'un club soit accessible (0-1). */
  clubAccess: number;
  /** Multiplicateur de la probabilité d'accéder à l'université. */
  universityAccess: number;
  /** Frais de scolarité annuels de l'établissement fréquenté. */
  tuition: number;
  /** Stress scolaire annuel infligé par l'établissement. */
  pressure: number;
  /** Multiplicateur de la chance d'obtenir une bourse. */
  scholarship: number;
  /** Multiplicateur du risque de décrochage. */
  dropoutRisk: number;
  explain: string;
}

/**
 * L'école, le logement et les parents, traduits en points de moyenne.
 *
 * L'ampleur est volontairement modeste : sur une année, l'environnement pèse
 * moins qu'un effort soutenu. Mais il pèse *chaque* année, et l'écart se
 * creuse sur une scolarité entière.
 */
function compute_getEducationContext(state: GameState): EducationContext {
  const o = origin(state);
  const p = state.player;
  const school = o.school;
  const expectation = parentAverage(o, (r) => r.style.academicExpectation);
  const help = parentAverage(o, (r) => r.availability.involvement);

  const grade = new Composer(0, 'Base');
  if (school) {
    grade.add('niveau de l’établissement', (school.academic - 55) / 22);
    grade.add('professeurs', (school.teacherQuality - 55) / 30);
    grade.add('effectif par classe', (24 - school.classSize) / 26);
    grade.add('moyens de l’établissement', (school.budget - 55) / 60);
    grade.add('climat scolaire', (school.safety - 60) / 70);
  }
  grade.add('offre scolaire de la ville', (o.city.schools - 55) / 90);
  grade.add('écoles accessibles depuis le quartier', (o.neighborhood.educationAccess - 55) / 75);
  grade.add('niveau de la classe', (((o.schoolClass?.level ?? 50)) - 50) / 70);
  grade.add('ambiance de la classe', (((o.schoolClass?.atmosphere ?? 55)) - 55) / 90);
  grade.add('soutien scolaire disponible', ((o.school?.tutoring ?? 45) - 50) / 110);
  grade.add('professeurs qui restent', -((o.school?.teacherTurnover ?? 45) - 45) / 120);
  grade.add('sommeil', (o.sleep.quality - 65) / 55 + (o.sleep.hours - 8) / 4);
  grade.add('bagage culturel de la famille', (o.capitals.cultural - 50) / 80);
  grade.add('temps pour travailler', Math.tanh((o.time.free - 6) / 14) * 0.9);
  grade.add('heures de cours', (o.time.school - 28) / 60);
  grade.add('temps de devoirs', Math.tanh(o.time.homework / 9) * 0.7);
  grade.add('trajets', -Math.tanh(o.time.commute / 8) * 0.5);
  grade.add('vie sociale', Math.tanh(o.time.social / 12) * 0.2);
  grade.add('journée disponible', (o.time.total - 110) / 260);
  grade.add('temps donné aux habitudes', -Math.tanh(o.time.habits / 20) * 0.25);
  grade.add('temps en famille', Math.tanh(o.time.family / 10) * 0.3);
  grade.add('temps des activités', Math.tanh(o.time.activities / 8) * 0.2);
  grade.add('niveau des camarades', ((o.school?.peerLevel ?? 50) - 50) / 85);
  grade.add('émulation', competitionCurve(o.school?.competition ?? 50));
  grade.add('accompagnement psychologique', ((o.school?.counselling ?? 45) - 50) / 190);
  grade.add('effectif réel de la classe', (26 - (o.schoolClass?.size ?? 26)) / 46);
  grade.add('tensions dans la classe', -((o.schoolClass?.conflict ?? 40) - 40) / 105);
  grade.add('maîtrise de la langue', (mainFluency(o) - 80) / 55);
  grade.add('corvées à la maison', -Math.max(0, o.chores.hoursPerWeek - 4) / 14);
  grade.add('pression parentale', pressureCurve(o.pressure));
  grade.addIf(o.languages.home.length > 0 && p.age < 10, 'une autre langue à la maison', -0.3);
  grade.addIf(o.languages.home.length > 0 && p.age >= 14, 'bilinguisme installé', 0.25);
  grade
    .addIf(o.living.studySpace, 'un endroit pour travailler', 0.5)
    .addIf(!o.living.studySpace, 'aucun endroit calme', -0.45)
    .addIf(o.living.ownBedroom, 'chambre individuelle', 0.3)
    .addIf(o.living.booksAtHome, 'des livres à la maison', 0.35)
    .addIf(o.living.computer, 'un ordinateur à la maison', 0.18)
    .addIf(o.living.internet, 'une connexion', 0.16)
    .addIf(o.living.computer && o.living.internet, 'les deux ensemble', 0.1)
    .add('attentes parentales', (expectation - 50) / 42)
    .add('aide des parents', (help - 50) / 55)
    .add('climat du foyer', (o.atmosphere.calm - 50) / 60)
    .add('tension financière', -o.finance.financialStress / 90)
    .add('trajet jusqu’à l’école', -Math.max(0, o.transport.schoolMinutes - 12) / 65)
    .soften(-3.2, 3.2);

  const clubs = new Composer(0.1, 'Base')
    .add('activités de l’établissement', (school ? school.clubs - 45 : -20) / 320)
    .add('diversité des programmes', (school ? school.programBreadth - 50 : -10) / 400)
    .add('associations du quartier', (o.social.localActivities - 45) / 380)
    .add('équipements du quartier', (o.neighborhood.childActivities - 45) / 340)
    .addIf(o.living.familyCar, 'voiture familiale', 0.08)
    .add('moyens du foyer', Math.min(0.18, Math.max(-0.2, householdRatio(state) * 0.12)))
    .soften(0.02, 0.92);

  const university = new Composer(1, 'Base')
    .add('réputation de l’établissement', (school ? school.reputation - 55 : -10) / 190)
    .add('options suivies', (school ? school.programBreadth - 50 : -10) / 320)
    .add('universités accessibles', (o.city.universities - 50) / 260)
    .add('attentes parentales', (expectation - 50) / 180)
    .add('capacité à financer', Math.min(0.3, Math.max(-0.35, householdRatio(state) * 0.25)))
    .soften(0.4, 1.9);

  return {
    gradeBonus: grade.value,
    effortMultiplier: 1 + (school ? (school.discipline - 50) / 300 : 0),
    clubAccess: clubs.value,
    universityAccess: university.value
      * (1 + (o.school?.alumniNetwork ?? 40) / 420)
      * (1 + (o.capitals.cultural - 50) / 300),
    tuition: school ? school.tuition : 0,
    pressure: school ? (school.pressure - 45) / 9 : 0,
    scholarship: 1
      + (school ? (school.academic - 55) / 160 : 0)
      - Math.min(0.4, Math.max(0, householdRatio(state)) * 0.2),
    dropoutRisk: Math.max(
      0.3,
      1
      + o.difficulties.education / 130
      + o.difficulties.financial / 200
      - (expectation - 50) / 130
      - (school ? (school.discipline - 50) / 200 : 0)
      - ((school?.guidance ?? 45) - 50) / 220
      + ((school?.bullying ?? 40) - 40) / 190
      + (o.chores.familyWork ? 0.12 : 0)
      + (1 - o.stability / 100) * 0.25,
    ),
    explain: grade.explain((n) => `${n.toFixed(2)} pt`),
  };
}

/* ------------------------------------------------------------------ */
/* Contexte social                                                     */
/* ------------------------------------------------------------------ */

export interface SocialContext {
  /** Multiplicateur de la probabilité de se faire un ami dans l'année. */
  friendChance: number;
  /** Milieu social moyen des personnes rencontrées, 0-100. */
  peerBackground: number;
  /** Position sociale ressentie à l'école. */
  popularity: number;
  /** Capacité à en imposer plutôt qu'à plaire, 0-100. */
  streetPresence: number;
  /** Multiplicateur des événements de délinquance et d'exposition à la rue. */
  streetExposure: number;
  /** Dérive annuelle du bonheur due à l'isolement ou à la vie de quartier. */
  happinessDrift: number;
  /** Multiplicateur de la probabilité de rencontre amoureuse. */
  datingChance: number;
  explain: string;
}

function compute_getSocialContext(state: GameState): SocialContext {
  const o = origin(state);
  const p = state.player;

  const friend = new Composer(1, 'Base')
    .add('vie de quartier', (o.neighborhood.socialOpportunity - 50) / 110)
    .add('occasions de rencontre', (o.social.socialOpportunities - 50) / 260)
    .add('confiance entre voisins', (o.social.neighbourTrust - 50) / 200)
    .add('voisinage qui change souvent', -o.social.residentialMobility / 300)
    .add('enfants du même âge', Math.min(0.45, o.social.peersNearby / 40))
    .add('isolement', -o.social.isolation / 190)
    .addIf(!o.living.ownBedroom, 'personne à inviter chez soi', -0.1)
    .add('taille de l’établissement', ((o.school?.students ?? 300) - 350) / 4200)
    .add('densité urbaine', (o.city.density - 50) / 340)
    .add('densité du quartier', (o.neighborhood.density - 50) / 300)
    .add('commerces et lieux de sortie', (o.city.shops - 50) / 380)
    // La rue compte autant que le quartier : c'est là qu'on joue dehors.
    .add('enfants dans la rue', Math.tanh(o.street.childrenNearby / 6) * 0.5)
    .add('voisinage qui se parle', (o.street.neighbourRelations - 50) / 180)
    .add('foyers à portée de voix', Math.tanh(o.street.households / 45) * 0.24)
    .add('logements collés', (o.street.proximity - 50) / 300)
    .add('un dehors où se retrouver', (o.street.outdoorSpace - 50) / 260)
    .add('circulation', -(o.street.traffic - 50) / 320)
    .add('commerces au pied de chez soi', Math.tanh(o.street.shopsWithinWalk / 5) * 0.16)
    .add('voisins connus de la famille', Math.tanh(o.neighbours.length / 3) * 0.24)
    .add('un ami tout près', 300 / (300 + o.distances.bestFriend) * 0.4)
    .add('arrêt de bus accessible', 500 / (500 + o.distances.publicTransport) * 0.2)
    .add('école à côté', 900 / (900 + o.distances.school) * 0.2)
    // Le temps libre et ce que les parents autorisent.
    .add('temps libre', Math.tanh((o.time.free - 6) / 14) * 0.3)
    .add('temps pris par les corvées', -Math.tanh(o.time.chores / 8) * 0.2)
    .add('âge autorisé pour sortir seul', -Math.tanh(Math.max(0, o.freedoms.goOutAlone - state.player.age) / 4) * 0.4)
    .add('heure de rentrée', (o.freedoms.curfew - 21) / 22)
    .add('contrôle des fréquentations', -(o.freedoms.friendControl - 50) / 280)
    .add('contrôle du téléphone', -(o.freedoms.phoneControl - 50) / 340)
    .add('argent à soi pour sortir', (o.freedoms.financialAutonomy - 50) / 240)
    // Ce que la famille fait ensemble prend du temps — et en donne.
    .add('sorties en famille', Math.tanh(o.familyLife.outingsPerYear / 14) * 0.18)
    .add('vacances', Math.tanh(o.familyLife.holidaysPerYear / 2) * 0.14)
    .add('sport en famille', Math.tanh(o.familyLife.sportTogetherPerYear / 12) * 0.12)
    // La place tenue dans la cour de récréation.
    .add('être connu', Math.tanh(o.popularity.known / 12) * 0.3)
    .add('savoir faire rire', Math.tanh(o.popularity.funny / 8) * 0.22)
    .add('être suivi', Math.tanh(o.popularity.influential / 8) * 0.16)
    .add('faire peur aux autres', -Math.tanh(o.popularity.intimidating / 8) * 0.2)
    .add('langues parlées à la maison', Object.keys(o.languages.fluency).length > 1
      ? (averageFluency(o) - 60) / 260 : 0)
    // Oser aborder quelqu'un compte partout, pas seulement en classe.
    .add('aisance à aborder les gens', (state.player.psyche.social.approachEase - 50) / 170)
    .soften(0.12, 3.2);

  const drift = new Composer(0, 'Base')
    .add('cohésion du quartier', (o.social.communityCohesion - 50) / 55)
    .add('isolement', -o.social.isolation / 42)
    .add('bruit et densité', -(o.neighborhood.noise - 50) / 70)
    .add('espaces verts', (o.neighborhood.greenSpace - 50) / 75)
    .add('parcs de la ville', (o.city.greenSpace - 50) / 130)
    .add('propreté du quartier', (o.neighborhood.cleanliness - 50) / 110)
    .add('temps pour soi', (o.values.leisure - 50) / 90)
    .addIf(o.living.outdoorSpace, 'un dehors à soi', 0.4)
    .add('logement', (o.housing.comfort - 50) / 45)
    .soften(-4, 4);

  return {
    friendChance: friend.value,
    // Se sentir menaçant ou drôle change la façon dont on traverse un couloir.
    streetPresence: clamp100(50 + o.popularity.intimidating * 2 - o.popularity.funny),
    peerBackground: Math.round(
      (o.school ? 100 - o.school.socialMix * 0.35 : 50) * 0.4 + o.neighborhood.reputation * 0.6,
    ),
    popularity: o.popularity.liked + o.popularity.respected * 0.5,
    streetExposure: 1
      + o.neighborhood.crimeExposure / 90
      + (60 - o.city.safety) / 260
      - o.social.communityCohesion / 260
      + (parentAverage(o, (r) => 50 - r.style.supervision)) / 130,
    happinessDrift: drift.value,
    datingChance: 1
      + (o.city.entertainment - 50) / 150
      + (o.city.nightlife - 50) / 220
      + (p.age > 17 && o.city.universities > 60 ? 0.12 : 0)
      - o.difficulties.geographicIsolation / 260,
    explain: friend.explain((n) => `×${(1 + n).toFixed(2)}`),
  };
}

/* ------------------------------------------------------------------ */
/* Contexte financier                                                  */
/* ------------------------------------------------------------------ */

export interface FinancialContext {
  /** Argent de poche annuel versé par la famille. */
  allowance: number;
  /** Multiplicateur du soutien financier parental à l'âge adulte. */
  familySupport: number;
  /** Multiplicateur du coût de la vie local. */
  costOfLiving: number;
  /** Multiplicateur des prix de l'immobilier local. */
  propertyCost: number;
  /** Capacité de la famille à héberger l'adulte débutant, 0-1. */
  canLiveAtHome: number;
  /** Patrimoine familial mobilisable (héritage potentiel). */
  familyWealth: number;
  /** Capital économique du foyer, 0-100. */
  economicCapital: number;
  /**
   * Revenu disponible du foyer rapporté au revenu médian du pays. Mesure
   * brute, non bornée : elle sépare encore les foyers là où tous les autres
   * indicateurs sont depuis longtemps au maximum.
   */
  disposableRatio: number;
  explain: string;
}

function compute_getFinancialContext(state: GameState): FinancialContext {
  const o = origin(state);
  const p = state.player;
  const income = nationalIncome(getCountry(p.countryId));
  const support = parentAverage(o, (r) => r.style.financialSupport);
  const ratio = householdRatio(state);

  // L'argent de poche est la première expérience économique : il dépend des
  // moyens réels du foyer *et* du rapport des parents à l'argent.
  const allowance = new Composer(0, 'Base')
    .addIf(p.age >= 8, 'âge', Math.max(0, (p.age - 7)) * income * 0.0016)
    .mul('moyens du foyer', Math.max(0.15, Math.min(2.6, 0.5 + ratio * 0.9)))
    .mul('générosité parentale', 0.5 + support / 100)
    .mul('rapport à l’argent', {
      'très économe': 0.6, prudent: 0.8, équilibré: 1, dépensier: 1.2, 'très dépensier': 1.35,
    }[o.finance.behaviour])
    // Une même enveloppe partagée entre quatre enfants n'en fait pas quatre fois plus.
    .mul('enfants à charge', 1 / Math.max(1, 0.55 + o.finance.dependents * 0.45))
    .mul('autonomie financière accordée', 0.6 + o.freedoms.financialAutonomy / 125)
    .add('corvées rémunérées', o.chores.paid ? o.chores.hoursPerWeek * income * 0.0006 : 0)
    .add('montant déjà fixé par la famille', o.allowance * 0.35)
    .mul('capital économique', 0.6 + o.capitals.economic / 125);

  return {
    allowance: Math.max(0, Math.round(allowance.value)),
    // Des parents également généreux soutiennent moins bien quatre enfants
    // que deux : c'est l'un des effets concrets d'une famille nombreuse.
    familySupport: Math.max(0, (0.4 + support / 90 + Math.min(1.4, Math.max(-0.35, ratio * 0.55)))
      * (2 / (1 + Math.max(1, o.finance.dependents)))),
    costOfLiving: o.city.costMult * (0.8 + o.city.rentMult * 0.05 + o.neighborhood.rentMult * 0.15)
      * (0.7 + o.economy.priceIndex * 0.3),
    propertyCost: o.neighborhood.propertyMult * (0.75 + o.economy.housingMarket / 200),
    // Rester chez ses parents suppose de la place et une relation tenable.
    canLiveAtHome: Math.max(0, Math.min(1,
      0.1 + o.housing.bedrooms / (o.housing.bedrooms + 4)
      + (55 - o.atmosphere.conflict) / 180
      + (o.parents.some((r) => r.inHousehold) ? 0.2 : -0.4),
    )),
    familyWealth: o.finance.assets + o.finance.savings - o.finance.debt,
    economicCapital: o.capitals.economic,
    disposableRatio: ratio,
    explain: allowance.explain((n) => n.toFixed(0)),
  };
}

/* ------------------------------------------------------------------ */
/* Contexte familial                                                   */
/* ------------------------------------------------------------------ */

export interface FamilyContext {
  /** Stress annuel imposé par le climat du foyer. */
  stressDrift: number;
  /** Dérive annuelle de la discipline. */
  disciplineDrift: number;
  /** Dérive annuelle du bonheur. */
  happinessDrift: number;
  /** Multiplicateur de la prise de risque (fugue, délinquance, excès). */
  riskTaking: number;
  /** Surveillance parentale effective, 0-100. */
  supervision: number;
  /** Chaleur perçue du foyer, 0-100. */
  warmth: number;
  /** Confiance accordée aux parents, 0-100. */
  trust: number;
  /** Admiration portée aux parents, 0-100. */
  admiration: number;
  /** Crainte inspirée par les parents, 0-100. */
  fearOfParents: number;
  explain: string;
}

function compute_getFamilyContext(state: GameState): FamilyContext {
  const o = origin(state);
  const affection = parentAverage(o, (r) => r.style.affection);
  const supervision = parentAverage(o, (r) => r.style.supervision * (0.5 + r.availability.involvement / 200));
  const emotional = parentAverage(o, (r) => r.availability.emotionalAvailability);
  const discipline = parentAverage(o, (r) => r.style.discipline);

  const stress = new Composer(0, 'Base')
    .add('conflits au foyer', o.atmosphere.conflict / 28)
    .add('tension financière', o.finance.financialStress / 34)
    .add('calme', -(o.atmosphere.calm - 50) / 30)
    .add('intimité', -(o.atmosphere.privacy - 50) / 45)
    .add('soutien émotionnel', -(emotional - 50) / 30)
    .add('dialogue à la maison', -(o.atmosphere.communication - 50) / 42)
    .add('tension ambiante', (o.atmosphere.stress - 40) / 26)
    .add('trajets des parents', o.transport.parentCommuteMinutes / 90)
    .add('horaires décalés', o.parents.filter((r) => r.schedule.shifted && r.inHousehold).length * 0.5)
    .add('repas pris ensemble', -(o.familyLife.mealsPerWeek - 4) / 9)
    .add('discussions sérieuses', -Math.tanh(o.familyLife.seriousTalksPerMonth / 3) * 0.7)
    .add('visites à la famille', -Math.tanh(o.familyLife.familyVisitsPerYear / 12) * 0.4)
    .add('sorties culturelles', -Math.tanh(o.familyLife.cultureOutingsPerYear / 8) * 0.3)
    .addIf(o.chores.siblingCare, 'charge des plus jeunes', 0.9)
    .add('téléphone donné tôt', o.digital.phoneAge === null ? 0
      : Math.max(0, 15 - o.digital.phoneAge) / 22)
    .add('instabilité du foyer', (70 - o.stability) / 26)
    .add('pression parentale', Math.max(0, o.pressure - 55) / 22)
    .add('sommeil', -(o.sleep.quality - 60) / 45)
    .soften(-4, 7);

  return {
    stressDrift: stress.value,
    disciplineDrift: (discipline - 50) / 26 + (o.atmosphere.organisation - 50) / 40,
    happinessDrift: (affection - 55) / 26 + (o.atmosphere.affection - 55) / 34
      + (emotional - 50) / 32 - o.atmosphere.conflict / 40
      + (parentAverage(o, (r) => r.bond.affection) - 55) / 40
      - (parentAverage(o, (r) => r.bond.frustration) - 30) / 55
      + Math.min(0.8, o.familyLife.outingsPerYear / 22)
      + Math.min(0.6, o.familyLife.holidaysPerYear * 0.35)
      + siblingWarmth(o) / 60,
    riskTaking: Math.max(0.4, 1 + (55 - supervision) / 80 + o.atmosphere.conflict / 130),
    supervision: supervision * (0.6 + presentEvenings(o) / 18),
    warmth: Math.round(
      affection * 0.35 + o.atmosphere.affection * 0.15 + emotional * 0.25
      + parentAverage(o, (r) => r.bond.affection) * 0.15
      + siblingWarmth(o) * 0.1,
    ),
    trust: parentAverage(o, (r) => r.bond.trust),
    admiration: parentAverage(o, (r) => r.bond.admiration),
    fearOfParents: parentAverage(o, (r) => r.bond.fear),
    explain: stress.explain((n) => n.toFixed(2)),
  };
}

/* ------------------------------------------------------------------ */
/* Opportunités locales                                                */
/* ------------------------------------------------------------------ */

export interface LocalOpportunities {
  /** Multiplicateur du nombre d'offres d'emploi rencontrées. */
  jobSupply: number;
  /** Multiplicateur de la probabilité d'être embauché. */
  hiring: number;
  /** Multiplicateur des salaires locaux. */
  salary: number;
  /** Secteurs surreprésentés dans la région et dans l'entourage. */
  sectors: string[];
  /** Contacts encore mobilisables dans le réseau familial. */
  contacts: number;
  /** Multiplicateur de la probabilité de promotion (réseau et visibilité). */
  promotion: number;
  /**
   * Accessibilité générale des équipements, 0-100. Mesure continue, à côté
   * de `reachable` qui répond seulement par oui ou non.
   */
  accessibility: number;
  /** Activités accessibles sans voiture, par identifiant d'équipement. */
  reachable: Record<string, boolean>;
  explain: string;
}

function compute_getLocalOpportunities(state: GameState): LocalOpportunities {
  const o = origin(state);
  const infra = o.infrastructure;
  const mobile = o.living.familyCar
    || state.player.vehicles.length > 0
    || Boolean(state.player.flags.license);
  const withinReach = (minutes: number | null, limit: number): boolean =>
    minutes !== null && (minutes <= limit || (mobile && minutes <= limit * 2.5));

  const hiring = new Composer(1, 'Base')
    .add('marché local', (o.city.jobOpportunity - 55) / 130)
    .add('emplois du quartier', (o.neighborhood.economicOpportunity - 50) / 200)
    .add('chômage local', -(o.economy.unemployment - 8) / 55)
    .add('conjoncture régionale', (o.economy.growth) / 22)
    .add('accessibilité', (o.transport.cityCenterAccess - 50) / 260)
    .add('créations d’entreprises', (o.economy.businessCreation - 50) / 320)
    .add('fermetures d’entreprises', -(o.economy.businessClosure - 50) / 320)
    .add('réseau de la famille', (o.capitals.social - 45) / 190)
    .add('anciens élèves', ((o.school?.alumniNetwork ?? 30) - 40) / 320)
    .soften(0.15, 2.8);

  return {
    jobSupply: Math.max(0.3, 0.4 + o.city.employers / 90 + o.neighborhood.localEmployment / 200
      + Math.min(0.35, Math.log10(Math.max(10, o.city.population)) / 22)),
    hiring: hiring.value,
    salary: o.city.salaryMult,
    sectors: o.region.dominantSectors.concat(
      // Les métiers des parents et des amis de la famille ouvrent des portes
      // que les statistiques régionales ignorent.
      o.parents.map((r) => r.field).filter((f): f is string => Boolean(f)),
      o.contacts.filter((c) => c.closeness > 45).map((c) => c.field),
    ),
    contacts: o.contacts.filter((c) => !c.used && c.closeness > 40).length,
    promotion: Math.max(0.5, 0.85 + (o.city.jobOpportunity - 50) / 220 + (o.neighborhood.reputation - 50) / 320),
    accessibility: (() => {
      const values = Object.values(infra);
      // Un équipement absent compte pour zéro ; les autres valent d'autant
      // plus qu'ils sont proches.
      const total = values.reduce(
        (sum, minutes) => sum + (minutes === null ? 0 : 100 / (1 + minutes / 11)),
        0,
      );
      return total / values.length;
    })(),
    reachable: {
      park: withinReach(infra.park, 20),
      stadium: withinReach(infra.stadium, 25),
      gym: withinReach(infra.gym, 20),
      library: withinReach(infra.library, 25),
      cinema: withinReach(infra.cinema, 30),
      mall: withinReach(infra.mall, 30),
      shops: withinReach(infra.shops, 20),
      publicTransport: withinReach(infra.publicTransport, 15),
      sportsClub: withinReach(infra.sportsClub, 25),
      musicSchool: withinReach(infra.musicSchool, 30),
      pool: withinReach(infra.pool, 30),
      nature: withinReach(infra.nature, 30),
    },
    explain: hiring.explain((n) => `×${(1 + n).toFixed(2)}`),
  };
}

/* ------------------------------------------------------------------ */
/* Contexte de santé                                                   */
/* ------------------------------------------------------------------ */

export interface HealthContext {
  /** Multiplicateur de la probabilité de tomber malade. */
  illness: number;
  /** Multiplicateur de la probabilité de guérir. */
  recovery: number;
  /** Dérive annuelle de la forme physique. */
  fitnessDrift: number;
  /** Multiplicateur du coût des soins restant à charge. */
  careCost: number;
  explain: string;
}

function compute_getHealthContext(state: GameState): HealthContext {
  const o = origin(state);
  const income = nationalIncome(getCountry(state.player.countryId));

  const illness = new Composer(1, 'Base')
    .add('pollution', (o.neighborhood.pollution - 40) / 190)
    .add('air de la ville', (o.city.pollution - 45) / 320)
    .addIf(!o.living.heating, 'pas de chauffage fiable', 0.22)
    .add('rigueur du climat', Math.abs(o.region.climate - 55) / 420)
    .addIf(!o.living.airConditioning, 'pas de climatisation', (o.region.climate + 25) / 620)
    .add('état du logement', -(o.housing.condition - 50) / 260)
    .add('promiscuité', (o.housing.occupants / Math.max(1, o.housing.bedrooms)) * 0.05)
    .add('espace par personne', -Math.tanh(o.housing.areaM2 / Math.max(1, o.housing.occupants) / 90) * 0.22)
    .add('sanitaires partagés', 0.09 / Math.max(1, o.housing.bathrooms))
    .add('privations', Math.max(0, (o.finance.financialStress - 55)) / 190)
    .add('accès aux soins', -(o.neighborhood.healthAccess - 50) / 300)
    .add('sommeil', -(o.sleep.quality - 62) / 190 - (o.sleep.hours - 7.5) / 22)
    .add('surcharge', Math.max(0, -o.time.free) / 40)
    .add('bruit de la rue', (o.street.noise - 50) / 340)
    .soften(0.5, 2.4);

  const fitness = new Composer(0, 'Base')
    .add('équipements sportifs', (o.neighborhood.sportsFacilities - 50) / 45)
    .addIf(o.living.garden, 'jardin', 0.5)
    .add('valeur donnée au sport', (o.values.sport - 50) / 42)
    .add('installations de l’établissement', ((o.school?.sports ?? 45) - 50) / 90)
    .add('sport en famille', Math.min(0.7, o.familyLife.sportTogetherPerYear / 18))
    .add('écrans', -(o.digital.computer === 'personnel' ? 0.5 : 0)
      - (o.digital.phone === 'personnel' ? 0.4 : 0)
      + (o.digital.screenLimit > 0 ? 0.4 : 0))
    .add('équipements sportifs de la ville', (o.city.sports - 50) / 120)
    .add('locaux de l’établissement', ((o.school?.facilities ?? 45) - 50) / 130)
    .add('espaces verts', (o.neighborhood.greenSpace - 50) / 70)
    .addIf(o.transport.schoolMode === 'à pied' || o.transport.schoolMode === 'vélo', 'trajet actif', 0.6)
    .soften(-3, 3);

  return {
    illness: illness.value,
    recovery: Math.max(0.5, 1
      + (o.neighborhood.healthAccess - 50) / 180
      + (o.city.healthcare - 50) / 320
      + Math.min(0.3, householdRatio(state) * 0.2)),
    fitnessDrift: fitness.value,
    careCost: Math.max(0.4, o.city.costMult * (1 - Math.min(0.35, o.finance.assets / Math.max(1, income * 40)))),
    explain: illness.explain((n) => `×${(1 + n).toFixed(2)}`),
  };
}

/* ------------------------------------------------------------------ */
/* Personnalité acquise                                                */
/* ------------------------------------------------------------------ */

/**
 * Vers quoi l'environnement pousse le caractère du personnage.
 *
 * Ce sont des *cibles*, pas des valeurs : `systems/aging.ts` en rapproche
 * lentement les traits réels, d'autant plus lentement que le personnage
 * vieillit. C'est aussi ici que les valeurs familiales trouvent leur effet —
 * ce que la famille juge important finit par déteindre.
 */
function compute_getTraitTargets(state: GameState): AcquiredTraits {
  const o = origin(state);
  const p = state.player;
  const v = o.values;
  const opp = o.opportunities;
  const family = getFamilyContext(state);
  const clamp = (n: number) => Math.max(0, Math.min(100, n));

  return {
    ambition: clamp(v.achievement * 0.4 + v.work * 0.2 + opp.career * 0.25 + p.stats.reputation * 0.15),
    discipline: clamp(v.manners * 0.3 + family.supervision * 0.4 + p.stats.discipline * 0.3),
    confidence: clamp(family.warmth * 0.35 + p.stats.reputation * 0.3 + p.stats.looks * 0.15
      + (100 - o.difficulties.social) * 0.2),
    empathy: clamp(family.warmth * 0.35 + v.family * 0.15 + p.stats.karma * 0.35
      + o.social.communityCohesion * 0.15),
    independence: clamp(v.autonomy * 0.4 + (100 - family.supervision) * 0.35
      + o.difficulties.familyInstability * 0.25),
    materialism: clamp(v.money * 0.4 + o.difficulties.financial * 0.25 + (100 - opp.financial) * 0.2
      + (100 - o.social.communityCohesion) * 0.15),
    studiousness: clamp(v.school * 0.4 + opp.education * 0.35 + p.stats.intelligence * 0.25),
    athleticism: clamp(v.sport * 0.35 + opp.sport * 0.35 + p.stats.fitness * 0.3),
    creativity: clamp(v.creativity * 0.35 + v.leisure * 0.1 + opp.cultural * 0.35 + p.stats.intelligence * 0.2),
    sociability: clamp(p.psyche.temperament.sociability * 0.4 + opp.social * 0.35 + (100 - o.social.isolation) * 0.25),
  };
}

/* ------------------------------------------------------------------ */
/* Aides                                                               */
/* ------------------------------------------------------------------ */

/**
 * Effet de la pression parentale sur les notes.
 *
 * En cloche : un peu d'exigence tire vers le haut, beaucoup écrase. C'est
 * exactement le double tranchant demandé — un paramètre qui n'est ni bon ni
 * mauvais, seulement dosé.
 */
function pressureCurve(pressure: number): number {
  const x = (pressure - 55) / 30;
  return 0.55 * x - 0.5 * x * x * Math.sign(x === 0 ? 1 : 1);
}

/** Chaleur apportée par la fratrie. */
function siblingWarmth(o: WorldOrigin): number {
  if (o.siblings.length === 0) return 0;
  return o.siblings.reduce(
    (sum, b) => sum + b.affection * 0.7 + b.protection * 0.3 - b.rivalry * 0.25,
    0,
  ) / o.siblings.length;
}

/** Soirées où au moins un parent est réellement présent. */
function presentEvenings(o: WorldOrigin): number {
  const present = o.parents.filter((r) => r.inHousehold);
  if (present.length === 0) return 0;
  return Math.max(...present.map((r) => r.schedule.eveningsHome));
}

/* ------------------------------------------------------------------ */
/* Contexte de personnalité                                            */
/* ------------------------------------------------------------------ */

/**
 * Ce que le caractère change dans la simulation.
 *
 * L'environnement décide de ce qui est *possible* ; la personnalité décide de
 * ce que la personne en *fait*. Deux enfants dans la même classe, avec le
 * même club de sciences à portée, n'y vont pas tous les deux — et de ceux qui
 * y vont, tous ne persévèrent pas.
 *
 * Chaque champ ici a un double tranchant assumé : la prudence protège et fait
 * rater, l'ambition fait avancer et empêche d'être content.
 */
/**
 * Ce que la vie actuelle apporte, valeur par valeur.
 *
 * C'est le cœur du système de valeurs demandé : les mêmes circonstances ne
 * rendent pas deux personnes également heureuses. Quelqu'un qui tient à la
 * famille souffre d'un déménagement lointain ; quelqu'un qui tient à
 * l'aventure y trouve son compte. On mesure donc, pour chaque valeur, à quel
 * point la vie menée la sert — puis on pondère par l'importance qu'elle a
 * réellement pour cette personne.
 */
export function valueFulfilment(state: GameState): Record<keyof Values, number> {
  const p = state.player;
  const o = p.origin;
  const income = nationalIncome(getCountry(p.countryId));
  const npcs = Object.values(state.npcs).filter((x) => x.alive && !x.estranged);
  const close = (kinds: string[]) => npcs.filter((x) => kinds.includes(x.relation));

  const family = close(['mother', 'father', 'brother', 'sister', 'son', 'daughter',
    'grandmother', 'grandfather']);
  const friends = close(['friend', 'bestFriend']);
  const partner = close(['spouse', 'partner']);
  const avg = (list: typeof npcs) => (list.length > 0
    ? list.reduce((sum, x) => sum + x.relationship, 0) / list.length : 0);

  const wealth = p.money + p.properties.reduce((s, x) => s + x.value - x.mortgageBalance, 0);
  const jobLevel = p.job?.level ?? 0;

  return {
    // Être entouré des siens, et bien avec eux.
    family: clamp100(avg(family) * 0.7 + Math.min(30, family.length * 7)),
    money: clamp100((wealth / Math.max(1, income * 6)) * 100),
    career: clamp100(jobLevel * 22 + (p.job ? 24 : 0) + p.education.level * 6),
    // La liberté : peu d'obligations, peu de dettes, peu de contraintes.
    freedom: clamp100(80 - p.loans.length * 18 - close(['son', 'daughter']).length * 9
      - (p.job ? Number(p.flags.workHours ?? 38) - 30 : 0)),
    stability: clamp100(o.stability * 0.6 + (p.properties.some((x) => x.isResidence) ? 25 : 0)
      + (p.job ? 15 : 0)),
    love: clamp100(partner.length > 0 ? 40 + avg(partner) * 0.6 : 12),
    friendship: clamp100(avg(friends) * 0.6 + Math.min(40, friends.length * 12)),
    achievement: clamp100(jobLevel * 18 + p.education.degrees.filter((d) => d.honors).length * 14
      + p.stats.reputation * 0.3),
    creativity: clamp100(Math.max(
      ...p.psyche.interests.filter((i) => ['musique', 'dessin', 'écriture', 'théâtre'].includes(i.id))
        .map((i) => i.level), 8,
    )),
    knowledge: clamp100(p.education.level * 18 + p.stats.intelligence * 0.4),
    // Être reconnu, ce n'est pas seulement être bien vu de ses proches :
    // c'est aussi être connu — et ce que le public a à vous reprocher
    // retranche de ce que la notoriété apporte.
    reputation: clamp100(p.stats.reputation * 0.6 + p.fame.level * 0.35
      - p.fame.controversy * 0.2),
    power: clamp100(jobLevel * 20 + p.stats.reputation * 0.2 + Math.min(25, wealth / Math.max(1, income * 4) * 25)),
    tranquillity: clamp100(100 - p.stats.stress * 0.9 - o.finance.financialStress * 0.2),
    adventure: clamp100(Number(p.flags.tripsTaken ?? 0) * 9 + (p.countryId !== p.originCountryId ? 26 : 0)
      + o.history.length * 5),
    solidarity: clamp100(p.stats.karma * 0.8 + o.social.communityCohesion * 0.2),
    status: clamp100(o.neighborhood.reputation * 0.4 + jobLevel * 14 + p.stats.reputation * 0.25),
    independence: clamp100((p.age >= 18 && !livesAtHome(state) ? 45 : 5)
      + (p.money > income ? 25 : 0) + (p.loans.length === 0 ? 20 : 0)),
  };
}

/** Le personnage vit-il encore chez ses parents ? */
function livesAtHome(state: GameState): boolean {
  const p = state.player;
  return p.age < 18 || (p.age < 27 && !p.properties.some((x) => x.isResidence)
    && p.origin.parents.some((r) => r.inHousehold));
}

export interface PsycheContext {
  /** Multiplicateur de l'effet de l'effort scolaire. */
  studyEffect: number;
  /** Multiplicateur de la probabilité d'être embauché. */
  hiring: number;
  /** Multiplicateur de la probabilité de promotion. */
  promotion: number;
  /** Multiplicateur de la probabilité de demander une augmentation. */
  negotiation: number;
  /** Multiplicateur de la probabilité de nouer une relation. */
  bonding: number;
  /** Multiplicateur de la probabilité amoureuse. */
  romance: number;
  /** Multiplicateur de la propension à prendre un risque. */
  risk: number;
  /** Multiplicateur du train de vie : ce qu'on dépense sans y penser. */
  spending: number;
  /** Multiplicateur de la capacité à épargner. */
  saving: number;
  /** Récupération annuelle du stress. */
  stressRecovery: number;
  /** Dérive annuelle du bonheur due au caractère seul. */
  moodDrift: number;
  /** Multiplicateur de la probabilité de conflit avec les autres. */
  conflict: number;
  /** Multiplicateur du risque de dépendance. */
  addiction: number;
  /** Dérive annuelle du karma, due au caractère moral. */
  karmaDrift: number;
  /** Dérive annuelle de la réputation. */
  reputationDrift: number;
  /** Multiplicateur du gain relationnel de chaque interaction. */
  socialGain: number;
  /** Multiplicateur de la vitesse de rebond après un échec. */
  recovery: number;
  /** Plancher supplémentaire sous lequel les liens ne descendent pas. */
  loyaltyFloor: number;
  /** Multiplicateur du stress causé par un changement (école, déménagement). */
  changeCost: number;
  /** Qualité des décisions engageantes (achats, placements, orientations). */
  judgement: number;
  /** Dérive annuelle de l'apparence perçue, due au soin qu'on y porte. */
  looksDrift: number;
  /** Satisfaction tirée de la vie menée, au regard de ses propres valeurs. */
  valueSatisfaction: number;
  /**
   * Perméabilité au groupe : à quel point les goûts et les comportements des
   * autres déteignent. Élevée, elle fait entrer dans le moule ; basse, elle
   * isole autant qu'elle protège.
   */
  conformity: number;
  /** Coût émotionnel d'un échec ou d'une critique. */
  criticismCost: number;
  /** Explication de la contribution du caractère à l'humeur. */
  explain: string;
}

function compute_getPsycheContext(state: GameState): PsycheContext {
  const p = state.player;
  const psyche = p.psyche;
  const a = psyche.axes;
  const fear = (id: string) => psyche.fears.find((f) => f.id === id)?.intensity ?? 0;

  // L'ambition tire vers le haut, puis se retourne : au-delà d'un certain
  // point, plus rien ne suffit et la satisfaction devient impossible.
  const ambitionDrive = (a.ambition - 50) / 100;
  const ambitionCost = Math.max(0, a.ambition - 72) / 90;

  // Ce que la vie apporte, pesé par ce à quoi la personne tient réellement.
  const fulfilment = valueFulfilment(state);
  let weighted = 0;
  let weightSum = 0;
  let bestGap = { label: '', gap: 0 };
  for (const key of VALUE_KEYS) {
    const importance = psyche.values[key];
    weighted += fulfilment[key] * importance;
    weightSum += importance;
    const gap = (importance / 100) * (50 - fulfilment[key]);
    if (gap > bestGap.gap) bestGap = { label: VALUE_LABELS[key], gap };
  }
  const satisfaction = weightSum > 0 ? weighted / weightSum : 50;

  const mood = new Composer(0, 'Base')
    .add('optimisme', (a.optimism - 50) / 22)
    .add('vie conforme à ses valeurs', (satisfaction - 48) / 16)
    .add(bestGap.label ? `ce qui manque : ${bestGap.label.toLowerCase()}` : 'manques', -bestGap.gap / 42)
    .add('estime de soi', (psyche.self.selfEsteem - 50) / 26)
    .add('sentiment de maîtrise', (psyche.self.senseOfControl - 50) / 34)
    .add('ambition inassouvie', -ambitionCost * 2.2)
    .add('jalousie', -(a.jealousy - 40) / 42)
    .add('rancune', -(psyche.emotion.grudge - 50) / 55)
    .add('peurs', -psyche.fears.reduce((sum, f) => sum + f.intensity, 0) / 220)
    .add('façade à tenir', -Math.abs(psyche.facade) / 90)
    .soften(-4, 4);

  return {
    // Un élève discipliné et persévérant tire beaucoup plus de la même heure
    // de travail — mais la curiosité compte autant que la rigueur.
    studyEffect: 0.6 + a.discipline / 190 + a.perseverance / 230 + a.curiosity / 300,
    hiring: 1
      + (psyche.social.charm - 50) / 260
      + (a.confidence - 50) / 240
      + (a.organisation - 50) / 320
      - fear('failure') / 420
      - fear('rejection') / 460,
    promotion: 1
      + ambitionDrive * 0.3
      + (a.competitiveness - 50) / 260
      + (a.perseverance - 50) / 280
      - (a.aggression > 72 ? (a.aggression - 72) / 180 : 0),
    negotiation: 1
      + (psyche.communication.assertiveness - 50) / 150
      + (psyche.communication.composure - 50) / 240
      + (psyche.social.assertiveness - 50) / 260
      // Négocier, c'est trouver l'angle que l'autre n'attendait pas.
      + (a.creativity - 50) / 280
      - (psyche.social.conflictAvoidance - 50) / 220
      - fear('conflict') / 300,
    bonding: 1
      + (psyche.social.bondCreation - 50) / 170
      + (psyche.social.bondMaintenance - 50) / 260
      - (psyche.social.fearOfJudgement - 50) / 300
      - fear('rejection') / 320,
    romance: 1
      + (psyche.social.charm - 50) / 150
      + (a.confidence - 50) / 260
      - fear('commitment') / 300
      - fear('abandonment') / 500,
    // Prudence et tolérance au risque tirent en sens contraire, et la peur de
    // manquer verrouille tout.
    risk: Math.max(0.25, 1
      + (a.riskTolerance - 50) / 110
      + (a.impulsivity - 50) / 200
      - (a.caution - 50) / 130
      - fear('poverty') / 210),
    spending: Math.max(0.4, 1
      + (a.impulsivity - 50) / 170
      + (psyche.values.status - 50) / 250
      - (a.discipline - 50) / 200),
    saving: Math.max(0.2, 1
      + (a.discipline - 50) / 130
      + (psyche.values.stability - 50) / 220
      + fear('poverty') / 260
      - (a.impulsivity - 50) / 170),
    stressRecovery: 1
      + (psyche.emotion.stressManagement - 50) / 120
      + (psyche.emotion.resilience - 50) / 170
      - (psyche.emotion.touchiness - 50) / 260,
    moodDrift: mood.value,
    conflict: Math.max(0.3, 1
      + (a.aggression - 50) / 110
      + (a.jealousy - 50) / 230
      - (a.patience - 50) / 170
      - (psyche.emotion.angerControl - 50) / 150),
    addiction: Math.max(0.3, 1
      + (a.impulsivity - 50) / 150
      + (100 - psyche.emotion.stressManagement) / 260
      - (a.discipline - 50) / 190),
    karmaDrift: (a.honesty - 50) / 26 + (a.generosity - 50) / 30 + (a.empathy - 50) / 30
      - (a.aggression - 50) / 34,
    reputationDrift: (psyche.identity.reputationImportance - 50) / 34
      + (psyche.identity.imageImportance - 50) / 46
      + (psyche.communication.tact - 50) / 40
      + (psyche.communication.warmth - 50) / 46
      - (psyche.communication.sarcasm - 50) / 52
      - (psyche.social.confrontation - 50) / 60,
    socialGain: Math.max(0.35, 1
      + (psyche.communication.warmth - 50) / 130
      + (psyche.social.humour - 50) / 200
      + (psyche.social.oneToOneEase - 50) / 180
      + (psyche.social.groupEase - 50) / 260
      + (psyche.communication.expressiveness - 50) / 300
      - (psyche.social.solitudeNeed - 50) / 320
      - (psyche.communication.directness - 50) / 420),
    recovery: Math.max(0.3, 1
      + (psyche.emotion.stability - 50) / 130
      + (psyche.emotion.pressureResistance - 50) / 170
      + (psyche.emotion.forgiveness - 50) / 230
      + (a.emotionalMaturity - 50) / 190
      + (a.optimism - 50) / 240),
    // Un loyal ne lâche pas les siens, même quand il ne les voit plus.
    loyaltyFloor: Math.max(0, (a.loyalty - 50) / 4 + (psyche.social.bondMaintenance - 50) / 6),
    changeCost: Math.max(0.25, 1
      - (a.adaptability - 50) / 110
      - (a.courage - 50) / 220
      - (a.spontaneity - 50) / 300
      // Un esprit inventif se refait une vie ailleurs plus vite qu'un autre.
      - (a.creativity - 50) / 260
      + fear('change') / 190),
    // Le jugement : réfléchir, écouter, mais aussi savoir trancher seul.
    judgement: Math.max(0.4, 1
      + (psyche.decision.rationality - 50) / 130
      + (psyche.decision.intuition - 50) / 320
      + (psyche.decision.selfTrust - 50) / 300
      + (psyche.decision.caution - 50) / 380
      - (psyche.decision.impulsivity - 50) / 160
      - Math.abs(psyche.decision.dependence - 45) / 260
      - (psyche.decision.riskTaking - 50) / 420),
    looksDrift: (psyche.self.bodyImage - 50) / 40
      + (psyche.identity.imageImportance - 50) / 70
      + (a.independence - 50) / 260,
    valueSatisfaction: satisfaction,
    conformity: Math.max(0, 1
      + (psyche.social.approvalNeed - 50) / 90
      + (psyche.identity.belongingNeed - 50) / 120
      - (psyche.identity.distinction - 50) / 110
      - (a.independence - 50) / 220),
    criticismCost: Math.max(0.2, 1
      + (psyche.identity.criticismSensitivity - 50) / 110
      + (psyche.emotion.touchiness - 50) / 220
      - (psyche.emotion.resilience - 50) / 190),
    explain: mood.explain((n) => n.toFixed(2)),
  };
}

/**
 * Émulation scolaire : en cloche, comme la pression parentale.
 *
 * Un peu de compétition tire une classe vers le haut ; beaucoup y installe
 * l'angoisse et décourage ceux qui ne suivent pas.
 */
function competitionCurve(competition: number): number {
  const x = (competition - 52) / 32;
  return 0.5 * x - 0.45 * x * x;
}

/** Maîtrise de la langue principale, 0-100. */
function mainFluency(o: WorldOrigin): number {
  return o.languages.fluency[o.languages.main] ?? 85;
}

/** Maîtrise moyenne de toutes les langues parlées. */
function averageFluency(o: WorldOrigin): number {
  const values = Object.values(o.languages.fluency);
  return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 60;
}

function clamp100(v: number): number {
  return Math.max(0, Math.min(100, v));
}

/* ------------------------------------------------------------------ */
/* Façades mémorisées                                                  */
/* ------------------------------------------------------------------ */

export const getEducationContext = (s: GameState): EducationContext =>
  cached(s, 'education', () => compute_getEducationContext(s));
export const getSocialContext = (s: GameState): SocialContext =>
  cached(s, 'social', () => compute_getSocialContext(s));
export const getFinancialContext = (s: GameState): FinancialContext =>
  cached(s, 'financial', () => compute_getFinancialContext(s));
export const getFamilyContext = (s: GameState): FamilyContext =>
  cached(s, 'family', () => compute_getFamilyContext(s));
export const getLocalOpportunities = (s: GameState): LocalOpportunities =>
  cached(s, 'local', () => compute_getLocalOpportunities(s));
export const getHealthContext = (s: GameState): HealthContext =>
  cached(s, 'health', () => compute_getHealthContext(s));
export const getPsycheContext = (s: GameState): PsycheContext =>
  cached(s, 'psyche', () => compute_getPsycheContext(s));
export const getTraitTargets = (s: GameState): AcquiredTraits =>
  cached(s, 'traits', () => compute_getTraitTargets(s));
