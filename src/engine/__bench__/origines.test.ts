/**
 * D'où l'on vient, et ce que chercher coûte.
 *
 * **Deux défauts sont à l'origine de ce fichier, et le second est le pire.**
 *
 * Le premier : `FamilyStructure` compte sept valeurs, et sur quatre cents
 * naissances aléatoires, **trois seulement arrivaient** — deux parents 75 %,
 * parent seul 19 %, famille recomposée 6 %. Adoption, famille d'accueil,
 * grands-parents et parents séparés existaient dans le type, dans le
 * générateur de foyer, dans la table d'ambiance et sur l'écran de création, et
 * ne tombaient jamais.
 *
 * Le second : même en les choisissant à la main, « adoption » et « famille
 * d'accueil » ne faisaient rien. Elles renommaient les parents, ajoutaient une
 * pénalité d'ambiance, et c'est tout. Le personnage n'apprenait jamais qu'il
 * avait été adopté, aucun parent biologique n'existait, il n'y avait rien à
 * chercher. Une étiquette sur du vide coûte plus cher qu'une absence : la
 * seconde se voit, la première se croit.
 *
 * Six exigences vérifiées ici :
 *
 * 1. **les sept enfances arrivent** ;
 * 2. **on l'apprend**, et la manière compte ;
 * 3. **chercher se paie chez ceux qui vous ont élevé** — pour de bon, pas
 *    d'un point qui se rattrape en deux ans ;
 * 4. **payer achète le droit de renoncer**, pas un meilleur résultat ;
 * 5. **rien n'empêche d'arriver trop tard**, et attendre coûte ;
 * 6. **renoncer rapporte quelque chose**, sans quoi ce ne serait pas un choix.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState } from '../types.ts';
import { FAMILY_STRUCTURES } from '../origin.ts';
import { CLEAR, ENOUGH, LEADS } from '../../data/roots.ts';
import {
  availableLeads, canGo, closedOff, disposition, follow, goAndSee, leadBlocker,
  leadOdds, letGo, letGoYear, raisedBy, rootsOf, summary, whatYouKnow,
} from '../../systems/roots.ts';

/** La première vie de cette suite de graines qui se pose la question. */
function uprooted(from = 1): GameState {
  for (let seed = from; seed < from + 4000; seed++) {
    const state = createNewLife({ seed });
    if (rootsOf(state)) return state;
  }
  throw new Error('aucune vie adoptée ou placée dans quatre mille graines');
}

/** Fait tourner les années jusqu'à ce que le personnage sache. */
function untilKnown(state: GameState, max = 30): GameState {
  for (let i = 0; i < max && !state.gameOver; i++) {
    simulateYear(state);
    state.player.money = Math.max(state.player.money, 400_000);
    if (rootsOf(state)!.knownYear !== null) break;
  }
  return state;
}

describe('les sept enfances', () => {
  it('arrivent toutes, et pas seulement dans le type', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 600; seed++) {
      seen.add(createNewLife({ seed }).player.origin.structure);
    }
    // Mesuré avant : trois sur sept. Les quatre autres n'étaient accessibles
    // qu'à qui composait sa famille à la main sur l'écran de création.
    const missing = FAMILY_STRUCTURES.filter((s) => !seen.has(s));
    expect(missing, `structures jamais tirées : ${missing.join(', ')}`).toEqual([]);
  });

  it('ne noie pas les enfances ordinaires', () => {
    const counts: Record<string, number> = {};
    for (let seed = 1; seed <= 600; seed++) {
      const s = createNewLife({ seed }).player.origin.structure;
      counts[s] = (counts[s] ?? 0) + 1;
    }
    // Deux parents reste la norme, et les quatre nouvelles restent rares : on
    // ajoute de la variété, on ne refait pas la démographie du jeu.
    expect(counts['deux parents']! / 600).toBeGreaterThan(0.5);
    for (const rare of ['adoption', 'famille d’accueil']) {
      expect(counts[rare]! / 600).toBeGreaterThan(0.005);
      expect(counts[rare]! / 600).toBeLessThan(0.08);
    }
  });

  it('donne un tuteur à une famille d’accueil, et non des grands-parents', () => {
    for (let seed = 1; seed <= 4000; seed++) {
      const state = createNewLife({ seed });
      if (state.player.origin.structure !== 'famille d’accueil') continue;
      const kinds = state.player.origin.parents
        .map((r) => state.npcs[r.personId]?.relation);
      // Deux personnes qu'on ne connaît que depuis un an ne sont pas des
      // grands-parents, et l'écran des proches l'affichait ainsi.
      expect(kinds).not.toContain('grandmother');
      expect(kinds.every((k) => k === 'guardian')).toBe(true);
      return;
    }
    throw new Error('aucune famille d’accueil dans quatre mille graines');
  });
});

describe('l’apprendre', () => {
  it('ne le sait pas au berceau, et finit toujours par le savoir', () => {
    const state = uprooted();
    expect(rootsOf(state)!.knownYear).toBeNull();
    expect(summary(state)).toContain('Rien à en dire');

    untilKnown(state);
    expect(rootsOf(state)!.knownYear).not.toBeNull();
    expect(rootsOf(state)!.toldBy).not.toBeNull();
    // Une vie entière sans jamais l'apprendre priverait le joueur du système
    // sans qu'aucune décision n'ait été prise.
    expect(state.player.age).toBeLessThan(26);
  });

  it('coûte plus cher quand on l’apprend de travers', () => {
    /*
     * Ce n'est pas la nouvelle qui coûte, c'est de l'avoir cachée. On compare
     * donc deux façons de l'apprendre sur les mêmes vies, ce qui est la seule
     * mesure qui isole la manière.
     */
    let told = 0;
    let stumbled = 0;
    const bondTold: number[] = [];
    const bondStumbled: number[] = [];
    for (let seed = 1; seed <= 4000 && told + stumbled < 60; seed++) {
      const state = createNewLife({ seed });
      if (!rootsOf(state)) continue;
      untilKnown(state);
      const roots = rootsOf(state)!;
      if (roots.knownYear === null) continue;
      const parents = raisedBy(state);
      if (parents.length === 0) continue;
      const bond = parents.reduce((s, p) => s + p.relationship, 0) / parents.length;
      if (roots.toldBy === 'parents') { told += 1; bondTold.push(bond); } else { stumbled += 1; bondStumbled.push(bond); }
    }
    expect(told).toBeGreaterThan(5);
    expect(stumbled).toBeGreaterThan(5);
    const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
    expect(mean(bondTold)).toBeGreaterThan(mean(bondStumbled));
  });
});

describe('chercher', () => {
  it('se paie chez ceux qui t’ont élevé, et durablement', () => {
    /*
     * **La règle centrale du système, et celle qui était décorative.** Le coup
     * ponctuel d'une demande retirait neuf points de lien que la dérive
     * annuelle rendait en deux ans : mesuré, un enfant qui avait harcelé ses
     * parents pendant vingt ans finissait à 21 de lien contre 29 pour un
     * enfant qui n'avait jamais rien demandé. Huit points, noyés dans le
     * bruit. Une tension n'est pas un coup, c'est un état : tant qu'ils savent
     * qu'on cherche, le lien ne remonte pas.
     */
    const bondAt = (ids: string[]): number => {
      const out: number[] = [];
      let n = 0;
      for (let seed = 1; seed <= 4000 && n < 30; seed++) {
        const state = createNewLife({ seed });
        if (!rootsOf(state)) continue;
        n += 1;
        for (let i = 0; i < 30 && !state.gameOver; i++) {
          simulateYear(state);
          state.player.money = Math.max(state.player.money, 400_000);
          const roots = rootsOf(state)!;
          if (roots.knownYear !== null && roots.outcome === null && !canGo(state)) {
            const lead = LEADS.find((l) => ids.includes(l.id) && leadBlocker(state, l.id) === null);
            if (lead) follow(createCtx(state), lead.id);
          }
        }
        const parents = raisedBy(state);
        if (parents.length > 0) {
          out.push(parents.reduce((s, p) => s + p.relationship, 0) / parents.length);
        }
      }
      return out.sort((a, b) => a - b)[Math.floor(out.length / 2)] ?? 0;
    };

    const quiet = bondAt([]);
    const asking = bondAt(['demander']);
    // Mesuré après correction : 40 sans rien demander, 28 en demandant.
    expect(quiet - asking).toBeGreaterThan(6);
  });

  it('finit par les fermer si l’on insiste', () => {
    const state = untilKnown(uprooted());
    const roots = rootsOf(state)!;
    if (raisedBy(state).length === 0) return;
    for (let i = 0; i < 6; i++) {
      state.player.yearActions = {};
      state.player.age = Math.max(state.player.age, 12);
      follow(createCtx(state), 'demander');
    }
    expect(closedOff(state)).toBe(true);
    expect(leadBlocker(state, 'demander')).toContain('fermé');
    // Mais un tiroir reste un tiroir : on n'a pas besoin de leur accord pour
    // l'ouvrir. Sans cette sortie, la voie sans argent n'aboutissait qu'une
    // fois sur trente — un piège, pas un arbitrage.
    expect(leadBlocker(state, 'papiers')).toBeNull();
    expect(roots.strain).toBeGreaterThan(50);
  });

  it('n’épuise jamais une piste au point qu’elle ne rende plus rien', () => {
    /*
     * Mesuré avant : le coefficient de répétition composait sans plancher, et
     * un personnage qui n'avait qu'une avenue ouverte a cliqué la même ligne
     * **cinquante-cinq années de suite** pour atteindre 56 points sur cent,
     * puis est mort dessus. Une ligne qu'on peut appuyer et qui ne peut plus
     * rien rendre est un piège.
     */
    const state = untilKnown(uprooted());
    state.player.age = 22;
    for (let i = 0; i < 30; i++) rootsOf(state)!.tried.push('organisme');
    expect(leadOdds(state, 'organisme')).toBeGreaterThan(0.07);
  });

  it('annonce ses chances avant qu’on s’engage', () => {
    const state = untilKnown(uprooted());
    state.player.age = 25;
    for (const lead of availableLeads(state)) {
      const odds = leadOdds(state, lead.id);
      expect(odds, lead.id).toBeGreaterThan(0);
      expect(odds, lead.id).toBeLessThanOrEqual(0.95);
    }
  });
});

describe('ce que l’argent achète', () => {
  /** Mène une recherche jusqu'au bout avec une politique donnée. */
  function search(ids: string[], lives = 30) {
    let done = 0;
    let knewBefore = 0;
    let late = 0;
    const years: number[] = [];
    const sound: number[] = [];
    let n = 0;
    for (let seed = 1; seed <= 4000 && n < lives; seed++) {
      const state = createNewLife({ seed });
      if (!rootsOf(state)) continue;
      n += 1;
      let started = -1;
      for (let i = 0; i < 80 && !state.gameOver; i++) {
        simulateYear(state);
        state.player.money = Math.max(state.player.money, 400_000);
        const roots = rootsOf(state)!;
        if (roots.knownYear === null || roots.outcome !== null) continue;
        if (started < 0) started = state.player.age;
        if (canGo(state)) {
          if (whatYouKnow(state)) knewBefore += 1;
          sound.push(roots.soundness);
          goAndSee(createCtx(state));
          if (roots.outcome === 'tard') late += 1;
          years.push(state.player.age - started);
          done += 1;
          break;
        }
        // On tourne les pistes : la moins utilisée parmi celles qui sont
        // ouvertes, ce que ferait n'importe quel joueur attentif.
        const open = LEADS
          .filter((l) => ids.includes(l.id) && leadBlocker(state, l.id) === null)
          .sort((a, b) => roots.tried.filter((x) => x === a.id).length
            - roots.tried.filter((x) => x === b.id).length);
        if (open[0]) follow(createCtx(state), open[0].id);
      }
    }
    const med = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] ?? 0;
    return { done, n, knewBefore, late, years: med(years), sound: med(sound) };
  }

  it('achète le droit de renoncer, pas un meilleur résultat', () => {
    const paid = search(['registre', 'organisme', 'recherche']);
    const free = search(['demander', 'papiers']);

    // Les deux aboutissent : la voie sans argent est un arbitrage, pas un mur.
    expect(paid.done).toBeGreaterThan(paid.n * 0.7);
    expect(free.done).toBeGreaterThan(free.n * 0.7);

    /*
     * Mais elles n'achètent pas la même chose. Mesuré : en payant, solidité
     * 0,85 et l'on devine ce qui attend dans 100 % des cas ; en gratuit,
     * solidité 0,59 et l'on y va à l'aveugle presque toujours. Ce que l'argent
     * achète est le **droit de renoncer en connaissance de cause**, ce qui est
     * la seule décision irréversible du système.
     */
    expect(paid.sound).toBeGreaterThan(CLEAR);
    expect(free.sound).toBeLessThan(CLEAR);
    expect(paid.knewBefore / Math.max(1, paid.done)).toBeGreaterThan(0.8);
    expect(free.knewBefore / Math.max(1, free.done)).toBeLessThan(0.4);
  });

  it('ne protège jamais d’arriver trop tard', () => {
    /*
     * L'issue qu'aucune information n'évite : savoir qui elle est ne dit pas si
     * elle sera encore là.
     *
     * **Ce test disait plus que la mesure.** Il annonçait « deux à trois fois
     * plus souvent » pour la voie lente et comparait deux *comptes bruts* sur
     * trente vies — alors que les deux voies n'aboutissent pas au même nombre
     * de fois. Remesuré sur cent vingt vies par voie : 15 arrivées trop tard
     * sur 119 recherches menées à terme en payant, 15 sur 97 en gratuit, soit
     * 12,6 % contre 15,5 %. L'écart existe, il vient du délai — 19 ans contre
     * 21 — et il est bien plus mince que ce qui était écrit.
     *
     * On assure donc ce que le mécanisme garantit et non ce qu'on aurait aimé :
     * la voie gratuite est plus lente, et **payer n'achète pas d'y échapper**.
     */
    const paid = search(['registre', 'organisme', 'recherche']);
    const free = search(['demander', 'papiers']);
    expect(free.years).toBeGreaterThan(paid.years - 1);
    expect(paid.late).toBeGreaterThan(0);
  });
});

describe('ce qu’on trouve', () => {
  it('n’est bon qu’une fois sur trois, et c’est fixé à la naissance', () => {
    const bands = [0, 0, 0];
    for (let seed = 1; seed <= 3000; seed++) {
      const d = disposition({ seed } as unknown as GameState);
      bands[d >= 0.62 ? 0 : d >= 0.34 ? 1 : 2] += 1;
    }
    // Environ 39 / 28 / 33. Aucune issue n'est neutre et une seule est bonne :
    // c'est ce qui rend « laisser tomber » défendable plutôt qu'un contenu
    // manqué.
    for (const band of bands) expect(band / 3000).toBeGreaterThan(0.2);
    expect(bands[0]! / 3000).toBeLessThan(0.5);

    // Et c'est stable : regarder deux fois ne change rien, et relancer la
    // recherche non plus.
    const state = uprooted();
    expect(disposition(state)).toBe(disposition(state));
  });

  it('crée de vraies personnes, et pas des héritiers d’office', () => {
    let checked = 0;
    for (let seed = 1; seed <= 4000 && checked < 8; seed++) {
      const state = createNewLife({ seed });
      if (!rootsOf(state)) continue;
      untilKnown(state);
      const roots = rootsOf(state)!;
      if (roots.knownYear === null) continue;
      roots.trail = ENOUGH;
      state.player.age = Math.max(state.player.age, 20);
      goAndSee(createCtx(state));
      checked += 1;

      const born = Object.values(state.npcs).filter(
        (n) => n.relation === 'birthMother' || n.relation === 'birthFather',
      );
      if (roots.outcome === 'tard') {
        expect(born.length).toBe(0);
      } else {
        expect(born.length).toBe(1);
        // Retrouver quelqu'un n'en fait pas votre famille d'office : les
        // listes qui décident d'un héritage ne les contiennent pas, et c'est
        // exactement ce que le système raconte.
        const source = readFileSync(
          new URL('../../systems/inheritance.ts', import.meta.url).pathname, 'utf8',
        );
        expect(source).not.toContain('birthMother');
      }
      if (roots.outcome === 'refus' || roots.outcome === 'dur') {
        expect(born[0]!.estranged).toBe(true);
      }
    }
    expect(checked).toBeGreaterThan(4);
  });
});

describe('renoncer', () => {
  it('rapporte quelque chose, et ne se défait pas', () => {
    const state = untilKnown(uprooted());
    const roots = rootsOf(state)!;
    if (raisedBy(state).length === 0) return;
    // On abîme d'abord, pour voir ce que renoncer répare.
    for (let i = 0; i < 3; i++) {
      state.player.yearActions = {};
      state.player.age = Math.max(state.player.age, 12);
      follow(createCtx(state), 'demander');
    }
    const strained = roots.strain;
    const before = state.player.stats.happiness;
    const bond = raisedBy(state).reduce((s, p) => s + p.relationship, 0);

    const result = letGo(createCtx(state));
    expect(result.ok).toBe(true);
    expect(state.player.stats.happiness).toBeGreaterThan(before);
    expect(roots.strain).toBeLessThan(strained);
    expect(raisedBy(state).reduce((s, p) => s + p.relationship, 0)).toBeGreaterThan(bond);
    expect(letGoYear(state)).toBe(state.year);

    // Définitif : une décision qu'on peut défaire n'en est pas une.
    expect(letGo(createCtx(state)).ok).toBe(false);
    expect(follow(createCtx(state), 'registre').ok).toBe(false);
    expect(canGo(state)).toBe(false);
    expect(summary(state)).toContain('arrêté');
  });
});

describe('l’écran', () => {
  it('dit le prix avant qu’on s’engage, et propose d’arrêter', () => {
    const source = readFileSync(
      new URL('../../screens/RootsScreen.tsx', import.meta.url).pathname, 'utf8',
    );
    // Les chances, le prix chez eux, et la sortie : les trois choses sans
    // lesquelles suivre une piste n'est pas une décision.
    expect(source).toContain('leadOdds');
    expect(source).toContain('leur coûte');
    expect(source).toContain('letGo');
    // Et l'écran ne s'ouvre pas avant que le personnage sache.
    expect(source).toContain('knownYear === null');
  });

  it('reste muet pour qui a grandi chez les siens', () => {
    const state = createNewLife({ seed: 4 });
    // Une graine ordinaire : la question ne se pose pas, et rien ne s'affiche.
    if (rootsOf(state)) return;
    expect(summary(state)).toBe('');
    expect(canGo(state)).toBe(false);
    expect(letGo(createCtx(state)).ok).toBe(false);
  });
});
