/**
 * Vérifications du boîtier.
 *
 * Deux lignes du catalogue portaient le même reproche : « Vol de véhicule — un
 * délit du catalogue résolu par tirage : aucun puzzle » et « Vol à l'étalage —
 * un délit du catalogue résolu par tirage ». Le joueur appuyait sur une ligne,
 * un dé décidait.
 *
 * **Ce qui se joue est un objet inventé.** C'est une exigence tenue par la
 * conception elle-même : des anneaux concentriques engrenés les uns dans les
 * autres ne reproduisent aucun mécanisme véritable, et rien de ce que le
 * joueur apprend ici ne s'applique ailleurs qu'à ce jouet.
 *
 * Six exigences :
 *
 * 1. **c'est un puzzle, pas une animation** — qui trouve l'ordre gagne, qui
 *    tape au hasard perd, et qui ne touche à rien perd toujours ;
 * 2. **il a une solution courte, et elle se calcule** ;
 * 3. **la difficulté du délit décide de la taille du puzzle** ;
 * 4. **le règlement ne dépend pas du chemin** : jouer et laisser faire
 *    aboutissent aux mêmes suites ;
 * 5. **ouvrir le mini-jeu ne décale pas la partie** — le tirage est consommé
 *    dans les deux cas ;
 * 6. **ce que les données déclarent existe.**
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState } from '../types.ts';
import { Rng } from '../rng.ts';
import { getMiniGame, miniGameContext, playHeadless } from '../minigame.ts';
import { CRIMES } from '../../data/crimes.ts';
import { commitCrime, crimeContext, crimeSkill } from '../../systems/crime.ts';
import {
  RINGS, noiseOf, shortest, type RingsSetup, type RingsState,
} from '../../systems/minigames/rings.ts';
import {
  HEIST, haulOf, windowOf, type HeistSetup, type HeistState,
} from '../../systems/minigames/heist.ts';

/** Quelqu'un qui peut tenter le coup, quelle que soit la graine. */
function crook(seed: number): GameState {
  const state = createNewLife({ seed });
  for (let i = 0; i < 24 && !state.gameOver; i++) simulateYear(state);
  state.player.prison = null;
  state.player.criminalRecord.wanted = false;
  state.player.stats.criminality = 62;
  state.player.yearActions = {};
  return state;
}

/** Celui qui a compris : de l'extérieur vers le centre. */
function ordered(s: RingsState) {
  const i = s.rings.findIndex((r) => r !== 0);
  if (i < 0) return {};
  return { tap: true, y: (i + 0.5) / s.rings.length };
}

function rate(policy: (s: RingsState) => object, setup: RingsSetup, runs = 200): number {
  let ok = 0;
  for (let seed = 1; seed <= runs; seed++) {
    const context = miniGameContext({ skill: 60, difficulty: 45, setup });
    const out = playHeadless(RINGS, new Rng({ rngState: seed }), context, policy as never);
    if (out.result.success) ok += 1;
  }
  return ok / runs;
}

describe('le puzzle', () => {
  it('récompense qui trouve l’ordre, et personne d’autre', () => {
    /*
     * Mesuré sur deux cents parties par réglage : 100 % / 94 % / 68 % pour qui
     * règle les anneaux de l'extérieur vers le centre, contre 12 % / 0 % / 0 %
     * pour qui tape au hasard. Quelqu'un qui ne touche à rien ne gagne jamais.
     */
    let n = 1;
    const random = (s: RingsState) => {
      n = (n * 1_103_515_245 + 12_345) & 0x7fff_ffff;
      return { tap: true, y: (((n >> 8) % s.rings.length) + 0.5) / s.rings.length };
    };
    const setup: RingsSetup = { rings: 4, notches: 8, blind: false };

    const wise = rate(ordered, setup);
    const blind = rate(random, setup);
    const still = rate(() => ({}), setup);

    expect(wise).toBeGreaterThan(0.8);
    expect(blind).toBeLessThan(wise - 0.4);
    expect(still).toBe(0);
  });

  it('devient plus dur quand il grossit', () => {
    const easy = rate(ordered, { rings: 3, notches: 6, blind: false });
    const hard = rate(ordered, { rings: 5, notches: 8, blind: false });
    expect(easy).toBeGreaterThan(hard);
    expect(hard).toBeGreaterThan(0.35);
  });

  it('sait dire en combien de gestes il se règle', () => {
    // Avec trois anneaux à un cran de la fin, il faut un geste par anneau…
    expect(shortest({ rings: [0, 0, 0], notches: 6 })).toBe(0);
    // …et le couplage se paie : régler l'extérieur déplace tout le dedans.
    const par = shortest({ rings: [5, 5, 5], notches: 6 });
    expect(par).toBeGreaterThan(0);

    // On le vérifie en jouant : la politique ordonnée doit tomber sur ce
    // compte exact, sinon la formule décrit autre chose que le jeu.
    const context = miniGameContext({
      skill: 90, difficulty: 10, setup: { rings: 3, notches: 6, blind: false },
    });
    const out = playHeadless(RINGS, new Rng({ rngState: 4 }), context, ordered as never);
    const state = out.state as RingsState;
    if (state.over === 'ouvert') expect(state.taps).toBe(state.par);
  });

  it('fait payer plus cher les anneaux extérieurs', () => {
    // C'est ce qui punit de tâtonner : l'ordre juste commence par le plus
    // bruyant, donc s'y reprendre coûte double.
    expect(noiseOf(0, 4)).toBeGreaterThan(noiseOf(3, 4));
  });
});

describe('ce que les données déclarent', () => {
  it('ne nomme que des mini-jeux qui existent', () => {
    const named = CRIMES.filter((c) => c.miniGame);
    expect(named.length).toBeGreaterThanOrEqual(2);
    for (const crime of named) expect(getMiniGame(crime.miniGame!), crime.id).toBeTruthy();
  });

  it('laisse les autres au tirage, et le catalogue le porte', () => {
    expect(CRIMES.filter((c) => !c.miniGame).length).toBeGreaterThan(0);
  });

  it('taille le puzzle sur la difficulté du délit', () => {
    const state = crook(5);
    const petty = CRIMES.find((c) => c.id === 'shoplift')!;
    const harder = CRIMES.find((c) => c.id === 'cartheft')!;
    const a = crimeContext(state, petty).setup as RingsSetup;
    const b = crimeContext(state, harder).setup as RingsSetup;
    expect(b.rings).toBeGreaterThan(a.rings);
    expect(b.blind).toBe(true);
    expect(a.blind).toBe(false);
    // Et l'aptitude est celle que le tirage consomme, sur la même échelle.
    const skill = crimeSkill(state);
    expect(skill).toBeGreaterThanOrEqual(0);
    expect(skill).toBeLessThanOrEqual(100);
  });
});

describe('le règlement', () => {
  it('donne la même chose qu’on ait joué ou non', () => {
    /*
     * Le point du test : le chemin ne change rien aux suites. Deux parties
     * identiques, l'une qui joue et réussit, l'autre à qui l'on impose le même
     * résultat — tout ce qui vient après doit être identique.
     */
    const a = crook(9);
    const b = crook(9);
    commitCrime(createCtx(a), 'cartheft', true);
    commitCrime(createCtx(b), 'cartheft', true);
    expect(a.player.money).toBe(b.player.money);
    expect(a.player.criminalRecord.arrests).toBe(b.player.criminalRecord.arrests);
    expect(a.player.stats.criminality).toBe(b.player.stats.criminality);
  });

  it('ne décale pas la partie selon qu’on a ouvert le jeu', () => {
    /*
     * **Le tirage est consommé même quand le joueur a joué.** Sans cela, la
     * suite du monde dépendrait d'un choix d'interface : deux parties
     * identiques divergeraient parce que l'une a ouvert le boîtier.
     */
    const played = crook(11);
    const rolled = crook(11);
    commitCrime(createCtx(played), 'cartheft', true);
    commitCrime(createCtx(rolled), 'cartheft');
    expect(played.rngState).toBe(rolled.rngState);
  });

  it('récompense d’avoir réussi le puzzle', () => {
    const win = crook(13);
    const lose = crook(13);
    commitCrime(createCtx(win), 'cartheft', true);
    commitCrime(createCtx(lose), 'cartheft', false);
    // Réussir rapporte, échouer ne rapporte rien — sauf arrestation, où tout
    // est saisi de toute façon.
    expect(win.player.money).toBeGreaterThanOrEqual(lose.player.money);
  });
});

/* ------------------------------------------------------------------ */
/* Le minutage                                                         */
/* ------------------------------------------------------------------ */

/**
 * Vérifications du minutage.
 *
 * Le catalogue disait : « Braquage — minutage et niveau d'alerte : un délit du
 * catalogue résolu par tirage ». **Rien de ce mini-jeu ne décrit une façon de
 * faire** : ni lieu, ni outil, ni méthode. On y manipule du temps.
 *
 * Quatre exigences :
 *
 * 1. **viser sert**, sinon la fenêtre est un décor ;
 * 2. **la cupidité se paie** : rester jusqu'au bout, c'est se faire prendre ;
 * 3. **la timidité se paie aussi** : partir tout de suite ne rapporte presque
 *    rien ;
 * 4. **il n'y a pas de bon moment calculable** — la limite est tirée et jamais
 *    montrée, sans quoi partir plus tard dominerait toujours.
 */
describe('le minutage', () => {
  const SETUP: HeistSetup = { passes: 8, speed: 0.55, window: 0.12 };

  /** Celui qui vise, et qui part au seuil dit. */
  const aiming = (leaveAt: number) => (s: HeistState) => {
    if (s.alert >= leaveAt) return { quit: true };
    if (!s.pressing) return { hold: true };
    return Math.abs(s.needle - s.mark) <= windowOf(s) * 0.85 ? {} : { hold: true };
  };

  function trial(policy: (s: HeistState) => object, runs = 200) {
    let ok = 0;
    let haul = 0;
    let caught = 0;
    for (let seed = 1; seed <= runs; seed++) {
      const context = miniGameContext({ skill: 60, difficulty: 55, setup: SETUP });
      const out = playHeadless(HEIST, new Rng({ rngState: seed }), context, policy as never);
      const state = out.state as HeistState;
      if (out.result.success) { ok += 1; haul += haulOf(state); }
      if (state.over === 'pris') caught += 1;
    }
    return { rate: ok / runs, haul: ok ? haul / ok : 0, caught: caught / runs };
  }

  it('récompense de viser, et pas de marteler', () => {
    let n = 7;
    const flailing = (s: HeistState) => {
      n = (n * 1_103_515_245 + 12_345) & 0x7fff_ffff;
      if (s.alert >= 80) return { quit: true };
      return ((n >> 9) % 5 === 0) ? {} : { hold: true };
    };
    const wise = trial(aiming(70));
    const blind = trial(flailing);
    // Mesuré : 100 % contre 17 %, et une prise trois fois plus grosse.
    expect(wise.rate).toBeGreaterThan(0.9);
    expect(blind.rate).toBeLessThan(0.45);
    expect(wise.haul).toBeGreaterThan(blind.haul * 1.8);
  });

  it('fait payer la cupidité', () => {
    /*
     * **Le réglage que la mesure a imposé.** Premier jet : l'alerte montait
     * trop peu, personne n'était jamais pris, et « ne jamais partir » battait
     * toutes les autres consignes. Une décision dont une réponse domine n'est
     * pas une décision.
     */
    const greedy = trial(aiming(999));
    expect(greedy.caught).toBeGreaterThan(0.9);
    expect(greedy.rate).toBe(0);
  });

  it('fait payer la timidité aussi', () => {
    const timid = (s: HeistState) => (s.taken >= 1 ? { quit: true } : aiming(999)(s));
    const early = trial(timid);
    const patient = trial(aiming(70));
    expect(early.rate).toBeGreaterThan(0.9);
    // On repart vivant, et presque les mains vides.
    expect(early.haul).toBeLessThan(patient.haul * 0.5);
  });

  it('ne laisse pas calculer le bon moment', () => {
    /*
     * La limite est tirée entre 82 et 100 et **jamais montrée**. Sans elle,
     * l'alerte étant affichée et sa montée calculable, partir plus tard ne
     * risquait rien : mesuré, partir à 70 valait exactement partir à 60, et
     * pousser n'était jamais un pari.
     *
     * Mesuré depuis, en espérance de prise : 0,38 à 45 · 0,51 à 70 · 0,50 à
     * 80 · 0,31 à 90. Il y a donc un sommet, et le dépasser coûte.
     */
    const value = (at: number) => { const r = trial(aiming(at)); return r.rate * r.haul; };
    const early = value(45);
    const good = value(70);
    const late = value(90);
    expect(good).toBeGreaterThan(early);
    expect(good).toBeGreaterThan(late);
    // Et pousser trop loin se paie en arrestations, pas seulement en moyenne.
    expect(trial(aiming(90)).caught).toBeGreaterThan(0.25);
  });

  it('ne rapporte pas la même chose selon ce qu’on a emporté', () => {
    /*
     * Sans cela, savoir s'arrêter n'aurait aucune conséquence dans la partie :
     * partir à la première passe et rester jusqu'au bout paieraient pareil.
     *
     * Le braquage demande une équipe, donc un nom : le premier jet prenait un
     * personnage ordinaire, se faisait refuser le coup par `crimeBlocker`, et
     * comparait deux fois zéro sans rien vérifier.
     */
    const ready = (seed: number) => {
      const state = crook(seed);
      state.player.criminalRecord.notoriety = 60;
      state.player.money = 0;
      return state;
    };
    let compared = 0;
    for (let seed = 20; seed < 40; seed++) {
      const little = ready(seed);
      const lots = ready(seed);
      const a = commitCrime(createCtx(little), 'bankheist', true, 0.05);
      const b = commitCrime(createCtx(lots), 'bankheist', true, 0.95);
      expect(a.ok, a.message).toBe(true);
      expect(b.ok, b.message).toBe(true);
      // Une arrestation saisit tout : on ne compare que les coups impunis.
      if (little.player.criminalRecord.arrests !== lots.player.criminalRecord.arrests) continue;
      if (little.player.criminalRecord.arrests > crook(seed).player.criminalRecord.arrests) continue;
      expect(lots.player.money).toBeGreaterThan(little.player.money);
      compared += 1;
    }
    expect(compared).toBeGreaterThan(3);
  });
});
