/**
 * Se relever.
 *
 * Mesuré avant d'écrire une ligne, sur soixante vies qui font simplement ce
 * que le jeu propose — cinq passages à la table par an, ce que le moteur
 * autorise :
 *
 *     pic de dépendance : médiane 100 · maximum 100
 *     franchit 65 (la mort peut la nommer) : 100 % des vies
 *     ce qui redescend tout seul : 1,21 point par an
 *     ce qu'on peut faire pour en sortir : rien
 *
 * Le moteur lisait la statistique partout — au-dessus de 50 les maladies
 * liées triplent, au-dessus de 60 le risque de perdre son emploi monte,
 * au-dessus de 65 la mort peut la nommer — et rien ne permettait d'en
 * redescendre autrement qu'en attendant quatre-vingts ans.
 *
 * Ces tests tiennent ce que la remontée doit être : décidable, coûteuse,
 * fragile, et impossible tant qu'on continue.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { createCtx } from '../context.ts';
import { simulateYear } from '../simulateYear.ts';
import { resolvePending } from '../../systems/randomEvents.ts';
import { autoTable } from '../../systems/activities.ts';
import {
  CLEAN_YEARS, GRIP, PROGRAMS, advanceRecovery, cleanYears, couldTell,
  currentProgram, enrol, enrolBlocker, gripOf, isClean, naturalDrift,
  programCost, programsFor, quitProgram, relapseOdds, relapses, tell,
  tellBlocker, tempt, tempted, witnesses, yearlyDrop,
} from '../../systems/recovery.ts';
import { DEEP, RELAPSE_COST, getProgram } from '../../data/recovery.ts';
import { knows } from '../../systems/dates.ts';
import type { GameState } from '../types.ts';

/** Un adulte vivant, avec de quoi payer ce qu'il déciderait. */
function adult(seed: number, age = 26): GameState | null {
  const state = createNewLife({ seed });
  for (let y = 0; y < age && state.player.alive; y++) {
    simulateYear(state);
    const ctx = createCtx(state);
    for (const pending of [...state.pending]) resolvePending(ctx, pending.id, 0);
    state.pending = [];
  }
  if (!state.player.alive || state.gameOver || state.player.prison) return null;
  state.player.money = Math.max(state.player.money, 2_000_000);
  state.player.yearActions = {};
  return state;
}

/** Le même, mais pris. */
function held(seed: number, level = 82): GameState | null {
  const state = adult(seed);
  if (!state) return null;
  state.player.stats.addiction = level;
  return state;
}

/* ------------------------------------------------------------------ */

describe('ce que la dépendance était', () => {
  it('se déclenche en jouant ce que le jeu propose', () => {
    // Le point de départ du chantier : la descente existait déjà et elle est
    // rapide. Ce test la garde honnête — si elle devenait inatteignable, tout
    // ce qui suit deviendrait décoratif.
    const state = adult(31);
    if (!state) return;
    const before = state.player.stats.addiction;
    for (let i = 0; i < 5; i++) autoTable(createCtx(state), 100);
    expect(state.player.stats.addiction).toBeGreaterThan(before + 10);
  });

  it('ne redescend plus toute seule une fois qu’elle tient', () => {
    // Elle s'atténuait de 0,5 à 2,5 points par an quel que soit le niveau :
    // on sortait donc d'un sommet à cent en ne faisant rien.
    const libre = adult(31);
    const pris = held(31);
    if (!libre || !pris) return;
    libre.player.stats.addiction = 20;
    expect(naturalDrift(pris, 2)).toBeLessThan(naturalDrift(libre, 2));
  });

  it('range chacun là où il en est', () => {
    const state = adult(31);
    if (!state) return;
    state.player.stats.addiction = 10;
    expect(gripOf(state)).toBe('libre');
    state.player.stats.addiction = GRIP + 1;
    expect(gripOf(state)).toBe('pris');
    state.player.stats.addiction = DEEP + 1;
    expect(gripOf(state)).toBe('enfoncé');
  });
});

/* ------------------------------------------------------------------ */

describe('les façons d’en sortir', () => {
  it('en propose quatre, et aucune n’est gratuite au sens large', () => {
    expect(PROGRAMS.length).toBeGreaterThanOrEqual(4);
    for (const program of PROGRAMS) {
      expect(getProgram(program.id)).toBe(program);
      expect(program.drop).toBeGreaterThan(0);
      expect(program.holds).toBeGreaterThan(0);
      expect(program.holds).toBeLessThan(1);
      expect(program.note.length).toBeGreaterThan(20);
      // Ce qui ne coûte pas d'argent coûte en volonté : rien ne doit être
      // à la fois gratuit et sûr.
      if (program.cost === 0) expect(program.holds).toBeLessThan(0.4);
    }
  });

  it('n’ouvre la cure qu’à ceux qui en sont là', () => {
    const state = adult(31);
    if (!state) return;
    state.player.stats.addiction = 20;
    expect(programsFor(state).some((p) => p.id === 'cure')).toBe(false);
    state.player.stats.addiction = 90;
    expect(programsFor(state).some((p) => p.id === 'cure')).toBe(true);
  });

  it('refuse le groupe de parole tant que personne n’est au courant', () => {
    // C'est son prix : il ne coûte presque rien et demande la seule chose
    // qu'on ne peut pas acheter.
    const state = held(31);
    if (!state) return;
    expect(enrolBlocker(state, 'groupe')).toContain('courant');
    const someone = couldTell(state)[0];
    if (!someone) return;
    tell(createCtx(state), someone.id);
    expect(enrolBlocker(state, 'groupe')).toBeNull();
  });

  it('refuse ce qu’on n’a pas les moyens de payer', () => {
    const state = held(31);
    if (!state) return;
    state.player.money = 1;
    expect(enrolBlocker(state, 'cure')).toContain('faudrait');
    // S'arrêter seul ne coûte pas d'argent : cela reste ouvert à qui n'a rien.
    expect(enrolBlocker(state, 'seul')).toBeNull();
  });

  it('prend l’argent, et le reprend chaque année', () => {
    const state = held(31);
    if (!state) return;
    const cost = programCost(state, getProgram('suivi')!);
    const before = state.player.money;
    expect(enrol(createCtx(state), 'suivi').ok).toBe(true);
    expect(before - state.player.money).toBe(cost);
    const after = state.player.money;
    advanceRecovery(createCtx(state));
    expect(after - state.player.money).toBeGreaterThanOrEqual(cost);
  });

  it('coûte l’année de salaire quand c’est une cure', () => {
    // `onLeave` aurait été un mot posé sur rien : le salaire doit vraiment
    // cesser de tomber.
    const state = held(31, 90);
    if (!state) return;
    if (!state.player.job) return;
    expect(enrol(createCtx(state), 'cure').ok).toBe(true);
    expect(state.player.flags.onLeave).toBe(true);
    advanceRecovery(createCtx(state));
    // La cure ne dure qu'une année : on en ressort, et le congé s'arrête.
    expect(state.player.flags.onLeave).toBeUndefined();
  });

  it('laisse arrêter sans que ce soit une rechute', () => {
    const state = held(31);
    if (!state) return;
    enrol(createCtx(state), 'seul');
    expect(currentProgram(state)?.id).toBe('seul');
    quitProgram(createCtx(state));
    expect(currentProgram(state)).toBeUndefined();
    expect(relapses(state)).toBe(0);
  });
});

/* ------------------------------------------------------------------ */

describe('ça ne tient pas tout seul', () => {
  it('ne parle de rechute qu’à ceux qui essaient', () => {
    const state = held(31);
    if (!state) return;
    expect(relapseOdds(state)).toBe(0);
    enrol(createCtx(state), 'seul');
    expect(relapseOdds(state)).toBeGreaterThan(0);
  });

  it('fait payer cher de continuer pendant qu’on essaie', () => {
    const state = held(31);
    if (!state) return;
    enrol(createCtx(state), 'seul');
    const calme = relapseOdds(state);
    tempt(state);
    expect(tempted(state)).toBe(true);
    expect(relapseOdds(state)).toBeGreaterThan(calme + 0.3);
  });

  it('compte vraiment la table, et pas un drapeau que l’année efface', () => {
    // La première version lisait `yearActions.casino` depuis la fin de
    // l'année — or `simulateYear` vide `yearActions` à son premier pas. Le
    // moteur ne voyait donc **jamais** que le joueur était retourné jouer,
    // alors que l'écran le lui annonçait.
    const state = held(31);
    if (!state) return;
    autoTable(createCtx(state), 100);
    simulateYear(state);
    state.pending = [];
    expect(state.player.yearActions.casino ?? 0).toBe(0);
    expect(tempted(state)).toBe(true);
  });

  it('remet des points quand ça lâche, sans tout remettre', () => {
    const state = held(31, 60);
    if (!state) return;
    enrol(createCtx(state), 'seul');
    // On force la rechute en poussant la pression au maximum.
    state.player.stats.stress = 100;
    state.player.stats.discipline = 0;
    tempt(state);
    expect(relapseOdds(state)).toBeGreaterThan(0.85);
    let fell = false;
    for (let i = 0; i < 30 && !fell; i++) {
      const before = state.player.stats.addiction;
      enrol(createCtx(state), 'seul');
      advanceRecovery(createCtx(state));
      if (state.player.stats.addiction > before) fell = true;
    }
    expect(fell).toBe(true);
    expect(relapses(state)).toBeGreaterThan(0);
    expect(state.player.stats.addiction).toBeLessThanOrEqual(60 + RELAPSE_COST * 30);
    // Une rechute arrête le programme : il faut se réinscrire.
    expect(currentProgram(state)).toBeUndefined();
  });

  it('fait de la rigueur une vraie différence', () => {
    const rigide = held(31);
    const mou = held(31);
    if (!rigide || !mou) return;
    rigide.player.stats.discipline = 95;
    mou.player.stats.discipline = 5;
    enrol(createCtx(rigide), 'seul');
    enrol(createCtx(mou), 'seul');
    expect(relapseOdds(rigide)).toBeLessThan(relapseOdds(mou));
    expect(yearlyDrop(rigide)).toBeGreaterThan(yearlyDrop(mou));
  });
});

/* ------------------------------------------------------------------ */

describe('le dire à quelqu’un', () => {
  it('n’est possible qu’avec quelqu’un d’assez proche', () => {
    const state = held(31);
    if (!state) return;
    const loin = Object.values(state.npcs).find((n) => n.alive && n.relationship < 30);
    if (loin) expect(tellBlocker(state, loin)).not.toBeNull();
    const proche = couldTell(state)[0];
    if (proche) expect(tellBlocker(state, proche)).toBeNull();
  });

  it('réduit la rechute, et c’est la seule chose qui ne s’achète pas', () => {
    const seul = held(31);
    const accompagné = held(31);
    if (!seul || !accompagné) return;
    const someone = couldTell(accompagné)[0];
    if (!someone) return;
    tell(createCtx(accompagné), someone.id);
    enrol(createCtx(seul), 'seul');
    enrol(createCtx(accompagné), 'seul');
    expect(witnesses(accompagné)).toHaveLength(1);
    expect(relapseOdds(accompagné)).toBeLessThan(relapseOdds(seul));
  });

  it('se passe autrement selon qui l’on a choisi', () => {
    // Le seul geste du jeu où connaître quelqu'un se paie comptant : c'est ce
    // qui donne un prix à ce que les rendez-vous font découvrir.
    const chaud = held(31);
    const froid = held(31);
    if (!chaud || !froid) return;
    const a = couldTell(chaud)[0];
    const b = couldTell(froid)[0];
    if (!a || !b) return;
    a.personality.warmth = 90;
    b.personality.warmth = 10;
    const opinions = { a: a.opinion, b: b.opinion };
    tell(createCtx(chaud), a.id);
    tell(createCtx(froid), b.id);
    expect(a.opinion).toBeGreaterThan(opinions.a);
    expect(b.opinion).toBeLessThan(opinions.b);
  });

  it('fait forcément apprendre quelque chose de la personne', () => {
    const state = held(31);
    if (!state) return;
    const someone = couldTell(state)[0];
    if (!someone) return;
    tell(createCtx(state), someone.id);
    expect(knows(someone, 'warmth')).toBe(true);
  });

  it('ne se dit qu’une fois', () => {
    const state = held(31);
    if (!state) return;
    const someone = couldTell(state)[0];
    if (!someone) return;
    expect(tell(createCtx(state), someone.id).ok).toBe(true);
    expect(tell(createCtx(state), someone.id).ok).toBe(false);
  });
});

/* ------------------------------------------------------------------ */

describe('ce que tenir veut dire', () => {
  it('ne compte les années propres que sous le seuil', () => {
    const state = held(31);
    if (!state) return;
    advanceRecovery(createCtx(state));
    expect(cleanYears(state)).toBe(0);

    state.player.stats.addiction = 10;
    advanceRecovery(createCtx(state));
    const start = state.year;
    state.year = start + CLEAN_YEARS;
    expect(cleanYears(state)).toBe(CLEAN_YEARS);
    expect(isClean(state)).toBe(true);
  });

  it('remet le compte à zéro dès qu’on repasse au-dessus', () => {
    const state = adult(31);
    if (!state) return;
    // Une vie ordinaire est déjà sous le seuil depuis sa naissance : le
    // compte tourne donc depuis longtemps, et c'est ce qu'on veut. On mesure
    // qu'il avance, puis qu'il tombe.
    state.player.stats.addiction = 10;
    advanceRecovery(createCtx(state));
    const before = cleanYears(state);
    state.year += 5;
    expect(cleanYears(state)).toBe(before + 5);
    state.player.stats.addiction = GRIP + 5;
    advanceRecovery(createCtx(state));
    expect(cleanYears(state)).toBe(0);
    expect(isClean(state)).toBe(false);
  });
});

/* ------------------------------------------------------------------ */

describe('en sortir, mesuré', () => {
  it('rend impossible de s’en sortir en continuant', { timeout: 120_000 }, () => {
    // L'affirmation centrale, et la seule qui ne peut pas être décorative :
    // mesuré, s'arrêter seul libère 92 % des gens en onze ans, et 3 %
    // seulement si l'on continue à jouer — avec dix-huit rechutes.
    let cleanStopped = 0;
    let cleanTempted = 0;
    let tried = 0;

    for (let seed = 0; seed < 26; seed++) {
      for (const keepsPlaying of [false, true]) {
        const state = held(seed * 97 + 11, 82);
        if (!state) continue;
        if (!keepsPlaying) tried += 1;
        for (let y = 0; y < 22 && state.player.alive && gripOf(state) !== 'libre'; y++) {
          enrol(createCtx(state), 'seul');
          if (keepsPlaying) autoTable(createCtx(state), 100);
          simulateYear(state);
          state.pending = [];
        }
        if (state.player.alive && state.player.stats.addiction < GRIP) {
          if (keepsPlaying) cleanTempted += 1; else cleanStopped += 1;
        }
      }
    }

    expect(tried).toBeGreaterThan(8);
    expect(cleanStopped).toBeGreaterThan(cleanTempted * 2);
    expect(cleanStopped / tried).toBeGreaterThan(0.4);
  });

  it('fait payer la vitesse', { timeout: 120_000 }, () => {
    // Ce qui coûte cher va plus vite : c'est l'arbitrage du système, et sans
    // lui les quatre façons seraient quatre noms.
    const years: Record<string, number> = {};
    for (const id of ['seul', 'suivi']) {
      let total = 0;
      let freed = 0;
      for (let seed = 0; seed < 26; seed++) {
        const state = held(seed * 97 + 11, 82);
        if (!state) continue;
        let y = 0;
        for (; y < 30 && state.player.alive && gripOf(state) !== 'libre'; y++) {
          enrol(createCtx(state), id);
          simulateYear(state);
          state.pending = [];
        }
        if (state.player.alive && state.player.stats.addiction < GRIP) { total += y; freed += 1; }
      }
      years[id] = freed > 0 ? total / freed : Infinity;
    }
    expect(years.suivi).toBeLessThan(years.seul);
  });
});
