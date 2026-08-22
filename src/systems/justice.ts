/**
 * Système policier et judiciaire (§17) : arrestation, choix de l'avocat,
 * procès, condamnation, appel.
 *
 * Une arrestation crée un dossier en attente (`pendingTrial`). Le joueur
 * choisit un avocat depuis le menu Justice, puis le procès se tient.
 */

import { clampStat } from '../engine/rng.ts';
import { acquittalChance } from '../engine/probability.ts';
import type { Ctx } from '../engine/context.ts';
import { shiftStat } from './stats.ts';
import type { ActionResult, Conviction, GameState } from '../engine/types.ts';
import { CRIMES, LAWYERS, type CrimeDef } from '../data/crimes.ts';
import { getCountry } from '../data/countries.ts';
import { PRISON_NAMES } from '../data/names.ts';
import { createPerson } from './npc.ts';
import { fire } from './careers.ts';

export interface PendingTrial {
  crimeId: string;
  crimeName: string;
  evidence: number;
  seized: number;
  year: number;
}

export function pendingTrial(state: GameState): PendingTrial | null {
  const raw = state.player.flags.pendingTrial;
  if (typeof raw !== 'string' || !raw) return null;
  try {
    return JSON.parse(raw) as PendingTrial;
  } catch {
    return null;
  }
}

function setPendingTrial(state: GameState, trial: PendingTrial | null): void {
  state.player.flags.pendingTrial = trial ? JSON.stringify(trial) : '';
}

/** Arrestation : constitution du dossier et mise en attente du procès. */
export function arrest(ctx: Ctx, crime: CrimeDef, seized: number): string {
  const { state, rng } = ctx;
  const p = state.player;
  p.criminalRecord.arrests += 1;
  p.stats.stress = clampStat(p.stats.stress + 22);
  p.stats.happiness = clampStat(p.stats.happiness - 14);
  p.stats.reputation = clampStat(p.stats.reputation - 8);

  const country = getCountry(p.countryId);
  const evidence = Math.round(
    clampStat(rng.gauss(50 + country.justice * 25, 25, 5, 98) - p.stats.intelligence / 8),
  );
  setPendingTrial(state, {
    crimeId: crime.id,
    crimeName: crime.name,
    evidence,
    seized,
    year: state.year,
  });
  ctx.log('justice', `Tu as été arrêté${p.sex === 'F' ? 'e' : ''} pour : ${crime.name}.`, 'bad');
  return `La police t’interpelle.${seized > 0 ? ` Les ${seized} dérobés sont saisis.` : ''} Un procès est ouvert : choisis un avocat depuis le menu Justice.`;
}

/**
 * Une affaire à laquelle on n'a jamais répondu.
 *
 * **Le trou que le bureau a mis au jour.** `arrest` ouvrait un procès et
 * `simulateYear` se contentait d'en rappeler l'existence, année après année :
 * un joueur qui n'ouvrait jamais le menu Justice **n'était jamais jugé**. Se
 * faire prendre coûtait un licenciement et rien d'autre — ni peine, ni
 * amende, ni casier. Mesuré sur les mille trois cents vies de
 * `tools/measure-bureau.mjs` avant correction : **zéro peine prononcée**,
 * alors que la moitié des personnages s'étaient fait prendre au moins une
 * fois. Après correction, sur le même échantillon, les années effectivement
 * travaillées passent de cinquante et une à vingt-deux pour le rythme le plus
 * gourmand : c'est la carrière perdue qui devient la vraie sanction.
 *
 * Ce que le silence donne, c'est le commis d'office : on est jugé sans avoir
 * choisi, avec la défense qu'on n'a pas payée. C'est la conséquence la plus
 * douce qui reste une conséquence, et elle n'invente rien — le procès, la
 * relaxe, la peine et le casier existaient déjà, seule manquait la porte qui
 * y menait sans le joueur.
 */
export function advanceTrial(ctx: Ctx): void {
  const { state } = ctx;
  const trial = pendingTrial(state);
  if (!trial) return;
  if (state.year - trial.year < 2) return;
  ctx.log('justice', 'Tu ne t’es pas présenté. L’affaire est jugée sans toi.', 'bad');
  goToTrial(ctx, 'public');
}

/** Le joueur choisit un avocat, le procès se tient immédiatement. */
export function goToTrial(ctx: Ctx, lawyerId: string): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const trial = pendingTrial(state);
  if (!trial) return { ok: false, message: 'Aucune procédure en cours.' };
  const lawyer = LAWYERS.find((l) => l.id === lawyerId);
  if (!lawyer) return { ok: false, message: 'Avocat inconnu.' };
  const country = getCountry(p.countryId);
  const fee = Math.round(lawyer.cost * country.costIndex * state.world.inflation);
  if (p.money < fee) return { ok: false, message: `Les honoraires s’élèvent à ${fee}. Fonds insuffisants.` };

  p.money -= fee;
  if (lawyer.id !== 'public') {
    createPerson(ctx, { relation: 'lawyer', age: rng.int(30, 62), relationship: 55, opinion: 55 });
  }

  const crime = CRIMES.find((c) => c.id === trial.crimeId)!;
  const acquitted = rng.chance(
    acquittalChance({
      evidence: trial.evidence,
      lawyerQuality: lawyer.quality,
      priorConvictions: p.criminalRecord.convictions.length,
      reputation: p.stats.reputation,
      karma: p.stats.karma,
    }),
  );

  setPendingTrial(state, null);

  if (acquitted) {
    p.stats.happiness = clampStat(p.stats.happiness + 12);
    p.stats.stress = clampStat(p.stats.stress - 15);
    ctx.log('justice', `Tu as été relaxé${p.sex === 'F' ? 'e' : ''} dans l’affaire « ${trial.crimeName} ».`, 'good');
    return {
      ok: true,
      title: 'Relaxe',
      message: `Le tribunal ne retient pas les charges. Honoraires : ${fee}.`,
      tone: 'good',
    };
  }

  return convict(ctx, crime, trial.evidence, fee);
}

function convict(ctx: Ctx, crime: CrimeDef, evidence: number, fee: number): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const country = getCountry(p.countryId);

  const severity = (evidence / 100) * 0.6 + country.justice * 0.6
    + Math.min(0.5, p.criminalRecord.convictions.length * 0.12);
  const years = Math.round(
    (crime.sentenceMin + (crime.sentenceMax - crime.sentenceMin) * Math.min(1, severity)) * rng.float(0.8, 1.15),
  );
  const fine = Math.round(
    (crime.fineMin + (crime.fineMax - crime.fineMin) * Math.min(1, severity))
      * country.costIndex * state.world.inflation,
  );

  const conviction: Conviction = {
    crimeId: crime.id,
    crimeName: crime.name,
    year: state.year,
    sentenceYears: years,
    fine,
    appealed: false,
  };
  p.criminalRecord.convictions.push(conviction);
  p.chronicle.lastConvictionYear = state.year;
  p.stats.reputation = clampStat(p.stats.reputation - 12);
  shiftStat(state, 'karma', -(4));

  // L'amende peut basculer en dette si elle n'est pas couverte.
  const payable = Math.min(p.money, fine);
  p.money -= payable;
  const remaining = fine - payable;
  if (remaining > 0) {
    p.loans.push({
      id: ctx.id('loan'),
      kind: 'personal',
      label: 'Amende judiciaire',
      balance: remaining,
      rate: 0.04,
      annualPayment: Math.round(remaining / 5),
      yearsLeft: 5,
    });
  }

  if (years > 0) {
    incarcerate(ctx, years);
    return {
      ok: true,
      title: 'Condamnation',
      message: `Verdict : ${years} an${years > 1 ? 's' : ''} de prison et ${fine} d’amende. Honoraires : ${fee}.`,
      tone: 'bad',
    };
  }

  ctx.log('justice', `Condamné${p.sex === 'F' ? 'e' : ''} à ${fine} d’amende pour ${crime.name}.`, 'bad');
  return {
    ok: true,
    title: 'Condamnation',
    message: `Peine d’amende : ${fine}. Pas de prison ferme. Honoraires : ${fee}.`,
    tone: 'bad',
  };
}

/** Fait entrer le joueur en détention. */
export function incarcerate(ctx: Ctx, years: number): void {
  const { state, rng } = ctx;
  const p = state.player;
  const security = years >= 10 ? 'maximum' : years >= 4 ? 'medium' : 'minimum';
  p.prison = {
    yearsLeft: years,
    totalSentence: years,
    security,
    behavior: 55,
    respect: 25,
    paroleDenials: 0,
    facilityName: rng.pick(PRISON_NAMES),
    escapePlan: 0,
    suspicion: 0,
    prepared: [],
  };
  if (p.job) fire(ctx, 'incarcération');
  p.stats.happiness = clampStat(p.stats.happiness - 25);
  p.stats.stress = clampStat(p.stats.stress + 25);
  ctx.log('justice', `Tu es incarcéré${p.sex === 'F' ? 'e' : ''} pour ${years} an${years > 1 ? 's' : ''} à ${p.prison.facilityName}.`, 'bad');

  // Quelques codétenus persistants.
  for (let i = 0; i < rng.int(1, 3); i++) {
    createPerson(ctx, { relation: 'inmate', age: rng.int(20, 55), relationship: rng.int(20, 50), opinion: rng.int(20, 50), withJob: false });
  }
}

/** Faire appel de la dernière condamnation. */
export function appeal(ctx: Ctx, lawyerId: string): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const last = p.criminalRecord.convictions[p.criminalRecord.convictions.length - 1];
  if (!last) return { ok: false, message: 'Aucune condamnation à contester.' };
  if (last.appealed) return { ok: false, message: 'Tu as déjà fait appel de cette décision.' };
  if (state.year - last.year > 2) return { ok: false, message: 'Le délai d’appel est dépassé.' };

  const lawyer = LAWYERS.find((l) => l.id === lawyerId);
  if (!lawyer) return { ok: false, message: 'Avocat inconnu.' };
  const country = getCountry(p.countryId);
  const fee = Math.round(lawyer.cost * 1.4 * country.costIndex * state.world.inflation);
  if (p.money < fee) return { ok: false, message: `L’appel coûte ${fee}. Fonds insuffisants.` };

  p.money -= fee;
  last.appealed = true;

  const chance = (lawyer.quality / 100) * 0.45 + (p.stats.reputation / 100) * 0.1 - country.justice * 0.15;
  if (rng.chance(Math.max(0.03, chance))) {
    const wasIn = Boolean(p.prison);
    p.criminalRecord.convictions = p.criminalRecord.convictions.filter((c) => c !== last);
    if (wasIn) {
      p.prison = null;
      ctx.log('justice', 'Ta condamnation est annulée en appel. Tu es libéré.', 'good');
    } else {
      ctx.log('justice', 'Ta condamnation est annulée en appel.', 'good');
    }
    p.stats.happiness = clampStat(p.stats.happiness + 20);
    return { ok: true, title: 'Appel gagné', message: `La cour d’appel casse le jugement. Honoraires : ${fee}.`, tone: 'good' };
  }

  // Un appel perdu peut alourdir légèrement la peine.
  if (p.prison && rng.percent(30)) {
    p.prison.yearsLeft += 1;
    p.prison.totalSentence += 1;
    return { ok: true, title: 'Appel perdu', message: `La cour confirme et alourdit la peine d’un an. Honoraires : ${fee}.`, tone: 'bad' };
  }
  return { ok: true, title: 'Appel perdu', message: `La cour confirme le jugement. Honoraires : ${fee}.`, tone: 'bad' };
}

/** Demander l'effacement du casier après une longue période sans incident. */
export function requestExpungement(ctx: Ctx): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  if (!p.criminalRecord.convictions.length) return { ok: false, message: 'Ton casier est vierge.' };
  if (p.prison) return { ok: false, message: 'Impossible pendant une incarcération.' };
  const last = p.criminalRecord.convictions[p.criminalRecord.convictions.length - 1];
  const clean = state.year - last.year;
  if (clean < 10) return { ok: false, message: `Il faut 10 ans sans nouvelle condamnation (${clean} pour l’instant).` };
  if (p.yearActions.expunge) return { ok: false, message: 'Demande déjà déposée cette année.' };
  p.yearActions.expunge = 1;

  const cost = 2400;
  if (p.money < cost) return { ok: false, message: `La procédure coûte ${cost}.` };
  p.money -= cost;

  if (rng.chance(0.35 + p.stats.karma / 250 + clean / 100)) {
    p.criminalRecord.convictions = [];
    p.criminalRecord.notoriety = clampStat(p.criminalRecord.notoriety - 30);
    ctx.log('justice', 'Ton casier judiciaire a été effacé.', 'good');
    return { ok: true, title: 'Casier effacé', message: 'Les condamnations sont retirées de ton casier.', tone: 'good' };
  }
  return { ok: true, title: 'Demande rejetée', message: `Le juge refuse l’effacement. Frais engagés : ${cost}.`, tone: 'bad' };
}

export { LAWYERS };
