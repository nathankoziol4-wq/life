/**
 * Mini-jeu : amarrer.
 *
 * Ce que le joueur contrôle : **une poussée, pas une position**. C'est toute
 * la différence avec `performance`, où le curseur va où l'on pointe. Ici on
 * appuie d'un côté, la machine accélère, et elle continue quand on lâche. Il
 * faut donc anticiper au lieu de suivre — freiner avant d'arriver, viser
 * avant d'être en face.
 *
 * Trois choses en même temps, et c'est ce qui en fait un jeu :
 *
 * - **la dérive** : la cible s'éloigne lentement, à un rythme qui change ;
 * - **le carburant** : chaque impulsion en consomme. À sec, on ne corrige
 *   plus rien et l'on regarde ce qu'on a fait ;
 * - **l'approche** : arriver au contact trop vite ne réussit pas la mission,
 *   ça la casse. Il faut être aligné *et* lent.
 *
 * Rien ici ne décrit une procédure réelle. C'est un point, un axe, une jauge
 * de carburant et une vitesse d'approche — un exercice d'inertie habillé.
 */

import type { Rng } from '../../engine/rng.ts';
import type { MiniGameResult } from '../../engine/minigame.ts';
import { registerMiniGame } from '../../engine/minigame.ts';

export interface DockingState {
  /** Où se trouve la machine sur l'axe latéral, 0-1. */
  ship: number;
  /** Sa vitesse latérale, par milliseconde. */
  drift: number;
  /** Où se trouve le point d'amarrage, 0-1. */
  port: number;
  /** La dérive propre de la cible, par milliseconde. */
  portDrift: number;
  /** Distance restante, 1 au départ, 0 au contact. */
  range: number;
  /** Vitesse d'approche, par milliseconde. Le joueur la règle. */
  closing: number;
  /** La manette des gaz telle que le joueur la tient, 0-1. */
  throttle: number;
  /** Carburant restant, 0-100. */
  fuel: number;
  /** Écart toléré au contact. */
  window: number;
  /** Vitesse d'approche maximale acceptable au contact. */
  softness: number;
  /** Contacts ratés : trop loin, ou trop vite. */
  bumps: number;
  /** Amarré ? */
  docked: boolean;
  /** Le contact a-t-il eu lieu ? */
  contact: boolean;
  /** Écart au moment du contact, pour la note. */
  offset: number;
  /** Vitesse au moment du contact. */
  impact: number;
  elapsed: number;
  limit: number;
  bailed: boolean;
  notes: string[];
}

/** Poussée latérale appliquée par milliseconde d'appui. */
const THRUST = 0.0000058;
/** Carburant consommé par milliseconde d'appui. */
const BURN = 0.0032;
/**
 * Largeur de la zone morte autour de la machine.
 *
 * Sans elle, poser le doigt poussait forcément d'un côté — un pointeur est
 * toujours à gauche ou à droite de quelque chose — et il devenait impossible
 * de régler les gaz sans dépenser du carburant. Le doigt posé sur la machine
 * ne pousse donc rien : on glisse vers le haut ou vers le bas, c'est tout.
 */
const NEUTRAL = 0.06;
/** Vitesse d'approche quand on ne fait rien, et à plein régime. */
const COAST = 0.000008;
const FULL = 0.00022;

export const docking = registerMiniGame<DockingState>({
  id: 'docking',
  category: 'carrière',
  label: 'Amarrer',
  goal: 'Aligne-toi, et arrive lentement.',
  duration: 24_000,

  setup(rng: Rng, ctx) {
    const limit = Math.round(24_000 * ctx.grace.time);
    const hardness = ctx.difficulty / 100;
    return {
      ship: 0.5,
      drift: rng.float(-0.00004, 0.00004) * (0.5 + hardness),
      // Jamais en face au départ : sans écart initial, il n'y aurait rien à
      // faire pendant les premières secondes.
      port: rng.chance(0.5) ? rng.float(0.12, 0.32) : rng.float(0.68, 0.88),
      portDrift: rng.float(0.000012, 0.000042) * (0.4 + hardness) * ctx.grace.pressure,
      range: 1,
      closing: COAST,
      throttle: 0,
      fuel: 100,
      window: 0.075 + (1 - hardness) * 0.045 + (ctx.grace.tolerance / 100) * 0.04,
      softness: 0.00007 + (1 - hardness) * 0.00004 + (ctx.grace.tolerance / 100) * 0.00003,
      bumps: 0,
      docked: false,
      contact: false,
      offset: 0,
      impact: 0,
      elapsed: 0,
      limit,
      bailed: false,
      notes: [],
    };
  },

  step(s, input, dt) {
    if (s.docked || s.bailed || s.elapsed >= s.limit) return s;
    s.elapsed += dt;
    if (input.quit) { s.bailed = true; return s; }

    // La cible dérive et rebondit : elle ne s'immobilise jamais.
    s.port += s.portDrift * dt;
    if (s.port < 0.1) { s.port = 0.1; s.portDrift = Math.abs(s.portDrift); }
    if (s.port > 0.9) { s.port = 0.9; s.portDrift = -Math.abs(s.portDrift); }

    // La poussée ne s'applique que le doigt posé. Sans cette condition, la
    // machine pousserait en permanence : un pointeur laisse toujours une
    // position derrière lui, même relevé, et le carburant partait tout seul.
    const pressed = Boolean(input.hold) && s.fuel > 0;
    if (pressed && input.x !== undefined && Math.abs(input.x - s.ship) > NEUTRAL) {
      // On appuie du côté où l'on veut aller. C'est le seul geste du jeu, et
      // il ne déplace rien : il accélère.
      const push = input.x < s.ship ? -1 : 1;
      s.drift += push * THRUST * dt;
      s.fuel = Math.max(0, s.fuel - BURN * dt);
    }
    s.ship += s.drift * dt;
    // Les bords ne pardonnent pas : on y perd sa vitesse.
    if (s.ship < 0) { s.ship = 0; s.drift = Math.abs(s.drift) * 0.3; s.notes.push('bord'); }
    if (s.ship > 1) { s.ship = 1; s.drift = -Math.abs(s.drift) * 0.3; s.notes.push('bord'); }

    // La manette des gaz, c'est la hauteur du doigt : en haut on ferme vite,
    // en bas on se laisse glisser. Deuxième axe, indépendant du premier —
    // c'est ce qui permet de corriger sa ligne sans se jeter sur le port.
    s.throttle = pressed && input.y !== undefined ? Math.max(0, Math.min(1, 1 - input.y)) : 0;
    s.closing = COAST + s.throttle * (FULL - COAST);
    s.range = Math.max(0, s.range - s.closing * dt);

    if (s.range <= 0 && !s.contact) {
      s.contact = true;
      s.offset = Math.abs(s.ship - s.port);
      s.impact = s.closing;
      const aligned = s.offset <= s.window;
      const soft = s.closing <= s.softness;
      if (aligned && soft) {
        s.docked = true;
        s.notes.push('amarré');
      } else {
        s.bumps += 1;
        s.notes.push(aligned ? 'trop vite' : soft ? 'à côté' : 'à côté et trop vite');
        // Un contact raté ne termine pas la manœuvre : on recule et on
        // recommence, avec ce qu'il reste de carburant. C'est la deuxième
        // chance qui rend l'erreur intéressante plutôt que fatale.
        s.range = 0.25;
        s.contact = false;
        s.fuel = Math.max(0, s.fuel - 12);
      }
    }
    return s;
  },

  finished(s) {
    return s.docked || s.bailed || s.elapsed >= s.limit;
  },

  score(s): MiniGameResult {
    // Sans carburant et sans amarrage, la manœuvre est perdue quoi qu'on
    // fasse : on ne fait pas semblant d'attendre.
    const alignment = Math.max(0, 1 - Math.abs(s.ship - s.port) / 0.5);
    const quality = Math.max(0, Math.min(1,
      (s.docked ? 0.62 : 0)
      + alignment * 0.2
      + (s.fuel / 100) * 0.12
      + Math.max(0, 1 - s.range) * 0.06
      - s.bumps * 0.11
      - (s.bailed ? 0.3 : 0),
    ));
    const notes: string[] = [];
    if (s.bailed) notes.push('Tu as interrompu la manœuvre.');
    else if (s.docked) notes.push(s.bumps === 0 ? 'Amarrage au premier essai.' : `Amarré après ${s.bumps} tentative(s).`);
    else notes.push('Le temps a manqué avant le contact.');
    if (s.fuel <= 0) notes.push('Réservoir à sec.');
    return {
      success: s.docked,
      score: Math.round((s.docked ? 600 : 0) + alignment * 250 + s.fuel * 1.5 - s.bumps * 80),
      quality,
      mistakes: s.bumps + (s.fuel <= 0 ? 1 : 0),
      time: s.elapsed,
      notes,
    };
  },
});
