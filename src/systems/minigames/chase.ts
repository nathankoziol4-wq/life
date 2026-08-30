/**
 * Mini-jeu : la fuite.
 *
 * Il ne se joue jamais seul. C'est ce qui arrive *après* : un coup qui tourne
 * mal, une confrontation, une évasion. Plutôt que d'écrire « tu t'es fait
 * attraper », le jeu rend la main une dernière fois.
 *
 * Le principe tient en une phrase : rejoindre une sortie pendant que des gens
 * courent derrière. Ils vont plus vite en ligne droite, le joueur tourne mieux
 * — la fuite se gagne dans les angles et les obstacles, pas à la course.
 *
 * Le même jeu sert au quartier, au magasin et à la prison : seuls changent la
 * taille du plan, le nombre de poursuivants et leur vitesse.
 */

import type { Rng } from '../../engine/rng.ts';
import type { MiniGameResult } from '../../engine/minigame.ts';
import { registerMiniGame } from '../../engine/minigame.ts';
import {
  at, flowField, followField, moveToward, rollFrom, setCell, type Mover, type Plan,
} from './grid.ts';

export interface Pursuer {
  id: string;
  emoji: string;
  mover: Mover;
  /** Dernière position connue du fuyard. */
  lastSeen: { x: number; y: number };
  /** Temps avant de repartir après avoir perdu la trace. */
  confusion: number;
  /** Carte des distances vers `lastSeen`, et la case qui l'a produite. */
  field?: Int32Array;
  fieldKey?: string;
}

export interface ChaseState {
  plan: Plan;
  player: Mover;
  /** Zones de sortie : en atteindre une suffit. */
  exits: { x: number; y: number }[];
  pursuers: Pursuer[];
  /** Souffle restant, 0-100. Courir l'épuise, marcher le rend. */
  stamina: number;
  /** Allure de base du fuyard, dont marche et sprint sont des multiples. */
  pace: number;
  /** Distance parcourue, pour le récit. */
  distance: number;
  elapsed: number;
  limit: number;
  over: null | 'échappé' | 'rattrapé' | 'temps';
  pressure: number;
  rolls: number[];
  rollAt: { at: number };
}

export interface ChaseSetup {
  /** Décor : change la forme du plan et le vocabulaire de l'écran. */
  place: 'rue' | 'magasin' | 'prison';
  /** Nombre de poursuivants. */
  pursuers: number;
  /**
   * Vitesse des poursuivants, en cases par seconde.
   *
   * À comparer au fuyard : autour de 2,1 en marchant et de 3,4 en courant,
   * selon sa forme. En dessous de 3, il suffit de sprinter en ligne droite ;
   * au-dessus de 4, rien ne sert de courir. L'intervalle utile est étroit, et
   * c'est voulu.
   */
  speed: number;
}

/**
 * Un plan ouvert parsemé d'obstacles.
 *
 * On ne veut ni labyrinthe — injouable au doigt — ni terrain vide, où la
 * course se réduirait à une comparaison de vitesses. Des blocs épars donnent
 * de quoi couper, tourner et faire perdre la trace.
 */
function buildPlan(rng: Rng, place: ChaseSetup['place']): Plan {
  const width = place === 'prison' ? 19 : 21;
  const height = place === 'magasin' ? 13 : 15;
  const plan: Plan = { width, height, cells: Array.from({ length: width * height }, () => '.' as const) };

  // Bordure pleine, sauf les sorties percées plus bas.
  for (let x = 0; x < width; x++) { setCell(plan, x, 0, '#'); setCell(plan, x, height - 1, '#'); }
  for (let y = 0; y < height; y++) { setCell(plan, 0, y, '#'); setCell(plan, width - 1, y, '#'); }

  // Obstacles : des blocs de deux à quatre cases, jamais collés aux bords.
  const blocks = place === 'magasin' ? 14 : 10;
  for (let i = 0; i < blocks; i++) {
    const bw = 1 + Math.floor(rng.next() * 3);
    const bh = 1 + Math.floor(rng.next() * 2);
    const bx = 2 + Math.floor(rng.next() * (width - 4 - bw));
    const by = 2 + Math.floor(rng.next() * (height - 4 - bh));
    for (let y = by; y < by + bh; y++) {
      for (let x = bx; x < bx + bw; x++) setCell(plan, x, y, '#');
    }
  }

  return plan;
}

export const CHASE = registerMiniGame<ChaseState>({
  id: 'chase',
  category: 'crime',
  label: 'Fuite',
  goal: 'Rejoindre une sortie. Ils courent plus vite, mais tournent moins bien.',
  duration: 45_000,

  setup(rng, ctx) {
    const setup = (ctx.setup as ChaseSetup | undefined)
      ?? { place: 'rue', pursuers: 1, speed: 3.5 };
    const plan = buildPlan(rng, setup.place);

    // Deux sorties opposées : il faut choisir, et parfois changer d'avis.
    const exits = [
      { x: plan.width - 1.5, y: 2.5 },
      { x: 1.5, y: plan.height - 2.5 },
    ];
    for (const exit of exits) {
      // On dégage les abords : un bloc tiré au hasard devant une sortie la
      // rendait inatteignable, et la partie se terminait au chronomètre sans
      // que le joueur comprenne pourquoi.
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          setCell(plan, Math.floor(exit.x) + dx, Math.floor(exit.y) + dy, '.');
        }
      }
      setCell(plan, Math.floor(exit.x), Math.floor(exit.y), 'X');
    }

    // Le centre est dégagé : le joueur y démarre, et un bloc tiré au hasard
    // pouvait l'y enfermer — auquel cas plus personne ne pouvait l'atteindre
    // et la partie se terminait au chronomètre, immobile.
    const midX = Math.floor(plan.width / 2);
    const midY = Math.floor(plan.height / 2);
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) setCell(plan, midX + dx, midY + dy, '.');
    }

    // Le joueur démarre au centre, les poursuivants autour de lui.
    // Son allure de base dépend de sa forme ; `step()` la décline ensuite en
    // marche ou en sprint. Elle est rangée dans l'état plutôt que dans le
    // `Mover`, justement parce que `step()` écrase `speed` à chaque image.
    const pace = 2.3 + ctx.skill / 220;
    const player: Mover = {
      x: plan.width / 2, y: plan.height / 2, facing: 0, speed: pace,
    };

    // D'où ils débouchent est tiré au sort, et c'est le cœur de la difficulté.
    // Un fuyard n'a que deux sorties : si personne ne se trouve entre lui et
    // l'une des deux, il file sans avoir rien à décider. Une orientation fixe
    // donnait donc toujours la même partie — toutes gagnées, ou toutes
    // perdues, selon le côté choisi une fois pour toutes.
    const bearing = rng.next() * Math.PI * 2;
    // Plus ils sont nombreux, plus ils s'écartent : deux personnes couvrent un
    // quart de tour, quatre en couvrent trois quarts. C'est ce qui fait la
    // différence entre être suivi et être encerclé.
    const spread = Math.min(Math.PI * 1.7, (setup.pursuers - 1) * Math.PI * 0.5);

    // Une carte des distances depuis le fuyard : elle sert à ne faire naître
    // personne dans une poche fermée. Un poursuivant inatteignable ne
    // poursuit rien, et la partie s'achève au chronomètre sans explication.
    const reachable = flowField(plan, player.x, player.y);

    const pursuers: Pursuer[] = Array.from({ length: setup.pursuers }, (_, i) => {
      const angle = bearing
        + (setup.pursuers === 1 ? 0 : (i / (setup.pursuers - 1) - 0.5) * spread);
      // On rapproche le point d'apparition jusqu'à tomber sur une case libre
      // et joignable : un poursuivant né dans un mur ne bouge jamais, et la
      // poursuite n'existe plus sans que rien ne le signale.
      let spot = { x: player.x, y: player.y };
      for (let radius = 3.6; radius >= 1; radius -= 0.3) {
        const cx = Math.max(1.5, Math.min(plan.width - 1.5, player.x + Math.cos(angle) * radius));
        const cy = Math.max(1.5, Math.min(plan.height - 1.5, player.y + Math.sin(angle) * radius));
        const cell = { x: Math.floor(cx), y: Math.floor(cy) };
        if (at(plan, cell.x, cell.y) === '#') continue;
        if (reachable[cell.y * plan.width + cell.x] === -1) continue;
        // Au centre de la case, jamais au ras du bord : à trente centimètres
        // d'un mur, on commence la partie coincé contre lui.
        spot = { x: cell.x + 0.5, y: cell.y + 0.5 };
        break;
      }
      return {
        id: `p${i}`,
        emoji: setup.place === 'prison' ? '👮' : setup.place === 'magasin' ? '🦺' : '🏃',
        mover: {
          x: spot.x,
          y: spot.y,
          facing: angle + Math.PI,
          // Ils courent plus vite qu'on ne marche, et presque aussi vite qu'on
          // ne sprinte : c'est le souffle qui décide, pas la vitesse de pointe.
          //
          // Le plafond n'est pas cosmétique. Sans lui, un personnage sans
          // souffle voyait ses poursuivants dépasser son propre sprint : plus
          // aucun angle ne servait à rien, et la partie devenait injouable
          // plutôt que difficile. Un mauvais personnage doit perdre souvent,
          // pas perdre toujours.
          speed: Math.min(setup.speed * ctx.grace.pressure, pace * 1.345 * 1.12),
        },
        lastSeen: { x: player.x, y: player.y },
        confusion: 0,
      };
    });

    return {
      plan,
      player,
      exits,
      pursuers,
      pace,
      stamina: 100,
      distance: 0,
      elapsed: 0,
      limit: Math.round(45_000 * ctx.grace.time),
      over: null,
      pressure: ctx.grace.pressure,
      rolls: Array.from({ length: 128 }, () => rng.next()),
      rollAt: { at: 0 },
    };
  },

  step(s, input, dt) {
    if (s.over) return s;
    s.elapsed += dt;
    if (s.elapsed >= s.limit) { s.over = 'temps'; return s; }
    if (input.quit) { s.over = 'rattrapé'; return s; }

    /* --- Le fuyard --- */
    const targetX = input.x !== undefined ? input.x * s.plan.width : s.player.x;
    const targetY = input.y !== undefined ? input.y * s.plan.height : s.player.y;
    const wantsToRun = Boolean(input.hold) && s.stamina > 2;

    // Courir épuise ; marcher récupère. Un souffle à zéro est ce qui fait
    // rattraper, plus souvent que la vitesse de pointe.
    // Un personnage en forme court plus vite, mais jamais autant qu'eux : les
    // deux coefficients gardent le sprint sous la vitesse des poursuivants.
    s.player.speed = s.pace * (wantsToRun ? 1.345 : 0.831) + (s.stamina > 40 ? 0.2 : -0.3);
    const moved = moveToward(s.plan, s.player, targetX, targetY, dt);
    s.distance += moved;
    s.stamina = Math.max(0, Math.min(100,
      // Trois secondes de sprint, pas davantage : au-delà, un joueur pouvait
      // rejoindre n'importe quelle sortie d'une traite et la poursuite
      // n'existait plus. Le souffle est la vraie contrainte du jeu.
      s.stamina + (wantsToRun && moved > 0 ? -dt * 0.026 : dt * 0.013)));

    /* --- Les poursuivants --- */
    for (const pursuer of s.pursuers) {
      const dist = Math.hypot(pursuer.mover.x - s.player.x, pursuer.mover.y - s.player.y);

      // Ils gardent la trace tant qu'ils sont proches ; au-delà ils vont vers
      // le dernier endroit connu, et finissent par tourner en rond.
      // Le rayon de suivi est court : c'est lui qui donne au fuyard son
      // seul véritable avantage. Ils courent plus vite, mais dès qu'un angle
      // les sépare de lui ils poursuivent un souvenir.
      if (dist < 4.5) {
        pursuer.lastSeen = { x: s.player.x, y: s.player.y };
        pursuer.confusion = 0;
      } else {
        pursuer.confusion += dt;
        if (pursuer.confusion > 2200) {
          pursuer.lastSeen = {
            x: pursuer.mover.x + (rollFrom(s.rolls, s.rollAt) - 0.5) * 6,
            y: pursuer.mover.y + (rollFrom(s.rolls, s.rollAt) - 0.5) * 6,
          };
          pursuer.confusion = 0;
        }
      }

      // Une carte de distances par poursuivant, recalculée seulement quand
      // sa cible a bougé d'une case : c'est ce qui leur permet de contourner
      // un obstacle au lieu de rester bloqués derrière.
      const key = `${Math.floor(pursuer.lastSeen.x)},${Math.floor(pursuer.lastSeen.y)}`;
      if (pursuer.fieldKey !== key) {
        pursuer.field = flowField(s.plan, pursuer.lastSeen.x, pursuer.lastSeen.y);
        pursuer.fieldKey = key;
      }
      if (pursuer.field) followField(s.plan, pursuer.field, pursuer.mover, dt);
      if (dist < 0.75) { s.over = 'rattrapé'; return s; }
    }

    /* --- La sortie --- */
    for (const exit of s.exits) {
      if (Math.hypot(s.player.x - exit.x, s.player.y - exit.y) < 1) {
        s.over = 'échappé';
        return s;
      }
    }
    return s;
  },

  finished: (s) => s.over !== null,

  score(s): MiniGameResult {
    const escaped = s.over === 'échappé';
    // La distance aux poursuivants au moment de la fin dit à quel point
    // c'était juste : s'échapper de peu ne vaut pas s'échapper large.
    const margin = s.pursuers.length === 0 ? 1 : Math.min(1, Math.min(
      ...s.pursuers.map((x) => Math.hypot(x.mover.x - s.player.x, x.mover.y - s.player.y)),
    ) / 8);

    const quality = escaped
      ? Math.max(0.5, Math.min(1, 0.55 + margin * 0.35 + s.stamina / 500))
      : Math.max(0, Math.min(0.45, s.distance / 60 + s.stamina / 400));

    return {
      success: escaped,
      score: Math.round(s.distance),
      quality,
      mistakes: s.stamina <= 0 ? 1 : 0,
      time: s.elapsed,
      notes: escaped ? ['semé'] : ['rattrapé'],
    };
  },
});
