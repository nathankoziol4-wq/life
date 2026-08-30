/**
 * Le socle commun aux mini-jeux vus de dessus.
 *
 * Le cambriolage et la fuite partagent la même géométrie : une grille de
 * cases, des murs, des gens qui se déplacent et regardent quelque part. Plutôt
 * que de l'écrire deux fois, on la met ici — avec une contrainte : tout doit
 * rester déterministe et sans dépendance, pour qu'un test puisse jouer une
 * partie entière.
 */

/**
 * Une case du plan.
 *
 * `C` est un abri : on y marche comme sur une case libre, mais on n'y est pas
 * vu. C'est le seul endroit du jeu où l'on peut reprendre son souffle sans
 * courir, et c'est ce qui empêche l'évasion d'être une course de vitesse.
 */
export type Cell = '#' | '.' | 'D' | 'X' | 'C';

export interface Plan {
  width: number;
  height: number;
  /** `height` lignes de `width` cases. */
  cells: Cell[];
}

export const at = (plan: Plan, x: number, y: number): Cell => {
  if (x < 0 || y < 0 || x >= plan.width || y >= plan.height) return '#';
  return plan.cells[y * plan.width + x];
};

export const setCell = (plan: Plan, x: number, y: number, cell: Cell): void => {
  if (x < 0 || y < 0 || x >= plan.width || y >= plan.height) return;
  plan.cells[y * plan.width + x] = cell;
};

/** Un mur bloque le passage ; une porte non. */
export const solid = (plan: Plan, x: number, y: number): boolean =>
  at(plan, Math.floor(x), Math.floor(y)) === '#';

/** Quelqu'un qui se déplace : le joueur, un occupant, un poursuivant. */
export interface Mover {
  x: number;
  y: number;
  /** Direction du regard, en radians. */
  facing: number;
  /** Cases par seconde. */
  speed: number;
}

/**
 * Déplace `m` vers `(tx, ty)` en glissant le long des murs.
 *
 * Le glissement compte : sans lui, un joueur qui vise en diagonale reste
 * collé au coin et croit que le jeu ne répond pas.
 */
export function moveToward(plan: Plan, m: Mover, tx: number, ty: number, dt: number): number {
  const dx = tx - m.x;
  const dy = ty - m.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 0.02) return 0;

  const step = Math.min(dist, (m.speed * dt) / 1000);
  const nx = m.x + (dx / dist) * step;
  const ny = m.y + (dy / dist) * step;

  // Rayon du personnage : on teste le bord qui avance, pas les deux. Tester
  // les deux paraissait plus sûr, mais enfermait définitivement quiconque
  // chevauchait déjà un mur — un poursuivant apparu au ras d'un bloc restait
  // planté là toute la partie, sans que rien ne l'indique à l'écran.
  const r = 0.28;
  const fromX = m.x;
  const fromY = m.y;
  if (!solid(plan, nx + (dx < 0 ? -r : r), m.y)) m.x = nx;
  if (!solid(plan, m.x, ny + (dy < 0 ? -r : r))) m.y = ny;

  m.facing = Math.atan2(dy, dx);
  // La distance réellement parcourue, qui peut être nulle contre un mur :
  // c'est elle qui décide du bruit, pas l'intention de bouger.
  return Math.hypot(m.x - fromX, m.y - fromY);
}

/** Rien de plein entre les deux points. */
export function lineOfSight(
  plan: Plan, fromX: number, fromY: number, toX: number, toY: number,
): boolean {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const steps = Math.ceil(Math.hypot(dx, dy) * 3);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (solid(plan, fromX + dx * t, fromY + dy * t)) return false;
  }
  return true;
}

/** Ligne de vue : un mur suffit à couper le regard. */
export function visible(plan: Plan, from: Mover, tx: number, ty: number, range: number): boolean {
  const dx = tx - from.x;
  const dy = ty - from.y;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;

  // Le champ de vision est un cône : on ne voit pas derrière soi.
  if (!withinCone(from.facing, Math.atan2(dy, dx), 0.9)) return false;

  return lineOfSight(plan, from.x, from.y, tx, ty);
}

/** L'angle `to` tombe-t-il dans le cône de demi-ouverture `half` centré sur `facing` ? */
export function withinCone(facing: number, to: number, half: number): boolean {
  let delta = Math.abs(to - facing) % (Math.PI * 2);
  if (delta > Math.PI) delta = Math.PI * 2 - delta;
  return delta <= half;
}

/**
 * Carte des distances vers une case, calculée en largeur d'abord.
 *
 * C'est la seule façon fiable de faire contourner un obstacle : une approche
 * gloutonne — essayer huit directions et garder la plus prometteuse — reste
 * coincée dès qu'il faut *s'éloigner* pour arriver. Sur des plans de trois
 * cents cases, le parcours complet coûte moins qu'un contournement raté.
 *
 * La case inatteignable vaut -1.
 */
export function flowField(plan: Plan, tx: number, ty: number): Int32Array {
  const field = new Int32Array(plan.width * plan.height).fill(-1);
  const start = Math.floor(ty) * plan.width + Math.floor(tx);
  if (start < 0 || start >= field.length) return field;
  if (at(plan, Math.floor(tx), Math.floor(ty)) === '#') return field;

  field[start] = 0;
  const queue = [start];
  for (let head = 0; head < queue.length; head++) {
    const index = queue[head];
    const x = index % plan.width;
    const y = Math.floor(index / plan.width);
    const next = field[index] + 1;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= plan.width || ny >= plan.height) continue;
      if (at(plan, nx, ny) === '#') continue;
      const ni = ny * plan.width + nx;
      if (field[ni] !== -1) continue;
      field[ni] = next;
      queue.push(ni);
    }
  }
  return field;
}

/**
 * Un pas le long d'une carte de distances.
 *
 * On vise le centre de la case voisine la plus proche du but : le déplacement
 * reste continu et fluide, mais le chemin est toujours correct.
 */
export function followField(plan: Plan, field: Int32Array, m: Mover, dt: number): void {
  const cx = Math.floor(m.x);
  const cy = Math.floor(m.y);
  const here = field[cy * plan.width + cx] ?? -1;
  if (here <= 0) return;

  let best = here;
  let goal: { x: number; y: number } | null = null;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    const nx = cx + dx;
    const ny = cy + dy;
    if (nx < 0 || ny < 0 || nx >= plan.width || ny >= plan.height) continue;
    const value = field[ny * plan.width + nx];
    if (value === -1 || value >= best) continue;
    best = value;
    goal = { x: nx + 0.5, y: ny + 0.5 };
  }
  if (goal) moveToward(plan, m, goal.x, goal.y, dt);
}

/** Tirages pré-calculés : le pas de simulation reste pur. */
export function rollFrom(rolls: number[], index: { at: number }): number {
  const value = rolls[index.at % rolls.length];
  index.at += 1;
  return value;
}
