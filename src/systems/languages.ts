/**
 * Parler la langue du pays où l'on vit.
 *
 * Tout le reste du jeu traite un pays comme une collection de multiplicateurs.
 * Ils font qu'un pays est plus cher ou plus sûr ; ils ne font pas qu'on y soit
 * *étranger*. Ce fichier ajoute la seule chose qui distingue « vivre
 * ailleurs » de « vivre ici avec d'autres chiffres ».
 *
 * Quatre règles.
 *
 * **1. L'immersion fait presque tout, et l'âge décide.** Vivre dans un pays
 * enseigne sa langue bien plus vite qu'un cours, et un enfant apprend
 * plusieurs fois plus vite qu'un adulte installé. C'est le seul endroit du jeu
 * où l'âge *au moment d'un choix* pèse autant que le choix lui-même.
 *
 * **2. Ce qu'on sait déjà compte.** Une langue proche s'apprend vite. Choisir
 * où partir devient donc une décision, et pas seulement une comparaison de
 * salaires.
 *
 * **3. Ne pas parler coûte, tant que ça dure.** Sous un seuil, le diplôme et
 * l'expérience ne servent presque à rien : on trouve ce que trouve quelqu'un
 * qui ne parle pas. C'est ce qui donne son poids à l'expatriation.
 *
 * **4. Ça s'oublie.** Une langue qu'on n'emploie plus se perd lentement. Sans
 * cela, une vie de voyages accumulerait des langues comme des trophées, et
 * revenir n'aurait aucun sens.
 */

import { clamp } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import type { ActionResult, GameState } from '../engine/types.ts';
import {
  COUNTRY_LANGUAGE, FLUENT, IMMERSION, LANGUAGES, LESSON_COST, LESSON_GAIN,
  RUST, SOCIAL_FLOOR, WORK_FLOOR, easeFor, fluencyLabel, getLanguage,
  languagesOfCountry, strandedLabel,
} from '../data/languages.ts';
import { getCountry } from '../data/countries.ts';

export {
  LANGUAGES, WORK_FLOOR, SOCIAL_FLOOR, FLUENT, fluencyLabel, getLanguage,
  strandedLabel, languagesOfCountry,
};

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

export function levelsOf(state: GameState): Record<string, number> {
  return state.player.languages ?? {};
}

export function levelOf(state: GameState, id: string): number {
  return levelsOf(state)[id] ?? 0;
}

/** La langue qu'on a apprise en naissant. */
export function nativeLanguage(state: GameState): string {
  return COUNTRY_LANGUAGE[state.player.originCountryId] ?? 'en';
}

/** La langue qu'il faut là où l'on vit. */
export function localLanguage(state: GameState): string {
  return COUNTRY_LANGUAGE[state.player.countryId] ?? 'en';
}

/**
 * Ce qu'on comprend là où l'on vit.
 *
 * On retient la meilleure des langues qui dépannent sur place, pas seulement
 * la principale : c'est ce qui fait qu'un anglophone s'en sort aux Pays-Bas et
 * pas au Japon, et cela sans aucun cas particulier dans le code.
 */
export function fluencyHere(state: GameState): number {
  const usable = languagesOfCountry(state.player.countryId);
  return usable.reduce((best, id) => Math.max(best, levelOf(state, id)), 0);
}

/** Est-on chez soi, linguistiquement ? */
export function atHome(state: GameState): boolean {
  return fluencyHere(state) >= WORK_FLOOR;
}

/**
 * Ce que la langue fait à ce qu'on peut obtenir au travail, 0,35 à 1.
 *
 * Jamais zéro : quelqu'un qui ne parle pas trouve quand même quelque chose.
 * Mais un tiers de ce qu'il vaut, et c'est le sujet.
 */
export function workFactor(state: GameState): number {
  const level = fluencyHere(state);
  if (level >= WORK_FLOOR) return 1;
  return 0.35 + (level / WORK_FLOOR) * 0.65;
}

/** Ce que la langue fait aux liens qu'on noue, 0,45 à 1. */
export function socialFactor(state: GameState): number {
  const level = fluencyHere(state);
  if (level >= SOCIAL_FLOOR) return 1;
  return 0.45 + (level / SOCIAL_FLOOR) * 0.55;
}

/** Les langues qu'on parle un peu, de la meilleure à la moindre. */
export function spokenOf(state: GameState): { id: string; level: number }[] {
  return Object.entries(levelsOf(state))
    .filter(([, level]) => level >= 1)
    .map(([id, level]) => ({ id, level }))
    .sort((a, b) => b.level - a.level);
}

/* ------------------------------------------------------------------ */
/* Apprendre                                                           */
/* ------------------------------------------------------------------ */

/**
 * À quelle vitesse on apprend, selon l'âge.
 *
 * Fort jusqu'à l'adolescence, puis en baisse continue sans jamais s'annuler.
 * C'est ce qui fait qu'émigrer à vingt ans et à cinquante ne sont pas la même
 * décision.
 */
export function ageFactor(age: number): number {
  if (age <= 12) return 1.85;
  if (age >= 60) return 0.42;
  return 1.85 - ((age - 12) / 48) * 1.43;
}

/** Ce qu'une année sur place enseigne, tous modificateurs compris. */
export function immersionGain(state: GameState, id: string): number {
  const p = state.player;
  const level = levelOf(state, id);
  if (level >= 100) return 0;
  // Ce qui reste à apprendre se gagne de moins en moins vite : les derniers
  // points d'une langue sont les plus longs, comme partout dans le jeu.
  const room = Math.pow(1 - level / 100, 0.75);
  const exposure = 1
    + (p.job ? 0.35 : 0)
    + (p.education.stage !== 'none' && p.education.stage !== 'graduated' ? 0.3 : 0);
  return IMMERSION * room * ageFactor(p.age) * easeFor(levelsOf(state), id)
    * exposure * (0.7 + p.stats.intelligence / 220);
}

export function lessonCost(state: GameState): number {
  const country = getCountry(state.player.countryId);
  return Math.round(LESSON_COST * 40_000 * country.salaryIndex * state.world.inflation);
}

export function studyBlocker(state: GameState, id: string): string | null {
  const p = state.player;
  if (!getLanguage(id)) return 'Cette langue n’existe pas.';
  if (p.age < 8) return 'Tu es trop petit pour t’y mettre seul.';
  if (p.prison) return 'Pas depuis une cellule.';
  if (levelOf(state, id) >= 100) return 'Tu la parles déjà comme un natif.';
  if (Number(p.yearActions[`lang_${id}`] ?? 0) >= 1) {
    return 'Tu as déjà pris tes cours cette année.';
  }
  if (p.money < lessonCost(state)) return `Les cours coûtent ${lessonCost(state)}.`;
  return null;
}

/**
 * Prendre des cours.
 *
 * Bien moins efficace que d'y vivre, et c'est voulu : c'est ce qui rend
 * l'immersion précieuse plutôt que l'argent. Un cours reste le seul moyen
 * d'apprendre une langue qu'on n'entend pas autour de soi.
 */
export function study(ctx: Ctx, id: string): ActionResult {
  const { state } = ctx;
  const blocker = studyBlocker(state, id);
  if (blocker) return { ok: false, title: 'Impossible', message: blocker };
  const language = getLanguage(id)!;

  state.player.money -= lessonCost(state);
  state.player.yearActions[`lang_${id}`] = 1;
  const before = levelOf(state, id);
  const room = Math.pow(1 - before / 100, 0.75);
  const gain = LESSON_GAIN * room * ageFactor(state.player.age)
    * easeFor(levelsOf(state), id) * (0.7 + state.player.stats.intelligence / 220);
  setLevel(state, id, before + gain);
  const after = levelOf(state, id);

  ctx.log('school', `Des cours de ${language.label}.`, 'neutral');
  return {
    ok: true,
    title: language.label,
    tone: 'good',
    message: `${fluencyLabel(after)}. ${
      after > before + 4 ? 'Ça rentre.' : 'Ça vient lentement.'}`,
  };
}

function setLevel(state: GameState, id: string, value: number): void {
  state.player.languages ??= {};
  state.player.languages[id] = clamp(value, 0, 100);
}

/* ------------------------------------------------------------------ */
/* La naissance                                                        */
/* ------------------------------------------------------------------ */

/**
 * Ce qu'on parle en naissant.
 *
 * La langue du pays d'origine, complète. Rien d'autre : ce qu'on apprendra à
 * l'école ou ailleurs viendra plus tard, et se verra.
 */
export function nativeLanguages(countryId: string): Record<string, number> {
  const main = COUNTRY_LANGUAGE[countryId] ?? 'en';
  return { [main]: 100 };
}

/* ------------------------------------------------------------------ */
/* L'année                                                             */
/* ------------------------------------------------------------------ */

/**
 * Une année de langues.
 *
 * On apprend celle d'ici en y vivant, et l'on oublie lentement celles qu'on
 * n'emploie plus. La langue maternelle ne s'oublie pas : on peut la perdre en
 * partie dans la vraie vie, mais ici ce serait une punition sans décision
 * derrière, et le jeu n'en a pas besoin.
 */
export function advanceLanguages(ctx: Ctx): void {
  const { state } = ctx;
  const p = state.player;
  p.languages ??= {};
  const here = localLanguage(state);
  const native = nativeLanguage(state);

  /* 1. Ce qu'on apprend en vivant là où l'on vit. */
  const before = levelOf(state, here);
  const gain = immersionGain(state, here);
  if (gain > 0) {
    setLevel(state, here, before + gain);
    const after = levelOf(state, here);
    // On ne le dit qu'aux moments qui comptent : franchir un seuil.
    if (before < WORK_FLOOR && after >= WORK_FLOOR) {
      ctx.log(
        'life',
        `Tu travailles maintenant en ${getLanguage(here)?.label}. On ne te reprend plus.`,
        'good',
      );
    } else if (before < SOCIAL_FLOOR && after >= SOCIAL_FLOOR) {
      ctx.log('life', `Tu suis les conversations en ${getLanguage(here)?.label}.`, 'good');
    } else if (before < FLUENT && after >= FLUENT) {
      ctx.log('life', `On ne t’entend plus l’accent en ${getLanguage(here)?.label}.`, 'good');
    }
  }

  /* 2. Ce qui rouille. */
  for (const id of Object.keys(p.languages)) {
    if (id === here || id === native) continue;
    if (languagesOfCountry(p.countryId).includes(id)) continue;
    const level = levelOf(state, id);
    if (level <= 12) continue;
    // On ne descend pas sous « quelques mots » : ce qu'on a vraiment su, on en
    // garde toujours quelque chose.
    setLevel(state, id, Math.max(12, level - RUST));
  }
}
