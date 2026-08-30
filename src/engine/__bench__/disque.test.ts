/**
 * Vérifications du disque et de la route.
 *
 * Le catalogue reprochait trois choses à la musique, et elles disaient toutes
 * la même : **ce qu'on enregistrait ne vivait pas après avoir été
 * enregistré**. Un album était une soirée bien ou mal passée dont il ne
 * restait rien le lendemain.
 *
 * Six exigences :
 *
 * 1. **une sortie a une vie** — elle entre au classement, y monte parfois, en
 *    retombe à une vitesse propre au format ;
 * 2. **elle paie tant qu'on s'en souvient**, et beaucoup plus haut que bas ;
 * 3. **une maison est un arbitrage** — elle pousse, elle prend, et elle
 *    impose le format ;
 * 4. **une avance n'est pas un cadeau** : elle se rembourse sur les droits ;
 * 5. **une tournée se compose** — la salle qu'on réserve est un pari sur ce
 *    qu'on vaut ;
 * 6. **le catalogue remplit les salles**, pas le talent.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState } from '../types.ts';
import { resolvePending } from '../../systems/randomEvents.ts';
import {
  FORMATS, LABELS, MAX_DATES, VENUES, chartLabel, fillLabel, getFormat,
  getLabel, getVenue, tourStrain,
} from '../../data/records.ts';
import {
  addDate, advanceRecords, bestChart, breakDeal, dropDate, hitTheRoad,
  inProduction, labelOf, musicOf, productionCost, pull, reachableVenues,
  recordBlocker, recordUnit, released, royaltiesOf, royaltyFor, signBlocker,
  signLabel, startRecording, tourBlocker, tourCost,
} from '../../systems/records.ts';
import { startDiscipline } from '../../systems/stage.ts';

function playTo(state: GameState, years: number): GameState {
  for (let i = 0; i < years && !state.gameOver; i++) {
    simulateYear(state);
    const ctx = createCtx(state);
    for (const pending of state.pending.slice()) resolvePending(ctx, pending.id, 0);
    state.pending = [];
  }
  return state;
}

/** Un musicien, à un niveau de métier donné. */
function musician(seed: number, craft = 60, fame = 25): GameState | null {
  const state = createNewLife({ seed });
  playTo(state, 26);
  if (state.gameOver || !state.player.alive || state.player.prison) return null;
  if (state.player.criminalRecord.wanted) return null;
  state.player.yearActions = {};
  if (!startDiscipline(createCtx(state), 'musique').ok) return null;
  const stage = state.player.stage;
  if (!stage) return null;
  stage.craft = craft;
  state.player.fame.level = fame;
  state.player.money = Math.max(state.player.money, 5_000_000);
  state.player.yearActions = {};
  return state;
}

/** Fait sortir un disque du format donné, et rend la sortie. */
function publish(state: GameState, formatId = 'single') {
  startRecording(createCtx(state), formatId);
  const format = getFormat(formatId)!;
  for (let i = 0; i < format.span; i++) advanceRecords(createCtx(state));
  return released(state)[0];
}

/* ------------------------------------------------------------------ */

describe('les données du disque tiennent debout', () => {
  it('échelonne les formats de la maquette à l’œuvre longue', () => {
    expect(FORMATS.length).toBeGreaterThanOrEqual(5);
    for (const format of FORMATS) {
      expect(format.cost).toBeGreaterThan(0);
      expect(format.royalty).toBeGreaterThan(0);
      expect(format.span).toBeGreaterThanOrEqual(1);
    }
    // Ce qui porte loin dure longtemps : c'est l'arbitrage du format, et sans
    // lui choisir un format serait cosmétique.
    const single = getFormat('single')!;
    const oeuvre = getFormat('oeuvre')!;
    expect(oeuvre.reach).toBeGreaterThan(single.reach);
    expect(oeuvre.decay).toBeLessThan(single.decay);
    expect(oeuvre.span).toBeGreaterThan(single.span);
    expect(oeuvre.cost).toBeGreaterThan(single.cost);
  });

  it('fait de chaque maison un échange, jamais un cadeau', () => {
    expect(LABELS.length).toBeGreaterThanOrEqual(3);
    const signed = LABELS.filter((l) => l.id !== 'auto');
    for (let i = 1; i < signed.length; i++) {
      // Plus elle pousse, plus elle prend et plus elle impose.
      expect(signed[i].push).toBeGreaterThan(signed[i - 1].push);
      expect(signed[i].cut).toBeGreaterThan(signed[i - 1].cut);
      expect(signed[i].control).toBeGreaterThan(signed[i - 1].control);
      expect(signed[i].advance).toBeGreaterThan(signed[i - 1].advance);
    }
    // Et « à ton compte » ne prend rien et n'apporte rien.
    const auto = getLabel('auto')!;
    expect(auto.cut).toBe(0);
    expect(auto.push).toBe(1);
  });

  it('échelonne les salles, et fait de chacune un pari', () => {
    expect(VENUES.length).toBeGreaterThanOrEqual(5);
    for (let i = 1; i < VENUES.length; i++) {
      expect(VENUES[i].draw).toBeGreaterThan(VENUES[i - 1].draw);
      expect(VENUES[i].seats).toBeGreaterThan(VENUES[i - 1].seats);
      expect(VENUES[i].gross).toBeGreaterThan(VENUES[i - 1].gross);
      expect(VENUES[i].cost).toBeGreaterThan(VENUES[i - 1].cost);
      // Une grande salle coûte toujours moins qu'elle ne rapporte pleine :
      // sinon le pari serait perdu d'avance et personne ne le prendrait.
      expect(VENUES[i].cost).toBeLessThan(VENUES[i].gross);
    }
  });

  it('donne à chaque rang et à chaque salle une formule', () => {
    expect(chartLabel(1)).toBe('Numéro un');
    expect(chartLabel(0)).toBe('Jamais entré');
    expect(chartLabel(250)).toBe('Jamais entré');
    expect(chartLabel(5)).not.toBe(chartLabel(150));
    expect(fillLabel(1)).toBeTruthy();
    expect(fillLabel(0.05)).not.toBe(fillLabel(1));
    // La fatigue de tournée ne mord qu'au-delà d'un certain nombre de dates,
    // et le corps recule ce seuil.
    expect(tourStrain(4, 50)).toBe(0);
    expect(tourStrain(24, 50)).toBeGreaterThan(0);
    expect(tourStrain(24, 100)).toBeLessThan(tourStrain(24, 20));
  });
});

describe('enregistrer', () => {
  it('n’ouvre le disque qu’aux musiciens', () => {
    const state = createNewLife({ seed: 11 });
    playTo(state, 26);
    if (state.gameOver || !state.player.alive) return;
    state.player.yearActions = {};
    if (!startDiscipline(createCtx(state), 'jeu').ok) return;
    // Un comédien ne sort pas d'album par accident.
    expect(musicOf(state)).toBeNull();
    expect(released(state)).toEqual([]);
    expect(royaltiesOf(state)).toBe(0);
    expect(startRecording(createCtx(state), 'single').ok).toBe(false);
  });

  it('produit réellement un disque, après le temps qu’il faut', () => {
    let built = 0;
    for (let seed = 1; seed <= 25; seed++) {
      const state = musician(seed);
      if (!state) continue;
      built += 1;
      expect(startRecording(createCtx(state), 'album').ok).toBe(true);
      // Un album prend deux ans : il n'est pas là avant.
      expect(inProduction(state)).not.toBeNull();
      expect(released(state)).toHaveLength(0);
      advanceRecords(createCtx(state));
      expect(released(state)).toHaveLength(0);
      advanceRecords(createCtx(state));
      expect(released(state)).toHaveLength(1);
      expect(released(state)[0].title).toBeTruthy();
      expect(released(state)[0].year).toBe(state.year);
    }
    expect(built).toBeGreaterThan(15);
  });

  it('refuse ce que le métier et la caisse interdisent', () => {
    const state = musician(31, 10, 0);
    if (!state) return;
    state.player.money = 0;
    expect(recordBlocker(state, getFormat('oeuvre')!)).toContain('métier');
    // Assez de métier, mais rien pour le produire.
    state.player.stage!.craft = 90;
    expect(recordBlocker(state, getFormat('album')!)).toContain('produire');
    state.player.money = 10_000_000;
    expect(recordBlocker(state, getFormat('album')!)).toBeNull();
    // Et une seule production à la fois.
    startRecording(createCtx(state), 'album');
    expect(recordBlocker(state, getFormat('single')!)).toContain('déjà');
  });

  it('fait payer la production, ou la fait payer par la maison', () => {
    const alone = musician(33, 70, 45);
    const signed = musician(33, 70, 45);
    if (!alone || !signed) return;
    signLabel(createCtx(signed), 'moyen');
    const beforeAlone = alone.player.money;
    const beforeSigned = signed.player.money;
    startRecording(createCtx(alone), 'ep');
    startRecording(createCtx(signed), 'ep');
    expect(alone.player.money).toBe(beforeAlone - productionCost(alone, getFormat('ep')!));
    expect(signed.player.money).toBe(beforeSigned);
  });
});

describe('le classement', () => {
  it('classe d’autant plus haut que le disque et le nom sont bons', () => {
    let strongSum = 0;
    let weakSum = 0;
    let pairs = 0;
    for (let seed = 101; seed < 141; seed++) {
      const strong = musician(seed, 95, 80);
      // Assez de métier pour sortir un titre, et rien d'autre : ce qu'on
      // compare est le nom et la qualité, pas le droit d'enregistrer.
      const weak = musician(seed, 26, 2);
      if (!strong || !weak) continue;
      pairs += 1;
      const a = publish(strong, 'single');
      const b = publish(weak, 'single');
      // Un rang bas est un bon rang : on compare donc à l'envers.
      strongSum += a.rank > 0 ? a.rank : 300;
      weakSum += b.rank > 0 ? b.rank : 300;
    }
    if (pairs < 15) return;
    expect(strongSum / pairs).toBeLessThan(weakSum / pairs);
  });

  it('fait retomber ce qui est monté, à la vitesse du format', () => {
    const fast = musician(151, 85, 60);
    const slow = musician(151, 85, 60);
    if (!fast || !slow) return;
    const a = publish(fast, 'single');
    const b = publish(slow, 'oeuvre');
    if (a.rank === 0 || b.rank === 0) return;
    // Cinq ans plus tard : le titre est parti, l'œuvre longue est encore là.
    for (let i = 0; i < 5; i++) {
      advanceRecords(createCtx(fast));
      advanceRecords(createCtx(slow));
    }
    const after = released(fast)[0];
    const still = released(slow)[0];
    const rankOf = (r: typeof after) => (r.rank > 0 ? r.rank : 400);
    expect(rankOf(after)).toBeGreaterThan(rankOf(still));
  });

  it('paie d’autant plus qu’on est haut, et rien quand on est sorti', () => {
    const state = musician(153, 80, 60);
    if (!state) return;
    const release = publish(state, 'album');
    if (release.rank === 0) return;
    release.rank = 1;
    const top = royaltyFor(state, release);
    release.rank = 90;
    const low = royaltyFor(state, release);
    release.rank = 0;
    expect(top).toBeGreaterThan(low * 3);
    expect(royaltyFor(state, release)).toBe(0);
  });

  it('fait rentrer les droits sur le compte, année après année', () => {
    const state = musician(155, 90, 75);
    if (!state) return;
    const release = publish(state, 'album');
    if (release.rank === 0 || release.rank > 60) return;
    const before = state.player.money;
    advanceRecords(createCtx(state));
    // Un disque classé paie sans qu'on travaille : c'est ce qui manquait.
    expect(state.player.money).toBeGreaterThan(before);
    expect(released(state)[0].earned).toBeGreaterThan(0);
  });

  it('paie dès l’année de parution', () => {
    // Le défaut trouvé au navigateur : la production et le classement se
    // réglaient dans la même boucle, et une sortie sautait l'année de sa
    // parution — celle où elle se vend le plus. Un album entré quatre-vingt-
    // huitième et retombé l'année suivante n'avait jamais rien rapporté.
    let paid = 0;
    let tried = 0;
    for (let seed = 161; seed < 191; seed++) {
      const state = musician(seed, 90, 80);
      if (!state) continue;
      tried += 1;
      startRecording(createCtx(state), 'single');
      const before = state.player.money;
      advanceRecords(createCtx(state));
      const release = released(state)[0];
      if (!release || release.rank === 0) continue;
      expect(state.player.money).toBeGreaterThan(before);
      expect(release.earned).toBeGreaterThan(0);
      paid += 1;
    }
    if (tried < 15) return;
    expect(paid).toBeGreaterThan(10);
  });

  it('retient la meilleure place, même une fois le disque parti', () => {
    const state = musician(157, 90, 75);
    if (!state) return;
    const release = publish(state, 'single');
    if (release.rank === 0) return;
    const peak = release.peak;
    for (let i = 0; i < 8; i++) advanceRecords(createCtx(state));
    expect(released(state)[0].peak).toBe(Math.min(peak, released(state)[0].peak));
    expect(bestChart(state)).toBeGreaterThan(0);
  });
});

describe('la maison de disques', () => {
  it('n’offre que ce qu’on peut prétendre', () => {
    const small = musician(201, 30, 5);
    const big = musician(201, 80, 60);
    if (!small || !big) return;
    expect(signBlocker(small, getLabel('major')!)).not.toBeNull();
    expect(signBlocker(big, getLabel('major')!)).toBeNull();
  });

  it('avance de l’argent, et le reprend sur les droits', () => {
    const state = musician(203, 80, 60);
    if (!state) return;
    const before = state.player.money;
    expect(signLabel(createCtx(state), 'major').ok).toBe(true);
    const deal = state.player.stage!.deal!;
    expect(deal.advance).toBeGreaterThan(0);
    expect(state.player.money).toBe(before + deal.advance);

    // Une avance n'est pas un cadeau : les premiers droits la remboursent.
    const release = publish(state, 'single');
    if (release.rank === 0 || release.rank > 40) return;
    const afterAdvance = state.player.money;
    advanceRecords(createCtx(state));
    expect(state.player.stage!.deal!.recouped).toBeGreaterThan(0);
    // Et tant qu'elle n'est pas remboursée, on ne touche presque rien.
    expect(state.player.money - afterAdvance).toBeLessThan(deal.advance);
  });

  it('pousse réellement les sorties', () => {
    let alone = 0;
    let backed = 0;
    let pairs = 0;
    for (let seed = 205; seed < 245; seed++) {
      const a = musician(seed, 70, 45);
      const b = musician(seed, 70, 45);
      if (!a || !b) continue;
      if (!signLabel(createCtx(b), 'major').ok) continue;
      pairs += 1;
      const ra = publish(a, 'single');
      const rb = publish(b, 'single');
      alone += ra.rank > 0 ? ra.rank : 300;
      backed += rb.rank > 0 ? rb.rank : 300;
    }
    if (pairs < 15) return;
    expect(backed / pairs).toBeLessThan(alone / pairs);
  });

  it('impose le format quand elle est grande', () => {
    const state = musician(247, 85, 70);
    if (!state) return;
    // À son compte, l'œuvre longue est ouverte.
    expect(recordBlocker(state, getFormat('oeuvre')!)).toBeNull();
    signLabel(createCtx(state), 'major');
    // Une grande maison ne laisse pas partir trois ans sans rien sortir.
    expect(recordBlocker(state, getFormat('oeuvre')!)).not.toBeNull();
    expect(recordBlocker(state, getFormat('live')!)).not.toBeNull();
    expect(recordBlocker(state, getFormat('single')!)).toBeNull();
  });

  it('prend sa part sur les droits', () => {
    const alone = musician(249, 85, 70);
    const signed = musician(249, 85, 70);
    if (!alone || !signed) return;
    // Un petit label : il prend peu, et il ne fait pas d'avance à rembourser
    // qui masquerait la coupe.
    signLabel(createCtx(signed), 'indep');
    signed.player.stage!.deal!.advance = 0;
    const a = publish(alone, 'album');
    const b = publish(signed, 'album');
    if (a.rank === 0 || b.rank === 0) return;
    // Le même rang des deux côtés : ce qu'on compare est bien la coupe.
    a.rank = 12; b.rank = 12;
    const beforeA = alone.player.money;
    const beforeB = signed.player.money;
    advanceRecords(createCtx(alone));
    advanceRecords(createCtx(signed));
    expect(signed.player.money - beforeB).toBeLessThan(alone.player.money - beforeA);
  });

  it('laisse rompre, et le fait payer', () => {
    const state = musician(251, 85, 70);
    if (!state) return;
    signLabel(createCtx(state), 'major');
    const before = state.player.money;
    expect(breakDeal(createCtx(state)).ok).toBe(true);
    expect(labelOf(state)).toBeNull();
    // On rembourse l'avance et l'on paie les disques non livrés.
    expect(state.player.money).toBeLessThan(before);
  });

  it('se lasse de qui ne livre rien', () => {
    const state = musician(253, 85, 70);
    if (!state) return;
    signLabel(createCtx(state), 'moyen');
    for (let i = 0; i < 10 && state.player.stage!.deal; i++) {
      state.year += 1;
      advanceRecords(createCtx(state));
    }
    expect(state.player.stage!.deal).toBeNull();
  });
});

describe('la tournée', () => {
  it('se compose date par date, et se défait', () => {
    const state = musician(301, 60, 40);
    if (!state) return;
    expect(addDate(createCtx(state), 'club').ok).toBe(true);
    expect(addDate(createCtx(state), 'club').ok).toBe(true);
    expect(state.player.stage!.tour!.dates).toHaveLength(2);
    expect(dropDate(createCtx(state), 0).ok).toBe(true);
    expect(state.player.stage!.tour!.dates).toHaveLength(1);
    // Et il y a une limite.
    for (let i = 0; i < MAX_DATES + 3; i++) addDate(createCtx(state), 'bar');
    expect(state.player.stage!.tour!.dates.length).toBeLessThanOrEqual(MAX_DATES);
  });

  it('fait dépendre le remplissage de ce qu’on attire', () => {
    const known = musician(303, 80, 90);
    const unknown = musician(303, 80, 3);
    if (!known || !unknown) return;
    for (const s of [known, unknown]) {
      for (let i = 0; i < 6; i++) addDate(createCtx(s), 'zenith');
      hitTheRoad(createCtx(s));
    }
    // La même salle, deux noms différents : le pari n'est pas le même.
    expect(known.player.stage!.tour!.fill)
      .toBeGreaterThan(unknown.player.stage!.tour!.fill);
    expect(known.player.stage!.tour!.earned)
      .toBeGreaterThan(unknown.player.stage!.tour!.earned);
  });

  it('fait de la salle un pari qu’on peut perdre', () => {
    const state = musician(305, 50, 10);
    if (!state) return;
    // Six stades pour quelqu'un que personne ne connaît : on paie la salle
    // vide, et c'est exactement ce que le système doit produire.
    for (let i = 0; i < 6; i++) addDate(createCtx(state), 'stade');
    const cost = tourCost(state);
    hitTheRoad(createCtx(state));
    const tour = state.player.stage!.tour!;
    expect(tour.spent).toBe(cost);
    expect(tour.fill).toBeLessThan(0.5);
    expect(tour.earned).toBeLessThan(cost);
  });

  it('annule les dernières dates d’une tournée trop longue', () => {
    let cancelled = 0;
    let tried = 0;
    for (let seed = 307; seed < 337; seed++) {
      const state = musician(seed, 70, 70);
      if (!state) continue;
      tried += 1;
      state.player.stats.fitness = 20;
      for (let i = 0; i < MAX_DATES; i++) addDate(createCtx(state), 'arena');
      hitTheRoad(createCtx(state));
      if (state.player.stage!.tour!.cancelled > 0) cancelled += 1;
    }
    if (tried < 15) return;
    expect(cancelled).toBeGreaterThan(tried * 0.3);
  });

  it('fait remplir les salles par le catalogue, pas par le talent', () => {
    const withDiscs = musician(341, 60, 30);
    const without = musician(341, 60, 30);
    if (!withDiscs || !without) return;
    const before = pull(withDiscs);
    // Trois disques bien classés : ce qui remplit une salle.
    for (let i = 0; i < 3; i++) {
      const release = publish(withDiscs, 'single');
      release.peak = 3;
      release.rank = 3;
    }
    expect(pull(withDiscs)).toBeGreaterThan(before);
    expect(pull(withDiscs)).toBeGreaterThan(pull(without));
    // Et cela ouvre de plus grandes salles.
    expect(reachableVenues(withDiscs).length)
      .toBeGreaterThanOrEqual(reachableVenues(without).length);
  });

  it('ne part pas deux fois, ni depuis une cellule', () => {
    const state = musician(343, 60, 40);
    if (!state) return;
    addDate(createCtx(state), 'club');
    hitTheRoad(createCtx(state));
    expect(state.player.stage!.tour!.running).toBe(true);
    expect(tourBlocker(state)).toContain('route');
    expect(hitTheRoad(createCtx(state)).ok).toBe(false);
    // L'année passe, et la tournée ne court plus.
    advanceRecords(createCtx(state));
    expect(state.player.stage!.tour!.running).toBe(false);
  });

  it('paie la tournée à la maison, si l’on en a une', () => {
    const alone = musician(345, 70, 60);
    const signed = musician(345, 70, 60);
    if (!alone || !signed) return;
    signLabel(createCtx(signed), 'major');
    for (const s of [alone, signed]) {
      for (let i = 0; i < 4; i++) addDate(createCtx(s), 'theatre');
      hitTheRoad(createCtx(s));
    }
    expect(signed.player.stage!.tour!.earned)
      .toBeLessThan(alone.player.stage!.tour!.earned);
  });
});

describe('l’année et la sauvegarde', () => {
  it('survit à une année complète et à la sauvegarde', () => {
    const state = musician(401, 70, 50);
    if (!state) return;
    signLabel(createCtx(state), 'moyen');
    // Un format court : une maison installée n'accepterait pas deux ans de
    // silence, et c'est le sujet d'un autre test.
    startRecording(createCtx(state), 'ep');
    addDate(createCtx(state), 'club');
    simulateYear(state);
    if (!state.player.alive) return;
    const copy = JSON.parse(JSON.stringify(state)) as GameState;
    expect(copy.player.stage!.releases.length).toBeGreaterThan(0);
    expect(Array.isArray(copy.player.stage!.tour?.dates)).toBe(true);
    advanceRecords(createCtx(copy));
    expect(copy.player.stage).not.toBeNull();
  });

  it('ne coûte rien à qui n’a jamais rien enregistré', () => {
    const state = musician(403, 40, 10);
    if (!state) return;
    const before = state.player.money;
    advanceRecords(createCtx(state));
    expect(state.player.money).toBe(before);
    expect(royaltiesOf(state)).toBe(0);
    expect(bestChart(state)).toBe(0);
    expect(recordUnit(state)).toBeGreaterThan(0);
    expect(getVenue('club')).toBeDefined();
  });
});
