/**
 * Mini-jeu : l'évasion.
 *
 * Tout y est fictif et abstrait. On ne montre aucune méthode, aucun outil,
 * aucune faille : le jeu est fait de jauges, d'angles et de minutage, comme un
 * jeu de plateau. Ce qui se joue n'est pas « comment sortir d'une prison »,
 * c'est « rester invisible pendant huit minutes ».
 *
 * Trois choses le distinguent du cambriolage, dont il partage la grille :
 *
 * 1. **être vu ne termine pas la partie**. Une jauge de vigilance monte, et
 *    c'est elle qui décide. On peut se montrer une seconde et le payer plus
 *    tard, ce qui laisse la place à l'erreur rattrapable ;
 * 2. **les abris comptent plus que les murs**. Les cases `C` cachent celui qui
 *    s'y arrête, et la vigilance y redescend deux fois plus vite ;
 * 3. **le projecteur**. Un faisceau balaie la cour à vitesse constante. Il ne
 *    se contourne pas, il s'attend — c'est la seule horloge du jeu que le
 *    joueur peut lire d'un coup d'œil.
 */

import type { Rng } from '../../engine/rng.ts';
import type { MiniGameResult } from '../../engine/minigame.ts';
import { registerMiniGame } from '../../engine/minigame.ts';
import {
  at, flowField, followField, lineOfSight, moveToward, rollFrom, setCell, visible,
  withinCone, type Mover, type Plan,
} from './grid.ts';

/** Un gardien, sur sa ronde ou en train de vérifier quelque chose. */
export interface Guard {
  id: string;
  emoji: string;
  mover: Mover;
  route: { x: number; y: number }[];
  routeAt: number;
  pause: number;
  sight: number;
  /** Il a cru voir quelque chose et va y jeter un œil. */
  checking: { x: number; y: number } | null;
  field?: Int32Array;
  fieldKey?: string;
}

/** Le projecteur : une horloge déguisée en faisceau. */
export interface Beam {
  x: number;
  y: number;
  /** Direction courante, en radians. */
  angle: number;
  /** Vitesse de balayage, radians par seconde. Le signe donne le sens. */
  speed: number;
  /** Demi-ouverture du faisceau. */
  half: number;
  range: number;
}

export interface EscapeState {
  plan: Plan;
  player: Mover;
  /** Le point de sortie du périmètre. En l'atteignant, on est dehors. */
  breach: { x: number; y: number };
  guards: Guard[];
  beams: Beam[];
  /** Ce que la surveillance a compris, 0-100. À 100, c'est fini. */
  alert: number;
  /** À couvert en ce moment — pour l'écran, et pour la détection. */
  hidden: boolean;
  /** Vu à l'instant même, par un gardien ou par le faisceau. */
  spotted: boolean;
  elapsed: number;
  /** L'appel : quand il tombe, une cellule vide se remarque. */
  limit: number;
  over: null | 'sorti' | 'repéré' | 'appel';
  /** Le personnage connaît-il les rondes ? Décidé par la préparation. */
  insight: boolean;
  pressure: number;
  rolls: number[];
  rollAt: { at: number };
}

export interface EscapeSetup {
  security: 'minimum' | 'medium' | 'maximum';
  /**
   * Ce que la préparation a apporté, 0-100.
   *
   * Elle ne joue pas à la place du joueur : elle enlève des gardiens, ralentit
   * le faisceau et donne du temps. Le trajet reste à faire.
   */
  plan: number;
  /** Ce que la direction soupçonne déjà, 0-100. L'inverse de la préparation. */
  suspicion: number;
}

/* ------------------------------------------------------------------ */
/* Le plan                                                             */
/* ------------------------------------------------------------------ */

/**
 * Une cour fermée, des bâtiments, des abris, une brèche dans le périmètre.
 *
 * Le tracé est volontairement schématique : c'est un plateau de jeu, pas la
 * carte d'un lieu réel.
 */
function buildPlan(rng: Rng, security: EscapeSetup['security']): {
  plan: Plan;
  breach: { x: number; y: number };
  open: { x: number; y: number }[];
} {
  const width = security === 'maximum' ? 23 : 21;
  const height = 17;
  const plan: Plan = {
    width, height, cells: Array.from({ length: width * height }, () => '.' as const),
  };

  // Le périmètre, plein sur tout le tour.
  for (let x = 0; x < width; x++) { setCell(plan, x, 0, '#'); setCell(plan, x, height - 1, '#'); }
  for (let y = 0; y < height; y++) { setCell(plan, 0, y, '#'); setCell(plan, width - 1, y, '#'); }

  // Les bâtiments : des blocs alignés, avec des passages entre eux.
  const blocks = security === 'minimum' ? 5 : 7;
  for (let i = 0; i < blocks; i++) {
    const bw = 2 + Math.floor(rng.next() * 4);
    const bh = 1 + Math.floor(rng.next() * 3);
    const bx = 2 + Math.floor(rng.next() * (width - 4 - bw));
    const by = 3 + Math.floor(rng.next() * (height - 7 - bh));
    for (let y = by; y < by + bh; y++) {
      for (let x = bx; x < bx + bw; x++) setCell(plan, x, y, '#');
    }
  }

  // Les abris, à l'ombre des bâtiments. Ils font tout l'intérêt du plan :
  // sans eux, traverser la cour serait une simple course.
  const shelters = 9 - blocks + 6;
  for (let i = 0; i < shelters; i++) {
    const x = 2 + Math.floor(rng.next() * (width - 4));
    const y = 2 + Math.floor(rng.next() * (height - 4));
    if (at(plan, x, y) !== '.') continue;
    setCell(plan, x, y, 'C');
    if (rng.next() < 0.5 && at(plan, x + 1, y) === '.') setCell(plan, x + 1, y, 'C');
  }

  // La brèche : un point du périmètre, jamais du côté du départ.
  const breachX = 3 + Math.floor(rng.next() * (width - 6));
  setCell(plan, breachX, 0, 'X');
  for (let dx = -1; dx <= 1; dx++) setCell(plan, breachX + dx, 1, '.');
  const breach = { x: breachX + 0.5, y: 0.5 };

  // Le départ, en bas : on dégage la zone pour ne pas naître dans un mur.
  for (let y = height - 3; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) if (at(plan, x, y) === '#') setCell(plan, x, y, '.');
  }

  // Les cases libres où poser gardiens et rondes.
  const open: { x: number; y: number }[] = [];
  for (let y = 2; y < height - 3; y++) {
    for (let x = 2; x < width - 2; x++) {
      if (at(plan, x, y) === '.') open.push({ x: x + 0.5, y: y + 0.5 });
    }
  }
  return { plan, breach, open };
}

/* ------------------------------------------------------------------ */
/* Le jeu                                                              */
/* ------------------------------------------------------------------ */

export const ESCAPE = registerMiniGame<EscapeState>({
  id: 'escape',
  category: 'crime',
  label: 'Évasion',
  goal: 'Traverser sans être vu. Les abris cachent, le faisceau ne pardonne pas.',
  duration: 40_000,

  setup(rng, ctx) {
    const setup = (ctx.setup as EscapeSetup | undefined)
      ?? { security: 'medium', plan: 0, suspicion: 0 };
    const { plan, breach, open } = buildPlan(rng, setup.security);

    // Le nombre de gardiens est le premier effet de la préparation : elle en
    // écarte, la méfiance en ajoute. C'est plus lisible qu'un pourcentage
    // appliqué à un tirage, et ça se voit à l'écran.
    const base = setup.security === 'maximum' ? 5 : setup.security === 'medium' ? 4 : 3;
    const count = Math.max(1, Math.min(6, Math.round(
      base + setup.suspicion / 40 - setup.plan / 30,
    )));

    const guards: Guard[] = Array.from({ length: count }, (_, i) => {
      const route = Array.from({ length: 3 }, () => open[Math.floor(rng.next() * open.length)]
        ?? { x: plan.width / 2, y: plan.height / 2 });
      return {
        id: `g${i}`,
        emoji: i === 0 ? '👮' : '🥾',
        mover: { x: route[0].x, y: route[0].y, facing: 0, speed: 1.5 + rng.next() * 0.5 },
        route,
        routeAt: 1,
        pause: 0,
        sight: setup.security === 'maximum' ? 7 : 6,
        checking: null,
      };
    });

    // Un projecteur par tour, aux coins hauts : ils balaient la zone la plus
    // dangereuse, celle qu'il faut traverser en dernier.
    const beamSpeed = (setup.security === 'minimum' ? 0.5 : 0.72)
      * (1 - setup.plan / 260);
    const beams: Beam[] = [
      {
        x: 1.5, y: 1.5, angle: 0.4, speed: beamSpeed,
        half: 0.34, range: setup.security === 'maximum' ? 13 : 11,
      },
    ];
    if (setup.security !== 'minimum') {
      beams.push({
        x: plan.width - 1.5, y: 1.5, angle: Math.PI - 0.4, speed: -beamSpeed * 0.85,
        half: 0.34, range: 11,
      });
    }

    return {
      plan,
      // On part du bas, au milieu : la brèche est en haut, la cour entre les
      // deux. Le trajet est long exprès — c'est le temps passé à découvert
      // qui fait la difficulté, pas la distance.
      player: { x: plan.width / 2, y: plan.height - 2.5, facing: -Math.PI / 2, speed: 2.2 },
      breach,
      guards,
      beams,
      alert: 0,
      hidden: false,
      spotted: false,
      elapsed: 0,
      limit: Math.round(40_000 * ctx.grace.time * (1 + setup.plan / 300)),
      over: null,
      insight: ctx.grace.insight || setup.plan >= 60,
      pressure: ctx.grace.pressure,
      rolls: Array.from({ length: 256 }, () => rng.next()),
      rollAt: { at: 0 },
    };
  },

  step(s, input, dt) {
    if (s.over) return s;
    s.elapsed += dt;
    if (s.elapsed >= s.limit) { s.over = 'appel'; return s; }
    if (input.quit) { s.over = 'repéré'; return s; }

    /* --- Le fuyard --- */
    const targetX = input.x !== undefined ? input.x * s.plan.width : s.player.x;
    const targetY = input.y !== undefined ? input.y * s.plan.height : s.player.y;
    const running = Boolean(input.hold);
    s.player.speed = running ? 3.1 : 1.9;
    const moved = moveToward(s.plan, s.player, targetX, targetY, dt);

    s.hidden = at(s.plan, Math.floor(s.player.x), Math.floor(s.player.y)) === 'C' && moved < 0.01;

    /* --- Qui regarde où --- */
    let seen = false;
    if (!s.hidden) {
      for (const guard of s.guards) {
        if (visible(s.plan, guard.mover, s.player.x, s.player.y, guard.sight)) { seen = true; break; }
      }
      if (!seen) {
        for (const beam of s.beams) {
          const dist = Math.hypot(s.player.x - beam.x, s.player.y - beam.y);
          if (dist > beam.range) continue;
          const towards = Math.atan2(s.player.y - beam.y, s.player.x - beam.x);
          if (!withinCone(beam.angle, towards, beam.half)) continue;
          if (!lineOfSight(s.plan, beam.x, beam.y, s.player.x, s.player.y)) continue;
          seen = true;
          break;
        }
      }
    }
    s.spotted = seen;

    // La vigilance : elle monte vite quand on est vu, plus vite encore quand
    // on court, et redescend d'autant plus qu'on se tient tranquille.
    if (seen) {
      s.alert += dt * (running ? 0.075 : 0.030) * s.pressure;
    } else {
      s.alert -= dt * (s.hidden ? 0.024 : 0.009);
    }
    s.alert = Math.max(0, Math.min(100, s.alert));
    if (s.alert >= 100) { s.over = 'repéré'; return s; }

    // Au-delà d'un certain seuil, quelqu'un vient voir. C'est le moment où
    // une partie bascule : la jauge ne se contente plus de monter, elle
    // envoie quelqu'un.
    if (s.alert > 55 && seen) {
      let nearest: Guard | null = null;
      let best = Infinity;
      for (const guard of s.guards) {
        const d = Math.hypot(guard.mover.x - s.player.x, guard.mover.y - s.player.y);
        if (d < best) { best = d; nearest = guard; }
      }
      if (nearest) nearest.checking = { x: s.player.x, y: s.player.y };
    }

    /* --- Les rondes --- */
    for (const guard of s.guards) {
      if (guard.pause > 0) { guard.pause -= dt; continue; }
      const goal = guard.checking ?? guard.route[guard.routeAt % guard.route.length];
      const key = `${Math.floor(goal.x)},${Math.floor(goal.y)}`;
      if (guard.fieldKey !== key) {
        guard.field = flowField(s.plan, goal.x, goal.y);
        guard.fieldKey = key;
      }
      if (guard.field) followField(s.plan, guard.field, guard.mover, dt);

      if (Math.hypot(guard.mover.x - goal.x, guard.mover.y - goal.y) < 0.6) {
        if (guard.checking) {
          guard.checking = null;
          guard.pause = 700;
        } else {
          guard.routeAt += 1;
          // Une ronde marque un temps : c'est cet arrêt qui crée les fenêtres.
          guard.pause = 600 + rollFrom(s.rolls, s.rollAt) * 1600;
        }
      }
      // Il ne faut pas non plus lui marcher dessus.
      if (Math.hypot(guard.mover.x - s.player.x, guard.mover.y - s.player.y) < 0.7 && !s.hidden) {
        s.over = 'repéré';
        return s;
      }
    }

    /* --- Le faisceau --- */
    for (const beam of s.beams) {
      beam.angle += (beam.speed * dt) / 1000;
      if (beam.angle > Math.PI * 2) beam.angle -= Math.PI * 2;
      if (beam.angle < 0) beam.angle += Math.PI * 2;
    }

    /* --- La brèche --- */
    if (Math.hypot(s.player.x - s.breach.x, s.player.y - s.breach.y) < 1.1) {
      s.over = 'sorti';
    }
    return s;
  },

  finished: (s) => s.over !== null,

  score(s): MiniGameResult {
    const out = s.over === 'sorti';
    // Sortir avec une jauge basse et du temps devant soi, c'est sortir sans
    // que personne ne s'en aperçoive — ce qui change tout pour la suite.
    const calm = 1 - s.alert / 100;
    const spare = Math.max(0, 1 - s.elapsed / s.limit);

    const quality = out
      ? Math.max(0.45, Math.min(1, 0.45 + calm * 0.35 + spare * 0.2))
      : Math.max(0, Math.min(0.4, (1 - Math.hypot(
        s.player.x - s.breach.x, s.player.y - s.breach.y,
      ) / (s.plan.width + s.plan.height)) * 0.4));

    return {
      success: out,
      score: Math.round(100 - s.alert),
      quality,
      mistakes: s.alert > 60 ? 1 : 0,
      time: s.elapsed,
      notes: out ? ['dehors'] : [s.over === 'appel' ? 'appel' : 'repéré'],
    };
  },
});

/** Issue narrative de la tentative. */
export type EscapeOutcome = 'dehors' | 'repéré' | 'appel';

export function escapeOutcome(s: EscapeState): EscapeOutcome {
  if (s.over === 'sorti') return 'dehors';
  if (s.over === 'appel') return 'appel';
  return 'repéré';
}
