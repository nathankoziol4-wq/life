/**
 * La vie au bureau.
 *
 * Même principe que pour l'école : un poste n'est pas un salaire et un
 * curseur d'implication. C'est une équipe, un supérieur, des heures, et une
 * satisfaction qui n'a rien à voir avec la performance — on peut très bien
 * réussir dans un travail qu'on déteste, et c'est précisément ce qui fait
 * démissionner.
 *
 * La règle qui gouverne les relations professionnelles : **être bien vu ne
 * suffit pas, il faut être bien vu de quelqu'un qui pèse**. Chaque membre de
 * l'équipe porte une `influence`, et c'est elle seule qui transforme une
 * sympathie en promotion.
 */

import { clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import { shiftStat } from './stats.ts';
import { fullName, person } from '../engine/context.ts';
import type {
  ActionResult, Coworker, GameState, Person, WorkRole,
} from '../engine/types.ts';
import { createPerson } from './npc.ts';
import { buildPsyche } from './psycheGen.ts';
import { getPsycheContext } from './contexts.ts';
import { getJob } from '../data/jobs.ts';
import { fire, promote } from './careers.ts';

/* ------------------------------------------------------------------ */
/* Constitution de l'équipe                                            */
/* ------------------------------------------------------------------ */

/**
 * Compose l'équipe à l'embauche.
 *
 * On ne modélise pas un open space entier : quelques personnes marquantes
 * suffisent à produire des alliances, des rivalités et un supérieur qui
 * compte. Le supérieur n'existe que si l'on n'est pas déjà au sommet — un
 * directeur général n'a personne au-dessus de lui.
 */
export function buildTeam(ctx: Ctx): Coworker[] {
  const { state, rng } = ctx;
  const p = state.player;
  const job = p.job;
  if (!job) return [];
  const def = getJob(job.jobId);
  const atTop = !def || job.level >= def.levels.length - 1;

  const team: Coworker[] = [];
  const hire = (role: WorkRole, influence: number) => {
    const npc = createPerson(ctx, {
      relation: role === 'supérieur' ? 'boss' : 'coworker',
      age: role === 'supérieur' ? rng.int(Math.max(30, p.age - 4), 64) : rng.int(22, 60),
      withJob: false,
      relationship: rng.int(30, 55),
      opinion: rng.int(30, 58),
    });
    // Seul le supérieur reçoit une personnalité complète. C'est la règle
    // posée dans `types.ts` : la psyché est réservée aux PNJ qui comptent.
    // Un collègue de passage se contente de `personality`, sur lequel toutes
    // les actions du bureau savent déjà retomber — et une carrière traverse
    // assez d'entreprises pour que la différence se voie au chronomètre.
    if (role === 'supérieur') npc.psyche = buildPsyche(rng, { age: npc.age });
    npc.jobTitle = role === 'supérieur' ? `Responsable chez ${job.employer}`
      : role === 'ressources humaines' ? `Ressources humaines chez ${job.employer}`
        : `${job.title} chez ${job.employer}`;
    npc.flags.coworker = true;
    npc.flags.employer = job.employer;
    team.push({
      personId: npc.id,
      role,
      seniority: rng.int(0, 14),
      competence: clampStat(rng.gauss(58, 18, 5, 98)),
      influence: clampStat(influence + rng.float(-12, 12)),
    });
  };

  if (!atTop) hire('supérieur', 78);
  // Une grande maison a des ressources humaines ; une petite n'en a pas.
  if (job.salary > 28000 && rng.chance(0.55)) hire('ressources humaines', 46);
  const peers = rng.int(1, 3);
  for (let i = 0; i < peers; i++) {
    // Un collègue sur trois environ est un rival plutôt qu'un pair : quelqu'un
    // qui vise la même place que vous.
    hire(rng.chance(0.3) ? 'rival' : 'collègue', 22);
  }
  // Un ancien qui prend le nouveau sous son aile, parfois.
  if (rng.chance(0.35)) hire('mentor', 38);

  return team;
}

/** L'équipe encore présente et vivante. */
export function teamOf(state: GameState): { role: Coworker; person: Person }[] {
  const job = state.player.job;
  if (!job) return [];
  return job.team
    .map((c) => ({ role: c, person: state.npcs[c.personId] }))
    .filter((x): x is { role: Coworker; person: Person } => Boolean(x.person?.alive));
}

/** Le supérieur direct, s'il y en a un. */
export function bossOf(state: GameState): { role: Coworker; person: Person } | null {
  return teamOf(state).find((x) => x.role.role === 'supérieur') ?? null;
}

/**
 * Le soutien dont on bénéficie dans l'entreprise.
 *
 * Somme des opinions pondérées par l'influence. C'est ce chiffre — et non la
 * somme des sympathies — qui pèse sur les promotions et amortit un
 * licenciement. Il vaut 0 quand on ne connaît personne qui compte.
 */
export function workplaceSupport(state: GameState): number {
  const team = teamOf(state);
  if (team.length === 0) return 0;

  // Surtout pas une moyenne pondérée : elle laisserait trois collègues sans
  // pouvoir compenser un supérieur hostile, ce qui est exactement le
  // contraire du principe. On somme, en donnant à l'influence un poids
  // quadratique — un appui qui pèse vaut beaucoup plus que plusieurs qui ne
  // pèsent pas — puis on borne par une tangente hyperbolique, qui reste
  // monotone au lieu d'écrêter.
  let sum = 0;
  for (const { role, person: npc } of team) {
    sum += ((npc.opinion - 50) / 50) * (role.influence / 100) ** 2;
  }
  return Math.tanh(sum);
}

/**
 * Satisfaction au travail, recalculée chaque année.
 *
 * Elle ne dépend presque pas de la réussite : ce qui rend un poste supportable
 * ou non, ce sont les heures, l'ambiance, le sens qu'on y trouve et l'écart
 * entre ce qu'on fait et ce à quoi on tient.
 */
export function computeSatisfaction(state: GameState): { value: number; reasons: string[] } {
  const p = state.player;
  const job = p.job;
  if (!job) return { value: 50, reasons: [] };
  const def = getJob(job.jobId);
  const reasons: string[] = [];
  let value = 50;

  const add = (delta: number, reason: string) => {
    value += delta;
    if (Math.abs(delta) >= 5) reasons.push(reason);
  };

  // Chaque terme est mesuré par rapport à ce qui est *ordinaire*, pas dans
  // l'absolu : sans cela, un poste banal accumulerait des malus et personne
  // ne serait jamais satisfait de son travail, ce qui serait faux et
  // ennuyeux. Un emploi moyen doit sortir aux alentours de cinquante.
  const standardHours = def?.hours ?? 38;
  add(-(job.hours - standardHours) * 0.8,
    job.hours > standardHours + 8 ? 'des semaines à rallonge' : 'des horaires tenables');
  // 45 est le niveau de pénibilité d'un métier quelconque.
  add(-((def?.stress ?? 45) - 45) / 5, 'un métier éprouvant');

  // L'équipe : un supérieur qui vous méprise pèse plus que trois collègues
  // sympathiques. Le point neutre est le milieu du tirage d'embauche, pas 50.
  const boss = bossOf(state);
  if (boss) add((boss.person.opinion - 44) / 3, boss.person.opinion > 62 ? 'un supérieur qui te soutient' : 'un supérieur difficile');
  const peers = teamOf(state).filter((x) => x.role.role !== 'supérieur');
  if (peers.length > 0) {
    const avg = peers.reduce((s, x) => s + x.person.relationship, 0) / peers.length;
    add((avg - 42) / 4, avg > 60 ? 'des collègues avec qui on rit' : 'une équipe qui ne s’entend pas');
  }

  // Le sens : ce que le poste sert, au regard de ce à quoi on tient.
  const psyche = p.psyche;
  add((psyche.values.achievement - 50) * (job.level / 10) / 5, 'un poste à la hauteur de ses ambitions');
  add(-(psyche.values.freedom - 50) / 8, 'peu de liberté');
  // Le salaire compte, mais relativement à ce que rapporte un emploi du même
  // niveau : gagner beaucoup n'est satisfaisant que comparé à autre chose.
  const typical = def?.levels[job.level]?.salary ?? job.salary;
  add(Math.max(-8, Math.min(10, (job.salary / Math.max(1, typical) - 1) * 20))
    * (psyche.values.money / 100), 'un salaire qui compte à ses yeux');
  if (job.effort === 'slack') add(-6, 'l’ennui');

  return { value: clampStat(value), reasons };
}

/* ------------------------------------------------------------------ */
/* Actions du joueur                                                   */
/* ------------------------------------------------------------------ */

function used(state: GameState, key: string): number {
  return state.player.yearActions[key] ?? 0;
}

function use(state: GameState, key: string): void {
  state.player.yearActions[key] = used(state, key) + 1;
}

/**
 * Demander une promotion.
 *
 * Différent d'une augmentation : on ne demande pas plus d'argent pour le même
 * poste, on demande la place au-dessus. Elle s'obtient sur les résultats *et*
 * sur les appuis, et la demander trop tôt laisse une trace.
 */
export function askPromotion(ctx: Ctx): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const job = p.job;
  if (!job) return { ok: false, message: 'Tu n’as pas d’emploi.' };
  const def = getJob(job.jobId);
  if (!def) return { ok: false, message: 'Poste inconnu.' };
  if (job.level >= def.levels.length - 1) {
    return { ok: false, message: 'Tu es déjà au sommet de cette hiérarchie.' };
  }
  if (used(state, 'askPromotion') >= 1) {
    return { ok: false, message: 'Tu as déjà demandé une promotion cette année.' };
  }
  use(state, 'askPromotion');

  const support = workplaceSupport(state);
  const psy = getPsycheContext(state);
  const chance = 6
    + (job.performance - 50) / 1.6
    + Math.min(22, job.yearsAtJob * 4)
    + support * 30
    + (psy.negotiation - 1) * 30
    - job.warnings * 9;

  if (rng.percent(chance)) {
    // La promotion elle-même appartient au système de carrière : on ne
    // duplique pas la logique de salaire et de titre ici.
    promote(ctx);
    return { ok: true, title: 'Promotion accordée', tone: 'good',
      message: 'On accepte de te confier la suite. Le poste au-dessus est à toi.' };
  }

  // Un refus n'est jamais neutre : demander trop tôt se retient.
  const boss = bossOf(state);
  if (job.yearsAtJob < 2 && boss) {
    boss.person.opinion = clampStat(boss.person.opinion - rng.float(3, 9));
    return { ok: true, title: 'Refus', tone: 'bad',
      message: `${boss.person.firstName} te fait remarquer que tu viens d’arriver. La demande est notée, mal.` };
  }
  p.stats.happiness = clampStat(p.stats.happiness - 4);
  return { ok: true, title: 'Refus', tone: 'bad',
    message: 'On te promet d’y réfléchir « au prochain cycle ». C’est non.' };
}

/**
 * Prendre des congés.
 *
 * Du repos réel contre un peu de performance. Trop de congés dans l'année et
 * quelqu'un finit par le remarquer.
 */
export function takeLeave(ctx: Ctx): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const job = p.job;
  if (!job) return { ok: false, message: 'Tu n’as pas d’emploi.' };
  if (job.leaveTaken >= 3) {
    return { ok: false, message: 'Tu as déjà pris tous tes congés cette année.' };
  }
  job.leaveTaken += 1;

  p.stats.stress = clampStat(p.stats.stress - rng.float(9, 18));
  p.stats.happiness = clampStat(p.stats.happiness + rng.float(4, 11));
  job.performance = clampStat(job.performance - rng.float(1, 4));

  if (job.leaveTaken >= 3) {
    const boss = bossOf(state);
    if (boss) boss.person.opinion = clampStat(boss.person.opinion - rng.float(2, 8));
    return { ok: true, title: 'Congés', tone: 'neutral',
      message: 'Tu coupes vraiment cette fois. Au retour, on te fait remarquer que tu étais très absent.' };
  }
  return { ok: true, title: 'Congés', tone: 'good',
    message: 'Quelques jours loin de tout. Tu reviens moins tendu.' };
}

/** Changer son volume horaire, avec ce que ça coûte de chaque côté. */
export function setHours(ctx: Ctx, hours: number): ActionResult {
  const { state } = ctx;
  const job = state.player.job;
  if (!job) return { ok: false, message: 'Tu n’as pas d’emploi.' };
  const target = Math.max(20, Math.min(60, Math.round(hours)));
  if (target === job.hours) return { ok: false, message: 'C’est déjà ton rythme.' };

  const def = getJob(job.jobId);
  const standard = def?.hours ?? 38;
  // Le salaire suit les heures, mais pas linéairement : on ne paie pas les
  // heures supplémentaires au même prix qu'on retire un mi-temps.
  const ratio = target / Math.max(1, job.hours);
  job.salary = Math.round(job.salary * (ratio < 1 ? ratio : 1 + (ratio - 1) * 0.55));
  job.hours = target;
  job.partTime = target < standard - 6;

  return { ok: true, title: 'Horaires', tone: 'neutral',
    message: target < standard
      ? `Tu passes à ${target} h par semaine. Moins d’argent, plus de temps.`
      : `Tu passes à ${target} h par semaine. Plus d’argent, moins de tout le reste.` };
}

/**
 * Demander une mutation.
 *
 * Change d'employeur sans changer de métier ni de niveau : la vraie raison
 * d'en demander une est de fuir une équipe ou un supérieur.
 */
export function requestTransfer(ctx: Ctx): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const job = p.job;
  if (!job) return { ok: false, message: 'Tu n’as pas d’emploi.' };
  if (job.yearsAtJob < 1) return { ok: false, message: 'Tu viens d’arriver ; personne ne te mutera.' };
  if (used(state, 'transfer') >= 1) {
    return { ok: false, message: 'Une demande de mutation par an, pas davantage.' };
  }
  use(state, 'transfer');

  const support = workplaceSupport(state);
  if (!rng.percent(25 + job.performance / 3 + support * 25)) {
    return { ok: true, title: 'Mutation refusée', tone: 'bad',
      message: 'On a besoin de toi là où tu es. C’est ce qu’on te dit, en tout cas.' };
  }

  const before = job.employer;
  job.employer = `${rng.pick(['Groupe', 'Société', 'Maison', 'Compagnie'])} ${rng.pick(
    ['Marceau', 'Delorme', 'Vasseur', 'Nordal', 'Rivera', 'Kessler', 'Aubry', 'Tanaka'],
  )}`;
  job.yearsAtJob = 0;
  job.leaveTaken = 0;
  // On ne garde personne : une mutation, c'est une équipe entière à refaire.
  for (const { person: npc } of teamOf(state)) {
    npc.relation = 'acquaintance';
    npc.flags.coworker = false;
  }
  job.team = buildTeam(ctx);
  job.satisfaction = computeSatisfaction(state).value;
  p.careerHistory.push({ title: job.title, employer: job.employer, from: state.year, to: null });
  const prev = p.careerHistory[p.careerHistory.length - 2];
  if (prev && prev.to === null) prev.to = state.year;

  ctx.log('work', `Tu as été muté${p.sex === 'F' ? 'e' : ''} de ${before} vers ${job.employer}.`, 'neutral');
  return { ok: true, title: 'Mutation acceptée', tone: 'good',
    message: `Tu changes de maison sans changer de métier. Nouvelle équipe, nouveau supérieur.` };
}

/* ------------------------------------------------------------------ */
/* Interactions avec l'équipe                                          */
/* ------------------------------------------------------------------ */

export type WorkAction =
  | 'askAdvice' | 'cover' | 'askCover' | 'reportToHR' | 'complain'
  | 'askPromotionTo' | 'takeCredit' | 'disrespectBoss';

function roleOf(state: GameState, personId: string): Coworker | undefined {
  return state.player.job?.team.find((c) => c.personId === personId);
}

/** Interactions propres au travail. */
export function workAction(ctx: Ctx, personId: string, action: WorkAction): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const job = p.job;
  const target = person(state, personId);
  const role = roleOf(state, personId);
  if (!job) return { ok: false, message: 'Tu n’as pas d’emploi.' };
  if (!target?.alive || !role) return { ok: false, message: 'Cette personne ne travaille plus avec toi.' };

  const key = `${action}:${personId}`;
  if (used(state, key) >= 1) {
    return { ok: false, message: `Tu as déjà fait cette démarche auprès de ${target.firstName} cette année.` };
  }
  use(state, key);

  switch (action) {
    case 'askAdvice': {
      // Un conseil ne vaut que ce que vaut celui qui le donne.
      if (rng.percent(25 + role.competence / 2 + target.relationship / 4)) {
        job.performance = clampStat(job.performance + rng.float(2, 7));
        target.relationship = clampStat(target.relationship + rng.float(2, 6));
        return { ok: true, title: 'Conseil', tone: 'good',
          message: `${target.firstName} te montre comment il s’y prend. Tu gagnes des mois.` };
      }
      return { ok: true, title: 'Conseil', tone: 'neutral',
        message: `${target.firstName} te répond des généralités. Tu n’es pas plus avancé.` };
    }

    case 'cover': {
      // Couvrir quelqu'un : le lien se resserre, la performance trinque.
      job.performance = clampStat(job.performance - rng.float(1, 5));
      target.relationship = clampStat(target.relationship + rng.float(7, 16));
      target.opinion = clampStat(target.opinion + rng.float(5, 12));
      shiftStat(state, 'karma', (2));
      return { ok: true, title: 'Couvrir', tone: 'good',
        message: `Tu prends sur toi ce que ${target.firstName} n’a pas fait. Il s’en souviendra.` };
    }

    case 'askCover': {
      const willing = target.relationship * 0.6
        + (target.psyche?.axes.generosity ?? target.personality.generosity) * 0.4;
      if (rng.percent(willing / 1.6)) {
        job.performance = clampStat(job.performance + rng.float(1, 5));
        target.relationship = clampStat(target.relationship - rng.float(1, 4));
        return { ok: true, title: 'Se faire couvrir', tone: 'good',
          message: `${target.firstName} accepte de dire qu’il s’en est occupé. Tu lui dois une.` };
      }
      target.opinion = clampStat(target.opinion - rng.float(2, 7));
      return { ok: true, title: 'Se faire couvrir', tone: 'bad',
        message: `${target.firstName} refuse net. La demande passe mal.` };
    }

    case 'reportToHR': {
      const hr = teamOf(state).find((x) => x.role.role === 'ressources humaines');
      if (!hr) {
        return { ok: true, title: 'Sans interlocuteur', tone: 'bad',
          message: 'Il n’y a personne à qui adresser ça ici. Tout se règle entre soi.' };
      }
      const heard = rng.percent(20 + hr.role.influence / 2 + workplaceSupport(state) * 25);
      target.relationship = clampStat(target.relationship - rng.float(15, 30));
      target.opinion = clampStat(target.opinion - rng.float(12, 25));
      // Le reste de l'équipe apprend qui a parlé.
      for (const { person: npc } of teamOf(state)) {
        if (npc.id === personId) continue;
        npc.opinion = clampStat(npc.opinion - rng.float(0, 7));
      }
      if (heard) {
        return { ok: true, title: 'Signalement', tone: 'neutral',
          message: `${hr.person.firstName} prend le dossier au sérieux. ${target.firstName} l’a su, et l’équipe aussi.` };
      }
      p.stats.stress = clampStat(p.stats.stress + rng.float(3, 9));
      return { ok: true, title: 'Signalement classé', tone: 'bad',
        message: `On classe sans suite. Il ne reste que la rancune de ${target.firstName}.` };
    }

    case 'complain': {
      // Se plaindre auprès de quelqu'un qui pèse, ou dans le vide.
      if (rng.percent(15 + role.influence / 2 + target.relationship / 4)) {
        p.stats.stress = clampStat(p.stats.stress - rng.float(4, 10));
        job.satisfaction = clampStat(job.satisfaction + rng.float(3, 9));
        return { ok: true, title: 'Doléance entendue', tone: 'good',
          message: `${target.firstName} remonte le problème, et quelque chose change.` };
      }
      target.opinion = clampStat(target.opinion - rng.float(1, 6));
      return { ok: true, title: 'Doléance', tone: 'neutral',
        message: `${target.firstName} compatit poliment. Rien ne bougera.` };
    }

    case 'takeCredit': {
      // S'attribuer le travail d'un autre : payant, et rarement invisible.
      const caught = rng.percent(35 + role.influence / 3 - p.psyche.communication.composure / 4);
      if (!caught) {
        job.performance = clampStat(job.performance + rng.float(4, 10));
        shiftStat(state, 'karma', -(6));
        return { ok: true, title: 'Mérite détourné', tone: 'good',
          message: `Personne n’a rien vu. Le travail de ${target.firstName} porte ton nom.` };
      }
      target.relationship = clampStat(target.relationship - rng.float(18, 35));
      target.opinion = clampStat(target.opinion - rng.float(15, 30));
      shiftStat(state, 'karma', -(8));
      p.stats.reputation = clampStat(p.stats.reputation - rng.float(3, 8));
      job.warnings += 1;
      for (const { person: npc } of teamOf(state)) {
        if (npc.id === personId) continue;
        npc.opinion = clampStat(npc.opinion - rng.float(3, 11));
      }
      return { ok: true, title: 'Pris sur le fait', tone: 'bad',
        message: `${target.firstName} l’a fait savoir. Toute l’équipe sait maintenant à qui elle a affaire.` };
    }

    case 'askPromotionTo': {
      if (role.role !== 'supérieur') {
        return { ok: false, message: `${target.firstName} n’a pas ce pouvoir.` };
      }
      return askPromotion(ctx);
    }

    case 'disrespectBoss': {
      if (used(state, `disrespectWork:${personId}`) >= 1) {
        return { ok: false, message: 'Une fois par an suffit largement.' };
      }
      use(state, `disrespectWork:${personId}`);
      const psyche = target.psyche;
      const calm = psyche ? psyche.emotion.angerControl : 50;
      const temper = psyche ? psyche.axes.aggression : target.personality.temper;

      target.relationship = clampStat(target.relationship - rng.float(14, 30));
      target.opinion = clampStat(target.opinion - rng.float(12, 26));
      job.warnings += 1;

      // Le supérieur encaisse, sanctionne, ou licencie séance tenante.
      const heat = temper * 0.7 + (100 - calm) * 0.5 + job.warnings * 12
        - job.performance * 0.4 + rng.float(-20, 20);
      if (heat > 78) {
        const name = target.firstName;
        fire(ctx, 'insubordination');
        return { ok: true, title: 'Licenciement immédiat', tone: 'bad',
          message: `${name} ne laisse pas passer. Tu vides ton bureau le jour même.` };
      }
      if (heat > 48) {
        job.performance = clampStat(job.performance - rng.float(4, 12));
        return { ok: true, title: 'Avertissement', tone: 'bad',
          message: `${target.firstName} te convoque et met un avertissement au dossier.` };
      }
      // Un supérieur qui encaisse en public perd de l'autorité.
      const rolePos = job.team.find((c) => c.personId === personId);
      if (rolePos) rolePos.influence = clampStat(rolePos.influence - rng.float(3, 10));
      return { ok: true, title: 'Silence gêné', tone: 'neutral',
        message: `${target.firstName} encaisse devant tout le monde. Ce n’est pas à ton avantage, mais pas au sien non plus.` };
    }
  }
}

/* ------------------------------------------------------------------ */
/* Vie annuelle de l'équipe                                            */
/* ------------------------------------------------------------------ */

/**
 * Fait vivre le bureau : la satisfaction se recalcule, les collègues partent
 * et arrivent, les rivaux progressent.
 */
export function advanceWorkplace(ctx: Ctx): void {
  const { state, rng } = ctx;
  const p = state.player;
  const job = p.job;
  if (!job) return;

  job.leaveTaken = 0;
  // Un avertissement s'efface avec le temps, lentement.
  if (job.warnings > 0 && rng.chance(0.3)) job.warnings -= 1;

  // L'équipe se renouvelle : on ne garde pas les mêmes collègues vingt ans.
  for (const entry of [...job.team]) {
    const npc = state.npcs[entry.personId];
    if (!npc?.alive) {
      job.team = job.team.filter((c) => c.personId !== entry.personId);
      continue;
    }
    entry.seniority += 1;
    // Un rival ambitieux gagne du terrain, et vous en fait perdre.
    if (entry.role === 'rival' && rng.chance(0.25)) {
      entry.influence = clampStat(entry.influence + rng.float(3, 10));
      if (rng.chance(0.4)) {
        job.performance = clampStat(job.performance - rng.float(1, 5));
        ctx.log('work', `${fullName(npc)} prend de la place, et pas à ton avantage.`, 'bad');
      }
    }
    // Départ naturel.
    if (rng.chance(0.09)) {
      job.team = job.team.filter((c) => c.personId !== entry.personId);
      forget(state, npc);
      ctx.log('work', `${fullName(npc)} a quitté ${job.employer}.`, 'neutral');
    }
  }

  // Arrivée d'un nouveau, quand l'équipe s'est vidée.
  if (job.team.filter((c) => c.role !== 'supérieur').length < 2 && rng.chance(0.5)) {
    const before = job.team.length;
    job.team.push(...buildTeam(ctx).filter((c) => c.role !== 'supérieur').slice(0, 1));
    if (job.team.length > before) {
      const npc = state.npcs[job.team[job.team.length - 1].personId];
      if (npc) ctx.log('work', `${fullName(npc)} rejoint l’équipe.`, 'neutral');
    }
  }

  const { value } = computeSatisfaction(state);
  job.satisfaction = Math.round(job.satisfaction * 0.4 + value * 0.6);

  // Un travail détesté use, un travail aimé porte.
  p.stats.happiness = clampStat(p.stats.happiness + (job.satisfaction - 50) / 12);
  p.stats.stress = clampStat(p.stats.stress + (50 - job.satisfaction) / 14);
}

/**
 * Détache l'équipe quand on quitte l'entreprise.
 *
 * Les collègues avec qui un lien s'est noué restent dans la partie ; les
 * autres disparaissent. Sans cela, une carrière de sept postes laisserait
 * derrière elle une trentaine de figurants que le moteur ferait vieillir
 * chaque année pour rien.
 */
export function leaveTeam(ctx: Ctx): void {
  const { state } = ctx;
  for (const { person: npc } of teamOf(state)) forget(state, npc);
  if (state.player.job) state.player.job.team = [];
}

/** Sort quelqu'un de l'équipe, et de la partie s'il n'y a plus de lien. */
function forget(state: GameState, npc: Person): void {
  npc.flags.coworker = false;
  // Un lien réel survit au changement d'entreprise ; une relation de bureau
  // ordinaire s'éteint avec elle.
  if (npc.relationship >= 62) {
    npc.relation = 'friend';
    return;
  }
  delete state.npcs[npc.id];
}
