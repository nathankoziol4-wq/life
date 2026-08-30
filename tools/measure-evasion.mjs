/**
 * Est-ce que quelqu'un peut gagner à ce mini-jeu ?
 *
 * La question n'est pas rhétorique. `chase` — la course qui suit une évasion —
 * était le seul mini-jeu jamais mesuré au doigt, parce qu'aucun robot ne
 * franchissait le périmètre. Trois politiques ont été essayées et perdues ;
 * il fallait savoir si c'était le robot ou le jeu.
 *
 * On compare donc trois façons de traverser la cour, sur le moteur seul,
 * pas d'affichage, cent plans chacune :
 *
 *   - **foncer** : viser la brèche et ne plus rien regarder ;
 *   - **contourner** : suivre le plus court chemin en évitant les murs ;
 *   - **le pilote** : celui de `pilote-evasion.mjs`, qui se sert des abris et
 *     attend le faisceau — avec la seule information que l'écran affiche.
 *
 *   node --experimental-strip-types tools/measure-evasion.mjs
 */

import { Rng } from '../src/engine/rng.ts';
import { miniGameContext } from '../src/engine/minigame.ts';
import { ESCAPE } from '../src/systems/minigames/escape.ts';
import { CHASE } from '../src/systems/minigames/chase.ts';
import { makeEscapePilot, escapeView } from './pilote-evasion.mjs';

const STEP = 40;
const PARTIES = 120;

/** La situation d'un joueur qui a préparé son coup, sans être un expert. */
const SITUATION = {
  skill: 52,
  difficulty: 48,
  setup: { security: 'medium', plan: 55, suspicion: 25 },
};

/** Le plus court chemin en cases, murs exclus. Sert à « contourner ». */
function shortest(plan, from, to) {
  const W = plan.width;
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= plan.height ? '#' : plan.cells[y * W + x]);
  const prev = new Map();
  const start = Math.floor(from.y) * W + Math.floor(from.x);
  const target = Math.floor(to.y) * W + Math.floor(to.x);
  const queue = [start];
  const seen = new Set([start]);
  while (queue.length > 0) {
    const node = queue.shift();
    if (node === target) break;
    const nx = node % W;
    const ny = Math.floor(node / W);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ax = nx + dx;
      const ay = ny + dy;
      if (ax < 0 || ay < 0 || ax >= W || ay >= plan.height) continue;
      if (at(ax, ay) === '#') continue;
      const next = ay * W + ax;
      if (seen.has(next)) continue;
      seen.add(next);
      prev.set(next, node);
      queue.push(next);
    }
  }
  if (!seen.has(target)) return null;
  const path = [];
  for (let node = target; node !== start; node = prev.get(node)) {
    path.unshift({ x: (node % W) + 0.5, y: Math.floor(node / W) + 0.5 });
  }
  return path;
}

/** Joue une partie complète et rend l'issue. */
function play(seed, policy) {
  const ctx = miniGameContext(SITUATION);
  const s = ESCAPE.setup(new Rng({ rngState: seed >>> 0 }), ctx);
  const decide = policy(s);
  let ticks = 0;
  while (!ESCAPE.finished(s) && ticks < 4000) {
    const input = decide(s, STEP) ?? {};
    ESCAPE.step(s, {
      x: input.x === undefined ? undefined : input.x / s.plan.width,
      y: input.y === undefined ? undefined : input.y / s.plan.height,
      hold: Boolean(input.hold),
    }, STEP);
    ticks += 1;
  }
  // La jauge dit *comment* on a perdu : à cent, la surveillance a compris ;
  // en dessous, on a marché sur un gardien — deux défauts très différents.
  const how = s.over === 'repéré' && s.alert < 99 ? 'collision' : s.over;
  return { over: s.over ?? 'appel', how, seconds: s.elapsed / 1000, alert: s.alert };
}

const POLICIES = {
  foncer: () => (s) => ({ x: s.breach.x, y: s.breach.y, hold: true }),

  contourner: (s0) => {
    let path = shortest(s0.plan, s0.player, s0.breach) ?? [];
    let step = 0;
    return (s) => {
      if (path.length === 0) return { x: s.breach.x, y: s.breach.y, hold: true };
      const aim = path[Math.min(step, path.length - 1)];
      if (Math.hypot(s.player.x - aim.x, s.player.y - aim.y) < 0.35) step += 1;
      return { x: aim.x, y: aim.y, hold: true };
    };
  },

  pilote: (s0) => {
    const tick = makeEscapePilot(s0.plan);
    return (s, dt) => tick(escapeView(s), dt);
  },
};

const out = [];
for (const [name, policy] of Object.entries(POLICIES)) {
  const tally = { dehors: 0, 'repéré': 0, collision: 0, appel: 0 };
  let seconds = 0;
  for (let seed = 7000; seed < 7000 + PARTIES; seed++) {
    const r = play(seed, policy);
    const key = r.over === 'sorti' ? 'dehors' : r.how;
    tally[key] = (tally[key] ?? 0) + 1;
    if (r.over === 'sorti') seconds += r.seconds;
  }
  out.push({
    politique: name,
    dehors: `${Math.round((tally.dehors / PARTIES) * 100)} %`,
    'jauge pleine': tally['repéré'],
    'marché dessus': tally.collision,
    appel: tally.appel,
    'traversée moyenne': tally.dehors > 0 ? `${(seconds / tally.dehors).toFixed(1)} s` : '—',
  });
}

console.log(`Évasion — ${PARTIES} plans par politique, régime moyen, plan préparé à 55.\n`);
console.table(out);

/* ------------------------------------------------------------------ */
/* Et une fois dehors ?                                                */
/* ------------------------------------------------------------------ */

/**
 * Combien de temps tient un fuyard qui ne fait rien ?
 *
 * La question n'est pas oiseuse : franchir le périmètre affiche une modale
 * — « De l'autre côté… » — et la course démarre **derrière elle**. Le temps
 * de lire et de refermer, personne ne bouge à l'écran, et les poursuivants,
 * eux, avancent. Si ce chiffre est plus court que le temps de lire une
 * phrase, la course est perdue avant d'être jouée.
 */
function idleSurvival(pursuers) {
  const times = [];
  for (let seed = 3000; seed < 3080; seed++) {
    const ctx = miniGameContext({
      skill: 52, difficulty: 48,
      setup: { place: 'prison', pursuers, speed: 3.5 },
    });
    const s = CHASE.setup(new Rng({ rngState: seed >>> 0 }), ctx);
    let ticks = 0;
    while (!CHASE.finished(s) && ticks < 2000) { CHASE.step(s, {}, STEP); ticks += 1; }
    if (s.over === 'rattrapé') times.push(s.elapsed / 1000);
  }
  times.sort((a, b) => a - b);
  return {
    'poursuivants': pursuers,
    'rattrapé sans bouger': `${times.length} / 80`,
    'au bout de (médiane)': times.length ? `${times[times.length >> 1].toFixed(2)} s` : '—',
    'au plus tard': times.length ? `${times[times.length - 1].toFixed(2)} s` : '—',
  };
}

console.log('\nLa course, si le joueur ne touche à rien — le temps de lire une modale.\n');
console.table([1, 2, 3].map(idleSurvival));
