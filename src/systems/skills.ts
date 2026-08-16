/**
 * Apprendre quelque chose.
 *
 * Le jeu avait beaucoup de chiffres qui montent, et pas un seul qu'on puisse
 * décider de faire monter : l'intelligence, la discipline et la forme
 * dérivent au fil des années sans qu'on s'y mette jamais. Le catalogue le
 * disait — « les compétences sont des statistiques diffuses ; rien à faire
 * monter délibérément » — et pointait à côté un événement d'enfance appelé
 * « Un don caché » dont les trois marqueurs (`talent_music`, `talent_sport`,
 * `talent_math`) n'étaient **relus nulle part**. On découvrait un don, il
 * n'existait pas.
 *
 * Ce fichier ajoute la seule chose qui manquait : une progression que le
 * joueur conduit. Trois règles la tiennent.
 *
 * **1. Le don est caché, et se cherche.** Chacun naît doué ou non pour
 * chacune des dix compétences, et l'ignore. Trois années d'essai révèlent où
 * l'on est bon. C'est ce qui fait de l'enfance — la période où l'on a le
 * temps d'essayer plusieurs choses sans conséquence — le bon moment pour
 * chercher, et ce qui donne enfin une suite à « Un don caché ».
 *
 * **2. Le don est tiré sans consommer d'aléa.** Par empreinte de la graine,
 * comme les naissances royales : dix tirages à la création décaleraient toute
 * la séquence du jeu pour chaque vie, et le don doit être le même pour une
 * graine donnée, qu'on regarde ses compétences ou non.
 *
 * **3. Ça sert.** Chacune des vingt-deux familles de métiers s'appuie sur une
 * compétence exactement. Elle pèse à l'embauche, sur le salaire proposé, et
 * sur ce qu'on vaut une fois au poste. Sans quoi ce serait une jauge de plus.
 */

import { clamp } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import type { ActionResult, GameState, SkillState } from '../engine/types.ts';
import {
  CEILING_BITE, FROM_INTEREST, FROM_SCHOOL, GAIN, GIFT_FLOOR, GIFT_RANGE,
  HIRE_SWING, KEEP, MIN_GAIN, NOTICED, ON_THE_JOB, PASSIVE_CAP, PAY_SWING,
  PER_YEAR, REVEAL, RUST,
  SKILLS, ageFactor, expectedFor, getSkill, giftOf, rankOf, skillForField,
  type Skill,
} from '../data/skills.ts';
import { getJob } from '../data/jobs.ts';
import { getCountry } from '../data/countries.ts';
import { isInSchool } from './education.ts';

export { SKILLS, ageFactor, getSkill, giftOf, rankOf, skillForField };
export type { Skill };

/* ------------------------------------------------------------------ */
/* Le don, tiré sans aléa                                              */
/* ------------------------------------------------------------------ */

/**
 * Une empreinte de la graine, stable et sans coût.
 *
 * Reprise de `systems/royalty.ts` pour la même raison : tirer dix aptitudes
 * au berceau décalerait la séquence aléatoire de toutes les vies, et ferait
 * dépendre le don de l'ordre dans lequel on regarde les choses.
 */
function seedDraw(seed: number, salt: number): number {
  let h = (Math.abs(Math.round(seed)) ^ (salt * 0x9e37_79b9)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85eb_ca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2_ae35) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4_294_967_296;
}

/**
 * Le don inné pour cette compétence-là, dans cette vie-là.
 *
 * Deux tirages moyennés plutôt qu'un : une seule empreinte donne une
 * distribution plate, où être nul et être prodige sont aussi fréquents
 * qu'être ordinaire. Deux rapprochent du milieu, ce qui laisse aux extrêmes
 * leur rareté — un don de quatre-vingt-dix reste une nouvelle.
 */
export function aptitudeOf(state: GameState, skillId: string): number {
  const index = SKILLS.findIndex((s) => s.id === skillId);
  if (index < 0) return 50;
  const a = seedDraw(state.seed, 101 + index * 7);
  const b = seedDraw(state.seed, 947 - index * 13);
  return Math.round(clamp((a + b) / 2 * 100, 2, 98));
}

/* ------------------------------------------------------------------ */
/* Lecture                                                            */
/* ------------------------------------------------------------------ */

/** Où l'on en est de cette compétence. */
export function stateOf(state: GameState, skillId: string): SkillState {
  const held = state.player.skills?.[skillId];
  if (held) return held;
  return { level: 0, peak: 0, done: 0 };
}

export function levelOf(state: GameState, skillId: string): number {
  return stateOf(state, skillId).level;
}

/** Sait-on déjà si l'on est doué pour ça ? */
export function giftKnown(state: GameState, skillId: string): boolean {
  return stateOf(state, skillId).done >= REVEAL;
}

/**
 * Ce qu'on peut en dire — ou qu'on ne peut pas encore.
 *
 * Trois phrases et non deux : la version longue (« Tu ne sais pas encore si
 * tu es fait pour ça. Encore 3 fois. ») se répétait à l'identique sur huit
 * lignes d'affilée, ce que le navigateur a montré — un mur de texte
 * indifférencié où plus rien ne se lit. Une compétence jamais tentée dit
 * simplement qu'elle ne l'a jamais été.
 */
export function giftLine(state: GameState, skillId: string): string {
  const done = stateOf(state, skillId).done;
  if (done >= REVEAL) return giftOf(aptitudeOf(state, skillId));
  if (done === 0) return 'Tu n’as jamais essayé.';
  const left = REVEAL - done;
  return left === 1 ? 'Encore une fois et tu sauras.' : `Encore ${left} fois et tu sauras.`;
}

/** Les compétences ouvertes à cet âge. */
export function availableSkills(state: GameState): Skill[] {
  return SKILLS.filter((s) => state.player.age >= s.from);
}

/** Combien on en a déjà travaillé cette année. */
export function workedThisYear(state: GameState): number {
  return Number(state.player.yearActions.skill ?? 0);
}

/**
 * Ce qu'une séance coûte ici.
 *
 * Recopié de `activities.ts#localPrice` plutôt qu'importé : ce module est lu
 * par `careers.ts`, et `activities.ts` traîne derrière lui les relations et
 * l'environnement. Deux lignes valent mieux qu'un cycle.
 */
export function priceOf(state: GameState, skill: Skill): number {
  const country = getCountry(state.player.countryId);
  return Math.round(skill.cost * country.costIndex * state.world.inflation);
}

/** Pourquoi on ne peut pas s'y mettre, ou rien. */
export function practiceBlocker(state: GameState, skillId: string): string | null {
  const skill = getSkill(skillId);
  if (!skill) return 'Rien à apprendre là.';
  const p = state.player;
  if (p.prison) return 'Pas d’ici.';
  if (p.age < skill.from) return `Trop tôt. À partir de ${skill.from} ans.`;
  if (workedThisYear(state) >= PER_YEAR) {
    return 'Tu as déjà pris assez de ton année pour apprendre.';
  }
  const price = priceOf(state, skill);
  if (p.money < price) return `Il te faudrait ${price.toLocaleString('fr-FR')} $.`;
  // On ne prend pas l'argent de quelqu'un pour ne rien lui apprendre.
  if (gainFor(state, skillId) < MIN_GAIN) return 'Tu n’as plus grand-chose à apprendre ici.';
  return null;
}

/* ------------------------------------------------------------------ */
/* Progresser                                                          */
/* ------------------------------------------------------------------ */

/**
 * Ce qu'une séance rapporte.
 *
 * Quatre facteurs, tous multiplicatifs, et chacun dit quelque chose : le don
 * (de 0,55 à 1,75), l'âge (un enfant apprend mieux, un vieillard apprend
 * quand même), ce que la statistique de la compétence apporte, et surtout ce
 * qu'il reste à prendre — de rien à correct est rapide, de solide à rare ne
 * l'est pas.
 */
export function gainFor(state: GameState, skillId: string): number {
  const skill = getSkill(skillId);
  if (!skill) return 0;
  const p = state.player;
  const gift = GIFT_FLOOR + (aptitudeOf(state, skillId) / 100) * GIFT_RANGE;
  const driver = 0.7 + (p.stats[skill.driver] / 100) * 0.6;
  const room = (1 - stateOf(state, skillId).level / 100) ** CEILING_BITE;
  return GAIN * gift * ageFactor(p.age) * driver * room;
}

/**
 * Approcher un plafond sans jamais l'atteindre tout à fait.
 *
 * Même forme que `rng.ts#toward`, mais sans arrondi : ce qu'un goût entretenu
 * rapporte vaut moins d'un point, et `clampStat` l'effacerait entièrement —
 * le canal existerait sans rien transmettre.
 */
function approach(current: number, ceiling: number, amount: number): number {
  if (current >= ceiling || amount <= 0) return current;
  const room = (ceiling - current) / Math.max(1, ceiling);
  return Math.min(ceiling, current + amount * room ** 0.6);
}

/** Poser un niveau, en tenant le meilleur jamais atteint. */
function set(state: GameState, skillId: string, level: number, done = 0): SkillState {
  const p = state.player;
  p.skills ??= {};
  const held = p.skills[skillId] ?? { level: 0, peak: 0, done: 0 };
  held.level = clamp(level, 0, 100);
  held.peak = Math.max(held.peak, held.level);
  held.done += done;
  p.skills[skillId] = held;
  return held;
}

/**
 * S'y mettre — l'action que le joueur décide.
 *
 * Elle prend une part de l'année (deux compétences au plus) et coûte de
 * l'argent : sans ces deux limites, un joueur patient monterait les dix à
 * cent, et le don ne voudrait plus rien dire.
 */
export function practice(ctx: Ctx, skillId: string): ActionResult {
  const { state } = ctx;
  const skill = getSkill(skillId);
  if (!skill) return { ok: false, message: 'Rien à apprendre là.' };
  const why = practiceBlocker(state, skillId);
  if (why) return { ok: false, title: skill.label, message: why };

  const p = state.player;
  const before = stateOf(state, skillId);
  const knewGift = giftKnown(state, skillId);
  const price = priceOf(state, skill);
  p.money -= price;
  p.yearActions.skill = workedThisYear(state) + 1;

  const gain = gainFor(state, skillId);
  const after = set(state, skillId, before.level + gain, 1);
  p.stats.discipline = clamp(p.stats.discipline + 0.6, 0, 100);

  const climbed = rankOf(after.level) !== rankOf(before.level);
  if (climbed) {
    ctx.log('life', `${skill.label} — ${rankOf(after.level).toLowerCase()}.`, 'good');
  }

  // La découverte du don : le seul moment du système qui apprenne quelque
  // chose au joueur sur son personnage plutôt que sur sa progression.
  if (!knewGift && giftKnown(state, skillId)) {
    const apt = aptitudeOf(state, skillId);
    ctx.log('life', `${skill.label} — tu sais maintenant : ${giftOf(apt).toLowerCase()}.`,
      apt >= 70 ? 'good' : apt < 30 ? 'bad' : 'neutral');
    return {
      ok: true,
      title: skill.label,
      tone: apt >= 70 ? 'good' : 'neutral',
      message: `Au bout de trois fois, tu sais à quoi t’en tenir : ${giftOf(apt).toLowerCase()}. `
        + `Tu en es à « ${rankOf(after.level).toLowerCase()} ».`,
    };
  }

  return {
    ok: true,
    title: skill.label,
    tone: 'good',
    message: climbed
      ? `Quelque chose a changé. Tu en es à « ${rankOf(after.level).toLowerCase()} ».`
      : `Une séance de plus. Tu en es à « ${rankOf(after.level).toLowerCase()} ».`,
  };
}

/* ------------------------------------------------------------------ */
/* Ce qui monte tout seul, et ce qui redescend                         */
/* ------------------------------------------------------------------ */

/** La compétence sur laquelle s'appuie le poste occupé. */
export function skillOfJob(state: GameState): Skill | undefined {
  const job = state.player.job ? getJob(state.player.job.jobId) : null;
  return job ? skillForField(job.category) : undefined;
}

/**
 * Encaisser ce qu'un professeur a remarqué.
 *
 * L'événement d'enfance pose un marqueur `talent_<compétence>` ; c'est ici
 * qu'il devient quelque chose. Il donne une avance, et il **révèle le don** :
 * c'est exactement ce que veut dire « quelqu'un a remarqué que tu étais doué
 * pour ça », et c'est ce qui manquait — le marqueur existait, rien ne le
 * relisait.
 *
 * Le marqueur est consommé : on ne l'encaisse qu'une fois.
 */
export function claimGifts(ctx: Ctx): void {
  const p = ctx.state.player;
  for (const key of Object.keys(p.flags)) {
    if (!key.startsWith('talent_')) continue;
    const skillId = key.slice('talent_'.length);
    const skill = getSkill(skillId);
    delete p.flags[key];
    if (!skill) continue;
    const before = stateOf(ctx.state, skillId);
    // Assez de séances comptées pour que le don soit connu : c'est le
    // professeur qui l'a vu, on n'a plus à le chercher.
    set(ctx.state, skillId, before.level + NOTICED, Math.max(0, REVEAL - before.done));
    ctx.log('life', `${skill.label} — on a vu quelque chose en toi : ${giftOf(aptitudeOf(ctx.state, skillId)).toLowerCase()}.`, 'good');
  }
}

/**
 * Une année de compétences.
 *
 * Le métier qu'on exerce, l'école qu'on suit et les goûts qu'on entretient
 * nourrissent ce qu'ils touchent — beaucoup plus lentement qu'une séance
 * décidée, mais sans qu'on y pense. Tout le reste rouille.
 *
 * L'oubli ne descend jamais sous une part du meilleur niveau atteint : on se
 * rouille, on n'oublie pas qu'on a su faire. Sans ce plancher, une vie de
 * cuisinier finissait par ne plus savoir cuire un œuf.
 */
export function advanceSkills(ctx: Ctx): void {
  const { state } = ctx;
  const p = state.player;
  claimGifts(ctx);
  const fed = new Set<string>();
  const schooled = isInSchool(state);

  // Ce qui monte sans qu'on le décide monte vers un plafond, jamais vers
  // cent : c'est la seule chose qui laisse une raison de s'y mettre.
  const onJob = skillOfJob(state);
  if (onJob && !p.prison) {
    set(state, onJob.id, approach(stateOf(state, onJob.id).level, PASSIVE_CAP, ON_THE_JOB));
    fed.add(onJob.id);
  }

  for (const skill of SKILLS) {
    if (p.age < skill.from) continue;
    let feed = 0;
    // L'école : une matière suivie où l'on tient la route. Une moyenne de
    // dix ne nourrit rien — c'est au-dessus que la matière apprend vraiment
    // quelque chose.
    if (schooled && skill.subjects) {
      for (const subjectId of skill.subjects) {
        const mark = p.education.marks[subjectId] ?? 0;
        if (mark > 10) feed += FROM_SCHOOL * ((mark - 10) / 10);
      }
    }
    // Les goûts : ce qu'on pratique pour le plaisir déteint.
    if (skill.interests) {
      for (const interestId of skill.interests) {
        if (Number(p.flags[`exposé:${interestId}`] ?? 0) > 0) feed += FROM_INTEREST;
      }
    }
    if (feed > 0) {
      set(state, skill.id, approach(stateOf(state, skill.id).level, PASSIVE_CAP, feed));
      fed.add(skill.id);
    }
  }

  // La rouille, pour tout ce qui n'a été ni travaillé ni nourri cette année.
  for (const skill of SKILLS) {
    if (fed.has(skill.id)) continue;
    const held = state.player.skills?.[skill.id];
    if (!held || held.level <= 0) continue;
    const floor = held.peak * KEEP;
    if (held.level > floor) held.level = Math.max(floor, held.level - RUST);
  }
}

/* ------------------------------------------------------------------ */
/* Ce que ça change                                                    */
/* ------------------------------------------------------------------ */

/**
 * Ce que la compétence fait à une candidature.
 *
 * Un multiplicateur autour de 1 : très en dessous du niveau attendu on divise
 * ses chances par deux, très au-dessus on les multiplie par une fois et
 * demie. Assez pour qu'un autodidacte doué décroche un poste qu'un diplômé
 * sans pratique n'aurait pas — ce qui est tout l'intérêt d'avoir des
 * compétences à côté des diplômes.
 */
export function hireEdge(state: GameState, jobId: string, level: number): number {
  return 1 + gapRatio(state, jobId, level) * HIRE_SWING;
}

/**
 * De combien on est au-dessus ou en dessous de ce que le poste attend, de
 * -1 à +1.
 *
 * L'écart est rapporté à ce que le poste demande, jamais à cent : un premier
 * échelon n'attend rien, et il ne faut pas qu'y être « très au-dessus » soit
 * impossible. C'est pourquoi l'échelle a un plancher.
 */
function gapRatio(state: GameState, jobId: string, level: number): number {
  const job = getJob(jobId);
  if (!job) return 0;
  const skill = skillForField(job.category);
  if (!skill) return 0;
  const want = expectedFor(level);
  const span = Math.max(20, want);
  return clamp((levelOf(state, skill.id) - want) / span, -1, 1);
}

/** Ce que la compétence fait au salaire proposé. */
export function paySwing(state: GameState, jobId: string, level: number): number {
  return 1 + gapRatio(state, jobId, level) * PAY_SWING;
}

/**
 * Ce que la compétence apporte à la tenue du poste.
 *
 * Ajouté à la capacité annuelle de `advanceCareer` : quelqu'un qui sait
 * faire son métier le fait mieux, et cela finit en promotions. C'est le
 * chemin par lequel une séance d'apprentissage devient un salaire.
 */
export function jobCapacity(state: GameState): number {
  const skill = skillOfJob(state);
  if (!skill) return 0;
  return (levelOf(state, skill.id) / 100) * 4;
}

/** Ce qu'on sait faire, du meilleur au reste. */
export function knownSkills(state: GameState): { skill: Skill; held: SkillState }[] {
  return SKILLS
    .map((skill) => ({ skill, held: stateOf(state, skill.id) }))
    .filter((row) => row.held.level > 0 || row.held.done > 0)
    .sort((a, b) => b.held.level - a.held.level);
}

/** Celle qu'on sait le mieux faire, s'il y en a une. */
export function bestSkill(state: GameState): { skill: Skill; held: SkillState } | null {
  const known = knownSkills(state);
  return known.length > 0 && known[0].held.level >= 24 ? known[0] : null;
}
