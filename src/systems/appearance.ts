/**
 * Tenir son allure, et ce que ça change selon qui regarde.
 *
 * **Ce que ce fichier remplace.** Rien, et c'est le problème : le jeu tirait
 * une apparence complète à la naissance — visage, yeux, coiffure, carrure,
 * traits — puis n'y touchait plus jamais. L'allure vivait dans une seule
 * statistique, `looks`, que tout le monde lisait de la même façon. Le
 * catalogue portait cinq aveux là-dessus, dont « l'allure baisse avec l'âge
 * mais l'apparence décrite ne change pas ».
 *
 * **Trois choses, et elles tiennent ensemble.**
 *
 * *Un registre.* Cinq façons de se présenter, et **aucune n'est bonne
 * partout** : un recruteur, quelqu'un qui vous découvre et un public ne
 * regardent pas la même chose. Choisir, c'est choisir qui l'on veut
 * convaincre — et donc qui l'on accepte de desservir.
 *
 * *De l'entretien.* Un registre se tient. Il faut y remettre de l'argent et du
 * temps chaque année, sinon il redescend tout seul, et cela se lit sur la
 * fiche avant de se lire dans les chiffres. Ne rien faire n'est pas neutre :
 * c'est revenir vers l'ordinaire.
 *
 * *Des marques.* Ce qu'une vie inscrit sur un visage vient de cette vie et
 * non d'un dé : des rides quand on a vécu tendu, un teint fatigué quand la
 * santé a lâché, un visage buriné quand le métier était dehors, un visage
 * trop lisse à force d'interventions. Elles s'ajoutent à l'apparence décrite,
 * et la plupart ne s'en vont pas.
 *
 * **Ce que ça ne fait pas.** `readAs` ne remplace pas `looks` : il le
 * *module*, et seulement aux trois endroits où quelqu'un juge vraiment — une
 * embauche, une rencontre, un public. Sans registre choisi, il rend exactement
 * 1 : une partie qui ignore ce système se joue comme avant, au chiffre près.
 */

import { clamp, clampStat } from '../engine/rng.ts';
import type { Ctx } from '../engine/context.ts';
import type { ActionResult, GameState } from '../engine/types.ts';
import {
  GROOMING, MARKS, REGISTERS, getGrooming, getMark, getRegister,
  type Audience, type Register,
} from '../data/looks.ts';
import { localPrice } from './activities.ts';
import { getJob } from '../data/jobs.ts';

/** Ce que l'entretien perd chaque année si l'on n'y remet rien. */
export const DECAY = 0.34;

/**
 * Ce que change au plus un registre parfaitement tenu, en bien ou en mal.
 *
 * **Réglé après mesure.** Premier jet : le registre multipliait la
 * statistique `looks`, qui ne pèse elle-même que la moitié d'une séduction et
 * un facteur parmi huit d'une embauche. Le meilleur registre ne changeait la
 * séduction que de 7,5 % et la chance d'être répondu que de cinq points —
 * pour une décision qui coûte de l'argent tous les ans. Un système qu'on ne
 * sent pas n'est pas un système.
 *
 * Il multiplie donc maintenant **la chance finale**, comme `networkEdge` et
 * `hireEdge` le font déjà pour la promotion et l'embauche : ±25 % pour un
 * registre parfaitement tenu, et exactement 1 pour qui n'en a pas choisi.
 */
export const SWING = 0.25;

/* ------------------------------------------------------------------ */
/* Le registre                                                         */
/* ------------------------------------------------------------------ */

/** Le registre adopté, s'il y en a un. */
export function registerOf(state: GameState): Register | undefined {
  const id = state.player.flags.lookRegister;
  return typeof id === 'string' ? getRegister(id) : undefined;
}

/** Combien l'allure est tenue, de 0 à 1. */
export function upkeepOf(state: GameState): number {
  return clamp(Number(state.player.flags.lookUpkeep ?? 0), 0, 1);
}

/** Ce que l'entretien donne à lire, sans chiffre. */
export function upkeepLabel(value: number): string {
  if (value >= 0.8) return 'Tenue de près';
  if (value >= 0.5) return 'Tenue';
  if (value >= 0.25) return 'Ça commence à se relâcher';
  return 'Laissée aller';
}

/**
 * Adopter un registre.
 *
 * Changer coûte : on ne renouvelle pas une allure avec ce qu'on avait. Le
 * premier choix coûte moins que les suivants — on part de rien, on ne
 * remplace rien.
 */
export function adoptBlocker(state: GameState, register: Register): string | null {
  const p = state.player;
  if (p.age < 12) return 'Pas à cet âge-là.';
  if (p.prison) return 'Pas en détention.';
  if (registerOf(state)?.id === register.id) return 'C’est déjà ton allure.';
  if (p.yearActions.lookAdopt === 1) return 'Une seule fois par an.';
  const cost = adoptCost(state, register);
  if (p.money < cost) return `Il te faudrait ${cost}.`;
  return null;
}

export function adoptCost(state: GameState, register: Register): number {
  const first = registerOf(state) === undefined;
  return localPrice(state, Math.round(register.upkeep * (first ? 0.6 : 1.1)));
}

export function adopt(ctx: Ctx, registerId: string): ActionResult {
  const { state } = ctx;
  const register = getRegister(registerId);
  if (!register) return { ok: false, message: 'Rien de tel.' };
  const blocker = adoptBlocker(state, register);
  if (blocker) return { ok: false, title: register.label, message: blocker };

  const p = state.player;
  p.money -= adoptCost(state, register);
  p.flags.lookRegister = register.id;
  p.yearActions.lookAdopt = 1;
  // On repart d'une allure tenue : on vient d'y mettre de l'argent.
  p.flags.lookUpkeep = Math.max(upkeepOf(state), 0.7);
  ctx.log('life', `Tu as changé d’allure : ${register.label.toLowerCase()}.`, 'neutral');
  return {
    ok: true, title: register.label, tone: 'neutral',
    message: `${register.note} Reste à la tenir.`,
  };
}

/* ------------------------------------------------------------------ */
/* L'entretien                                                         */
/* ------------------------------------------------------------------ */

/** Combien de fois on a fait ça cette année. */
export function groomedThisYear(state: GameState, id: string): number {
  return Number(state.player.yearActions[`groom_${id}`] ?? 0);
}

export function groomCost(state: GameState, id: string): number {
  const op = getGrooming(id);
  return op ? localPrice(state, op.cost) : 0;
}

export function groomBlocker(state: GameState, id: string): string | null {
  const op = getGrooming(id);
  if (!op) return 'Rien de tel.';
  const p = state.player;
  if (p.age < op.from) return `Pas avant ${op.from} ans.`;
  if (p.prison) return 'Pas en détention.';
  if (groomedThisYear(state, id) >= 1) return 'Déjà fait cette année.';
  if (upkeepOf(state) >= 1) return 'Ton allure est déjà tenue de près.';
  const cost = groomCost(state, id);
  if (p.money < cost) return `Il te faudrait ${cost}.`;
  return null;
}

export function groom(ctx: Ctx, id: string): ActionResult {
  const { state } = ctx;
  const op = getGrooming(id);
  if (!op) return { ok: false, message: 'Rien de tel.' };
  const blocker = groomBlocker(state, id);
  if (blocker) return { ok: false, title: op.label, message: blocker };

  const p = state.player;
  p.money -= groomCost(state, id);
  p.yearActions[`groom_${op.id}`] = 1;
  p.flags.lookUpkeep = clamp(upkeepOf(state) + op.gives, 0, 1);
  // Reprendre la silhouette n'est pas un achat : c'est du temps et de la
  // constance, et cela se voit ailleurs que sur la fiche.
  if (op.id === 'silhouette') {
    p.stats.fitness = clampStat(p.stats.fitness + 4);
    p.stats.stress = clampStat(p.stats.stress - 3);
  }
  return {
    ok: true, title: op.label, tone: 'good',
    message: `${op.note} ${upkeepLabel(upkeepOf(state))}.`,
  };
}

/* ------------------------------------------------------------------ */
/* Les marques                                                         */
/* ------------------------------------------------------------------ */

/** Les marques déjà inscrites. */
export function marksOf(state: GameState): string[] {
  const raw = state.player.flags.lookMarks;
  return typeof raw === 'string' && raw.length > 0 ? raw.split(',') : [];
}

function addMark(state: GameState, id: string): boolean {
  const current = marksOf(state);
  if (current.includes(id)) return false;
  state.player.flags.lookMarks = [...current, id].join(',');
  return true;
}

/** Retirer une marque qui peut l'être. */
export function fadeMark(state: GameState, id: string): void {
  state.player.flags.lookMarks = marksOf(state).filter((m) => m !== id).join(',');
}

/**
 * Ce que la vie inscrit, cette année.
 *
 * Chaque marque a une cause dans la partie, jamais un tirage seul : le hasard
 * décide seulement du moment, pas de qui l'attrape. Quelqu'un qui vit calme,
 * en bonne santé et à l'abri n'en prend aucune.
 */
export function driftAppearance(ctx: Ctx): void {
  const { state, rng } = ctx;
  const p = state.player;
  if (!p.alive) return;

  // 0. Une intervention de l'an dernier a fini de se voir.
  if (Number(p.flags.lookRecovery ?? -99) < state.year - 1) delete p.flags.lookRecovery;

  // 1. L'entretien redescend. Ne rien faire n'est pas neutre.
  if (p.flags.lookRegister) {
    p.flags.lookUpkeep = clamp(upkeepOf(state) - DECAY, 0, 1);
  }

  // 2. La carrure suit la forme, et l'apparence décrite le dit.
  if (p.age >= 16) {
    const build = p.stats.fitness >= 72 ? 'athlétique'
      : p.stats.fitness >= 52 ? 'moyenne'
        : p.stats.fitness >= 32 ? 'robuste' : 'ronde';
    p.appearance.build = build;
  }

  // 3. Les marques, chacune avec sa cause.
  const causes: [string, boolean][] = [
    ['rides', p.age > 38 && p.stats.stress > 62],
    ['cernes', p.stats.stress > 70 && p.stats.happiness < 45],
    ['teint', p.stats.health < 42],
    ['buriné', p.age > 34 && Boolean(p.job && getJob(p.job.jobId)?.physical)],
    ['usure', p.age > 52 && (p.stats.health < 55 || Boolean(p.prison))],
    ['refait', Number(p.flags.surgeries ?? 0) >= 4],
  ];
  for (const [id, met] of causes) {
    if (!met) continue;
    // La cause rend la marque possible, pas certaine : on ne vieillit pas
    // tous de la même façon la même année.
    if (rng.chance(0.4) && addMark(state, id)) {
      const mark = getMark(id);
      if (mark) ctx.log('life', `On te trouve ${mark.label} — ${mark.cause}.`, 'neutral');
    }
  }

  // 4. Ce qui peut s'effacer s'efface, quand la cause a disparu.
  if (p.stats.stress < 45 && p.stats.happiness > 55) fadeMark(state, 'cernes');
  if (p.stats.health > 62) fadeMark(state, 'teint');
}

/* ------------------------------------------------------------------ */
/* La convalescence                                                    */
/* ------------------------------------------------------------------ */

/**
 * Est-on en train de s'en remettre ?
 *
 * Le catalogue reprochait à la chirurgie esthétique de n'avoir « ni choix de
 * procédure, ni complication, ni suite » — les deux premiers étaient inexacts,
 * ils existaient déjà. Le troisième était juste : on payait, on gagnait des
 * points d'allure le jour même, et personne ne voyait rien. Une intervention
 * laisse maintenant une année où cela se voit, réussie ou non.
 */
export function recovering(state: GameState): boolean {
  return Number(state.player.flags.lookRecovery ?? -99) >= state.year;
}

/** Ouvrir une convalescence, depuis le système qui pratique l'intervention. */
export function startRecovery(state: GameState): void {
  state.player.flags.lookRecovery = state.year;
}

/** Poser une marque depuis un autre système (une bagarre, un accident). */
export function scar(ctx: Ctx, id = 'cicatrice'): void {
  if (addMark(ctx.state, id)) {
    const mark = getMark(id);
    if (mark) ctx.log('life', `Tu gardes ${mark.label}.`, 'bad');
  }
}

/* ------------------------------------------------------------------ */
/* Ce que ça change                                                    */
/* ------------------------------------------------------------------ */

/**
 * Comment ce public-là te lit, en multiplicateur.
 *
 * **Sans registre choisi, cela rend exactement 1.** Une partie qui ignore ce
 * système se joue au chiffre près comme avant : c'est ce qui permet d'ajouter
 * une couche à trois systèmes déjà mesurés sans invalider leurs mesures.
 */
export function readAs(state: GameState, audience: Audience): number {
  const register = registerOf(state);
  if (!register) return 1;
  return 1 + register.reads[audience] * upkeepOf(state) * SWING;
}

/** Ce que les marques retirent d'allure brute, en points. */
export function markPenalty(state: GameState): number {
  return marksOf(state).reduce((n, id) => n + (getMark(id)?.weight ?? 0), 0);
}

/**
 * L'allure telle qu'un tiers la voit : la statistique, moins ce que la vie a
 * inscrit.
 *
 * `looks` reste la donnée brute — la génétique et l'âge la font monter et
 * descendre — et les marques s'en retranchent. Les deux sont séparées parce
 * qu'elles ne se soignent pas de la même façon : on ne rattrape pas des rides
 * en faisant du sport.
 */
export function effectiveLooks(state: GameState): number {
  // Et l'année qui suit une intervention : ce n'est pas encore le résultat,
  // c'est encore l'opération.
  const healing = recovering(state) ? 9 : 0;
  return clampStat(state.player.stats.looks - markPenalty(state) - healing);
}

/**
 * L'apparence en une phrase — celle que la fiche affiche.
 *
 * C'est ici que « vieillissement visible » cesse d'être un aveu : la phrase
 * change avec la carrure, avec les marques, et avec l'allure qu'on tient.
 */
export function describe(state: GameState): string {
  const p = state.player;
  const a = p.appearance;
  const parts = [`${a.hairStyle} ${a.hairColor}`, `carrure ${a.build}`];
  const marks = marksOf(state).map((id) => getMark(id)?.label).filter(Boolean);
  if (marks.length > 0) parts.push(marks.join(', '));
  if (recovering(state)) parts.push('encore les traces d’une intervention');
  const register = registerOf(state);
  if (register) parts.push(`allure ${register.label.toLowerCase()} — ${upkeepLabel(upkeepOf(state)).toLowerCase()}`);
  return parts.join(' · ');
}

/** Les registres, pour l'écran. */
export { REGISTERS, GROOMING, MARKS };
