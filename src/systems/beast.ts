/**
 * La bête : la choisir, l'atteindre, la tenir, s'en séparer.
 *
 * Le raisonnement est dans `data/beast.ts`. Ici, quatre choses.
 *
 * **Lire** — ce que la bête demande, ce qu'on a construit, ce qu'il reste de
 * moments cette année. Rien de tout cela n'était visible : le joueur voyait un
 * nom, une espèce, un âge et un pourcentage de santé.
 *
 * **Donner un moment** — sortir, s'occuper, dresser. Le rendement dépend de
 * l'espèce et de l'ouverture de la bête, et les moments se partagent entre
 * toutes celles de la maison.
 *
 * **L'année** — le lien s'effrite si on n'a rien donné, le contentement suit
 * les besoins couverts, les bêtes mal tenues font des dégâts, et celle qu'on
 * laisse trois ans malheureuse finit par partir. `advanceBeast` passe **avant**
 * `advancePets` : le vieillissement et la mort doivent lire l'état de l'année,
 * pas celui de l'année d'avant.
 *
 * **S'en séparer** — la confier à quelqu'un, ou la rendre. C'est la seule
 * façon de perdre une bête sans qu'elle meure, et le jeu n'en avait aucune :
 * on la gardait jusqu'au bout, quoi qu'il arrive.
 *
 * `advanceBeast` ne tire **rien** de `ctx.rng`. La séquence aléatoire est
 * partagée par tout le moteur : y ajouter un tirage annuel décalerait toutes
 * les vies de référence. Les ennuis passent donc par le même hachage
 * déterministe qu'ailleurs (`skills.ts`, `legacy.ts`, `hearing.ts`).
 */

import { clamp, clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import { person } from '../engine/context.ts';
import type { ActionResult, GameState, Pet } from '../engine/types.ts';
import {
  ANSWER_FLOOR, BEAST_SOURCES, BOND_FADE, BOND_HELD, BOND_SHARE, BUSY_HOURS,
  CALM, CALM_TRAINED, CARES, CARE_HEALTH, CONTENT_DROP, CONTENT_FLOOR,
  CONTENT_GAIN, CONTENT_SHARE, DEFAULT_SOURCE, EASE_FLOOR, EASE_GAIN,
  ENTRUST_RELIEF, ENTRUST_WARMTH, GRIEF_FLOOR, GRIEF_FULL, HEALTH_SHARE,
  KEPT_BADLY, KEPT_WELL, MISERY, MISERY_DEEP, MISERY_SEEN, MISERY_YEARS,
  MOMENTS_BASE, MOMENTS_BUSY, MOMENTS_FREE, MOMENTS_MIN, NEGLECT_STING,
  PART_FLOOR, PART_FULL, REACH, SURRENDER_KARMA, TRAIN_BOND, TRAIN_GAIN,
  TROUBLE, TROUBLES, TROUBLE_COST, getBeastSource, getCare, natureOf,
} from '../data/beast.ts';
import { PET_SPECIES } from '../data/activities.ts';
import { shiftStats } from './stats.ts';

export { BEAST_SOURCES, CARES, getBeastSource, getCare, natureOf };

/** Le compteur de moments de l'année, dans `yearActions`. */
export const MOMENTS_KEY = 'beastMoments';

/**
 * Un tirage déterministe qui ne consomme rien — même idiome qu'ailleurs.
 */
function hash(seed: number, salt: number): number {
  let h = (Math.abs(Math.round(seed)) ^ (salt * 0x9e37_79b9)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85eb_ca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2_ae35) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4_294_967_296;
}

/** Un nombre stable tiré d'une chaîne, pour saler le hachage par bête. */
function saltOf(text: string): number {
  let h = 2_166_136_261;
  for (let i = 0; i < text.length; i += 1) {
    h = Math.imul(h ^ text.charCodeAt(i), 16_777_619) >>> 0;
  }
  return h >>> 0;
}

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

/**
 * L'identifiant d'espèce d'une bête.
 *
 * Les bêtes d'avant ce système n'ont qu'un nom d'espèce en clair ; on le
 * retrouve dans le catalogue plutôt que de leur inventer une nature.
 */
export function speciesIdOf(pet: Pet): string {
  if (pet.speciesId) return pet.speciesId;
  return PET_SPECIES.find((s) => s.name === pet.species)?.id ?? '';
}

export function sourceOf(pet: Pet) {
  return getBeastSource(pet.sourceId ?? DEFAULT_SOURCE);
}

/** Ce qui a été construit, 0-100. */
export function bondOf(pet: Pet): number {
  return clamp(pet.bond ?? 0, 0, 100);
}

/** À quel point elle se laisse atteindre, 0-100. */
export function easeOf(pet: Pet): number {
  return clamp(pet.ease ?? 50, 0, 100);
}

/** Ce qu'elle a appris, 0-100. */
export function trainingOf(pet: Pet): number {
  return clamp(pet.training ?? 0, 0, 100);
}

/** Ce qu'on peut dire du lien sans donner de nombre. */
export function bondLabel(bond: number): string {
  if (bond < 12) return 'Vous vous croisez';
  if (bond < 32) return 'Elle te reconnaît';
  if (bond < 58) return 'Elle te suit';
  if (bond < 82) return 'Elle te cherche';
  return 'Elle ne te lâche pas';
}

/** Ce qu'on peut dire de son ouverture. */
export function easeLabel(ease: number): string {
  if (ease < 20) return 'Fermée';
  if (ease < 45) return 'Sur ses gardes';
  if (ease < 70) return 'Abordable';
  return 'Ouverte';
}

/** Ce qu'on peut dire de son contentement. */
export function contentLabel(content: number): string {
  if (content < MISERY) return 'Malheureuse';
  if (content < 50) return 'Elle s’ennuie';
  if (content < 72) return 'Ça va';
  return 'Elle est bien';
}

/** Ce qu'on peut dire de ce qu'elle a appris. */
export function trainingLabel(training: number): string {
  if (training < 10) return 'N’a rien appris';
  if (training < 35) return 'Comprend deux ou trois choses';
  if (training < 65) return 'Sait se tenir';
  if (training < 88) return 'Bien dressée';
  return 'Fait tout ce qu’on lui demande';
}

/**
 * Ce qu'un soin donné aujourd'hui viendrait combler, entre 0 et 1.
 *
 * Deux choses qui se multiplient : à quel point l'espèce y est sensible, et à
 * quel point ce besoin-là est en souffrance **en ce moment**. C'est la seconde
 * moitié qui manquait : sans elle, sortir un chien déjà comblé rapportait
 * autant que le sortir quand il en avait besoin, et il n'y avait plus rien à
 * décider.
 */
export function needFor(pet: Pet, careId: string): number {
  const nature = natureOf(speciesIdOf(pet));
  const content = clamp(pet.happiness, 0, 100);
  if (careId === 'sortir') return nature.walk * (1 - content / 100);
  if (careId === 'soigner') return nature.groom * (1 - clamp(pet.health, 0, 100) / 100);
  if (careId === 'dresser') return nature.train * (1 - trainingOf(pet) / 100);
  return 0;
}

/**
 * Ce que la bête réclame le plus aujourd'hui.
 *
 * C'est la lecture qui remplace le choix au hasard. Le dressage est écarté
 * tant que le lien n'y est pas : on n'apprend rien à une bête qui ne sait pas
 * encore qui vous êtes, et l'annoncer comme un besoin alors qu'il est refusé
 * serait mentir au joueur.
 */
export function wants(pet: Pet): string {
  const scores = CARES
    .filter((c) => c.id !== 'dresser' || bondOf(pet) >= TRAIN_BOND)
    .map((c) => ({ id: c.id, score: needFor(pet, c.id) }));
  scores.sort((a, b) => b.score - a.score);
  return scores.length === 0 || scores[0].score <= 0 ? 'soigner' : scores[0].id;
}

/** Ce que la bête réclame, en clair. */
export function wantLine(pet: Pet): string {
  const nature = natureOf(speciesIdOf(pet));
  const content = clamp(pet.happiness, 0, 100);
  if (content < MISERY && nature.walk >= 0.6) return 'Elle tourne en rond. Il lui faut sortir.';
  if (content < MISERY) return 'Elle ne va pas bien, et ce n’est pas la santé.';
  if (pet.health < 55) return 'Quelque chose ne va pas. Regarde-la de près.';
  if (nature.train >= 0.6 && trainingOf(pet) < 30) return 'Elle apprendrait, si on lui montrait.';
  if (bondOf(pet) < 20) return 'Elle ne sait pas encore qui tu es.';
  return 'Elle n’a besoin de rien de particulier.';
}

/* ------------------------------------------------------------------ */
/* Les moments                                                         */
/* ------------------------------------------------------------------ */

/**
 * Combien de moments l'année laisse.
 *
 * Le temps libre n'est pas une abstraction : un métier à cinquante heures
 * retire un moment, ne pas travailler en rend un. C'est ce qui fait qu'une
 * carrière dévorante se paie ailleurs que sur les statistiques du joueur.
 */
export function momentsPerYear(state: GameState): number {
  const p = state.player;
  let moments = MOMENTS_BASE;
  if (p.job) {
    if (p.job.hours >= BUSY_HOURS) moments -= MOMENTS_BUSY;
  } else if (p.age >= 18) {
    moments += MOMENTS_FREE;
  }
  return Math.max(MOMENTS_MIN, moments);
}

/** Ce qui a déjà été dépensé cette année. */
export function momentsSpent(state: GameState): number {
  return Number(state.player.yearActions[MOMENTS_KEY] ?? 0);
}

/** Ce qu'il reste. */
export function momentsLeft(state: GameState): number {
  return Math.max(0, momentsPerYear(state) - momentsSpent(state));
}

/* ------------------------------------------------------------------ */
/* Adopter                                                             */
/* ------------------------------------------------------------------ */

/** Ce que coûte une bête selon d'où elle vient. */
export function priceFrom(basePrice: number, sourceId: string): number {
  const source = getBeastSource(sourceId);
  return Math.round(basePrice * (source?.priceShare ?? 1));
}

/**
 * Range une bête à l'arrivée, selon sa provenance.
 *
 * **Ne tire rien de `ctx.rng`**, et c'est une correction et non une élégance.
 * J'ai d'abord écrit ces quatre tirages en `rng.int`, en me disant qu'une
 * adoption est une action du joueur et non un pas d'année. C'était faux :
 * `randomEvents.ts` et `asking.ts` adoptent tous deux pendant `simulateYear`
 * — l'animal qu'on trouve, celui qu'on obtient en le demandant à ses parents.
 * Les quatre tirages décalaient donc toute la séquence en aval, et
 * l'équilibrage global s'en ressentait : 1,05 enfant par vie au lieu de 0,98,
 * 43 % de mariés au lieu de 45 %. Exactement la faute commise au chantier
 * « Le nom », où un tirage par naissance avait fait bouger quatre mesures
 * d'un coup.
 *
 * L'identifiant de la bête suffit à varier : il est unique, et le nom qu'on
 * lui donne juste avant consomme le seul tirage que l'adoption ait jamais
 * consommé.
 */
export function settleArrival(ctx: Ctx, pet: Pet, speciesId: string, sourceId: string): void {
  const { state } = ctx;
  const source = getBeastSource(sourceId) ?? BEAST_SOURCES[0];
  const salt = saltOf(pet.id);
  const draw = (n: number, [low, high]: [number, number]) =>
    Math.round(low + hash(state.year + n * 7919, salt ^ (n * 0x9e37)) * (high - low));

  pet.speciesId = speciesId;
  pet.sourceId = source.id;
  pet.since = state.year;
  pet.age = draw(1, source.age);
  pet.ease = draw(2, source.ease);
  pet.health = draw(3, source.health);
  pet.happiness = draw(4, source.content);
  pet.bond = 0;
  pet.training = 0;
  pet.misery = 0;
}

/* ------------------------------------------------------------------ */
/* Donner un moment                                                    */
/* ------------------------------------------------------------------ */

export function careBlocker(state: GameState, pet: Pet, careId: string): string | null {
  const p = state.player;
  const care = getCare(careId);
  if (!care) return 'On ne fait pas ça.';
  if (p.prison) return 'Pas depuis une cellule.';
  const nature = natureOf(speciesIdOf(pet));
  if (nature[care.needs] <= 0.05) {
    return `${pet.name} n’a rien à faire de ça.`;
  }
  if (care.id === 'dresser' && bondOf(pet) < TRAIN_BOND) {
    return `${pet.name} ne te connaît pas encore assez pour apprendre quoi que ce soit.`;
  }
  if (momentsLeft(state) < care.moments) {
    return care.moments > 1
      ? 'Il te faudrait deux moments, et tu ne les as plus.'
      : 'Tu n’as plus de moment cette année.';
  }
  return null;
}

/**
 * Ce qu'un moment rapporte de lien.
 *
 * Trois facteurs qui se multiplient : à quel point l'espèce est sensible à ce
 * qu'on lui donne, à quel point ce besoin-là est en souffrance aujourd'hui, et
 * à quel point cette bête-là se laisse atteindre. Chacun a son plancher —
 * aucun moment donné n'est perdu, et aucun ne vaut autant qu'un moment juste.
 */
export function reachOf(pet: Pet, careId: string): number {
  const care = getCare(careId);
  if (!care) return 0;
  const fit = natureOf(speciesIdOf(pet))[care.needs];
  const answer = ANSWER_FLOOR + (1 - ANSWER_FLOOR) * needFor(pet, careId);
  const open = EASE_FLOOR + (1 - EASE_FLOOR) * (easeOf(pet) / 100);
  return REACH * fit * answer * open * care.moments;
}

/**
 * Passer un moment avec elle.
 *
 * Trois effets, et le troisième est celui qui compte : la bête s'ouvre un peu
 * plus à chaque fois. C'est ce qui rachète l'animal du refuge — lent au début,
 * puis de moins en moins.
 */
export function spendMoment(ctx: Ctx, petId: string, careId: string): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const pet = p.pets.find((x) => x.id === petId);
  const care = getCare(careId);
  if (!pet || !care) return { ok: false, message: 'Cet animal n’existe pas.' };
  const blocker = careBlocker(state, pet, careId);
  if (blocker) return { ok: false, title: 'Impossible', message: blocker };

  p.yearActions[MOMENTS_KEY] = momentsSpent(state) + care.moments;
  // Le marqueur va sur la bête, pas dans `yearActions` : `simulateYear` vide
  // celui-ci avant toute étape d'avancement, si bien qu'`advanceBeast` n'y
  // aurait jamais rien trouvé. Même idiome que `JobState.tookYear`.
  pet.tended = state.year;

  const nature = natureOf(speciesIdOf(pet));
  const fit = nature[care.needs];
  const gained = reachOf(pet, careId);
  pet.bond = clamp(bondOf(pet) + gained, 0, 100);
  pet.ease = clamp(easeOf(pet) + EASE_GAIN * care.moments, 0, 100);
  pet.happiness = clamp(pet.happiness + CONTENT_GAIN * fit, 0, 100);

  const lines: string[] = [];
  if (care.id === 'dresser') {
    const learnt = TRAIN_GAIN * fit * (0.5 + bondOf(pet) / 200);
    pet.training = clamp(trainingOf(pet) + learnt, 0, 100);
    lines.push(trainingLabel(trainingOf(pet)) + '.');
  }
  if (care.id === 'soigner') {
    pet.health = clamp(pet.health + 9 * fit, 0, 100);
  }
  if (care.id === 'sortir') {
    shiftStats(state, { fitness: Math.round(2 * fit), stress: -Math.round(3 * fit) });
  }
  shiftStats(state, { happiness: 2 });
  lines.push(bondLabel(bondOf(pet)) + '.');

  return {
    ok: true,
    title: pet.name,
    tone: 'good',
    message: lines.join(' '),
  };
}

/* ------------------------------------------------------------------ */
/* S'en séparer                                                        */
/* ------------------------------------------------------------------ */

/** Ce qu'une séparation coûte, selon ce qu'il y avait. */
export function partingCost(pet: Pet): number {
  return Math.round(PART_FLOOR + (PART_FULL - PART_FLOOR) * (bondOf(pet) / 100));
}

export function partBlocker(state: GameState): string | null {
  if (state.player.prison) return 'Pas depuis une cellule.';
  return null;
}

/**
 * La confier à quelqu'un.
 *
 * Elle sort de la maison mais on sait où elle est, et c'est exactement ce qui
 * distingue confier de rendre : le chagrin est le même, amputé de ce que
 * savoir soulage.
 */
export function entrust(ctx: Ctx, petId: string, personId: string): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const pet = p.pets.find((x) => x.id === petId);
  const target = person(state, personId);
  if (!pet) return { ok: false, message: 'Cet animal n’existe pas.' };
  if (!target || !target.alive) return { ok: false, message: 'Cette personne n’est pas là.' };
  const blocker = partBlocker(state);
  if (blocker) return { ok: false, title: 'Impossible', message: blocker };

  const bond = bondOf(pet);
  const sting = Math.round(partingCost(pet) * (1 - ENTRUST_RELIEF));
  p.pets = p.pets.filter((x) => x.id !== pet.id);
  // Ce qu'on donne vaut ce qu'elle est devenue : une bête dressée et attachée
  // est un cadeau, une bête qu'on n'a jamais tenue est une charge.
  const warmth = ENTRUST_WARMTH * (0.4 + (bond / 100) * 0.6);
  target.relationship = clampStat(target.relationship + warmth);
  target.opinion = clampStat(target.opinion + warmth);
  target.history.push({
    year: state.year,
    text: `${p.firstName} lui a confié ${pet.name}.`,
  });
  shiftStats(state, { happiness: -sting, karma: 2 });
  ctx.log('family', `${pet.name} part vivre chez ${target.firstName}.`, 'neutral');
  return {
    ok: true,
    title: target.firstName,
    tone: bond >= 50 ? 'bad' : 'neutral',
    message: bond >= 50
      ? `${pet.name} part chez ${target.firstName}. Tu sauras où elle est, et ça ne suffit pas tout à fait.`
      : `${pet.name} part chez ${target.firstName}. Elle s’y fera vite.`,
  };
}

/**
 * La rendre.
 *
 * Le verbe que le jeu n'avait pas : on gardait une bête jusqu'à sa mort, même
 * ruiné, même en la rendant malheureuse. La rendre coûte en conscience à
 * proportion de ce qu'on avait construit — et c'est parfois quand même la
 * bonne décision.
 */
export function surrender(ctx: Ctx, petId: string): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const pet = p.pets.find((x) => x.id === petId);
  if (!pet) return { ok: false, message: 'Cet animal n’existe pas.' };
  const blocker = partBlocker(state);
  if (blocker) return { ok: false, title: 'Impossible', message: blocker };

  const bond = bondOf(pet);
  const content = clamp(pet.happiness, 0, 100);
  p.pets = p.pets.filter((x) => x.id !== pet.id);
  shiftStats(state, {
    happiness: -partingCost(pet),
    karma: -Math.round(SURRENDER_KARMA * (bond / 100)),
  });
  ctx.log('family', `Tu as ramené ${pet.name} au refuge.`, 'bad');
  return {
    ok: true,
    title: pet.name,
    tone: 'bad',
    message: content < MISERY
      ? `Elle sera mieux ailleurs que chez toi. C’est vrai, et ça ne rend pas la porte plus facile à refermer.`
      : `Elle ne comprend pas. C’est ce qu’il y a de pire.`,
  };
}

/* ------------------------------------------------------------------ */
/* L'année                                                             */
/* ------------------------------------------------------------------ */

/**
 * Le stress que les bêtes de la maison retirent cette année.
 *
 * Exporté pour pouvoir se mesurer sans rejouer une vie entière. Une bête
 * dressée compte davantage : un chien qui écoute est une présence, un chien
 * qui n'écoute pas est un travail.
 */
export function calmOf(state: GameState): number {
  let calm = 0;
  for (const pet of state.player.pets) {
    const trained = (1 - CALM_TRAINED) + CALM_TRAINED * (trainingOf(pet) / 100);
    calm += CALM * (bondOf(pet) / 100) * trained;
  }
  return Math.min(CALM * 1.6, calm);
}

/**
 * Ce que l'attention a acheté, entre 0 et 1.
 *
 * Trois parts, parce qu'aucun soin ne les couvre toutes : le lien vient de
 * tous, le contentement surtout des sorties, la santé surtout des soins. Une
 * bête à qui l'on tient mais qu'on laisse s'ennuyer n'est pas une bête bien
 * tenue — et un chien promené tous les jours qu'on ne regarde jamais de près
 * non plus.
 */
export function keptFactor(pet: Pet): number {
  const content = clamp(pet.happiness, 0, 100);
  const health = clamp(pet.health, 0, 100);
  return (bondOf(pet) / 100) * BOND_SHARE
    + (content / 100) * CONTENT_SHARE
    + (health / 100) * HEALTH_SHARE;
}

/**
 * Ce que l'état de la bête fait à sa fin.
 *
 * Lu par `advancePets`, qui décide de la mort. Bien tenue, elle meurt à peu
 * près deux fois moins souvent ; laissée, une fois et demie plus.
 */
export function deathFactor(pet: Pet): number {
  const kept = keptFactor(pet);
  return KEPT_BADLY + (KEPT_WELL - KEPT_BADLY) * kept;
}

/** Ce que la mort d'une bête coûte, selon ce qu'il y avait. */
export function griefOf(pet: Pet): number {
  return Math.round(GRIEF_FLOOR + (GRIEF_FULL - GRIEF_FLOOR) * (bondOf(pet) / 100));
}

/**
 * Une année de plus avec elle.
 *
 * L'ordre compte : on solde d'abord ce que l'année a donné (le lien qui
 * s'effrite faute d'avoir été nourri), puis ce que ça coûte au joueur, puis
 * les ennuis, puis les départs. Une bête qui part cette année n'a pas à faire
 * de dégâts en plus.
 */
export function advanceBeast(ctx: Ctx): void {
  const { state } = ctx;
  const p = state.player;
  if (p.pets.length === 0) return;

  for (const pet of [...p.pets]) {
    const nature = natureOf(speciesIdOf(pet));
    // `state.year` a déjà été incrémenté quand on arrive ici : l'année que le
    // joueur vient de vivre est celle d'avant.
    const touched = pet.tended === state.year - 1;

    // Ce qui n'a pas été nourri s'efface — moins vite quand il y a une
    // histoire derrière : un lien de dix ans ne se défait pas en un hiver.
    if (!touched) {
      const bond = bondOf(pet);
      pet.bond = clamp(bond - BOND_FADE * (1 - (bond / 100) * BOND_HELD), 0, 100);
      // Le besoin non couvert coûte à proportion de ce que l'espèce réclame.
      const demand = CONTENT_FLOOR + (1 - CONTENT_FLOOR) * nature.walk;
      pet.happiness = clamp(pet.happiness - CONTENT_DROP * demand, 0, 100);
    } else {
      // S'en occuper ralentit l'usure de l'année, sans l'annuler.
      pet.health = clamp(pet.health + CARE_HEALTH * keptFactor(pet), 0, 100);
    }

    const content = clamp(pet.happiness, 0, 100);

    // Les ennuis : une bête très demandeuse, jamais dressée, qui s'ennuie.
    const exposure = nature.walk * (1 - trainingOf(pet) / 100) * (1 - content / 100);
    const risk = TROUBLE * exposure;
    const salt = saltOf(pet.id);
    if (hash(state.year * 31 + p.age, salt) < risk) {
      const bill = Math.round(pet.annualCost * TROUBLE_COST);
      p.money -= bill;
      const line = TROUBLES[Math.floor(hash(state.year, salt ^ 0x5f5e_100) * TROUBLES.length)];
      ctx.log('family', `${pet.name} ${line}`, 'bad');
      shiftStats(state, { stress: 6, happiness: -4 });
    }

    // Ce qu'une bête malheureuse coûte, et ce qu'elle finit par faire.
    if (content < MISERY) {
      // Le compteur ne monte que sous le seuil profond : s'ennuyer n'est pas
      // souffrir, et l'on ne retire pas une bête qui s'ennuie.
      pet.misery = content < MISERY_DEEP ? (pet.misery ?? 0) + 1 : 0;
      // Le remords se paie pendant que ça se dégrade, pas jusqu'à la fin de
      // la vie. Sans cette borne, une bête reçue par un événement et jamais
      // regardée coûtait sept points de bonheur **par an, indéfiniment** : sur
      // une vie d'adulte, une taxe permanente pour un animal qu'on n'avait
      // pas choisi. Mesuré : l'espérance de vie générale reculait d'un an et
      // le nombre d'enfants par vie tombait de 0,98 à 0,94.
      if ((pet.misery ?? 0) <= MISERY_YEARS) {
        shiftStats(state, {
          happiness: -Math.round(NEGLECT_STING * (1 - content / MISERY)),
        });
      }
      if (pet.misery >= MISERY_YEARS && nature.walk >= MISERY_SEEN) {
        p.pets = p.pets.filter((x) => x.id !== pet.id);
        ctx.log(
          'family',
          `${pet.name} ne vit plus chez toi. Quelqu’un a fini par s’en apercevoir.`,
          'bad',
        );
        shiftStats(state, { happiness: -8, karma: -4 });
        continue;
      }
    } else {
      pet.misery = 0;
    }
  }

  // Ce que la maison rend, une fois pour toutes les bêtes.
  const calm = calmOf(state);
  if (calm >= 1) shiftStats(state, { stress: -Math.round(calm) });
}
