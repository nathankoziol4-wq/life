/**
 * Vérifications du harcèlement scolaire.
 *
 * L'audit le classait `PLACEHOLDER` : « l'expérience “harcèlement” existe
 * comme souvenir ; aucun harceleur, aucune scène, aucune réponse ». Ce qui
 * suit vérifie que les trois manques sont comblés, et surtout que ce qui a été
 * ajouté est une situation et non un menu.
 *
 * 1. **quelqu'un le fait** — un camarade nommé, choisi pour ce qu'il est, qui
 *    reste dans la partie après ;
 * 2. **ça dure** — une année sans réponse n'est pas neutre : l'ampleur monte,
 *    et ce qu'elle prend se voit ailleurs (notes, moral, argent, corps) ;
 * 3. **aucune réponse n'est bonne partout** — c'est la règle qui fait le
 *    système. Chacune des cinq doit être la meilleure dans un contexte et la
 *    pire dans un autre, sans quoi il n'y aurait qu'un bouton à trouver ;
 * 4. **le silence a un prix** — ne rien faire est un choix qui coûte, y
 *    compris quand on est simple témoin ;
 * 5. **l'autre côté existe** — s'en prendre à quelqu'un est possible, et se
 *    paie en karma, en amitiés et en dossier.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState, Person } from '../types.ts';
import { resolvePending } from '../../systems/randomEvents.ts';
import {
  BULLYING_KINDS, RESPONSES, WITNESS_CHOICES, getBullyingKind, getResponse,
  intensityLabel, type ResponseId,
} from '../../data/bullying.ts';
import {
  advanceHarassment, alliesOf, availableResponses, backingOf, bullyBlocker,
  bullyOf, harassmentOf, openHarassment, pickBully, pickOn, respond,
  responseBlocker, responseOdds, rollHarassment, witness, witnessesOf,
} from '../../systems/bullying.ts';
import { bullyingRisk, classmatesOf } from '../../systems/school.ts';

function playTo(state: GameState, years: number): GameState {
  for (let i = 0; i < years && !state.gameOver; i++) {
    simulateYear(state);
    const ctx = createCtx(state);
    for (const pending of state.pending.slice()) resolvePending(ctx, pending.id, 0);
    state.pending = [];
  }
  return state;
}

/** Un élève, en classe, avec des camarades. */
function pupil(seed: number, age = 13): GameState | null {
  const state = createNewLife({ seed });
  playTo(state, age);
  if (state.gameOver || !state.player.alive) return null;
  if (!state.player.origin.schoolClass) return null;
  if (classmatesOf(state).length < 3) return null;
  state.player.yearActions = {};
  return state;
}

/** Un élève pris pour cible, la situation ouverte pour de bon. */
function targeted(seed: number, age = 13): GameState | null {
  const state = pupil(seed, age);
  if (!state) return null;
  const ctx = createCtx(state);
  const bully = pickBully(state, ctx.rng);
  if (!bully) return null;
  if (!openHarassment(ctx, bully)) return null;
  return state;
}

/* ------------------------------------------------------------------ */

describe('les données tiennent debout', () => {
  it('décrit plusieurs registres, avec des effets distincts', () => {
    expect(BULLYING_KINDS.length).toBeGreaterThanOrEqual(4);
    const hits = new Set(BULLYING_KINDS.map((k) => k.hits));
    // Si tout tapait au même endroit, le registre ne serait qu'un habillage.
    expect(hits.size).toBeGreaterThanOrEqual(3);
    for (const k of BULLYING_KINDS) {
      expect(k.what).toBeTruthy();
      expect(getBullyingKind(k.id)).toBeDefined();
    }
  });

  it('dit au joueur de quoi dépend chaque réponse, sans dire si ça marchera', () => {
    expect(RESPONSES).toHaveLength(5);
    for (const r of RESPONSES) {
      expect(r.depends).toBeTruthy();
      expect(r.cost).toBeTruthy();
      expect(getResponse(r.id)).toBeDefined();
    }
    expect(WITNESS_CHOICES).toHaveLength(4);
  });

  it('nomme l’ampleur à tous les niveaux', () => {
    expect(intensityLabel(100).label).toBeTruthy();
    expect(intensityLabel(0).label).toBeTruthy();
    expect(intensityLabel(95).label).not.toBe(intensityLabel(5).label);
  });
});

describe('quelqu’un le fait', () => {
  it('ouvre réellement une situation, avec un camarade dedans', () => {
    let built = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const state = targeted(seed);
      if (!state) continue;
      built += 1;
      const h = harassmentOf(state)!;
      const bully = bullyOf(state);
      expect(bully).not.toBeNull();
      // Le harceleur est un vrai PNJ de la classe, pas une chaîne de caractères.
      expect(classmatesOf(state).some((m) => m.id === bully!.id)).toBe(true);
      expect(bully!.flags.bulliedPlayer).toBe(true);
      expect(getBullyingKind(h.kindId)).toBeDefined();
      expect(h.intensity).toBeGreaterThan(0);
    }
    // Garde-fou : sans lui, tout ce fichier pourrait passer sans rien tester.
    expect(built).toBeGreaterThan(25);
  });

  it('choisit quelqu’un qui s’y prête plutôt qu’au hasard', () => {
    let picked = 0;
    let aboveAverage = 0;
    for (let seed = 50; seed < 110; seed++) {
      const state = pupil(seed);
      if (!state) continue;
      // On compare sur le même vivier que la fonction : elle ne considère
      // que les camarades avec qui le lien est tiède. Mesurer contre la classe
      // entière comparerait deux populations différentes et ne dirait rien.
      const eligible = classmatesOf(state).filter(
        (m) => m.relation === 'classmate' && m.relationship < 58,
      );
      if (eligible.length < 3) continue;
      const bully = pickBully(state, createCtx(state).rng);
      if (!bully) continue;
      picked += 1;
      // Le critère réel : assurance et froideur ensemble. Quelqu'un de
      // chaleureux mais très sûr de lui s'y prête aussi, et c'est voulu.
      const fit = (m: Person) => (m.psyche?.social.assertiveness ?? m.personality.ambition)
        + (100 - m.personality.warmth);
      const ranked = [...eligible].sort((x, y) => fit(y) - fit(x));
      // Le tirage se fait parmi les trois premiers : le choisi doit donc être
      // dans la moitié haute, toujours quand le vivier est petit.
      if (ranked.indexOf(bully) < Math.max(3, ranked.length / 2)) aboveAverage += 1;
    }
    if (picked === 0) return;
    // Pas systématique — il y a un tirage parmi les trois qui s'y prêtent le
    // plus — mais franchement au-dessus du hasard.
    expect(aboveAverage / picked).toBeGreaterThan(0.7);
  });

  it('nomme ceux qui voient', () => {
    const state = targeted(3);
    if (!state) return;
    const seen = witnessesOf(state);
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((w) => w.id !== bullyOf(state)!.id)).toBe(true);
    // Les alliés sont un sous-ensemble : voir n'est pas soutenir.
    expect(alliesOf(state).length).toBeLessThanOrEqual(seen.length);
  });

  it('mesure un risque plutôt que de poser un drapeau', () => {
    const state = pupil(5);
    if (!state) return;
    const before = bullyingRisk(state);
    expect(before).toBeGreaterThanOrEqual(0);
    // L'isolement et l'établissement pèsent, dans le bon sens.
    state.player.origin.popularity.liked = 0;
    state.player.origin.school!.bullying = 95;
    state.player.origin.school!.counselling = 5;
    expect(bullyingRisk(state)).toBeGreaterThan(before);
    // Hors âge scolaire, aucun risque et donc aucun tirage.
    state.player.age = 34;
    expect(bullyingRisk(state)).toBe(0);
  });
});

describe('ça dure et ça coûte', () => {
  it('empire toute seule quand on ne fait rien', () => {
    const state = targeted(7);
    if (!state) return;
    const h = harassmentOf(state)!;
    const before = h.intensity;
    advanceHarassment(createCtx(state));
    expect(h.intensity).toBeGreaterThan(before);
    expect(h.years).toBe(1);
  });

  it('prend quelque chose de différent selon le registre', () => {
    // Un registre qui vise le moral et un qui vise l'argent ne doivent pas
    // produire la même année. Sinon le registre est décoratif.
    const moral = targeted(9);
    const argent = targeted(9);
    if (!moral || !argent) return;
    harassmentOf(moral)!.kindId = 'moqueries';
    harassmentOf(argent)!.kindId = 'racket';
    argent.player.money = 5000;
    moral.player.money = 5000;
    const happyBefore = moral.player.stats.happiness;
    const moneyBefore = argent.player.money;
    advanceHarassment(createCtx(moral));
    advanceHarassment(createCtx(argent));
    expect(moral.player.stats.happiness).toBeLessThan(happyBefore);
    expect(argent.player.money).toBeLessThan(moneyBefore);
    // Et l'inverse n'est pas vrai : les moqueries ne prennent pas d'argent.
    expect(moral.player.money).toBe(5000);
  });

  it('déborde sur la scolarité', () => {
    const state = targeted(11);
    if (!state) return;
    const h = harassmentOf(state)!;
    const grades = state.player.education.grades;
    const stress = state.player.stats.stress;
    h.intensity = 70;
    advanceHarassment(createCtx(state));
    expect(state.player.education.grades).toBeLessThan(grades);
    expect(state.player.stats.stress).toBeGreaterThan(stress);
  });

  it('s’arrête quand le harceleur n’est plus là, sans que ce soit un mérite', () => {
    const state = targeted(13);
    if (!state) return;
    const h = harassmentOf(state)!;
    bullyOf(state)!.alive = false;
    advanceHarassment(createCtx(state));
    expect(h.resolvedYear).not.toBeNull();
    expect(h.outcome).toContain('pas toi');
  });

  it('finit par s’effacer de l’état, jamais de la psyché', () => {
    const state = targeted(15);
    if (!state) return;
    const h = harassmentOf(state)!;
    const memories = state.player.psyche.memories.length;
    h.resolvedYear = state.year - 5;
    advanceHarassment(createCtx(state));
    expect(harassmentOf(state)).toBeNull();
    // Ce qui a été vécu est ailleurs, et y reste.
    expect(state.player.psyche.memories.length).toBeGreaterThanOrEqual(memories);
  });
});

describe('aucune réponse n’est bonne partout', () => {
  /** Force un contexte, puis lit les chances de chaque réponse. */
  const oddsIn = (
    state: GameState,
    shape: (s: GameState) => void,
  ): Record<ResponseId, number> => {
    shape(state);
    return {
      ignorer: responseOdds(state, 'ignorer'),
      affronter: responseOdds(state, 'affronter'),
      signaler: responseOdds(state, 'signaler'),
      parents: responseOdds(state, 'parents'),
      soutien: responseOdds(state, 'soutien'),
    };
  };

  it('donne à chaque réponse un contexte où elle est la meilleure', () => {
    // C'est la vérification centrale du fichier. Si une réponse n'est jamais
    // la meilleure, elle n'est qu'un piège ; si une réponse est toujours la
    // meilleure, il n'y a plus de décision.
    const best = new Set<ResponseId>();

    const shapes: ((s: GameState) => void)[] = [
      // Tout début, rien d'installé : laisser passer suffit souvent.
      (s) => {
        const h = harassmentOf(s)!;
        h.intensity = 8; h.years = 0; h.backing = 0;
        s.player.psyche.social.assertiveness = 20;
        s.player.psyche.social.confrontation = 15;
        s.player.stats.fitness = 25;
        s.player.origin.school!.counselling = 10;
        for (const w of witnessesOf(s)) w.relationship = 20;
      },
      // Quelqu'un de sûr de lui, face à un harceleur seul.
      (s) => {
        const h = harassmentOf(s)!;
        h.intensity = 70; h.years = 2; h.backing = 0;
        s.player.psyche.social.assertiveness = 96;
        s.player.psyche.social.confrontation = 96;
        s.player.stats.fitness = 92;
        s.player.origin.school!.counselling = 8;
        for (const w of witnessesOf(s)) w.relationship = 15;
      },
      // Un établissement qui prend ça au sérieux, et quelque chose qui se voit.
      (s) => {
        const h = harassmentOf(s)!;
        h.intensity = 25; h.years = 2; h.backing = 8;
        h.kindId = 'bousculades';
        s.player.psyche.social.assertiveness = 12;
        s.player.psyche.social.confrontation = 10;
        s.player.stats.fitness = 20;
        s.player.origin.school!.counselling = 98;
        for (const w of witnessesOf(s)) w.relationship = 15;
      },
      // Des parents présents, une classe indifférente, un enfant sans force.
      (s) => {
        const h = harassmentOf(s)!;
        h.intensity = 70; h.years = 2; h.backing = 9;
        h.kindId = 'écart';
        s.player.psyche.social.assertiveness = 10;
        s.player.psyche.social.confrontation = 8;
        s.player.stats.fitness = 18;
        s.player.origin.school!.counselling = 4;
        s.player.origin.time.family = 20;
        for (const w of witnessesOf(s)) w.relationship = 15;
        for (const x of Object.values(s.npcs)) {
          if (x.relation === 'father' || x.relation === 'mother') {
            x.personality.warmth = 98; x.relationship = 98;
          }
        }
      },
      // Une classe qui vous aime, un établissement qui s'en moque.
      (s) => {
        const h = harassmentOf(s)!;
        h.intensity = 70; h.years = 2; h.backing = 0;
        s.player.psyche.social.assertiveness = 10;
        s.player.psyche.social.confrontation = 8;
        s.player.stats.fitness = 18;
        s.player.origin.school!.counselling = 3;
        s.player.origin.time.family = 0;
        for (const w of witnessesOf(s)) w.relationship = 95;
        for (const x of Object.values(s.npcs)) {
          if (x.relation === 'father' || x.relation === 'mother') {
            x.personality.warmth = 4; x.relationship = 4;
          }
        }
      },
    ];

    for (const shape of shapes) {
      const state = targeted(17);
      if (!state) return;
      const odds = oddsIn(state, shape);
      const winner = (Object.keys(odds) as ResponseId[])
        .reduce((a, b) => (odds[a] >= odds[b] ? a : b));
      best.add(winner);
    }
    expect(best.size).toBe(5);
  });

  it('rend le silence de plus en plus mauvais', () => {
    const state = targeted(19);
    if (!state) return;
    const h = harassmentOf(state)!;
    h.intensity = 10; h.years = 0;
    const early = responseOdds(state, 'ignorer');
    h.intensity = 85; h.years = 4;
    expect(responseOdds(state, 'ignorer')).toBeLessThan(early);
  });

  it('rend l’affrontement moins praticable quand le harceleur est suivi', () => {
    const state = targeted(21);
    if (!state) return;
    const h = harassmentOf(state)!;
    state.player.psyche.social.assertiveness = 80;
    h.backing = 0;
    const alone = responseOdds(state, 'affronter');
    h.backing = 10;
    expect(responseOdds(state, 'affronter')).toBeLessThan(alone);
    expect(backingOf(state)).toBeGreaterThan(0);
  });

  it('interdit de s’appuyer sur des gens qu’on n’a pas', () => {
    const state = targeted(23);
    if (!state) return;
    for (const w of witnessesOf(state)) w.relationship = 10;
    expect(alliesOf(state)).toHaveLength(0);
    expect(responseOdds(state, 'soutien')).toBe(0);
    expect(responseBlocker(state, 'soutien')).not.toBeNull();
    expect(availableResponses(state).some((r) => r.id === 'soutien')).toBe(false);
    // C'est exactement la trappe de l'isolement : la meilleure sortie est
    // celle qui demande d'avoir déjà quelqu'un.
    for (const w of witnessesOf(state)) w.relationship = 90;
    expect(responseOdds(state, 'soutien')).toBeGreaterThan(0);
  });

  it('ne laisse pas tout essayer dans la même année', () => {
    const state = targeted(25);
    if (!state) return;
    const first = respond(createCtx(state), 'ignorer');
    expect(first.ok !== undefined).toBe(true);
    if (!harassmentOf(state)?.resolvedYear) {
      expect(responseBlocker(state, 'ignorer')).not.toBeNull();
    }
  });
});

describe('ce que produit chaque réponse', () => {
  /** Force la réussite ou l'échec en poussant les chances aux extrêmes. */
  const forced = (seed: number, id: ResponseId, win: boolean): GameState | null => {
    const state = targeted(seed);
    if (!state) return null;
    const h = harassmentOf(state)!;
    // Pour l'échec on laisse de la marge sous 100 : à saturation, aggraver
    // ne se voit plus, et le test mesurerait le plafond au lieu de la règle.
    if (id === 'ignorer') { h.intensity = win ? 0 : 70; h.years = win ? 0 : 6; }
    if (id === 'affronter') {
      state.player.psyche.social.assertiveness = win ? 100 : 0;
      state.player.psyche.social.confrontation = win ? 100 : 0;
      state.player.stats.fitness = win ? 100 : 0;
      h.backing = win ? 0 : 10;
    }
    if (id === 'signaler') {
      state.player.origin.school!.counselling = win ? 100 : 0;
      h.kindId = win ? 'bousculades' : 'écart';
      h.intensity = win ? 0 : 100;
    }
    if (id === 'soutien') {
      for (const w of witnessesOf(state)) w.relationship = win ? 100 : 55;
      h.backing = win ? 0 : 10;
    }
    return state;
  };

  it('met fin à la situation quand la réponse porte', () => {
    // On répète, et on compte le taux sur les vies réellement utilisables :
    // toutes les graines ne donnent pas un élève avec une classe et quelqu'un
    // pour s'y mettre, et compter en valeur absolue mesurerait ça plutôt que
    // la règle.
    let ended = 0;
    let tried = 0;
    for (let seed = 30; seed < 90; seed++) {
      const state = forced(seed, 'affronter', true);
      if (!state) continue;
      tried += 1;
      respond(createCtx(state), 'affronter');
      if (harassmentOf(state)?.resolvedYear) ended += 1;
    }
    expect(tried).toBeGreaterThan(15);
    // Jamais certain — c'est le principe — mais franchement praticable pour
    // quelqu'un de sûr de lui face à un harceleur seul.
    expect(ended / tried).toBeGreaterThan(0.35);
  });

  it('sanctionne celui qui répond, pas seulement celui qui commence', () => {
    // Le coût propre à l'affrontement, et la raison de ne pas le choisir
    // systématiquement : l'établissement ne fait pas le tri.
    let sanctioned = 0;
    for (let seed = 60; seed < 100; seed++) {
      const state = forced(seed, 'affronter', true);
      if (!state) continue;
      const before = state.player.education.discipline.incidentsThisYear;
      respond(createCtx(state), 'affronter');
      if (state.player.education.discipline.incidentsThisYear > before) sanctioned += 1;
    }
    expect(sanctioned).toBeGreaterThan(20);
  });

  it('fait payer le signalement qui n’aboutit pas', () => {
    let worse = 0;
    for (let seed = 100; seed < 140; seed++) {
      const state = forced(seed, 'signaler', false);
      if (!state) continue;
      const warmth = witnessesOf(state).reduce((s, w) => s + w.relationship, 0);
      const intensity = harassmentOf(state)!.intensity;
      const result = respond(createCtx(state), 'signaler');
      if (result.ok) continue;
      const after = witnessesOf(state).reduce((s, w) => s + w.relationship, 0);
      // Ça se sait, et l'affaire empire.
      if (after < warmth && harassmentOf(state)!.intensity >= intensity) worse += 1;
    }
    expect(worse).toBeGreaterThan(10);
  });

  it('ne punit presque pas d’en avoir parlé chez soi', () => {
    // La réponse la moins risquée, et c'est pour ça qu'elle n'est pas la plus
    // forte : elle ne doit jamais aggraver franchement la situation.
    for (let seed = 140; seed < 170; seed++) {
      const state = targeted(seed);
      if (!state) continue;
      const h = harassmentOf(state)!;
      const intensity = h.intensity;
      respond(createCtx(state), 'parents');
      expect(h.intensity).toBeLessThanOrEqual(intensity + 5);
    }
  });

  it('aggrave le silence, toujours', () => {
    let worsened = 0;
    let n = 0;
    for (let seed = 170; seed < 210; seed++) {
      const state = forced(seed, 'ignorer', false);
      if (!state) continue;
      n += 1;
      const h = harassmentOf(state)!;
      const before = h.intensity;
      const result = respond(createCtx(state), 'ignorer');
      if (!result.ok && h.intensity > before) worsened += 1;
    }
    if (n === 0) return;
    // À forte intensité, ne rien faire ne peut pratiquement pas marcher.
    expect(worsened / n).toBeGreaterThan(0.8);
  });
});

describe('l’autre côté', () => {
  it('laisse s’en prendre à quelqu’un, et le fait payer', () => {
    const state = pupil(27);
    if (!state) return;
    const target = classmatesOf(state)[0];
    const karma = state.player.stats.karma;
    const link = target.relationship;
    expect(bullyBlocker(state, target)).toBeNull();
    expect(pickOn(createCtx(state), target.id).ok).toBe(true);
    expect(state.player.stats.karma).toBeLessThan(karma);
    expect(target.relationship).toBeLessThan(link);
    expect(target.flags.bulliedByPlayer).toBe(1);
    // Pas deux fois la même année sur la même personne.
    expect(pickOn(createCtx(state), target.id).ok).toBe(false);
  });

  it('finit par le consigner quand ça se répète', () => {
    let recorded = 0;
    for (let seed = 210; seed < 250; seed++) {
      const state = pupil(seed);
      if (!state) continue;
      const target = classmatesOf(state)[0];
      if (!target) continue;
      for (let year = 0; year < 4; year++) {
        state.player.yearActions = {};
        pickOn(createCtx(state), target.id);
      }
      if (state.player.education.discipline.incidentsThisYear > 0) recorded += 1;
    }
    expect(recorded).toBeGreaterThan(20);
  });

  it('refuse ceux qui ne sont pas de la classe', () => {
    const state = pupil(29);
    if (!state) return;
    const outsider = Object.values(state.npcs).find(
      (x) => x.alive && !state.player.origin.schoolClass!.classmateIds.includes(x.id),
    );
    if (!outsider) return;
    expect(bullyBlocker(state, outsider)).not.toBeNull();
    expect(pickOn(createCtx(state), outsider.id).ok).toBe(false);
  });
});

describe('être témoin', () => {
  it('rapproche de la victime quand on s’interpose', () => {
    const state = pupil(31);
    if (!state) return;
    const victim = classmatesOf(state)[0];
    const link = victim.relationship;
    const karma = state.player.stats.karma;
    expect(witness(createCtx(state), victim.id, 'intervenir').ok).toBe(true);
    expect(victim.relationship).toBeGreaterThan(link);
    expect(state.player.stats.karma).toBeGreaterThan(karma);
  });

  it('fait payer le silence à l’intérieur, jamais au dehors', () => {
    const state = pupil(33);
    if (!state) return;
    const victim = classmatesOf(state)[0];
    const link = victim.relationship;
    const karma = state.player.stats.karma;
    const authenticity = state.player.psyche.self.authenticity;
    expect(witness(createCtx(state), victim.id, 'rien').ok).toBe(true);
    // Personne ne vous en veut : c'est exactement ce qui rend le choix facile.
    expect(victim.relationship).toBe(link);
    expect(state.player.stats.karma).toBeLessThan(karma);
    expect(state.player.psyche.self.authenticity).toBeLessThan(authenticity);
  });

  it('permet de s’y mettre aussi, et le compte', () => {
    const state = pupil(35);
    if (!state) return;
    const victim = classmatesOf(state)[0];
    const karma = state.player.stats.karma;
    expect(witness(createCtx(state), victim.id, 'suivre').ok).toBe(true);
    expect(state.player.stats.karma).toBeLessThan(karma - 5);
    expect(victim.flags.bulliedByPlayer).toBe(1);
    expect(state.player.origin.popularity.intimidating).toBeGreaterThan(0);
  });
});

describe('l’année et la sauvegarde', () => {
  it('n’ouvre rien pour qui n’est pas à l’école', () => {
    const state = createNewLife({ seed: 41 });
    playTo(state, 34);
    if (state.gameOver || !state.player.alive) return;
    state.player.education.harassment = null;
    rollHarassment(createCtx(state));
    expect(harassmentOf(state)).toBeNull();
  });

  it('survit à la sauvegarde avec tout ce qu’il faut pour continuer', () => {
    const state = targeted(43);
    if (!state) return;
    simulateYear(state);
    const copy = JSON.parse(JSON.stringify(state)) as GameState;
    const h = harassmentOf(copy);
    if (!h) return;
    expect(h.bullyId).toBeTruthy();
    expect(copy.npcs[h.bullyId]).toBeDefined();
    expect(Array.isArray(h.witnessIds)).toBe(true);
    expect(Array.isArray(h.triedThisYear)).toBe(true);
    // Et la situation reprend là où elle en était.
    advanceHarassment(createCtx(copy));
    expect(harassmentOf(copy)).not.toBeNull();
  });

  it('remet le compteur des tentatives à chaque année', () => {
    const state = targeted(45);
    if (!state) return;
    const h = harassmentOf(state)!;
    h.triedThisYear = ['ignorer', 'signaler'];
    advanceHarassment(createCtx(state));
    expect(h.triedThisYear).toEqual([]);
  });
});
