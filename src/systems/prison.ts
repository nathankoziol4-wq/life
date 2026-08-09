/**
 * La vie en détention : occuper ses journées, tenir son dossier, demander la
 * conditionnelle, encaisser les années.
 *
 * L'évasion vit dans `escape.ts` : elle a sa préparation, son mini-jeu, sa
 * course et sa cavale, et elle n'aurait rien à faire dans une liste
 * d'activités quotidiennes.
 */

import { clampStat } from '../engine/rng.ts';
import { paroleChance } from '../engine/probability.ts';
import type { Ctx } from '../engine/context.ts';
import { peopleByRelation } from '../engine/context.ts';
import type { ActionResult } from '../engine/types.ts';
import { createPerson } from './npc.ts';
import { injure } from './health.ts';

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

/* ------------------------------------------------------------------ */
/* Les autres détenus                                                  */
/* ------------------------------------------------------------------ */

export type InmateAction = 'seekProtection' | 'backUp' | 'askFavor' | 'standUpTo';

/**
 * Ce qu'on fait avec quelqu'un qui purge la même peine.
 *
 * Deux jauges s'opposent en permanence ici, et c'est tout l'intérêt : le
 * **respect** des détenus et le **dossier** vu par l'administration. Tout ce
 * qui fait monter l'un fait baisser l'autre. Le respect ouvre l'évasion, le
 * dossier ouvre la conditionnelle : il faut choisir par où l'on compte sortir.
 */
export function inmateAction(ctx: Ctx, personId: string, action: InmateAction): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const prison = p.prison;
  const target = state.npcs[personId];
  if (!prison) return { ok: false, message: 'Tu n’es pas en détention.' };
  if (!target?.alive || target.relation !== 'inmate') {
    return { ok: false, message: 'Cette personne n’est plus détenue avec toi.' };
  }

  const key = `inmate_${action}_${personId}`;
  if ((p.yearActions[key] ?? 0) >= 1) {
    return { ok: false, message: `Tu as déjà fait cette démarche auprès de ${target.firstName} cette année.` };
  }
  p.yearActions[key] = 1;

  switch (action) {
    case 'seekProtection': {
      // Se ranger derrière quelqu'un met à l'abri, et fait de vous son obligé.
      const willing = target.relationship * 0.6
        + (target.psyche?.axes.generosity ?? target.personality.generosity) * 0.4;
      if (rng.percent(willing / 1.5)) {
        prison.respect = clampStat(prison.respect + rng.int(4, 9));
        p.stats.stress = clampStat(p.stats.stress - 10);
        target.relationship = clampStat(target.relationship - rng.float(0, 4));
        p.flags.protectedInside = true;
        return {
          ok: true, title: 'Sous protection', tone: 'good',
          message: `${target.firstName} fait savoir qu’on te laisse tranquille. Tu lui dois quelque chose, et ce quelque chose n’est pas de l’argent.`,
        };
      }
      prison.respect = clampStat(prison.respect - rng.int(5, 12));
      return {
        ok: true, title: 'Refus', tone: 'bad',
        message: `${target.firstName} te regarde sans répondre. La demande a fait le tour de la cour avant le soir.`,
      };
    }

    case 'backUp': {
      // Soutenir quelqu'un dans la cour : le respect monte, le dossier tombe.
      prison.respect = clampStat(prison.respect + rng.int(8, 16));
      prison.behavior = clampStat(prison.behavior - rng.int(6, 14));
      target.relationship = clampStat(target.relationship + rng.float(8, 16));
      target.opinion = clampStat(target.opinion + rng.float(6, 14));
      if (rng.chance(0.3)) {
        injure(ctx, 1);
        return {
          ok: true, title: 'Dans la cour', tone: 'neutral',
          message: `Tu prends ta part. ${target.firstName} n’oubliera pas, et l’infirmerie non plus.`,
        };
      }
      return {
        ok: true, title: 'Dans la cour', tone: 'neutral',
        message: `Tu te places à côté de ${target.firstName} et ça suffit. On te compte autrement, maintenant.`,
      };
    }

    case 'askFavor': {
      const willing = target.relationship * 0.5 + prison.respect * 0.5;
      if (rng.percent(willing / 1.8)) {
        p.stats.happiness = clampStat(p.stats.happiness + rng.int(4, 10));
        p.stats.stress = clampStat(p.stats.stress - 8);
        prison.behavior = clampStat(prison.behavior - rng.int(2, 6));
        target.relationship = clampStat(target.relationship + rng.float(2, 6));
        return {
          ok: true, title: 'Rendu', tone: 'good',
          message: `${target.firstName} s’en occupe. Ne demande pas comment.`,
        };
      }
      prison.respect = clampStat(prison.respect - rng.int(2, 7));
      return {
        ok: true, title: 'Refus', tone: 'neutral',
        message: `${target.firstName} hausse les épaules. Ce n’est pas le moment, ou ce n’est pas toi.`,
      };
    }

    case 'standUpTo': {
      // Tenir tête : c'est ce qui fait le respect, et ce qui envoie à l'infirmerie.
      const odds = 25 + p.stats.fitness / 2.4 + prison.respect / 5 - target.age / 6;
      if (rng.percent(odds)) {
        prison.respect = clampStat(prison.respect + rng.int(12, 22));
        prison.behavior = clampStat(prison.behavior - rng.int(10, 20));
        target.relationship = clampStat(target.relationship - rng.float(12, 25));
        target.opinion = clampStat(target.opinion - rng.float(10, 20));
        return {
          ok: true, title: 'Réglé', tone: 'neutral',
          message: `Ça ne dure pas longtemps. Le lendemain, on te laisse la place dans la file.`,
        };
      }
      injure(ctx, rng.chance(0.4) ? 2 : 1);
      prison.respect = clampStat(prison.respect - rng.int(6, 14));
      prison.behavior = clampStat(prison.behavior - rng.int(8, 16));
      return {
        ok: true, title: 'Mauvais calcul', tone: 'bad',
        message: `${target.firstName} n’était pas seul. Tu passes trois jours à l’infirmerie et le dossier s’en souvient.`,
      };
    }

    default:
      return { ok: false, message: 'Action inconnue.' };
  }
}

/** Sortie de détention. */
export function release(ctx: Ctx, reason: string): void {
  const { state } = ctx;
  const p = state.player;
  if (!p.prison) return;
  p.prison = null;
  p.flags.protectedInside = false;
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

  // La méfiance de la direction s'émousse : sans quoi un préparatif raté
  // condamnerait toutes les tentatives d'une peine de quinze ans.
  prison.suspicion = clampStat(prison.suspicion - 7);

  // Incident aléatoire, plus fréquent en régime strict. Se ranger derrière
  // quelqu'un met réellement à l'abri — c'est ce qui donne son prix à une
  // protection, et ce qui fait accepter de la devoir.
  const incidentRate = prison.security === 'maximum' ? 0.3 : prison.security === 'medium' ? 0.18 : 0.08;
  const shielded = p.flags.protectedInside === true ? 0.45 : 1;
  if (rng.chance(incidentRate * (1 - prison.respect / 200) * shielded)) {
    p.stats.health = clampStat(p.stats.health - rng.int(4, 14));
    ctx.log('crime', 'Tu as été pris dans une altercation en détention.', 'bad');
  }
  // Une protection se renégocie chaque année : rien n'est acquis ici.
  if (p.flags.protectedInside === true && rng.chance(0.4)) {
    p.flags.protectedInside = false;
  }

  if (prison.yearsLeft <= 0) {
    release(ctx, 'peine purgée');
  }
}
