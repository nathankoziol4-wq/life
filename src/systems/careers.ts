/**
 * Système de carrière : candidatures, entretiens, performance annuelle,
 * promotions, licenciements, retraite (§11).
 */

import { clampStat, normalize } from '../engine/rng.ts';
import { BASE, hiringChance, promotionChance, raiseChance } from '../engine/probability.ts';
import { getLocalOpportunities } from './contexts.ts';
import type { Ctx } from '../engine/context.ts';
import type { ActionResult, GameState, JobOffer } from '../engine/types.ts';
import { getJob } from '../data/jobs.ts';
import { getCountry } from '../data/countries.ts';
import { completedCourses, isInSchool } from './education.ts';
import { createPerson } from './npc.ts';

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

/** Candidature à une offre : entretien immédiat, résultat immédiat. */
export function applyToJob(ctx: Ctx, offerId: string): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const offer = state.world.jobOffers.find((o) => o.id === offerId);
  if (!offer) return { ok: false, message: 'Cette offre n’est plus disponible.' };
  if (p.prison) return { ok: false, message: 'Difficile de passer un entretien depuis une cellule.' };

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
    looks: p.stats.looks,
    reputation: p.stats.reputation,
    hasRecord: p.criminalRecord.convictions.length > 0,
    jobMarket: state.world.jobMarket,
    majorMatch,
  }) * getLocalOpportunities(state).hiring;

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
  p.job = {
    jobId: offer.jobId,
    title: offer.title,
    level: offer.level,
    salary: offer.salary,
    employer: offer.employer,
    performance: Math.round(clampStat(45 + p.stats.intelligence / 5 + p.stats.discipline / 6)),
    yearsAtJob: 0,
    effort: 'normal',
    lastRaiseAskYear: 0,
    partTime: false,
  };
  p.careerHistory.push({ title: offer.title, employer: offer.employer, from: state.year, to: null });
  p.stats.happiness = clampStat(p.stats.happiness + 8);
  p.stats.reputation = clampStat(p.stats.reputation + 2);
  p.retired = false;
  state.world.jobOffers = state.world.jobOffers.filter((o) => o.id !== offerId);

  // Un collègue et parfois un supérieur deviennent des PNJ persistants.
  createPerson(ctx, { relation: 'coworker', age: rng.int(22, 58), relationship: rng.int(35, 65), opinion: rng.int(35, 65) });
  if (offer.level < job.levels.length - 1 && rng.chance(0.6)) {
    createPerson(ctx, { relation: 'boss', age: rng.int(35, 62), relationship: rng.int(30, 60), opinion: rng.int(30, 60) });
  }

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
  });
  p.job.lastRaiseAskYear = state.year;

  if (rng.chance(chance)) {
    const pct = rng.float(0.04, 0.14);
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
  const capacity = (p.stats.intelligence / 100) * 5 + (p.stats.discipline / 100) * 5;
  p.job.performance = clampStat(p.job.performance + effortDelta + capacity - stressPenalty - 2);

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
  }) * getLocalOpportunities(state).promotion;
  if (rng.chance(promo)) {
    promote(ctx);
  } else if (rng.chance(layoffChance(ctx))) {
    fire(ctx, p.job.performance < 35 ? 'insuffisance professionnelle' : 'restructuration');
  }

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
  return Math.min(0.4, chance);
}

export function promote(ctx: Ctx): boolean {
  const { state, rng } = ctx;
  const p = state.player;
  if (!p.job) return false;
  const job = getJob(p.job.jobId);
  if (!job || p.job.level >= job.levels.length - 1) return false;
  p.job.level += 1;
  const next = job.levels[p.job.level];
  const country = getCountry(p.countryId);
  const target = next.salary * country.salaryIndex * state.world.inflation;
  p.job.salary = Math.round(Math.max(p.job.salary * 1.12, target * rng.float(0.92, 1.1)));
  p.job.title = next.title;
  p.job.yearsAtJob = 0;
  p.stats.happiness = clampStat(p.stats.happiness + 10);
  p.stats.reputation = clampStat(p.stats.reputation + 5);
  p.careerHistory.push({ title: next.title, employer: p.job.employer, from: state.year, to: null });
  const prev = p.careerHistory[p.careerHistory.length - 2];
  if (prev && prev.to === null) prev.to = state.year;
  ctx.log('work', `Promotion : tu deviens ${next.title} (${Math.round(p.job.salary)} par an).`, 'good');
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
  p.job = null;
  p.stats.happiness = clampStat(p.stats.happiness - 14);
  p.stats.stress = clampStat(p.stats.stress + 18);
  p.stats.reputation = clampStat(p.stats.reputation - 4);
  ctx.log('work', `Tu as perdu ton poste de ${title} (${reason}).`, 'bad');
}

/** Le joueur peut-il travailler cette année ? */
export function canWork(state: GameState): boolean {
  const p = state.player;
  return p.age >= 14 && !p.prison && !p.retired && !(isInSchool(state) && p.age < 16);
}
