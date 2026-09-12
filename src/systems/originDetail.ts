/**
 * Construction du quotidien.
 *
 * `originGen.ts` pose le décor large — pays, ville, quartier, logement.
 * Ce module descend d'un cran : la rue, les distances réelles, les horaires
 * du foyer, les repas pris ensemble, l'ordinateur familial, l'heure de
 * rentrée, les corvées, le sommeil.
 *
 * Ce sont ces détails qui font qu'une enfance ressemble à une enfance plutôt
 * qu'à une fiche de statistiques — et chacun a une conséquence dans le
 * moteur, sans quoi l'audit le signale.
 */

import type { Rng } from '../engine/rng.ts';
import { clamp, clampStat } from '../engine/rng.ts';
import type {
  Capitals, Chores, Distances, DigitalAccess, FamilyLife, Freedoms,
  Languages, NeighborhoodProfile, ParentSchedule, Popularity, Sleep,
  StreetProfile, TimeBudget, WorldOrigin,
} from '../engine/origin.ts';
import type { Country } from '../data/countries.ts';

/* ------------------------------------------------------------------ */
/* La rue                                                              */
/* ------------------------------------------------------------------ */

const STREET_PREFIXES = ['Rue', 'Impasse', 'Allée', 'Avenue', 'Chemin', 'Place', 'Sentier', 'Cour'];
const STREET_ROOTS = [
  'des Lilas', 'du Moulin', 'des Acacias', 'Basse', 'du Puits', 'des Écoles',
  'du Lavoir', 'des Rosiers', 'Neuve', 'du Stade', 'des Ormes', 'du Verger',
  'de la Fontaine', 'des Bleuets', 'du Pont', 'des Vignes', 'du Marché',
  'de la Gare', 'des Tilleuls', 'du Colombier', 'des Alouettes',
];

/**
 * La rue découle du quartier mais s'en écarte : une impasse tranquille existe
 * dans un quartier bruyant, et l'inverse est vrai aussi. C'est cet écart qui
 * fait que deux enfants du même quartier n'ont pas la même enfance.
 */
export function buildStreet(rng: Rng, n: NeighborhoodProfile): StreetProfile {
  const collective = n.density > 60;
  const jitter = (spread: number) => rng.float(-spread, spread);

  const proximity = clampStat(n.density * 0.75 + jitter(18));
  const households = collective
    ? Math.round(rng.int(12, 60) * (0.6 + n.density / 120))
    : Math.round(rng.int(4, 20) * (0.6 + n.density / 160));

  // Le nombre d'enfants du même âge dans la rue est l'un des paramètres les
  // plus décisifs de l'enfance, et l'un des plus invisibles.
  const childrenNearby = Math.max(0, Math.round(
    households * rng.float(0.08, 0.35) * (0.6 + n.childActivities / 140),
  ));

  return {
    name: `${rng.pick(STREET_PREFIXES)} ${rng.pick(STREET_ROOTS)}`,
    households,
    proximity,
    childrenNearby,
    // Dans un quartier soudé, on se connaît d'autant plus qu'on est proches.
    neighbourRelations: clampStat(
      n.communityCohesion * 0.55 + n.residentialStability * 0.25 + proximity * 0.1 + jitter(14),
    ),
    noise: clampStat(n.noise * 0.7 + proximity * 0.2 + jitter(16)),
    traffic: clampStat(n.density * 0.5 + (100 - n.greenSpace) * 0.2 + jitter(20)),
    outdoorSpace: clampStat(n.greenSpace * 0.5 + (100 - proximity) * 0.35 + jitter(14)),
    shopsWithinWalk: Math.max(0, Math.round(n.shops / 12 + jitter(2))),
    description: collective
      ? 'Des immeubles, une cour, et tout le monde qui s’entend vivre.'
      : 'Des maisons alignées, des haies, et des enfants qui traînent devant.',
  };
}

/* ------------------------------------------------------------------ */
/* Distances                                                           */
/* ------------------------------------------------------------------ */

/** Convertit des minutes de marche en mètres, avec du bruit. */
function metres(rng: Rng, minutes: number | null, fallback: number): number {
  if (minutes === null) return Math.round(fallback * rng.float(0.85, 1.4));
  // 80 m par minute de marche.
  return Math.max(40, Math.round(minutes * 80 * rng.float(0.85, 1.15)));
}

export function buildDistances(rng: Rng, origin: WorldOrigin): Distances {
  const i = origin.infrastructure;
  const rural = origin.neighborhood.zone === 'zone rurale';
  const far = rural ? 14000 : 6000;
  return {
    school: Math.max(80, Math.round(origin.transport.schoolMinutes * (origin.transport.schoolMode === 'à pied' ? 80 : 400))),
    park: metres(rng, i.park, far / 2),
    library: metres(rng, i.library, far),
    sportsClub: metres(rng, i.sportsClub, far),
    pool: metres(rng, i.pool, far * 1.3),
    shops: metres(rng, i.shops, far / 3),
    cityCentre: Math.round((rural ? 12000 : 3500) * rng.float(0.6, 1.8)),
    publicTransport: metres(rng, i.publicTransport, far / 2),
    cinema: metres(rng, i.cinema, far * 1.2),
    nature: metres(rng, i.nature, 800),
    grandparents: Math.round((rural ? 9000 : 12000) * rng.float(0.05, 4)),
    bestFriend: Math.round(600 * rng.float(0.2, 4)),
  };
}

/**
 * Temps de trajet réel, en minutes, pour une distance donnée.
 *
 * En dessous de 1,2 km on marche ; au-delà, il faut un moyen de transport, et
 * s'il n'y en a pas, le lieu devient inaccessible en pratique.
 */
export function travelTime(opts: {
  metres: number;
  hasCar: boolean;
  transitQuality: number;
  age: number;
  trafficPenalty: number;
}): { minutes: number; mode: string; reachable: boolean } {
  const km = opts.metres / 1000;
  if (km <= 1.2) return { minutes: Math.round(km * 13), mode: 'à pied', reachable: true };
  if (km <= 4 && opts.age >= 10) return { minutes: Math.round(km * 5), mode: 'vélo', reachable: true };
  if (opts.transitQuality > 45) {
    return {
      minutes: Math.round(km * 3.2 + 8 + opts.trafficPenalty / 12),
      mode: 'transports',
      reachable: true,
    };
  }
  if (opts.hasCar) {
    return { minutes: Math.round(km * 1.6 + 4 + opts.trafficPenalty / 20), mode: 'voiture', reachable: true };
  }
  // Ni transports ni voiture : au-delà de quatre kilomètres, on n'y va pas.
  return { minutes: Math.round(km * 13), mode: 'à pied', reachable: km <= 4 };
}

/* ------------------------------------------------------------------ */
/* Horaires des parents                                                */
/* ------------------------------------------------------------------ */

/**
 * Emploi du temps déduit du métier.
 *
 * Les horaires décalés — soignants, restauration, industrie postée, sécurité —
 * changent tout : ce n'est pas le nombre d'heures qui décide de la présence,
 * c'est le moment où elles tombent.
 */
export function buildSchedule(rng: Rng, opts: {
  hours: number;
  field: string | null;
  commuteMinutes: number;
}): ParentSchedule {
  const shiftedFields = ['Santé', 'Restauration', 'Industrie', 'Sécurité & Défense', 'Transport', 'Tourisme'];
  const shifted = opts.hours > 0 && opts.field !== null
    && shiftedFields.includes(opts.field) && rng.chance(0.55);

  if (opts.hours <= 0) {
    return {
      start: 0, end: 0, daysPerWeek: 0, shifted: false,
      commuteMinutes: 0, canCollectChild: true, eveningsHome: 7,
    };
  }

  const daysPerWeek = opts.hours > 42 ? 5 + (rng.chance(0.4) ? 1 : 0) : 5;
  const daily = opts.hours / daysPerWeek;
  const start = shifted
    ? rng.pick([5.5, 6, 13, 14, 21, 22])
    : rng.float(7, 9.5);
  const end = start + daily + rng.float(0.5, 1.2);

  return {
    start: Math.round(start * 2) / 2,
    end: Math.round(end * 2) / 2,
    daysPerWeek,
    shifted,
    commuteMinutes: Math.round(opts.commuteMinutes),
    // On peut récupérer l'enfant si l'on a fini avant 17 h, trajet compris.
    canCollectChild: end + opts.commuteMinutes / 60 <= 17 || (shifted && start > 12),
    eveningsHome: shifted
      ? rng.int(1, 4)
      : Math.max(0, 7 - Math.round(Math.max(0, end - 18)) - (daysPerWeek > 5 ? 1 : 0)),
  };
}

/* ------------------------------------------------------------------ */
/* Vie de famille                                                      */
/* ------------------------------------------------------------------ */

/**
 * Ce que la famille fait réellement ensemble.
 *
 * Les repas partagés sont l'exemple type du détail minuscule qui compte : ce
 * n'est pas le repas qui change une vie, c'est le fait que ce soit là, et
 * seulement là, que les parents apprennent ce qui se passe à l'école.
 */
export function buildFamilyLife(rng: Rng, origin: WorldOrigin, disposableRatio: number): FamilyLife {
  const schedules = origin.parents.filter((p) => p.inHousehold).map((p) => p.schedule);
  const eveningsTogether = schedules.length > 0
    ? Math.min(...schedules.map((s) => s.eveningsHome))
    : 7;
  const money = Math.max(0, Math.min(2.5, disposableRatio));
  const family = origin.values.family / 100;
  const leisure = origin.values.leisure / 100;

  return {
    mealsPerWeek: Math.max(0, Math.round(
      eveningsTogether * (0.5 + family * 0.7) + rng.float(-1, 1),
    )),
    outingsPerYear: Math.max(0, Math.round(
      12 * money * (0.4 + leisure) + rng.float(-3, 4),
    )),
    holidaysPerYear: Math.max(0, Math.round(
      1.6 * money * (0.3 + leisure * 0.8) + rng.float(-0.5, 0.6),
    )),
    familyVisitsPerYear: Math.max(0, Math.round(
      10 * (0.3 + family) * (origin.neighborhood.zone === 'zone rurale' ? 0.7 : 1) + rng.float(-3, 4),
    )),
    cultureOutingsPerYear: Math.max(0, Math.round(
      6 * money * (origin.values.creativity / 70) + origin.city.culture / 40 + rng.float(-2, 3),
    )),
    sportTogetherPerYear: Math.max(0, Math.round(
      10 * (origin.values.sport / 70) * (0.4 + money * 0.4) + rng.float(-3, 4),
    )),
    seriousTalksPerMonth: Math.max(0, Math.round(
      2 * (origin.atmosphere.communication / 55) + rng.float(-0.8, 1),
    )),
  };
}

/* ------------------------------------------------------------------ */
/* Numérique                                                           */
/* ------------------------------------------------------------------ */

/**
 * Accès numérique, très dépendant de l'époque.
 *
 * Un enfant né en 1985 et un enfant né en 2015 ne vivent pas la même chose,
 * et pas seulement parce que le matériel a changé : la présence d'un écran
 * personnel dans la chambre modifie le sommeil, les amitiés et l'exposition
 * à peu près à tout.
 */
export function buildDigital(rng: Rng, opts: {
  year: number;
  incomeRatio: number;
  living: { computer: boolean; internet: boolean };
  supervision: number;
}): DigitalAccess {
  const era = Math.max(0, Math.min(1, (opts.year - 1990) / 26));
  const money = Math.max(0, Math.min(2, opts.incomeRatio));

  const computer: DigitalAccess['computer'] = !opts.living.computer
    ? 'aucun'
    : rng.chance(Math.min(0.7, era * money * 0.5)) ? 'personnel' : 'familial';

  const internet: DigitalAccess['internet'] = !opts.living.internet
    ? 'aucun'
    : rng.chance(Math.min(0.75, era * 0.9)) ? 'rapide'
      : rng.chance(0.6) ? 'normal' : 'lent';

  const phoneEra = Math.max(0, Math.min(1, (opts.year - 2000) / 18));
  const phone: DigitalAccess['phone'] = phoneEra < 0.15
    ? 'aucun'
    : rng.chance(Math.min(0.85, phoneEra * (0.5 + money * 0.35))) ? 'personnel'
      : rng.chance(0.5) ? 'partagé' : 'aucun';

  return {
    phone,
    computer,
    internet,
    phoneAge: phone === 'aucun' ? null : Math.round(rng.gauss(16 - phoneEra * 5, 2, 8, 20)),
    // Des parents attentifs posent des limites ; des parents absents, non.
    screenLimit: opts.supervision > 60 && rng.chance(0.6)
      ? Math.round(rng.float(1, 3) * 2) / 2
      : 0,
  };
}

/* ------------------------------------------------------------------ */
/* Libertés, corvées, argent de poche                                  */
/* ------------------------------------------------------------------ */

export function buildFreedoms(rng: Rng, origin: WorldOrigin, supervision: number): Freedoms {
  const safety = origin.neighborhood.safety;
  const autonomy = origin.values.autonomy;
  return {
    // Sortir seul dépend autant du quartier que des parents.
    goOutAlone: Math.round(clampStat(
      15 - autonomy / 12 + (100 - safety) / 14 + supervision / 16 + rng.float(-1.5, 1.5),
    ) / 100 * 20 + 6),
    curfew: Math.round(Math.max(17, Math.min(24,
      23.5 - supervision / 28 + autonomy / 40 + rng.float(-1, 1),
    ))),
    phoneControl: clampStat(supervision * 0.7 - autonomy * 0.2 + rng.float(-12, 12)),
    friendControl: clampStat(supervision * 0.6 + (100 - safety) * 0.2 + rng.float(-12, 12)),
    financialAutonomy: clampStat(autonomy * 0.5 + (100 - supervision) * 0.25 + rng.float(-12, 12)),
  };
}

export function buildChores(rng: Rng, origin: WorldOrigin, siblingCount: number): Chores {
  const rural = origin.neighborhood.zone === 'zone rurale';
  const strain = origin.finance.financialStress;
  const hours = Math.max(0, Math.round(
    (origin.values.manners / 30) + strain / 22 + siblingCount * 0.8 + (rural ? 2.5 : 0) + rng.float(-1, 1.5),
  ) * 10) / 10;

  return {
    hoursPerWeek: hours,
    // Garder ses frères et sœurs n'arrive pas partout : il faut des plus
    // jeunes, et des parents peu disponibles.
    siblingCare: siblingCount > 0 && strain > 45 && rng.chance(0.55),
    familyWork: rural && origin.housing.type === 'ferme' && rng.chance(0.75),
    paid: origin.finance.disposableIncome > 0 && rng.chance(0.35),
  };
}

/* ------------------------------------------------------------------ */
/* Langues, sommeil, capitaux                                          */
/* ------------------------------------------------------------------ */

const MIGRANT_LANGUAGES = [
  'arabe', 'portugais', 'turc', 'polonais', 'espagnol', 'italien', 'wolof',
  'vietnamien', 'roumain', 'russe', 'mandarin', 'tamoul', 'berbère',
];

const NATIONAL_LANGUAGE: Record<string, string> = {
  fr: 'français', us: 'anglais', uk: 'anglais', de: 'allemand', es: 'espagnol',
  it: 'italien', ca: 'anglais', jp: 'japonais', kr: 'coréen', cn: 'mandarin',
  in: 'hindi', br: 'portugais', mx: 'espagnol', ru: 'russe', se: 'suédois',
  no: 'norvégien', ma: 'arabe', eg: 'arabe', ng: 'anglais', za: 'anglais',
  au: 'anglais', ch: 'allemand', ar: 'espagnol', nl: 'néerlandais',
};

export function buildLanguages(rng: Rng, country: Country, presetId: string): Languages {
  const main = NATIONAL_LANGUAGE[country.id] ?? 'français';
  const home: string[] = [];
  const pool = MIGRANT_LANGUAGES.filter((l) => l !== main);
  // Une famille récemment arrivée parle presque toujours une autre langue
  // à la maison ; ailleurs, c'est plus rare mais possible.
  const chance = presetId === 'immigrantStart' ? 0.92 : 0.12;
  if (rng.chance(chance)) home.push(rng.pick(pool));
  if (home.length > 0 && rng.chance(0.18)) {
    const second = rng.pick(pool);
    if (!home.includes(second)) home.push(second);
  }

  const fluency: Record<string, number> = { [main]: presetId === 'immigrantStart' ? 62 : 88 };
  for (const lang of home) fluency[lang] = rng.int(45, 80);
  return { main, home, fluency };
}

/**
 * Sommeil.
 *
 * Effet volontairement discret mais permanent : une chambre partagée dans un
 * logement bruyant coûte quelques points de concentration chaque année, ce
 * qui ne se voit jamais sur une année et beaucoup sur douze.
 */
export function buildSleep(rng: Rng, origin: WorldOrigin, age: number): Sleep {
  const noise = origin.street.noise * 0.6 + origin.neighborhood.noise * 0.4;
  const quality = clampStat(
    78
    - noise * 0.25
    + (origin.living.ownBedroom ? 8 : -12)
    + (origin.housing.comfort - 50) * 0.15
    - origin.atmosphere.stress * 0.2
    - (origin.digital.phone === 'personnel' && age >= 12 ? 8 : 0)
    + (origin.digital.screenLimit > 0 ? 5 : 0)
    + rng.float(-8, 8),
  );
  const base = age < 6 ? 11 : age < 13 ? 9.5 : age < 19 ? 8.5 : 7.5;
  return {
    hours: Math.round((base - (100 - quality) / 45) * 10) / 10,
    quality,
  };
}

/**
 * Les trois capitaux.
 *
 * Séparés à dessein : le capital culturel d'une famille d'enseignants modeste
 * dépasse celui de bien des foyers aisés, et le capital social d'un village
 * soudé n'a rien à voir avec l'argent.
 */
export function buildCapitals(origin: WorldOrigin, nationalIncome: number): Capitals {
  const parentEducation = origin.parents.length > 0
    ? origin.parents.reduce((s, p) => s + p.education, 0) / origin.parents.length
    : 40;

  const cultural = clampStat(
    parentEducation * 0.34
    + origin.values.school * 0.16
    + origin.values.creativity * 0.12
    + (origin.living.booksAtHome ? 12 : 0)
    + (origin.living.musicalInstrument ? 6 : 0)
    + Math.min(10, origin.familyLife.cultureOutingsPerYear * 1.1)
    + Math.min(8, origin.familyLife.holidaysPerYear * 3)
    + Math.min(8, origin.familyLife.seriousTalksPerMonth * 2.5),
  );

  const social = clampStat(
    origin.contacts.length * 5
    + origin.contacts.reduce((s, c) => s + c.standing * c.closeness / 2400, 0)
    + origin.social.communityCohesion * 0.2
    + origin.street.neighbourRelations * 0.14
    + Math.min(12, origin.familyLife.familyVisitsPerYear * 0.7)
    + origin.neighborhood.reputation * 0.1,
  );

  /*
   * Le terme de revenu disponible est borné **des deux côtés**.
   *
   * Il ne l'était qu'en haut, et le manque se voyait : un foyer assis sur 2,9
   * millions d'actifs, propriétaire de son logement, 250 000 d'épargne et
   * aucune dette obtenait un capital économique de **zéro** — parce qu'une
   * seule année de trésorerie négative (charges de logement 191 000 contre
   * 199 000 de revenus) faisait tomber ce premier terme à −84, ce qui écrasait
   * les trois autres avant le plancher de `clampStat`.
   *
   * Un patrimoine ne s'évapore pas parce qu'un exercice se termine dans le
   * rouge. Vivre au-dessus de ses moyens coûte, mais pas plus que ce que la
   * dette coûte déjà par son propre terme, plus bas.
   */
  const cashflow = clamp(
    (origin.finance.disposableIncome / Math.max(1, nationalIncome)) * 45,
    -15, 45,
  );

  const economic = clampStat(
    cashflow
    + Math.min(35, (origin.finance.assets / Math.max(1, nationalIncome * 8)) * 35)
    + Math.min(10, (origin.finance.savings / Math.max(1, nationalIncome)) * 10)
    + (origin.housing.tenure === 'propriétaire' ? 12 : origin.housing.tenure === 'accédant' ? 6 : 0)
    - Math.min(25, (origin.finance.debt / Math.max(1, nationalIncome * 5)) * 25),
  );

  return { social, cultural, economic };
}

/* ------------------------------------------------------------------ */
/* Temps disponible                                                    */
/* ------------------------------------------------------------------ */

/**
 * Budget de temps hebdomadaire.
 *
 * Sans cette ressource, rien n'empêche un personnage de pratiquer quinze
 * activités, de lire chaque soir et de voir ses amis tous les week-ends. Avec
 * elle, il faut choisir — et c'est ce choix qui construit une trajectoire.
 */
export function buildTimeBudget(opts: {
  age: number;
  schoolHours: number;
  homeworkHours: number;
  commuteMinutesPerDay: number;
  choreHours: number;
  activityHours: number;
  familyHours: number;
  socialHours: number;
  habitHours: number;
  sleepHours: number;
}): TimeBudget {
  const total = Math.max(40, (24 - opts.sleepHours) * 7);
  const commute = (opts.commuteMinutesPerDay * (opts.age >= 6 ? 5 : 0)) / 60;
  const used = opts.schoolHours + opts.homeworkHours + commute + opts.choreHours
    + opts.activityHours + opts.familyHours + opts.socialHours + opts.habitHours;
  return {
    total: Math.round(total),
    school: Math.round(opts.schoolHours * 10) / 10,
    homework: Math.round(opts.homeworkHours * 10) / 10,
    commute: Math.round(commute * 10) / 10,
    chores: Math.round(opts.choreHours * 10) / 10,
    activities: Math.round(opts.activityHours * 10) / 10,
    family: Math.round(opts.familyHours * 10) / 10,
    social: Math.round(opts.socialHours * 10) / 10,
    habits: Math.round(opts.habitHours * 10) / 10,
    // La marge réelle : négative en cas de surcharge, ce qui se paiera.
    free: Math.round((total - used) * 10) / 10,
  };
}

/** Popularité vierge : tout se gagne à l'école. */
export function emptyPopularity(): Popularity {
  return { known: 0, liked: 0, respected: 0, influential: 0, intimidating: 0, funny: 0 };
}
