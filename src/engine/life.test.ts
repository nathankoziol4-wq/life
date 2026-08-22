/**
 * Parcours de vie : couple, mariage, enfants, séparation, activités,
 * possessions et immigration.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from './newLife.ts';
import { createCtx, type Ctx } from './context.ts';
import { simulateYear } from './simulateYear.ts';
import {
  currentPartner, divorce, interact, isMarried, marry, meetRomanticProspect,
  signPrenup, tryForBaby,
} from '../systems/relationships.ts';
import {
  adoptPetSpecies, buyItem, changeName, cosmeticSurgery, doSport,
  doWellness, getDrivingLicense, goOut, immigrate, playCasino, playLottery,
  sellValuable, takeVacation,
} from '../systems/activities.ts';
import { publish } from '../systems/social.ts';
import { advanceParenthood, fileOf, openFile, parenthoodOf } from '../systems/parenthood.ts';
import { profilesFor, writeTo } from '../systems/matching.ts';
import { consult, contractDisease, treatDisease } from '../systems/health.ts';
import { giveMoney } from '../systems/finance.ts';
import { eligibleEvents } from '../systems/randomEvents.ts';
import type { GameState, Person } from './types.ts';

function adult(seed: number, age = 28): GameState {
  const state = createNewLife({ seed, countryId: 'fr' });
  for (let i = 0; i < age; i++) simulateYear(state);
  state.player.money = 500_000;
  return state;
}

/** Met en couple le joueur avec un partenaire compatible, pour les tests. */
function pairUp(state: GameState): Person {
  const ctx = createCtx(state);
  const partner = meetRomanticProspect(ctx, 0.9);
  partner.orientation = 'bi';
  partner.sex = state.player.sex === 'M' ? 'F' : 'M';
  partner.relation = 'partner';
  partner.relationship = 90;
  partner.opinion = 90;
  partner.flags.togetherSince = state.year - 3;
  partner.stats.fertility = 95;
  partner.age = state.player.age;
  return partner;
}

describe('vie de couple', () => {
  it('mène du couple au mariage puis au divorce, avec partage des biens', () => {
    const state = adult(101);
    const partner = pairUp(state);
    marry(createCtx(state), partner);
    expect(isMarried(state)).toBe(true);

    const before = state.player.money;
    const result = divorce(createCtx(state), partner);
    expect(result.ok).toBe(true);
    expect(partner.relation).toBe('ex');
    expect(isMarried(state)).toBe(false);
    // Sans contrat de mariage, le patrimoine liquide est partagé.
    expect(state.player.money).toBeLessThan(before);
  });

  it('protège le patrimoine avec un contrat de mariage', () => {
    let protectedCount = 0;
    for (let seed = 0; seed < 25; seed++) {
      const state = adult(seed * 17 + 5);
      const partner = pairUp(state);
      partner.personality.discipline = 95;
      partner.personality.warmth = 10;
      signPrenup(createCtx(state));
      if (!state.player.flags.prenup) continue;
      marry(createCtx(state), partner);
      const before = state.player.money;
      divorce(createCtx(state), partner);
      // Le contrat signé, rien n'est prélevé au titre du partage.
      if (state.player.money === before) protectedCount += 1;
    }
    expect(protectedCount).toBeGreaterThan(0);
  });

  it('permet de concevoir un enfant qui grandit ensuite', () => {
    let born = 0;
    for (let seed = 0; seed < 30 && born === 0; seed++) {
      const state = adult(seed * 23 + 7, 26);
      const partner = pairUp(state);
      marry(createCtx(state), partner);
      state.player.stats.fertility = 95;
      for (let attempt = 0; attempt < 6; attempt++) {
        state.player.yearActions = {};
        tryForBaby(createCtx(state));
        simulateYear(state);
        const child = Object.values(state.npcs).find(
          (p) => p.relation === 'son' || p.relation === 'daughter',
        );
        if (child) {
          born += 1;
          expect(child.age).toBeLessThanOrEqual(2);
          expect(child.lastName).toBe(state.player.lastName);
          const ageBefore = child.age;
          simulateYear(state);
          expect(child.age).toBe(ageBefore + 1);
          break;
        }
      }
    }
    expect(born).toBe(1);
  });

  it('applique les interactions sociales dans les deux sens', () => {
    const state = adult(103);
    // La structure familiale varie d'une graine à l'autre : on prend le
    // premier adulte du foyer, quel que soit son rôle.
    const parentIds = state.player.origin.parents.map((r) => r.personId);
    const friend = Object.values(state.npcs).find((p) => p.alive && parentIds.includes(p.id))!;
    friend.relationship = 50;
    friend.personality.warmth = 90;
    friend.personality.temper = 10;

    interact(createCtx(state), friend.id, 'time');
    expect(friend.relationship).toBeGreaterThan(50);

    const high = friend.relationship;
    interact(createCtx(state), friend.id, 'insult');
    expect(friend.relationship).toBeLessThan(high);
  });

  it('limite le nombre d’interactions par an avec une même personne', () => {
    const state = adult(104);
    const mother = Object.values(state.npcs).find((p) => p.alive && p.relation === 'mother')!;
    for (let i = 0; i < 3; i++) interact(createCtx(state), mother.id, 'talk');
    expect(interact(createCtx(state), mother.id, 'talk').ok).toBe(false);
  });

  it('transfère réellement l’argent donné à un proche', () => {
    const state = adult(105);
    const mother = Object.values(state.npcs).find((p) => p.alive && p.relation === 'mother')!;
    const wealth = mother.wealth;
    giveMoney(createCtx(state), mother.id, 10_000);
    expect(mother.wealth).toBe(wealth + 10_000);
    expect(state.player.money).toBe(490_000);
  });

  it('permet l’adoption — par un dossier, plus par un tirage', () => {
    /*
     * Ce test appelait `adoptChild`, qui faisait un tirage et posait un enfant
     * dans la seconde. L'adoption passe maintenant par un dossier qui traverse
     * les années (`systems/parenthood.ts`), et c'est `origines.test.ts` et
     * `famille.test.ts` qui en vérifient le détail. Il reste ici ce que ce
     * fichier-ci a vocation à couvrir : la voie existe, et elle aboutit.
     */
    const state = adult(93, 30);
    state.player.stats.reputation = 95;
    state.player.money = 400_000;
    expect(openFile(createCtx(state), 'besoins').ok).toBe(true);
    for (let year = 0; year < 40 && parenthoodOf(state).arrived === 0; year++) {
      advanceParenthood(createCtx(state));
      state.year += 1;
      if (fileOf(state)?.stage === 'refusé') break;
    }
    const file = fileOf(state);
    // Deux issues seulement, et les deux sont des résultats de jeu : soit un
    // enfant est arrivé, soit l'enquête a refusé **en disant pourquoi**.
    if (file?.stage === 'refusé') {
      expect(file.refusedFor).toBeTruthy();
    } else {
      expect(parenthoodOf(state).arrived).toBeGreaterThan(0);
      expect(Object.values(state.npcs).some((x) => x.flags.adopted)).toBe(true);
    }
  });
});

describe('activités', () => {
  const run = (state: GameState, fn: (ctx: Ctx) => { ok: boolean }) => fn(createCtx(state));

  it('exécute chaque grande action sans erreur et débite le joueur', () => {
    const state = adult(201);
    const actions: [string, (ctx: Ctx) => { ok: boolean }][] = [
      // Le sport praticable dépend des équipements accessibles : la marche
      // n'en demande aucun, c'est le seul choix valable partout.
      ['sport', (c) => doSport(c, 'walk')],
      ['bien-être', (c) => doWellness(c, 'therapy')],
      ['chirurgie', (c) => cosmeticSurgery(c, 'teeth')],
      ['vacances', (c) => takeVacation(c, 'beach')],
      ['sortie', (c) => goOut(c, 'restaurant')],
      ['loterie', (c) => playLottery(c, 3)],
      ['casino', (c) => playCasino(c, 'blackjack', 500)],
      ['réseaux', (c) => publish(c, 'vitrine', 'soi')],
      ['animal', (c) => adoptPetSpecies(c, 'cat')],
      ['boutique', (c) => buyItem(c, 'watch')],
      ['permis', (c) => getDrivingLicense(c)],
      ['rencontre', (c) => writeTo(c, profilesFor(c.state)[0]!.id)],
      ['nom', (c) => changeName(c, 'Camille', 'Verlaine')],
      ['médecin', (c) => consult(c, 'gp')],
    ];
    for (const [label, action] of actions) {
      const result = run(state, action);
      expect(result.ok, `${label} a échoué`).toBe(true);
    }
    expect(state.player.money).toBeLessThan(500_000);
    expect(state.player.firstName).toBe('Camille');
    expect(state.player.pets).toHaveLength(1);
    expect(state.player.valuables).toHaveLength(1);
  });

  it('revend une possession et encaisse le produit', () => {
    const state = adult(202);
    buyItem(createCtx(state), 'watch');
    const item = state.player.valuables[0];
    const before = state.player.money;
    const result = sellValuable(createCtx(state), item.id, 'auction');
    expect(result.ok).toBe(true);
    expect(state.player.valuables).toHaveLength(0);
    expect(state.player.money).toBeGreaterThan(before);
  });

  it('soigne une maladie diagnostiquée contre paiement', () => {
    const state = adult(203);
    contractDisease(createCtx(state), 'diabetes');
    const disease = state.player.diseases.find((d) => d.id === 'diabetes')!;
    disease.diagnosed = true;
    const before = state.player.money;
    expect(treatDisease(createCtx(state), 'diabetes').ok).toBe(true);
    expect(disease.treated).toBe(true);
    expect(state.player.money).toBeLessThan(before);
  });

  it('fait émigrer le joueur et remet sa carrière à zéro', () => {
    let moved = 0;
    for (let seed = 0; seed < 25 && moved === 0; seed++) {
      const state = adult(seed * 37 + 9);
      state.player.education.level = 4;
      const result = immigrate(createCtx(state), 'ca');
      if (result.ok && result.tone === 'good') {
        moved += 1;
        expect(state.player.countryId).toBe('ca');
        expect(state.player.job).toBeNull();
        // Les diplômes suivent le joueur.
        expect(state.player.education.level).toBe(4);
      }
    }
    expect(moved).toBe(1);
  });

  it('refuse les actions inaccessibles au lieu de planter', () => {
    const state = createNewLife({ seed: 204 });
    for (let i = 0; i < 8; i++) simulateYear(state);
    // Un enfant de 8 ans n'a accès ni au casino, ni au permis, ni aux visas.
    expect(playCasino(createCtx(state), 'poker', 10).ok).toBe(false);
    expect(getDrivingLicense(createCtx(state)).ok).toBe(false);
    expect(immigrate(createCtx(state), 'us').ok).toBe(false);
    // L'application n'ouvre pas avant dix-huit ans : le premier profil de
    // la liste refuse, quel qu'il soit.
    expect(writeTo(createCtx(state), profilesFor(state)[0]!.id).ok).toBe(false);
  });
});

describe('cohérence du contexte', () => {
  it('ne propose jamais de situation d’adulte à un enfant', () => {
    // Mots-clés qui n'ont rien à faire dans la vie d'un enfant de 8 ans.
    const adultOnly = [
      'université', 'ton employeur', 'ton salaire', 'ton conjoint', 'divorce',
      'ton emploi', 'hypothèque', 'casino', 'ton mariage', 'ta retraite',
    ];
    const state = createNewLife({ seed: 301 });
    for (let i = 0; i < 8; i++) simulateYear(state);
    expect(state.player.age).toBe(8);

    const ctx = createCtx(state);
    const eligible = eligibleEvents(ctx);
    expect(eligible.length).toBeGreaterThan(3);
    for (const { event } of eligible) {
      const haystack = `${event.title} ${event.text}`.toLowerCase();
      for (const word of adultOnly) {
        expect(haystack.includes(word), `« ${event.id} » proposé à 8 ans : « ${word} »`).toBe(false);
      }
      // Et l'événement doit rester compatible avec l'âge déclaré.
      expect(event.cond?.minAge ?? 0).toBeLessThanOrEqual(8);
    }
  });

  it('garde un vivier d’événements fourni à tous les âges de la vie', () => {
    // Une vie ne doit jamais tourner à vide, même sans emploi ni famille.
    for (const age of [8, 16, 25, 35, 50, 70]) {
      const state = createNewLife({ seed: 302 });
      for (let i = 0; i < age; i++) simulateYear(state);
      if (!state.player.alive) continue;
      const pool = eligibleEvents(createCtx(state));
      expect(pool.length, `à ${age} ans, seulement ${pool.length} événements`).toBeGreaterThanOrEqual(10);
    }
  });

  it('garde un partenaire unique', () => {
    const state = adult(302);
    const a = pairUp(state);
    marry(createCtx(state), a);
    expect(currentPartner(state)?.id).toBe(a.id);
    const partners = Object.values(state.npcs).filter(
      (p) => p.alive && (p.relation === 'partner' || p.relation === 'spouse'),
    );
    expect(partners).toHaveLength(1);
  });
});
