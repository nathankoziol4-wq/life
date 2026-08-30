/**
 * Vérifications des objets de famille.
 *
 * Le jeu savait laisser de l'argent, et l'argent se dépense : à la génération
 * suivante il n'en restait qu'un chiffre de départ. Ce qui suit vérifie qu'un
 * objet, lui, traverse — et que le garder est un choix qui coûte.
 *
 * Six exigences :
 *
 * 1. **l'âge vaut plus que la matière** — un objet ordinaire gardé longtemps
 *    doit dépasser un bel objet acheté hier ;
 * 2. **le garder coûte** — l'état se dégrade tout seul, et restaurer se paie
 *    en argent comme en authenticité ;
 * 3. **il passe aux générations**, en gardant son identité et son histoire ;
 * 4. **le vendre coûte autre chose que de l'argent** ;
 * 5. **le grenier n'est pas inépuisable** ;
 * 6. **la recherche est jouée** — bien chercher donne mieux, pas seulement
 *    plus souvent.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import { Rng } from '../rng.ts';
import type { GameState } from '../types.ts';
import { resolvePending } from '../../systems/randomEvents.ts';
import { playHeadless } from '../minigame.ts';
import {
  HEIRLOOM_KINDS, RESTORE_GAIN, ageFactor, authenticityFactor,
  conditionFactor, conditionLabel, getHeirloomKind,
} from '../../data/heirlooms.ts';
import { attic, type AtticState } from '../../systems/minigames/attic.ts';
import {
  adopt, advanceHeirlooms, ageLabel, ageOf, autoSearch, eldest, give,
  heirloomWorth, heirloomsOf, restore, restoreBlocker, restoreCost,
  searchBlocker, searchContext, sell, settleSearch, valueOf,
} from '../../systems/heirlooms.ts';
import { continueAs, heirsOf } from '../../systems/lineage.ts';

function playTo(state: GameState, years: number): GameState {
  for (let i = 0; i < years && !state.gameOver; i++) {
    simulateYear(state);
    const ctx = createCtx(state);
    for (const pending of state.pending.slice()) resolvePending(ctx, pending.id, 0);
    state.pending = [];
  }
  return state;
}

/** Un adulte vivant, avec de quoi payer. */
function adult(seed: number, age = 30): GameState | null {
  const state = createNewLife({ seed });
  playTo(state, age);
  if (state.gameOver || !state.player.alive || state.player.prison) return null;
  state.player.money = Math.max(state.player.money, 2_000_000);
  state.player.yearActions = {};
  return state;
}

/** Quelqu'un avec un objet de famille du type demandé. */
function owner(seed: number, kindId = 'montre', condition = 70): GameState | null {
  const state = adult(seed);
  if (!state) return null;
  adopt(createCtx(state), getHeirloomKind(kindId)!, 'trouvé dans un grenier', condition);
  return state;
}

const rng = (seed: number) => new Rng({ rngState: seed >>> 0 });

const ctx = (skill: number, difficulty: number) => ({
  skill,
  difficulty,
  mode: 'normal' as const,
  grace: {
    time: 1 + (skill / 100) * 0.3,
    pressure: 1 - (skill / 100) * 0.25,
    tolerance: skill * 0.4,
    insight: skill > 62,
  },
});

/* ------------------------------------------------------------------ */

describe('les données tiennent debout', () => {
  it('donne à chaque objet une histoire, une usure et une rareté', () => {
    expect(HEIRLOOM_KINDS.length).toBeGreaterThanOrEqual(12);
    const ids = new Set<string>();
    for (const kind of HEIRLOOM_KINDS) {
      expect(kind.label).toBeTruthy();
      expect(kind.story).toBeTruthy();
      expect(kind.worth).toBeGreaterThan(0);
      expect(kind.wear).toBeGreaterThan(0);
      expect(kind.rarity).toBeGreaterThanOrEqual(1);
      expect(kind.rarity).toBeLessThanOrEqual(5);
      expect(ids.has(kind.id)).toBe(false);
      ids.add(kind.id);
    }
    // L'usure doit vraiment séparer les objets : sans écart, le choix de ce
    // qu'on garde n'existerait pas.
    const wears = HEIRLOOM_KINDS.map((k) => k.wear);
    expect(Math.max(...wears) / Math.min(...wears)).toBeGreaterThan(3);
    // Et il faut des objets à tous les niveaux de rareté.
    expect(new Set(HEIRLOOM_KINDS.map((k) => k.rarity)).size).toBeGreaterThanOrEqual(4);
  });

  it('fait monter la valeur avec l’âge, et pas avant', () => {
    expect(ageFactor(0)).toBe(1);
    expect(ageFactor(19)).toBe(1);
    expect(ageFactor(120)).toBeGreaterThan(ageFactor(60));
    expect(ageFactor(300)).toBeGreaterThan(ageFactor(120));
    // Et l'état écrase tout : un objet ruiné ne vaut presque rien.
    expect(conditionFactor(5)).toBeLessThan(conditionFactor(95) * 0.15);
    // Les reprises coûtent, sans jamais tout retirer.
    expect(authenticityFactor(0)).toBe(1);
    expect(authenticityFactor(5)).toBeLessThan(1);
    expect(authenticityFactor(20)).toBeGreaterThan(0.4);
  });

  it('donne à chaque état et à chaque âge une formule', () => {
    expect(conditionLabel(0)).toBeTruthy();
    expect(conditionLabel(100)).not.toBe(conditionLabel(0));
    expect(ageLabel(5)).not.toBe(ageLabel(250));
    expect(ageLabel(250)).toContain('trois');
  });
});

describe('ce que vaut un objet', () => {
  it('fait qu’un objet ordinaire gardé longtemps dépasse un bel objet neuf', () => {
    const state = adult(11);
    if (!state) return;
    // Un carnet — l'objet le moins cher du catalogue — gardé deux siècles.
    const old = adopt(createCtx(state), getHeirloomKind('carnet')!, 'trouvé', 70);
    old.since = state.year - 250;
    // Un tableau, l'un des plus chers, acheté cette année.
    const fresh = adopt(createCtx(state), getHeirloomKind('tableau')!, 'acheté', 95);
    expect(valueOf(state, old)).toBeGreaterThan(valueOf(state, fresh));
  });

  it('effondre la valeur d’un objet ruiné, quel que soit son âge', () => {
    const state = adult(13);
    if (!state) return;
    const good = adopt(createCtx(state), getHeirloomKind('violon')!, 'trouvé', 90);
    const ruined = adopt(createCtx(state), getHeirloomKind('violon')!, 'trouvé', 8);
    good.since = state.year - 150;
    ruined.since = state.year - 150;
    expect(valueOf(state, ruined)).toBeLessThan(valueOf(state, good) * 0.2);
  });

  it('additionne le patrimoine familial', () => {
    const state = owner(15);
    if (!state) return;
    const one = heirloomWorth(state);
    adopt(createCtx(state), getHeirloomKind('violon')!, 'trouvé', 80);
    expect(heirloomWorth(state)).toBeGreaterThan(one);
    expect(heirloomsOf(state)).toHaveLength(2);
    expect(eldest(state)).not.toBeNull();
  });
});

describe('tenir un objet', () => {
  it('le laisse se dégrader tout seul, à sa vitesse', () => {
    const state = adult(21);
    if (!state) return;
    // Un manteau s'en va vite ; une alliance presque pas.
    const cloth = adopt(createCtx(state), getHeirloomKind('manteau')!, 'trouvé', 80);
    const metal = adopt(createCtx(state), getHeirloomKind('alliance')!, 'trouvé', 80);
    for (let i = 0; i < 20; i++) advanceHeirlooms(createCtx(state));
    expect(cloth.condition).toBeLessThan(80);
    expect(metal.condition).toBeLessThan(80);
    expect(cloth.condition).toBeLessThan(metal.condition - 15);
  });

  it('fait de la restauration un vrai échange', () => {
    const state = owner(23, 'violon', 40);
    if (!state) return;
    const item = state.player.heirlooms[0];
    const before = item.condition;
    const money = state.player.money;
    expect(restore(createCtx(state), item.id).ok).toBe(true);
    expect(item.condition).toBeGreaterThan(before + RESTORE_GAIN - 12);
    expect(state.player.money).toBeLessThan(money);
    expect(item.restorations).toBe(1);
    // Une fois par an.
    expect(restoreBlocker(state, item)).toContain('déjà');
    // Et la reprise suivante coûte plus cher.
    state.player.yearActions = {};
    const second = restoreCost(state, item);
    expect(second).toBeGreaterThan(0);
  });

  it('fait payer les reprises en authenticité', () => {
    const state = adult(25);
    if (!state) return;
    const kept = adopt(createCtx(state), getHeirloomKind('horloge')!, 'trouvé', 95);
    const redone = adopt(createCtx(state), getHeirloomKind('horloge')!, 'trouvé', 95);
    kept.since = state.year - 120;
    redone.since = state.year - 120;
    redone.restorations = 5;
    // Même âge, même état : celui qu'on a trop repris vaut moins.
    expect(valueOf(state, redone)).toBeLessThan(valueOf(state, kept));
  });

  it('refuse de reprendre ce qui n’a rien à reprendre', () => {
    const state = owner(27, 'montre', 96);
    if (!state) return;
    expect(restoreBlocker(state, state.player.heirlooms[0])).toContain('rien');
  });

  it('fait du fait de vendre autre chose qu’une recette', () => {
    const recent = owner(29, 'montre', 70);
    const ancient = owner(29, 'montre', 70);
    if (!recent || !ancient) return;
    ancient.player.heirlooms[0].since = ancient.year - 140;
    // On part des deux vies au même niveau, et assez haut : la statistique
    // est bornée à zéro, si bien qu'un personnage déjà malheureux perd la
    // même chose dans les deux cas et l'on mesurerait le plancher plutôt que
    // le prix de la vente.
    recent.player.stats.happiness = 80;
    ancient.player.stats.happiness = 80;
    const happyBefore = { r: recent.player.stats.happiness, a: ancient.player.stats.happiness };
    sell(createCtx(recent), recent.player.heirlooms[0].id);
    sell(createCtx(ancient), ancient.player.heirlooms[0].id);
    // Les deux rapportent, et celui qu'on a tenu longtemps coûte davantage.
    expect(recent.player.heirlooms).toHaveLength(0);
    const lostRecent = happyBefore.r - recent.player.stats.happiness;
    const lostAncient = happyBefore.a - ancient.player.stats.happiness;
    expect(lostAncient).toBeGreaterThan(lostRecent);
  });

  it('le fait sortir de la famille quand on le donne', () => {
    const state = owner(31);
    if (!state) return;
    const target = Object.values(state.npcs).find((x) => x.alive);
    if (!target) return;
    const before = target.relationship;
    state.player.heirlooms[0].since = state.year - 100;
    expect(give(createCtx(state), state.player.heirlooms[0].id, target.id).ok).toBe(true);
    expect(state.player.heirlooms).toHaveLength(0);
    // Ce que ça vaut pour l'autre tient à l'âge autant qu'au prix.
    expect(target.relationship).toBeGreaterThan(before + 10);
  });
});

describe('la traversée des générations', () => {
  it('passe les objets à l’héritier, avec leur histoire', () => {
    for (let seed = 40; seed < 90; seed++) {
      const state = adult(seed, 40);
      if (!state) continue;
      const item = adopt(createCtx(state), getHeirloomKind('horloge')!, 'trouvé', 80);
      item.since = state.year - 90;
      const lines = item.history.length;

      playTo(state, 70);
      if (!state.gameOver || state.player.alive) continue;
      const heirs = heirsOf(state);
      if (heirs.length === 0) continue;

      const before = state.player.heirlooms.length;
      continueAs(state, heirs[0].person.id);
      // C'est la seule chose du jeu qui traverse en gardant son identité.
      expect(state.player.heirlooms).toHaveLength(before);
      const passed = state.player.heirlooms.find((h) => h.kindId === 'horloge');
      expect(passed).toBeDefined();
      expect(passed!.since).toBe(item.since);
      expect(passed!.founder).toBe(item.founder);
      // Une génération de plus, et une ligne de plus.
      expect(passed!.generations).toBe(item.generations + 1);
      expect(passed!.history.length).toBeGreaterThan(lines);
      return;
    }
  });

  it('fait qu’un objet peut dépasser un siècle', () => {
    const state = adult(91);
    if (!state) return;
    const item = adopt(createCtx(state), getHeirloomKind('alliance')!, 'trouvé', 90);
    item.since = state.year - 240;
    expect(ageOf(state, item)).toBeGreaterThan(200);
    expect(ageLabel(ageOf(state, item))).toContain('siècles');
    // Et son âge se voit dans sa valeur.
    const fresh = adopt(createCtx(state), getHeirloomKind('alliance')!, 'trouvé', 90);
    expect(valueOf(state, item)).toBeGreaterThan(valueOf(state, fresh) * 2);
  });
});

describe('le grenier', () => {
  it('ne s’ouvre pas tous les ans', () => {
    const state = adult(101, 14);
    if (!state) return;
    // Enfant, on peut monter : c'est la maison de famille.
    expect(searchBlocker(state)).toBeNull();
    autoSearch(createCtx(state));
    expect(searchBlocker(state)).toContain('déjà');
    // Et adulte sans bien ancien, il n'y a plus rien à retourner.
    state.player.yearActions = {};
    state.player.age = 40;
    expect(searchBlocker(state)).not.toBeNull();
  });

  it('devient plus difficile à mesure qu’on l’a vidé', () => {
    const state = adult(103, 14);
    if (!state) return;
    const first = searchContext(state).difficulty;
    for (let i = 0; i < 3; i++) {
      adopt(createCtx(state), HEIRLOOM_KINDS[i], 'trouvé', 70);
    }
    expect(searchContext(state).difficulty).toBeGreaterThan(first);
  });

  it('rend quelque chose quand on trouve, et rien sinon', () => {
    const found = adult(105, 14);
    const empty = adult(107, 14);
    if (!found || !empty) return;
    settleSearch(createCtx(found), {
      success: true, score: 900, quality: 0.9, mistakes: 0, time: 9000,
    });
    settleSearch(createCtx(empty), {
      success: false, score: 0, quality: 0.05, mistakes: 3, time: 9000,
    });
    expect(found.player.heirlooms).toHaveLength(1);
    expect(found.player.heirlooms[0].history).toHaveLength(1);
    expect(empty.player.heirlooms).toHaveLength(0);
  });

  it('donne mieux à qui cherche mieux', () => {
    let good = 0;
    let poor = 0;
    let pairs = 0;
    for (let seed = 110; seed < 160; seed++) {
      const a = adult(seed, 14);
      const b = adult(seed, 14);
      if (!a || !b) continue;
      pairs += 1;
      settleSearch(createCtx(a), {
        success: true, score: 900, quality: 1, mistakes: 0, time: 9000,
      });
      settleSearch(createCtx(b), {
        success: true, score: 200, quality: 0.15, mistakes: 2, time: 9000,
      });
      good += getHeirloomKind(a.player.heirlooms[0]?.kindId ?? '')?.rarity ?? 0;
      poor += getHeirloomKind(b.player.heirlooms[0]?.kindId ?? '')?.rarity ?? 0;
    }
    if (pairs < 15) return;
    // Bien chercher ne donne pas seulement quelque chose : ça donne mieux.
    expect(good / pairs).toBeGreaterThan(poor / pairs);
  });

  it('survit à une année complète et à la sauvegarde', () => {
    const state = owner(161, 'boite', 70);
    if (!state) return;
    simulateYear(state);
    if (!state.player.alive) return;
    const copy = JSON.parse(JSON.stringify(state)) as GameState;
    expect(copy.player.heirlooms).toHaveLength(1);
    expect(valueOf(copy, copy.player.heirlooms[0])).toBeGreaterThan(0);
    advanceHeirlooms(createCtx(copy));
    expect(copy.player.heirlooms).toHaveLength(1);
  });

  it('ne coûte rien à qui n’a rien', () => {
    const state = adult(163);
    if (!state) return;
    expect(heirloomsOf(state)).toEqual([]);
    expect(heirloomWorth(state)).toBe(0);
    expect(eldest(state)).toBeNull();
    const before = state.player.money;
    advanceHeirlooms(createCtx(state));
    expect(state.player.money).toBe(before);
  });
});

describe('chercher dans le noir', () => {
  /**
   * Quelqu'un de méthodique.
   *
   * Il balaie en spirale, garde le halo étroit pour économiser la pile, et ne
   * fouille que lorsque la lampe est vraiment vive.
   */
  const careful = (s: AtticState, elapsed: number) => {
    const t = elapsed / 1400;
    const spread = Math.min(0.42, 0.05 + t * 0.035);
    return {
      x: 0.5 + Math.cos(t) * spread,
      y: 0.5 + Math.sin(t * 1.3) * spread,
      hold: false,
      tap: s.warmth > 0.88,
    };
  };

  it('récompense celui qui cherche', () => {
    let skilled = 0;
    let blind = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const context = ctx(60, 40);
      skilled += playHeadless(attic, rng(seed), context, careful).result.quality;
      // Quelqu'un qui fouille au hasard dès la première seconde.
      blind += playHeadless(attic, rng(seed), context, () => ({
        x: 0.5, y: 0.5, tap: true,
      })).result.quality;
    }
    expect(skilled / 40).toBeGreaterThan(blind / 40 + 0.1);
  });

  it('punit celui qui creuse au premier frémissement', () => {
    // Les leurres répondent à la chaleur comme le bon objet : creuser dès que
    // la lampe s'avive coûte des fouilles pour rien.
    let wasted = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const out = playHeadless(attic, rng(seed), ctx(50, 80), (s: AtticState, e: number) => ({
        ...careful(s, e), tap: s.warmth > 0.3,
      }));
      wasted += out.state.misses;
    }
    expect(wasted / 30).toBeGreaterThan(0.8);
  });

  it('fait de la pile une vraie contrainte', () => {
    // Garder le halo grand ouvert vide la lampe.
    const out = playHeadless(attic, rng(9), ctx(40, 50), () => ({
      x: 0.5, y: 0.5, hold: true,
    }));
    expect(out.state.battery).toBeLessThan(45);
  });

  it('laisse le personnage donner du temps et un essai, pas des yeux', () => {
    const novice = attic.setup(rng(5), ctx(10, 50));
    const expert = attic.setup(rng(5), ctx(90, 50));
    expect(expert.limit).toBeGreaterThan(novice.limit);
    expect(expert.digs).toBeGreaterThan(novice.digs);
    // Le halo part de la même taille pour tout le monde : le personnage ne
    // cherche pas à la place du joueur.
    expect(expert.radius).toBe(novice.radius);
  });

  it('rejoue à l’identique à graine égale', () => {
    const a = playHeadless(attic, rng(77), ctx(50, 50), careful);
    const b = playHeadless(attic, rng(77), ctx(50, 50), careful);
    expect(a.result).toEqual(b.result);
  });
});
