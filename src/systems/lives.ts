/**
 * La vie des autres.
 *
 * Jusqu'ici, un PNJ vieillissait, prenait sa retraite à soixante-cinq ans et
 * mourait. C'était tout. Mesuré sur soixante vies : zéro mariage, zéro
 * naissance, zéro prison, zéro maladie, zéro déménagement — et 49,2 % des
 * personnes du jeu sans une seule ligne d'histoire.
 *
 * Ce fichier leur donne une trajectoire. Quatorze tournants, un par personne
 * et par an au plus, chacun avec son vrai branchement : on ne naît pas « par
 * table », on ne se marie pas en changeant un champ.
 *
 * Trois choses en font un système et non un ticker :
 *
 * **1. Les tournants créent des gens.** Un frère qui se marie fait apparaître
 * une belle-sœur ; il a ensuite un enfant, et c'est un neveu. Ces personnes
 * sont de vrais `Person` enregistrés, avec leur propre trajectoire — donc le
 * neveu grandira, travaillera, se mariera à son tour.
 *
 * **2. On n'apprend pas tout de tout le monde.** Le tournant d'une sœur passe
 * dans le journal ; celui d'un cousin s'écrit dans son histoire à lui, et le
 * joueur le découvre en allant voir sa fiche. C'est la différence entre un
 * monde et un fil d'actualité.
 *
 * **3. Ça revient vers le joueur.** Le patrimoine des PNJ décide de ce qu'il
 * hérite (`systems/inheritance.ts` le lit directement) ; quelqu'un qui part
 * loin devient difficile à garder ; quelqu'un en prison ne se voit qu'en
 * visite ; et qui se retrouve sans rien peut se tourner vers lui.
 */

import { clampStat, type Rng } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import { fullName, person } from '../engine/context.ts';
import type {
  ActionResult, GameState, PendingEvent, Person, RelationKind, Stats,
} from '../engine/types.ts';
import {
  ASK_CEILING, ASK_COOLDOWN, ASK_FLOOR, ASK_ODDS, ASK_SHARE, DRIFT_APART,
  DRIFT_SETTLES, FAR_FLOOR, IDLE_BURN, VOWS_RIPEN, VOWS_RIPE_MAX,
  ILLNESS_TOLL, KID_CAP, KID_FADE, PLAYERS_OWN, PLAYERS_SPHERES, SAVE_RATE,
  SENTENCE, SETBACK, TOLD_ALWAYS, TOLD_BOND, TURNS, VISIT, WINDFALL,
  getTurn, type Turn, type TurnId,
} from '../data/lives.ts';
import { JOBS } from '../data/jobs.ts';
import { getCountry } from '../data/countries.ts';
import { createPerson, noteHistory } from './npc.ts';
import { registerSystemResolver } from './randomEvents.ts';
import { wrong } from './grudges.ts';

export { TURNS, getTurn };
export type { Turn, TurnId };

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

/** Est-il en train de vivre une maladie ? */
export function ailing(p: Person): boolean {
  return p.flags.illness === true;
}

/** Est-il parti vivre ailleurs ? */
export function faraway(p: Person): boolean {
  return p.flags.far === true;
}

/** Depuis combien d'années il est avec quelqu'un. */
export function together(state: GameState, p: Person): number {
  const since = Number(p.flags.since ?? state.year);
  return Math.max(0, state.year - since);
}

/** Combien d'années il lui reste à purger. */
export function sentenceLeft(p: Person): number {
  return Math.max(0, Number(p.flags.sentence ?? 0));
}

/** Est-il du premier cercle — celui dont on apprend tout ? */
export function inner(p: Person): boolean {
  return !p.estranged && (TOLD_ALWAYS.includes(p.relation) || p.relationship >= 70);
}

/**
 * Le joueur apprend-il *ce tournant-là* de celui-là ?
 *
 * Deux filtres, et il faut les deux. Le premier tient à la nouvelle : on
 * n'apprend pas qu'un frère a changé d'échelon ni qu'il voit quelqu'un — ce
 * n'est pas une nouvelle, c'est sa vie, et elle est dans son histoire. Le
 * second tient à la distance : le mariage d'une cousine se sait, son
 * licenciement non.
 *
 * Sans ces deux filtres, une seule vie récoltait deux cents lignes sur les
 * autres. Un journal où sa sœur est promue tous les six ans n'est pas un
 * monde vivant : c'est un fil d'actualité.
 */
export function told(p: Person, turn: Turn): boolean {
  if (turn.quiet) return false;
  if (p.estranged) return false;
  if (inner(p)) return true;
  return turn.big === true && p.relationship >= TOLD_BOND;
}

/** Ce que le plancher du lien devient quand la personne est loin. */
export function farPenalty(p: Person): number {
  return faraway(p) ? FAR_FLOOR : 0;
}

/* ------------------------------------------------------------------ */
/* Choisir le tournant de l'année                                      */
/* ------------------------------------------------------------------ */

/** Le tournant est-il seulement possible pour cette personne cette année ? */
export function turnOpen(state: GameState, p: Person, turn: Turn): boolean {
  if (p.age < turn.from || p.age > turn.to) return false;
  if (turn.marital && !turn.marital.includes(p.maritalStatus)) return false;
  if (turn.job === 'oui' && (!p.jobTitle || p.jobTitle === 'Retraité')) return false;
  if (turn.job === 'non' && p.jobTitle) return false;

  // La maladie et la guérison sont les deux faces d'un même état : on ne
  // tombe pas malade en l'étant déjà, et on ne guérit pas de rien.
  if (turn.id === 'maladie' && ailing(p)) return false;
  if (turn.id === 'guerison' && !ailing(p)) return false;
  // On ne fait rien de tout cela depuis une cellule, sauf en sortir.
  if (p.incarcerated) return false;
  // Un enfant qu'on élève a déjà son propre système ; on ne va pas le marier.
  if (p.upbringing && p.age < 18) return false;
  // On ne fait pas quinze enfants. La chance décroît d'abord (`turnOdds`),
  // et s'arrête ici.
  if (turn.id === 'naissance' && p.childrenIds.length >= KID_CAP) return false;
  // Le couple du joueur ne se joue pas ici. Son conjoint peut perdre son
  // travail ou tomber malade ; il ne se marie pas de son côté.
  if (PLAYERS_OWN.includes(p.relation) && PLAYERS_SPHERES.includes(turn.sphere)) return false;
  void state;
  return true;
}

/**
 * La chance annuelle de ce tournant pour cette personne-là.
 *
 * Le caractère pousse (l'ambitieux monte, le colérique rompt), et une
 * statistique pousse aussi (la fertilité pour une naissance, la criminalité
 * pour une condamnation). Les deux sont des facteurs autour de 1, pas des
 * additions : c'est ce qui garde les chances de base lisibles dans les
 * données.
 */
export function turnOdds(p: Person, turn: Turn): number {
  let odds = turn.odds;
  if (turn.driver) odds *= 0.45 + (p.personality[turn.driver] / 100) * 1.3;
  if (turn.push) {
    const value = p.stats[turn.push.stat] / 100;
    odds *= Math.max(0.1, 1 + (value - 0.5) * 2 * turn.push.weight);
  }
  // Chaque enfant déjà là rend le suivant moins probable. C'est ce qui
  // remplace un plafond brutal par une fratrie de taille plausible.
  if (turn.id === 'naissance') odds *= KID_FADE ** p.childrenIds.length;
  return Math.max(0, Math.min(0.9, odds));
}

/** La même chance, quand elle dépend du temps passé ensemble. */
export function coupleOdds(state: GameState, p: Person, turn: Turn): number {
  const odds = turnOdds(p, turn);
  if (turn.id !== 'mariage') return odds;
  // Une histoire qui dure finit par se déclarer.
  return Math.min(0.9, odds * Math.min(VOWS_RIPE_MAX, 1 + together(state, p) * VOWS_RIPEN));
}

/**
 * Le tournant que cette personne prend cette année, s'il y en a un.
 *
 * On parcourt la liste en partant d'un rang qui tourne, plutôt que de la
 * mélanger. Deux raisons, et la seconde est la vraie :
 *
 * 1. Sans rotation, le premier tournant de la liste passe toujours en
 *    premier et rafle les années — c'est exactement ce qui était arrivé au
 *    calendrier des occasions, où « le premier jour » représentait quatre
 *    vingts pour cent de tout ce que le joueur voyait.
 * 2. Mélanger coûtait treize tirages par personne et par année, **même les
 *    années où rien n'arrive** : quelques millions de tirages par mesure,
 *    et surtout un décalage massif de la séquence aléatoire de tout le jeu.
 *    Une rotation n'en coûte aucun.
 */
export function rollTurn(rng: Rng, state: GameState, p: Person): Turn | null {
  const start = (state.year + p.birthMonth + p.birthDay) % TURNS.length;
  for (let i = 0; i < TURNS.length; i++) {
    const turn = TURNS[(start + i) % TURNS.length];
    if (!turnOpen(state, p, turn)) continue;
    if (rng.chance(coupleOdds(state, p, turn))) return turn;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Les gens que les tournants font apparaître                          */
/* ------------------------------------------------------------------ */

/**
 * Ce qu'est, pour le joueur, l'enfant de quelqu'un qu'il connaît.
 *
 * L'enfant d'un frère est un neveu ; celui d'un enfant, un petit-fils —
 * relation qui existait déjà et que personne ne créait jamais. Au-delà, le
 * jeu ne prétend pas nommer : l'enfant d'une connaissance reste une
 * connaissance, et c'est honnête.
 */
export function childRelation(parent: RelationKind, sex: 'M' | 'F'): RelationKind | null {
  switch (parent) {
    case 'brother': case 'sister':
      return sex === 'M' ? 'nephew' : 'niece';
    case 'son': case 'daughter':
      return sex === 'M' ? 'grandson' : 'granddaughter';
    case 'uncle': case 'aunt':
      return 'cousin';
    default:
      return null;
  }
}

/**
 * Ce qu'est, pour le joueur, le conjoint de quelqu'un qu'il connaît.
 *
 * Le sexe du conjoint décide, pas celui de la personne mariée : la première
 * version rendait « tante » pour le conjoint d'un oncle sans regarder qui
 * c'était, et le fixture a sorti une tante prénommée Erik. Un libellé qui
 * contredit la personne qu'il désigne est un défaut d'affichage, pas un
 * détail.
 */
export function partnerRelation(of: RelationKind, mateSex: 'M' | 'F'): RelationKind | null {
  if (['brother', 'sister', 'son', 'daughter'].includes(of)) return 'inLaw';
  if (['uncle', 'aunt'].includes(of)) return mateSex === 'M' ? 'uncle' : 'aunt';
  return null;
}

/**
 * Le sexe de celui ou celle qu'il épouse, d'après son orientation.
 *
 * Tiré au hasard, il mariait la moitié des gens contre leur orientation —
 * qui est une donnée de leur fiche depuis le début et que personne ne lisait.
 */
export function mateSexOf(rng: Rng, p: Person): 'M' | 'F' {
  if (p.orientation === 'homo') return p.sex;
  if (p.orientation === 'bi') return rng.chance(0.5) ? 'M' : 'F';
  return p.sex === 'M' ? 'F' : 'M';
}

/* ------------------------------------------------------------------ */
/* Prendre le tournant                                                 */
/* ------------------------------------------------------------------ */

function sexed(text: string, p: Person): string {
  return text.replace(/\{p\}/g, p.firstName).replace(/\{e\}/g, p.sex === 'F' ? 'e' : '');
}

function shift(p: Person, shifts: Partial<Record<keyof Stats, number>> | undefined): void {
  if (!shifts) return;
  for (const [key, value] of Object.entries(shifts)) {
    p.stats[key as keyof Stats] = clampStat(p.stats[key as keyof Stats] + value);
  }
}

/** Un poste au hasard, cohérent avec l'âge. */
function someJob(rng: Rng, state: GameState, p: Person): { title: string; salary: number } {
  const country = getCountry(state.player?.countryId ?? 'fr');
  const job = rng.weighted(JOBS, (j) => (j.requiresLevel <= 2 ? 3 : 1));
  const index = Math.min(job.levels.length - 1, Math.max(0, Math.floor((p.age - 22) / 9)));
  const level = job.levels[index];
  return {
    title: level.title,
    // L'inflation compte : une offre faite au joueur vaut
    // `grille × salaryIndex × inflation`, et un PNJ embauché la même année
    // pour le même poste doit être payé dans la même monnaie.
    salary: Math.round(
      level.salary * country.salaryIndex * state.world.inflation * rng.float(0.8, 1.25),
    ),
  };
}

/**
 * Le poste juste au-dessus du sien, quand il y en a un.
 *
 * Une promotion qui ne change que le salaire n'est pas une promotion : c'est
 * une augmentation. On cherche donc le métier dont ce titre fait partie, et
 * l'on monte réellement d'un échelon — le titre affiché sur sa fiche change.
 */
export function nextRung(title: string): { title: string; salary: number } | null {
  for (const job of JOBS) {
    const at = job.levels.findIndex((l) => l.title === title);
    if (at < 0 || at >= job.levels.length - 1) continue;
    const up = job.levels[at + 1];
    return { title: up.title, salary: up.salary };
  }
  return null;
}

/**
 * Applique le tournant. C'est ici qu'est le système.
 *
 * Chaque branche fait quelque chose de différent au monde : certaines
 * changent un état, d'autres créent une personne, une autre encore ouvre une
 * scène chez le joueur. Aucune ne se contente d'écrire une ligne.
 */
export function takeTurn(ctx: Ctx, p: Person, turn: Turn): void {
  const { state, rng } = ctx;

  switch (turn.id) {
    case 'embauche': {
      const job = someJob(rng, state, p);
      p.jobTitle = job.title;
      p.salary = job.salary;
      break;
    }
    case 'promotion': {
      const up = nextRung(p.jobTitle ?? '');
      if (up) {
        p.jobTitle = up.title;
        p.salary = Math.max(p.salary, Math.round(
          up.salary * getCountry(state.player?.countryId ?? 'fr').salaryIndex
          * state.world.inflation,
        ));
      } else {
        // Au sommet de son échelle il n'y a plus de titre à prendre ; ce qui
        // monte alors, c'est ce qu'on lui paie.
        p.salary = Math.round(p.salary * rng.float(1.08, 1.25));
      }
      break;
    }
    case 'reconversion': {
      const job = someJob(rng, state, p);
      p.jobTitle = job.title;
      // Repartir ailleurs coûte : on recommence rarement au même niveau.
      // `someJob` a déjà posé la monnaie de l'année : on ne réindexe pas,
      // on applique seulement ce que repartir ailleurs coûte.
      p.salary = Math.round(job.salary * rng.float(0.6, 1.05));
      break;
    }
    case 'licenciement': {
      p.jobTitle = null;
      p.salary = 0;
      break;
    }
    case 'affaire': {
      p.wealth = Math.round(Math.max(p.wealth, 4000) * rng.float(WINDFALL.min, WINDFALL.max));
      break;
    }
    case 'revers': {
      p.wealth = Math.round(p.wealth * rng.float(SETBACK.min, SETBACK.max));
      break;
    }
    case 'rencontre': {
      p.maritalStatus = 'dating';
      // Depuis quand : c'est ce qui distingue une histoire qui commence
      // d'une histoire qui dure, et les deux ne se comportent pas pareil.
      p.flags.since = state.year;
      break;
    }
    case 'mariage': {
      p.maritalStatus = 'married';
      // Le conjoint existe vraiment : c'est une belle-sœur qu'on pourra
      // croiser, pas un champ `partnerId` pointant vers rien.
      const mateSex = mateSexOf(rng, p);
      const kin = partnerRelation(p.relation, mateSex);
      if (kin && !p.partnerId) {
        const mate = createPerson(ctx, {
          relation: kin,
          sex: mateSex,
          age: Math.max(19, p.age + rng.int(-6, 6)),
          relationship: rng.int(35, 60),
          wealthBase: Math.max(8000, Math.round(p.wealth * 0.6)),
        });
        mate.partnerId = p.id;
        mate.maritalStatus = 'married';
        p.partnerId = mate.id;
        noteHistory(state, mate, `Épouse ${fullName(p)}.`);
      }
      break;
    }
    case 'rupture': {
      p.maritalStatus = p.maritalStatus === 'married' ? 'divorced' : 'single';
      const mate = person(state, p.partnerId);
      if (mate) {
        mate.partnerId = null;
        mate.maritalStatus = p.maritalStatus;
        p.exPartnerIds.push(mate.id);
        noteHistory(state, mate, `Se sépare de ${fullName(p)}.`);
      }
      p.partnerId = null;
      break;
    }
    case 'naissance': {
      const kin = childRelation(p.relation, rng.chance(0.5) ? 'M' : 'F');
      // On ne crée quelqu'un que si le joueur a une raison de le connaître.
      // L'enfant d'une connaissance existe sans doute ; il n'entre pas dans
      // la liste des gens que le joueur voit.
      if (kin) {
        const baby = createPerson(ctx, {
          relation: kin,
          age: 0,
          lastName: p.lastName,
          relationship: rng.int(40, 65),
          withJob: false,
          parentIds: [p.id],
        });
        p.childrenIds.push(baby.id);
        const mate = person(state, p.partnerId);
        if (mate) { baby.parentIds.push(mate.id); mate.childrenIds.push(baby.id); }
        noteHistory(state, baby, `Naissance. Enfant de ${fullName(p)}.`);
      } else {
        // Compté quand même : sa fiche dira qu'il a des enfants.
        p.childrenIds.push(`hors_${ctx.id('c')}`);
      }
      break;
    }
    case 'maladie': {
      p.flags.illness = true;
      break;
    }
    case 'guerison': {
      delete p.flags.illness;
      break;
    }
    case 'condamnation': {
      p.incarcerated = true;
      p.flags.sentence = rng.int(SENTENCE.min, SENTENCE.max);
      p.jobTitle = null;
      p.salary = 0;
      break;
    }
    case 'depart': {
      p.flags.far = true;
      break;
    }
  }

  shift(p, turn.shifts);
  if (turn.bond) p.relationship = clampStat(p.relationship + turn.bond);
  noteHistory(state, p, sexed(turn.line, p));

  // Ce que le joueur en apprend — et seulement s'il est en position de
  // l'apprendre. C'est la règle qui empêche le journal de devenir un fil.
  if (told(p, turn)) {
    ctx.log(channelOf(turn), `${fullName(p)} — ${sexed(turn.told, p).replace(`${p.firstName} `, '')}`, turn.tone);
  }

  // Certains tournants laissent quelqu'un dans une situation où il se tourne
  // vers celui qu'il connaît. C'est la seule chose du système qui attend une
  // réponse ; tout le reste se contente d'arriver.
  if (turn.asks && inner(p) && rng.chance(ASK_ODDS)
    && state.year - Number(p.flags.asked ?? -999) >= ASK_COOLDOWN) {
    p.flags.asked = state.year;
    askPlayer(ctx, p, turn);
  }
}

function channelOf(turn: Turn) {
  switch (turn.sphere) {
    case 'métier': return 'work' as const;
    case 'cœur': return 'love' as const;
    case 'famille': return 'family' as const;
    case 'corps': return 'health' as const;
    case 'loi': return 'justice' as const;
    case 'lieu': return 'family' as const;
  }
}

/* ------------------------------------------------------------------ */
/* Le parloir                                                          */
/* ------------------------------------------------------------------ */

/** Pourquoi on ne peut pas y aller, ou rien. */
export function visitBlocker(state: GameState, p: Person): string | null {
  if (!p.alive) return `${p.firstName} n’est plus là.`;
  if (!p.incarcerated) return `${p.firstName} n’est pas détenu${p.sex === 'F' ? 'e' : ''}.`;
  if (p.estranged) return `Tu as coupé les ponts avec ${p.firstName}.`;
  if (state.player.prison) return 'Tu es toi-même à l’intérieur.';
  if (Number(p.flags.visited ?? -999) === state.year) {
    return `Tu y es déjà allé${state.player.sex === 'F' ? 'e' : ''} cette année.`;
  }
  return null;
}

/** Combien de fois on est allé le voir. */
export function visits(p: Person): number {
  return Number(p.flags.visits ?? 0);
}

/**
 * Aller au parloir.
 *
 * Elle ne raccourcit rien : une peine se purge. Ce qu'elle change, c'est
 * l'état dans lequel il en sort — et le lien, qui autrement s'effondrerait
 * pendant que la personne est hors d'atteinte.
 */
export function visit(ctx: Ctx, personId: string): ActionResult {
  const { state } = ctx;
  const p = person(state, personId);
  if (!p) return { ok: false, message: 'Personne.' };
  const why = visitBlocker(state, p);
  if (why) return { ok: false, message: why, tone: 'bad' };

  p.flags.visited = state.year;
  p.flags.visits = visits(p) + 1;
  p.relationship = clampStat(p.relationship + VISIT.bond);
  p.opinion = clampStat(p.opinion + 5);
  p.lastInteractionYear = state.year;
  for (const [key, value] of Object.entries(VISIT.gives)) {
    p.stats[key as keyof Stats] = clampStat(p.stats[key as keyof Stats] + value);
  }
  for (const [key, value] of Object.entries(VISIT.costs)) {
    state.player.stats[key as keyof Stats] = clampStat(state.player.stats[key as keyof Stats] + value);
  }
  noteHistory(state, p, 'Reçoit une visite.');
  ctx.log('family', `Tu es allé voir ${fullName(p)} au parloir.`, 'good');
  return {
    ok: true,
    title: 'Au parloir',
    tone: 'good',
    message: `Une heure, une table, et pas grand-chose à dire. ${p.firstName} te remercie d’être venu${state.player.sex === 'F' ? 'e' : ''}.`,
  };
}

/* ------------------------------------------------------------------ */
/* Ce qu'on nous demande                                               */
/* ------------------------------------------------------------------ */

/**
 * Ce qu'un coup de main coûterait, pour ce joueur-là — ou zéro.
 *
 * Zéro veut dire : tu n'as pas de quoi. On ne propose alors pas un geste qui
 * ferait basculer le compte ; on laisse la personne demander et le joueur
 * répondre qu'il ne peut pas, ce qui est une scène en soi.
 */
export function askAmount(state: GameState): number {
  const money = state.player.money;
  const want = Math.max(ASK_FLOOR, Math.round(money * ASK_SHARE));
  return money * ASK_CEILING >= want ? want : 0;
}

function askPlayer(ctx: Ctx, p: Person, turn: Turn): PendingEvent {
  const { state } = ctx;
  const amount = askAmount(state);
  const money = turn.asks === 'argent' && amount > 0;
  const choices = money
    ? [
      { label: `Lui donner ${amount.toLocaleString('fr-FR')} $`, outcome: 'aider' },
      { label: 'Dire que tu ne peux pas', outcome: 'refuser' },
    ]
    : turn.asks === 'argent'
      ? [{ label: 'Dire que tu n’as rien', outcome: 'refuser' }]
      : [
        { label: 'Y aller', outcome: 'aider' },
        { label: 'Laisser passer', outcome: 'refuser' },
      ];

  const pending: PendingEvent = {
    id: ctx.id('ask'),
    eventId: `demande_${turn.id}`,
    title: `${fullName(p)} t’appelle`,
    text: money
      ? `${sexed(turn.told, p)} ${p.sex === 'F' ? 'Elle' : 'Il'} demande si tu peux l’aider à tenir quelques mois.`
      : `${sexed(turn.told, p)} ${p.sex === 'F' ? 'Elle' : 'Il'} ne demande rien, mais tu entends bien ce que ça veut dire.`,
    choices,
    icon: money ? '📞' : '🤝',
    payload: { system: 'demande', who: p.id, kind: money ? 'argent' : 'présence', amount },
  };
  state.pending.push(pending);
  return pending;
}

registerSystemResolver('demande', (ctx, pending, choiceIndex) => {
  const { state } = ctx;
  const who = person(state, String(pending.payload?.who ?? ''));
  if (!who) return { text: '', tone: 'neutral' };
  const money = String(pending.payload?.kind) === 'argent';
  const amount = Number(pending.payload?.amount ?? 0);
  const helped = pending.choices[choiceIndex]?.outcome === 'aider';

  if (!helped) {
    who.relationship = clampStat(who.relationship - (money ? 9 : 12));
    who.opinion = clampStat(who.opinion - 8);
    noteHistory(state, who, 'A demandé de l’aide, sans réponse.');
    // Ce qu'il en garde. C'est la seule voie par laquelle une vie jouée
    // ordinairement peut se faire un ennemi : mesuré sans elle, 0 % des vies
    // en comptaient un, parce que le seul chemin passait par le bouton
    // « insulter » que personne ne presse par accident.
    wrong(ctx, who, 'abandon');
    state.player.stats.karma = clampStat(state.player.stats.karma - 3);
    ctx.log('family', `Tu n’as rien fait pour ${fullName(who)}.`, 'bad');
    return { text: `${who.firstName} n’insiste pas. C’est peut-être le pire.`, tone: 'bad' };
  }

  if (money) {
    // On ne donne pas ce qu'on n'a pas : la scène le dit plutôt que de
    // mettre le joueur à découvert dans son dos.
    if (state.player.money < amount) {
      who.relationship = clampStat(who.relationship - 3);
      ctx.log('money', `Tu n’avais pas de quoi aider ${fullName(who)}.`, 'bad');
      return { text: 'Tu regardes ton compte, et tu ne dis rien.', tone: 'bad' };
    }
    state.player.money -= amount;
    who.wealth += amount;
    who.stats.stress = clampStat(who.stats.stress - 14);
  } else {
    who.stats.happiness = clampStat(who.stats.happiness + 12);
    who.stats.stress = clampStat(who.stats.stress - 10);
    state.player.stats.stress = clampStat(state.player.stats.stress + 4);
  }

  who.relationship = clampStat(who.relationship + (money ? 10 : 14));
  who.opinion = clampStat(who.opinion + 10);
  who.lastInteractionYear = state.year;
  noteHistory(state, who, `A été aidé${who.sex === 'F' ? 'e' : ''} au bon moment.`);
  state.player.stats.karma = clampStat(state.player.stats.karma + 4);
  ctx.log('family', `Tu as aidé ${fullName(who)}.`, 'good');
  return {
    text: money
      ? `${who.firstName} te remboursera, dit-${who.sex === 'F' ? 'elle' : 'il'}. Peut-être.`
      : `Tu y vas. Vous ne parlez pas beaucoup, et ce n’était pas le sujet.`,
    tone: 'good',
  };
});

/* ------------------------------------------------------------------ */
/* L'année                                                             */
/* ------------------------------------------------------------------ */

/**
 * Ce qui se passe pour une personne pendant une année.
 *
 * Les états d'abord — une maladie use, une peine se purge —, puis le
 * tournant éventuel. On ne prend pas un tournant l'année où l'on sort de
 * prison : cette année-là est déjà la sienne.
 */
export function advanceLife(ctx: Ctx, p: Person): void {
  const { state, rng } = ctx;
  if (!p.alive || p.petSpecies) return;

  // Une maladie qui dure use, jusqu'à emporter.
  if (ailing(p)) {
    p.stats.health = clampStat(p.stats.health - ILLNESS_TOLL);
    p.stats.happiness = clampStat(p.stats.happiness - 2);
  }

  // Le patrimoine : ce qu'on met de côté quand on gagne, ce qu'on entame
  // quand on ne gagne plus. Une part, jamais un montant fixe — c'est ce qui
  // ruinait plus de la moitié du monde.
  if (p.jobTitle === 'Retraité') {
    // Une pension couvre de quoi vivre, elle ne fait pas fortune. Le premier
    // réglage laissait les retraités épargner 11 % de leur pension pendant
    // vingt ans, et le patrimoine médian du joueur — qui en hérite — montait
    // de moitié.
    p.wealth = Math.max(0, Math.round(p.wealth * (1 - IDLE_BURN * 0.3)));
  } else if (p.salary > 0) {
    p.wealth = Math.max(0, Math.round(p.wealth + p.salary * SAVE_RATE));
  } else if (p.age >= 20) {
    p.wealth = Math.max(0, Math.round(p.wealth * (1 - IDLE_BURN)));
  }

  // La peine se purge, et la sortie est un événement en soi.
  if (p.incarcerated) {
    const left = sentenceLeft(p) - 1;
    if (left <= 0) {
      p.incarcerated = false;
      delete p.flags.sentence;
      // Ce qu'on a fait pendant qu'il était dedans compte à la sortie : on
      // ne ressort pas pareil selon que quelqu'un est venu ou non.
      const spared = Math.min(VISIT.sparesMax, visits(p) * VISIT.spares);
      if (spared > 0) p.stats.reputation = clampStat(p.stats.reputation + spared);
      delete p.flags.visits;
      noteHistory(state, p, spared > 0 ? 'Sort de prison, attendu.' : 'Sort de prison.');
      if (inner(p)) ctx.log('justice', `${fullName(p)} est sorti${p.sex === 'F' ? 'e' : ''}.`, 'neutral');
    } else {
      p.flags.sentence = left;
      p.stats.happiness = clampStat(p.stats.happiness - 3);
    }
    return;
  }

  // Qui est parti loin revient, parfois.
  if (faraway(p) && rng.chance(0.035)) {
    delete p.flags.far;
    noteHistory(state, p, 'Revient.');
    if (inner(p)) ctx.log('family', `${fullName(p)} est revenu${p.sex === 'F' ? 'e' : ''}.`, 'good');
    return;
  }

  // La plupart des histoires s'arrêtent sans qu'on en fasse un mariage. Ce
  // n'est pas un tournant : personne n'en parle, et l'année reste libre.
  // Les premières années sont fragiles ; celles d'après ne le sont plus.
  if (p.maritalStatus === 'dating' && !PLAYERS_OWN.includes(p.relation)
    && rng.chance(DRIFT_APART * DRIFT_SETTLES ** together(state, p))) {
    p.maritalStatus = 'single';
    const was = person(state, p.partnerId);
    if (was) { was.partnerId = null; if (was.maritalStatus === 'dating') was.maritalStatus = 'single'; }
    p.partnerId = null;
  }

  const turn = rollTurn(rng, state, p);
  if (turn) takeTurn(ctx, p, turn);
}

/** Une année pour tout le monde. */
export function advanceLives(ctx: Ctx): void {
  for (const npc of Object.values(ctx.state.npcs)) advanceLife(ctx, npc);
}
