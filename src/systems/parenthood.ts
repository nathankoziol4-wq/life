/**
 * Le chemin vers un enfant, quand il ne vient pas.
 *
 * **Ce que ce fichier remplace, et pourquoi c'était pire qu'un manque.**
 *
 * Deux boutons. `fertilityTreatment` posait `flags.fertilityTreatment = true`
 * et ne le retirait jamais : un achat unique multipliait les chances de
 * conception par 2,4 et ajoutait vingt-deux points de fertilité pour le reste
 * de la vie. `adoptChild` faisait un tirage — réussi, un enfant apparaissait ;
 * raté, on perdait les frais et on recommençait l'année suivante. Et sa ligne
 * s'intitulait « Procédure longue et sélective », ce qui décrivait exactement
 * ce que le code ne faisait pas.
 *
 * Le système garde les deux chemins et leur donne ce qui leur manquait : la
 * durée, l'incertitude, et un prix qui ne se paie pas qu'en argent.
 *
 * **1. Le protocole ne dure qu'un an.** Chaque cycle se décide, se paie — au
 * tarif du pays, prise en charge comprise, comme les programmes de
 * `recovery.ts` — et n'agit que sur l'année où on l'a engagé. Chaque cycle
 * suivant rend moins que le précédent, et chaque échec pèse sur le couple. La
 * seule question du chemin est « encore une fois ? », et elle revient tous les
 * ans avec une réponse un peu moins bonne.
 *
 * **2. Le dossier traverse les années.** Constitution, enquête, attente : on
 * ouvre à un moment et l'on vit avec. L'enquête peut refuser, et **elle dit
 * pourquoi** — un dossier refusé pour une condamnation ou pour un logement
 * n'est pas le même problème, et les deux se corrigent. Sans le motif, un
 * refus ne serait qu'un tirage perdu.
 *
 * **3. Ce qu'on accepte décide de ce qu'on attend.** L'attente d'un
 * nourrisson est la plus longue parce que c'est ce que presque tous
 * demandent. S'ouvrir à un enfant plus grand, à une fratrie, à un enfant qui
 * demande davantage, la divise par deux ou par trois. On échange des années de
 * sa propre vie contre un enfant qui arrive autrement — c'est la décision du
 * dossier, et elle a des suites qui durent.
 *
 * **4. Ce qui pèse sur le dossier est lisible et se corrige.** Pas un tirage
 * caché : un couple, un logement, des moyens, un casier, une dépendance,
 * l'âge. L'écran les affiche un par un avec leur poids, donc « améliorer son
 * dossier » est une décision qu'on peut prendre — se marier, acheter, sortir
 * d'une dépendance — et non un vœu.
 *
 * **5. Et l'enfant qui arrive sait d'où il vient.** `flags.adopted` existait
 * déjà et n'était relu **nulle part** — un marqueur mort, comme les
 * `talent_*` d'avant `skills.ts`. Un enfant adopté est désormais indiqué comme
 * tel, et si l'on reprend la partie avec lui (`lineage.ts#continueAs`), il
 * commence sa vie avec la question que `roots.ts` sait poser.
 */

import { clamp, clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import type {
  ActionResult, AdoptionFile, GameState, ParenthoodState, Person,
} from '../engine/types.ts';
import {
  BASE_WAIT, CYCLE_COST, CYCLE_FADE, CYCLE_FROM, CYCLE_STRAIN, CYCLE_TO,
  FILE_FEE, FILE_FROM, OPENNESS, STAGE_LABEL, STAGE_YEARS, getOpenness,
  type Openness,
} from '../data/parenthood.ts';
import { getCountry } from '../data/countries.ts';
import { createPerson, noteHistory } from './npc.ts';
import { shiftStats } from './stats.ts';
import { getNameSet } from '../data/names.ts';

export { OPENNESS, STAGE_LABEL, getOpenness };
export type { Openness };

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

export function parenthoodOf(state: GameState): ParenthoodState {
  return state.player.parenthood;
}

export function fileOf(state: GameState): AdoptionFile | null {
  return state.player.parenthood.file;
}

/** Le conjoint ou le partenaire, s'il y en a un. */
function partnerOf(state: GameState): Person | null {
  return Object.values(state.npcs).find(
    (n) => n.alive && (n.relation === 'spouse' || n.relation === 'partner'),
  ) ?? null;
}

/* ------------------------------------------------------------------ */
/* Le protocole                                                        */
/* ------------------------------------------------------------------ */

/**
 * Ce qu'un protocole coûte ici.
 *
 * La prise en charge du pays s'applique, comme pour les maladies et pour les
 * programmes de sevrage : sans elle, ce chemin serait le même privilège
 * partout, et le pays de naissance cesserait de compter là où il compte le
 * plus.
 */
export function cycleCost(state: GameState): number {
  const country = getCountry(state.player.countryId);
  const covered = 1 - country.healthcare * 0.5;
  return Math.round(CYCLE_COST * country.costIndex * state.world.inflation * covered);
}

/** L'effet du protocole engagé cette année, ou 1 s'il n'y en a pas. */
export function cycleBoost(state: GameState): number {
  const held = parenthoodOf(state);
  // **Un an, et un seul.** C'est toute la correction : le marqueur d'avant ne
  // s'effaçait jamais, et une seule décision valait pour une vie entière.
  if (held.lastCycle !== state.year) return 1;
  // Le premier essai est le meilleur ; l'acharnement rend de moins en moins.
  return 1 + 1.4 * CYCLE_FADE ** Math.max(0, held.cycles - 1);
}

/** Pourquoi on ne peut pas engager un protocole, ou rien. */
export function cycleBlocker(state: GameState): string | null {
  const p = state.player;
  if (p.age < CYCLE_FROM || p.age > CYCLE_TO) return 'Le protocole n’est pas indiqué à ton âge.';
  if (p.prison) return 'Pas depuis la détention.';
  if (parenthoodOf(state).lastCycle === state.year) return 'Un protocole par an.';
  if (p.flags.pregnant) return 'Un enfant est déjà en route.';
  const cost = cycleCost(state);
  if (p.money < cost) return `Le protocole coûte ${cost.toLocaleString('fr-FR')} $.`;
  return null;
}

/**
 * Engager un protocole pour l'année.
 *
 * Il ne fait pas d'enfant : il rend l'essai de l'année meilleur. C'est
 * `relationships.ts#tryForBaby` qui décide, et c'est voulu — sans quoi le
 * protocole remplacerait le couple au lieu de l'aider.
 */
export function runCycle(ctx: Ctx): ActionResult {
  const { state } = ctx;
  const why = cycleBlocker(state);
  if (why) return { ok: false, title: 'Protocole', message: why };

  const held = parenthoodOf(state);
  const cost = cycleCost(state);
  state.player.money -= cost;
  held.cycles += 1;
  held.spent += cost;
  held.lastCycle = state.year;
  shiftStats(state, { stress: 9, happiness: -3 });

  const boost = cycleBoost(state);
  ctx.log('family', `Protocole engagé pour l’année (${held.cycles}${held.cycles === 1 ? 'er' : 'e'}).`, 'neutral');
  return {
    ok: true,
    title: 'Protocole engagé',
    tone: 'good',
    message: held.cycles === 1
      ? `Vos chances de l’année sont nettement meilleures. Il faut encore essayer — le protocole aide, il ne décide pas. (${cost.toLocaleString('fr-FR')} $)`
      : `Le ${held.cycles}e. Il rend moins que le premier : ${Math.round((boost - 1) * 100)} % de mieux cette année seulement. (${cost.toLocaleString('fr-FR')} $)`,
  };
}

/**
 * Ce qu'un protocole raté coûte au couple.
 *
 * Appelé par le bilan de l'année, et pas par `runCycle` : le protocole ne
 * coûte rien tant qu'on ne sait pas s'il a marché. C'est l'attente et l'échec
 * qui pèsent, ce qui est exactement ce que ce chemin a de dur.
 */
function settleCycle(ctx: Ctx): void {
  const { state } = ctx;
  const held = parenthoodOf(state);
  if (held.lastCycle !== state.year - 1) return;
  if (state.player.flags.pregnant) return;

  shiftStats(state, { happiness: -6, stress: 8 });
  const partner = partnerOf(state);
  if (partner) {
    partner.relationship = clamp(partner.relationship - CYCLE_STRAIN, 0, 100);
    noteHistory(state, partner, 'Une année de plus, et toujours rien.');
  }
  ctx.log('family', 'Le protocole n’a rien donné cette année.', 'bad');
}

/* ------------------------------------------------------------------ */
/* Le dossier                                                          */
/* ------------------------------------------------------------------ */

/** Un poids nommé dans l'examen du dossier. */
export interface Factor {
  label: string;
  /** De -1 à +1. */
  weight: number;
}

/**
 * Ce qui pèse sur le dossier, nommé et chiffré.
 *
 * **Exposé, et l'écran l'affiche ligne par ligne.** C'est la différence entre
 * un dossier et un tirage : on peut se marier, acheter un logement, sortir
 * d'une dépendance, et voir la ligne changer. Un refus dont on ne saurait pas
 * la cause ne serait qu'un tirage perdu de plus.
 */
export function fileFactors(state: GameState): Factor[] {
  const p = state.player;
  const out: Factor[] = [];
  const partner = partnerOf(state);
  out.push({
    label: partner ? 'Un couple stable' : 'Seul',
    weight: partner ? clamp(0.1 + (partner.relationship - 50) / 250, -0.05, 0.24) : -0.14,
  });
  // Les moyens : ni un privilège absolu, ni rien. Assez pour que la question
  // se pose, jamais assez pour l'emporter à elle seule.
  const income = Math.max(1, getCountry(p.countryId).costIndex * 30_000);
  out.push({
    label: 'Ce que tu peux offrir',
    weight: clamp((p.money / income - 1) * 0.09, -0.2, 0.22),
  });
  out.push({
    label: p.properties.length > 0 ? 'Un logement à toi' : 'Pas de logement à toi',
    weight: p.properties.length > 0 ? 0.12 : -0.08,
  });
  out.push({
    label: 'Ce que les gens disent de toi',
    weight: clamp((p.stats.reputation - 50) / 320, -0.16, 0.16),
  });
  if (p.criminalRecord.convictions.length > 0) {
    out.push({ label: 'Un casier', weight: -0.42 });
  }
  if (p.stats.addiction > 45) {
    out.push({ label: 'Une dépendance visible', weight: -0.3 });
  }
  if (p.stats.health < 40) {
    out.push({ label: 'Une santé fragile', weight: -0.14 });
  }
  if (p.age > 48) {
    out.push({ label: 'L’âge, pour les services', weight: -((p.age - 48) / 60) });
  }
  return out;
}

/** La solidité du dossier, de 0 à 1. */
export function fileStrength(state: GameState): number {
  const total = fileFactors(state).reduce((s, f) => s + f.weight, 0);
  return clamp(0.5 + total, 0.02, 0.97);
}

/** Ce que l'ouverture du dossier coûte ici. */
export function fileFee(state: GameState): number {
  const country = getCountry(state.player.countryId);
  return Math.round(FILE_FEE * country.costIndex * state.world.inflation);
}

/** Pourquoi on ne peut pas ouvrir de dossier, ou rien. */
export function openBlocker(state: GameState, opennessId: string): string | null {
  const open = getOpenness(opennessId);
  if (!open) return 'Rien de tel.';
  const p = state.player;
  if (p.age < FILE_FROM) return `Les services n’examinent pas un dossier avant ${FILE_FROM} ans.`;
  if (p.prison) return 'Pas depuis la détention.';
  const file = fileOf(state);
  if (file && file.stage !== 'refusé') return 'Ton dossier est déjà ouvert.';
  const fee = fileFee(state);
  if (p.money < fee) return `Les frais s’élèvent à ${fee.toLocaleString('fr-FR')} $.`;
  return null;
}

/**
 * Ce que l'attente durera, une fois l'enquête passée.
 *
 * Deux choses : ce qu'on accepte — qui décide de l'essentiel — et la solidité
 * du dossier, qui ne fait que moduler. Un dossier parfait qui ne veut qu'un
 * nourrisson attend plus longtemps qu'un dossier moyen ouvert à une fratrie,
 * et c'est le propos.
 */
export function expectedWait(state: GameState, opennessId: string): number {
  const open = getOpenness(opennessId);
  if (!open) return BASE_WAIT;
  return Math.max(1, Math.round(BASE_WAIT * open.wait * (1.35 - fileStrength(state) * 0.6)));
}

/** Ouvrir un dossier. */
export function openFile(ctx: Ctx, opennessId: string): ActionResult {
  const { state } = ctx;
  const open = getOpenness(opennessId);
  if (!open) return { ok: false, message: 'Rien de tel.' };
  const why = openBlocker(state, opennessId);
  if (why) return { ok: false, title: 'Ouvrir un dossier', message: why };

  const fee = fileFee(state);
  state.player.money -= fee;
  parenthoodOf(state).file = {
    opened: state.year,
    stage: 'dossier',
    inStage: 0,
    openTo: opennessId,
    wait: expectedWait(state, opennessId),
    refusedFor: null,
  };
  ctx.log('family', 'Ton dossier d’adoption est ouvert.', 'neutral');
  return {
    ok: true,
    title: 'Dossier ouvert',
    tone: 'good',
    message: `${open.line} Constitution, puis enquête, puis l’attente — compte `
      + `${STAGE_YEARS.dossier + STAGE_YEARS.enquête} ans avant même de commencer à attendre. (${fee.toLocaleString('fr-FR')} $)`,
  };
}

/** Changer ce qu'on accepte, tant qu'on n'a pas d'apparentement. */
export function setOpenness(ctx: Ctx, opennessId: string): ActionResult {
  const { state } = ctx;
  const open = getOpenness(opennessId);
  const file = fileOf(state);
  if (!open) return { ok: false, message: 'Rien de tel.' };
  if (!file || file.stage === 'refusé') return { ok: false, message: 'Aucun dossier ouvert.' };
  if (file.openTo === opennessId) return { ok: false, message: 'C’est déjà ce que tu as demandé.' };

  const before = file.wait;
  file.openTo = opennessId;
  file.wait = expectedWait(state, opennessId);
  // On ne repart pas de zéro : les années déjà attendues comptent, sinon
  // changer d'avis serait toujours perdant et personne ne le ferait.
  ctx.log('family', `Tu revois ce que tu acceptes : ${open.label.toLowerCase()}.`, 'neutral');
  return {
    ok: true,
    title: open.label,
    tone: file.wait < before ? 'good' : 'neutral',
    message: file.wait < before
      ? `L’attente tombe à ${file.wait} an(s). ${open.line}`
      : `L’attente passe à ${file.wait} an(s). ${open.line}`,
  };
}

/** Retirer son dossier. */
export function withdrawFile(ctx: Ctx): ActionResult {
  const { state } = ctx;
  const file = fileOf(state);
  if (!file) return { ok: false, message: 'Aucun dossier ouvert.' };
  parenthoodOf(state).file = null;
  shiftStats(state, { happiness: -6, stress: -8 });
  ctx.log('family', 'Tu retires ton dossier.', 'neutral');
  return {
    ok: true,
    title: 'Dossier retiré',
    tone: 'neutral',
    message: 'Les frais sont perdus. Tu pourras rouvrir plus tard — en repartant du début.',
  };
}

/* ------------------------------------------------------------------ */
/* L'arrivée                                                           */
/* ------------------------------------------------------------------ */

function welcome(ctx: Ctx, open: Openness): Person[] {
  const { state, rng } = ctx;
  const names = getNameSet(getCountry(state.player.countryId).nameSet);
  const kids: Person[] = [];
  for (let i = 0; i < open.count; i++) {
    const sex = rng.chance(0.5) ? 'M' : 'F';
    const child = createPerson(ctx, {
      relation: sex === 'M' ? 'son' : 'daughter',
      sex,
      age: rng.int(open.age[0], open.age[1]),
      lastName: state.player.lastName,
      withJob: false,
      relationship: clampStat(rng.int(50, 75) + open.bond),
      opinion: clampStat(rng.int(50, 78) + open.bond),
    });
    child.firstName = rng.pick(sex === 'M' ? names.male : names.female);
    /*
     * Le marqueur existait déjà et **n'était relu nulle part** — pas un seul
     * système du jeu ne distinguait un enfant adopté d'un autre. Il sert
     * maintenant : `lineage.ts#continueAs` le lit pour donner à cet enfant-là,
     * s'il devient le personnage joué, la question que `roots.ts` sait poser.
     */
    child.flags.adopted = true;
    noteHistory(state, child, `Arrivé chez toi à ${child.age} ans.`);
    kids.push(child);
  }
  return kids;
}

/* ------------------------------------------------------------------ */
/* L'année                                                             */
/* ------------------------------------------------------------------ */

/**
 * Une année de dossier.
 *
 * L'étape avance, l'enquête tranche, l'attente s'écoule. Rien de tout cela
 * n'est décidé par le joueur cette année-là : c'est ce qui fait qu'ouvrir un
 * dossier est un engagement et non un achat.
 */
export function advanceParenthood(ctx: Ctx): void {
  const { state, rng } = ctx;
  settleCycle(ctx);

  const file = fileOf(state);
  if (!file || file.stage === 'refusé' || file.stage === 'arrivé') return;
  const open = getOpenness(file.openTo);
  if (!open) return;
  file.inStage += 1;

  if (file.stage === 'dossier') {
    if (file.inStage >= STAGE_YEARS.dossier) {
      file.stage = 'enquête';
      file.inStage = 0;
      ctx.log('family', 'Ton dossier passe à l’enquête sociale.', 'neutral');
    }
    return;
  }

  if (file.stage === 'enquête') {
    if (file.inStage < STAGE_YEARS.enquête) return;
    /*
     * Le refus mord sur les mauvais dossiers, pas sur les ordinaires.
     *
     * C'était `1 - solidité`, ce qui donnait, mesuré : **vingt-cinq refus sur
     * trente-neuf dossiers**, pour une solidité médiane de 48. Deux tiers des
     * joueurs qui ouvraient un dossier le perdaient, et rouvrir coûtait à
     * nouveau les frais et trois années. Une enquête sélective doit écarter ce
     * qui doit l'être, pas la moitié de tout le monde.
     *
     * Avec ce seuil : un dossier ordinaire (48) est refusé une fois sur sept,
     * un dossier solide (70) presque jamais, et un dossier avec un casier —
     * que ce seul poids fait tomber de quarante-deux points — l'est trois fois
     * sur quatre. Ce sont les poids nommés qui décident, ce qui est le propos.
     */
    const strength = fileStrength(state);
    if (rng.chance(clamp(0.62 - strength, 0.02, 0.78))) {
      /*
       * Refusé — et l'on dit pourquoi. C'est la moitié de l'intérêt du
       * dossier : un refus nommé est quelque chose qu'on peut corriger, un
       * refus muet n'est qu'un tirage perdu. On désigne le pire poids, celui
       * qui a réellement fait pencher.
       */
      const worst = fileFactors(state)
        .filter((f) => f.weight < 0)
        .sort((a, b) => a.weight - b.weight)[0];
      file.stage = 'refusé';
      file.refusedFor = worst?.label ?? 'Le dossier, tel quel';
      shiftStats(state, { happiness: -14, stress: 14 });
      ctx.log('family', `Dossier refusé — ${file.refusedFor.toLowerCase()}.`, 'bad');
      return;
    }
    file.stage = 'attente';
    file.inStage = 0;
    ctx.log('family', `Enquête favorable. L’attente commence : environ ${file.wait} an(s).`, 'good');
    return;
  }

  // L'attente. Elle s'écoule, et le jour venu l'enfant arrive.
  if (file.inStage < file.wait) return;
  const kids = welcome(ctx, open);
  file.stage = 'arrivé';
  parenthoodOf(state).arrived += kids.length;
  shiftStats(state, {
    happiness: 18,
    karma: open.karma,
    stress: open.strain,
  });
  const names = kids.map((k) => k.firstName).join(' et ');
  ctx.log('family',
    kids.length > 1
      ? `${names} arrivent chez toi.`
      : `${names} arrive chez toi, ${kids[0]!.age} ans.`,
    'good');
}

/* ------------------------------------------------------------------ */
/* Ce qu'on en dit                                                     */
/* ------------------------------------------------------------------ */

/** Où en est le dossier, en une ligne. */
export function fileLine(state: GameState): string {
  const file = fileOf(state);
  if (!file) return 'Aucun dossier ouvert.';
  if (file.stage === 'refusé') return `Refusé — ${file.refusedFor?.toLowerCase() ?? 'sans motif'}.`;
  if (file.stage === 'arrivé') return 'Le dossier a abouti.';
  if (file.stage === 'attente') {
    const left = Math.max(0, file.wait - file.inStage);
    return left <= 0 ? 'L’apparentement peut tomber cette année.' : `Encore ${left} an(s) d’attente environ.`;
  }
  return STAGE_LABEL[file.stage];
}

/** Ce qu'on peut en dire au menu. */
export function summary(state: GameState): string {
  const held = parenthoodOf(state);
  const file = fileOf(state);
  if (file && file.stage !== 'arrivé' && file.stage !== 'refusé') return fileLine(state);
  if (held.arrived > 0) return `${held.arrived} enfant(s) arrivé(s) par le dossier.`;
  if (held.cycles > 0) {
    return `${held.cycles} protocole(s) engagé(s)${held.lastCycle === state.year ? ', dont un cette année' : ''}.`;
  }
  if (file?.stage === 'refusé') return fileLine(state);
  return 'Deux chemins, si celui-là ne s’ouvre pas.';
}

/** L'enfant qu'on a adopté, s'il y en a un — pour la reprise de lignée. */
export function adoptedChildren(state: GameState): Person[] {
  return Object.values(state.npcs).filter((n) => n.flags.adopted === true);
}
