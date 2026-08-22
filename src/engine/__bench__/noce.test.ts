/**
 * La noce — le trou au centre du domaine le plus fourni du jeu.
 *
 * L'amour était complet partout : une application de rencontre où l'on apprend
 * à lire l'honnêteté d'un profil, des rendez-vous à douze moments, un divorce
 * avec trois avocats et une garde qui pèse ce qu'on a fait de l'enfance de ses
 * enfants. Et en son centre, `marry` prenait trente-cinq pour cent de l'argent
 * du personnage, ajoutait vingt-deux points de bonheur et cinq de réputation.
 * **Le joueur ne décidait rien.**
 *
 * Cinq exigences :
 *
 * 1. **une demande acceptée fiance**, elle ne marie plus dans la seconde ;
 * 2. **les trois côtés de l'arbitrage tiennent** — l'argent, les places, les
 *    gens — et aucun ne s'obtient sans céder sur les autres ;
 * 3. **celui qu'on n'invite pas l'apprend**, et d'autant plus qu'il était
 *    proche ; sans cela la mairie à quatre places serait toujours le bon
 *    calcul ;
 * 4. **le lieu borne la liste**, et rétrécir emporte des invités ;
 * 5. **on peut toujours se marier**, si pauvre soit-on — sinon les fiançailles
 *    seraient un piège.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState, Person } from '../types.ts';
import { createPerson } from '../../systems/npc.ts';
import { PLANNING, SPREADS, VENUES, getVenue } from '../../data/wedding.ts';
import {
  betroth, callOff, costOf, guestPool, hold, invite, inviteClosest,
  leftOut, planOf, seatsLeft, setSpread, setVenue, weddingBlocker, wouldNotice,
} from '../../systems/wedding.ts';
import { propose } from '../../systems/relationships.ts';

/** Un personnage adulte, fiancé, deux ans après la demande. */
function engaged(seed: number, money = 3_000_000): { state: GameState; mate: Person } | null {
  const state = createNewLife({ seed });
  for (let i = 0; i < 30 && !state.gameOver; i++) simulateYear(state);
  if (state.gameOver) return null;
  const mate = createPerson(createCtx(state), { relation: 'partner', age: 30 });
  mate.relationship = 80;
  betroth(createCtx(state), mate);
  state.year += PLANNING + 1;
  state.player.money = money;
  state.player.yearActions = {};
  return { state, mate };
}

describe('la demande', () => {
  it('fiance, elle ne marie plus', () => {
    const state = createNewLife({ seed: 3 });
    for (let i = 0; i < 30 && !state.gameOver; i++) simulateYear(state);
    const mate = createPerson(createCtx(state), { relation: 'partner', age: 30 });
    mate.relationship = 99;
    mate.personality.loyalty = 95;
    mate.flags.togetherSince = state.year - 6;
    state.player.money = 400_000;

    let accepted = false;
    for (let tries = 0; tries < 40 && !accepted; tries++) {
      mate.interactionsThisYear = 0;
      const result = propose(createCtx(state), mate);
      accepted = result.ok === true && /oui/i.test(result.title ?? '');
    }
    expect(accepted).toBe(true);
    // Fiancé, pas marié : c'est l'entre-deux qui n'existait pas.
    expect(mate.relation).toBe('partner');
    expect(mate.maritalStatus).toBe('engaged');
    expect(planOf(state)).not.toBeNull();
    expect(planOf(state)!.done).toBe(false);
  });

  it('ne se refait pas quand on est déjà fiancé', () => {
    /*
     * **Le trou que l'entre-deux a ouvert.** `betroth` remet `plan.since` à
     * l'année courante : redemander à son propre fiancé repoussait la noce
     * d'un an, et une demande refusée retirait douze points de lien à
     * quelqu'un qui avait déjà dit oui. Mesuré sur les deux cents vies de
     * l'équilibrage, l'auto-joueur redemandait chaque année avec cinquante-
     * cinq pour cent de chances : âge médian au mariage vingt-huit → trente,
     * enfants par vie 1,02 → 0,83.
     */
    const set = engaged(41);
    if (!set) return;
    const { state, mate } = set;
    const since = planOf(state)!.since;
    const before = mate.relationship;

    const again = propose(createCtx(state), mate);
    expect(again.ok).toBe(false);
    // Ni l'horloge de la noce ni le lien ne bougent.
    expect(planOf(state)!.since).toBe(since);
    expect(mate.relationship).toBe(before);
    expect(weddingBlocker(state)).toBeNull();

    // Et l'on ne se fiance pas à deux personnes à la fois.
    const other = createPerson(createCtx(state), { relation: 'partner', age: 29 });
    other.relationship = 95;
    expect(propose(createCtx(state), other).ok).toBe(false);
    expect(planOf(state)!.partnerId).toBe(mate.id);
  });

  it('laisse rompre, et ça coûte', () => {
    const set = engaged(5);
    if (!set) return;
    const { state, mate } = set;
    const before = mate.relationship;
    expect(callOff(createCtx(state)).ok).toBe(true);
    expect(planOf(state)).toBeNull();
    expect(mate.relationship).toBeLessThan(before);
    expect(mate.maritalStatus).toBe('single');
  });
});

describe('les trois côtés', () => {
  it('opposent l’argent, les places et les gens', () => {
    /*
     * Mesuré sur trente vies, liste remplie au plus proche à chaque fois :
     *
     *     mairie   + traiteur :      755 · 35,0 proches dehors sur 38,9
     *     salle    + traiteur :   12 805 ·  1,6
     *     domaine  + traiteur :   42 511 ·  0,0
     *     plage    + traiteur :   59 970 · 14,0
     *
     * Aucun lieu ne gagne sur les trois axes : la plage est la plus chère
     * **et** laisse quatorze personnes dehors, faute de places.
     */
    const rows = VENUES.map((venue) => {
      let cost = 0;
      let out = 0;
      let n = 0;
      for (let seed = 1; seed <= 20; seed++) {
        const set = engaged(seed * 7);
        if (!set) continue;
        n += 1;
        setVenue(createCtx(set.state), venue.id);
        setSpread(createCtx(set.state), 'traiteur');
        inviteClosest(createCtx(set.state));
        cost += costOf(set.state);
        out += leftOut(set.state);
      }
      return { venue, cost: cost / n, out: out / n };
    });

    const mairie = rows.find((r) => r.venue.id === 'mairie')!;
    const domaine = rows.find((r) => r.venue.id === 'domaine')!;
    const plage = rows.find((r) => r.venue.id === 'plage')!;

    // Le moins cher laisse le plus de monde dehors…
    expect(mairie.cost).toBeLessThan(domaine.cost);
    expect(mairie.out).toBeGreaterThan(domaine.out + 10);
    // …et le plus cher n'est pas celui qui accueille le mieux.
    expect(plage.cost).toBeGreaterThan(domaine.cost);
    expect(plage.out).toBeGreaterThan(domaine.out);
  });

  it('fait payer le repas par tête, donc inviter coûte', () => {
    const set = engaged(11);
    if (!set) return;
    const { state } = set;
    setVenue(createCtx(state), 'domaine');
    setSpread(createCtx(state), 'faste');
    const empty = costOf(state);
    inviteClosest(createCtx(state));
    // Sans cela, on inviterait tout le monde sans y penser et il n'y aurait
    // rien à arbitrer entre recevoir bien et recevoir large.
    expect(costOf(state)).toBeGreaterThan(empty);
    expect(planOf(state)!.guestIds.length).toBeGreaterThan(0);
  });

  it('borne la liste au lieu, et rétrécir emporte des invités', () => {
    const set = engaged(13);
    if (!set) return;
    const { state } = set;
    setVenue(createCtx(state), 'domaine');
    inviteClosest(createCtx(state));
    const many = planOf(state)!.guestIds.length;
    expect(many).toBeGreaterThan(getVenue('mairie')!.seats);

    const result = setVenue(createCtx(state), 'mairie');
    expect(result.ok).toBe(true);
    expect(result.tone).toBe('bad');
    expect(planOf(state)!.guestIds.length).toBe(getVenue('mairie')!.seats);
    expect(seatsLeft(state)).toBe(0);
    // Et l'écran le dit, plutôt que de laisser une liste impossible.
    expect(result.message).toContain('sautent');
  });
});

describe('le jour', () => {
  it('rapproche ceux qui sont venus et éloigne ceux qui n’y étaient pas', () => {
    /*
     * **La règle qui fait la décision.** Sans elle, la mairie à quatre places
     * serait toujours le bon calcul : ne pas inviter ne coûterait rien.
     * Mesuré : au domaine, lien moyen des proches +7,0 et personne dehors ; à
     * la mairie, −4,2 et trente-deux personnes dehors.
     */
    const measure = (venueId: string) => {
      let delta = 0;
      let out = 0;
      let n = 0;
      for (let seed = 1; seed <= 20; seed++) {
        const set = engaged(seed * 11);
        if (!set) continue;
        n += 1;
        const { state } = set;
        setVenue(createCtx(state), venueId);
        setSpread(createCtx(state), 'traiteur');
        inviteClosest(createCtx(state));
        const before = wouldNotice(state).map((x) => [x.id, x.relationship] as const);
        out += leftOut(state);
        hold(createCtx(state));
        let sum = 0;
        for (const [id, was] of before) sum += (state.npcs[id]?.relationship ?? was) - was;
        delta += sum / Math.max(1, before.length);
      }
      return { delta: delta / n, out: out / n };
    };
    const small = measure('mairie');
    const big = measure('domaine');
    expect(big.delta).toBeGreaterThan(small.delta + 5);
    expect(small.out).toBeGreaterThan(big.out + 10);
    expect(small.delta).toBeLessThan(0);
  });

  it('marie pour de bon, et une seule fois', () => {
    const set = engaged(17);
    if (!set) return;
    const { state, mate } = set;
    setVenue(createCtx(state), 'salle');
    inviteClosest(createCtx(state));
    const before = state.player.money;

    expect(hold(createCtx(state)).ok).toBe(true);
    expect(mate.relation).toBe('spouse');
    expect(mate.maritalStatus).toBe('married');
    expect(state.player.money).toBeLessThan(before);
    expect(planOf(state)!.done).toBe(true);
    // Et on ne recommence pas.
    expect(hold(createCtx(state)).ok).toBe(false);
  });

  it('ne se monte pas en un jour', () => {
    const state = createNewLife({ seed: 19 });
    for (let i = 0; i < 30 && !state.gameOver; i++) simulateYear(state);
    if (state.gameOver) return;
    const mate = createPerson(createCtx(state), { relation: 'partner', age: 30 });
    betroth(createCtx(state), mate);
    state.player.money = 3_000_000;
    // L'année de la demande, la noce ne peut pas avoir lieu : c'est ce qui
    // laisse le temps de décider, et à la vie de s'en mêler.
    expect(weddingBlocker(state)).toContain('un jour');
    state.year += PLANNING;
    expect(weddingBlocker(state)).toBeNull();
  });

  it('reste possible même sans un sou', () => {
    /*
     * Mesuré sur quarante vies autopilotées : l'argent médian à trente ans
     * vaut **zéro**. Une salle des fêtes est donc hors de portée de la moitié
     * des joueurs et un domaine de presque tous — ce qui rend la noce un vrai
     * arbitrage financier plutôt qu'un choix de décorateur. Mais il faut qu'un
     * mariage reste toujours possible, sinon les fiançailles seraient un piège
     * dont on ne sortirait jamais.
     */
    const set = engaged(23, 0);
    if (!set) return;
    const { state } = set;
    state.player.money = 200;
    setVenue(createCtx(state), 'mairie');
    setSpread(createCtx(state), 'rien');
    expect(weddingBlocker(state)).toBeNull();
    expect(hold(createCtx(state)).ok).toBe(true);
  });
});

describe('l’écran', () => {
  it('montre les trois côtés ensemble', () => {
    const source = readFileSync(
      new URL('../../screens/WeddingScreen.tsx', import.meta.url).pathname, 'utf8',
    );
    // Le prix, les places et — surtout — ceux qui resteraient dehors : le seul
    // chiffre que le joueur ne penserait pas à calculer.
    expect(source).toContain('costOf');
    expect(source).toContain('seatsLeft');
    expect(source).toContain('leftOut');
    expect(source).toContain('callOff');
  });

  it('n’apparaît qu’entre le oui et le jour', () => {
    const state = createNewLife({ seed: 29 });
    expect(planOf(state)).toBeNull();
    const source = readFileSync(
      new URL('../../screens/RelationshipsScreen.tsx', import.meta.url).pathname, 'utf8',
    );
    expect(source).toContain('!weddingOf(state)!.done');
  });
});

describe('ce que la liste retient', () => {
  it('ne propose que des gens qui existent, et les plus proches d’abord', () => {
    const set = engaged(31);
    if (!set) return;
    const { state } = set;
    const pool = guestPool(state);
    expect(pool.length).toBeGreaterThan(3);
    for (let i = 1; i < pool.length; i++) {
      expect(pool[i]!.relationship).toBeLessThanOrEqual(pool[i - 1]!.relationship);
    }
    // Le fiancé n'est pas son propre invité.
    expect(pool.some((x) => x.id === planOf(state)!.partnerId)).toBe(false);

    // Inviter puis retirer : la liste se manipule dans les deux sens.
    setVenue(createCtx(state), 'salle');
    const first = pool[0]!;
    expect(invite(createCtx(state), first.id).ok).toBe(true);
    expect(planOf(state)!.guestIds).toContain(first.id);
    expect(invite(createCtx(state), first.id).ok).toBe(true);
    expect(planOf(state)!.guestIds).not.toContain(first.id);
  });

  it('offre autant de tables que de lieux, et aucune ne domine', () => {
    // Quatre lieux, quatre repas : les deux axes se croisent, et le moins cher
    // de chaque a une raison d'être choisi.
    expect(VENUES.length).toBeGreaterThan(3);
    expect(SPREADS.length).toBeGreaterThan(3);
    /*
     * **Plus cher ne veut pas dire plus de places.** Les places rangées par
     * prix croissant donnent 4, 40, 90, 25 : la plage est le lieu le plus cher
     * et n'en a que vingt-cinq. Sans cette entorse, le classement des lieux
     * serait un simple ordre de prix et choisir n'aurait aucun intérêt — on
     * prendrait le plus cher qu'on peut payer, comme pour les médecins d'avant.
     */
    const seatsByCost = [...VENUES].sort((a, b) => a.cost - b.cost).map((v) => v.seats);
    const ascending = [...seatsByCost].sort((a, b) => a - b);
    expect(seatsByCost).not.toEqual(ascending);
  });
});
