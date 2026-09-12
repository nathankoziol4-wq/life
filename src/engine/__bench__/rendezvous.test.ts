/**
 * Les rendez-vous.
 *
 * Trois mesures ont commandé ce système, et les tests tiennent ce qu'elles
 * demandaient.
 *
 *     d'inconnu à couple        : 9,1 gestes — parler, parler, demander
 *     partenaires plutôt loyaux : 46 % — le hasard exact
 *     sur 20 000 personnes      : pas une froide, pas une déloyale,
 *                                 pas une colérique
 *
 * La dernière est la plus grave et la moins visible : `rng.stat(58, 28)` se
 * lit comme un écart-type de vingt-huit et en rend neuf, si bien que deux
 * personnes du jeu étaient interchangeables. Il n'y avait donc rien à
 * découvrir chez quelqu'un — et c'est cela, plus que l'absence de scène, qui
 * faisait de la séduction un compteur.
 *
 * Ce fichier vérifie quatre choses : que les gens ont un caractère, qu'on ne
 * le connaît pas d'avance, qu'une soirée l'apprend, et que **savoir permet de
 * choisir** — mesuré, pas affirmé.
 */

import { describe, expect, it } from 'vitest';
import { Rng } from '../rng.ts';
import { createNewLife } from '../newLife.ts';
import { createCtx } from '../context.ts';
import { simulateYear } from '../simulateYear.ts';
import { rollPersonality } from '../../systems/npc.ts';
import {
  isRomanticallyCompatible, meetRomanticProspect, propose,
} from '../../systems/relationships.ts';
import {
  PLACES, TRAITS, advanceKnowing, courtedBonus, dateBlocker, evening, knows,
  knownTraits, lands, learn, outingsThisYear, placeCost, placesFor, reaction,
  sceneFor, settleDate, traitWord, unknownTraits,
  type TraitId,
} from '../../systems/dates.ts';
import { BEATS, COLD, OUTINGS_PER_YEAR, WARM, getPlace } from '../../data/dates.ts';
import type { GameState, Person } from '../types.ts';

/** Un adulte vivant, à un âge où sortir a un sens. */
function adult(seed: number, age = 26): GameState | null {
  const state = createNewLife({ seed });
  for (let y = 0; y < age && state.player.alive; y++) simulateYear(state);
  if (!state.player.alive || state.gameOver || state.player.prison) return null;
  state.player.money = Math.max(state.player.money, 500_000);
  state.player.yearActions = {};
  state.pending = [];
  return state;
}

/** Quelqu'un à fréquenter. */
function prospect(state: GameState, quality = 0.6): Person {
  const who = meetRomanticProspect(createCtx(state), quality);
  who.relationship = Math.max(who.relationship, 45);
  return who;
}

/* ------------------------------------------------------------------ */

describe('les gens ont un caractère', () => {
  it('ne les fabrique plus tous pareils', () => {
    // La mesure qui a commandé le reste : sur vingt mille personnes tirées
    // par l'ancienne version, aucune n'était froide (≤30), aucune déloyale,
    // aucune colérique (≥75). Tout le monde tombait à ±25 de la moyenne.
    const rng = new Rng({ rngState: 4242 });
    const people = Array.from({ length: 4000 }, () => rollPersonality(rng));
    for (const trait of ['warmth', 'loyalty', 'generosity'] as const) {
      const low = people.filter((p) => p[trait] <= 30).length / people.length;
      expect(low, trait).toBeGreaterThan(0.02);
    }
    const hot = people.filter((p) => p.temper >= 75).length / people.length;
    expect(hot).toBeGreaterThan(0.02);
  });

  it('garde les moyennes où elles étaient', () => {
    // Élargir n'est pas déplacer : un monde soudain plus froid ou plus
    // déloyal en moyenne aurait changé l'équilibre de tout le jeu.
    const rng = new Rng({ rngState: 99 });
    const people = Array.from({ length: 6000 }, () => rollPersonality(rng));
    const mean = (k: 'warmth' | 'loyalty' | 'temper') =>
      people.reduce((s, p) => s + p[k], 0) / people.length;
    expect(mean('warmth')).toBeGreaterThan(53);
    expect(mean('warmth')).toBeLessThan(63);
    expect(mean('loyalty')).toBeGreaterThan(55);
    expect(mean('loyalty')).toBeLessThan(65);
    expect(mean('temper')).toBeGreaterThan(37);
    expect(mean('temper')).toBeLessThan(47);
  });

  it('laisse la santé mentale tranquille', () => {
    // `madness` n'est pas un trait qu'on remarque en soirée, et le pousser
    // vers un extrême ferait dire au jeu des choses qu'il n'a pas à dire.
    const rng = new Rng({ rngState: 7 });
    const people = Array.from({ length: 4000 }, () => rollPersonality(rng));
    const high = people.filter((p) => p.madness >= 70).length / people.length;
    expect(high).toBeLessThan(0.01);
  });
});

/* ------------------------------------------------------------------ */

describe('ce qu’on sait de quelqu’un', () => {
  it('ne dit rien d’un inconnu', () => {
    const state = adult(31);
    if (!state) return;
    const who = prospect(state);
    expect(knownTraits(who)).toHaveLength(0);
    expect(unknownTraits(who)).toHaveLength(TRAITS.length);
  });

  it('dit tout de ceux qu’on a toujours connus', () => {
    const state = adult(31);
    if (!state) return;
    const mother = Object.values(state.npcs).find((n) => n.relation === 'mother');
    if (!mother) return;
    expect(knownTraits(mother)).toHaveLength(TRAITS.length);
    for (const trait of TRAITS) expect(knows(mother, trait)).toBe(true);
  });

  it('ne découvre un trait qu’une fois', () => {
    const state = adult(31);
    if (!state) return;
    const who = prospect(state);
    expect(learn(who, 'loyalty')).toBe(true);
    expect(learn(who, 'loyalty')).toBe(false);
    expect(knows(who, 'loyalty')).toBe(true);
    expect(knows(who, 'warmth')).toBe(false);
  });

  it('finit par apprendre de ceux avec qui l’on vit', () => {
    // Sans cela, un conjoint de trente ans serait resté un inconnu faute
    // d'avoir été emmené au cinéma — ce qui serait faux et ennuyeux.
    const state = adult(31);
    if (!state) return;
    const who = prospect(state);
    who.relationship = 90;
    for (let year = 0; year < 40; year++) advanceKnowing(createCtx(state));
    expect(unknownTraits(who)).toHaveLength(0);
  });

  it('n’apprend rien de ceux qu’on ne voit pas', () => {
    const state = adult(31);
    if (!state) return;
    const who = prospect(state);
    who.relationship = 30;
    for (let year = 0; year < 40; year++) advanceKnowing(createCtx(state));
    expect(knownTraits(who)).toHaveLength(0);
  });

  it('dit ce qu’un trait connu veut dire', () => {
    const state = adult(31);
    if (!state) return;
    const who = prospect(state);
    who.personality.loyalty = 90;
    expect(traitWord(who, 'loyalty').length).toBeGreaterThan(8);
    who.personality.loyalty = 10;
    expect(traitWord(who, 'loyalty')).not.toBe('');
  });
});

/* ------------------------------------------------------------------ */

describe('la soirée', () => {
  it('propose des endroits qui coûtent, et qui s’ouvrent avec l’âge', () => {
    const state = adult(31);
    if (!state) return;
    expect(placesFor(state).length).toBeGreaterThan(3);
    const young = adult(31, 15);
    if (young) expect(placesFor(young).length).toBeLessThan(PLACES.length);
    for (const place of PLACES) {
      expect(placeCost(state, place)).toBeGreaterThanOrEqual(0);
      expect(place.beats).toBeGreaterThan(1);
    }
  });

  it('donne une scène stable, qu’on peut redemander sans la changer', () => {
    // L'écran la redemande à chaque rendu : si elle bougeait, la soirée
    // changerait sous les doigts du joueur.
    const state = adult(31);
    if (!state) return;
    const who = prospect(state);
    const first = sceneFor(state, who, 'marche').map((b) => b.id);
    const again = sceneFor(state, who, 'marche').map((b) => b.id);
    expect(again).toEqual(first);
    expect(first).toHaveLength(getPlace('marche')!.beats);
    expect(new Set(first).size).toBe(first.length);
  });

  it('ne consomme pas le hasard de la partie', () => {
    const state = adult(31);
    if (!state) return;
    const who = prospect(state);
    const before = state.rngState;
    sceneFor(state, who, 'restaurant');
    expect(state.rngState).toBe(before);
  });

  it('refuse la troisième sortie de l’année', () => {
    const state = adult(31);
    if (!state) return;
    const who = prospect(state);
    for (let i = 0; i < OUTINGS_PER_YEAR; i++) {
      expect(settleDate(createCtx(state), who.id, 'marche', ['warmth']).ok).toBe(true);
    }
    expect(outingsThisYear(state, who)).toBe(OUTINGS_PER_YEAR);
    expect(dateBlocker(state, who, 'marche')).toContain('déjà');
  });

  it('refuse ce qu’on n’a pas les moyens de payer', () => {
    const state = adult(31);
    if (!state) return;
    const who = prospect(state);
    state.player.money = 1;
    expect(dateBlocker(state, who, 'weekend')).toContain('faudrait');
    // La marche est gratuite : elle reste ouverte à qui n'a rien.
    expect(dateBlocker(state, who, 'marche')).toBeNull();
  });

  it('n’est pas une sortie qu’on propose à sa sœur', () => {
    const state = adult(31);
    if (!state) return;
    const sister = Object.values(state.npcs).find((n) => n.relation === 'sister' || n.relation === 'mother');
    if (!sister) return;
    expect(dateBlocker(state, sister, 'cafe')).not.toBeNull();
  });

  it('coûte ce qu’elle annonce', () => {
    const state = adult(31);
    if (!state) return;
    const who = prospect(state);
    const before = state.player.money;
    const cost = placeCost(state, getPlace('restaurant')!);
    settleDate(createCtx(state), who.id, 'restaurant', ['warmth', 'loyalty', 'ambition']);
    expect(before - state.player.money).toBe(cost);
  });
});

/* ------------------------------------------------------------------ */

describe('ce qu’on met à l’épreuve, on l’apprend', () => {
  it('découvre exactement ce dont on a parlé, et rien d’autre', () => {
    const state = adult(31);
    if (!state) return;
    const who = prospect(state);
    settleDate(createCtx(state), who.id, 'marche', ['loyalty', 'loyalty', 'loyalty']);
    // « La marche » s'adresse à la chaleur ; on n'a parlé que de loyauté.
    expect(knows(who, 'warmth')).toBe(true);
    expect(knows(who, 'loyalty')).toBe(true);
    expect(knows(who, 'ambition')).toBe(false);
    expect(knows(who, 'generosity')).toBe(false);
  });

  it('fait d’une soirée entière une vraie découverte', () => {
    const state = adult(31);
    if (!state) return;
    const who = prospect(state);
    settleDate(createCtx(state), who.id, 'restaurant', ['warmth', 'loyalty', 'generosity']);
    expect(unknownTraits(who)).toHaveLength(1);
  });
});

/* ------------------------------------------------------------------ */

describe('répondre juste compte', () => {
  it('sépare ce qui touche de ce qui tombe', () => {
    const state = adult(31);
    if (!state) return;
    const who = prospect(state);
    who.personality.warmth = 90;
    who.personality.ambition = 10;
    expect(lands(who, 'warmth')).toBeGreaterThan(0);
    expect(lands(who, 'ambition')).toBeLessThan(0);
    who.personality.loyalty = (WARM + COLD) / 2;
    expect(lands(who, 'loyalty')).toBe(0);
  });

  it('donne une meilleure soirée à qui vise juste', () => {
    const state = adult(31);
    if (!state) return;
    const who = prospect(state);
    for (const trait of TRAITS) who.personality[trait] = 20;
    who.personality.warmth = 90;
    const place = getPlace('marche')!; // s'adresse à la chaleur
    const juste = evening(who, place, ['warmth', 'warmth', 'warmth']);
    const faux = evening(who, place, ['ambition', 'loyalty', 'generosity']);
    expect(juste).toBeGreaterThan(faux);
    expect(juste).toBeGreaterThan(0);
    expect(faux).toBeLessThan(0);
  });

  it('fait bouger le lien dans le sens de la soirée', () => {
    const state = adult(31);
    if (!state) return;
    const bonne = prospect(state);
    const mauvaise = prospect(state);
    for (const who of [bonne, mauvaise]) {
      for (const trait of TRAITS) who.personality[trait] = 20;
      who.personality.warmth = 90;
      who.relationship = 50;
    }
    settleDate(createCtx(state), bonne.id, 'marche', ['warmth', 'warmth', 'warmth']);
    settleDate(createCtx(state), mauvaise.id, 'marche', ['ambition', 'loyalty', 'generosity']);
    expect(bonne.relationship).toBeGreaterThan(50);
    expect(mauvaise.relationship).toBeLessThan(50);
  });

  it('ne rend aucun endroit meilleur qu’un autre dans l’absolu', () => {
    // C'est toute la question du système : le bon endroit dépend de qui l'on
    // emmène. Un endroit qui gagnerait toujours en ferait un menu à
    // apprendre par cœur.
    const state = adult(31);
    if (!state) return;
    const who = prospect(state);
    const wins: Record<string, number> = {};
    const rng = new Rng({ rngState: 77 });
    for (let i = 0; i < 400; i++) {
      for (const trait of TRAITS) who.personality[trait] = rng.stat(50, 90);
      let best = { id: '', score: -Infinity };
      for (const place of PLACES) {
        const picks = TRAITS.slice(0, place.beats) as TraitId[];
        const score = evening(who, place, picks);
        if (score > best.score) best = { id: place.id, score };
      }
      wins[best.id] = (wins[best.id] ?? 0) + 1;
    }
    // Aucun endroit ne gagne plus de la moitié des configurations.
    for (const [id, n] of Object.entries(wins)) expect(n / 400, id).toBeLessThan(0.5);
    expect(Object.keys(wins).length).toBeGreaterThan(2);
  });
});

/* ------------------------------------------------------------------ */

describe('lire une réaction', () => {
  it('ne dit la raison qu’à qui sait parler', () => {
    const state = adult(31);
    if (!state) return;
    const who = prospect(state);
    who.personality.warmth = 90;
    const vague = reaction(state, who, 'warmth');

    state.player.skills = { parole: { level: 95, peak: 95, done: 20 } };
    const precis = reaction(state, who, 'warmth');
    expect(precis).not.toBe(vague);
    expect(precis.toLowerCase()).toContain('chaleur');
    expect(vague.toLowerCase()).not.toContain('chaleur');
  });

  it('ne change rien à ce qui arrive vraiment', () => {
    // La parole rend lisible, elle ne rend pas aimable : la même réponse au
    // même caractère doit valoir la même chose avec ou sans.
    const state = adult(31);
    if (!state) return;
    const who = prospect(state);
    who.personality.warmth = 90;
    const sansMot = lands(who, 'warmth');
    state.player.skills = { parole: { level: 95, peak: 95, done: 20 } };
    expect(lands(who, 'warmth')).toBe(sansMot);
  });
});

/* ------------------------------------------------------------------ */

describe('ce qu’une soirée laisse', () => {
  it('aide la demande qui suit, et seulement cette année-là', () => {
    const state = adult(31);
    if (!state) return;
    const who = prospect(state);
    for (const trait of TRAITS) who.personality[trait] = 90;
    settleDate(createCtx(state), who.id, 'marche', ['warmth', 'loyalty', 'generosity']);
    expect(courtedBonus(state, who)).toBeGreaterThan(0);
    state.year += 1;
    expect(courtedBonus(state, who)).toBe(0);
  });

  it('ne laisse rien après une soirée ratée', () => {
    const state = adult(31);
    if (!state) return;
    const who = prospect(state);
    for (const trait of TRAITS) who.personality[trait] = 10;
    settleDate(createCtx(state), who.id, 'restaurant', ['warmth', 'loyalty', 'ambition']);
    expect(courtedBonus(state, who)).toBe(0);
  });

  it('rend la demande plus facile après une belle soirée', () => {
    // Mesuré sur beaucoup de couples : une demande est un tirage, et deux
    // essais ne diraient rien.
    let avec = 0;
    let sans = 0;
    for (let seed = 0; seed < 120; seed++) {
      for (const courted of [true, false]) {
        const state = adult(seed * 13 + 5);
        if (!state) continue;
        const who = prospect(state);
        who.relation = 'partner';
        who.relationship = 70;
        who.flags.togetherSince = state.year - 2;
        if (courted) who.flags.courtedYear = state.year;
        if (propose(createCtx(state), who).title === 'Elle a dit oui !') {
          if (courted) avec += 1; else sans += 1;
        }
      }
    }
    expect(avec).toBeGreaterThan(sans);
  });
});

/* ------------------------------------------------------------------ */

describe('sortir permet de choisir', () => {
  it('fait mieux que le hasard, ce que cliquer ne faisait pas', () => {
    // L'affirmation entière du chantier, mesurée. Avant : 46 % de
    // partenaires loyaux, c'est-à-dire pile ce que donne un tirage. Le
    // joueur qui sort découvre, puis passe son chemin — et cela doit se
    // voir sur qui il finit par garder.
    const clique: number[] = [];
    const courtise: number[] = [];

    for (let t = 0; t < 140; t++) {
      for (const style of ['clique', 'courtise'] as const) {
        const state = adult(900_000 + t, 24);
        if (!state) continue;
        const rng = new Rng({ rngState: (t * 40_503 + 11) >>> 0 });
        let chosen: Person | null = null;

        for (let met = 0; met < 5 && !chosen; met++) {
          const who = meetRomanticProspect(createCtx(state), rng.float(0.4, 0.9));
          if (!isRomanticallyCompatible(state.player.sex, state.player.orientation, who)) continue;
          who.relationship = Math.max(who.relationship, 45);

          if (style === 'courtise') {
            // Deux soirées, réponses au hasard : on mesure ce que
            // *découvrir* apporte, pas ce qu'un bon joueur apporte en plus.
            for (let out = 0; out < OUTINGS_PER_YEAR && unknownTraits(who).length > 0; out++) {
              const place = PLACES[rng.int(0, PLACES.length - 1)];
              const picks = [0, 1, 2].map(() => TRAITS[rng.int(0, TRAITS.length - 1)]);
              settleDate(createCtx(state), who.id, place.id, picks);
            }
            const bad = (knows(who, 'loyalty') && who.personality.loyalty < 50)
              || (knows(who, 'temper') && who.personality.temper > 62);
            if (bad && met < 4) continue;
          }
          chosen = who;
        }
        if (chosen) (style === 'clique' ? clique : courtise).push(chosen.personality.loyalty);
      }
    }

    const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length);
    expect(clique.length).toBeGreaterThan(50);
    expect(courtise.length).toBeGreaterThan(50);
    expect(mean(courtise)).toBeGreaterThan(mean(clique) + 1.5);
  });

  it('n’a de sens que parce que les moments s’adressent à des traits', () => {
    for (const beat of BEATS) {
      expect(beat.scene.length).toBeGreaterThan(20);
      expect(beat.replies.length).toBeGreaterThanOrEqual(2);
      // Deux réponses qui s'adressent au même trait ne seraient pas un choix.
      const appeals = beat.replies.map((r) => r.appeals);
      expect(new Set(appeals).size).toBe(appeals.length);
      for (const reply of beat.replies) expect(TRAITS).toContain(reply.appeals);
    }
  });
});
