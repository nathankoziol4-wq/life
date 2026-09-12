/**
 * Mini-jeu : le vol à la tire.
 *
 * Tout est abstrait. Il n'y a ici aucune méthode, aucun geste, aucune
 * technique : une main qu'on approche, une jauge qui monte, une cible qui se
 * retourne. C'est un jeu d'adresse et de sang-froid habillé, et il ne décrit
 * rien de reproductible.
 *
 * Le cœur du jeu est un arbitrage, pas un tirage :
 *
 *   - **tirer vite** remplit la jauge de méfiance,
 *   - **tirer lentement** est sûr mais laisse exposé plus longtemps,
 *   - **attendre** fait redescendre la jauge, et perd du temps.
 *
 * La cible vit sa vie pendant ce temps : elle marche, s'arrête, discute, et
 * de temps en temps regarde autour d'elle. Se faire prendre la main dans la
 * poche à cet instant précis coûte beaucoup plus cher que le reste.
 */

import type { Rng } from '../../engine/rng.ts';
import type { MiniGameResult } from '../../engine/minigame.ts';
import { registerMiniGame } from '../../engine/minigame.ts';

/** Ce que la cible est en train de faire. */
export type TargetMood = 'marche' | 'arrêt' | 'discute' | 'regarde';

/** Une poche à tenter, avec ce qu'elle contient. */
export interface Pocket {
  id: string;
  label: string;
  emoji: string;
  /** Position sur la silhouette, 0-1. */
  x: number;
  y: number;
  /** Valeur du butin, en unités de monnaie locale. */
  value: number;
  /** Difficulté propre : une poche intérieure est plus dure qu'un sac ouvert. */
  depth: number;
  taken: boolean;
}

export interface PickpocketState {
  /** Position de la main du joueur, 0-1. */
  handX: number;
  handY: number;
  /** Position de la cible, qui dérive. */
  targetX: number;
  mood: TargetMood;
  /** Temps restant dans l'humeur courante, en ms. */
  moodLeft: number;
  /** Jauge de méfiance, 0-100. */
  suspicion: number;
  /** Progression du retrait en cours, 0-100. */
  pull: number;
  /** Poche visée par le retrait en cours. */
  pulling: string | null;
  pockets: Pocket[];
  /** Butin déjà récupéré. */
  taken: { label: string; value: number }[];
  /** Temps écoulé, ms. */
  elapsed: number;
  /** Temps total accordé, ms. */
  limit: number;
  mistakes: number;
  /** Fin de partie et raison. */
  over: null | 'parti' | 'temps' | 'repéré' | 'confrontation';
  /** Le personnage voit-il la jauge de méfiance ? */
  insight: boolean;
  /** Vitesse de montée de la méfiance, réglée par le contexte. */
  pressure: number;
  /** Fautes tolérées avant que la méfiance ne s'emballe. */
  tolerance: number;
  /** Tirages pré-calculés : le pas de simulation reste déterministe. */
  rolls: number[];
  rollAt: number;
}

/** Profils de cible : c'est là que se décide la difficulté réelle. */
export interface TargetProfile {
  id: string;
  label: string;
  /** Attention portée à ce qui l'entoure, 0-100. */
  vigilance: number;
  /** Richesse relative : ce qu'il y a à prendre. */
  wealth: number;
  /** Foule autour : elle couvre autant qu'elle expose. */
  crowd: number;
}

export const TARGET_PROFILES: TargetProfile[] = [
  { id: 'touriste', label: 'Un touriste absorbé par son plan', vigilance: 20, wealth: 1, crowd: 70 },
  { id: 'pressé', label: 'Quelqu’un de très pressé', vigilance: 35, wealth: 0.9, crowd: 55 },
  { id: 'fêtard', label: 'Un noceur en fin de soirée', vigilance: 15, wealth: 0.7, crowd: 40 },
  { id: 'cadre', label: 'Un cadre au téléphone', vigilance: 45, wealth: 1.8, crowd: 45 },
  { id: 'aisé', label: 'Quelqu’un de manifestement aisé', vigilance: 60, wealth: 3.2, crowd: 30 },
  { id: 'habitué', label: 'Un habitué du quartier', vigilance: 72, wealth: 0.8, crowd: 35 },
  { id: 'vigile', label: 'Un agent de sécurité en pause', vigilance: 92, wealth: 0.6, crowd: 25 },
];

/** Difficulté d'une cible, 0-100. */
export function targetDifficulty(profile: TargetProfile): number {
  // La foule protège : elle couvre les gestes et détourne l'attention.
  return Math.max(0, Math.min(100, profile.vigilance - profile.crowd * 0.25 + 10));
}

/** Contenu possible d'une cible, selon sa richesse. */
function buildPockets(rng: Rng, profile: TargetProfile, unit: number): Pocket[] {
  const w = profile.wealth;
  const catalogue: Omit<Pocket, 'taken'>[] = [
    { id: 'poche', label: 'Portefeuille', emoji: '👛', x: 0.42, y: 0.55, value: Math.round(unit * 0.9 * w), depth: 55 },
    { id: 'veste', label: 'Téléphone', emoji: '📱', x: 0.58, y: 0.42, value: Math.round(unit * 1.4 * w), depth: 68 },
    { id: 'sac', label: 'Sac ouvert', emoji: '🎒', x: 0.32, y: 0.48, value: Math.round(unit * 0.5 * w), depth: 32 },
    { id: 'poignet', label: 'Montre', emoji: '⌚', x: 0.66, y: 0.58, value: Math.round(unit * 2.2 * w), depth: 88 },
    { id: 'cou', label: 'Bijou', emoji: '💍', x: 0.5, y: 0.3, value: Math.round(unit * 3 * w), depth: 92 },
  ];
  // Personne ne porte tout : on tire ce qui est réellement là.
  const kept = catalogue.filter((c) => rng.chance(c.depth > 80 ? 0.28 * w : 0.72));
  const pockets = (kept.length > 0 ? kept : [catalogue[0]]).map((c) => ({ ...c, taken: false }));
  return pockets;
}

const MOODS: { mood: TargetMood; min: number; max: number }[] = [
  { mood: 'marche', min: 1200, max: 2600 },
  { mood: 'arrêt', min: 900, max: 2200 },
  { mood: 'discute', min: 1400, max: 3000 },
  { mood: 'regarde', min: 500, max: 1100 },
];

/** Prochaine humeur : « regarde » est rare mais toujours possible. */
function nextMood(roll: number, roll2: number, vigilance: number): { mood: TargetMood; left: number } {
  const looksAround = 0.12 + vigilance / 380;
  if (roll < looksAround) {
    const def = MOODS[3];
    return { mood: 'regarde', left: def.min + roll2 * (def.max - def.min) };
  }
  const index = roll < looksAround + 0.42 ? 0 : roll < looksAround + 0.72 ? 1 : 2;
  const def = MOODS[index];
  return { mood: def.mood, left: def.min + roll2 * (def.max - def.min) };
}

/** Tirage suivant, pris dans la réserve constituée au démarrage. */
function roll(s: PickpocketState): number {
  const value = s.rolls[s.rollAt % s.rolls.length];
  s.rollAt += 1;
  return value;
}

export interface PickpocketSetup {
  profile: TargetProfile;
  /** Unité monétaire locale, pour que le butin ait un sens dans le pays. */
  unit: number;
}

/** Le mini-jeu, prêt à être joué sans interface. */
export const PICKPOCKET = registerMiniGame<PickpocketState>({
  id: 'pickpocket',
  category: 'crime',
  label: 'Vol à la tire',
  goal: 'Approcher, retirer sans brusquer, et partir avant qu’on s’en aperçoive.',
  duration: 22_000,

  setup(rng, ctx) {
    const setup = (ctx.setup as PickpocketSetup | undefined)
      ?? { profile: TARGET_PROFILES[0], unit: 200 };
    const first = nextMood(rng.next(), rng.next(), setup.profile.vigilance);
    return {
      handX: 0.5, handY: 0.9,
      targetX: 0.5,
      mood: first.mood,
      moodLeft: first.left,
      suspicion: 0,
      pull: 0,
      pulling: null,
      pockets: buildPockets(rng, setup.profile, setup.unit),
      taken: [],
      elapsed: 0,
      limit: Math.round(22_000 * ctx.grace.time),
      mistakes: 0,
      over: null,
      insight: ctx.grace.insight,
      pressure: ctx.grace.pressure * (0.6 + setup.profile.vigilance / 90),
      tolerance: ctx.grace.tolerance,
      rolls: Array.from({ length: 128 }, () => rng.next()),
      rollAt: 0,
    };
  },

  step(s, input, dt) {
    if (s.over) return s;
    s.elapsed += dt;
    if (input.quit) { s.over = 'parti'; return s; }
    if (s.elapsed >= s.limit) { s.over = 'temps'; return s; }

    /* --- La cible vit sa vie --- */
    s.moodLeft -= dt;
    if (s.moodLeft <= 0) {
      const next = nextMood(roll(s), roll(s), 50);
      s.mood = next.mood;
      s.moodLeft = next.left;
    }
    if (s.mood === 'marche') {
      // Elle dérive doucement ; la main doit suivre.
      s.targetX = Math.max(0.15, Math.min(0.85, s.targetX + (roll(s) - 0.5) * dt * 0.0004));
    }

    /* --- Déplacement de la main --- */
    const wantX = input.x ?? s.handX;
    const wantY = input.y ?? s.handY;
    const dx = wantX - s.handX;
    const dy = wantY - s.handY;
    const speed = Math.hypot(dx, dy) / (dt / 1000);
    s.handX = wantX;
    s.handY = wantY;

    // Un geste brusque se remarque, surtout quand elle regarde.
    const abruptness = Math.max(0, speed - 0.55);
    if (abruptness > 0) {
      s.suspicion += abruptness * dt * 0.02 * s.pressure * (s.mood === 'regarde' ? 2.4 : 1);
      if (abruptness > 1.6) s.mistakes += 1;
    }

    /* --- Retrait --- */
    const near = s.pockets.find(
      (pocket) => !pocket.taken
        && Math.hypot(pocket.x + (s.targetX - 0.5) - s.handX, pocket.y - s.handY) < 0.09,
    );

    if (input.hold && near) {
      if (s.pulling !== near.id) { s.pulling = near.id; s.pull = 0; }
      // Tirer va plus vite sur une poche accessible, et fait monter la jauge
      // d'autant plus qu'on force. C'est tout l'arbitrage du jeu.
      const rate = (0.055 - near.depth * 0.00035) * dt;
      s.pull += rate;
      s.suspicion += rate * 0.75 * s.pressure
        * (s.mood === 'regarde' ? 3 : s.mood === 'discute' ? 0.55 : 1);
      if (s.pull >= 100) {
        near.taken = true;
        s.taken.push({ label: near.label, value: near.value });
        s.pull = 0;
        s.pulling = null;
      }
    } else if (input.hold && !near) {
      // Tâtonner au mauvais endroit : le pire des gestes.
      s.suspicion += dt * 0.012 * s.pressure;
      // Lâcher une poche entamée pour tâtonner ailleurs est une faute.
      if (s.pulling !== null) { s.mistakes += 1; s.pulling = null; s.pull = 0; }
    } else {
      s.pulling = null;
      s.pull = Math.max(0, s.pull - dt * 0.02);
      // Attendre calmement fait redescendre la méfiance.
      const calm = Math.hypot(dx, dy) < 0.02 ? 1.6 : 0.7;
      s.suspicion -= dt * 0.006 * calm;
    }

    // Une main posée sur la cible pendant qu'elle regarde est indéfendable.
    if (s.mood === 'regarde' && Math.abs(s.handY - 0.9) > 0.25) {
      s.suspicion += dt * 0.009 * s.pressure;
    }

    // Les fautes au-delà de ce que le métier pardonne s'accumulent.
    if (s.mistakes > s.tolerance) {
      s.suspicion += dt * 0.004 * (s.mistakes - s.tolerance);
    }

    s.suspicion = Math.max(0, Math.min(100, s.suspicion));
    if (s.suspicion >= 100) {
      s.over = s.taken.length > 0 || s.pulling !== null ? 'confrontation' : 'repéré';
    }
    return s;
  },

  finished: (s) => s.over !== null,

  score(s): MiniGameResult {
    const loot = s.taken.reduce((sum, item) => sum + item.value, 0);
    const potential = s.pockets.reduce((sum, pocket) => sum + pocket.value, 0);
    const share = potential > 0 ? loot / potential : 0;

    // La qualité récompense ce qu'on a pris *et* la discrétion. Repartir les
    // mains vides mais sans se faire remarquer vaut mieux qu'une confrontation.
    const stealth = 1 - s.suspicion / 100;
    const caught = s.over === 'repéré' || s.over === 'confrontation';
    const quality = Math.max(0, Math.min(1,
      share * 0.55 + stealth * 0.35 + (caught ? 0 : 0.1) - s.mistakes * 0.03));

    return {
      success: !caught && s.taken.length > 0,
      score: Math.round(loot),
      quality,
      mistakes: s.mistakes,
      time: s.elapsed,
      notes: s.taken.map((item) => item.label),
    };
  },
});

/** Issue narrative, dérivée de l'état final. C'est le §7 du cahier des charges. */
export type PickpocketOutcome =
  | 'parfait' | 'risqué' | 'bredouille' | 'repéré' | 'confrontation';

export function pickpocketOutcome(s: PickpocketState): PickpocketOutcome {
  if (s.over === 'confrontation') return 'confrontation';
  if (s.over === 'repéré') return 'repéré';
  if (s.taken.length === 0) return 'bredouille';
  return s.suspicion > 55 ? 'risqué' : 'parfait';
}
