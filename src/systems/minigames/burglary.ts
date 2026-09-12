/**
 * Mini-jeu : le cambriolage.
 *
 * Une maison générée, vue de dessus. Le joueur entre, cherche, et décide
 * quand repartir. Tout est abstrait : il n'y a ni serrure, ni alarme, ni
 * technique — on entre par une porte qui est déjà là. Ce qui se joue n'est pas
 * une effraction, c'est **la tentation de rester une minute de plus**.
 *
 * Trois pressions travaillent l'une contre l'autre :
 *
 *   - le **butin** : plus on prend, plus on gagne ;
 *   - la **charge** : on ne peut pas tout emporter, il faut choisir ;
 *   - le **bruit et le temps** : courir va vite et s'entend, fouiller prend
 *     du temps, et quelqu'un finit toujours par rentrer.
 *
 * Le jeu se termine quand le joueur ressort par où il est entré — avec ce
 * qu'il a. Repartir les mains vides est une décision valable.
 */

import type { Rng } from '../../engine/rng.ts';
import type { MiniGameResult } from '../../engine/minigame.ts';
import { registerMiniGame } from '../../engine/minigame.ts';
import {
  at, flowField, followField, moveToward, rollFrom, setCell, solid, visible,
  type Mover, type Plan,
} from './grid.ts';

/** Un objet à emporter. */
export interface Loot {
  id: string;
  label: string;
  emoji: string;
  x: number;
  y: number;
  /** Valeur, en unités de monnaie locale. */
  value: number;
  /** Encombrement : la capacité est limitée. */
  weight: number;
  /** Temps de fouille, en millisecondes. */
  time: number;
  /** Bruit produit pendant la fouille, par seconde. */
  noise: number;
  taken: boolean;
}

/** Quelqu'un dans la maison. */
export interface Occupant {
  id: string;
  label: string;
  emoji: string;
  mover: Mover;
  /** Points de passage, parcourus en boucle. */
  route: { x: number; y: number }[];
  routeAt: number;
  /** Portée du regard, en cases. */
  sight: number;
  /** Attiré par un bruit : destination temporaire. */
  investigating: { x: number; y: number } | null;
  /** Temps restant d'immobilité à un point de passage. */
  pause: number;
  /** Carte des distances vers l'objectif courant. */
  field?: Int32Array;
  fieldKey?: string;
}

export interface BurglaryState {
  plan: Plan;
  player: Mover;
  /** Position de la sortie : la porte par laquelle on est entré. */
  exit: { x: number; y: number };
  loot: Loot[];
  occupants: Occupant[];
  /** Ce qui est déjà dans le sac. */
  bag: { label: string; value: number; weight: number }[];
  /** Charge maximale, en unités d'encombrement. */
  capacity: number;
  /** Jauge de bruit, 0-100. Elle redescend dans le silence. */
  noise: number;
  /** Fouille en cours. */
  searching: string | null;
  searchProgress: number;
  /** Temps écoulé et limite, en ms. */
  elapsed: number;
  limit: number;
  /** Nombre de fois où un occupant a failli voir le joueur. */
  closeCalls: number;
  over: null | 'sorti' | 'vu' | 'temps';
  /** Le personnage repère-t-il ce qui a de la valeur d'un coup d'œil ? */
  insight: boolean;
  /** Multiplicateur de la montée du bruit et de la vigilance. */
  pressure: number;
  rolls: number[];
  rollAt: { at: number };
}

/* ------------------------------------------------------------------ */
/* Génération de la maison                                             */
/* ------------------------------------------------------------------ */

const CATALOGUE: Omit<Loot, 'id' | 'x' | 'y' | 'taken'>[] = [
  { label: 'Espèces', emoji: '💵', value: 1.4, weight: 1, time: 900, noise: 6 },
  { label: 'Bijoux', emoji: '💍', value: 3.2, weight: 1, time: 1600, noise: 10 },
  { label: 'Montre', emoji: '⌚', value: 2.1, weight: 1, time: 1200, noise: 8 },
  { label: 'Ordinateur', emoji: '💻', value: 2.6, weight: 4, time: 2600, noise: 16 },
  { label: 'Téléviseur', emoji: '📺', value: 1.9, weight: 7, time: 4200, noise: 26 },
  { label: 'Tableau', emoji: '🖼️', value: 4.5, weight: 5, time: 3400, noise: 20 },
  { label: 'Argenterie', emoji: '🍴', value: 1.6, weight: 3, time: 2200, noise: 22 },
  { label: 'Appareil photo', emoji: '📷', value: 1.7, weight: 2, time: 1500, noise: 9 },
];

export interface HouseSetup {
  /** Richesse du logement : ce qu'il y a à prendre. */
  wealth: number;
  /** Nombre d'occupants présents. */
  occupants: number;
  /** Taille du plan. */
  size: 'petit' | 'moyen' | 'grand';
  /** Unité monétaire locale. */
  unit: number;
}

/**
 * Construit un plan par pièces.
 *
 * On part d'un rectangle plein, on y creuse des pièces reliées par des portes,
 * puis on place la sortie sur un bord. Rien d'élégant, mais le résultat est
 * lisible sur un téléphone et différent à chaque partie.
 */
function buildPlan(rng: Rng, size: HouseSetup['size']): { plan: Plan; rooms: { x: number; y: number; w: number; h: number }[] } {
  const width = size === 'petit' ? 13 : size === 'moyen' ? 17 : 21;
  const height = size === 'petit' ? 11 : size === 'moyen' ? 13 : 15;
  const plan: Plan = { width, height, cells: Array.from({ length: width * height }, () => '#' as const) };

  // Une grille de pièces : deux ou trois rangées, deux à quatre colonnes.
  const cols = size === 'petit' ? 2 : size === 'moyen' ? 3 : 4;
  const rows = size === 'grand' ? 3 : 2;
  const cellW = Math.floor((width - 1) / cols);
  const cellH = Math.floor((height - 1) / rows);

  const rooms: { x: number; y: number; w: number; h: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = 1 + c * cellW;
      const y = 1 + r * cellH;
      const w = cellW - 1;
      const h = cellH - 1;
      for (let iy = y; iy < y + h; iy++) {
        for (let ix = x; ix < x + w; ix++) setCell(plan, ix, iy, '.');
      }
      rooms.push({ x, y, w, h });
    }
  }

  // Portes entre pièces voisines : une par mur mitoyen.
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const room = rooms[r * cols + c];
      if (c < cols - 1) {
        const doorY = room.y + 1 + Math.floor(rng.next() * Math.max(1, room.h - 2));
        setCell(plan, room.x + room.w, doorY, 'D');
      }
      if (r < rows - 1) {
        const doorX = room.x + 1 + Math.floor(rng.next() * Math.max(1, room.w - 2));
        setCell(plan, doorX, room.y + room.h, 'D');
      }
    }
  }

  return { plan, rooms };
}

/** Le mini-jeu. */
export const BURGLARY = registerMiniGame<BurglaryState>({
  id: 'burglary',
  category: 'crime',
  label: 'Cambriolage',
  goal: 'Prendre ce qui vaut la peine, et ressortir avant qu’on te voie.',
  duration: 90_000,

  setup(rng, ctx) {
    const setup = (ctx.setup as HouseSetup | undefined)
      ?? { wealth: 1, occupants: 1, size: 'moyen', unit: 300 };
    const { plan, rooms } = buildPlan(rng, setup.size);

    // La sortie : on perce un bord au niveau d'une pièce du bas.
    const entryRoom = rooms[rooms.length - 1];
    const exitX = entryRoom.x + Math.floor(entryRoom.w / 2);
    const exitY = entryRoom.y + entryRoom.h - 1;
    setCell(plan, exitX, exitY + 1, 'X');
    const exit = { x: exitX + 0.5, y: exitY + 1.5 };

    /* --- Le butin, réparti dans les pièces --- */
    const loot: Loot[] = [];
    for (const [index, room] of rooms.entries()) {
      const count = 1 + Math.floor(rng.next() * 2);
      for (let i = 0; i < count; i++) {
        const def = CATALOGUE[Math.floor(rng.next() * CATALOGUE.length)];
        loot.push({
          ...def,
          id: `loot_${index}_${i}`,
          x: room.x + 0.5 + Math.floor(rng.next() * room.w),
          y: room.y + 0.5 + Math.floor(rng.next() * room.h),
          value: Math.round(def.value * setup.unit * setup.wealth * (0.7 + rng.next() * 0.6)),
          taken: false,
        });
      }
    }

    /* --- Les occupants, qui tournent dans la maison --- */
    const occupants: Occupant[] = [];
    const profiles = [
      { label: 'Le propriétaire', emoji: '🧔', sight: 6.5, speed: 1.6 },
      { label: 'Quelqu’un d’autre', emoji: '🧑', sight: 5.5, speed: 1.5 },
      { label: 'Le chien', emoji: '🐕', sight: 4.5, speed: 2.4 },
    ];
    for (let i = 0; i < Math.min(setup.occupants, profiles.length); i++) {
      const profile = profiles[i];
      // Une ronde entre trois pièces tirées au sort.
      const route = Array.from({ length: 3 }, () => {
        const room = rooms[Math.floor(rng.next() * rooms.length)];
        return {
          x: room.x + 0.5 + Math.floor(rng.next() * room.w),
          y: room.y + 0.5 + Math.floor(rng.next() * room.h),
        };
      });
      occupants.push({
        id: `occ_${i}`,
        label: profile.label,
        emoji: profile.emoji,
        mover: { x: route[0].x, y: route[0].y, facing: 0, speed: profile.speed },
        route,
        routeAt: 1,
        sight: profile.sight,
        investigating: null,
        pause: 0,
      });
    }

    return {
      plan,
      player: { x: exit.x, y: exit.y - 1, facing: -Math.PI / 2, speed: 2.4 },
      exit,
      loot,
      occupants,
      bag: [],
      // Un cambrioleur aguerri emporte davantage : il sait s'organiser.
      capacity: 6 + Math.round(ctx.skill / 18),
      noise: 0,
      searching: null,
      searchProgress: 0,
      elapsed: 0,
      limit: Math.round(90_000 * ctx.grace.time),
      closeCalls: 0,
      over: null,
      insight: ctx.grace.insight,
      pressure: ctx.grace.pressure,
      rolls: Array.from({ length: 256 }, () => rng.next()),
      rollAt: { at: 0 },
    };
  },

  step(s, input, dt) {
    if (s.over) return s;
    s.elapsed += dt;
    if (s.elapsed >= s.limit) { s.over = 'temps'; return s; }

    /* --- Le joueur --- */
    const targetX = input.x !== undefined ? input.x * s.plan.width : s.player.x;
    const targetY = input.y !== undefined ? input.y * s.plan.height : s.player.y;

    const onLoot = s.loot.find(
      (item) => !item.taken && Math.hypot(item.x - s.player.x, item.y - s.player.y) < 0.7,
    );
    const bagWeight = s.bag.reduce((sum, item) => sum + item.weight, 0);

    if (input.hold && onLoot && bagWeight + onLoot.weight <= s.capacity) {
      // Fouiller : on ne bouge pas, on fait du bruit, ça prend du temps.
      if (s.searching !== onLoot.id) { s.searching = onLoot.id; s.searchProgress = 0; }
      s.searchProgress += dt;
      s.noise += (onLoot.noise * dt) / 1000 * s.pressure;
      if (s.searchProgress >= onLoot.time) {
        onLoot.taken = true;
        s.bag.push({ label: onLoot.label, value: onLoot.value, weight: onLoot.weight });
        s.searching = null;
        s.searchProgress = 0;
      }
    } else {
      s.searching = null;
      s.searchProgress = 0;
      const moved = moveToward(s.plan, s.player, targetX, targetY, dt);
      // Se déplacer vite s'entend. Le sac plein ralentit et alourdit le pas.
      const load = 1 + bagWeight / Math.max(1, s.capacity);
      const rate = (moved / (dt / 1000)) / s.player.speed;
      if (rate > 0.62) s.noise += (rate - 0.62) * dt * 0.05 * load * s.pressure;
      s.player.speed = 2.4 / load;
    }

    // Le silence fait redescendre la jauge, lentement.
    s.noise = Math.max(0, Math.min(100, s.noise - dt * 0.006));

    /* --- Les occupants --- */
    for (const occ of s.occupants) {
      if (occ.pause > 0) { occ.pause -= dt; continue; }

      // Un bruit fort attire : ils viennent voir, sans savoir quoi.
      if (s.noise > 55 && !occ.investigating && rollFrom(s.rolls, s.rollAt) < 0.02) {
        occ.investigating = { x: s.player.x, y: s.player.y };
      }

      const goal = occ.investigating ?? occ.route[occ.routeAt % occ.route.length];
      const key = `${Math.floor(goal.x)},${Math.floor(goal.y)}`;
      if (occ.fieldKey !== key) {
        occ.field = flowField(s.plan, goal.x, goal.y);
        occ.fieldKey = key;
      }
      if (occ.field) followField(s.plan, occ.field, occ.mover, dt);

      if (Math.hypot(occ.mover.x - goal.x, occ.mover.y - goal.y) < 0.5) {
        if (occ.investigating) {
          occ.investigating = null;
          occ.pause = 900;
        } else {
          occ.routeAt += 1;
          occ.pause = 500 + rollFrom(s.rolls, s.rollAt) * 1400;
        }
      }

      // Être vu met fin à tout. Fouiller, immobile et dos tourné, est le
      // moment le plus dangereux du jeu.
      if (visible(s.plan, occ.mover, s.player.x, s.player.y, occ.sight)) {
        s.over = 'vu';
        return s;
      }
      // Passer tout près sans être vu : ce n'est pas une faute, mais le
      // récit s'en souviendra. On ne compte l'alerte qu'une fois par
      // rapprochement, sinon chaque pas la ferait grimper.
      const near = Math.hypot(occ.mover.x - s.player.x, occ.mover.y - s.player.y) < 2.2;
      if (near && occ.pause <= 0 && !occ.investigating && rollFrom(s.rolls, s.rollAt) < 0.01) {
        s.closeCalls += 1;
      }
    }

    /* --- La sortie --- */
    if (Math.hypot(s.player.x - s.exit.x, s.player.y - s.exit.y) < 0.8 && s.elapsed > 800) {
      s.over = 'sorti';
    }
    if (input.quit) s.over = 'sorti';
    return s;
  },

  finished: (s) => s.over !== null,

  score(s): MiniGameResult {
    const loot = s.bag.reduce((sum, item) => sum + item.value, 0);
    const potential = s.loot.reduce((sum, item) => sum + item.value, 0);
    const share = potential > 0 ? loot / potential : 0;
    const caught = s.over === 'vu';

    // Sortir avec peu vaut mieux que se faire voir avec beaucoup : la
    // discrétion pèse autant que le butin.
    const quality = Math.max(0, Math.min(1,
      share * 0.5 + (caught ? 0 : 0.3) + (1 - s.noise / 100) * 0.2));

    return {
      success: !caught && s.bag.length > 0,
      score: Math.round(loot),
      quality,
      mistakes: caught ? 1 : 0,
      time: s.elapsed,
      notes: s.bag.map((item) => item.label),
    };
  },
});

/** Issue narrative du cambriolage. */
export type BurglaryOutcome = 'propre' | 'bruyant' | 'bredouille' | 'surpris' | 'piégé';

export function burglaryOutcome(s: BurglaryState): BurglaryOutcome {
  if (s.over === 'vu') return 'surpris';
  if (s.over === 'temps') return 'piégé';
  if (s.bag.length === 0) return 'bredouille';
  return s.noise > 45 ? 'bruyant' : 'propre';
}

/** Ce que vaut le sac, pour l'écran comme pour la simulation. */
export function bagValue(s: BurglaryState): number {
  return s.bag.reduce((sum, item) => sum + item.value, 0);
}

/** Utilitaires réexportés pour le rendu. */
export { at, solid };
