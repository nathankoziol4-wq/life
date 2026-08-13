/**
 * Ce qu'un élève peut réellement faire de ses journées.
 *
 * Le principe qui gouverne ce fichier : **aucune action n'a un résultat
 * unique**. Manquer de respect à un professeur ne « fait pas −10 de
 * relation » ; la personne visée réagit selon son caractère, la classe
 * regarde ou non, l'établissement sanctionne ou laisse passer selon son
 * règlement et selon ce qu'on a déjà fait avant, et les parents l'apprennent
 * parfois. Un même geste peut donc coûter une réputation ou en construire une.
 *
 * Deuxième principe : **l'escalade a de la mémoire**. Le dossier de
 * comportement accumule les incidents, et c'est lui qui décide si un écart
 * vaut un haussement de sourcil, une retenue ou une exclusion.
 */

import { clamp, clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import { fullName, person } from '../engine/context.ts';
import type { ActionResult, GameState, Person } from '../engine/types.ts';
import type { Staff } from '../engine/origin.ts';
import { CLUBS, isInSchool } from './education.ts';
import { classmatesOf, staffOf } from './school.ts';
import { getPsycheContext } from './contexts.ts';
import { applyExperience } from './psyche.ts';
import { peopleByRelation } from '../engine/context.ts';
import { getCountry } from '../data/countries.ts';

/* ------------------------------------------------------------------ */
/* Le dossier de comportement                                          */
/* ------------------------------------------------------------------ */

/** Sanctions possibles, de la plus légère à la plus lourde. */
export type Sanction = 'aucune' | 'avertissement' | 'retenue' | 'convocation' | 'exclusion' | 'renvoi';

const SANCTION_LABEL: Record<Sanction, string> = {
  aucune: 'aucune suite',
  avertissement: 'un avertissement',
  retenue: 'une heure de retenue',
  convocation: 'une convocation des parents',
  exclusion: 'une exclusion temporaire',
  renvoi: 'une exclusion définitive',
};

/**
 * Décide de la suite donnée à un écart de conduite.
 *
 * `severity` va de 1 (une insolence) à 3 (une bagarre). Ce qui compte autant
 * que la gravité, c'est la répétition : le troisième incident de l'année
 * n'est jamais traité comme le premier.
 */
export function discipline(ctx: Ctx, severity: number, reason: string): Sanction {
  const { state, rng } = ctx;
  const p = state.player;
  const d = p.education.discipline;
  const school = p.origin.school;
  const strictness = school ? school.discipline : 50;

  d.incidentsThisYear += 1;
  d.behaviour = clampStat(d.behaviour - severity * 5 - d.incidentsThisYear);

  // Un établissement laxiste laisse passer ; un établissement strict retient
  // le moindre écart. La récidive pèse autant que la gravité.
  const heat = severity * 22 + d.incidentsThisYear * 14 + strictness * 0.45
    + d.warnings * 6 + d.detentions * 8
    // Un élève jusque-là irréprochable bénéficie du doute.
    - Math.max(0, d.behaviour - 60) * 0.5
    + rng.float(-18, 18);

  // La scolarité obligatoire protège : on n'exclut pas définitivement un
  // enfant de dix ans, quoi qu'il fasse.
  const canExpel = p.age >= 15;

  const sanction: Sanction = heat > 108 && canExpel ? 'renvoi'
    : heat > 88 ? 'exclusion'
      : heat > 66 ? 'convocation'
        : heat > 46 ? 'retenue'
          : heat > 26 ? 'avertissement'
            : 'aucune';

  applySanction(ctx, sanction, reason);
  return sanction;
}

function applySanction(ctx: Ctx, sanction: Sanction, reason: string): void {
  const { state } = ctx;
  const p = state.player;
  const d = p.education.discipline;
  if (sanction === 'aucune') return;

  d.record.push({ year: state.year, text: `${reason} — ${SANCTION_LABEL[sanction]}` });
  if (d.record.length > 20) d.record.shift();

  switch (sanction) {
    case 'avertissement':
      d.warnings += 1;
      break;
    case 'retenue':
      d.detentions += 1;
      p.stats.happiness = clampStat(p.stats.happiness - 4);
      break;
    case 'convocation':
      d.detentions += 1;
      tellParents(ctx, reason);
      break;
    case 'exclusion':
      d.suspensions += 1;
      // Une exclusion coûte des cours, donc des notes.
      p.education.grades = Math.max(0, p.education.grades - 0.9);
      p.education.absences += 4;
      tellParents(ctx, reason);
      break;
    case 'renvoi':
      d.suspensions += 1;
      d.expelled = true;
      p.education.grades = Math.max(0, p.education.grades - 1.6);
      tellParents(ctx, reason);
      break;
  }

  ctx.log('school', `${reason} : ${SANCTION_LABEL[sanction]}.`, sanction === 'avertissement' ? 'neutral' : 'bad');
}

/**
 * Les parents l'apprennent — et leur réaction dépend d'eux.
 *
 * Un parent autoritaire punit et la relation se dégrade ; un parent absent ne
 * dit rien mais s'éloigne un peu ; un parent qui dialogue en fait une
 * discussion, et l'enfant en ressort parfois grandi.
 */
function tellParents(ctx: Ctx, reason: string): void {
  const { state, rng } = ctx;
  const p = state.player;
  const parents = peopleByRelation(state, ['mother', 'father', 'stepmother', 'stepfather'])
    .filter((x) => x.alive && !x.estranged);
  if (parents.length === 0) return;

  for (const parent of parents) {
    const strict = parent.personality.temper;
    const warm = parent.personality.warmth;
    if (strict > 62 && rng.chance(0.7)) {
      parent.relationship = clampStat(parent.relationship - rng.float(6, 14));
      p.stats.happiness = clampStat(p.stats.happiness - 4);
      ctx.log('family', `${fullName(parent)} l’a très mal pris : ${reason.toLowerCase()}.`, 'bad');
    } else if (warm > 60) {
      parent.relationship = clampStat(parent.relationship - rng.float(1, 5));
      p.stats.discipline = clampStat(p.stats.discipline + 2);
      ctx.log('family', `${fullName(parent)} en a discuté avec toi plutôt que de crier.`, 'neutral');
    } else {
      parent.relationship = clampStat(parent.relationship - rng.float(3, 8));
    }
  }
}

/* ------------------------------------------------------------------ */
/* Actions personnelles                                                */
/* ------------------------------------------------------------------ */

/** Combien de fois cette action a déjà été faite cette année. */
function used(state: GameState, key: string): number {
  return state.player.yearActions[key] ?? 0;
}

function use(state: GameState, key: string): void {
  state.player.yearActions[key] = used(state, key) + 1;
}

/**
 * Travailler davantage sur une période donnée.
 *
 * Distinct du rythme annuel : c'est un coup de collier ponctuel, qui donne
 * un vrai gain mais prend du temps libre et fatigue.
 */
export function studyHarder(ctx: Ctx): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  if (!isInSchool(state)) return { ok: false, message: 'Tu n’es scolarisé nulle part.' };
  if (used(state, 'studyHarder') >= 2) {
    return { ok: false, message: 'Tu as déjà passé beaucoup de soirées sur tes cours cette année.' };
  }
  use(state, 'studyHarder');

  const psy = getPsycheContext(state);
  const gain = rng.float(0.3, 1.1) * psy.studyEffect;
  p.education.grades = Math.min(20, p.education.grades + gain);
  p.stats.intelligence = clampStat(p.stats.intelligence + rng.float(0.5, 2));
  p.stats.stress = clampStat(p.stats.stress + rng.float(3, 9));
  p.stats.happiness = clampStat(p.stats.happiness - rng.float(1, 4));

  // Les professeurs remarquent l'effort — surtout les consciencieux.
  const staff = staffOf(state);
  if (staff.length > 0) {
    const noticed = rng.pick(staff);
    if (rng.chance(noticed.staff.professionalism / 130)) {
      noticed.person.relationship = clampStat(noticed.person.relationship + rng.float(3, 8));
      return {
        ok: true, title: 'Travail supplémentaire', tone: 'good',
        message: `Tu passes tes soirées sur tes cours. ${fullName(noticed.person)} l’a remarqué et te regarde autrement.`,
      };
    }
  }
  return {
    ok: true, title: 'Travail supplémentaire', tone: gain > 0.6 ? 'good' : 'neutral',
    message: gain > 0.6
      ? 'Les soirées de travail paient : tu suis mieux en classe.'
      : 'Tu travailles, sans que ça se voie encore beaucoup. C’est fatigant.',
  };
}

/**
 * Sécher les cours, avec une escalade réelle.
 *
 * Se faire prendre dépend de l'établissement et de la répétition. Ce qui
 * arrive ensuite dépend du dossier — et un élève qui sèche toute l'année
 * finit par le payer en notes, même sans se faire prendre.
 */
export function skipSchool(ctx: Ctx): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  if (!isInSchool(state)) return { ok: false, message: 'Tu n’es scolarisé nulle part.' };

  p.education.absences += 1;
  p.stats.happiness = clampStat(p.stats.happiness + rng.float(2, 6));
  p.stats.discipline = clampStat(p.stats.discipline - 3);
  p.education.grades = Math.max(0, p.education.grades - rng.float(0.05, 0.3));

  const school = p.origin.school;
  const caught = rng.percent(
    16 + p.education.absences * 7 + (school ? school.discipline * 0.25 : 12),
  );

  if (!caught) {
    // Sécher sans se faire prendre construit une réputation chez certains.
    const klass = p.origin.schoolClass;
    if (klass && rng.chance(0.4)) {
      p.origin.popularity.known = Math.min(klass.size, p.origin.popularity.known + 1);
    }
    return {
      ok: true, title: 'Journée buissonnière', tone: 'good',
      message: 'Personne n’a rien vu. La journée était longue et douce.',
    };
  }

  const sanction = discipline(ctx, 1, 'Absences injustifiées');
  return {
    ok: true, title: 'Absence remarquée', tone: sanction === 'aucune' ? 'neutral' : 'bad',
    message: sanction === 'aucune'
      ? 'Tu t’es fait repérer, mais on a laissé filer pour cette fois.'
      : `Tu t’es fait prendre : ${SANCTION_LABEL[sanction]}.`,
  };
}

/* ------------------------------------------------------------------ */
/* Manquer de respect                                                  */
/* ------------------------------------------------------------------ */

/** Ce que la personne visée a choisi de faire. */
export type Reaction = 'ignore' | 'répond' | 'rend coup pour coup' | 'se fâche' | 'signale' | 'confrontation';

/**
 * Manquer de respect à quelqu'un de l'école.
 *
 * La réaction n'est pas tirée au hasard : elle sort du caractère de la cible.
 * Quelqu'un de posé ignore, quelqu'un de fier répond, quelqu'un d'impulsif
 * s'emporte, quelqu'un de discipliné va le dire. Et la classe en fait ce
 * qu'elle veut : un affront à un professeur détesté fait rire, un affront à
 * un camarade fragile fait le vide autour de vous.
 */
export function disrespect(ctx: Ctx, personId: string): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const target = person(state, personId);
  if (!target?.alive) return { ok: false, message: 'Personne introuvable.' };
  if (used(state, `disrespect:${personId}`) >= 1) {
    return { ok: false, message: `Tu t’en es déjà pris à ${target.firstName} cette année.` };
  }
  use(state, `disrespect:${personId}`);

  const psyche = target.psyche;
  const temper = psyche ? psyche.axes.aggression : target.personality.temper;
  const pride = psyche ? psyche.axes.confidence : 50;
  const rule = psyche ? psyche.axes.honesty : 50;
  const calm = psyche ? psyche.emotion.angerControl : 50;

  const staffEntry = state.player.origin.schoolClass?.staff.find((s) => s.personId === personId);
  const teacher = Boolean(staffEntry);

  // Chaque réaction a un poids ; la plus lourde l'emporte, avec du bruit.
  const weights: [Reaction, number][] = [
    ['ignore', calm * 0.8 + (100 - pride) * 0.4],
    ['répond', pride * 0.7 + (psyche?.communication.sarcasm ?? 40) * 0.5],
    ['rend coup pour coup', temper * 0.8 + (100 - calm) * 0.4],
    ['se fâche', temper * 0.5 + (100 - calm) * 0.6],
    ['signale', rule * 0.6 + (staffEntry ? staffEntry.strictness * 0.7 : 0) + (teacher ? 20 : -10)],
    ['confrontation', temper * 0.9 - calm * 0.4 + (teacher ? -40 : 10)],
  ];
  const reaction = weights
    .map(([name, weight]) => ({ name, weight: weight + rng.float(-25, 25) }))
    .sort((a, b) => b.weight - a.weight)[0].name;

  target.relationship = clampStat(target.relationship - rng.float(10, 26));
  target.opinion = clampStat(target.opinion - rng.float(8, 20));

  // Le public : ce qu'on gagne ou ce qu'on perd aux yeux des autres.
  const audience = audienceEffect(ctx, target, teacher);

  let message: string;
  let tone: 'good' | 'bad' | 'neutral' = 'bad';

  switch (reaction) {
    case 'ignore':
      message = `${target.firstName} te regarde à peine et passe à autre chose. C’est presque pire.`;
      p.stats.happiness = clampStat(p.stats.happiness - 2);
      tone = 'neutral';
      break;
    case 'répond':
      message = `${target.firstName} te répond du tac au tac. Les autres ont entendu.`;
      p.stats.reputation = clampStat(p.stats.reputation - 2);
      break;
    case 'rend coup pour coup':
      message = `${target.firstName} ne se laisse pas faire et te rend chaque mot.`;
      p.stats.happiness = clampStat(p.stats.happiness - 5);
      break;
    case 'se fâche':
      message = `${target.firstName} s’emporte pour de bon. L’ambiance est cassée.`;
      p.stats.stress = clampStat(p.stats.stress + 6);
      break;
    case 'signale': {
      message = `${target.firstName} est allé le rapporter.`;
      const sanction = discipline(ctx, teacher ? 2 : 1, `Insolence envers ${fullName(target)}`);
      if (sanction !== 'aucune') message += ` Résultat : ${SANCTION_LABEL[sanction]}.`;
      break;
    }
    case 'confrontation': {
      message = `Ça a dégénéré en bagarre dans le couloir.`;
      p.stats.health = clampStat(p.stats.health - rng.float(2, 8));
      const sanction = discipline(ctx, 3, `Bagarre avec ${fullName(target)}`);
      if (sanction !== 'aucune') message += ` ${SANCTION_LABEL[sanction].charAt(0).toUpperCase()}${SANCTION_LABEL[sanction].slice(1)}.`;
      break;
    }
  }

  if (audience.text) {
    message += ` ${audience.text}`;
    if (audience.gain > 0) tone = tone === 'bad' ? 'neutral' : tone;
  }

  ctx.log('school', `Tu as manqué de respect à ${fullName(target)}.`, 'bad');
  return { ok: true, title: 'Insolence', message, tone };
}

/**
 * Ce que la classe retient de l'incident.
 *
 * S'en prendre à quelqu'un de détesté fait monter d'un cran ; s'en prendre à
 * quelqu'un d'apprécié isole. C'est la même action, et le résultat social est
 * opposé — c'est exactement ce qu'on veut.
 */
function audienceEffect(ctx: Ctx, target: Person, teacher: boolean): { text: string; gain: number } {
  const { state, rng } = ctx;
  const p = state.player;
  const klass = p.origin.schoolClass;
  if (!klass) return { text: '', gain: 0 };

  const staffEntry = klass.staff.find((s) => s.personId === target.id);
  // Un professeur impopulaire, un camarade apprécié : deux publics opposés.
  const liked = staffEntry ? staffEntry.popularity : target.relationship;
  const gain = (50 - liked) / 50;

  p.origin.popularity.known = Math.min(klass.size, p.origin.popularity.known + 1);
  if (gain > 0.15) {
    p.origin.popularity.intimidating = Math.min(klass.size, p.origin.popularity.intimidating + 1);
    if (teacher) p.origin.popularity.funny = Math.min(klass.size, p.origin.popularity.funny + 1);
    return { text: rng.pick([
      'Certains ont trouvé ça drôle.',
      'Quelques-uns t’ont regardé avec un respect nouveau.',
    ]), gain };
  }
  if (gain < -0.15) {
    p.origin.popularity.liked = Math.max(0, p.origin.popularity.liked - 1);
    for (const mate of classmatesOf(state)) {
      if (mate.id === target.id) continue;
      if (mate.relationship > 55) mate.relationship = clampStat(mate.relationship - rng.float(2, 7));
    }
    return { text: 'Personne n’a trouvé ça drôle, et ça se sent.', gain };
  }
  return { text: '', gain };
}

/* ------------------------------------------------------------------ */
/* Interactions avec les camarades                                     */
/* ------------------------------------------------------------------ */

export type ClassmateAction =
  | 'helpWork' | 'askHelp' | 'tease' | 'provoke' | 'report' | 'askBestFriend' | 'defend'
  | 'askOut' | 'makeUp' | 'prank' | 'gift' | 'tellAdult';

/** Actions scolaires spécifiques, en plus des interactions sociales générales. */
export function classmateAction(ctx: Ctx, personId: string, action: ClassmateAction): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const target = person(state, personId);
  if (!target?.alive) return { ok: false, message: 'Personne introuvable.' };
  const key = `${action}:${personId}`;
  if (used(state, key) >= 1) {
    return { ok: false, message: `Tu as déjà fait ça avec ${target.firstName} cette année.` };
  }
  use(state, key);

  const psy = getPsycheContext(state);

  switch (action) {
    case 'helpWork': {
      // Aider suppose d'en être capable : sinon on embrouille tout le monde.
      const able = p.stats.intelligence + p.education.grades * 2;
      if (rng.percent(30 + able / 2)) {
        target.relationship = clampStat(target.relationship + rng.float(6, 14));
        target.opinion = clampStat(target.opinion + rng.float(4, 10));
        p.stats.reputation = clampStat(p.stats.reputation + 1);
        p.stats.karma = clampStat(p.stats.karma + 2);
        return { ok: true, title: 'Coup de main', tone: 'good',
          message: `Tu reprends les exercices avec ${target.firstName}. Il a compris, et il s’en souviendra.` };
      }
      return { ok: true, title: 'Coup de main', tone: 'neutral',
        message: `Tu essaies d’expliquer, mais tu n’es pas beaucoup plus avancé que ${target.firstName}.` };
    }

    case 'askHelp': {
      const willing = (target.psyche?.axes.generosity ?? target.personality.generosity)
        + target.relationship * 0.5;
      if (rng.percent(20 + willing / 2)) {
        p.education.grades = Math.min(20, p.education.grades + rng.float(0.2, 0.8));
        target.relationship = clampStat(target.relationship + rng.float(2, 7));
        return { ok: true, title: 'Demander de l’aide', tone: 'good',
          message: `${target.firstName} accepte de reprendre les cours avec toi. Ça t’a servi.` };
      }
      p.stats.happiness = clampStat(p.stats.happiness - 2);
      return { ok: true, title: 'Demander de l’aide', tone: 'bad',
        message: `${target.firstName} a autre chose à faire. Tu te débrouilleras seul.` };
    }

    case 'tease': {
      // Taquiner marche entre gens qui s'apprécient, et blesse ailleurs.
      const takesItWell = target.relationship / 2 + (target.psyche?.emotion.stability ?? 50) / 2;
      if (rng.percent(takesItWell)) {
        target.relationship = clampStat(target.relationship + rng.float(1, 5));
        p.origin.popularity.funny = Math.min(
          p.origin.schoolClass?.size ?? 30, p.origin.popularity.funny + 1,
        );
        return { ok: true, title: 'Taquinerie', tone: 'good',
          message: `${target.firstName} rit avec toi. Les autres aussi.` };
      }
      target.relationship = clampStat(target.relationship - rng.float(4, 11));
      return { ok: true, title: 'Taquinerie', tone: 'bad',
        message: `${target.firstName} l’a très mal pris. Ce n’était pas le moment.` };
    }

    case 'provoke': {
      const reaction = disrespect(ctx, personId);
      // `disrespect` a déjà consommé son propre compteur ; on rend son résultat.
      return reaction.ok ? reaction : { ok: true, title: 'Provocation', tone: 'neutral',
        message: `${target.firstName} hausse les épaules.` };
    }

    case 'report': {
      // Rapporter protège parfois, isole souvent.
      const sanctionned = rng.percent(40 + (p.origin.school?.discipline ?? 50) / 3);
      target.relationship = clampStat(target.relationship - rng.float(12, 25));
      p.origin.popularity.liked = Math.max(0, p.origin.popularity.liked - 1);
      for (const mate of classmatesOf(state)) {
        if (mate.id === personId) continue;
        mate.relationship = clampStat(mate.relationship - rng.float(0, 5));
      }
      return { ok: true, title: 'Signalement', tone: sanctionned ? 'neutral' : 'bad',
        message: sanctionned
          ? `L’établissement a pris ton signalement au sérieux. ${target.firstName} l’a su, et la classe aussi.`
          : `On t’a écouté poliment sans rien faire. ${target.firstName}, lui, l’a appris.` };
    }

    case 'defend': {
      // Prendre la défense de quelqu'un coûte quelque chose, sinon ce n'est
      // pas du courage.
      const brave = p.psyche.axes.courage;
      target.relationship = clampStat(target.relationship + rng.float(8, 18));
      p.stats.karma = clampStat(p.stats.karma + 5);
      if (rng.percent(35 - brave / 4)) {
        p.stats.health = clampStat(p.stats.health - rng.float(1, 6));
        const sanction = discipline(ctx, 2, `Bagarre en défendant ${fullName(target)}`);
        return { ok: true, title: 'Prendre sa défense', tone: 'neutral',
          message: `Tu t’es interposé pour ${target.firstName}. Ça a mal tourné${sanction === 'aucune' ? '' : ` : ${SANCTION_LABEL[sanction]}`}.` };
      }
      p.origin.popularity.respected = Math.min(
        p.origin.schoolClass?.size ?? 30, p.origin.popularity.respected + 1,
      );
      return { ok: true, title: 'Prendre sa défense', tone: 'good',
        message: `Tu t’es interposé pour ${target.firstName}. Ceux qui regardaient s’en souviendront.` };
    }

    case 'askBestFriend': {
      if (target.relation === 'bestFriend') {
        return { ok: false, message: `${target.firstName} est déjà ton meilleur ami.` };
      }
      if (target.relationship < 62) {
        target.relationship = clampStat(target.relationship - rng.float(2, 6));
        return { ok: true, title: 'Demande maladroite', tone: 'bad',
          message: `Vous n’en êtes pas là. ${target.firstName} a trouvé la question étrange.` };
      }
      if (rng.percent(35 + target.relationship / 3 + psy.bonding * 12)) {
        const existing = Object.values(state.npcs).find((x) => x.relation === 'bestFriend' && x.alive);
        if (existing) existing.relation = 'friend';
        target.relation = 'bestFriend';
        target.relationship = clampStat(target.relationship + 8);
        ctx.log('family', `${fullName(target)} est devenu ton meilleur ami.`, 'good');
        return { ok: true, title: 'Meilleur ami', tone: 'good',
          message: `C’est dit : ${target.firstName} et toi, c’est autre chose que les autres.` };
      }
      return { ok: true, title: 'Demande', tone: 'neutral',
        message: `${target.firstName} t’aime bien, mais il a déjà quelqu’un d’autre à cette place.` };
    }

    case 'askOut': {
      // Le premier amour scolaire. L'audit notait : « la séduction commence à
      // l'âge adulte », ce qui laissait un trou de six ans exactement là où
      // ça compte le plus.
      if (p.age < 12) {
        return { ok: false, message: 'Tu n’en es pas là.' };
      }
      if (target.relation === 'partner' || target.relation === 'crush') {
        return { ok: false, message: `C’est déjà quelque chose, avec ${target.firstName}.` };
      }
      if (!attracted(p, target)) {
        return { ok: false, title: 'Non', message: `Ce n’est pas ce que tu cherches chez quelqu’un.` };
      }
      // Ce qui décide : ce qu'il pense de toi, ce que tu vaux à ses yeux, et
      // le courage qu'il faut pour demander. Demander trop tôt se paie.
      const appeal = target.relationship * 0.5 + target.opinion * 0.2
        + p.stats.looks * 0.2 + p.origin.popularity.liked * 1.5;
      const nerve = p.psyche.social.assertiveness * 0.5 + p.psyche.social.charm * 0.5;
      if (rng.percent(clamp(appeal * 0.7 + nerve * 0.2 - 28, 3, 88))) {
        target.relation = 'partner';
        target.relationship = clampStat(target.relationship + rng.float(10, 20));
        p.stats.happiness = clampStat(p.stats.happiness + rng.float(8, 16));
        p.origin.popularity.known += 1;
        if (!p.flags.hadFirstLove) {
          p.flags.hadFirstLove = true;
          applyExperience(ctx, 'premierAmour', { person: target });
        }
        ctx.log('love', `${fullName(target)} et toi, c’est officiel.`, 'good');
        return { ok: true, title: 'Elle a dit oui', tone: 'good',
          message: `${target.firstName} a dit oui. Toute la classe le saura avant midi.` };
      }
      // Un refus devant témoins coûte davantage qu'un refus discret.
      const publicly = rng.chance(0.45);
      target.relationship = clampStat(target.relationship - rng.float(2, 8));
      p.stats.happiness = clampStat(p.stats.happiness - rng.float(5, 12));
      p.psyche.social.fearOfJudgement = clampStat(
        p.psyche.social.fearOfJudgement + (publicly ? 7 : 3),
      );
      if (publicly) {
        p.origin.popularity.liked = Math.max(0, p.origin.popularity.liked - 1);
        applyExperience(ctx, 'humiliationPublique', { person: target, scale: 0.5 });
      }
      return { ok: true, title: 'Non', tone: 'bad',
        message: publicly
          ? `${target.firstName} a dit non, et il y avait du monde. Tu l’entendras répéter pendant des semaines.`
          : `${target.firstName} a dit non, gentiment. Ça ne rend pas la journée meilleure.` };
    }

    case 'makeUp': {
      // Une brouille était définitive : on pouvait détruire un lien et jamais
      // le réparer, ce qui donnait des classes de plus en plus vides.
      if (target.relationship > 45 && !target.estranged) {
        return { ok: false, message: `Il n’y a rien à réparer avec ${target.firstName}.` };
      }
      // Le temps fait la moitié du travail, la sincérité l'autre moitié.
      const since = state.year - target.lastInteractionYear;
      const chance = clamp(
        18 + since * 6 + target.relationship * 0.4
        + p.psyche.values.friendship / 6 - (target.estranged ? 22 : 0),
        5, 85,
      );
      if (rng.percent(chance)) {
        target.estranged = false;
        target.relationship = clampStat(target.relationship + rng.float(12, 26));
        target.opinion = clampStat(target.opinion + rng.float(6, 15));
        p.stats.karma = clampStat(p.stats.karma + 3);
        p.stats.happiness = clampStat(p.stats.happiness + 4);
        return { ok: true, title: 'Vous vous reparlez', tone: 'good',
          message: `Ce n’est pas comme avant, mais ${target.firstName} te répond de nouveau.` };
      }
      target.relationship = clampStat(target.relationship - rng.float(0, 4));
      return { ok: true, title: 'Il n’a pas voulu', tone: 'bad',
        message: `${target.firstName} t’a écouté jusqu’au bout, puis il est parti. C’est déjà ça.` };
    }

    case 'prank': {
      // La farce est le pari du groupe : elle réussit quand la classe rit
      // *avec* toi et se retourne quand elle rit de la victime.
      const funny = p.psyche.social.humour * 0.6 + p.origin.popularity.liked * 2;
      const takesItWell = target.relationship * 0.5
        + (target.psyche?.emotion.stability ?? 50) * 0.3
        - target.personality.temper * 0.2;
      const lands = rng.percent(clamp(funny * 0.5 + takesItWell * 0.4, 5, 88));
      if (lands) {
        p.origin.popularity.funny = Math.min(
          p.origin.schoolClass?.size ?? 30, p.origin.popularity.funny + 2,
        );
        p.origin.popularity.known += 1;
        target.relationship = clampStat(target.relationship + rng.float(0, 5));
        return { ok: true, title: 'Toute la classe a ri', tone: 'good',
          message: `${target.firstName} a ri avec les autres. C’est ce qui distingue une farce d’une méchanceté.` };
      }
      // Ratée, elle coûte le lien *et* le dossier : quelqu'un finit par le
      // dire à un adulte.
      target.relationship = clampStat(target.relationship - rng.float(10, 22));
      target.opinion = clampStat(target.opinion - rng.float(8, 18));
      const sanction = rng.chance(0.4)
        ? discipline(ctx, 0.9, `Farce aux dépens de ${fullName(target)}`)
        : 'aucune';
      return { ok: true, title: 'Personne n’a ri', tone: 'bad',
        message: `${target.firstName} ne l’a pas trouvée drôle, et les autres non plus.${
          sanction === 'aucune' ? '' : ` L’établissement l’a su : ${sanction}.`}` };
    }

    case 'gift': {
      // Offrir quelque chose achète du temps, jamais de l'estime : à lien
      // faible, le geste se lit exactement pour ce qu'il est.
      const cost = Math.round(20 * getCountry(p.countryId).costIndex * state.world.inflation);
      if (p.money < cost) {
        return { ok: false, title: 'Pas les moyens', message: 'Tu n’as pas de quoi.' };
      }
      p.money -= cost;
      if (target.relationship < 32) {
        target.relationship = clampStat(target.relationship + rng.float(0, 3));
        target.opinion = clampStat(target.opinion - rng.float(0, 6));
        return { ok: true, title: 'Geste mal lu', tone: 'bad',
          message: `${target.firstName} a pris le cadeau, l’a regardé, et a compris ce que tu essayais d’acheter.` };
      }
      target.relationship = clampStat(target.relationship + rng.float(5, 13));
      target.opinion = clampStat(target.opinion + rng.float(3, 9));
      p.stats.happiness = clampStat(p.stats.happiness + 2);
      return { ok: true, title: 'Ça lui a fait plaisir', tone: 'good',
        message: `Rien d’extraordinaire, mais ${target.firstName} ne s’y attendait pas.` };
    }

    case 'tellAdult': {
      // Distinct de « signaler son comportement », qui s'adresse au groupe :
      // ici on va voir quelqu'un dont c'est le métier, et ce qu'il en fait
      // dépend de lui.
      const staff = state.player.origin.schoolClass?.staff ?? [];
      const grownUp = staff.length > 0
        ? staff.reduce((a, b) => (a.professionalism > b.professionalism ? a : b))
        : null;
      if (!grownUp) {
        return { ok: false, message: 'Il n’y a personne à qui le dire ici.' };
      }
      const heard = rng.percent(
        20 + grownUp.professionalism / 2 + (p.origin.school?.counselling ?? 30) / 4,
      );
      target.relationship = clampStat(target.relationship - rng.float(8, 18));
      if (heard) {
        p.stats.stress = clampStat(p.stats.stress - rng.float(2, 8));
        p.stats.karma = clampStat(p.stats.karma + 2);
        return { ok: true, title: 'On t’a écouté', tone: 'good',
          message: `Quelqu’un a pris ça au sérieux et s’en est occupé. ${target.firstName} t’en veut, évidemment.` };
      }
      // Rien n'a bougé, et ça s'est su : le pire des deux mondes.
      p.origin.popularity.liked = Math.max(0, p.origin.popularity.liked - 1);
      for (const mate of classmatesOf(state)) {
        if (mate.id === personId) continue;
        mate.relationship = clampStat(mate.relationship - rng.float(0, 6));
      }
      return { ok: true, title: 'Rien n’a bougé', tone: 'bad',
        message: `On t’a remercié d’être venu. Il ne s’est rien passé, sauf que tout le monde l’a su.` };
    }
  }
}

/**
 * Compatibilité d'orientation, pour savoir à qui l'on peut se déclarer.
 *
 * Volontairement minimal : le jeu n'a pas à en dire davantage.
 */
function attracted(p: GameState['player'], target: Person): boolean {
  const sameSex = p.sex === target.sex;
  if (p.orientation === 'bi') return true;
  return p.orientation === 'homo' ? sameSex : !sameSex;
}

/* ------------------------------------------------------------------ */
/* Interactions avec le personnel                                      */
/* ------------------------------------------------------------------ */

export type TeacherAction =
  | 'talk' | 'question' | 'askHelp' | 'compliment' | 'thank' | 'complain' | 'reportIssue'
  | 'plead';

function staffOfPerson(state: GameState, personId: string): Staff | undefined {
  return state.player.origin.schoolClass?.staff.find((s) => s.personId === personId);
}

/** Interactions propres au corps enseignant. */
export function teacherAction(ctx: Ctx, personId: string, action: TeacherAction): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const target = person(state, personId);
  const staff = staffOfPerson(state, personId);
  if (!target?.alive || !staff) return { ok: false, message: 'Cette personne n’enseigne plus ici.' };

  const key = `${action}:${personId}`;
  if (used(state, key) >= 1) {
    return { ok: false, message: `Tu as déjà fait cette démarche auprès de ${target.firstName} cette année.` };
  }
  // Les refus d'entrée ne consomment pas la démarche : vérifier qu'on *peut*
  // faire un recours ne doit pas épuiser le recours. Ce qui suit se juge donc
  // avant de poser le compteur.
  if (action === 'plead') {
    const d = p.education.discipline;
    if (d.warnings + d.detentions + d.suspensions === 0) {
      return { ok: false, title: 'Rien à plaider', message: 'Ton dossier est vierge.' };
    }
    if (staff.role !== 'directeur' && staff.role !== 'conseiller') {
      return { ok: false, title: 'Pas la bonne personne',
        message: `${target.firstName} n’a pas la main sur ton dossier.` };
    }
  }
  use(state, key);

  // Un professeur peu professionnel a des têtes ; un professeur intègre juge
  // sur le travail. C'est ce qui décide si la sympathie sert à quelque chose.
  const favour = target.relationship * (1 - staff.professionalism / 160);
  const merit = p.education.grades * 3 + p.stats.discipline * 0.3;

  switch (action) {
    case 'talk':
      target.relationship = clampStat(target.relationship + rng.float(1, 5));
      return { ok: true, title: staff.subject ?? staff.role, tone: 'neutral',
        message: `Tu discutes un moment avec ${fullName(target)}. Rien de décisif, mais il te connaît un peu mieux.` };

    case 'question': {
      if (rng.percent(35 + staff.skill / 2 + p.stats.intelligence / 5)) {
        p.stats.intelligence = clampStat(p.stats.intelligence + rng.float(0.5, 2.5));
        target.relationship = clampStat(target.relationship + rng.float(2, 6));
        return { ok: true, title: 'Question posée', tone: 'good',
          message: `${fullName(target)} prend le temps de répondre. Tu comprends enfin ce point.` };
      }
      return { ok: true, title: 'Question posée', tone: 'neutral',
        message: `${fullName(target)} répond vite et mal. Tu n’es pas plus avancé.` };
    }

    case 'askHelp': {
      const tutoring = p.origin.school?.tutoring ?? 40;
      if (rng.percent(20 + staff.professionalism / 3 + tutoring / 3 + favour / 4)) {
        p.education.grades = Math.min(20, p.education.grades + rng.float(0.4, 1.3));
        target.relationship = clampStat(target.relationship + rng.float(3, 9));
        return { ok: true, title: 'Soutien', tone: 'good',
          message: `${fullName(target)} accepte de te reprendre en dehors des cours. Ta moyenne s’en ressent.` };
      }
      return { ok: true, title: 'Soutien refusé', tone: 'bad',
        message: `${fullName(target)} n’a pas le temps. « Travaillez davantage » est tout ce que tu obtiens.` };
    }

    case 'compliment': {
      // Flatter marche sur les vaniteux et agace les autres.
      const vain = 100 - staff.professionalism;
      if (rng.percent(25 + vain / 2)) {
        target.relationship = clampStat(target.relationship + rng.float(4, 11));
        return { ok: true, title: 'Compliment', tone: 'good',
          message: `${fullName(target)} n’en montre rien, mais ça lui a fait plaisir.` };
      }
      target.opinion = clampStat(target.opinion - rng.float(0, 4));
      return { ok: true, title: 'Compliment', tone: 'neutral',
        message: `${fullName(target)} coupe court. Il n’aime pas ce genre de chose.` };
    }

    case 'thank':
      target.relationship = clampStat(target.relationship + rng.float(3, 8));
      p.stats.karma = clampStat(p.stats.karma + 1);
      return { ok: true, title: 'Remerciements', tone: 'good',
        message: `Tu remercies ${fullName(target)} pour son aide. On le lui dit rarement.` };

    case 'complain': {
      // Se plaindre d'une note : ça passe si le dossier suit.
      if (rng.percent(15 + merit / 4 + favour / 3 - staff.strictness / 4)) {
        p.education.grades = Math.min(20, p.education.grades + rng.float(0.2, 0.7));
        return { ok: true, title: 'Réclamation', tone: 'good',
          message: `${fullName(target)} revoit sa copie et corrige. Tu avais raison.` };
      }
      target.relationship = clampStat(target.relationship - rng.float(3, 10));
      return { ok: true, title: 'Réclamation', tone: 'bad',
        message: `${fullName(target)} maintient sa note et retient ton nom, pas pour les bonnes raisons.` };
    }

    case 'reportIssue': {
      // Signaler un problème réel : l'établissement suit ou étouffe.
      const heard = rng.percent(25 + staff.professionalism / 2 + (p.origin.school?.counselling ?? 30) / 3);
      if (heard) {
        p.stats.stress = clampStat(p.stats.stress - rng.float(3, 10));
        target.relationship = clampStat(target.relationship + rng.float(2, 7));
        // Un adulte qui prend au sérieux ce qu'on lui dit, à cet âge, laisse
        // une trace durable — c'est exactement ce que décrit « mentor ».
        applyExperience(ctx, 'mentor', { person: target, scale: 0.6 });
        return { ok: true, title: 'Signalement', tone: 'good',
          message: `${fullName(target)} t’écoute jusqu’au bout et fait remonter. Quelque chose bouge.` };
      }
      p.stats.stress = clampStat(p.stats.stress + rng.float(2, 6));
      // Ne pas être entendu quand on signale quelque chose de vrai, c'est
      // une injustice ordinaire, et elle marque aussi.
      applyExperience(ctx, 'injusticeSubie', { person: target, scale: 0.5 });
      return { ok: true, title: 'Signalement', tone: 'bad',
        message: 'On note, on promet d’en parler, et rien ne se passe.' };
    }

    case 'plead': {
      // Plaider sa cause : la seule action qui puisse *défaire* quelque chose
      // du dossier. Sans elle, une sanction était définitive et le dossier ne
      // faisait que descendre — un élève ne pouvait jamais se rattraper.
      // Les conditions d'entrée sont vérifiées plus haut, avant le compteur.
      const d = p.education.discipline;
      // Ce qui décide : ce qu'on sait dire, ce que valait le dossier avant, et
      // la sévérité de la maison. La sympathie compte peu face à quelqu'un
      // d'intègre — c'est la même règle que partout ailleurs ici.
      const words = p.psyche.communication.tact * 0.4
        + p.psyche.communication.composure * 0.3 + p.stats.intelligence * 0.3;
      const record = merit * 0.15 + Math.max(0, d.behaviour - 45) * 0.5;
      const strict = (p.origin.school?.discipline ?? 50) * 0.35;
      if (rng.percent(clamp(words * 0.45 + record * 0.5 + favour * 0.15 - strict, 4, 86))) {
        // On efface la sanction la plus légère encore inscrite : plaider
        // n'annule pas une exclusion, il rattrape un écart.
        if (d.detentions > 0) d.detentions -= 1;
        else if (d.warnings > 0) d.warnings -= 1;
        d.behaviour = clampStat(d.behaviour + rng.float(6, 14));
        d.record.push({ year: state.year, text: 'Recours accepté' });
        target.relationship = clampStat(target.relationship + rng.float(2, 8));
        return { ok: true, title: 'Recours accepté', tone: 'good',
          message: `${fullName(target)} t’a laissé parler jusqu’au bout, puis a rayé une ligne. Ça ne se reproduira pas deux fois.` };
      }
      d.behaviour = clampStat(d.behaviour - rng.float(2, 6));
      p.stats.stress = clampStat(p.stats.stress + rng.float(3, 9));
      return { ok: true, title: 'Recours rejeté', tone: 'bad',
        message: `${fullName(target)} a écouté trois minutes. Le dossier reste, et il te trouve maintenant contestataire.` };
    }
  }
}

/* ------------------------------------------------------------------ */
/* Clubs et groupes                                                    */
/* ------------------------------------------------------------------ */

/** Quitter un club, avec ce que ça coûte auprès de ceux qui restent. */
export function leaveClub(ctx: Ctx, clubId: string): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const index = p.education.clubs.indexOf(clubId);
  if (index < 0) return { ok: false, message: 'Tu ne fais pas partie de ce club.' };
  const club = CLUBS.find((c) => c.id === clubId);
  const standing = p.education.clubStanding[clubId];

  p.education.clubs.splice(index, 1);
  delete p.education.clubStanding[clubId];
  if (standing?.rank === 'responsable') {
    p.stats.reputation = clampStat(p.stats.reputation - 4);
  }
  ctx.log('school', `Tu as quitté le club « ${club?.name ?? clubId} ».`, 'neutral');
  return { ok: true, title: club?.name ?? 'Club', tone: 'neutral',
    message: standing?.rank === 'responsable'
      ? 'Tu laisses une place que personne n’avait envie de reprendre.'
      : 'Tu rends ton matériel et tu passes à autre chose.' };
}

/**
 * Progression annuelle dans les clubs.
 *
 * On ne devient pas capitaine parce qu'on est resté : il faut aussi être bon
 * dans ce que le club demande, et que les autres l'acceptent.
 */
export function advanceClubs(ctx: Ctx): void {
  const { state, rng } = ctx;
  const p = state.player;
  for (const clubId of p.education.clubs) {
    const club = CLUBS.find((c) => c.id === clubId);
    if (!club) continue;
    const standing = p.education.clubStanding[clubId] ?? { years: 0, rank: 'membre' as const };
    standing.years += 1;

    // La compétence utile dépend de ce que le club demande.
    const merit = Object.keys(club.effects).reduce(
      (best, key) => Math.max(best, p.stats[key as keyof typeof p.stats] ?? 0), 0,
    );
    const social = p.psyche.axes.extraversion * 0.4 + p.origin.popularity.respected * 4;

    if (standing.rank === 'membre' && standing.years >= 2
      && rng.percent(10 + merit / 4 + social / 6)) {
      standing.rank = 'titulaire';
      ctx.log('school', `Tu es devenu titulaire au club « ${club.name} ».`, 'good');
      p.stats.reputation = clampStat(p.stats.reputation + 2);
    } else if (standing.rank === 'titulaire' && standing.years >= 4
      && rng.percent(6 + merit / 5 + social / 5)) {
      standing.rank = 'responsable';
      ctx.log('school', `Tu diriges le club « ${club.name} ».`, 'good');
      p.stats.reputation = clampStat(p.stats.reputation + 6);
      p.origin.popularity.influential = Math.min(
        p.origin.schoolClass?.size ?? 30, p.origin.popularity.influential + 2,
      );
    }
    p.education.clubStanding[clubId] = standing;
  }
}

/**
 * Tenter d'intégrer un groupe.
 *
 * On n'entre pas dans un groupe en le demandant : on y entre si on a ce qu'il
 * partage, si quelqu'un vous y connaît déjà, et si votre réputation ne joue
 * pas contre vous.
 */
export function joinPeerGroup(ctx: Ctx, groupId: string): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const klass = p.origin.schoolClass;
  const group = klass?.groups.find((g) => g.id === groupId);
  if (!klass || !group) return { ok: false, message: 'Ce groupe n’existe plus.' };
  if (group.playerMember) return { ok: false, message: 'Tu en fais déjà partie.' };
  if (used(state, `joinGroup:${groupId}`) >= 1) {
    return { ok: false, message: 'Tu as déjà tenté ta chance cette année.' };
  }
  use(state, `joinGroup:${groupId}`);

  // Partager le goût du groupe est le facteur principal.
  const mine = group.interestId
    ? p.psyche.interests.find((i) => i.id === group.interestId)?.level ?? 0
    : 0;
  // Connaître quelqu'un dedans compte presque autant.
  const known = group.memberIds
    .map((id) => state.npcs[id])
    .filter((x) => x?.alive && x.relationship > 55).length;

  const chance = 8 + mine * 0.45 + known * 12
    + p.psyche.social.approachEase * 0.15
    + p.origin.popularity.liked * 3
    - group.standing * 0.25
    - p.origin.popularity.intimidating * 2;

  if (rng.percent(chance)) {
    group.playerMember = true;
    for (const id of group.memberIds) {
      const member = state.npcs[id];
      if (member?.alive) member.relationship = clampStat(member.relationship + rng.float(4, 12));
    }
    p.origin.popularity.liked = Math.min(klass.size, p.origin.popularity.liked + group.memberIds.length);
    ctx.log('school', `Tu fais désormais partie du groupe « ${group.label} ».`, 'good');
    return { ok: true, title: group.label, tone: 'good',
      message: 'On t’a fait une place. Tu n’es plus tout seul à la récréation.' };
  }

  p.stats.happiness = clampStat(p.stats.happiness - rng.float(2, 6));
  return { ok: true, title: group.label, tone: 'bad',
    message: mine < 30
      ? 'Tu n’as rien en commun avec eux, et ça s’est vu tout de suite.'
      : 'Ils sont restés polis, mais la place n’était pas libre.' };
}

/** Quitter un groupe qu'on a intégré. */
export function leavePeerGroup(ctx: Ctx, groupId: string): ActionResult {
  const { state } = ctx;
  const group = state.player.origin.schoolClass?.groups.find((g) => g.id === groupId);
  if (!group?.playerMember) return { ok: false, message: 'Tu n’en fais pas partie.' };
  group.playerMember = false;
  for (const id of group.memberIds) {
    const member = state.npcs[id];
    if (member?.alive) member.relationship = clampStat(member.relationship - 8);
  }
  return { ok: true, title: group.label, tone: 'neutral',
    message: 'Tu t’en éloignes. Ils ne te retiennent pas.' };
}

/* ------------------------------------------------------------------ */
/* Remise à zéro annuelle                                              */
/* ------------------------------------------------------------------ */

/**
 * Fin d'année scolaire : le comportement se rétablit un peu, les incidents
 * de l'année sont soldés, mais le dossier reste.
 */
export function settleSchoolYear(ctx: Ctx): void {
  const { state } = ctx;
  const d = state.player.education.discipline;
  d.behaviour = clampStat(d.behaviour + (d.incidentsThisYear === 0 ? 8 : 3));
  d.incidentsThisYear = 0;
}
