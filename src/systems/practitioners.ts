/**
 * Trouver quelqu'un de bien.
 *
 * **Ce que ce fichier remplace, mesuré dans le code et non supposé.** Il y
 * avait quatre types de praticien, chacun avec un prix fixe et une qualité
 * fixe, et l'écran affichait la qualité en toutes lettres : « Fiabilité du
 * diagnostic : 60 % ». Choisir son médecin consistait donc à lire deux nombres
 * et à prendre le plus grand qu'on pouvait payer. Il n'y avait rien à
 * découvrir, rien à regretter, et rien à apprendre.
 *
 * Quatre règles le remplacent, et chacune existe pour créer une décision.
 *
 * **1. La compétence est cachée.** On voit un prix et une réputation. Les deux
 * penchent dans le bon sens sans jamais trancher : un praticien très bien noté
 * est bon la plupart du temps, et de temps en temps non.
 *
 * **2. Le prix suit la réputation, pas la compétence.** Payer cher achète donc
 * un nom, pas de façon fiable de meilleurs soins. C'est la seule façon de
 * rendre l'argent utile sans le rendre décisif.
 *
 * **3. Un praticien qui passe à côté ne le dit pas.** Il ne dit pas « je ne
 * sais pas » : il dit **« rien d'anormal »**, mot pour mot comme après un
 * examen normal. Le joueur repart rassuré et la maladie continue de
 * s'aggraver (`health.ts#advanceDiseases`).
 *
 * **4. On apprend en vivant avec.** Au bout de trois consultations, on
 * commence à savoir ce que vaut le sien — plus vite si c'est son médecin
 * traitant. Changer coûte donc ce qu'on avait appris sur l'autre.
 *
 * **Ce que la mesure dit, et ce qu'elle ne dit pas.** Sur soixante vies menées
 * de vingt-cinq à soixante-dix ans :
 *
 *     personne                   santé 52 · 0,25 maladie ignorée
 *     un généraliste             santé 79 · 0,10
 *     un généraliste et un spé   santé 83 · 0,12
 *
 * **Avoir quelqu'un et y aller vaut vingt-sept points de santé** ; ajouter un
 * spécialiste en vaut quatre de plus, parce que lui seul regarde le cœur, le
 * cerveau et les tumeurs. En revanche, **prendre le meilleur praticien de la
 * ville plutôt que le pire ne change qu'un point ou deux** : la compétence
 * décide de la vitesse à laquelle on trouve, et sur une vie entière la
 * différence se rattrape. Le pari sur un inconnu est réel et son gain est
 * modeste — c'est ce que la mesure soutient, et rien de plus.
 *
 * Le cabinet d'une ville est **déduit de la graine et du nom de la ville**,
 * jamais tiré : dix tirages à la naissance décaleraient la séquence aléatoire
 * de toutes les vies, et les praticiens doivent être les mêmes qu'on ouvre
 * l'écran ou non. Déménager change de ville, donc change de cabinet — et l'on
 * repart sans rien savoir de personne.
 */

import { clamp } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import type { ActionResult, DoctorMemory, GameState } from '../engine/types.ts';
import {
  ER, PER_YEAR, READ_AFTER, REGULAR_DISCOUNT, REGULAR_LEARNS, RENOWN_NOISE,
  SKILL_FLOOR, SKILL_RANGE, SPECIALTIES, getSpecialty, type Specialty,
} from '../data/practitioners.ts';
import { getCountry } from '../data/countries.ts';
import { getDisease } from '../data/diseases.ts';
import { getNameSet } from '../data/names.ts';
import { clampStat } from '../engine/rng.ts';

export { SPECIALTIES, ER, getSpecialty };
export type { Specialty };

/** Un praticien du cabinet local. */
export interface Practitioner {
  id: string;
  name: string;
  specialtyId: string;
  /** Ce qu'il vaut vraiment. Jamais affiché tel quel. */
  skill: number;
  /** Ce qu'on en dit, 0-100. Corrélé à la compétence, imparfaitement. */
  renown: number;
  /** Ce qu'il demande, avant le pays et l'inflation. */
  fee: number;
}

/* ------------------------------------------------------------------ */
/* Le cabinet, déduit et non tiré                                      */
/* ------------------------------------------------------------------ */

/** Une empreinte stable, sans consommer d'aléa. */
function hash(seed: number, salt: number): number {
  let h = (Math.abs(Math.round(seed)) ^ (salt * 0x9e37_79b9)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85eb_ca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2_ae35) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4_294_967_296;
}

/** Le nom d'une ville, réduit à un nombre. */
function cityKey(name: string): number {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h = Math.imul(h ^ name.charCodeAt(i), 16777619) >>> 0;
  }
  return h;
}

/**
 * Les praticiens qu'on peut consulter ici.
 *
 * Déduits de la graine et de la ville, donc stables tant qu'on n'a pas
 * déménagé — et entièrement renouvelés quand on déménage, ce qui donne à
 * `environment.ts#relocatePlayer` une conséquence qu'il n'avait pas : on perd
 * son médecin en changeant de ville, comme dans la vie.
 */
export function panelOf(state: GameState): Practitioner[] {
  const p = state.player;
  const country = getCountry(p.countryId);
  const names = getNameSet(country.nameSet);
  const base = cityKey(`${p.cityName}|${p.countryId}`) ^ (state.seed >>> 0);
  // Ce que le pays fait au niveau moyen du cabinet : se soigner n'est pas la
  // même chose partout, et c'est déjà ce que dit le reste du jeu.
  const local = country.healthcare * 0.16;

  const out: Practitioner[] = [];
  let index = 0;
  for (const specialty of SPECIALTIES) {
    for (let i = 0; i < specialty.count; i++) {
      index += 1;
      const skill = clamp(
        SKILL_FLOOR + hash(base, index * 31 + 7) * SKILL_RANGE + local,
        0.2, 0.99,
      );
      /*
       * La réputation : la compétence, vue de loin et de travers. C'est le
       * seul chiffre que le joueur voit, et le fait qu'il puisse se tromper de
       * vingt-deux points est tout ce qui reste à découvrir dans ce système.
       */
      const renown = clamp(
        skill * 100 + (hash(base, index * 71 + 13) - 0.5) * 2 * RENOWN_NOISE,
        4, 99,
      );
      const female = hash(base, index * 53 + 3) < 0.52;
      const first = names[female ? 'female' : 'male'][
        Math.floor(hash(base, index * 97 + 5) * names[female ? 'female' : 'male'].length)
      ]!;
      const last = names.surnames[
        Math.floor(hash(base, index * 17 + 11) * names.surnames.length)
      ]!;
      out.push({
        id: `${specialty.id}_${index}`,
        name: `${first} ${last}`,
        specialtyId: specialty.id,
        skill,
        // Le tarif suit **la réputation**, jamais la compétence : c'est ce qui
        // fait qu'on peut payer cher pour rien, et pas cher pour beaucoup.
        renown,
        fee: Math.round(specialty.fee * (0.6 + (renown / 100) * 1.1)),
      });
    }
  }
  return out;
}

export function practitionerOf(state: GameState, id: string): Practitioner | undefined {
  return panelOf(state).find((d) => d.id === id);
}

/* ------------------------------------------------------------------ */
/* Ce qu'on sait d'eux                                                 */
/* ------------------------------------------------------------------ */

const NO_MEMORY: DoctorMemory = Object.freeze({ seen: 0, caught: 0, missed: 0 });

export function memoryOf(state: GameState, id: string): DoctorMemory {
  return state.player.doctors?.[id] ?? NO_MEMORY;
}

function remember(state: GameState, id: string): DoctorMemory {
  state.player.doctors ??= {};
  state.player.doctors[id] ??= { seen: 0, caught: 0, missed: 0 };
  return state.player.doctors[id];
}

/** Le médecin traitant, s'il y en a un et qu'il exerce encore ici. */
export function regularOf(state: GameState): Practitioner | undefined {
  const id = state.player.doctorId;
  return id ? practitionerOf(state, id) : undefined;
}

/**
 * Ce qu'on a fini par comprendre de lui, ou `null`.
 *
 * Trois consultations avant d'oser une opinion — moins pour son propre
 * médecin, qu'on voit dans d'autres circonstances. Le verdict porte sur la
 * compétence réelle, pas sur la réputation : c'est le seul endroit du système
 * où la vérité sort, et elle se paie en années de fréquentation.
 */
export function readOf(state: GameState, id: string): string | null {
  const doctor = practitionerOf(state, id);
  if (!doctor) return null;
  const held = memoryOf(state, id);
  const need = state.player.doctorId === id ? Math.ceil(READ_AFTER / REGULAR_LEARNS) : READ_AFTER;
  if (held.seen < need) return null;
  if (doctor.skill >= 0.86) return 'Tu as fini par comprendre : il ne passe pas à côté.';
  if (doctor.skill >= 0.68) return 'Sérieux, sans être infaillible.';
  if (doctor.skill >= 0.5) return 'Correct quand c’est évident. Le reste lui échappe.';
  return 'Tu as vu comment il travaille. Il expédie.';
}

/** Ce qu'il reste à faire avant de pouvoir se prononcer. */
export function readIn(state: GameState, id: string): number {
  const need = state.player.doctorId === id ? Math.ceil(READ_AFTER / REGULAR_LEARNS) : READ_AFTER;
  return Math.max(0, need - memoryOf(state, id).seen);
}

/* ------------------------------------------------------------------ */
/* Consulter                                                           */
/* ------------------------------------------------------------------ */

/**
 * Combien de praticiens on a vus cette année.
 *
 * Le compteur est global et non par praticien : sans cela on voyait tout le
 * cabinet dans la même année, et la compétence de chacun cessait de compter.
 */
export function consultedThisYear(state: GameState): number {
  return Object.keys(state.player.yearActions)
    .filter((k) => k.startsWith('consult_') && Number(state.player.yearActions[k] ?? 0) > 0)
    .length;
}

/** Ce qu'une consultation coûte ici. */
export function feeOf(state: GameState, id: string): number {
  const doctor = practitionerOf(state, id);
  const country = getCountry(state.player.countryId);
  const raw = doctor ? doctor.fee : ER.fee;
  const covered = 1 - country.healthcare * 0.8;
  const regular = doctor && state.player.doctorId === id ? REGULAR_DISCOUNT : 1;
  return Math.round(raw * country.costIndex * state.world.inflation * covered * regular);
}

/** Pourquoi on ne peut pas consulter, ou rien. */
export function consultBlocker(state: GameState, id: string): string | null {
  const p = state.player;
  if (p.prison) return 'Pas depuis la détention.';
  const key = `consult_${id}`;
  if (Number(p.yearActions[key] ?? 0) > 0) return 'Tu l’as déjà vu cette année.';
  if (consultedThisYear(state) >= PER_YEAR) {
    return 'Deux avis dans l’année, c’est déjà beaucoup.';
  }
  const fee = feeOf(state, id);
  if (p.money < fee) return `La consultation coûte ${fee.toLocaleString('fr-FR')} $.`;
  return null;
}

/** Prendre quelqu'un comme médecin traitant. */
export function register(ctx: Ctx, id: string): ActionResult {
  const { state } = ctx;
  const doctor = practitionerOf(state, id);
  if (!doctor) return { ok: false, message: 'Ce praticien n’exerce pas ici.' };
  if (state.player.doctorId === id) return { ok: false, message: 'C’est déjà le tien.' };
  const before = regularOf(state);
  state.player.doctorId = id;
  ctx.log('health', `${doctor.name} devient ton médecin traitant.`, 'neutral');
  return {
    ok: true,
    title: doctor.name,
    tone: 'good',
    message: before
      ? `Tu quittes ${before.name}. Ce que tu avais compris de lui ne te sert plus à rien.`
      : 'Consultations moins chères, et tu apprendras plus vite ce qu’il vaut.',
  };
}

/**
 * Consulter.
 *
 * Ce qui change par rapport à ce qu'on remplace : **il peut passer à côté, et
 * il ne le dit pas.** Quand rien n'est trouvé alors qu'il y avait quelque
 * chose, le message est le même que lorsqu'il n'y a rien — « rien d'anormal ».
 * Le joueur repart rassuré, et il l'apprendra plus tard.
 */
export function consultWith(ctx: Ctx, id: string): ActionResult {
  const { state, rng } = ctx;
  const doctor = practitionerOf(state, id);
  if (!doctor) return { ok: false, message: 'Ce praticien n’exerce pas ici.' };
  const specialty = getSpecialty(doctor.specialtyId);
  if (!specialty) return { ok: false, message: 'Ce praticien n’exerce pas ici.' };
  const why = consultBlocker(state, id);
  if (why) return { ok: false, title: doctor.name, message: why };

  const p = state.player;
  const fee = feeOf(state, id);
  p.money -= fee;
  p.yearActions[`consult_${id}`] = 1;
  const held = remember(state, id);
  held.seen += 1;

  const looked = p.diseases.filter((d) => {
    const def = getDisease(d.id);
    return !d.diagnosed && def && specialty.categories.includes(def.category);
  });

  const found: string[] = [];
  for (const active of looked) {
    if (rng.chance(doctor.skill)) {
      active.diagnosed = true;
      // Ce qu'elle valait déjà : c'est ce qui fait qu'un médecin qui trouve
      // tôt vaut mieux qu'un médecin qui finit par trouver.
      active.foundAt = active.severity;
      found.push(active.name);
      held.caught += 1;
      ctx.log('health', `${doctor.name} identifie : ${active.name}.`, 'neutral');
    } else {
      held.missed += 1;
    }
  }

  const treatable = p.diseases.filter((d) => {
    const def = getDisease(d.id);
    return d.diagnosed && def && specialty.categories.includes(def.category);
  });

  if (found.length > 0) {
    return {
      ok: true,
      title: doctor.name,
      tone: 'neutral',
      message: `Il trouve : ${found.join(', ')}. Le traitement se finance depuis l’onglet Santé. (${fee.toLocaleString('fr-FR')} $)`,
    };
  }

  if (looked.length > 0) {
    /*
     * **Le cœur du système.** Il n'a rien vu, et il ne dit pas qu'il n'a rien
     * vu : il dit qu'il n'y a rien. C'est indiscernable d'un examen normal —
     * et c'est ce qui fait qu'un mauvais médecin coûte des années plutôt que
     * de l'argent.
     */
    p.stats.stress = clampStat(p.stats.stress - 3);
    return {
      ok: true,
      title: doctor.name,
      tone: 'good',
      message: `Examen complet : rien d’anormal. Quelques conseils, et te voilà rassuré. (${fee.toLocaleString('fr-FR')} $)`,
    };
  }

  if (treatable.length > 0) {
    return {
      ok: true,
      title: doctor.name,
      tone: 'neutral',
      message: `Suivi de : ${treatable.map((d) => d.name).join(', ')}. Tu peux financer un traitement. (${fee.toLocaleString('fr-FR')} $)`,
    };
  }

  p.stats.health = clampStat(p.stats.health + rng.float(1, 3));
  p.stats.stress = clampStat(p.stats.stress - 4);
  return {
    ok: true,
    title: doctor.name,
    tone: 'good',
    message: `Examen complet : rien d’anormal. Quelques conseils d’hygiène de vie. (${fee.toLocaleString('fr-FR')} $)`,
  };
}

/**
 * Les urgences — le recours de qui n'a personne.
 *
 * Pas de choix, pas de réputation, rien à apprendre, et le tarif de l'urgence.
 * C'est ce que coûte de n'avoir pas de médecin, et c'est la seule porte
 * ouverte quand on vient d'arriver dans une ville.
 */
export function goToER(ctx: Ctx): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const country = getCountry(p.countryId);
  const fee = Math.round(
    ER.fee * country.costIndex * state.world.inflation * (1 - country.healthcare * 0.8),
  );
  if (p.prison) return { ok: false, message: 'Pas depuis la détention.' };
  if (Number(p.yearActions.er ?? 0) > 0) return { ok: false, message: 'Une fois par an suffit.' };
  if (p.money < fee) return { ok: false, message: `Les urgences coûtent ${fee.toLocaleString('fr-FR')} $.` };
  p.money -= fee;
  p.yearActions.er = 1;

  const found: string[] = [];
  for (const active of p.diseases) {
    const def = getDisease(active.id);
    if (active.diagnosed || !def || !ER.categories.includes(def.category)) continue;
    if (rng.chance(ER.skill)) {
      active.diagnosed = true;
      active.foundAt = active.severity;
      found.push(active.name);
    }
  }
  p.stats.stress = clampStat(p.stats.stress + 6);
  return {
    ok: true,
    title: 'Urgences',
    tone: found.length > 0 ? 'neutral' : 'good',
    message: found.length > 0
      ? `Quatre heures d’attente, puis quelqu’un te reçoit : ${found.join(', ')}. (${fee.toLocaleString('fr-FR')} $)`
      : `Quatre heures d’attente pour s’entendre dire que ça ira. (${fee.toLocaleString('fr-FR')} $)`,
  };
}

/* ------------------------------------------------------------------ */
/* Ce qu'on en dit                                                     */
/* ------------------------------------------------------------------ */

/** Ce que la réputation laisse entendre, en mots. */
export function renownLabel(renown: number): string {
  if (renown >= 82) return 'On se le repasse';
  if (renown >= 64) return 'Bien vu dans le quartier';
  if (renown >= 44) return 'Personne n’en dit rien';
  if (renown >= 26) return 'On en dit du mal';
  return 'Sa salle d’attente est vide';
}

/** Une ligne pour le menu. */
export function summary(state: GameState): string {
  const mine = regularOf(state);
  if (!mine) return 'Tu n’as pas de médecin. Il reste les urgences.';
  const said = readOf(state, mine.id);
  return said ?? `${mine.name} — tu ne sais pas encore ce qu’il vaut.`;
}
