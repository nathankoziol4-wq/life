/**
 * Exposition.
 *
 * C'est le mécanisme central demandé au §58 : le moteur ne décide jamais
 * qu'un personnage « devient informaticien ». Il calcule chaque année à quoi
 * ce personnage est *exposé* — un ordinateur à la maison, un grand frère
 * passionné, un club au lycée, une bibliothèque à deux rues, une famille qui
 * parle de politique à table — et laisse les goûts se former tout seuls si
 * l'exposition dure.
 *
 * Un signal vaut entre 0 et 1. Les intérêts (`data/interests.ts`) déclarent
 * les signaux qui les nourrissent ; personne ne code « si ordinateur alors
 * informatique ».
 *
 * Deuxième principe : l'exposition sociale compte autant que matérielle. Un
 * frère, un ami, un parent réellement passionné par quelque chose transmet
 * bien plus qu'un équipement posé dans un coin.
 */

import type { GameState } from '../engine/types.ts';
import type { Psyche } from '../engine/psyche.ts';
import type { WorldOrigin } from '../engine/origin.ts';
import { INTERESTS } from '../data/interests.ts';

export type Signals = Record<string, number>;

/** Force d'un signal, bornée. */
function signal(value: number): number {
  return Math.max(0, Math.min(1, value));
}

/** Une distance en mètres, convertie en force de signal. */
function nearness(metres: number, comfortable: number): number {
  if (!Number.isFinite(metres) || metres <= 0) return 0;
  return signal(comfortable / (comfortable + metres));
}

/**
 * Passions réellement présentes dans l'entourage proche.
 *
 * On ne regarde pas « le frère existe » mais « le frère est passionné par
 * quelque chose, et à quel point ». C'est ce qui rend la transmission
 * crédible : un aîné indifférent ne transmet rien.
 */
function entourageInterests(state: GameState): {
  sibling: Map<string, number>;
  friend: Map<string, number>;
  parent: Map<string, number>;
} {
  const sibling = new Map<string, number>();
  const friend = new Map<string, number>();
  const parent = new Map<string, number>();

  const add = (map: Map<string, number>, id: string, strength: number) => {
    map.set(id, Math.max(map.get(id) ?? 0, strength));
  };

  for (const npc of Object.values(state.npcs)) {
    if (!npc.alive || npc.estranged) continue;
    const psyche = npc.psyche as Psyche | undefined;
    if (!psyche || psyche.interests.length === 0) continue;

    const closeness = npc.relationship / 100;
    const target = npc.relation === 'brother' || npc.relation === 'sister'
      ? sibling
      : npc.relation === 'friend' || npc.relation === 'bestFriend' || npc.relation === 'classmate'
        ? friend
        : (npc.relation === 'mother' || npc.relation === 'father'
          || npc.relation === 'stepmother' || npc.relation === 'stepfather')
          ? parent
          : null;
    if (!target) continue;

    for (const interest of psyche.interests) {
      // Un intérêt tiède ne se transmet pas ; une passion, oui.
      if (interest.level < 40) continue;
      add(target, interest.id, signal((interest.level / 100) * (0.4 + closeness * 0.6)));
    }
  }
  return { sibling, friend, parent };
}

/**
 * Calcule tous les signaux d'exposition de l'année.
 *
 * C'est volontairement une fonction pure : elle ne modifie rien, elle décrit
 * seulement ce que la vie du personnage met à sa portée en ce moment.
 */
export function exposureSignals(state: GameState): Signals {
  const p = state.player;
  const s = originSignals(p.origin, { age: p.age, hasPet: p.pets.length > 0 });
  const around = entourageInterests(state);

  /* --- Transmission par l'entourage --- */
  // Chaque intérêt reçoit un signal propre selon qui le pratique autour de soi.
  for (const def of INTERESTS) {
    const fromSibling = around.sibling.get(def.id) ?? 0;
    const fromFriend = around.friend.get(def.id) ?? 0;
    const fromParent = around.parent.get(def.id) ?? 0;
    if (fromSibling > 0) s[`frèrePassionné:${def.id}`] = fromSibling;
    if (fromFriend > 0) s[`amiPassionné:${def.id}`] = fromFriend;
    if (fromParent > 0) s[`parentPassionné:${def.id}`] = fromParent;
  }
  // Signaux génériques, pour les intérêts qui ne visent personne en particulier.
  s.frèrePassionné = maxOf(around.sibling);
  s.amiPassionné = maxOf(around.friend);
  s.amiSport = maxOfKeys(around.friend, ['football', 'course', 'natation', 'artsMartiaux']);
  s.parentMusicien = Math.max(s.parentMusicien, around.parent.get('musique') ?? 0);
  s.parentBénévole = around.parent.get('bénévolat') ?? 0;

  return s;
}

/**
 * La part de l'exposition qui ne dépend que de l'environnement.
 *
 * Elle est isolée pour une raison précise : l'écran de création doit pouvoir
 * montrer, avant la naissance, ce que ce départ met à portée de l'enfant — et
 * il doit le montrer avec le code qui servira réellement, pas avec une
 * approximation faite pour l'affichage.
 */
export function originSignals(
  o: WorldOrigin,
  opts: { age: number; hasPet: boolean },
): Signals {
  const s: Signals = {};

  /* --- Ce qu'il y a à la maison --- */
  s.ordinateur = o.digital.computer === 'personnel' ? 1
    : o.digital.computer === 'familial' ? 0.65 : 0;
  s.internet = o.digital.internet === 'rapide' ? 1
    : o.digital.internet === 'normal' ? 0.75
      : o.digital.internet === 'lent' ? 0.4 : 0;
  s.téléphonePersonnel = o.digital.phone === 'personnel'
    && (o.digital.phoneAge === null || opts.age >= o.digital.phoneAge) ? 1
    : o.digital.phone === 'partagé' ? 0.35 : 0;
  s.livres = o.living.booksAtHome ? 1 : 0.1;
  s.instrument = o.living.musicalInstrument ? 1 : 0;
  s.jardin = o.living.garden ? 1 : 0;
  s.voitureFamiliale = o.living.familyCar ? 1 : 0;
  s.chambreÀSoi = o.living.ownBedroom ? 1 : 0;
  s.animalFamilier = opts.hasPet ? 1 : 0;
  s.maisonIndividuelle = ['maison', 'pavillon', 'villa', 'ferme', 'maison mitoyenne']
    .includes(o.housing.type) ? 1 : 0;

  /* --- Ce qu'il y a autour, pondéré par la distance réelle --- */
  const d = o.distances;
  s.bibliothèque = nearness(d.library, 1200);
  s.parc = nearness(d.park, 700);
  s.nature = nearness(d.nature, 2500);
  s.piscine = nearness(d.pool, 2500);
  s.clubSport = nearness(d.sportsClub, 2500);
  s.stade = signal(o.neighborhood.sportsFacilities / 100 * nearness(d.sportsClub, 3500) * 1.6);
  s.gymnase = signal(o.neighborhood.sportsFacilities / 120 + nearness(d.sportsClub, 3000) * 0.5);
  s.cinéma = nearness(d.cinema, 4000);
  s.commerces = nearness(d.shops, 900);
  s.centreCommercial = signal(o.city.shops / 100 * nearness(d.cityCentre, 6000) * 1.4);
  s.musée = signal(o.city.culture / 110 * nearness(d.cityCentre, 8000) * 1.5);
  s.écoleMusique = signal(o.infrastructure.musicSchool === null ? 0 : 1 - o.infrastructure.musicSchool / 60);
  s.quartierSport = signal(o.neighborhood.sportsFacilities / 100);
  s.quartierCulture = signal(o.city.culture / 100);
  s.quartierRural = o.neighborhood.zone === 'zone rurale' ? 1 : 0;
  s.quartierOuvrier = ['working', 'deprived', 'industrial'].includes(o.neighborhood.archetypeId) ? 1 : 0;
  s.cohésionQuartier = signal(o.social.communityCohesion / 100);

  /* --- L'école --- */
  const school = o.school;
  s.écoleSport = signal((school?.sports ?? 40) / 100);
  s.écoleCulture = signal((school?.programBreadth ?? 40) / 100);
  s.écoleInternationale = school?.archetypeId === 'international' ? 1 : 0;
  const clubs = school?.offeredClubs ?? [];
  s.clubScience = clubs.includes('science') ? 1 : 0;
  s.clubMusique = clubs.includes('music') ? 1 : 0;
  s.clubThéâtre = clubs.includes('theatre') ? 1 : 0;
  s.clubArt = clubs.includes('theatre') || clubs.includes('journal') ? 0.5 : 0;
  s.clubJournal = clubs.includes('journal') ? 1 : 0;
  s.clubÉchecs = clubs.includes('chess') ? 1 : 0;
  s.clubBénévole = clubs.includes('volunteer') ? 1 : 0;

  /* --- Ce que la famille valorise et fait --- */
  s.valeurSport = signal(o.values.sport / 100);
  s.valeurÉcole = signal(o.values.school / 100);
  s.valeurCréation = signal(o.values.creativity / 100);
  s.valeurArgent = signal(o.values.money / 100);
  s.valeurFamille = signal(o.values.family / 100);
  s.valeurAventure = signal(o.values.leisure / 100 * 0.6 + o.familyLife.holidaysPerYear / 4);
  s.valeurSolidarité = signal(o.social.communityCohesion / 130 + o.values.family / 200);
  s.valeurStatut = signal(o.values.money / 130 + o.neighborhood.reputation / 200);
  s.valeurRéputation = signal(o.values.manners / 100);
  s.valeurLoisirs = signal(o.values.leisure / 100);
  s.repasFamiliaux = signal(o.familyLife.mealsPerWeek / 7);
  s.vacancesFamille = signal(o.familyLife.holidaysPerYear / 2.5);
  s.voyages = signal(o.familyLife.holidaysPerYear / 3);
  s.réseaux = s.téléphonePersonnel * signal(o.digital.internet === 'aucun' ? 0 : 1);
  s.précarité = signal(o.finance.financialStress / 100);
  s.trajetActif = o.transport.schoolMode === 'à pied' || o.transport.schoolMode === 'vélo' ? 1 : 0;

  /* --- Les métiers et passions des parents --- */
  const fields = o.parents.map((r) => r.field ?? '');
  s.parentDiplômé = signal(
    o.parents.length > 0
      ? o.parents.reduce((sum, r) => sum + r.education, 0) / o.parents.length / 80
      : 0,
  );
  s.parentManuel = fields.some((f) => ['Bâtiment', 'Industrie', 'Transport', 'Agriculture'].includes(f)) ? 1 : 0;
  s.parentFinance = fields.some((f) => ['Finance', 'Immobilier', 'Commerce & Vente'].includes(f)) ? 1 : 0;
  s.parentArtiste = fields.some((f) => ['Arts & Spectacle', 'Médias'].includes(f)) ? 1 : 0;
  s.parentCuisinier = fields.some((f) => ['Restauration', 'Tourisme'].includes(f)) ? 1 : 0;
  s.parentMusicien = s.parentArtiste * 0.6;
  s.parentBénévole = 0;
  s.grandParentProche = nearness(d.grandparents, 4000);

  return s;
}

function maxOf(map: Map<string, number>): number {
  let max = 0;
  for (const value of map.values()) max = Math.max(max, value);
  return max;
}

function maxOfKeys(map: Map<string, number>, keys: string[]): number {
  let max = 0;
  for (const key of keys) max = Math.max(max, map.get(key) ?? 0);
  return max;
}

/** Une contribution nommée à l'exposition d'un intérêt. */
export interface ExposureTerm {
  label: string;
  strength: number;
}

/**
 * Traduction des signaux en français lisible.
 *
 * L'écran de trajectoire montre ces libellés tels quels : « pourquoi il aime
 * l'informatique » doit se lire « un ordinateur à la maison », pas
 * « ordinateur: 0.72 ».
 */
const SIGNAL_LABELS: Record<string, string> = {
  ordinateur: 'un ordinateur à la maison',
  internet: 'une connexion internet',
  téléphonePersonnel: 'un téléphone à lui',
  réseaux: 'les réseaux sociaux',
  livres: 'des livres à la maison',
  instrument: 'un instrument à la maison',
  jardin: 'un jardin',
  animalFamilier: 'un animal à la maison',
  maisonIndividuelle: 'une maison avec de la place',
  voitureFamiliale: 'une voiture dans la famille',
  repasFamiliaux: 'des repas pris ensemble',
  vacancesFamille: 'des vacances en famille',
  voyages: 'des voyages',
  précarité: 'la difficulté financière du foyer',
  bibliothèque: 'une bibliothèque à proximité',
  musée: 'un musée à proximité',
  cinéma: 'un cinéma à proximité',
  centreCommercial: 'un centre commercial à proximité',
  commerces: 'des commerces à proximité',
  parc: 'un parc à proximité',
  nature: 'la nature autour',
  stade: 'un stade à proximité',
  gymnase: 'un gymnase à proximité',
  piscine: 'une piscine à proximité',
  trajetActif: 'des trajets faits à pied ou à vélo',
  cohésionQuartier: 'un quartier soudé',
  quartierSport: 'un quartier où l’on fait du sport',
  quartierOuvrier: 'un quartier ouvrier',
  quartierRural: 'un quartier rural',
  clubScience: 'le club scientifique de l’école',
  clubArt: 'le club d’arts de l’école',
  clubMusique: 'le club de musique de l’école',
  clubSport: 'le club de sport de l’école',
  clubÉchecs: 'le club d’échecs de l’école',
  clubJournal: 'le journal de l’école',
  clubBénévole: 'le club solidaire de l’école',
  écoleCulture: 'une école qui ouvre à la culture',
  écoleMusique: 'une école qui pousse la musique',
  écoleSport: 'une école qui pousse le sport',
  écoleInternationale: 'une école tournée vers l’étranger',
  parentDiplômé: 'un parent qui a fait des études',
  parentArtiste: 'un parent qui crée',
  parentMusicien: 'un parent musicien',
  parentManuel: 'un parent qui travaille de ses mains',
  parentCuisinier: 'un parent qui cuisine',
  parentFinance: 'un parent qui parle d’argent',
  parentBénévole: 'un parent engagé',
  grandParentProche: 'des grands-parents proches',
  amiSport: 'des amis qui font du sport',
  valeurÉcole: 'une famille qui tient aux études',
  valeurSport: 'une famille qui tient au sport',
  valeurCréation: 'une famille qui tient à la création',
  valeurArgent: 'une famille qui parle d’argent',
  valeurFamille: 'une famille très soudée',
  valeurSolidarité: 'une famille qui aide les autres',
  valeurAventure: 'une famille qui aime bouger',
  valeurStatut: 'une famille attachée au rang',
  valeurRéputation: 'une famille attentive au qu’en-dira-t-on',
  valeurLoisirs: 'une famille qui prend du bon temps',
};

/** Libellé lisible d'un signal d'exposition. */
export function signalLabel(key: string): string {
  return SIGNAL_LABELS[key] ?? key;
}

/**
 * Exposition totale à un intérêt donné, avec le détail des contributions.
 *
 * Le détail n'est pas un luxe : c'est ce qui permet de répondre à la question
 * « pourquoi ce personnage aime-t-il l'informatique ? » par une liste de
 * causes plutôt que par un haussement d'épaules.
 */
export function exposureTo(signals: Signals, interestId: string): {
  total: number;
  terms: ExposureTerm[];
} {
  const def = INTERESTS.find((i) => i.id === interestId);
  if (!def) return { total: 0, terms: [] };

  const terms: ExposureTerm[] = [];
  let total = 0;
  for (const [key, weight] of Object.entries(def.sources)) {
    const strength = (signals[key] ?? 0) * (weight as number);
    if (strength > 0.02) {
      terms.push({ label: signalLabel(key), strength });
      total += strength;
    }
  }
  // Transmission ciblée : quelqu'un de proche pratique précisément cela.
  for (const [prefix, label, weight] of [
    ['frèrePassionné', 'un frère ou une sœur passionné', 1.1],
    ['amiPassionné', 'un ami passionné', 0.9],
    ['parentPassionné', 'un parent passionné', 1],
  ] as const) {
    const strength = (signals[`${prefix}:${interestId}`] ?? 0) * weight;
    if (strength > 0.02) {
      terms.push({ label, strength });
      total += strength;
    }
  }

  terms.sort((a, b) => b.strength - a.strength);
  return { total, terms };
}
