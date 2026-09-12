/**
 * Système de carrière : candidatures, entretiens, performance annuelle,
 * promotions, licenciements, retraite (§11).
 */

import { clampStat, normalize } from '../engine/rng.ts';
import { BASE, hiringChance, promotionChance, raiseChance } from '../engine/probability.ts';
import { getLocalOpportunities, getPsycheContext } from './contexts.ts';
import { applyExperience } from './psyche.ts';
import type { Ctx } from '../engine/context.ts';
import type { ActionResult, GameState, JobOffer } from '../engine/types.ts';
import { careerDrag } from './moonlight.ts';
import { getJob } from '../data/jobs.ts';
import { markFactor, openCase } from './dismissal.ts';
import { hiringEdge as legacyEdge } from './legacy.ts';
import {
  advanceWorkplace, buildTeam, computeSatisfaction, leaveTeam, workplaceSupport,
} from './workplace.ts';
import { getCountry } from '../data/countries.ts';
import { completedCourses, isInSchool } from './education.ts';
import { hireEdge, jobCapacity, paySwing } from './skills.ts';
import { networkEdge } from './cohort.ts';
import { effectiveLooks, readAs } from './appearance.ts';

export const RETIREMENT_AGE = 64;

/** Années d'expérience professionnelle cumulées. */
export function experienceYears(state: GameState): number {
  return Number(state.player.flags.experience ?? 0);
}

/** Le joueur remplit-il les conditions d'une offre ? Renvoie la raison sinon. */
export function offerBlocker(state: GameState, offer: JobOffer): string | null {
  const p = state.player;
  const job = getJob(offer.jobId);
  if (!job) return 'Poste indisponible.';
  if (p.age < job.minAge) return `Âge minimum : ${job.minAge} ans.`;
  if (p.education.level < offer.requiresLevel) return 'Diplôme insuffisant.';
  if (job.requiresCourse && !completedCourses(state).includes(job.requiresCourse)) {
    return 'Formation professionnelle requise.';
  }
  if (offer.requiresMajor) {
    const ok = p.education.degrees.some((d) => d.majorId && offer.requiresMajor!.includes(d.majorId));
    if (!ok) return 'Filière d’études non compatible.';
  }
  if (job.noRecord && p.criminalRecord.convictions.length > 0) return 'Casier judiciaire rédhibitoire.';
  if (experienceYears(state) < offer.minExperience) {
    return `${offer.minExperience} ans d’expérience requis (tu en as ${experienceYears(state)}).`;
  }
  return null;
}

/**
 * Candidature à une offre : entretien immédiat, résultat immédiat.
 *
 * `edge` est ce que l'entretien a valu, quand le joueur l'a passé lui-même.
 * Il **module** le calcul plutôt que de le remplacer : à 0,5 un entretien
 * raté fait mal sans condamner un dossier excellent, à 1,6 un bon entretien
 * rattrape un dossier moyen sans inventer un candidat. Sans argument, on
 * garde exactement le comportement d'avant — c'est la porte « envoyer la
 * candidature et voir », et tous les appels existants passent par là.
 */
export function applyToJob(ctx: Ctx, offerId: string, edge = 1): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const offer = state.world.jobOffers.find((o) => o.id === offerId);
  if (!offer) return { ok: false, message: 'Cette offre n’est plus disponible.' };
  if (p.prison) return { ok: false, message: 'Difficile de passer un entretien depuis une cellule.' };
  if (p.criminalRecord.wanted) {
    return {
      ok: false,
      title: 'Impossible',
      message: 'Il faudrait donner un nom et une adresse. Tu n’en as plus.',
    };
  }

  const blocker = offerBlocker(state, offer);
  if (blocker) return { ok: false, title: 'Candidature impossible', message: blocker };

  const applications = Number(p.yearActions[`apply_${offerId}`] ?? 0);
  if (applications >= 1) return { ok: false, message: 'Tu as déjà postulé à cette offre cette année.' };
  p.yearActions[`apply_${offerId}`] = 1;

  const job = getJob(offer.jobId)!;
  const majorMatch = !offer.requiresMajor
    || p.education.degrees.some((d) => d.majorId && offer.requiresMajor!.includes(d.majorId));
  const chance = hiringChance({
    eduGap: offer.requiresLevel - p.education.level,
    experienceGap: Math.max(0, offer.minExperience - experienceYears(state)),
    intelligence: p.stats.intelligence,
    // Ce qu'un recruteur voit : l'allure moins ce que la vie a inscrit.
    looks: effectiveLooks(state),
    reputation: p.stats.reputation,
    hasRecord: p.criminalRecord.convictions.length > 0,
    jobMarket: state.world.jobMarket,
    majorMatch,
  }) * getLocalOpportunities(state).hiring * getPsycheContext(state).hiring
    // Ce qu'on sait faire, à côté de ce qu'on a comme diplôme. C'est le seul
    // endroit du jeu où un autodidacte peut passer devant un diplômé.
    * hireEdge(state, offer.jobId, offer.level)
    // Les confrères de promotion déjà installés dans la filière que ce poste
    // demande. Ils ne pèsent nulle part ailleurs, et c'est ce qui donne son
    // prix au choix de la filière.
    * networkEdge(state, offer)
    // Et ce que l'entretien a valu, si le joueur l'a passé.
    * edge
    // Et l'allure qu'on tient : un registre soigné paie devant un recruteur
    // exactement autant qu'un registre marqué le dessert. Sans registre
    // choisi, ce facteur vaut 1.
    * readAs(state, 'embauche')
    /*
     * Et la marque d'une affaire perdue contre un ancien employeur. **Sans
     * elle, contester serait gratuit** : les honoraires étant déjà versés,
     * perdre ne coûterait rien qu'on n'ait déjà dépensé, et l'on tenterait
     * systématiquement. Voir `systems/dismissal.ts#markFactor`.
     */
    * markFactor(state)
    /*
     * Et le nom qu'on porte, **dans son domaine seulement** : l'enfant d'une
     * famille de médecins entre plus facilement en médecine, et nulle part
     * ailleurs. Voir `systems/legacy.ts#hiringEdge`.
     */
    * legacyEdge(state, job.category);

  if (!rng.chance(chance)) {
    p.stats.happiness = clampStat(p.stats.happiness - 3);
    return {
      ok: true,
      title: 'Entretien manqué',
      message: `${offer.employer} ne donne pas suite pour le poste de ${offer.title}.`,
      tone: 'bad',
    };
  }

  // Embauche : on quitte l'emploi précédent proprement.
  if (p.job) {
    const last = p.careerHistory[p.careerHistory.length - 1];
    if (last && last.to === null) last.to = state.year;
  }
  // On ne paie pas pareil quelqu'un qui sait déjà faire le travail.
  const paid = Math.round(offer.salary * paySwing(state, offer.jobId, offer.level));
  p.job = {
    jobId: offer.jobId,
    title: offer.title,
    level: offer.level,
    salary: paid,
    employer: offer.employer,
    performance: Math.round(clampStat(45 + p.stats.intelligence / 5 + p.stats.discipline / 6)),
    yearsAtJob: 0,
    effort: 'normal',
    lastRaiseAskYear: 0,
    partTime: false,
    hours: job.hours,
    satisfaction: 55,
    team: [],
    warnings: 0,
    leaveTaken: 0,
    // Un nouvel employeur ne sait rien de ce qu'on a fait chez le précédent.
    suspicion: 0,
    taken: 0,
    tookYear: 0,
  };
  p.careerHistory.push({ title: offer.title, employer: offer.employer, from: state.year, to: null });
  p.stats.happiness = clampStat(p.stats.happiness + 8);
  p.stats.reputation = clampStat(p.stats.reputation + 2);
  p.retired = false;
  state.world.jobOffers = state.world.jobOffers.filter((o) => o.id !== offerId);

  // L'équipe : collègues, rivaux, supérieur, ressources humaines. Tous des
  // PNJ persistants, avec un rôle et une influence réelle sur la carrière.
  p.job.team = buildTeam(ctx);
  p.job.satisfaction = computeSatisfaction(state).value;

  ctx.log('work', `Tu as été embauché${p.sex === 'F' ? 'e' : ''} comme ${offer.title} chez ${offer.employer}.`, 'good');
  return {
    ok: true,
    title: 'Embauche !',
    message: `${offer.employer} te recrute au poste de ${offer.title}.`,
    tone: 'good',
  };
}

export function setWorkEffort(ctx: Ctx, effort: 'slack' | 'normal' | 'overtime'): ActionResult {
  const p = ctx.state.player;
  if (!p.job) return { ok: false, message: 'Tu n’as pas d’emploi.' };
  p.job.effort = effort;
  const labels = {
    slack: 'en faire le moins possible',
    normal: 'faire ton travail correctement',
    overtime: 'multiplier les heures supplémentaires',
  };
  return { ok: true, title: 'Implication', message: `Tu décides de ${labels[effort]} cette année.`, tone: 'neutral' };
}

export function askForRaise(ctx: Ctx): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  if (!p.job) return { ok: false, message: 'Tu n’as pas d’emploi.' };
  if (p.yearActions.raise) return { ok: false, message: 'Tu as déjà demandé une augmentation cette année.' };
  p.yearActions.raise = 1;

  const chance = raiseChance({
    performance: p.job.performance,
    years: p.job.yearsAtJob,
    reputation: p.stats.reputation,
    askedRecently: state.year - p.job.lastRaiseAskYear <= 1,
  }) * hireEdge(state, p.job.jobId, p.job.level);
  p.job.lastRaiseAskYear = state.year;

  if (rng.chance(chance)) {
    const pct = rng.float(0.04, 0.14) * paySwing(state, p.job.jobId, p.job.level);
    p.job.salary = Math.round(p.job.salary * (1 + pct));
    p.stats.happiness = clampStat(p.stats.happiness + 7);
    ctx.log('work', `Tu as obtenu une augmentation de ${Math.round(pct * 100)} %.`, 'good');
    return { ok: true, title: 'Augmentation accordée', message: `Ton salaire passe à ${p.job.salary}.`, tone: 'good' };
  }
  p.stats.happiness = clampStat(p.stats.happiness - 4);
  p.stats.stress = clampStat(p.stats.stress + 5);
  if (rng.percent(8)) {
    p.job.performance = clampStat(p.job.performance - 8);
    return { ok: true, title: 'Refus sec', message: 'Non seulement c’est non, mais on te fait comprendre que la question était déplacée.', tone: 'bad' };
  }
  return { ok: true, title: 'Refus', message: 'On te répond que « ce n’est pas le moment ». Ça ne l’est jamais.', tone: 'bad' };
}

export function quitJob(ctx: Ctx): ActionResult {
  const { state } = ctx;
  const p = state.player;
  if (!p.job) return { ok: false, message: 'Tu n’as pas d’emploi.' };
  const title = p.job.title;
  const last = p.careerHistory[p.careerHistory.length - 1];
  if (last && last.to === null) last.to = state.year;
  leaveTeam(ctx);
  p.job = null;
  p.stats.stress = clampStat(p.stats.stress - 15);
  p.stats.happiness = clampStat(p.stats.happiness + 3);
  ctx.log('work', `Tu as démissionné de ton poste de ${title}.`, 'neutral');
  return { ok: true, title: 'Démission', message: `Tu quittes ton poste de ${title}. Plus de salaire à partir de l’an prochain.`, tone: 'neutral' };
}

export function retire(ctx: Ctx): ActionResult {
  const { state } = ctx;
  const p = state.player;
  if (p.retired) return { ok: false, message: 'Tu es déjà à la retraite.' };
  if (p.age < 55) return { ok: false, message: 'Tu ne peux pas partir à la retraite avant 55 ans.' };
  const worked = experienceYears(state);
  if (worked < 5) return { ok: false, message: 'Il faut au moins 5 ans de carrière pour liquider une pension.' };

  const lastSalary = p.job?.salary ?? 0;
  const country = getCountry(p.countryId);
  // Pension : proportionnelle au dernier salaire, à l'ancienneté et au pays.
  const rate = Math.min(0.72, 0.2 + worked * 0.012) * (0.55 + country.education * 0.5);
  const earlyPenalty = p.age < RETIREMENT_AGE ? 1 - (RETIREMENT_AGE - p.age) * 0.05 : 1;
  p.pension = Math.max(0, Math.round(lastSalary * rate * earlyPenalty));
  if (p.pension === 0) {
    p.pension = Math.round(8000 * country.salaryIndex * Math.min(1, worked / 25));
  }
  if (p.job) {
    const last = p.careerHistory[p.careerHistory.length - 1];
    if (last && last.to === null) last.to = state.year;
    leaveTeam(ctx);
    p.job = null;
  }
  p.retired = true;
  p.stats.stress = clampStat(p.stats.stress - 25);
  p.stats.happiness = clampStat(p.stats.happiness + 10);
  ctx.log('work', `Tu es parti${p.sex === 'F' ? 'e' : ''} à la retraite avec une pension de ${p.pension} par an.`, 'good');
  return { ok: true, title: 'Retraite', message: `Ta pension annuelle s’élève à ${p.pension}.`, tone: 'good' };
}

/** Progression annuelle de la carrière. */
export function advanceCareer(ctx: Ctx): void {
  const { state, rng } = ctx;
  const p = state.player;
  if (p.prison) return;
  if (!p.job) return;

  const job = getJob(p.job.jobId);
  if (!job) return;

  p.flags.experience = experienceYears(state) + 1;
  p.job.yearsAtJob += 1;

  // Performance : dérive selon l'effort, l'intelligence et le stress.
  const effortDelta = p.job.effort === 'overtime' ? 8 : p.job.effort === 'slack' ? -12 : 1;
  const stressPenalty = (p.stats.stress / 100) * 6;
  // La capacité tient à ce qu'on est, et à ce qu'on sait faire. Ce dernier
  // terme est le chemin par lequel une séance d'apprentissage finit en
  // promotion, puis en salaire.
  const capacity = (p.stats.intelligence / 100) * 5 + (p.stats.discipline / 100) * 5
    + jobCapacity(state);
  /*
   * Et ce qu'on prend ailleurs. **Ce terme n'existait pas** : on pouvait tenir
   * un plein temps, une activité indépendante et une entreprise sans que la
   * carrière n'en sache jamais rien, alors que `venture.ts#timeBudget` comptait
   * déjà les trois de l'autre côté. Nul tant qu'on reste sous le seuil — un
   * samedi en boutique ne ruine pas une carrière — et lourd au-delà.
   */
  const elsewhere = careerDrag(state);
  p.job.performance = clampStat(
    p.job.performance + effortDelta + capacity - stressPenalty - elsewhere - 2,
  );
  p.chronicle.peakPerformance = Math.max(p.chronicle.peakPerformance, p.job.performance);

  // Stress infligé par le poste.
  const jobStress = (job.stress / 100) * (p.job.effort === 'overtime' ? 14 : p.job.effort === 'slack' ? 4 : 9);
  p.stats.stress = clampStat(p.stats.stress + jobStress - 3);
  if (p.job.effort === 'overtime') {
    p.stats.health = clampStat(p.stats.health - 2);
    p.stats.happiness = clampStat(p.stats.happiness - 3);
  }
  if (job.physical) {
    p.stats.fitness = clampStat(p.stats.fitness + (p.age < 45 ? 1.5 : -0.5));
  }
  p.stats.reputation = clampStat(p.stats.reputation + job.respect / 12);

  // Indexation du salaire sur l'inflation.
  p.job.salary = Math.round(p.job.salary * (1 + 0.014 + state.world.economy * 0.01));

  // Promotion.
  const levelsRemaining = job.levels.length - 1 - p.job.level;
  const promo = promotionChance({
    performance: p.job.performance,
    intelligence: p.stats.intelligence,
    years: p.job.yearsAtJob,
    stress: p.stats.stress,
    reputation: p.stats.reputation,
    currentLevel: p.job.level,
    levelsRemaining,
    jobMarket: state.world.jobMarket,
  }) * getLocalOpportunities(state).promotion * getPsycheContext(state).promotion
    // Être bien vu de quelqu'un qui pèse compte autant qu'une bonne année.
    * (1 + workplaceSupport(state) * 0.5);
  if (rng.chance(promo)) {
    promote(ctx);
  } else if (rng.chance(layoffChance(ctx))) {
    fire(ctx, p.job.performance < 35 ? 'insuffisance professionnelle' : 'restructuration');
  }

  advanceWorkplace(ctx);

  // Retraite automatique très tardive.
  if (p.age >= 72 && rng.percent(45)) {
    retire(ctx);
  }
}

function layoffChance(ctx: Ctx): number {
  const p = ctx.state.player;
  if (!p.job) return 0;
  let chance = BASE.layoff;
  chance /= normalize(p.job.performance, 0.9);
  chance *= ctx.state.world.economy < -0.4 ? 2.4 : ctx.state.world.economy < 0 ? 1.4 : 0.85;
  if (p.job.effort === 'slack') chance *= 2.2;
  if (p.stats.addiction > 60) chance *= 1.6;
  // Les avertissements au dossier, et le fait d'avoir ou non quelqu'un pour
  // vous défendre quand la liste des départs se prépare.
  chance *= 1 + p.job.warnings * 0.35;
  chance *= Math.max(0.5, 1 - workplaceSupport(ctx.state) * 0.6);
  // Le plafond reste celui d'avant : les appuis et les avertissements font
  // varier le risque, ils ne doivent pas rendre les licenciements plus
  // fréquents en moyenne qu'ils ne l'étaient.
  return Math.min(0.4, chance);
}

export function promote(ctx: Ctx): boolean {
  const { state, rng } = ctx;
  const p = state.player;
  if (!p.job) return false;
  const job = getJob(p.job.jobId);
  if (!job || p.job.level >= job.levels.length - 1) return false;
  p.job.level += 1;
  p.chronicle.promotions += 1;
  const next = job.levels[p.job.level];
  const country = getCountry(p.countryId);
  const target = next.salary * country.salaryIndex * state.world.inflation
    * paySwing(state, p.job.jobId, p.job.level);
  p.job.salary = Math.round(Math.max(p.job.salary * 1.12, target * rng.float(0.92, 1.1)));
  p.job.title = next.title;
  p.job.yearsAtJob = 0;
  p.stats.happiness = clampStat(p.stats.happiness + 10);
  p.stats.reputation = clampStat(p.stats.reputation + 5);
  p.careerHistory.push({ title: next.title, employer: p.job.employer, from: state.year, to: null });
  const prev = p.careerHistory[p.careerHistory.length - 2];
  if (prev && prev.to === null) prev.to = state.year;
  ctx.log('work', `Promotion : tu deviens ${next.title} (${Math.round(p.job.salary)} par an).`, 'good');
  // Franchir un palier élevé est le genre de chose dont on se souvient.
  if (p.job.level >= 3) applyExperience(ctx, 'grandeRéussite');
  return true;
}

export function demote(ctx: Ctx): boolean {
  const p = ctx.state.player;
  if (!p.job || p.job.level <= 0) return false;
  const job = getJob(p.job.jobId);
  if (!job) return false;
  p.job.level -= 1;
  const lower = job.levels[p.job.level];
  p.job.title = lower.title;
  p.job.salary = Math.round(p.job.salary * 0.82);
  p.stats.happiness = clampStat(p.stats.happiness - 12);
  p.stats.reputation = clampStat(p.stats.reputation - 6);
  ctx.log('work', `Rétrogradation : tu redeviens ${lower.title}.`, 'bad');
  return true;
}

export function fire(ctx: Ctx, reason: string): void {
  const { state } = ctx;
  const p = state.player;
  if (!p.job) return;
  const title = p.job.title;
  const last = p.careerHistory[p.careerHistory.length - 1];
  if (last && last.to === null) last.to = state.year;
  /*
   * **Avant `leaveTeam`, et avant que `p.job` ne devienne nul.** Ce qui fait
   * la force d'un dossier — les avertissements, l'ancienneté, les gens qui
   * parleraient pour vous — n'existe plus une ligne plus bas. Et seulement
   * ici : démissionner n'ouvre aucun dossier, puisqu'on ne conteste pas son
   * propre départ. Voir `systems/dismissal.ts#openCase`.
   */
  openCase(ctx, p.job, reason);
  leaveTeam(ctx);
  p.job = null;
  p.stats.happiness = clampStat(p.stats.happiness - 14);
  p.stats.stress = clampStat(p.stats.stress + 18);
  p.stats.reputation = clampStat(p.stats.reputation - 4);
  ctx.log('work', `Tu as perdu ton poste de ${title} (${reason}).`, 'bad');
  applyExperience(ctx, 'licenciement');
}

/** Le joueur peut-il travailler cette année ? */
export function canWork(state: GameState): boolean {
  const p = state.player;
  return p.age >= 14 && !p.prison && !p.retired && !(isInSchool(state) && p.age < 16);
}
