/**
 * Comment tu es arrivé : les circonstances qu'on ne choisit pas.
 *
 * Le raisonnement est dans `data/birth.ts`. Ici, trois choses.
 *
 * **Tirer les circonstances**, une fois, à la construction de la vie — sans
 * consommer d'aléa. `createNewLife` est le point le plus sensible du moteur :
 * toutes les vies de référence en partent, et un seul `rng` de plus y
 * décalerait chacune d'elles. Le choix des circonstances passe donc par le
 * hachage déterministe de la graine, comme ailleurs (`legacy.ts`, `beast.ts`).
 * Les tirages ne reviennent que pour **fabriquer ce qui existe vraiment** —
 * le jumeau est une personne, la bête du foyer est une bête — et seulement
 * dans les vies qui en ont une.
 *
 * **Les poser** : chacune se branche sur un système qui tourne déjà plutôt que
 * d'inventer le sien. Le jumeau passe par la fratrie, l'enfant trouvé par
 * `roots.ts`, le second pays par `languages.ts`, la bête par `beast.ts`.
 *
 * **Le rattrapage** : une naissance avant terme laisse une dette de
 * constitution que l'enfance rembourse à un rythme qui dépend des moyens du
 * foyer. C'est le seul endroit du jeu où la fortune des parents agit avant
 * l'école, et il tourne dans `advanceBirth`.
 */

import { clamp, clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import { fullName } from '../engine/context.ts';
import type { BirthState, GameState, Person } from '../engine/types.ts';
import {
  BIRTH_MARKS, EARLY_COST, EARLY_MEND, ELSEWHERE_APART, ELSEWHERE_TONGUE,
  HOUSE_BEAST_AGE, HOUSE_BEAST_SPECIES, HOUSE_BEAST_WARMTH, MEND_FLOOR,
  MEND_UNTIL, getBirthMark,
} from '../data/birth.ts';
import { COUNTRIES } from '../data/countries.ts';
import { adoptPetSpecies } from './activities.ts';
import { PET_NAMES } from '../data/activities.ts';
import { createPerson } from './npc.ts';
import { nativeLanguages } from './languages.ts';
import { shiftStats } from './stats.ts';

export { BIRTH_MARKS, getBirthMark };

/**
 * Un tirage déterministe qui ne consomme rien — même idiome qu'ailleurs.
 */
function hash(seed: number, salt: number): number {
  let h = (Math.abs(Math.round(seed)) ^ (salt * 0x9e37_79b9)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85eb_ca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2_ae35) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4_294_967_296;
}

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

const EMPTY: BirthState = { marks: [], twinId: null, bornIn: null, owed: 0 };

export function birthOf(state: GameState): BirthState {
  return state.player.birth ?? EMPTY;
}

export function bornWith(state: GameState, markId: string): boolean {
  return birthOf(state).marks.includes(markId);
}

/** Le jumeau, s'il est encore là. */
export function twinOf(state: GameState): Person | null {
  const id = birthOf(state).twinId;
  if (!id) return null;
  return state.npcs[id] ?? null;
}

/** Le pays de naissance, quand il diffère de celui où la famille habite. */
export function bornInLabel(state: GameState): string | null {
  const id = birthOf(state).bornIn;
  if (!id) return null;
  return COUNTRIES.find((c) => c.id === id)?.name ?? null;
}

/** Les circonstances de cette arrivée-là, telles que le catalogue les décrit. */
export function arrivalMarks(state: GameState) {
  return birthOf(state).marks
    .map((id) => getBirthMark(id))
    .filter((x): x is NonNullable<typeof x> => Boolean(x));
}

/** Ce qu'on peut dire de son arrivée, en une ligne par circonstance. */
export function arrivalLines(state: GameState): string[] {
  return birthOf(state).marks
    .map((id) => getBirthMark(id)?.line)
    .filter((x): x is string => Boolean(x));
}

/* ------------------------------------------------------------------ */
/* Tirer                                                               */
/* ------------------------------------------------------------------ */

/**
 * Quelles circonstances cette vie-là a reçues.
 *
 * Déterministe : la même graine donne toujours la même arrivée, et aucune
 * partie existante ne bouge du fait que ce système existe.
 *
 * Deux exclusions, parce qu'elles se contrediraient : un enfant trouvé n'a pas
 * de jumeau connu — s'il en avait un, on saurait quelque chose de sa
 * naissance — et une structure familiale déjà particulière (adoption, accueil,
 * grands-parents) n'y ajoute pas l'enfant trouvé, qui la remplacerait.
 */
export function drawMarks(state: GameState): string[] {
  const structure = state.player.origin.structure;
  const placed = structure === 'adoption' || structure === 'famille d’accueil'
    || structure === 'grands-parents';
  const marks: string[] = [];

  for (const [index, mark] of BIRTH_MARKS.entries()) {
    if (mark.id === 'trouve' && placed) continue;
    if (mark.id === 'jumeau' && marks.includes('trouve')) continue;
    if (hash(state.seed + index * 104_729, index * 7919 + 13) < mark.odds) {
      marks.push(mark.id);
    }
  }
  // L'exclusion inverse : si le tirage a donné les deux, l'enfant trouvé
  // l'emporte, étant de très loin le plus rare des deux.
  return marks.includes('trouve') ? marks.filter((m) => m !== 'jumeau') : marks;
}

/* ------------------------------------------------------------------ */
/* Poser                                                               */
/* ------------------------------------------------------------------ */

/**
 * Écrire les circonstances dans la partie.
 *
 * Appelé une fois, après `buildHousehold` et `seedRoots` : il faut le foyer
 * pour savoir dans quoi l'enfant arrive, et les racines pour pouvoir les
 * corriger dans le cas de l'enfant trouvé.
 */
export function settleBirth(ctx: Ctx): void {
  const { state } = ctx;
  const p = state.player;
  const marks = drawMarks(state);
  const birth: BirthState = { marks, twinId: null, bornIn: null, owed: 0 };
  p.birth = birth;
  if (marks.length === 0) return;

  if (marks.includes('trouve')) settleFound(ctx, birth);
  if (marks.includes('jumeau')) settleTwin(ctx, birth);
  if (marks.includes('avantTerme')) settleEarly(ctx, birth);
  if (marks.includes('ailleurs')) settleElsewhere(ctx, birth);
  if (marks.includes('beteDejaLa')) settleHouseBeast(ctx);

  for (const line of arrivalLines(state)) ctx.log('life', line, 'neutral');
}

/**
 * L'enfant trouvé.
 *
 * On ne réécrit pas `roots.ts` : on lui donne une troisième manière d'être
 * arrivé, et la seule qui parte de rien. Le reste du système — apprendre,
 * chercher, tenir le coup, finir par savoir ou non — fonctionne déjà.
 */
function settleFound(ctx: Ctx, _birth: BirthState): void {
  const { state } = ctx;
  state.player.roots = {
    how: 'trouvé',
    // Un enfant trouvé le sait depuis toujours : il n'y a rien à révéler.
    knownYear: state.player.birthYear,
    toldBy: 'parents',
    tried: [],
    trail: 0,
    soundness: 0,
    strain: 0,
    outcome: null,
    metYear: null,
  };
}

/**
 * Le jumeau : une vraie personne, du même âge exact.
 *
 * C'est la circonstance la plus lourde du lot, et la plus simple à écrire :
 * la fratrie existe déjà partout — école, héritage, relations. Il suffit d'y
 * mettre quelqu'un qui a zéro an d'écart, ce que la génération ordinaire ne
 * produit jamais.
 */
function settleTwin(ctx: Ctx, birth: BirthState): void {
  const { state, rng } = ctx;
  const p = state.player;
  // Les parents du jumeau sont ceux du joueur — c'est-à-dire, côté moteur,
  // les personnes dont le joueur est un enfant. `Player` ne porte pas de
  // `parentIds` ; on les retrouve par le lien, comme le fait `household.ts`.
  const parentIds = Object.values(state.npcs)
    .filter((x) => x.childrenIds.includes(p.id))
    .map((x) => x.id);
  // Le sexe **et** le lien, ensemble. `createPerson` tire son propre sexe
  // quand on ne lui en donne pas, et il décide du prénom : passer le seul
  // lien donnait « Tara Desai, brother » et « Sebastian Lang, sister ».
  // `household.ts` transmet les deux depuis toujours pour la fratrie
  // ordinaire ; c'est la même règle ici.
  const sex = rng.chance(0.5) ? 'M' : 'F';
  const twin = createPerson(ctx, {
    relation: sex === 'M' ? 'brother' : 'sister',
    sex,
    age: p.age,
    lastName: p.lastName,
    parentIds,
  });
  for (const id of parentIds) state.npcs[id]?.childrenIds.push(twin.id);
  twin.flags.siblingKind = 'jumeau';
  // Un jumeau part d'une relation que rien d'autre n'atteint à la naissance :
  // ils se connaissent depuis avant de connaître qui que ce soit.
  twin.relationship = clampStat(twin.relationship + 22);
  twin.opinion = clampStat(twin.opinion + 18);
  birth.twinId = twin.id;
  p.origin.siblings.push({
    personId: twin.id,
    ageGap: 0,
    kind: 'germain',
    closeness: clampStat(72 + rng.int(-12, 16)),
    rivalry: clampStat(46 + rng.int(-18, 22)),
  } as unknown as (typeof p.origin.siblings)[number]);
}

/** Naître avant terme : une dette de constitution, et de quoi la rembourser. */
function settleEarly(ctx: Ctx, birth: BirthState): void {
  const { state } = ctx;
  const p = state.player;
  const before = p.stats.health;
  p.stats.health = clampStat(p.stats.health - EARLY_COST);
  birth.owed = before - p.stats.health;
}

/**
 * Naître ailleurs : un second pays, une langue commencée, un léger écart.
 *
 * Le pays est choisi sans aléa parmi ceux du catalogue, ce qui suffit à varier
 * d'une graine à l'autre et garde `createNewLife` à sa séquence.
 */
function settleElsewhere(ctx: Ctx, birth: BirthState): void {
  const { state } = ctx;
  const p = state.player;
  const others = COUNTRIES.filter((c) => c.id !== p.countryId);
  if (others.length === 0) return;
  const pick = others[Math.floor(hash(state.seed, 0x5eed_1) * others.length)];
  birth.bornIn = pick.id;

  // La langue du pays de naissance, commencée et pas finie : ce qu'on garde
  // d'un endroit qu'on a quitté trop tôt pour s'en souvenir.
  const tongues = Object.keys(nativeLanguages(pick.id));
  for (const tongue of tongues.slice(0, 1)) {
    const held = p.languages[tongue] ?? 0;
    p.languages[tongue] = Math.max(held, ELSEWHERE_TONGUE);
  }
  shiftStats(state, { happiness: -Math.round(ELSEWHERE_APART / 2) });
}

/**
 * La bête du foyer.
 *
 * Elle appartient aux parents, elle est plus vieille que l'enfant, et elle
 * mourra pendant son enfance — c'est la première mort de la plupart des gens.
 * Le système des bêtes (`beast.ts`) fait déjà tout le reste ; on se contente
 * de la vieillir à l'arrivée.
 */
function settleHouseBeast(ctx: Ctx): void {
  const { state } = ctx;
  const p = state.player;
  const speciesId = HOUSE_BEAST_SPECIES[
    Math.floor(hash(state.seed, 0xb3a5_7) * HOUSE_BEAST_SPECIES.length)
  ];
  // Nom et âge tirés par hachage, et non par `ctx.rng` : cette bête naît
  // dans `createNewLife`, sur près d'un quart des vies. Les deux tirages
  // qu'elle consommait ont décalé la séquence et cassé deux mesures
  // d'équilibrage — le marché des sociétés et le régime des pratiques.
  const name = PET_NAMES[Math.floor(hash(state.seed, 0x1a2b_3c) * PET_NAMES.length)];
  if (!adoptPetSpecies(ctx, speciesId, true, 'eleveur', name).ok) return;
  const pet = p.pets[p.pets.length - 1];
  if (!pet) return;
  // Elle était là avant : c'est toute la différence avec une bête adoptée.
  const span = HOUSE_BEAST_AGE[1] - HOUSE_BEAST_AGE[0];
  pet.age = HOUSE_BEAST_AGE[0] + Math.round(hash(state.seed, 0x7f3e_11) * span);
  pet.since = state.year - pet.age;
  // Et elle connaît déjà la maison, sans connaître l'enfant.
  pet.bond = 0;
  pet.ease = clamp((pet.ease ?? 50) + 14, 0, 100);
  shiftStats(state, { happiness: HOUSE_BEAST_WARMTH });
}

/* ------------------------------------------------------------------ */
/* L'année                                                             */
/* ------------------------------------------------------------------ */

/**
 * Ce que le foyer rachète cette année d'une naissance avant terme.
 *
 * Le rythme suit le **milieu**, pas la trésorerie de l'année.
 *
 * La première version lisait `origin.capitals.economic`, ce qui semblait
 * naturel : c'est le capital économique du foyer, et tout `contexts.ts` s'en
 * sert. Mais `finaliseHousehold` est rappelée chaque année par
 * `environment.ts`, et recalcule ce nombre à partir du revenu disponible du
 * moment. Relevé sur un même foyer, année après année :
 *
 *     70 · 41 · 41 · 73 · 30 · 55 · 55 · 59 · 60 · 62 · 63 · 41 · 41 · 78
 *
 * Ce n'est pas la fortune des parents, c'est le solde d'un exercice. Le
 * rattrapage suivait donc du bruit, et la mesure par tranches de milieu ne
 * voulait rien dire puisqu'elle rangeait chaque vie d'après un seul de ces
 * tirages.
 *
 * `flags.familyTier` est fixé à la naissance et ne bouge plus : c'est ce que
 * le reste du jeu appelle « le milieu », et c'est ce qu'il fallait lire.
 */
const TIER_MEANS: Record<string, number> = {
  poor: 0.04, modest: 0.24, middle: 0.5, upper: 0.78, rich: 1,
};

export function mendRate(state: GameState): number {
  const tier = String(state.player.flags.familyTier ?? 'middle');
  const means = clamp(TIER_MEANS[tier] ?? 0.5, 0, 1);
  return EARLY_MEND * (MEND_FLOOR + (1 - MEND_FLOOR) * means);
}

/** Ce qu'il reste à rattraper. */
export function owedOf(state: GameState): number {
  return Math.max(0, birthOf(state).owed);
}

export function advanceBirth(ctx: Ctx): void {
  const { state } = ctx;
  const p = state.player;
  const birth = p.birth;
  if (!birth || birth.owed <= 0) return;
  if (p.age > MEND_UNTIL) {
    // Ce qui n'a pas été rattrapé avant l'adolescence ne le sera plus : la
    // dette cesse d'être une dette et devient la constitution du personnage.
    birth.owed = 0;
    return;
  }
  const mended = Math.min(birth.owed, mendRate(state));
  birth.owed -= mended;
  p.stats.health = clampStat(p.stats.health + mended);
  if (birth.owed <= 0.05) {
    birth.owed = 0;
    ctx.log('health', `${fullName(p)} a rattrapé son retard de naissance.`, 'good');
  }
}
