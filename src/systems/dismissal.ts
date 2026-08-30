/**
 * Le dossier.
 *
 * **Ce que ce fichier ajoute.** `careers.ts#fire` faisait ceci : retirer le
 * poste, ôter quatorze points de bonheur, ajouter dix-huit de stress, écrire
 * une ligne. Six endroits du jeu l'appelaient et aucun ne laissait quoi que ce
 * soit à décider. Le catalogue : « aucun entretien préalable, aucun recours,
 * aucune seconde chance ».
 *
 * Ce qui manquait n'était pas une procédure mais **un moment** — perdre son
 * poste est l'événement le plus fréquent d'une carrière, et depuis
 * `office.ts` l'un des plus lourds, et il ne s'y passait rien.
 *
 * **La force du dossier ne se décide pas au moment de choisir.** Elle a été
 * faite pendant les années de poste : les avertissements qu'on n'a pas pris,
 * les gens qui parleraient pour vous, l'ancienneté, la performance tenue. Tout
 * cela est déjà écrit quand la porte se ferme, et c'est pourquoi le dossier
 * est un système de carrière et non un tirage de fin de partie. Le joueur ne
 * choisit pas sa force ; il choisit ce qu'il en fait.
 *
 * **Sur l'abstraction.** Ni juridiction, ni délai, ni pièce, ni démarche :
 * « la force du dossier » est un nombre tiré de ce que la partie a mémorisé,
 * et l'issue un tirage pondéré. Le jeu ne donne à personne la moindre marche
 * à suivre applicable ailleurs qu'à lui-même.
 */

import { clamp, clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import type { ActionResult, GameState, JobState } from '../engine/types.ts';
import {
  AWARD_YEARS, BASE_STRENGTH, CASE_YEARS, FEE_FLOOR, FEE_SHARE, GROUND_WORTH,
  GROUNDS, LOSS_MARK, MARK_YEARS, NO_CASE, RECORD_PIVOT, RECORD_WORTH,
  REINSTATE_AT, TENURE_FULL,
  TENURE_WORTH, VOICES_WORTH, WARNING_COST, getGround, type Ground,
} from '../data/dismissal.ts';
import { getJob } from '../data/jobs.ts';
import { buildTeam, workplaceSupport } from './workplace.ts';

export { GROUNDS, getGround };
export type { Ground };

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

export function caseOf(state: GameState) {
  return state.player.dismissal;
}

/** Le motif tel qu'on peut le lire, s'il en existe un de contestable. */
export function groundOf(state: GameState): Ground | undefined {
  return getGround(caseOf(state)?.ground ?? '');
}

/**
 * Ce que vaut le dossier, sur cent.
 *
 * Tout vient de ce que la partie a mémorisé au moment où la porte s'est
 * fermée : c'est un instantané, et il ne bouge plus. Un joueur qui a passé
 * quinze ans à se faire des appuis et à ne pas prendre d'avertissement se
 * retrouve avec un dossier solide sans y avoir jamais pensé — ce qui est le
 * but.
 */
export function strengthOf(state: GameState): number {
  const file = caseOf(state);
  if (!file) return 0;
  const ground = groundOf(state);
  const tenure = Math.min(1, file.years / TENURE_FULL) * TENURE_WORTH;
  // De −1 à 1 : une équipe hostile retire autant qu'une équipe acquise ajoute.
  const voices = clamp(file.support, -1, 1) * VOICES_WORTH;
  const record = clamp((file.performance - RECORD_PIVOT) / 45, -1, 1) * RECORD_WORTH;
  const blame = file.warnings * WARNING_COST;
  const stance = (ground?.weakness ?? 0) * GROUND_WORTH;
  return Math.round(clampStat(BASE_STRENGTH + tenure + voices + record + stance - blame));
}

/** Ce que la force du dossier veut dire, en mots. */
export function strengthSays(state: GameState): string {
  const s = strengthOf(state);
  if (s < 20) return 'Tu n’as rien à leur opposer.';
  if (s < 38) return 'Ce serait un pari, et un mauvais.';
  if (s < 55) return 'Ça pourrait se plaider. Ça pourrait aussi tourner court.';
  if (s < 72) return 'Tu as de quoi te défendre.';
  return 'Leur position ne tient pas, et ils le savent peut-être déjà.';
}

/** Ce que le dossier doit à chaque chose, pour que le joueur le voie. */
export function reasons(state: GameState): { label: string; weight: number }[] {
  const file = caseOf(state);
  if (!file) return [];
  const ground = groundOf(state);
  return [
    { label: 'Le motif invoqué', weight: Math.round((ground?.weakness ?? 0) * GROUND_WORTH) },
    { label: 'Tes années de maison', weight: Math.round(Math.min(1, file.years / TENURE_FULL) * TENURE_WORTH) },
    { label: 'Ceux qui parleraient pour toi', weight: Math.round(clamp(file.support, -1, 1) * VOICES_WORTH) },
    { label: 'Ce que valait ton travail', weight: Math.round(clamp((file.performance - RECORD_PIVOT) / 45, -1, 1) * RECORD_WORTH) },
    { label: 'Ce qu’il y a à ton dossier', weight: -Math.round(file.warnings * WARNING_COST) },
  ].filter((r) => r.weight !== 0);
}

/** Les honoraires, à verser d'avance. */
export function feeOf(state: GameState): number {
  const file = caseOf(state);
  if (!file) return 0;
  return Math.max(FEE_FLOOR, Math.round(file.salary * FEE_SHARE));
}

/** Ce qu'une négociation donnerait. */
export function settlementOf(state: GameState): number {
  const file = caseOf(state);
  const ground = groundOf(state);
  if (!file || !ground) return 0;
  /*
   * Les années comptent, et la faiblesse de la position d'en face aussi —
   * mais la force du dossier ne se convertit pas entièrement en argent : on
   * négocie contre ce qu'ils veulent éviter, pas contre ce qu'on vaut.
   */
  const years = Math.min(1.5, 0.4 + file.years / 12);
  return Math.round(file.salary * ground.settlement * years * (0.6 + strengthOf(state) / 200));
}

/**
 * Ce qu'une victoire rapporterait.
 *
 * **Sans ce chiffre, l'écran ment par omission.** La négociation annonce sa
 * somme ; la contestation n'annonçait que ses honoraires, si bien que le seul
 * montant lisible était celui du choix prudent. Mesuré, le meilleur choix
 * bascule trois fois sur la plage — et il ne dépend pas que de la force : un
 * motif qui se paie cher pour être oublié (la restructuration) récompense la
 * négociation, un motif qui n'offre rien (l'insubordination) ne laisse que la
 * contestation. Le joueur a besoin des deux sommes pour en juger ; il n'a pas
 * besoin qu'on juge à sa place, donc les chances restent à lire dans la force
 * du dossier plutôt que dans une espérance calculée.
 */
export function awardOf(state: GameState): number {
  const file = caseOf(state);
  if (!file) return 0;
  return Math.round(file.salary * AWARD_YEARS * (0.5 + strengthOf(state) / 160));
}

/** Une victoire rendrait-elle la place plutôt que de l'argent ? */
export function wouldReinstate(state: GameState): boolean {
  return strengthOf(state) >= REINSTATE_AT;
}

/* ------------------------------------------------------------------ */
/* Ouvrir                                                              */
/* ------------------------------------------------------------------ */

/**
 * Prendre l'instantané, au moment où la porte se ferme.
 *
 * Appelé par `careers.ts#fire`. **Tout doit être copié maintenant** : une
 * seconde plus tard, `p.job` est nul et l'équipe est dispersée — les
 * avertissements, l'ancienneté et les gens qui parleraient pour vous
 * n'existent plus nulle part. C'est la raison d'être de cette fonction, et
 * l'erreur qu'on ferait en la plaçant ailleurs.
 */
export function openCase(ctx: Ctx, job: JobState, ground: string): void {
  const { state } = ctx;
  if (NO_CASE.includes(ground)) return;
  if (!getGround(ground)) return;
  state.player.dismissal = {
    employer: job.employer,
    jobId: job.jobId,
    title: job.title,
    level: job.level,
    salary: job.salary,
    years: job.yearsAtJob,
    warnings: job.warnings,
    performance: job.performance,
    support: workplaceSupport(state),
    ground,
    year: state.year,
    settled: false,
    contestedYear: null,
  };
}

/* ------------------------------------------------------------------ */
/* Décider                                                             */
/* ------------------------------------------------------------------ */

/** Pourquoi on ne peut rien faire de ce dossier, ou rien. */
export function caseBlocker(state: GameState): string | null {
  const file = caseOf(state);
  if (!file) return 'Il n’y a pas de dossier.';
  if (file.settled) return 'C’est réglé.';
  if (file.contestedYear !== null) return 'L’affaire suit son cours.';
  if (state.player.prison) return 'Tu es incarcéré.';
  return null;
}

/** Prendre ce qu'ils proposent, et en rester là. */
export function settle(ctx: Ctx): ActionResult {
  const { state } = ctx;
  const why = caseBlocker(state);
  if (why) return { ok: false, message: why };
  const file = caseOf(state)!;
  const amount = settlementOf(state);
  file.settled = true;
  state.player.money += amount;
  state.player.stats.stress = clampStat(state.player.stats.stress - 8);
  ctx.log('work', `Départ négocié avec ${file.employer} : ${amount.toLocaleString('fr-FR')} $.`, 'neutral');
  return {
    ok: true,
    title: 'Réglé',
    tone: 'neutral',
    message: `${amount.toLocaleString('fr-FR')} $, et l’affaire s’arrête là. Personne n’ira regarder de plus près.`,
  };
}

/**
 * Contester.
 *
 * Rien ne se décide ici : on paie, et l'on attend. L'issue tombe dans
 * `advanceDismissal`, deux ans plus tard — ce qui laisse à la vie le temps de
 * continuer sans le salaire, et c'est une partie du coût.
 */
export function contest(ctx: Ctx): ActionResult {
  const { state } = ctx;
  const why = caseBlocker(state);
  if (why) return { ok: false, message: why };
  const file = caseOf(state)!;
  const fee = feeOf(state);
  if (state.player.money < fee) {
    return { ok: false, title: 'Contester', message: `Il faudrait ${fee.toLocaleString('fr-FR')} $ d’honoraires.` };
  }
  state.player.money -= fee;
  file.contestedYear = state.year;
  state.player.stats.stress = clampStat(state.player.stats.stress + 12);
  ctx.log('work', `Tu contestes ton départ de ${file.employer}.`, 'neutral');
  return {
    ok: true,
    title: 'Contesté',
    tone: 'neutral',
    message: `${fee.toLocaleString('fr-FR')} $ d’honoraires. Il faudra ${CASE_YEARS} ans, et vivre sans ce salaire pendant ce temps-là.`,
  };
}

/** Laisser tomber une affaire en cours. */
export function dropCase(ctx: Ctx): ActionResult {
  const { state } = ctx;
  const file = caseOf(state);
  if (!file || file.settled) return { ok: false, message: 'Il n’y a rien à abandonner.' };
  state.player.dismissal = null;
  return {
    ok: true,
    title: 'Abandonné',
    tone: 'neutral',
    message: 'Ce qui a été versé est perdu. Il y a d’autres choses à faire de sa vie.',
  };
}

/* ------------------------------------------------------------------ */
/* L'issue                                                             */
/* ------------------------------------------------------------------ */

/**
 * Une année d'affaire en cours.
 *
 * L'issue est tirée contre la force du dossier, telle qu'elle était au moment
 * de la fermeture. Trois fins : retrouver sa place — rare, et c'est la
 * carrière qui repart —, obtenir quelque chose, ou perdre et sortir avec une
 * marque qui pèse sur les embauches suivantes.
 */
export function advanceDismissal(ctx: Ctx): void {
  const { state, rng } = ctx;
  const p = state.player;
  const file = caseOf(state);
  if (!file) return;

  // Une affaire qu'on n'a pas ouverte s'éteint : on ne conteste pas dix ans après.
  if (file.contestedYear === null) {
    if (state.year - file.year > CASE_YEARS) p.dismissal = null;
    return;
  }
  if (state.year - file.contestedYear < CASE_YEARS) return;

  /*
   * On lit tout **avant** de refermer le dossier : la force et l'indemnité en
   * dépendent toutes deux, et `awardOf` ne saurait plus rien répondre une
   * ligne plus bas.
   */
  const strength = strengthOf(state);
  const award = awardOf(state);
  const won = rng.chance(clamp(strength / 100, 0.03, 0.94));
  p.dismissal = null;

  if (!won) {
    p.stats.reputation = clampStat(p.stats.reputation - LOSS_MARK);
    p.stats.happiness = clampStat(p.stats.happiness - 10);
    /*
     * **La marque.** Sans elle, contester serait gratuit : les honoraires
     * étant déjà versés, on tenterait toujours. Une affaire perdue se sait,
     * et le poste suivant est plus dur à obtenir — voir `careers.ts#applyToJob`.
     */
    p.flags.dismissalMark = state.year + MARK_YEARS;
    ctx.log('work', `Tu as perdu contre ${file.employer}. Cela se saura.`, 'bad');
    return;
  }

  const def = getJob(file.jobId);
  if (strength >= REINSTATE_AT && def && !p.job && !p.retired && !p.prison) {
    // Retrouver sa place : les années comptent toujours, et c'est là tout
    // l'intérêt — l'ancienneté est ce qui met le plus longtemps à se refaire.
    p.job = {
      jobId: file.jobId, title: file.title, level: file.level, salary: file.salary,
      employer: file.employer, performance: file.performance, yearsAtJob: file.years,
      effort: 'normal', lastRaiseAskYear: 0, partTime: false,
      hours: def.hours, satisfaction: 48, team: [], warnings: 0,
      leaveTaken: 0, suspicion: 0, taken: 0, tookYear: 0,
    };
    p.job.team = buildTeam(ctx);
    p.careerHistory.push({ title: file.title, employer: file.employer, from: state.year, to: null });
    p.stats.happiness = clampStat(p.stats.happiness + 16);
    ctx.log('work', `${file.employer} te reprend. Tes années comptent toujours.`, 'good');
    return;
  }

  p.money += award;
  p.stats.happiness = clampStat(p.stats.happiness + 10);
  ctx.log('work', `Tu as gagné contre ${file.employer} : ${award.toLocaleString('fr-FR')} $.`, 'good');
}

/**
 * Ce que la marque retire aux embauches, en facteur.
 *
 * Lu par `careers.ts#applyToJob`. Un chiffre plutôt qu'une porte fermée :
 * perdre une affaire rend le marché plus dur, pas impossible.
 */
export function markFactor(state: GameState): number {
  const until = Number(state.player.flags.dismissalMark ?? 0);
  return state.year < until ? 0.72 : 1;
}

/* ------------------------------------------------------------------ */
/* Ce qu'on en dit                                                     */
/* ------------------------------------------------------------------ */

/** Une ligne pour le menu. */
export function summary(state: GameState): string {
  const file = caseOf(state);
  if (!file) return '';
  if (file.contestedYear !== null) {
    const left = CASE_YEARS - (state.year - file.contestedYear);
    return left > 0 ? `Contesté — encore ${left} an(s)` : 'Contesté — l’issue est proche';
  }
  const ground = groundOf(state);
  return `${ground?.label ?? 'Départ'} de ${file.employer} · dossier ${strengthOf(state)}/100`;
}
