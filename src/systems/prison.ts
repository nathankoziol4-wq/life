/**
 * Gameplay carcéral (§18) : activités en détention, comportement,
 * libération conditionnelle et tentatives d'évasion.
 */

import { clampStat } from '../engine/rng.ts';
import { paroleChance } from '../engine/probability.ts';
import type { Ctx } from '../engine/context.ts';
import { peopleByRelation } from '../engine/context.ts';
import type { ActionResult } from '../engine/types.ts';
import { createPerson } from './npc.ts';

/** Une action de prison par an, sauf la conditionnelle qui a son propre quota. */
const PRISON_ACTIONS_PER_YEAR = 2;

export function doPrisonActivity(ctx: Ctx, activityId: string): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const prison = p.prison;
  if (!prison) return { ok: false, message: 'Tu n’es pas en détention.' };

  if (activityId !== 'parole') {
    const used = Number(p.yearActions.prisonActions ?? 0);
    if (used >= PRISON_ACTIONS_PER_YEAR) {
      return { ok: false, message: 'Tu as déjà occupé ton temps ainsi cette année.' };
    }
    p.yearActions.prisonActions = used + 1;
  }

  switch (activityId) {
    case 'gym': {
      p.stats.fitness = clampStat(p.stats.fitness + rng.float(5, 11));
      p.stats.health = clampStat(p.stats.health + 2);
      prison.respect = clampStat(prison.respect + rng.int(4, 10));
      p.stats.stress = clampStat(p.stats.stress - 6);
      return { ok: true, title: 'Salle de sport', message: 'Tu prends du muscle. On te regarde différemment dans la cour.', tone: 'good' };
    }
    case 'library': {
      p.stats.intelligence = clampStat(p.stats.intelligence + rng.float(3, 7));
      p.stats.discipline = clampStat(p.stats.discipline + 3);
      p.stats.stress = clampStat(p.stats.stress - 8);
      prison.behavior = clampStat(prison.behavior + 4);
      return { ok: true, title: 'Bibliothèque', message: 'Tu lis énormément. Le temps passe autrement.', tone: 'good' };
    }
    case 'behave': {
      prison.behavior = clampStat(prison.behavior + rng.int(9, 18));
      prison.respect = clampStat(prison.respect - 3);
      p.stats.discipline = clampStat(p.stats.discipline + 4);
      return { ok: true, title: 'Comportement exemplaire', message: 'Ton dossier disciplinaire est irréprochable cette année.', tone: 'good' };
    }
    case 'socialize': {
      if (rng.percent(62)) {
        const inmate = createPerson(ctx, {
          relation: 'inmate', age: rng.int(20, 55), relationship: rng.int(45, 70), opinion: rng.int(45, 70), withJob: false,
        });
        prison.respect = clampStat(prison.respect + rng.int(5, 12));
        p.stats.criminality = clampStat(p.stats.criminality + 4);
        p.stats.happiness = clampStat(p.stats.happiness + 5);
        return { ok: true, title: 'Nouvelle connaissance', message: `Tu sympathises avec ${inmate.firstName}. Un allié de plus.`, tone: 'good' };
      }
      prison.respect = clampStat(prison.respect - 6);
      p.stats.stress = clampStat(p.stats.stress + 8);
      return { ok: true, title: 'Mauvaise pioche', message: 'Tu tombes sur quelqu’un de mauvais. La conversation tourne court.', tone: 'bad' };
    }
    case 'work': {
      const pay = rng.int(150, 700);
      p.money += pay;
      prison.behavior = clampStat(prison.behavior + 6);
      p.stats.discipline = clampStat(p.stats.discipline + 3);
      return { ok: true, title: 'Travail en détention', message: `Tu gagnes ${pay} sur l’année. C’est peu, mais c’est à toi.`, tone: 'neutral' };
    }
    case 'riot': {
      p.stats.criminality = clampStat(p.stats.criminality + 8);
      prison.respect = clampStat(prison.respect + rng.int(8, 18));
      prison.behavior = clampStat(prison.behavior - rng.int(18, 32));
      if (rng.percent(45)) {
        prison.yearsLeft += 1;
        prison.totalSentence += 1;
        p.stats.health = clampStat(p.stats.health - rng.int(6, 16));
        return { ok: true, title: 'Sanction', message: 'L’esclandre te vaut un an de plus et un passage à l’infirmerie.', tone: 'bad' };
      }
      return { ok: true, title: 'Coup d’éclat', message: 'On ne te cherche plus. Ton dossier disciplinaire, lui, est catastrophique.', tone: 'neutral' };
    }
    case 'parole':
      return requestParole(ctx);
    case 'escape':
      return attemptEscape(ctx);
    default:
      return { ok: false, message: 'Activité inconnue.' };
  }
}

export function requestParole(ctx: Ctx): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const prison = p.prison;
  if (!prison) return { ok: false, message: 'Tu n’es pas en détention.' };
  if (p.yearActions.parole) return { ok: false, message: 'Tu as déjà présenté une demande cette année.' };
  p.yearActions.parole = 1;

  const served = prison.totalSentence - prison.yearsLeft;
  const chance = paroleChance({
    behavior: prison.behavior,
    yearsServed: served,
    totalSentence: prison.totalSentence,
    denials: prison.paroleDenials,
    karma: p.stats.karma,
  });

  if (rng.chance(chance)) {
    release(ctx, 'libération conditionnelle');
    return { ok: true, title: 'Conditionnelle accordée', message: 'La commission accepte. Tu sors, avec des obligations.', tone: 'good' };
  }
  prison.paroleDenials += 1;
  p.stats.happiness = clampStat(p.stats.happiness - 8);
  return {
    ok: true,
    title: 'Conditionnelle refusée',
    message: `La commission estime que c’est prématuré. Il reste ${prison.yearsLeft} an(s).`,
    tone: 'bad',
  };
}

export function attemptEscape(ctx: Ctx): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const prison = p.prison;
  if (!prison) return { ok: false, message: 'Tu n’es pas en détention.' };
  if (p.yearActions.escape) return { ok: false, message: 'Une tentative par an suffit largement.' };
  p.yearActions.escape = 1;

  const securityPenalty = prison.security === 'maximum' ? 0.06 : prison.security === 'medium' ? 0.12 : 0.22;
  const chance = securityPenalty
    * (0.5 + p.stats.intelligence / 200)
    * (0.5 + p.stats.fitness / 200)
    * (0.6 + prison.respect / 250);

  if (rng.chance(chance)) {
    p.prison = null;
    p.criminalRecord.wanted = true;
    p.criminalRecord.notoriety = clampStat(p.criminalRecord.notoriety + 30);
    p.stats.criminality = clampStat(p.stats.criminality + 15);
    p.stats.stress = clampStat(p.stats.stress + 25);
    ctx.log('crime', 'Tu t’es évadé. Tu es désormais recherché.', 'neutral');
    return {
      ok: true,
      title: 'Évasion réussie',
      message: 'Tu es dehors. Recherché, sans papiers, sans emploi possible — mais dehors.',
      tone: 'neutral',
    };
  }

  const extra = rng.int(2, 5);
  prison.yearsLeft += extra;
  prison.totalSentence += extra;
  prison.behavior = clampStat(prison.behavior - 35);
  prison.security = prison.security === 'minimum' ? 'medium' : 'maximum';
  p.stats.health = clampStat(p.stats.health - rng.int(5, 18));
  ctx.log('crime', `Tentative d’évasion ratée : ${extra} ans de plus.`, 'bad');
  return {
    ok: true,
    title: 'Évasion ratée',
    message: `Tu es repris en quelques heures. ${extra} ans supplémentaires et transfert en régime plus strict.`,
    tone: 'bad',
  };
}

/** Sortie de détention. */
export function release(ctx: Ctx, reason: string): void {
  const { state } = ctx;
  const p = state.player;
  if (!p.prison) return;
  p.prison = null;
  p.stats.happiness = clampStat(p.stats.happiness + 18);
  p.stats.stress = clampStat(p.stats.stress - 12);
  ctx.log('justice', `Tu es sorti${p.sex === 'F' ? 'e' : ''} de prison (${reason}).`, 'good');
  // Les codétenus deviennent de simples connaissances.
  for (const inmate of peopleByRelation(state, ['inmate'])) {
    inmate.relation = 'acquaintance';
  }
}

/** Progression annuelle en détention. */
export function advancePrison(ctx: Ctx): void {
  const { state, rng } = ctx;
  const p = state.player;
  const prison = p.prison;
  if (!prison) return;

  prison.yearsLeft -= 1;
  p.stats.happiness = clampStat(p.stats.happiness - 6);
  p.stats.stress = clampStat(p.stats.stress + 5);
  p.stats.health = clampStat(p.stats.health - 2);
  p.stats.criminality = clampStat(p.stats.criminality + 2);
  p.stats.reputation = clampStat(p.stats.reputation - 2);
  prison.behavior = clampStat(prison.behavior + rng.float(-4, 4));

  // Incident aléatoire, plus fréquent en régime strict.
  const incidentRate = prison.security === 'maximum' ? 0.3 : prison.security === 'medium' ? 0.18 : 0.08;
  if (rng.chance(incidentRate * (1 - prison.respect / 200))) {
    p.stats.health = clampStat(p.stats.health - rng.int(4, 14));
    ctx.log('crime', 'Tu as été pris dans une altercation en détention.', 'bad');
  }

  if (prison.yearsLeft <= 0) {
    release(ctx, 'peine purgée');
  }
}
