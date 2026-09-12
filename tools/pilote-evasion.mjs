/**
 * Un pilote pour l'évasion — celui qui manquait.
 *
 * Le mini-jeu de la cour n'était pas mesurable au doigt parce qu'aucun robot
 * ne le gagnait : foncer sur la brèche se plante dans un mur, contourner les
 * murs se fait repérer. Le jeu demande d'utiliser les abris et d'attendre le
 * faisceau, et un pilote qui l'ignore se fait prendre — c'est le jeu qui a
 * raison, pas le pilote.
 *
 * Ce fichier écrit donc le pilote qui manquait. Deux règles l'encadrent :
 *
 * 1. **Il ne voit que ce que l'écran montre.** Les murs et les abris (dessinés
 *    case par case), les pions, le cône du projecteur, la jauge de vigilance,
 *    le temps restant. Il ne connaît ni l'orientation du regard d'un gardien,
 *    ni sa portée, ni sa ronde — rien de tout cela n'est affiché. Il suppose
 *    donc le pire : un gardien en vue directe est un gardien qui regarde.
 * 2. **Il est autonome.** Aucun `import` : la fonction se suffit à elle-même,
 *    ce qui permet de l'exécuter telle quelle dans le navigateur du test de
 *    fumée (`new Function('return ' + fn)`) comme sur le moteur seul.
 *
 * Sa politique tient en une phrase : *chercher le chemin le moins exposé, et
 * s'arrêter à l'abri quand la suite est éclairée.* Le coût d'une case vaut un
 * pas, beaucoup plus si elle est vue, un peu moins si elle cache ; le chemin
 * le moins cher se recalcule à chaque image, et l'on n'y avance que si la case
 * suivante est sûre. Quand le temps presse, la prudence baisse et l'on court —
 * ce que ferait n'importe quel joueur devant le compte à rebours.
 */

/**
 * @param {{width:number,height:number,cells:string[]}} plan
 * @returns {(view:object, dt:number) => {x:number,y:number,hold:boolean}}
 *   Une cible en cases (pas en pixels, pas en fraction) et l'appui long.
 */
export function makeEscapePilot(plan, tuning = {}) {
  const T = { guardRisk: 0.35, penalty: 22, rest: 30, calm: 6, touching: 1.9, ...tuning };
  const W = plan.width;
  const H = plan.height;
  const cells = plan.cells;

  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? '#' : cells[y * W + x]);
  const solid = (x, y) => at(Math.floor(x), Math.floor(y)) === '#';

  /** Même échantillonnage que le moteur : un mur suffit à couper le regard. */
  const los = (ax, ay, bx, by) => {
    const dx = bx - ax;
    const dy = by - ay;
    const steps = Math.ceil(Math.hypot(dx, dy) * 3);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (solid(ax + dx * t, ay + dy * t)) return false;
    }
    return true;
  };

  const inCone = (facing, to, half) => {
    let d = Math.abs(to - facing) % (Math.PI * 2);
    if (d > Math.PI) d = Math.PI * 2 - d;
    return d <= half;
  };

  // Ce que l'on apprend en regardant bouger les choses, et qu'aucun affichage
  // ne donne : le sens de rotation du faisceau, la marche des gardiens. Un
  // joueur le lit en une seconde ; le pilote le mesure entre deux images.
  const spin = [];
  const drift = [];
  let previous = null;
  /** On souffle jusqu'à ce que la vigilance soit retombée, pas un instant. */
  let resting = false;

  return function tick(view, dt) {
    const seconds = Math.max(0.016, dt / 1000);
    const px = view.player.x;
    const py = view.player.y;

    /* --- Ce qui tourne, ce qui marche --- */
    const beams = view.beams.map((beam, i) => {
      let rate = spin[i] ?? 0;
      const before = previous?.beams[i];
      if (before !== undefined) {
        let delta = beam.angle - before;
        if (delta > Math.PI) delta -= Math.PI * 2;
        if (delta < -Math.PI) delta += Math.PI * 2;
        rate = rate * 0.6 + (delta / seconds) * 0.4;
      }
      spin[i] = rate;
      return { ...beam, rate };
    });

    const guards = view.guards.map((guard, i) => {
      let vx = drift[i]?.x ?? 0;
      let vy = drift[i]?.y ?? 0;
      const before = previous?.guards[i];
      if (before) {
        vx = vx * 0.6 + ((guard.x - before.x) / seconds) * 0.4;
        vy = vy * 0.6 + ((guard.y - before.y) / seconds) * 0.4;
      }
      drift[i] = { x: vx, y: vy };
      return { ...guard, vx, vy };
    });

    previous = {
      beams: beams.map((b) => b.angle),
      guards: guards.map((g) => ({ x: g.x, y: g.y })),
    };

    /* --- Ce qui est vu, maintenant et dans un instant --- */
    // Trois instants suffisent : le faisceau met plus d'une seconde à
    // traverser une case à cette distance, et regarder plus loin que deux
    // secondes fait renoncer à des passages qui seront libres à temps.
    const AHEAD = [0, 0.7, 1.4];

    // Deux dangers, deux certitudes différentes — et les confondre coûtait
    // la partie. Le cône du projecteur est **dessiné** : quand une case est
    // dedans, elle est vue, point. Un gardien ne montre que sa position ; son
    // regard couvre à peine un tiers du tour. Compter les deux pour un
    // faisait fuir un quart de la cour à cause d'une silhouette qui regardait
    // ailleurs — et poussait le fuyard droit sous le faisceau.
    const GUARD_RISK = T.guardRisk;
    const BEAM_RISK = 1;

    const watched = (cx, cy, ahead) => {
      const x = cx + 0.5;
      const y = cy + 0.5;
      let risk = 0;
      for (const beam of beams) {
        if (Math.hypot(x - beam.x, y - beam.y) > beam.range) continue;
        const angle = beam.angle + beam.rate * ahead;
        // Une marge : le cône dessiné est celui de l'instant, et l'on ne veut
        // pas raser son bord.
        if (!inCone(angle, Math.atan2(y - beam.y, x - beam.x), beam.half + 0.15)) continue;
        if (!los(beam.x, beam.y, x, y)) continue;
        risk = Math.max(risk, BEAM_RISK);
      }
      for (const guard of guards) {
        const gx = guard.x + guard.vx * ahead;
        const gy = guard.y + guard.vy * ahead;
        if (Math.hypot(x - gx, y - gy) > 7.4) continue;
        if (!los(gx, gy, x, y)) continue;
        risk = Math.max(risk, GUARD_RISK);
      }
      return risk;
    };

    // Marcher sur un gardien met fin à la partie sur-le-champ — pas de jauge,
    // pas de sursis, et même à couvert si l'on bouge encore. C'était la moitié
    // des défaites du pilote patient : rester longtemps dans la cour, c'est
    // croiser des rondes. Une case où un gardien sera dans une seconde est
    // donc **interdite**, indépendamment de ce qu'il regarde.
    const TOUCHING = T.touching;

    const crowded = (cx, cy) => {
      const x = cx + 0.5;
      const y = cy + 0.5;
      for (const guard of guards) {
        for (const ahead of [0, 0.5, 1]) {
          const gx = guard.x + guard.vx * ahead;
          const gy = guard.y + guard.vy * ahead;
          if (Math.hypot(x - gx, y - gy) < TOUCHING) return true;
        }
      }
      return false;
    };

    const exposure = new Float32Array(W * H);
    const crowd = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (at(x, y) === '#') continue;
        let seen = 0;
        for (const ahead of AHEAD) seen += watched(x, y, ahead);
        exposure[y * W + x] = seen / AHEAD.length;
        crowd[y * W + x] = crowded(x, y) ? 1 : 0;
      }
    }

    /* --- Le temps qu'il reste --- */
    const here = { x: Math.floor(px), y: Math.floor(py) };
    const goal = { x: Math.floor(view.breach.x), y: Math.floor(view.breach.y) };
    const crow = Math.abs(here.x - goal.x) + Math.abs(here.y - goal.y);
    // À 1,9 case par seconde, plus une marge pour les détours et les arrêts.
    const needed = crow * 530 * 1.9;
    const hurried = view.remaining < needed;
    const desperate = view.remaining < needed * 0.6;

    /* --- Le chemin le moins exposé --- */
    // Dijkstra depuis la brèche : une seule passe donne la distance de toutes
    // les cases, et le pas à faire se lit chez les quatre voisines.
    const PENALTY = desperate ? 2 : hurried ? T.penalty / 3 : T.penalty;
    const cost = (x, y) => {
      const cell = at(x, y);
      if (cell === '#') return Infinity;
      const shelter = cell === 'C' ? -0.25 : 0;
      const near = crowd[y * W + x] ? 90 : 0;
      return 1 + shelter + near + exposure[y * W + x] * PENALTY;
    };

    const dist = new Float64Array(W * H).fill(Infinity);
    const start = goal.y * W + goal.x;
    dist[start] = 0;

    // Un vrai tas binaire. La première version balayait la file à chaque
    // extraction : correct, et trois fois trop lent — or ce calcul se refait
    // à chaque image, dans la page, pendant que le jeu tourne. Un pilote qui
    // réfléchit trop lentement rate le passage du faisceau.
    const heap = [start];
    const key = [0];
    const push = (node, value) => {
      heap.push(node);
      key.push(value);
      let i = heap.length - 1;
      while (i > 0) {
        const parent = (i - 1) >> 1;
        if (key[parent] <= key[i]) break;
        [heap[parent], heap[i]] = [heap[i], heap[parent]];
        [key[parent], key[i]] = [key[i], key[parent]];
        i = parent;
      }
    };
    const pop = () => {
      const top = heap[0];
      const node = heap.pop();
      const value = key.pop();
      if (heap.length > 0) {
        heap[0] = node;
        key[0] = value;
        let i = 0;
        for (;;) {
          const left = i * 2 + 1;
          const right = left + 1;
          let small = i;
          if (left < heap.length && key[left] < key[small]) small = left;
          if (right < heap.length && key[right] < key[small]) small = right;
          if (small === i) break;
          [heap[small], heap[i]] = [heap[i], heap[small]];
          [key[small], key[i]] = [key[i], key[small]];
          i = small;
        }
      }
      return top;
    };

    while (heap.length > 0) {
      const at0 = key[0];
      const node = pop();
      if (at0 > dist[node] + 1e-9) continue;
      const nx = node % W;
      const ny = Math.floor(node / W);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ax = nx + dx;
        const ay = ny + dy;
        if (ax < 0 || ay < 0 || ax >= W || ay >= H) continue;
        const step = cost(ax, ay);
        if (!Number.isFinite(step)) continue;
        const total = dist[node] + step;
        if (total >= dist[ay * W + ax] - 1e-9) continue;
        dist[ay * W + ax] = total;
        push(ay * W + ax, total);
      }
    }

    /* --- Le pas suivant --- */
    let next = null;
    let best = dist[here.y * W + here.x];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ax = here.x + dx;
      const ay = here.y + dy;
      if (ax < 0 || ay < 0 || ax >= W || ay >= H) continue;
      if (at(ax, ay) === '#') continue;
      const value = dist[ay * W + ax];
      if (value >= best) continue;
      best = value;
      next = { x: ax, y: ay };
    }

    const exposedHere = exposure[here.y * W + here.x] > 0.01;
    const exposedNext = next ? exposure[next.y * W + next.x] > 0.01 : false;

    /* --- Souffler --- */
    // La vigilance monte de trente points par seconde passée sous un regard,
    // et redescend de vingt-quatre par seconde passée **immobile sur un
    // abri**. C'est le seul échange favorable du jeu, et le pilote qui
    // l'ignorait perdait par accumulation : trois expositions d'une seconde
    // et demie, réparties sur toute la traversée, suffisent à finir à cent.
    if (view.alert > T.rest) resting = true;
    if (view.alert < T.calm || desperate) resting = false;
    // Souffler à côté d'une ronde n'est pas souffler : on bouge d'abord.
    const pressed = crowd[here.y * W + here.x] === 1;

    let refuge = null;
    if (resting && !pressed) {
      // L'abri sûr le plus proche, cherché en largeur depuis la position.
      // Un rayon court suffit : au-delà, y aller coûte plus que ce que
      // souffler rapporte.
      const seen = new Set([here.y * W + here.x]);
      const queue2 = [{ x: here.x, y: here.y, d: 0 }];
      while (queue2.length > 0) {
        const node = queue2.shift();
        if (at(node.x, node.y) === 'C'
          && exposure[node.y * W + node.x] <= 0.01
          && crowd[node.y * W + node.x] === 0) {
          refuge = { x: node.x, y: node.y };
          break;
        }
        if (node.d >= 5) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ax = node.x + dx;
          const ay = node.y + dy;
          if (ax < 0 || ay < 0 || ax >= W || ay >= H) continue;
          if (at(ax, ay) === '#') continue;
          const key = ay * W + ax;
          if (seen.has(key)) continue;
          seen.add(key);
          queue2.push({ x: ax, y: ay, d: node.d + 1 });
        }
      }
      // Pas d'abri à portée : rester sur place vaut mieux qu'avancer sous un
      // regard, la vigilance descend quand même, trois fois plus lentement.
      if (!refuge && !exposedHere && !pressed) refuge = here;
    }

    // La règle qui fait tout : **on ne s'engage pas sur une case éclairée
    // depuis une case sûre**. On tient la position, la vigilance redescend, le
    // faisceau passe. C'est l'inverse d'un robot qui fonce, et c'est ce que
    // le mini-jeu demande depuis le début.
    const wait = next !== null && exposedNext && !exposedHere && !desperate && !pressed;

    // Courir va une fois et demie plus vite et coûte deux fois et demie plus
    // cher sous un regard : l'échange est perdant partout sauf quand l'appel
    // approche. On marche, donc.
    const hold = desperate;

    const aim = refuge ?? (wait || next === null ? here : next);
    // Assez près pour que le jeu considère l'arrivée, jamais assez loin pour
    // sortir de la case visée.
    return { x: aim.x + 0.5, y: aim.y + 0.5, hold };
  };
}

/** Ce que le pilote doit recevoir, extrait d'un état de mini-jeu. */
export function escapeView(s) {
  return {
    player: { x: s.player.x, y: s.player.y },
    breach: { x: s.breach.x, y: s.breach.y },
    guards: s.guards.map((g) => ({ x: g.mover.x, y: g.mover.y })),
    beams: s.beams.map((b) => ({
      x: b.x, y: b.y, angle: b.angle, half: b.half, range: b.range,
    })),
    alert: s.alert,
    spotted: s.spotted,
    hidden: s.hidden,
    remaining: s.limit - s.elapsed,
  };
}
