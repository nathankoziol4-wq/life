/**
 * Ce qui passe par tes mains.
 *
 * **Ce que ce fichier remplace.** Une ligne dans le menu des délits :
 * « Détournement de fonds — nécessite un emploi ». Le seul rôle du travail
 * était de rendre la ligne cliquable ; ensuite, un tirage entre trois mille
 * et cent quatre-vingt mille, le même pour un stagiaire de vingt et un ans et
 * pour un directeur de cinquante-huit. Le catalogue le disait sans détour :
 * « travailler quelque part n'ouvre aucune possibilité criminelle ».
 *
 * Ce qui le remplace fait du poste lui-même le système. **Le poste qui permet
 * de prendre le plus est celui qui coûte le plus à perdre** : il faut monter
 * pour approcher quelque chose, et l'on ne monte qu'en jouant le jeu pendant
 * des années. Le chemin honnête et le chemin malhonnête sont le même chemin,
 * et c'est ce qui n'existait nulle part ailleurs dans le jeu.
 *
 * Le joueur décide **une part, pas une somme** — voir `data/office.ts` —, et
 * il la décide *chaque année*, pendant toute une carrière. C'est un système
 * lent, et c'est délibéré : le crime du jeu était jusqu'ici une suite de
 * soirées : celui-ci est une pente qu'on descend sur trente ans.
 *
 * **Sur l'abstraction.** Il n'y a ici ni méthode, ni procédé, ni marche à
 * suivre. « La portée » et « le soupçon » sont deux nombres de jeu ; ce que
 * le joueur manipule, c'est une proportion et un rythme. Le système parle de
 * *place occupée* et d'*attention reçue*, jamais de *comment*. Il n'apprend
 * rien qui s'applique ailleurs qu'à lui — c'est la même règle que le boîtier
 * de `minigames/rings.ts`, tenue par un autre moyen.
 */

import { clamp, clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import type { ActionResult, GameState } from '../engine/types.ts';
import {
  COOL_FACTOR, COOL_FLAT, HELPINGS, REACH_BASE, REACH_CLIMB, REACH_KNOWN,
  REACH_FLOOR, REACH_TENURE, REVIEW_BASE, REVIEW_BOSS, REVIEW_RESIDUE, REVIEW_SLOPE,
  REVIEW_SUPPORT, REVIEW_WARNING, SUSPICION_CURVE, SUSPICION_FLOOR,
  SUSPICION_SCALE, getHelping, type Helping,
} from '../data/office.ts';
import { getJob } from '../data/jobs.ts';
import { CRIME_MAP } from '../data/crimes.ts';
import { bossOf, workplaceSupport } from './workplace.ts';
import { fire } from './careers.ts';
import { arrest } from './justice.ts';
import { addHeat } from './underworld.ts';
import { shiftStat } from './stats.ts';

export { HELPINGS, getHelping };
export type { Helping };

/* ------------------------------------------------------------------ */
/* La portée                                                           */
/* ------------------------------------------------------------------ */

/**
 * Où l'on en est sur l'échelle du métier, de zéro à un.
 *
 * Un métier à deux échelons n'a pas de milieu : le second est le sommet. Sans
 * le `max(1, …)`, un métier à un seul échelon divisait par zéro.
 */
export function ladderShare(state: GameState): number {
  const job = state.player.job;
  if (!job) return 0;
  const def = getJob(job.jobId);
  if (!def) return 0;
  return clamp(job.level / Math.max(1, def.levels.length - 1), 0, 1);
}

/**
 * Ce qui passe par ses mains, en argent par an.
 *
 * Trois choses, et elles se multiplient : le salaire (la taille de ce qu'on
 * touche), la place sur l'échelle **au carré** (ce qu'on approche), et les
 * années passées là (ce qu'on connaît). Un stagiaire n'approche rien ; un
 * directeur de quinze ans approche plusieurs fois ce qu'il gagne.
 */
export function reachOf(state: GameState): number {
  const job = state.player.job;
  if (!job) return 0;
  const share = ladderShare(state);
  const known = 1 - REACH_KNOWN + REACH_KNOWN * Math.min(1, job.yearsAtJob / REACH_TENURE);
  return Math.round(job.salary * (REACH_BASE + REACH_CLIMB * share * share) * known);
}

/** Le soupçon accumulé chez cet employeur-ci. */
export function suspicionOf(state: GameState): number {
  return clampStat(state.player.job?.suspicion ?? 0);
}

/** Ce qu'on a pris chez cet employeur-ci. */
export function takenOf(state: GameState): number {
  return Math.max(0, state.player.job?.taken ?? 0);
}

/** Ce que rapporterait une portion, et ce qu'elle ajouterait au soupçon. */
export function previewHelping(state: GameState, helping: Helping): { gain: number; adds: number } {
  const gain = Math.round(reachOf(state) * helping.share);
  const adds = gain <= 0
    ? 0
    : SUSPICION_SCALE * helping.share ** SUSPICION_CURVE + SUSPICION_FLOOR;
  return { gain, adds: Math.round(adds * 10) / 10 };
}

/** Ce que le soupçon veut dire, en mots. */
export function suspicionSays(state: GameState): string {
  const s = suspicionOf(state);
  if (s < 3) return 'Personne n’a de raison de te regarder.';
  if (s < 12) return 'Rien d’anormal, pour qui ne cherche pas.';
  if (s < 30) return 'Un écart, quelque part, que personne n’a encore relevé.';
  if (s < 55) return 'Assez pour qu’une question soit posée un jour.';
  if (s < 80) return 'Il faudrait très peu de curiosité pour trouver.';
  return 'La prochaine personne qui regarde trouvera.';
}

/* ------------------------------------------------------------------ */
/* Prendre                                                             */
/* ------------------------------------------------------------------ */

/** Pourquoi on ne peut pas se servir, ou rien. */
export function helpBlocker(state: GameState, helping?: Helping): string | null {
  const p = state.player;
  if (p.prison) return 'Tu es incarcéré.';
  if (!p.job) return 'Il faut une place quelque part.';
  if (p.yearActions.office) return 'C’est décidé pour cette année.';
  /*
   * Le seuil dit ce que « rien » veut dire : en dessous, la plus grosse
   * portion rapporterait moins que quelques jours de salaire, et ouvrir
   * l'écran serait une promesse vide.
   */
  if (reachOf(state) < REACH_FLOOR) {
    return 'À ta place, rien d’intéressant ne passe par tes mains.';
  }
  if (helping && previewHelping(state, helping).gain < 1) return 'Il n’y a rien à prendre.';
  return null;
}

/**
 * Se servir, cette année.
 *
 * Rien ne se résout ici : ce que le geste fait, c'est de l'argent et du
 * soupçon. **Le sort se joue ailleurs et plus tard**, dans `advanceOffice`,
 * quand quelqu'un regarde. C'est ce décalage qui fait le système : on n'est
 * jamais puni pour l'année en cours, on est puni pour l'ensemble.
 */
export function help(ctx: Ctx, helpingId: string): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const helping = getHelping(helpingId);
  if (!helping) return { ok: false, message: 'Rien de tel.' };
  const why = helpBlocker(state, helping);
  if (why) return { ok: false, title: helping.label, message: why };
  const job = p.job;
  if (!job) return { ok: false, message: 'Il faut une place quelque part.' };

  const { gain, adds } = previewHelping(state, helping);
  p.yearActions.office = 1;
  /*
   * **L'année, et non un drapeau d'action.** `yearActions` est vidé au tout
   * début de `simulateYear`, avant que la moindre étape annuelle ne tourne :
   * un drapeau posé par le joueur n'y serait plus au moment où le soupçon
   * doit décider s'il redescend. C'est l'année qui porte l'information.
   */
  job.tookYear = state.year;
  p.money += gain;
  job.taken += gain;
  job.suspicion = clampStat(suspicionOf(state) + adds);
  p.chronicle.taken = (p.chronicle.taken ?? 0) + gain;

  /*
   * Le milieu ne s'en aperçoit qu'à peine : ce qui monte ici, c'est le
   * soupçon **au bureau**, pas la chaleur policière. Les deux existent
   * séparément, et c'est le sujet — on peut se faire prendre au travail sans
   * qu'aucun policier n'ait jamais entendu parler de vous.
   */
  addHeat(ctx, adds * 0.12);
  p.stats.stress = clampStat(p.stats.stress + 3 + adds * 0.3);
  p.stats.criminality = clampStat(p.stats.criminality + 1 + adds * 0.12);
  shiftStat(state, 'karma', -Math.round(2 + adds * 0.4));

  ctx.log('crime', `Tu t’es servi chez ${job.employer}. (${gain.toLocaleString('fr-FR')} $)`, 'neutral');
  return {
    ok: true,
    title: helping.label,
    tone: adds > 20 ? 'bad' : 'neutral',
    message: `${gain.toLocaleString('fr-FR')} $. ${helping.line} ${suspicionSays(state)}`,
  };
}

/*
 * **Il n'y a pas de bouton « ne rien prendre ».**
 *
 * Il en existait un, et il a été retiré avant d'être livré : son effet était
 * exactement celui de ne pas appuyer. Une ligne qui ne fait rien de plus que
 * l'inaction n'est pas une décision, c'est un décor qui donne l'impression
 * d'en être une. Ce que l'écran doit faire à la place, c'est **dire** ce
 * qu'une année tranquille ferait redescendre — voir `coolingTo`.
 */

/** Où le soupçon serait l'an prochain si l'on ne prenait rien. */
export function coolingTo(state: GameState): number {
  return Math.max(0, Math.round(suspicionOf(state) * COOL_FACTOR - COOL_FLAT));
}

/* ------------------------------------------------------------------ */
/* Le regard                                                           */
/* ------------------------------------------------------------------ */

/** La chance qu'on regarde cette année. */
export function reviewChance(state: GameState): number {
  const p = state.player;
  if (!p.job) return 0;
  const boss = bossOf(state);
  /*
   * Un supérieur compétent **et** écouté regarde mieux. Le produit plutôt que
   * la somme : quelqu'un de très compétent sans poids ne déclenche rien, et
   * quelqu'un de très écouté qui n'y comprend rien non plus.
   */
  const eye = boss
    ? 1 + REVIEW_BOSS * (boss.role.competence / 100) * (boss.role.influence / 100)
    : 1;
  // Et l'on regarde d'abord ceux à qui l'on ne doit rien.
  const owed = 1 - workplaceSupport(state) * REVIEW_SUPPORT;
  return clamp((REVIEW_BASE + suspicionOf(state) / REVIEW_SLOPE) * eye * owed, 0, 0.9);
}

/**
 * Une année au bureau, du côté de ce qui n'est pas déclaré.
 *
 * Deux choses, dans cet ordre : quelqu'un regarde, ou non ; et si l'on
 * regarde, ce qu'on trouve dépend de **ce qui s'est accumulé** et non de
 * l'année écoulée. Une année sage après dix années gourmandes ne sauve
 * personne, et c'est précisément ce qui manquait au tirage d'avant.
 */
export function advanceOffice(ctx: Ctx): void {
  const { state, rng } = ctx;
  const p = state.player;
  const job = p.job;
  if (!job) return;

  const suspicion = suspicionOf(state);
  /*
   * L'année qui vient de s'écouler est `state.year - 1` : le compteur a déjà
   * été avancé au tout début de `simulateYear`.
   */
  const untouched = (job.tookYear ?? -1) < state.year - 1;

  // Une année sans rien prendre fait redescendre.
  if (untouched && suspicion > 0) {
    job.suspicion = clampStat(suspicion * COOL_FACTOR - COOL_FLAT);
  }

  // Rien à trouver, personne à inquiéter.
  if (suspicion < 1 && job.taken <= 0) return;
  if (!rng.chance(reviewChance(state))) return;

  /*
   * On regarde. Ce qu'on trouve tient à ce qui s'est accumulé — le soupçon —
   * et non à ce que l'année a rapporté.
   */
  if (rng.chance(suspicion / 100)) {
    caught(ctx);
    return;
  }

  // On a regardé sans conclure. Cela laisse deux traces : un avertissement,
  // parfois, et un soupçon qui ne repart pas de zéro.
  job.suspicion = clampStat(suspicion * REVIEW_RESIDUE);
  if (rng.chance((suspicion / 100) * REVIEW_WARNING)) {
    job.warnings += 1;
    job.satisfaction = clampStat(job.satisfaction - 10);
    p.stats.stress = clampStat(p.stats.stress + 14);
    ctx.log('work', 'On t’a posé des questions. Rien n’a été retenu contre toi.', 'bad');
  }
}

/**
 * Trouvé.
 *
 * Tout ce qui suit existait déjà et n'est pas réécrit : le poste se perd par
 * `careers.ts#fire`, la suite judiciaire par `justice.ts#arrest` avec la
 * fiche du délit qui était jusqu'ici la seule chose que le jeu en avait —
 * procès, avocat, peine, casier. **Et c'est le casier qui fait mal** : il
 * ferme les métiers marqués `noRecord`, c'est-à-dire l'essentiel de ce qu'on
 * avait mis trente ans à atteindre.
 */
function caught(ctx: Ctx): void {
  const { state } = ctx;
  const p = state.player;
  const job = p.job;
  if (!job) return;
  const employer = job.employer;
  const seized = Math.round(Math.min(p.money, job.taken));

  ctx.log('crime', `Chez ${employer}, quelqu’un a regardé de près.`, 'bad');
  fire(ctx, 'faute grave');
  const crime = CRIME_MAP.embezzle;
  const outcome = crime ? arrest(ctx, crime, seized) : '';
  p.chronicle.caughtAtWork = (p.chronicle.caughtAtWork ?? 0) + 1;
  if (outcome) ctx.log('crime', outcome, 'bad');
}

/* ------------------------------------------------------------------ */
/* Ce qu'on en dit                                                     */
/* ------------------------------------------------------------------ */

/** Une ligne pour le menu du travail. */
export function summary(state: GameState): string {
  if (!state.player.job) return '';
  const reach = reachOf(state);
  if (reach < REACH_FLOOR) return 'À ta place, rien ne passe par tes mains.';
  const taken = takenOf(state);
  const head = `${reach.toLocaleString('fr-FR')} $ passent par tes mains`;
  return taken > 0
    ? `${head} · ${taken.toLocaleString('fr-FR')} $ pris ici`
    : head;
}
