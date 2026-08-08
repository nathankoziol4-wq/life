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
export function getEducationContext(state: GameState): EducationContext {
  const o = origin(state);
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
    universityAccess: university.value,
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
      - (school ? (school.discipline - 50) / 200 : 0),
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
  /** Multiplicateur des événements de délinquance et d'exposition à la rue. */
  streetExposure: number;
  /** Dérive annuelle du bonheur due à l'isolement ou à la vie de quartier. */
  happinessDrift: number;
  /** Multiplicateur de la probabilité de rencontre amoureuse. */
  datingChance: number;
  explain: string;
}

export function getSocialContext(state: GameState): SocialContext {
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
    peerBackground: Math.round(
      (o.school ? 100 - o.school.socialMix * 0.35 : 50) * 0.4 + o.neighborhood.reputation * 0.6,
    ),
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
  /**
   * Revenu disponible du foyer rapporté au revenu médian du pays. Mesure
   * brute, non bornée : elle sépare encore les foyers là où tous les autres
   * indicateurs sont depuis longtemps au maximum.
   */
  disposableRatio: number;
  explain: string;
}

export function getFinancialContext(state: GameState): FinancialContext {
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
    .mul('enfants à charge', 1 / Math.max(1, 0.55 + o.finance.dependents * 0.45));

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
  explain: string;
}

export function getFamilyContext(state: GameState): FamilyContext {
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
    .soften(-4, 7);

  return {
    stressDrift: stress.value,
    disciplineDrift: (discipline - 50) / 26 + (o.atmosphere.organisation - 50) / 40,
    happinessDrift: (affection - 55) / 26 + (o.atmosphere.affection - 55) / 34
      + (emotional - 50) / 32 - o.atmosphere.conflict / 40,
    riskTaking: Math.max(0.4, 1 + (55 - supervision) / 80 + o.atmosphere.conflict / 130),
    supervision,
    warmth: Math.round(affection * 0.45 + o.atmosphere.affection * 0.2 + emotional * 0.35),
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
  /** Secteurs surreprésentés dans la région. */
  sectors: string[];
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

export function getLocalOpportunities(state: GameState): LocalOpportunities {
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
    .soften(0.15, 2.8);

  return {
    jobSupply: Math.max(0.3, 0.4 + o.city.employers / 90 + o.neighborhood.localEmployment / 200
      + Math.min(0.35, Math.log10(Math.max(10, o.city.population)) / 22)),
    hiring: hiring.value,
    salary: o.city.salaryMult,
    sectors: o.region.dominantSectors,
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

export function getHealthContext(state: GameState): HealthContext {
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
    .add('espace par personne', -Math.min(0.2, o.housing.areaM2 / Math.max(1, o.housing.occupants) / 320))
    .add('sanitaires partagés', 0.09 / Math.max(1, o.housing.bathrooms))
    .add('privations', Math.max(0, (o.finance.financialStress - 55)) / 190)
    .add('accès aux soins', -(o.neighborhood.healthAccess - 50) / 300)
    .soften(0.5, 2.4);

  const fitness = new Composer(0, 'Base')
    .add('équipements sportifs', (o.neighborhood.sportsFacilities - 50) / 45)
    .addIf(o.living.garden, 'jardin', 0.5)
    .add('valeur donnée au sport', (o.values.sport - 50) / 42)
    .add('installations de l’établissement', ((o.school?.sports ?? 45) - 50) / 90)
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
export function getTraitTargets(state: GameState): AcquiredTraits {
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
    sociability: clamp(p.temperament.sociability * 0.4 + opp.social * 0.35 + (100 - o.social.isolation) * 0.25),
  };
}
