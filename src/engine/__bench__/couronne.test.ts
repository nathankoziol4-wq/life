/**
 * La couronne.
 *
 * Le catalogue avait une feuille absente — « Royauté / Titre et succession » —
 * et le reproche portait sur un parcours de vie entier. Ce fichier vérifie les
 * quatre règles qui font que ce parcours n'est pas une carrière déguisée :
 *
 * 1. **la file décide, pas le mérite** : rien de ce que le joueur fait ne le
 *    fait monter d'une place, et ce qu'il fait de bien ne la lui garde même
 *    pas ;
 * 2. **les deux opinions ne se confondent pas** : celle qui porte sur vous
 *    bouge dix fois plus vite que celle qui porte sur l'institution, et c'est
 *    la lente qui tue ;
 * 3. **les trois portes ne mènent pas au même endroit** : naître, épouser et
 *    mériter donnent trois parties différentes, et une seule mène au trône ;
 * 4. **tout peut être retiré** : un casier, des scandales, un renoncement, et
 *    l'abolition qui ne retire rien à personne parce qu'il n'y a plus rien.
 *
 * Une cinquième chose est vérifiée séparément parce qu'elle est la plus facile
 * à casser sans s'en apercevoir : **la rente arrive sur le compte**. Le
 * système d'imposition retranche ce qu'il trouve dans les compteurs annuels ;
 * un revenu accumulé sans être crédité serait imposé et jamais versé.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { createCtx } from '../context.ts';
import { Rng } from '../rng.ts';
import { simulateYear } from '../simulateYear.ts';
import { autoResolve } from '../minigame.ts';
import type { Crown, GameState, RoyalKin } from '../types.ts';
import {
  abdicate, advanceRoyalty, aptitude, arbitrate, availableDuties, dutiesDone,
  disgrace, disgraceLimit, dutyBlocker, dutyContext, ennoble, ennobleBlocker,
  expectedDuties,
  fatigueOf, inCourt, inheritCrown, maybeBornRoyal, meritCount, performDuty, placeOf,
  presentationBlocker, reigns, royalEarnings, seekPresentation, stipendOf,
  succession, titleOf,
} from '../../systems/royalty.ts';
import {
  AFFAIRS, AFFAIR_MEMORY, COLLAPSE_LINE, COLLAPSE_YEARS, DISGRACE_LIMIT, DUTIES,
  HOUSES, TITLES,
  getTitle, titleForPlace, titleLabel,
} from '../../data/royalty.ts';
import { walkabout, type WalkaboutState } from '../../systems/minigames/walkabout.ts';

/* ------------------------------------------------------------------ */
/* Outils                                                              */
/* ------------------------------------------------------------------ */

/**
 * Une vie jouée jusqu'à un âge donné — **et vivante à l'arrivée**.
 *
 * `simulateYear` rend la main sans rien faire dès que le personnage est mort,
 * si bien qu'une graine malchanceuse produisait un enfant de quatorze ans là
 * où l'épreuve croyait avoir un adulte de trente. Une couronne n'attend alors
 * aucun engagement — on est sous l'âge des devoirs — et l'institution montait
 * au lieu de tomber. Le défaut ne s'est vu qu'après un décalage du hasard, et
 * il aurait pu se voir n'importe quand.
 */
function life(seed = 909, age = 30): GameState {
  const state = createNewLife({ seed, countryId: 'fr' });
  for (let i = 0; i < age && state.player.alive; i++) simulateYear(state);
  if (state.player.age < age) {
    state.player.alive = true;
    state.player.deathCause = null;
    state.player.deathYear = null;
    state.gameOver = false;
    state.year += age - state.player.age;
    state.player.age = age;
  }
  return state;
}

/** Une maison posée de force, pour tester la mécanique et non le tirage. */
function crownAt(state: GameState, place: number, entry: Crown['entry'] = 'naissance'): Crown {
  const line: RoyalKin[] = [];
  for (let i = 0; i < place; i++) {
    line.push({
      // Des âges étalés, comme les construit `buildLine` : une file dont tous
      // les membres ont soixante-dix ans ne fait que se vider, et l'on ne
      // testerait plus une succession mais un accident.
      id: `kin_${i}`, name: `Devant ${i}`, role: 'un cousin', age: Math.max(4, 74 - i * 21),
      alive: true, heir: true,
    });
  }
  line.push({
    id: 'kin_player', name: 'Toi', personId: 'player', role: 'toi',
    age: state.player.age, alive: true, heir: entry !== 'mariage' && entry !== 'anoblissement',
  });
  line.push({
    id: 'kin_cadet', name: 'Un cadet', role: 'un cousin', age: 12, alive: true, heir: true,
  });
  const crown: Crown = {
    houseId: 'valdorne',
    entry,
    since: state.year,
    titleId: titleForPlace(place),
    line,
    standing: 52,
    sentiment: 60,
    faltering: 0,
    duties: {},
    lifetimeDuties: 0,
    pending: null,
    record: [],
    earnedThisYear: 0,
    reigned: 0,
    removed: null,
    abolished: false,
  };
  state.player.crown = crown;
  return crown;
}

/* ------------------------------------------------------------------ */
/* Le catalogue                                                        */
/* ------------------------------------------------------------------ */

describe('la maison, sur le papier', () => {
  it('n’emprunte à aucune dynastie ni à aucun pays réel', () => {
    // La règle du cahier des charges : les royaumes sont fictifs, et le jeu ne
    // décrit jamais un pays existant comme une monarchie.
    for (const house of HOUSES) {
      expect(house.realm.length).toBeGreaterThan(3);
      expect(house.name).not.toMatch(/Windsor|Bourbon|Habsbourg|Orange|Saoud/i);
      expect(house.realm).not.toMatch(/Royaume-Uni|Espagne|Suède|Belgique|Japon|Maroc/i);
    }
    expect(new Set(HOUSES.map((h) => h.id)).size).toBe(HOUSES.length);
  });

  it('fait monter la rente et le devoir ensemble', () => {
    // Un rang qui rapporterait plus sans demander plus ne serait qu'un cadeau.
    const sorted = [...TITLES].sort((a, b) => a.rank - b.rank);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].stipend).toBeGreaterThan(sorted[i - 1].stipend);
      expect(sorted[i].expected).toBeGreaterThan(sorted[i - 1].expected);
      expect(sorted[i].weight).toBeGreaterThan(sorted[i - 1].weight);
    }
  });

  it('donne un titre différent à chaque étage de la file', () => {
    const seen = [0, 1, 3, 4, 8, 9, 16, 17].map(titleForPlace);
    expect(seen[0]).toBe('souverain');
    expect(new Set(seen).size).toBe(5);
    // La suite est décroissante : plus on est loin, moins on est quelque chose.
    const ranks = seen.map((id) => getTitle(id)?.rank ?? 0);
    for (let i = 1; i < ranks.length; i++) expect(ranks[i]).toBeLessThanOrEqual(ranks[i - 1]);
  });

  it('écrit les titres au féminin, tous sans exception', () => {
    for (const title of TITLES) {
      expect(titleLabel(title.id, 'F')).toBe(title.female);
      expect(titleLabel(title.id, 'M')).toBe(title.male);
      expect(title.female).not.toBe(title.male);
    }
  });

  it('n’offre aucun engagement sans contrepartie', () => {
    // Un devoir qui ne coûte rien serait le seul qu'on tiendrait.
    for (const duty of DUTIES) {
      expect(duty.cost + duty.strain).toBeGreaterThan(0);
      expect(duty.approval).toBeGreaterThan(0);
    }
    // Et le plus payant en opinion doit être parmi les plus chers ou les plus
    // durs : sinon l'arbitrage n'existe pas.
    const best = [...DUTIES].sort((a, b) => b.approval - a.approval)[0];
    const cheapest = [...DUTIES].sort((a, b) => (a.cost + a.strain / 60) - (b.cost + b.strain / 60))[0];
    expect(best.id).not.toBe(cheapest.id);
  });

  it('n’offre aucune affaire dont une option contente tout le monde', () => {
    // La même règle que pour les décisions de mandat, et pour la même raison :
    // une option sans perdant est celle qu'on prendrait chaque fois.
    for (const affair of AFFAIRS) {
      expect(affair.options.length).toBeGreaterThanOrEqual(3);
      for (const option of affair.options) {
        const wins = [
          option.approval > 0, option.sentiment > 0, option.cost < 0,
          option.karma > 0, option.family > 0,
        ].filter(Boolean).length;
        const losses = [
          option.approval < 0, option.sentiment < 0, option.cost > 0,
          option.karma < 0, option.family < 0,
        ].filter(Boolean).length;
        expect(losses, `${affair.id} / ${option.label}`).toBeGreaterThan(0);
        expect(wins, `${affair.id} / ${option.label}`).toBeGreaterThan(0);
      }
    }
  });

  it('demande des aptitudes différentes selon l’engagement', () => {
    // Huit devoirs qui liraient le même chiffre seraient huit habillages d'un
    // seul, et le choix n'existerait pas.
    expect(new Set(DUTIES.map((d) => d.asks)).size).toBeGreaterThanOrEqual(4);
  });
});

/* ------------------------------------------------------------------ */
/* Règle 1 — la file décide                                            */
/* ------------------------------------------------------------------ */

describe('l’ordre de succession', () => {
  it('se lit comme une liste, et le joueur y a une place', () => {
    const state = life();
    crownAt(state, 3);
    expect(placeOf(state)).toBe(3);
    expect(succession(state).length).toBe(5);
    expect(titleOf(state)?.id).toBe('prince');
  });

  it('ne bouge pas d’un cran quoi que le joueur fasse', () => {
    // Le cœur du système : aucune action ne rapproche du trône. Vingt
    // engagements parfaits laissent exactement à la même place.
    const state = life();
    crownAt(state, 4);
    const before = placeOf(state);
    state.player.money = 50_000_000;
    for (let i = 0; i < 20; i++) {
      const ctx = createCtx(state);
      performDuty(ctx, 'ruban');
      performDuty(ctx, 'oeuvre');
    }
    expect(placeOf(state)).toBe(before);
    expect(state.player.crown!.standing).toBeGreaterThan(52);
  });

  it('avance quand quelqu’un de devant s’en va, et pas autrement', () => {
    const state = life();
    const crown = crownAt(state, 3);
    expect(placeOf(state)).toBe(3);
    crown.line[0].alive = false;
    expect(placeOf(state)).toBe(2);
    crown.line[1].removed = 'abdication';
    expect(placeOf(state)).toBe(1);
  });

  it('recule quand un enfant naît plus près du trône', () => {
    // Un conjoint n'est pas dans la file ; ses enfants oui, et ils passent
    // devant la branche cadette.
    const state = life();
    const crown = crownAt(state, 2, 'mariage');
    const spouse = crown.line[1];
    spouse.role = 'ton conjoint';
    spouse.personId = 'npc_spouse';
    const cadetPlace = crown.line.findIndex((k) => k.id === 'kin_cadet');
    crown.line.splice(cadetPlace, 0, {
      id: 'kin_child', name: 'Un enfant', personId: 'npc_child', role: 'ton fils',
      age: 4, alive: true, heir: true,
    });
    const order = succession(state).map((k) => k.id);
    expect(order.indexOf('kin_child')).toBeLessThan(order.indexOf('kin_cadet'));
  });

  it('fait monter le titre en même temps que la place', () => {
    const state = life();
    const crown = crownAt(state, 5);
    expect(titleOf(state)?.id).toBe('duc');
    for (const kin of crown.line.slice(0, 4)) kin.alive = false;
    const ctx = createCtx(state);
    advanceRoyalty(ctx);
    expect(placeOf(state)).toBe(1);
    expect(crown.titleId).toBe('prince');
  });

  it('met sur le trône quand il n’y a plus personne devant', () => {
    const state = life();
    const crown = crownAt(state, 2);
    for (const kin of crown.line.slice(0, 2)) kin.alive = false;
    const ctx = createCtx(state);
    advanceRoyalty(ctx);
    expect(reigns(state)).toBe(true);
    expect(crown.titleId).toBe('souverain');
    expect(crown.record.some((r) => r.startsWith('Accession'))).toBe(true);
    expect(crown.reigned).toBe(1);
  });

  it('vide la file toute seule, pour qui tient son rang assez longtemps', () => {
    // Vérification mécanique : une file de vieux doit réellement avancer. Si
    // la mortalité était trop basse, personne n'accéderait jamais au trône et
    // tout le système serait décoratif.
    //
    // Le personnage tient ses engagements, sans quoi ce n'est pas la file
    // qu'on mesure : une couronne délaissée est abolie en quinze ans, et une
    // couronne abolie n'a plus de file du tout.
    let reached = 0;
    for (let seed = 0; seed < 40; seed++) {
      const state = life(seed + 4000, 25);
      crownAt(state, 3);
      state.player.money = 900_000_000;
      for (let i = 0; i < 45 && state.player.alive; i++) {
        const ctx = createCtx(state);
        for (const duty of availableDuties(state)) {
          if (dutiesDone(state) >= expectedDuties(state)) break;
          if (!dutyBlocker(state, duty)) performDuty(ctx, duty.id);
        }
        advanceRoyalty(createCtx(state));
        state.player.age += 1;
      }
      if (placeOf(state) === 0) reached += 1;
    }
    // Ni jamais, ni toujours : c'est une attente, pas une garantie.
    expect(reached).toBeGreaterThan(4);
    expect(reached).toBeLessThan(38);
  });
});

/* ------------------------------------------------------------------ */
/* Règle 2 — deux opinions                                             */
/* ------------------------------------------------------------------ */

describe('les deux opinions', () => {
  it('ne bougent pas à la même vitesse', () => {
    const state = life();
    const crown = crownAt(state, 4);
    state.player.money = 5_000_000;
    const standing0 = crown.standing;
    const sentiment0 = crown.sentiment;
    const ctx = createCtx(state);
    for (let i = 0; i < 4; i++) performDuty(ctx, 'discours');
    const dStanding = Math.abs(crown.standing - standing0);
    const dSentiment = Math.abs(crown.sentiment - sentiment0);
    expect(dStanding).toBeGreaterThan(0);
    // La lente est bien plus lente. Sans cela, une bonne année sauverait une
    // institution, et le système n'aurait aucun enjeu long.
    expect(dSentiment).toBeLessThan(dStanding / 2);
  });

  it('font peser un titre haut plus lourd sur l’institution', () => {
    // La même conduite, deux rangs : le souverain abîme davantage.
    const measure = (place: number) => {
      const state = life();
      const crown = crownAt(state, place);
      state.player.money = 20_000_000;
      const before = crown.sentiment;
      const ctx = createCtx(state);
      for (let i = 0; i < 3; i++) performDuty(ctx, 'oeuvre');
      return crown.sentiment - before;
    };
    expect(measure(0)).toBeGreaterThan(measure(12));
  });

  it('abolit la couronne quand le pays n’en veut plus assez longtemps', () => {
    const state = life();
    const crown = crownAt(state, 0);
    crown.sentiment = COLLAPSE_LINE - 5;
    for (let i = 0; i < COLLAPSE_YEARS; i++) {
      const ctx = createCtx(state);
      advanceRoyalty(ctx);
      // On ne fait rien, et le sentiment ne remonte pas tout seul assez vite.
      crown.sentiment = Math.min(crown.sentiment, COLLAPSE_LINE - 1);
    }
    expect(crown.abolished).toBe(true);
    expect(succession(state)).toEqual([]);
    expect(inCourt(state)).toBe(false);
    expect(stipendOf(state)).toBe(0);
  });

  it('ne l’abolit pas si le compte est interrompu', () => {
    // Une seule année au-dessus du seuil remet le compteur à zéro : la chute
    // doit être imputable à une conduite tenue, pas à un mauvais tirage.
    const state = life();
    const crown = crownAt(state, 0);
    crown.sentiment = COLLAPSE_LINE - 5;
    for (let i = 0; i < COLLAPSE_YEARS - 1; i++) {
      advanceRoyalty(createCtx(state));
      crown.sentiment = COLLAPSE_LINE - 1;
    }
    crown.sentiment = COLLAPSE_LINE + 10;
    advanceRoyalty(createCtx(state));
    expect(crown.faltering).toBe(0);
    expect(crown.abolished).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* Règle 3 — trois portes                                              */
/* ------------------------------------------------------------------ */

describe('les trois façons d’entrer', () => {
  it('ne s’ouvre à la naissance que pour une poignée de vies', () => {
    let royal = 0;
    for (let seed = 0; seed < 400; seed++) {
      const state = createNewLife({ seed: seed * 7 + 3, countryId: 'fr' });
      if (state.player.crown) royal += 1;
    }
    // Rare, et pas introuvable. Une vie sur cent environ.
    expect(royal).toBeGreaterThan(0);
    expect(royal).toBeLessThan(40);
  });

  it('ne fait jamais naître directement sur le trône', () => {
    // Commencer souverain ferait commencer la partie par sa fin.
    for (let seed = 0; seed < 600; seed++) {
      const state = createNewLife({ seed: seed * 13 + 1, countryId: 'fr' });
      if (state.player.crown) expect(placeOf(state)).toBeGreaterThan(0);
    }
  });

  it('n’anoblit jamais sur la seule fortune', () => {
    const state = life(31, 40);
    state.player.money = 900_000_000;
    state.player.stats.reputation = 100;
    // Aucun service rendu : la porte reste fermée quoi qu'il y ait sur le
    // compte. C'est la seule chose qui distingue un anobli d'un riche.
    state.player.veteran = null;
    state.player.chronicle.given = 0;
    state.player.chronicle.venturesRun = 0;
    state.player.fame.level = 0;
    state.player.education.level = 0;
    delete state.player.flags.heldOffice;
    expect(meritCount(state)).toBeLessThan(3);
    expect(ennobleBlocker(state)).not.toBeNull();
    expect(ennoble(createCtx(state)).ok).toBe(false);
  });

  it('anoblit qui a rendu des services, et ne met personne dans la file', () => {
    const state = life(31, 40);
    state.player.stats.reputation = 90;
    state.player.flags.heldOffice = true;
    state.player.education.level = 4;
    state.player.fame.level = 55;
    state.player.fame.goodwill = 70;
    expect(ennobleBlocker(state)).toBeNull();
    const result = ennoble(createCtx(state));
    expect(result.ok).toBe(true);
    expect(state.player.crown?.entry).toBe('anoblissement');
    // Un titre, une rente, des engagements — et aucune place.
    expect(placeOf(state)).toBe(-1);
    expect(succession(state)).toEqual([]);
    expect(stipendOf(state)).toBeGreaterThan(0);
    expect(availableDuties(state).length).toBeGreaterThan(0);
  });

  it('fait entrer par le mariage sans donner de place', () => {
    const state = life(77, 34);
    state.player.money = 40_000_000;
    state.player.stats.reputation = 80;
    expect(presentationBlocker(state)).toBeNull();
    const ctx = createCtx(state);
    expect(seekPresentation(ctx).ok).toBe(true);
    const royal = Object.values(state.npcs).find((n) => n.flags.royalHouse);
    expect(royal).toBeDefined();
    // On se marie comme on se marie toujours ; la couronne le remarque après.
    royal!.relation = 'spouse';
    advanceRoyalty(createCtx(state));
    expect(state.player.crown?.entry).toBe('mariage');
    expect(placeOf(state)).toBe(-1);
    expect(succession(state).length).toBeGreaterThan(0);
  });

  it('présente quelqu’un que le personnage peut réellement épouser', () => {
    // Une présentation ne se demande qu'une fois dans une vie. Tirer le sexe
    // au hasard fermait donc la porte du mariage pour de bon à une vie sur
    // deux, sans jamais le dire.
    for (const orientation of ['hetero', 'homo'] as const) {
      const state = life(91, 34);
      state.player.orientation = orientation;
      state.player.money = 40_000_000;
      state.player.stats.reputation = 80;
      expect(seekPresentation(createCtx(state)).ok).toBe(true);
      const royal = Object.values(state.npcs).find((n) => n.flags.royalHouse)!;
      expect(royal.sex === state.player.sex).toBe(orientation === 'homo');
    }
  });

  it('ne présente pas quelqu’un qui a un casier', () => {
    const state = life(77, 34);
    state.player.money = 40_000_000;
    state.player.stats.reputation = 90;
    state.player.criminalRecord.convictions.push({
      crimeId: 'vol', year: state.year, sentenceYears: 1, fine: 0, label: 'Vol',
    } as never);
    expect(presentationBlocker(state)).not.toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Les engagements                                                     */
/* ------------------------------------------------------------------ */

describe('tenir son rang', () => {
  it('attend davantage d’un rang plus haut', () => {
    const state = life();
    crownAt(state, 14);
    const low = expectedDuties(state);
    crownAt(state, 0);
    expect(expectedDuties(state)).toBeGreaterThan(low);
  });

  it('punit l’année où l’on n’a rien tenu', () => {
    const state = life();
    const crown = crownAt(state, 1);
    const before = crown.standing;
    advanceRoyalty(createCtx(state));
    expect(crown.standing).toBeLessThan(before);
  });

  it('récompense l’année où l’on a tenu son quota', () => {
    const state = life();
    const crown = crownAt(state, 6);
    state.player.money = 20_000_000;
    const ctx = createCtx(state);
    for (const id of ['ruban', 'bain', 'oeuvre', 'ceremonie']) performDuty(ctx, id);
    const held = crown.standing;
    advanceRoyalty(createCtx(state));
    // Le quota rempli, l'année ne coûte rien : la perte vient du seul retour
    // au milieu, pas d'une sanction.
    expect(crown.standing).toBeGreaterThan(held - 3);
  });

  it('rend le même engagement moins efficace à chaque fois', () => {
    const state = life();
    const crown = crownAt(state, 4);
    state.player.money = 20_000_000;
    expect(fatigueOf(state, DUTIES[0])).toBe(1);
    const ctx = createCtx(state);
    performDuty(ctx, 'ruban');
    const second = fatigueOf(state, DUTIES.find((d) => d.id === 'ruban')!);
    expect(second).toBeLessThan(1);
    for (let i = 0; i < 6; i++) performDuty(ctx, 'ruban');
    // Il ne tombe jamais à zéro : couper un ruban reste couper un ruban.
    expect(fatigueOf(state, DUTIES.find((d) => d.id === 'ruban')!)).toBeGreaterThan(0.2);
    expect(crown.duties.ruban).toBeGreaterThan(1);
  });

  it('ferme les engagements que le rang n’ouvre pas', () => {
    const state = life();
    crownAt(state, 20);
    expect(titleOf(state)?.rank).toBe(1);
    const visit = DUTIES.find((d) => d.id === 'visite')!;
    expect(availableDuties(state).some((d) => d.id === 'visite')).toBe(false);
    expect(dutyBlocker(state, visit)).not.toBeNull();
  });

  it('lit des aptitudes différentes pour deux exercices différents', () => {
    const state = life();
    const p = state.player;
    p.stats.discipline = 95;
    p.stats.looks = 10;
    p.psyche.communication.warmth = 10;
    p.psyche.communication.expressiveness = 10;
    p.psyche.communication.composure = 90;
    p.psyche.communication.tact = 90;
    expect(aptitude(state, 'tenue')).toBeGreaterThan(aptitude(state, 'présence') + 25);
  });

  it('fait mieux quand on joue bien que quand on joue mal', () => {
    // La règle du §2 sur les mini-jeux : le joueur doit compter.
    const measure = (quality: number) => {
      const state = life();
      const crown = crownAt(state, 3);
      state.player.money = 20_000_000;
      performDuty(createCtx(state), 'bain', {
        success: quality > 0.5, score: 0, quality, mistakes: 0, time: 20_000,
      });
      return crown.standing;
    };
    expect(measure(0.95)).toBeGreaterThan(measure(0.05) + 4);
  });

  it('ne punit pas celui qui ne joue pas', () => {
    // La règle du §3 : `autoResolve` doit rester un chemin honnête.
    const state = life();
    const crown = crownAt(state, 3);
    state.player.money = 20_000_000;
    const before = crown.standing;
    performDuty(createCtx(state), 'bain');
    expect(crown.standing).toBeGreaterThan(before);
  });
});

/* ------------------------------------------------------------------ */
/* Les affaires                                                        */
/* ------------------------------------------------------------------ */

describe('trancher', () => {
  it('déplace les deux opinions et les proches', () => {
    const state = life(505, 40);
    const crown = crownAt(state, 0);
    crown.pending = 'referendum';
    // Quelqu'un de proche, pour vérifier que la famille encaisse.
    const kin = Object.values(state.npcs).find((n) => n.alive && n.relation === 'mother')
      ?? Object.values(state.npcs).find((n) => n.alive);
    const before = kin ? kin.relationship : 0;
    const standing = crown.standing;
    const result = arbitrate(createCtx(state), 0);
    expect(result.ok).toBe(true);
    expect(crown.standing).toBeGreaterThan(standing);
    expect(crown.pending).toBeNull();
    expect(crown.record.length).toBe(1);
    if (kin && ['mother', 'father', 'spouse', 'son', 'daughter', 'brother', 'sister'].includes(kin.relation)) {
      expect(kin.relationship).toBeLessThan(before);
    }
  });

  it('fait payer le silence', () => {
    const state = life();
    const crown = crownAt(state, 0);
    crown.pending = 'greve';
    const before = crown.standing;
    advanceRoyalty(createCtx(state));
    expect(crown.standing).toBeLessThan(before);
    expect(crown.record.some((r) => r.includes('sans réponse'))).toBe(true);
  });

  it('ne repose pas une affaire qu’on vient de trancher, et la ressort plus tard', () => {
    // Deux exigences opposées, et il faut les deux. Reposer la même question
    // deux années de suite serait ridicule ; l'interdire à vie laissait les
    // trois dernières décennies d'un règne sans une seule décision à prendre,
    // ce qu'une mesure sur deux cent quatre-vingt-huit vies royales a montré.
    const state = life();
    const crown = crownAt(state, 0);
    state.player.money = 900_000_000;
    const posed: string[] = [];
    for (let i = 0; i < 40; i++) {
      const ctx = createCtx(state);
      for (const d of availableDuties(state)) {
        if (dutiesDone(state) >= expectedDuties(state)) break;
        if (!dutyBlocker(state, d)) performDuty(ctx, d.id);
      }
      advanceRoyalty(createCtx(state));
      if (crown.pending) {
        posed.push(crown.pending);
        arbitrate(createCtx(state), 1);
      }
    }
    // On en a posé bien plus qu'il n'existe d'affaires : elles reviennent.
    expect(posed.length).toBeGreaterThan(AFFAIRS.length);
    // Et jamais deux fois dans une même fenêtre de mémoire.
    for (let i = 1; i < posed.length; i++) {
      const window = posed.slice(Math.max(0, i - AFFAIR_MEMORY), i);
      expect(window, `${posed[i]} reposée trop tôt`).not.toContain(posed[i]);
    }
  });
});

/* ------------------------------------------------------------------ */
/* Règle 4 — tout peut être retiré                                     */
/* ------------------------------------------------------------------ */

describe('perdre son rang', () => {
  it('écarte celui qui est condamné', () => {
    const state = life();
    const crown = crownAt(state, 2);
    state.player.criminalRecord.convictions.push({
      crimeId: 'vol', year: state.year, sentenceYears: 2, fine: 0, label: 'Vol',
    } as never);
    advanceRoyalty(createCtx(state));
    expect(crown.removed).toBe('condamnation');
    expect(placeOf(state)).toBe(-1);
    expect(inCourt(state)).toBe(false);
    expect(stipendOf(state)).toBe(0);
  });

  it('écarte pour une disgrâce soutenue, jamais pour un scandale isolé', () => {
    const state = life();
    const crown = crownAt(state, 2);
    const scandal = (year: number, weight: number) => ({
      id: 'x', kindId: 'x', year, weight, answered: null,
    });
    // Une affaire lourde, seule : rien.
    state.player.fame.scandals.push(scandal(state.year, 55));
    advanceRoyalty(createCtx(state));
    expect(crown.removed).toBeNull();
    expect(disgrace(state)).toBe(55);
    // Des affaires lourdes mais anciennes : rien non plus. C'est le défaut
    // qu'une mesure sur deux cents vies royales avait révélé — additionner
    // les scandales d'une vie entière écartait quatre-vingt-huit pour cent
    // des titulaires.
    state.player.fame.scandals.push(scandal(state.year - 30, 60));
    state.player.fame.scandals.push(scandal(state.year - 22, 60));
    advanceRoyalty(createCtx(state));
    expect(crown.removed).toBeNull();
    // Rapprochées, elles écartent.
    state.player.fame.scandals.push(scandal(state.year, 60));
    expect(disgrace(state)).toBeGreaterThanOrEqual(DISGRACE_LIMIT);
    advanceRoyalty(createCtx(state));
    expect(crown.removed).toBe('scandale');
  });

  it('laisse partir, et ne laisse pas revenir', () => {
    const state = life();
    const crown = crownAt(state, 1);
    expect(titleOf(state)?.id).toBe('prince');
    const result = abdicate(createCtx(state));
    expect(result.ok).toBe(true);
    expect(placeOf(state)).toBe(-1);
    // On descend de deux rangs, et la place ne se reprend pas — même si tout
    // le monde devant meurt.
    expect(getTitle(crown.titleId)?.rank).toBe(2);
    for (const kin of crown.line) if (kin.personId !== 'player') kin.alive = false;
    advanceRoyalty(createCtx(state));
    expect(reigns(state)).toBe(false);
  });

  it('protège qui sert la maison, et lâche qui ne lui sert plus', () => {
    // L'exclusion doit s'éviter en jouant. Sans cela elle n'est qu'un tirage
    // sur la notoriété, et la conduite ne compte pour rien.
    const state = life();
    const crown = crownAt(state, 2);
    crown.standing = 20;
    crown.lifetimeDuties = 0;
    const fragile = disgraceLimit(state);
    crown.standing = 88;
    crown.lifetimeDuties = 40;
    expect(disgraceLimit(state)).toBeGreaterThan(fragile * 1.4);
  });

  it('ne rend pas un cousin de la maison aussi connu qu’une vedette', () => {
    // Le défaut mesuré : le titre ajoutait de la notoriété chaque année sans
    // plafond, tout titulaire finissait à cent, et le système de renommée
    // écartait ensuite les trois quarts d'entre eux pour disgrâce. Le rang
    // décide du niveau où l'on se stabilise, pas d'une rente de célébrité.
    const state = life();
    crownAt(state, 14);
    expect(titleOf(state)?.id).toBe('comte');
    // Les deux tiennent leur rang : sans cela on comparerait deux couronnes
    // en train de tomber, pas deux niveaux d'exposition.
    const run = (g: GameState) => {
      g.player.fame.level = 0;
      g.player.money = 900_000_000;
      for (let i = 0; i < 60; i++) {
        const ctx = createCtx(g);
        for (const duty of availableDuties(g)) {
          if (dutiesDone(g) >= expectedDuties(g)) break;
          if (!dutyBlocker(g, duty)) performDuty(ctx, duty.id);
        }
        advanceRoyalty(createCtx(g));
      }
      return g.player.fame.level;
    };
    expect(run(state)).toBeLessThan(20);
    // Le souverain, lui, est réellement exposé : c'est le rang qui expose,
    // et non le nombre d'années passées à le porter.
    const other = life(4321, 30);
    crownAt(other, 0);
    expect(run(other)).toBeGreaterThan(30);
  });

  it('ne verse plus rien à qui a été écarté', () => {
    const state = life();
    const crown = crownAt(state, 1);
    crown.removed = 'condamnation';
    const before = state.player.money;
    advanceRoyalty(createCtx(state));
    expect(state.player.money).toBe(before);
    expect(royalEarnings(state)).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/* L'argent                                                            */
/* ------------------------------------------------------------------ */

describe('la rente', () => {
  it('arrive sur le compte, et pas seulement dans un compteur', () => {
    // Le piège du motif d'accumulation : le bilan financier retranche
    // `royalEarnings` de l'encaissement parce qu'il suppose l'argent déjà
    // crédité. Un système qui accumulerait sans créditer serait imposé et
    // jamais versé.
    const state = life();
    crownAt(state, 1);
    const before = state.player.money;
    advanceRoyalty(createCtx(state));
    expect(state.player.money).toBeGreaterThan(before);
    expect(royalEarnings(state)).toBe(state.player.money - before);
  });

  it('coûte ce que les engagements coûtent', () => {
    const state = life();
    crownAt(state, 0);
    state.player.money = 50_000_000;
    const before = state.player.money;
    performDuty(createCtx(state), 'oeuvre');
    expect(state.player.money).toBeLessThan(before);
  });

  it('ne laisse pas tenir un engagement qu’on ne peut pas financer', () => {
    const state = life();
    crownAt(state, 0);
    state.player.money = 0;
    const oeuvre = DUTIES.find((d) => d.id === 'oeuvre')!;
    expect(dutyBlocker(state, oeuvre)).not.toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Ce qui passe à la génération suivante                               */
/* ------------------------------------------------------------------ */

describe('la transmission', () => {
  it('fait monter l’héritier du rang que la mort libère', () => {
    const state = life();
    const crown = crownAt(state, 2);
    crown.line.splice(3, 0, {
      id: 'kin_child', name: 'L’enfant', personId: 'npc_child', role: 'ton fils',
      age: 10, alive: true, heir: true,
    });
    const passed = inheritCrown(state, 'npc_child');
    expect(passed).not.toBeNull();
    // Le parent quitte la file ; l'enfant prend exactement sa place.
    expect(passed!.line.find((k) => k.role === 'ton ascendant')?.alive).toBe(false);
    const place = passed!.line.filter((k) => k.heir && k.alive && !k.removed)
      .findIndex((k) => k.personId === 'player');
    expect(place).toBe(2);
  });

  it('transmet le sentiment du pays et pas ce qu’on pensait de toi', () => {
    const state = life();
    const crown = crownAt(state, 2);
    crown.standing = 96;
    crown.sentiment = 31;
    crown.line.splice(3, 0, {
      id: 'kin_child', name: 'L’enfant', personId: 'npc_child', role: 'ton fils',
      age: 10, alive: true, heir: true,
    });
    const passed = inheritCrown(state, 'npc_child')!;
    expect(passed.sentiment).toBe(31);
    // L'enfant n'est pas son parent : il repart près du milieu.
    expect(passed.standing).toBeLessThan(70);
    expect(passed.reigned).toBe(0);
    expect(passed.record).toEqual([]);
  });

  it('ne transmet rien d’une couronne abolie ni d’un rang retiré', () => {
    const state = life();
    const crown = crownAt(state, 2);
    crown.line.splice(3, 0, {
      id: 'kin_child', name: 'L’enfant', personId: 'npc_child', role: 'ton fils',
      age: 10, alive: true, heir: true,
    });
    crown.abolished = true;
    expect(inheritCrown(state, 'npc_child')).toBeNull();
    crown.abolished = false;
    crown.removed = 'condamnation';
    expect(inheritCrown(state, 'npc_child')).toBeNull();
  });

  it('éteint un titre d’anobli en trois générations', () => {
    // Un nom qui vaut un rang de moins à chaque fois : au bout du compte il ne
    // reste rien, et c'est ce qui distingue une noblesse d'une dynastie.
    const state = life();
    const crown = crownAt(state, 5, 'anoblissement');
    crown.titleId = 'duc';
    crown.line = [crown.line.find((k) => k.personId === 'player')!];
    crown.line[0].heir = false;

    const first = inheritCrown(state, 'inconnu')!;
    expect(first.titleId).toBe('comte');
    state.player.crown = first;
    const second = inheritCrown(state, 'inconnu')!;
    expect(second.titleId).toBe('baron');
    state.player.crown = second;
    expect(inheritCrown(state, 'inconnu')).toBeNull();
  });

  it('inscrit les enfants du joueur dans la file quand elle se transmet', () => {
    const state = life(212, 30);
    const crown = crownAt(state, 3);
    const ctx = createCtx(state);
    const child = Object.values(state.npcs).find((n) => n.relation === 'son' || n.relation === 'daughter');
    if (!child) {
      // Pas d'enfant dans cette vie : on en pose un, c'est la file qu'on teste.
      state.idCounter += 1;
      const id = `p_${state.idCounter}`;
      state.npcs[id] = {
        ...Object.values(state.npcs)[0], id, relation: 'son', alive: true, age: 3,
      };
    }
    advanceRoyalty(ctx);
    const kid = crown.line.find((k) => k.role === 'ton fils' || k.role === 'ta fille');
    expect(kid).toBeDefined();
    expect(kid!.heir).toBe(true);
  });

  it('n’inscrit jamais les enfants d’un anobli', () => {
    const state = life(212, 30);
    const crown = crownAt(state, 5, 'anoblissement');
    crown.line = [crown.line.find((k) => k.personId === 'player')!];
    state.idCounter += 1;
    const id = `p_${state.idCounter}`;
    state.npcs[id] = {
      ...Object.values(state.npcs)[0], id, relation: 'daughter', alive: true, age: 6,
    };
    advanceRoyalty(createCtx(state));
    const kid = crown.line.find((k) => k.personId === id);
    expect(kid?.heir).toBe(false);
    expect(succession(state)).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/* La haie                                                             */
/* ------------------------------------------------------------------ */

/** Fait tourner une partie avec une politique donnée. */
function play(
  seed: number,
  policy: (s: WalkaboutState, t: number) => { hold?: boolean; tap?: boolean; quit?: boolean },
  difficulty = 45,
): WalkaboutState {
  const ctx = {
    skill: 50, difficulty, mode: 'normal' as const,
    grace: { time: 1, pressure: 1, tolerance: 30, insight: false },
  };
  let s = walkabout.setup(new Rng({ rngState: seed }), ctx);
  let t = 0;
  while (!walkabout.finished(s) && t < 200_000) {
    s = walkabout.step(s, policy(s, t), 40);
    t += 40;
  }
  return s;
}

/** Le plus proche à portée, du point de vue d'un joueur. */
function inReach(s: WalkaboutState) {
  return s.people.find((one) => Math.abs(one.at - s.pos) <= 0.03 && one.given < 0.99);
}

describe('la haie', () => {
  it('n’avance pas quand on reste, et avance quand on relâche', () => {
    const still = play(1, () => ({ hold: true }));
    const walking = play(1, () => ({}));
    expect(still.pos).toBeLessThan(0.12);
    expect(walking.arrived).toBe(true);
  });

  it('laisse traverser sans parler à personne, et ne l’appelle pas une réussite', () => {
    const s = play(2, () => ({}));
    expect(s.arrived).toBe(true);
    const result = walkabout.score(s);
    expect(result.success).toBe(false);
    // Ce n'est pas nul non plus : on a fait le trajet.
    expect(result.quality).toBeGreaterThan(0.2);
  });

  it('récompense celui qui choisit, et pas celui qui s’arrête partout', () => {
    // Le cœur du jeu : le temps est la seule ressource, et vouloir tout le
    // monde fait manquer la fin.
    let chooser = 0;
    let greedy = 0;
    for (let seed = 1; seed <= 12; seed++) {
      // Celui qui choisit : il s'arrête pour un sur deux, et repart.
      const picked = play(seed, (s) => {
        const near = inReach(s);
        if (!near) return {};
        const index = s.people.indexOf(near);
        return index % 2 === 0 ? { hold: true } : { tap: true };
      });
      // Le gourmand : il s'arrête devant tout le monde et n'arrive jamais.
      const all = play(seed, (s) => (inReach(s) ? { hold: true } : {}));
      chooser += walkabout.score(picked).quality;
      greedy += walkabout.score(all).quality;
    }
    expect(chooser / 12).toBeGreaterThan(greedy / 12);
  });

  it('vaut plus de rester que de serrer une main', () => {
    const quick = play(5, (s) => (inReach(s) ? { tap: true } : {}));
    const deep = play(5, (s) => {
      const near = inReach(s);
      if (!near) return {};
      return s.people.indexOf(near) % 3 === 0 ? { hold: true } : {};
    });
    const shareOf = (s: WalkaboutState) => {
      const total = s.people.reduce((sum, o) => sum + o.worth, 0);
      return s.people.reduce((sum, o) => sum + o.worth * o.given, 0) / total;
    };
    // Une poignée de main plafonne ; rester va jusqu'au bout.
    expect(Math.max(...quick.people.map((o) => o.given))).toBeLessThan(0.5);
    expect(Math.max(...deep.people.map((o) => o.given))).toBeGreaterThan(0.9);
    expect(shareOf(quick)).toBeGreaterThan(0);
  });

  it('compte les mains tendues dans le vide', () => {
    const s = play(9, () => ({ tap: true }));
    expect(s.fumbles).toBeGreaterThan(0);
    expect(walkabout.score(s).mistakes).toBe(s.fumbles);
  });

  it('met plus de monde quand c’est plus dur', () => {
    const easy = play(3, () => ({}), 5);
    const hard = play(3, () => ({}), 95);
    expect(hard.people.length).toBeGreaterThan(easy.people.length);
  });

  it('se laisse abandonner sans planter', () => {
    const s = play(4, (_s, t) => (t > 4_000 ? { quit: true } : {}));
    expect(s.quit).toBe(true);
    expect(walkabout.finished(s)).toBe(true);
    expect(walkabout.score(s).success).toBe(false);
  });

  it('donne au personnage de la marge, jamais la partie', () => {
    // La règle du §19 : `insight` montre ce qu'un débutant ne voit pas, et
    // `time` donne de l'air. Ni l'un ni l'autre ne joue à la place.
    const expert = walkabout.setup(new Rng({ rngState: 11 }), {
      skill: 90, difficulty: 45, mode: 'normal',
      grace: { time: 1.4, pressure: 0.8, tolerance: 60, insight: true },
    });
    const novice = walkabout.setup(new Rng({ rngState: 11 }), {
      skill: 10, difficulty: 45, mode: 'normal',
      grace: { time: 1, pressure: 1, tolerance: 10, insight: false },
    });
    expect(expert.people.every((o) => o.visible)).toBe(true);
    expect(novice.people.every((o) => !o.visible)).toBe(true);
    expect(expert.limit).toBeGreaterThan(novice.limit);
    // Le jeu ne se joue pas tout seul pour autant.
    expect(expert.people.every((o) => o.given === 0)).toBe(true);
  });

  it('se résout tout seul quand on ne veut pas jouer', () => {
    const state = life();
    crownAt(state, 3);
    const context = dutyContext(state, DUTIES.find((d) => d.id === 'bain')!);
    const auto = autoResolve(new Rng({ rngState: 8 }), context);
    expect(auto.quality).toBeGreaterThanOrEqual(0);
    expect(auto.quality).toBeLessThanOrEqual(1);
  });
});

/* ------------------------------------------------------------------ */
/* Bout à bout                                                         */
/* ------------------------------------------------------------------ */

describe('une vie de couronne', () => {
  it('traverse quarante ans sans casser', () => {
    const state = life(4242, 24);
    crownAt(state, 3);
    state.player.money = 200_000_000;
    for (let i = 0; i < 40 && state.player.alive; i++) {
      const ctx = createCtx(state);
      for (const duty of availableDuties(state)) {
        if (dutiesDone(state) >= expectedDuties(state)) break;
        if (!dutyBlocker(state, duty)) performDuty(ctx, duty.id);
      }
      if (state.player.crown?.pending) arbitrate(createCtx(state), 0);
      simulateYear(state);
    }
    const crown = state.player.crown!;
    expect(crown.standing).toBeGreaterThanOrEqual(0);
    expect(crown.standing).toBeLessThanOrEqual(100);
    expect(crown.sentiment).toBeGreaterThanOrEqual(0);
    expect(crown.sentiment).toBeLessThanOrEqual(100);
    expect(crown.lifetimeDuties).toBeGreaterThan(20);
    // Personne n'apparaît deux fois dans la file.
    const ids = crown.line.map((k) => k.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('laisse une couronne s’écrouler sous quelqu’un qui n’en fait rien', () => {
    // La contre-épreuve : ne rien tenir, pendant longtemps, au rang le plus
    // exposé. L'institution doit réellement pouvoir tomber.
    const state = life(88, 30);
    const crown = crownAt(state, 0);
    for (let i = 0; i < 60 && !crown.abolished; i++) {
      // On mesure l'abolition, pas l'exclusion : un titulaire écarté pour
      // disgrâce n'expose plus l'institution, et la couronne cesserait de
      // tomber pour la bonne raison.
      state.player.fame.scandals = [];
      state.player.criminalRecord.convictions = [];
      crown.removed = null;
      advanceRoyalty(createCtx(state));
    }
    expect(crown.abolished).toBe(true);
  });

  it('ne s’écroule pas sous quelqu’un qui tient son rang', () => {
    const state = life(88, 30);
    const crown = crownAt(state, 0);
    state.player.money = 900_000_000;
    state.player.stats.reputation = 78;
    state.player.stats.karma = 70;
    for (let i = 0; i < 60 && !crown.abolished; i++) {
      const ctx = createCtx(state);
      for (const duty of availableDuties(state)) {
        if (dutiesDone(state) >= expectedDuties(state) + 1) break;
        if (!dutyBlocker(state, duty)) performDuty(ctx, duty.id);
      }
      if (crown.pending) arbitrate(createCtx(state), 0);
      advanceRoyalty(createCtx(state));
    }
    expect(crown.abolished).toBe(false);
    expect(crown.sentiment).toBeGreaterThan(COLLAPSE_LINE);
  });

  it('ne pose une maison qu’à ceux qui en ont une', () => {
    // Toutes les lectures doivent être sûres sans couronne : c'est le cas de
    // 99 % des parties, et une seule exception non gardée les casse toutes.
    const state = life(1234, 20);
    expect(state.player.crown).toBeNull();
    expect(succession(state)).toEqual([]);
    expect(placeOf(state)).toBe(-1);
    expect(titleOf(state)).toBeNull();
    expect(stipendOf(state)).toBe(0);
    expect(expectedDuties(state)).toBe(0);
    expect(availableDuties(state)).toEqual([]);
    expect(royalEarnings(state)).toBe(0);
    expect(inCourt(state)).toBe(false);
    expect(reigns(state)).toBe(false);
    expect(maybeBornRoyal(createCtx(state), 'poor')).toBe(false);
  });
});
