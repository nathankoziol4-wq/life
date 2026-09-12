/**
 * La filière du sport scolaire.
 *
 * Ce qui manquait, dit par l'audit : « on entre dans un club sportif sans
 * jamais être choisi », « la filière sport scolaire → université →
 * professionnel n'existe pas ». Le jeu avait un métier de sportif
 * (`data/stage.ts`) auquel aucun chemin ne menait, et une association sportive
 * qui donnait neuf points de forme une fois pour toutes.
 *
 * Cinq moments, dans l'ordre où ils arrivent.
 *
 * **1. La sélection.** On peut être écarté, et l'être coûte. Ce qui décide
 * n'est pas seulement la forme : c'est la forme *rapportée au nombre de
 * places*, et un lycée qui n'a pas de programme sportif ne propose rien.
 *
 * **2. L'entraînement.** Deux fois par an, il prend du temps qu'on n'a pas et
 * fatigue. Il fait monter le niveau — et le niveau décide du groupe, qui
 * décide de tout le reste.
 *
 * **3. La saison.** Elle se solde chaque année. Son résultat dépend du niveau,
 * du groupe, et — pour les sports collectifs — de la qualité de ceux qui
 * jouent avec vous, sur laquelle on n'a pas la main. C'est ce qui distingue
 * un sport d'équipe d'une épreuve individuelle.
 *
 * **4. Le brassard.** Il ne se donne pas au meilleur : il se donne à celui que
 * les autres suivent. Le niveau compte, le respect de la classe compte
 * davantage.
 *
 * **5. Les recruteurs.** Une bonne saison dans un sport qui se voit fait
 * qu'on vient regarder. Deux recruteurs et un bon niveau ouvrent la bourse,
 * qui paie l'université ; et ce qu'on a construit au lycée démarre la
 * carrière professionnelle au lieu de partir de zéro.
 *
 * Le point de la filière est là : elle relie trois systèmes qui existaient
 * sans se parler.
 */

import { clamp, clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import type { ActionResult, GameState, SportCareer } from '../engine/types.ts';
import {
  SCHOLARSHIP, SCHOOL_SPORTS, getSchoolSport, seasonLabel, squadFor, squadInfo,
  type SchoolSport, type Squad,
} from '../data/schoolSports.ts';
import { classmatesOf } from './school.ts';
import { applyExperience } from './psyche.ts';

/**
 * Encore scolarisé, et à un niveau où l'on pratique un sport scolaire.
 *
 * Recalculé ici plutôt qu'importé d'`education.ts` : c'est ce module-là qui
 * lit la bourse sportive, et un import dans les deux sens ferait un cycle
 * pour trois valeurs de chaîne.
 */
const SCHOOL_LEVELS = ['middle', 'high', 'university', 'graduate', 'vocational'];

function atSchool(state: GameState): boolean {
  return SCHOOL_LEVELS.includes(state.player.education.stage);
}

/* ------------------------------------------------------------------ */
/* Lecture                                                             */
/* ------------------------------------------------------------------ */

export function sportOf(state: GameState): SportCareer | null {
  return state.player.education.sport ?? null;
}

export function sportDef(state: GameState): SchoolSport | null {
  const s = sportOf(state);
  return s ? getSchoolSport(s.sportId) ?? null : null;
}

/**
 * Ce que l'établissement propose réellement.
 *
 * Le champ `sports` de l'établissement ne servait à rien ; il décide
 * maintenant du nombre de sports offerts. Un lycée sans moyens en propose
 * deux, un établissement doté en propose huit — et c'est une inégalité de
 * départ qui se voit dix ans plus tard.
 */
export function offeredSports(state: GameState): SchoolSport[] {
  const school = state.player.origin.school;
  if (!school) return [];
  const count = Math.max(2, Math.round(2 + (school.sports / 100) * 7));
  // Choix stable : le même établissement propose toujours la même chose, sans
  // quoi la liste changerait à chaque affichage.
  const seed = school.name.length + school.archetypeId.length;
  return SCHOOL_SPORTS.filter((_, i) => (i * 7 + seed) % 10 < count);
}

/** Comment on se situe. */
export function levelLabel(level: number): string {
  if (level < 20) return 'Tu apprends';
  if (level < 40) return 'Tu tiens ta place';
  if (level < 62) return 'Tu es bon';
  if (level < 80) return 'Tu es au-dessus';
  return 'On vient te voir jouer';
}

/**
 * Ce que valent ceux qui jouent avec vous.
 *
 * Seulement pour les sports collectifs, et c'est tout l'intérêt : dans une
 * épreuve individuelle on ne dépend que de soi ; dans un sport d'équipe, une
 * bonne année peut être gâchée par des gens qu'on n'a pas choisis.
 */
export function teammateQuality(state: GameState): number {
  const def = sportDef(state);
  if (!def?.team) return 50;
  const mates = classmatesOf(state);
  if (mates.length === 0) return 50;
  const fitness = mates.reduce((s, m) => s + m.stats.fitness, 0) / mates.length;
  const school = state.player.origin.school;
  return clampStat(fitness * 0.6 + (school?.sports ?? 50) * 0.4);
}

/* ------------------------------------------------------------------ */
/* La sélection                                                        */
/* ------------------------------------------------------------------ */

export function selectionBlocker(state: GameState, sport: SchoolSport): string | null {
  const p = state.player;
  if (!atSchool(state)) return 'Tu n’es scolarisé nulle part.';
  if (p.age < 11) return 'Il faut être au collège.';
  if (p.prison) return 'Pas depuis une cellule.';
  if (!offeredSports(state).some((s) => s.id === sport.id)) {
    return 'Ton établissement ne le propose pas.';
  }
  const current = sportOf(state);
  if (current && !current.cutYear && current.sportId === sport.id) {
    return 'C’est déjà ce que tu fais.';
  }
  if (p.yearActions.sportTryout) return 'Tu as déjà passé une sélection cette année.';
  const s = sportOf(state);
  if (s && s.cutYear === state.year) {
    return 'On vient de t’écarter. L’année prochaine.';
  }
  return null;
}

/** Chances d'être pris, exposées pour que l'écran puisse les dire. */
export function selectionOdds(state: GameState, sport: SchoolSport): number {
  const p = state.player;
  const school = p.origin.school;
  if (!school) return 0;
  const body = p.stats[sport.driver] * 0.6 + p.stats[sport.second] * 0.25
    + p.stats.health * 0.15;
  // Le nombre de places compte autant que le niveau : être bon en escrime ne
  // suffit pas quand il n'y a que deux places.
  const room = (sport.places / 100) * 0.45;
  // Un établissement qui investit dans le sport prend plus de monde, mais la
  // concurrence y est aussi meilleure : l'effet net est modeste et positif.
  const programme = (school.sports - 50) / 500;
  // Ce qu'on a déjà fait ailleurs se voit.
  const past = sportOf(state)?.level ?? 0;
  return clamp(
    (body - sport.demands) / 120 + room + programme + past / 400 + 0.18,
    0.04, 0.94,
  );
}

/**
 * Passer la sélection.
 *
 * Être écarté est une issue réelle et fréquente. Sans elle, « entrer dans
 * l'équipe » serait une case à cocher, et c'est exactement le reproche que
 * l'audit faisait au système de clubs.
 */
export function trySelection(ctx: Ctx, sportId: string): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const sport = getSchoolSport(sportId);
  if (!sport) return { ok: false, message: 'Ce sport n’existe pas ici.' };
  const blocker = selectionBlocker(state, sport);
  if (blocker) return { ok: false, title: 'Impossible', message: blocker };
  p.yearActions.sportTryout = 1;

  if (!rng.chance(selectionOdds(state, sport))) {
    // On garde une trace : on ne repasse pas la sélection le lendemain.
    p.education.sport = {
      sportId, since: state.year, level: 0, squad: 'espoirs', seasons: 0,
      captain: false, injuredUntil: 0, scouts: 0, bestSeason: 0,
      lastSeason: 0, trainedThisYear: 0, cutYear: state.year,
    };
    p.stats.happiness = clampStat(p.stats.happiness - 8);
    p.psyche.self.selfEsteem = clampStat(p.psyche.self.selfEsteem - 4);
    applyExperience(ctx, 'échecScolaire', { scale: 0.5 });
    ctx.log('school', `${sport.label} : tu n’as pas été ${p.sex === 'F' ? 'retenue' : 'retenu'}.`, 'bad');
    return {
      ok: false,
      title: 'Pas retenu',
      message: `La liste est affichée dans le couloir. Ton nom n’y est pas. ${
        sport.places < 40 ? 'Il y avait deux places.' : 'Il y avait de la place, mais pas pour toi.'}`,
      tone: 'bad',
    };
  }

  const previous = sportOf(state);
  const level = clampStat(
    p.stats[sport.driver] * 0.2 + p.stats[sport.second] * 0.08
    + (previous && previous.sportId === sportId ? previous.level * 0.7 : 0) + 5,
  );
  p.education.sport = {
    sportId, since: state.year, level, squad: squadFor(level), seasons: 0,
    captain: false, injuredUntil: 0, scouts: previous?.scouts ?? 0,
    bestSeason: previous?.bestSeason ?? 0, lastSeason: 0,
    trainedThisYear: 0, cutYear: null,
  };
  p.flags[`pratiqué:${sport.interest}`] = Math.min(
    6, Number(p.flags[`pratiqué:${sport.interest}`] ?? 0) + 1,
  );
  ctx.log('school', `${sport.label} : tu es pris.`, 'good');
  return {
    ok: true,
    title: 'Tu es pris',
    message: `${sport.what}. Premier entraînement lundi.`,
    tone: 'good',
  };
}

export function quitSport(ctx: Ctx): ActionResult {
  const p = ctx.state.player;
  const def = sportDef(ctx.state);
  if (!p.education.sport) return { ok: false, message: 'Tu ne fais partie d’aucune équipe.' };
  p.education.sport = null;
  return {
    ok: true,
    title: 'Tu arrêtes',
    message: `Fini, ${def?.label.toLowerCase() ?? 'le sport'}. Tu récupères tes après-midis, et tu perdras ce que tu avais.`,
    tone: 'neutral',
  };
}

/* ------------------------------------------------------------------ */
/* L'entraînement                                                      */
/* ------------------------------------------------------------------ */

export function trainingBlocker(state: GameState): string | null {
  const p = state.player;
  const s = sportOf(state);
  if (!s || s.cutYear) return 'Tu ne fais partie d’aucune équipe.';
  if (p.prison) return 'Pas depuis une cellule.';
  if (s.injuredUntil > state.year) return 'Tu n’es pas en état.';
  if (s.trainedThisYear >= 2) return 'Tu t’es déjà donné deux fois cette année.';
  return null;
}

/**
 * S'entraîner.
 *
 * Le progrès est à rendements décroissants et le coût ne l'est pas : c'est ce
 * qui empêche de cliquer jusqu'à cent. Passé un certain niveau, seule la
 * saison fait monter — parce qu'à ce stade il faut jouer, pas répéter.
 */
export function train(ctx: Ctx): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const s = sportOf(state);
  const def = sportDef(state);
  if (!s || !def) return { ok: false, message: 'Tu ne fais partie d’aucune équipe.' };
  const blocker = trainingBlocker(state);
  if (blocker) return { ok: false, title: 'Impossible', message: blocker };
  s.trainedThisYear += 1;

  const before = s.level;
  const gain = (2.5 + p.stats.discipline / 22) * (1 - s.level / 115)
    * (0.7 + rng.float(0, 0.6));
  s.level = clamp(s.level + gain, 0, 100);
  s.squad = squadFor(s.level);
  p.stats.fitness = clampStat(p.stats.fitness + rng.float(1.5, 4));
  p.stats.discipline = clampStat(p.stats.discipline + rng.float(0.5, 2));
  p.stats.stress = clampStat(p.stats.stress + rng.float(2, 6));
  // Le temps s'entend : les après-midis passés au gymnase ne sont pas passés
  // sur les devoirs.
  p.education.grades = clamp(p.education.grades - rng.float(0, 0.35), 0, 20);

  if (rng.chance(clamp(def.contact / 900 + s.trainedThisYear * 0.01, 0.01, 0.12))) {
    return injure(ctx, 'à l’entraînement');
  }
  return {
    ok: true,
    title: 'Séance faite',
    message: s.level - before < 0.8
      ? 'Tu répètes ce que tu sais déjà. À ce niveau, il faut jouer pour progresser.'
      : `Tu sens la différence. ${levelLabel(s.level)}.`,
    tone: 'good',
  };
}

function injure(ctx: Ctx, where: string): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const s = sportOf(state)!;
  const def = sportDef(state)!;
  const years = rng.chance(def.contact / 220) ? 2 : 1;
  s.injuredUntil = state.year + years;
  p.stats.health = clampStat(p.stats.health - rng.int(4, 14));
  // Une blessure fait perdre ce qu'on avait construit : c'est le vrai coût,
  // et il rend le choix d'un sport de contact réellement risqué.
  s.level = clamp(s.level - rng.float(4, 12), 0, 100);
  s.squad = squadFor(s.level);
  applyExperience(ctx, 'maladieGrave', { scale: 0.4 });
  ctx.log('health', `Blessure ${where} : ${years} an(s) sans jouer.`, 'bad');
  return {
    ok: false,
    title: 'Blessure',
    message: `Quelque chose a lâché ${where}. ${years} an${years > 1 ? 's' : ''} sans jouer, et il faudra tout reprendre.`,
    tone: 'bad',
  };
}

/* ------------------------------------------------------------------ */
/* Le brassard                                                         */
/* ------------------------------------------------------------------ */

export function captaincyBlocker(state: GameState): string | null {
  const p = state.player;
  const s = sportOf(state);
  const def = sportDef(state);
  if (!s || s.cutYear || !def) return 'Tu ne fais partie d’aucune équipe.';
  if (!def.team) return 'On ne nomme pas de capitaine dans ce sport.';
  if (s.captain) return 'Tu l’es déjà.';
  if (s.seasons < 1) return 'Il faut avoir fait une saison.';
  if (p.yearActions.captaincy) return 'Le vote a eu lieu cette année.';
  return null;
}

export function captaincyOdds(state: GameState): number {
  const p = state.player;
  const s = sportOf(state);
  if (!s) return 0;
  // Le brassard ne va pas au meilleur : il va à celui que les autres suivent.
  // Le niveau pèse, le respect de la classe pèse davantage, et l'assurance
  // décide entre deux candidats équivalents.
  return clamp(
    s.level / 320
    + p.origin.popularity.respected * 0.055
    + p.psyche.social.assertiveness / 260
    + s.seasons * 0.04
    - 0.12,
    0.03, 0.9,
  );
}

export function runForCaptain(ctx: Ctx): ActionResult {
  const { state, rng } = ctx;
  const p = state.player;
  const s = sportOf(state);
  if (!s) return { ok: false, message: 'Tu ne fais partie d’aucune équipe.' };
  const blocker = captaincyBlocker(state);
  if (blocker) return { ok: false, title: 'Impossible', message: blocker };
  p.yearActions.captaincy = 1;

  if (!rng.chance(captaincyOdds(state))) {
    p.stats.happiness = clampStat(p.stats.happiness - 4);
    return {
      ok: false,
      title: 'C’est quelqu’un d’autre',
      message: 'Le vote est passé. Ce n’est pas toi, et il va falloir jouer sous ses ordres.',
      tone: 'bad',
    };
  }
  s.captain = true;
  p.origin.popularity.respected += 2;
  p.origin.popularity.influential += 1;
  p.stats.reputation = clampStat(p.stats.reputation + 6);
  p.psyche.social.assertiveness = clampStat(p.psyche.social.assertiveness + 5);
  applyExperience(ctx, 'grandeRéussite', { scale: 0.5 });
  ctx.log('school', 'Tu portes le brassard.', 'good');
  return {
    ok: true,
    title: 'Le brassard',
    message: 'Ils t’ont choisi. Ce n’est pas une récompense, c’est une charge — et elle se verra partout ailleurs.',
    tone: 'good',
  };
}

/* ------------------------------------------------------------------ */
/* La bourse                                                           */
/* ------------------------------------------------------------------ */

/** Ce qui manque encore pour une bourse sportive, ou rien. */
export function scholarshipGap(state: GameState): string | null {
  const p = state.player;
  const s = sportOf(state);
  if (!s || s.cutYear) return 'Tu ne fais partie d’aucune équipe.';
  if (s.level < SCHOLARSHIP.level) return `Il faudrait être franchement au-dessus (${Math.round(s.level)}/${SCHOLARSHIP.level}).`;
  if (s.scouts < SCHOLARSHIP.scouts) {
    return `Être bon ne suffit pas : il faut avoir été vu (${s.scouts}/${SCHOLARSHIP.scouts} recruteurs).`;
  }
  if (p.education.grades < SCHOLARSHIP.grades) {
    return `Une bourse sportive reste une inscription : il faut la moyenne (${p.education.grades.toFixed(1)}/${SCHOLARSHIP.grades}).`;
  }
  return null;
}

export function hasSportScholarship(state: GameState): boolean {
  return scholarshipGap(state) === null;
}

/**
 * Ce que la filière apporte à qui se lance dans le métier.
 *
 * C'est le raccord : dix ans de sport scolaire ne doivent pas laisser un
 * futur sportif professionnel au même niveau que quelqu'un qui n'a jamais
 * joué. Lu par `systems/stage.ts` au moment de commencer.
 */
export function sportHeadStart(state: GameState): number {
  const s = sportOf(state);
  if (!s || s.cutYear) return 0;
  return s.level * 0.45 + (s.captain ? 4 : 0) + s.scouts * 2;
}

/* ------------------------------------------------------------------ */
/* L'année                                                             */
/* ------------------------------------------------------------------ */

/**
 * La saison.
 *
 * Le résultat mêle ce qu'on vaut, le groupe où l'on joue et — seulement pour
 * les sports collectifs — ceux qui jouent avec nous. C'est là que se paie le
 * choix d'un sport d'équipe : on peut faire une excellente année personnelle
 * dans une équipe qui perd.
 */
export function advanceSchoolSport(ctx: Ctx): void {
  const { state, rng } = ctx;
  const p = state.player;
  const s = sportOf(state);
  if (!s) return;
  s.trainedThisYear = 0;
  const def = sportDef(state);
  if (!def) { p.education.sport = null; return; }

  // Écarté l'an dernier : la trace reste une année, puis s'efface.
  if (s.cutYear) {
    if (state.year - s.cutYear >= 1) p.education.sport = null;
    return;
  }

  // Quitter l'école met fin à la filière scolaire — ce qu'on a acquis est
  // conservé jusqu'à l'entrée à l'université, puis passe au métier.
  if (!atSchool(state) || p.prison) {
    s.level = clamp(s.level - 6, 0, 100);
    s.squad = squadFor(s.level);
    if (s.level < 8) p.education.sport = null;
    return;
  }

  if (s.injuredUntil > state.year) {
    s.level = clamp(s.level - 4, 0, 100);
    s.squad = squadFor(s.level);
    ctx.log('school', `${def.label} : une saison entière à regarder.`, 'bad');
    return;
  }
  if (s.injuredUntil > 0 && state.year >= s.injuredUntil) s.injuredUntil = 0;

  s.seasons += 1;
  const squad = squadInfo(s.squad as Squad);
  const mates = def.team ? teammateQuality(state) : 50;
  // Ce qu'on vaut, ce que vaut le groupe, ce que valent les autres.
  const result = clampStat(
    s.level * 0.55
    + squad.pull * 14
    + (mates - 50) * (def.team ? 0.5 : 0)
    + (s.captain ? 5 : 0)
    + rng.float(-12, 12),
  );
  s.lastSeason = result;
  s.bestSeason = Math.max(s.bestSeason, result);

  // Jouer fait progresser, et plus que s'entraîner quand on est déjà bon.
  s.level = clamp(s.level + (1.5 + (result / 100) * 4) * (1 - s.level / 125), 0, 100);
  s.squad = squadFor(s.level);
  p.stats.fitness = clampStat(p.stats.fitness + 2);

  // On vient regarder ce qui se voit. Un très bon joueur dans un sport
  // confidentiel reste inconnu, et c'est le nœud de la filière.
  const watched = rng.chance(clamp(
    (result - 60) / 130 + (def.visibility / 100) * 0.28
    + (s.squad === 'sélection' ? 0.2 : 0) - 0.1,
    0, 0.6,
  ));
  if (watched) {
    s.scouts += 1;
    ctx.log('school', 'Quelqu’un est venu te voir jouer. Il n’a rien dit.', 'good');
  }

  // Se faire mal en jouant : plus fréquent qu'à l'entraînement.
  if (rng.chance(clamp(def.contact / 420 + s.level / 900, 0.02, 0.2))) {
    injure(ctx, 'en match');
    return;
  }

  const band = seasonLabel(result);
  ctx.log('school', `${def.label} — ${band.label.toLowerCase()}.`,
    result > 66 ? 'good' : result < 32 ? 'bad' : 'neutral');
  if (result > 86) applyExperience(ctx, 'grandeRéussite', { scale: 0.6 });

  // La bourse se voit venir : on le dit au joueur au moment où elle devient
  // atteignable, sans quoi personne ne saurait qu'elle existe.
  if (hasSportScholarship(state) && !p.flags.sportScholarshipKnown) {
    p.flags.sportScholarshipKnown = true;
    ctx.log('school',
      'On te parle de bourse sportive pour l’université. Il faudra t’inscrire.', 'good');
  }
}
