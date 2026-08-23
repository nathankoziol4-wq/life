/**
 * Être connu.
 *
 * Le jeu comptait des abonnés et appelait ça la célébrité. Un compteur qui
 * monte n'est pas un système : il n'y avait ni public, ni controverse, ni
 * rien à faire d'un nom une fois qu'on l'avait.
 *
 * Trois principes gouvernent ce fichier.
 *
 * **1. La notoriété n'est pas la réputation.** `stats.reputation` dit ce que
 * pensent les gens qui vous croisent ; `fame.level` dit combien de gens
 * savent qui vous êtes ; `fame.controversy` dit ce qu'ils ont à vous
 * reprocher. Les trois se déplacent séparément, et on peut parfaitement
 * finir très connu, très détesté, et respecté de ses collègues.
 *
 * **2. La notoriété s'entretient ou elle retombe.** Elle décroît chaque
 * année d'autant plus vite qu'elle est haute. Rester connu est un travail,
 * et c'est ce qui rend les apparitions autre chose qu'un bouton à argent.
 *
 * **3. Être connu coûte quelque chose.** Un visage connu se fait reconnaître
 * — par les gens, et par ceux qui enquêtent. Le stress, la vie privée et le
 * risque d'être arrêté suivent la courbe.
 */

import { clamp, clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import { doorFor, shadowFor, watchedFactor } from './legacy.ts';
import { shiftStat } from './stats.ts';
import type { ActionResult, GameState, Scandal } from '../engine/types.ts';
import {
  INTERVIEW_BEATS, PUBLIC_GIGS, PUBLIC_JOBS, SCANDAL_KINDS, getFameField, getGig,
  type InterviewBeat, type PublicGig, type ScandalResponse,
} from '../data/fame.ts';
import { getCountry } from '../data/countries.ts';
import { getTrade } from '../data/ventures.ts';
import { applyExperience } from './psyche.ts';

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

/** Comment le public te situe. */
export function fameLabel(level: number): string {
  if (level < 6) return 'Anonyme';
  if (level < 18) return 'Connu dans son coin';
  if (level < 34) return 'Un nom dans son milieu';
  if (level < 55) return 'Connu du pays';
  if (level < 78) return 'Une tête que tout le monde a vue';
  return 'Connu partout';
}

/** Ce que le public a à te reprocher, en clair. */
export function heatLabel(controversy: number): string {
  if (controversy < 12) return 'On ne te reproche rien';
  if (controversy < 30) return 'Quelques réserves circulent';
  if (controversy < 55) return 'Ton nom traîne dans des discussions désagréables';
  if (controversy < 78) return 'Tu es un sujet, et pas un bon';
  return 'Ton nom est devenu un argument contre toi';
}

/**
 * Ce que la notoriété rapporte par point, dans ce pays.
 *
 * Une échelle unique pour tout ce qui se paie au nom : apparitions,
 * partenariats, cachets. La progression est quadratique, parce qu'un nom
 * deux fois plus connu vaut bien plus du double.
 */
export function fameRate(state: GameState): number {
  const p = state.player;
  const country = getCountry(p.countryId);
  const field = getFameField(p.fame.field);
  const standing = 0.55 + (p.fame.goodwill / 100) * 0.9
    - Math.min(0.55, p.fame.controversy / 130);
  return (p.fame.level / 100) ** 2 * 420_000 * country.salaryIndex
    * state.world.inflation * field.worth * Math.max(0.15, standing);
}

/* ------------------------------------------------------------------ */
/* Ce qui rend connu                                                   */
/* ------------------------------------------------------------------ */

export interface FameSourceLine {
  label: string;
  /** Points de notoriété apportés dans l'année. */
  amount: number;
  field: string;
}

/**
 * Ce qui alimente la notoriété cette année, ligne par ligne.
 *
 * La fonction sert au moteur comme à l'écran : le joueur voit exactement ce
 * qui le fait connaître, et donc ce qu'il perdrait en arrêtant. Une jauge
 * sans ses causes ne serait qu'un chiffre de plus.
 */
export function fameSources(state: GameState): FameSourceLine[] {
  const p = state.player;
  const lines: FameSourceLine[] = [];

  // L'audience. Au-delà du millier d'abonnés seulement : en dessous, personne
  // ne vous connaît hors de vos proches.
  //
  // Le coefficient est délibérément bas. Avec un coefficient généreux, un
  // demi-million d'abonnés — que trois publications par an finissent par
  // produire — suffisait à devenir un nom que tout le monde connaît, et la
  // voie des réseaux écrasait toutes les autres sans rien coûter.
  const reach = Math.max(0, (Math.log10(p.followers + 1) - 2) * 1.75);
  if (reach > 0.2) lines.push({ label: 'Ton audience', amount: reach, field: 'réseaux' });

  // Le métier, quand il expose.
  if (p.job) {
    const pub = PUBLIC_JOBS[p.job.jobId];
    if (pub) {
      lines.push({
        label: p.job.title,
        // Un premier rôle et une silhouette ne rendent pas également célèbre.
        amount: pub.visibility * (0.45 + p.job.level * 0.28) * (0.6 + p.job.performance / 160),
        field: pub.field,
      });
    }
  }

  // Le métier exercé à son compte.
  if (p.freelance) {
    const trade = getTrade(p.freelance.tradeId);
    if (trade && trade.visibility > 0) {
      const load = p.freelance.lastMissions > 0 ? 1 : 0.35;
      lines.push({
        label: trade.label,
        amount: (trade.visibility / 5) * (0.4 + p.freelance.clientele / 90) * load,
        field: trade.id === 'contenu' ? 'réseaux' : trade.id === 'musique' ? 'scène'
          : trade.id === 'redaction' ? 'pages' : 'plateau',
      });
    }
  }

  // Une enseigne connue finit par rendre son patron connu.
  if (p.business && p.business.renown > 45) {
    lines.push({
      label: p.business.name,
      amount: (p.business.renown - 45) / 11,
      field: 'affaires',
    });
  }

  // Les faits divers. On y entre par la condamnation, pas par le délit : ce
  // qui rend connu, c'est ce qui est écrit quelque part.
  const record = p.criminalRecord;
  if (record.convictions.length > 0 || record.wanted) {
    lines.push({
      label: record.wanted ? 'Ton avis de recherche' : 'Ton casier',
      amount: Math.min(16, record.convictions.length * 2.2 + record.notoriety / 9
        + (record.wanted ? 6 : 0)),
      field: 'faits',
    });
  }

  return lines.filter((l) => l.amount > 0.15).sort((a, b) => b.amount - a.amount);
}

/** Le total de ce qui te fait connaître cette année. */
export function famePressure(state: GameState): number {
  return fameSources(state).reduce((s, l) => s + l.amount, 0);
}

/** Ce que la notoriété perd chaque année si rien ne l'alimente. */
export function fameDecay(state: GameState): number {
  const f = state.player.fame;
  // Une notoriété haute retombe plus vite qu'une notoriété modeste : il faut
  // plus de bruit pour rester au même niveau, ce qui rend le sommet coûteux.
  return 2.6 + f.level * 0.085 + (state.player.prison ? 4 : 0);
}

/* ------------------------------------------------------------------ */
/* Ce que la notoriété coûte et rapporte ailleurs                      */
/* ------------------------------------------------------------------ */

/**
 * De combien un visage connu augmente le risque d'être reconnu.
 *
 * Lu par `systems/crime.ts`. C'est le contrepoids indispensable : sans lui,
 * la notoriété n'aurait que des avantages, et l'arbitrage disparaîtrait.
 */
export function recognitionFactor(state: GameState): number {
  /*
   * **Et le nom qu'on porte sans l'avoir gagné.** Naître de quelqu'un de
   * connu se paie ici, dès l'enfance et partout : on est regardé sans avoir
   * rien fait. C'est le seul effet du nom qui ne dépend pas du domaine —
   * voir `systems/legacy.ts#watchedFactor`.
   */
  return (1 + (state.player.fame.level / 100) ** 1.4 * 1.15) * watchedFactor(state);
}

/** Ce que la notoriété fait au regard des autres, en bien comme en mal. */
export function publicStanding(state: GameState): number {
  const f = state.player.fame;
  return clampStat(50 + (f.level / 100) * (f.goodwill - 50 - f.controversy * 0.6) * 1.1);
}

/* ------------------------------------------------------------------ */
/* Les apparitions                                                     */
/* ------------------------------------------------------------------ */

/** Ce que paie une apparition, au niveau de notoriété actuel. */
export function gigFee(state: GameState, gig: PublicGig): number {
  return Math.round(fameRate(state) * gig.pay);
}

export function gigBlocker(state: GameState, gig: PublicGig): string | null {
  const p = state.player;
  if (p.prison) return 'On ne t’invite nulle part depuis une cellule.';
  if (p.criminalRecord.wanted) return 'Se montrer serait se livrer.';
  if (p.age < 14) return 'Il faut être plus âgé.';
  if (p.fame.level < gig.minFame) return 'Personne ne te le propose : on ne te connaît pas assez.';
  if (Number(p.yearActions[`gig_${gig.id}`] ?? 0) >= gig.perYear) {
    return 'Tu l’as déjà fait autant de fois que possible cette année.';
  }
  if (p.fame.controversy > 72 && gig.pay > 0.5) {
    return 'Personne ne veut associer son nom au tien en ce moment.';
  }
  return null;
}

/** Les apparitions qu'on te propose. */
export function availableGigs(state: GameState): PublicGig[] {
  return PUBLIC_GIGS.filter((g) => state.player.fame.level >= g.minFame);
}

/**
 * Accepter une apparition.
 *
 * L'interview a son propre déroulé — c'est une scène, pas un tirage — et
 * part donc vers `startInterview`.
 */
export function doGig(ctx: Ctx, gigId: string): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const gig = getGig(gigId);
  if (!gig) return { ok: false, message: 'Cette apparition n’existe pas.' };
  const blocker = gigBlocker(state, gig);
  if (blocker) return { ok: false, title: 'Impossible', message: blocker };
  if (gig.id === 'interview') return startInterview(ctx);

  p.yearActions[`gig_${gig.id}`] = Number(p.yearActions[`gig_${gig.id}`] ?? 0) + 1;
  const f = p.fame;
  const fee = gigFee(state, gig);
  p.money += fee;
  f.earnedThisYear += Math.max(0, fee);

  // Ce que ça apporte dépend de ce qu'on en fait : l'allure et le sang-froid
  // décident si l'apparition marque ou passe inaperçue.
  const poise = (p.stats.looks * 0.4 + p.stats.reputation * 0.3
    + (100 - p.stats.stress) * 0.3) / 100;
  const gained = gig.fame * (0.55 + poise * 0.75) * (1 - f.level / 130);
  f.level = clampStat(f.level + gained);
  f.peak = Math.max(f.peak, f.level);

  // Le dérapage : plus l'exercice est risqué, plus le caractère et la fatigue
  // pèsent. Une émission en direct quand on est à bout se passe mal.
  const field = getFameField(f.field);
  const slip = clamp(gig.risk * field.fragility * (1.25 - poise) * 0.55, 0, 0.85);
  let tone: 'good' | 'bad' | 'neutral' = 'good';
  let note: string;
  if (rng.chance(slip)) {
    const damage = 6 + gig.risk * 12;
    f.controversy = clampStat(f.controversy + damage);
    f.goodwill = clampStat(f.goodwill - damage * 0.7);
    p.stats.happiness = clampStat(p.stats.happiness - 7);
    tone = 'bad';
    note = 'Ça ne s’est pas passé comme prévu, et c’est cette partie-là qui circulera.';
  } else {
    f.goodwill = clampStat(f.goodwill + gig.goodwill);
    f.controversy = clampStat(f.controversy - 1.5);
    note = fee > 0 ? 'Bien passé.' : 'Tu n’as rien gagné, et ça se voit autrement.';
  }

  p.stats.stress = clampStat(p.stats.stress + gig.toll * 0.55);
  if (gig.id === 'charity') shiftStat(state, 'karma', (6));
  if (gig.id === 'reality') p.stats.reputation = clampStat(p.stats.reputation - 6);
  if (f.level > 72 && f.peak === f.level) applyExperience(ctx, 'grandeRéussite');

  ctx.log('money', `${gig.label} : ${fee >= 0 ? `${fee} encaissés` : 'à titre gracieux'}.`, tone);
  return {
    ok: true,
    title: gig.label,
    message: `${note} ${fee > 0 ? `Cachet : ${fee}.` : ''}`.trim(),
    tone,
  };
}

/* ------------------------------------------------------------------ */
/* L'interview                                                         */
/* ------------------------------------------------------------------ */

const OUTLETS = [
  'un quotidien national', 'une matinale', 'un magazine du dimanche',
  'une revue spécialisée', 'un podcast très écouté', 'une chaîne d’information',
];

/** Les questions qu'on peut poser à cette personne-là. */
export function beatsFor(state: GameState): InterviewBeat[] {
  const f = state.player.fame;
  return INTERVIEW_BEATS.filter((beat) => {
    if (beat.minFame !== undefined && f.level < beat.minFame) return false;
    if (beat.fields && !beat.fields.includes(f.field)) return false;
    return true;
  });
}

/** Ouvrir l'entretien : trois questions, tirées parmi celles qui te concernent. */
export function startInterview(ctx: Ctx): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  if (p.fame.interview) {
    return { ok: false, message: 'Tu es déjà en plein entretien.' };
  }
  const pool = beatsFor(state);
  if (pool.length < 3) {
    return { ok: false, title: 'Personne ne demande', message: 'Il n’y a pas encore grand-chose à te demander.' };
  }
  p.yearActions.gig_interview = Number(p.yearActions.gig_interview ?? 0) + 1;
  const beats = rng.sample(pool, 3);
  p.fame.interview = {
    beats: beats.map((b) => b.id),
    answers: [-1, -1, -1],
    outlet: rng.pick(OUTLETS),
  };
  return {
    ok: true,
    title: 'L’entretien commence',
    message: `${p.fame.interview.outlet[0].toUpperCase()}${p.fame.interview.outlet.slice(1)} t’a réservé une heure. Trois questions te resteront.`,
    tone: 'neutral',
  };
}

/**
 * Répondre à une question.
 *
 * Chaque réponse déplace trois choses qui ne vont pas ensemble. Il n'existe
 * donc pas de bonne réponse, seulement une réponse et son prix — c'est ce
 * qui fait de l'entretien une scène jouable plutôt qu'un tirage.
 */
export function answerInterview(ctx: Ctx, index: number, choice: number): ActionResult {
  const { state } = ctx;
  const p = state.player;
  const interview = p.fame.interview;
  if (!interview) return { ok: false, message: 'Aucun entretien en cours.' };
  if (index < 0 || index >= interview.beats.length) return { ok: false, message: 'Question inconnue.' };
  if (interview.answers[index] !== -1) return { ok: false, message: 'Tu as déjà répondu à celle-là.' };

  const beat = INTERVIEW_BEATS.find((b) => b.id === interview.beats[index]);
  const answer = beat?.answers[choice];
  if (!beat || !answer) return { ok: false, message: 'Réponse inconnue.' };
  interview.answers[index] = choice;

  const f = p.fame;
  // La façon de dire compte autant que ce qui est dit : quelqu'un de posé
  // fait moins de dégâts avec la même phrase.
  const poise = (p.stats.intelligence * 0.45 + (100 - p.stats.stress) * 0.3
    + p.stats.reputation * 0.25) / 100;
  f.level = clampStat(f.level + answer.fame * (0.6 + poise * 0.7) * (1 - f.level / 140));
  f.peak = Math.max(f.peak, f.level);
  f.controversy = clampStat(f.controversy + answer.controversy * (1.35 - poise * 0.6));
  f.goodwill = clampStat(f.goodwill + answer.goodwill * (0.6 + poise * 0.7));

  const done = interview.answers.every((a) => a !== -1);
  if (done) {
    const fee = Math.round(fameRate(state) * 0.12);
    p.money += fee;
    f.earnedThisYear += Math.max(0, fee);
    p.stats.stress = clampStat(p.stats.stress + 5);
    p.fame.interview = null;
    ctx.log('random', `Ton entretien pour ${interview.outlet} est paru.`, f.controversy > 55 ? 'bad' : 'good');
    return {
      ok: true,
      title: 'L’entretien est paru',
      message: `${answer.note} Cachet : ${fee}.`,
      tone: f.controversy > 55 ? 'bad' : 'good',
    };
  }
  return { ok: true, title: 'Question suivante', message: answer.note, tone: 'neutral' };
}

/** Couper court : ce qui a été dit reste dit, et partir se remarque. */
export function endInterview(ctx: Ctx): ActionResult {
  const p = ctx.state.player;
  if (!p.fame.interview) return { ok: false, message: 'Aucun entretien en cours.' };
  const answered = p.fame.interview.answers.filter((a) => a !== -1).length;
  p.fame.interview = null;
  if (answered === 0) {
    p.fame.controversy = clampStat(p.fame.controversy + 6);
    return {
      ok: true,
      title: 'Tu te lèves',
      message: 'Tu pars avant la première question. Le journaliste écrira quand même quelque chose.',
      tone: 'bad',
    };
  }
  p.fame.controversy = clampStat(p.fame.controversy + 9);
  p.fame.level = clampStat(p.fame.level + 3);
  return {
    ok: true,
    title: 'Tu coupes court',
    message: 'Tu retires ton micro au milieu. Ce moment-là fera plus de bruit que tout le reste de l’entretien.',
    tone: 'bad',
  };
}

/* ------------------------------------------------------------------ */
/* Les affaires                                                        */
/* ------------------------------------------------------------------ */

/** L'affaire en cours qui attend une réponse. */
export function openScandal(state: GameState): Scandal | null {
  return state.player.fame.scandals.find((s) => s.answered === null) ?? null;
}

/**
 * Répondre à une affaire.
 *
 * Les quatre réponses ne se classent pas : chacune est la meilleure dans un
 * cas et la pire dans un autre. S'excuser retombe vite mais abîme ceux qui
 * vous défendaient ; démentir tient si c'est vrai et double la mise sinon ;
 * se taire marche pour ce qui est mince et pas pour ce qui est lourd.
 */
export function respondToScandal(ctx: Ctx, response: ScandalResponse): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const scandal = openScandal(state);
  if (!scandal) return { ok: false, message: 'Il n’y a rien à démentir en ce moment.' };
  const f = p.fame;
  scandal.answered = response;

  // Ce que l'affaire vaut : plus elle est lourde, moins les réponses commodes
  // fonctionnent.
  const weight = scandal.weight;
  // Le fond : ce que vaut réellement la personne. Il ne se voit pas, mais il
  // décide de la crédibilité d'un démenti.
  const truth = (p.stats.karma * 0.6 + p.stats.reputation * 0.4) / 100;
  let delta: number;
  let goodwill: number;
  let note: string;
  let tone: 'good' | 'bad' | 'neutral' = 'neutral';

  switch (response) {
    case 'excuse': {
      delta = -weight * 0.72;
      goodwill = weight * 0.12 - 4;
      p.stats.reputation = clampStat(p.stats.reputation - 3);
      note = 'Ça retombe. Certains de ceux qui te défendaient ne comprennent pas pourquoi tu as cédé.';
      tone = 'good';
      break;
    }
    case 'silence': {
      // Le silence ne marche que sur ce qui est mince.
      const holds = rng.chance(clamp(0.8 - weight / 90, 0.15, 0.85));
      delta = holds ? -weight * 0.5 : weight * 0.55;
      goodwill = holds ? 2 : -weight * 0.2;
      note = holds
        ? 'Personne n’a relancé. Trois semaines plus tard, il est question d’autre chose.'
        : 'Ton silence est devenu le sujet. On l’a lu comme un aveu.';
      tone = holds ? 'good' : 'bad';
      break;
    }
    case 'nier': {
      const credible = rng.chance(clamp(0.12 + truth * 0.9, 0.08, 0.94));
      // Un démenti qui tient éteint l'affaire ; un démenti qui tombe la
      // double. C'est cette asymétrie qui rend le choix réel : sans elle,
      // s'excuser serait toujours la meilleure réponse, quelle que soit la
      // personne — et le menu à quatre entrées serait décoratif.
      delta = credible ? -weight : weight * 1.1;
      goodwill = credible ? weight * 0.2 : -weight * 0.45;
      p.stats.reputation = clampStat(p.stats.reputation + (credible ? 4 : -9));
      note = credible
        ? 'Le démenti tient. Ceux qui accusaient n’avaient pas grand-chose.'
        : 'Quelque chose est ressorti qui contredit exactement ce que tu venais de dire.';
      tone = credible ? 'good' : 'bad';
      break;
    }
    default: {
      // Contre-attaquer fait toujours parler davantage, dans les deux sens.
      const wins = rng.chance(clamp(0.3 + truth * 0.4 + f.goodwill / 320, 0.12, 0.82));
      delta = wins ? -weight * 0.6 : weight * 0.85;
      goodwill = wins ? weight * 0.3 : -weight * 0.35;
      f.level = clampStat(f.level + weight * 0.28);
      note = wins
        ? 'Tu as retourné la table. Le sujet est devenu ceux qui t’accusaient.'
        : 'Tu as donné exactement ce qu’ils attendaient : une deuxième semaine de sujet.';
      tone = wins ? 'good' : 'bad';
    }
  }

  f.controversy = clampStat(f.controversy + delta);
  f.goodwill = clampStat(f.goodwill + goodwill);
  p.stats.stress = clampStat(p.stats.stress + 8);
  ctx.log('random', `Affaire ${scandal.kindId} : tu as choisi de ${response === 'excuse' ? 't’excuser' : response === 'silence' ? 'te taire' : response === 'nier' ? 'démentir' : 'contre-attaquer'}.`, tone);
  return { ok: true, title: 'Ta réponse', message: note, tone };
}

/* ------------------------------------------------------------------ */
/* L'année                                                             */
/* ------------------------------------------------------------------ */

/** Ce que les apparitions ont rapporté, pour l'assiette imposable. */
export function fameEarnings(state: GameState): number {
  return Math.max(0, state.player.fame.earnedThisYear);
}

export function clearFameYear(state: GameState): void {
  state.player.fame.earnedThisYear = 0;
}

export function advanceFame(ctx: Ctx): void {
  const { state, rng } = ctx;
  const p = state.player;
  const f = p.fame;

  // Combien d'années on aura été quelqu'un, et à quel âge cela s'est arrêté.
  // L'état final ne le dit pas : une gloire de dix ans et une gloire d'un an
  // laissent la même notoriété résiduelle vingt ans plus tard.
  if (f.level >= 25) {
    p.chronicle.yearsFamous += 1;
    p.chronicle.lastFamousAge = 0;
  } else if (p.chronicle.yearsFamous > 0 && p.chronicle.lastFamousAge === 0) {
    p.chronicle.lastFamousAge = p.age;
  }

  const sources = fameSources(state);
  /*
   * **Les deux côtés du nom hérité, et ils sont au même endroit.**
   *
   * Dans le domaine du parent, on démarre plus vite : le nom précède. C'est
   * la porte — `legacy.ts#doorFor`. Mais on y est aussi jugé plus durement,
   * parce que le public attend davantage de celui qui porte le nom : c'est
   * l'ombre — `legacy.ts#shadowFor`. Les deux ne jouent que là, et c'est ce
   * qui fait que suivre le parent est une décision plutôt qu'une évidence.
   *
   * L'ombre s'applique à ce qu'on a à vous reprocher, pas à ce qui vous rend
   * connu : rater dans le domaine du parent se sait davantage.
   */
  const raw = sources.reduce((s, l) => s + l.amount, 0);
  const ownField = f.level >= 4 ? f.field : null;
  const pressure = raw * doorFor(state, ownField);
  f.level = clampStat(f.level + pressure - fameDecay(state));
  f.peak = Math.max(f.peak, f.level);

  // Ce pour quoi on est connu suit ce qui fait le plus de bruit. Il ne change
  // pas d'un an sur l'autre pour un écart minime : une réputation met du
  // temps à se déplacer.
  const top = sources[0];
  if (top && (getFameField(f.field).id === 'aucun' || top.amount > pressure * 0.55)) {
    f.field = top.field;
  }
  if (f.level < 4) f.field = 'aucun';

  // Ce qu'on a à te reprocher refroidit, doucement, et d'autant moins vite
  // que tu es connu : on n'oublie pas de la même façon quelqu'un dont on
  // parle tous les jours.
  f.controversy = clampStat(f.controversy - (7 - f.level / 26) / shadowFor(state, ownField));
  // L'estime revient vers le milieu : elle ne se gagne pas en ne faisant rien.
  f.goodwill = clampStat(f.goodwill + (50 - f.goodwill) * 0.11);

  if (f.level < 5) {
    f.scandals = [];
    f.interview = null;
    return;
  }

  // Une interview laissée en plan vaut un départ au milieu.
  if (f.interview) endInterview(ctx);

  // La rançon : la vie privée s'use, et il faut vivre avec.
  p.stats.stress = clampStat(p.stats.stress + (f.level / 100) * 7 + (f.controversy / 100) * 6);
  if (f.level > 60 && rng.chance(0.3)) {
    ctx.log('random', 'On t’a reconnu trois fois dans la même journée. Tu n’y prêtes plus attention, ou tu fais semblant.', 'neutral');
  }

  // Les affaires : elles arrivent d'autant plus qu'on est exposé et qu'on a
  // déjà donné prise.
  const exposure = (f.level / 100) * (0.16 + f.controversy / 260)
    * getFameField(f.field).fragility
    * (p.stats.karma < 40 ? 1.5 : 1);
  if (!openScandal(state) && rng.chance(clamp(exposure, 0, 0.5))) {
    const pool = SCANDAL_KINDS.filter((k) => !k.fields || k.fields.includes(f.field));
    const kind = rng.weighted(pool.length ? pool : SCANDAL_KINDS, (k) => k.weight);
    const scandal: Scandal = {
      id: ctx.id('scd'),
      kindId: kind.id,
      year: state.year,
      weight: Math.round(clamp(18 + f.level * 0.45 * kind.weight + rng.float(-6, 12), 8, 70)),
      answered: null,
    };
    f.scandals.unshift(scandal);
    f.controversy = clampStat(f.controversy + scandal.weight * 0.55);
    ctx.log('random', `${kind.headline}. Ton nom est partout, et pas pour ce que tu voulais.`, 'bad');
  }

  // Une affaire à laquelle on n'a jamais répondu finit par s'installer.
  for (const scandal of f.scandals) {
    if (scandal.answered === null && state.year - scandal.year >= 1) {
      scandal.answered = 'silence';
      f.controversy = clampStat(f.controversy + scandal.weight * 0.3);
      f.goodwill = clampStat(f.goodwill - 6);
    }
  }
  f.scandals = f.scandals.slice(0, 6);
}
