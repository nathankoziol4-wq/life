/**
 * Vérifications de la demande d'amitié.
 *
 * **Ce test existe à cause d'un bouton qui mentait.** Le catalogue portait
 * deux aveux voisins — « Meilleur ami : le statut existe ; rien ne permet de le
 * viser » et « Devenir meilleur ami : le lien existe mais rien ne permet d'y
 * accéder délibérément » — et ils étaient faux tous les deux. L'action était
 * là depuis toujours, proposée par `actions.ts` sous le nom « Demander à
 * devenir meilleur ami ».
 *
 * Elle appelait `interact(ctx, id, 'compliment')`. On demandait à quelqu'un
 * d'être son meilleur ami, et le jeu lui faisait un compliment. Un bouton qui
 * ne fait pas ce qu'il annonce est pire qu'un bouton manquant : le premier
 * ment, le second se voit.
 *
 * Cinq exigences :
 *
 * 1. **la demande fait ce qu'elle dit** ;
 * 2. **on peut se faire refuser**, sinon c'est un titre à réclamer ;
 * 3. **savoir à qui l'on demande paie** — la loyauté de l'autre pèse, et elle
 *    se découvre ailleurs dans le jeu ;
 * 4. **on n'a qu'un meilleur ami**, et celui qu'on déplace l'apprend ;
 * 5. **demander trop tôt coûte quelque chose.**
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState, Person } from '../types.ts';
import { createPerson } from '../../systems/npc.ts';
import { getAvailableActions } from '../../systems/actions.ts';
import { knows } from '../../systems/dates.ts';
import {
  BEST_FRIEND_FLOOR, askBestFriend, askBestFriendBlocker, askBestFriendOdds, bestFriendOf,
} from '../../systems/socialActs.ts';

function grown(seed: number, years = 26): GameState {
  const state = createNewLife({ seed });
  for (let i = 0; i < years && !state.gameOver; i++) simulateYear(state);
  state.player.yearActions = {};
  return state;
}

/** Quelqu'un de proche, fabriqué pour l'occasion. */
function friend(state: GameState, opts: { loyalty: number; bond: number }): Person {
  const person = createPerson(createCtx(state), { relation: 'friend', age: 30 });
  person.relationship = opts.bond;
  person.opinion = opts.bond;
  person.personality.loyalty = opts.loyalty;
  person.personality.warmth = 60;
  person.metYear = state.year - 8;
  return person;
}

describe('demander', () => {
  it('fait ce qu’elle annonce', () => {
    const state = grown(3);
    const target = friend(state, { loyalty: 95, bond: 92 });
    let accepted = false;
    for (let tries = 0; tries < 40 && !accepted; tries++) {
      state.player.yearActions = {};
      askBestFriend(createCtx(state), target.id);
      accepted = bestFriendOf(state)?.id === target.id;
    }
    expect(accepted).toBe(true);
    expect(bestFriendOf(state)?.id).toBe(target.id);
    // Et l'on sait maintenant ce qu'il vaut sur ce point : on vient de le lui
    // demander, et il a dit oui.
    expect(knows(target, 'loyalty')).toBe(true);
  });

  it('peut se faire refuser', () => {
    const state = grown(5);
    let refused = 0;
    for (let i = 0; i < 60; i++) {
      const target = friend(state, { loyalty: 30, bond: 66 });
      state.player.yearActions = {};
      askBestFriend(createCtx(state), target.id);
      if (bestFriendOf(state)?.id !== target.id) refused += 1;
    }
    // Un statut qu'on obtient toujours en le demandant n'est pas un lien.
    expect(refused).toBeGreaterThan(20);
  });

  it('paie de savoir à qui l’on demande', () => {
    /*
     * La loyauté de l'autre pèse autant que la qualité du lien — et elle se
     * découvre en sortant avec lui (`dates.ts`) ou en vivant une scène
     * composée (`composed.ts`). Demander à quelqu'un qu'on n'a jamais lu est
     * un pari, et c'est ce qui relie cette question au reste du jeu.
     */
    const state = grown(7);
    const loyal = friend(state, { loyalty: 92, bond: 78 });
    const flaky = friend(state, { loyalty: 12, bond: 78 });
    expect(askBestFriendOdds(state, loyal)).toBeGreaterThan(askBestFriendOdds(state, flaky) + 0.2);

    const yes = (target: Person) => {
      let ok = 0;
      for (let i = 0; i < 80; i++) {
        target.relation = 'friend';
        target.relationship = 78;
        state.player.yearActions = {};
        askBestFriend(createCtx(state), target.id);
        /*
         * On lit l'issue par le registre plutôt que par `target.relation`.
         * `tsc -b` — qui typait les tests, contrairement au typage de
         * l'application — refusait la comparaison : après l'affectation à
         * `'friend'` deux lignes plus haut, il tient le type pour figé et
         * déclare la comparaison impossible. Elle ne l'est pas : `askBestFriend`
         * a pu changer la valeur entre-temps.
         */
        const held = bestFriendOf(state);
        if (held?.id === target.id) ok += 1;
        // On remet en place ce que l'acceptation a déplacé.
        if (held) held.relation = 'friend';
      }
      return ok / 80;
    };
    expect(yes(loyal)).toBeGreaterThan(yes(flaky) + 0.15);
  });

  it('n’en laisse qu’un, et celui qu’on déplace l’apprend', () => {
    const state = grown(9);
    const first = friend(state, { loyalty: 95, bond: 95 });
    const second = friend(state, { loyalty: 95, bond: 95 });
    first.relation = 'bestFriend';
    const before = first.relationship;

    let moved = false;
    for (let tries = 0; tries < 40 && !moved; tries++) {
      state.player.yearActions = {};
      askBestFriend(createCtx(state), second.id);
      moved = bestFriendOf(state)?.id === second.id;
    }
    expect(moved).toBe(true);
    expect(first.relation).toBe('friend');
    // L'implémentation scolaire rétrogradait l'ancien en silence. Ici, une
    // amitié qu'on quitte coûte quelque chose — c'est ce qui fait la décision.
    expect(first.relationship).toBeLessThan(before);
    expect(Object.values(state.npcs).filter((x) => x.relation === 'bestFriend').length).toBe(1);
  });

  it('coûte quand on demande trop tôt', () => {
    const state = grown(11);
    const target = friend(state, { loyalty: 90, bond: BEST_FRIEND_FLOOR - 10 });
    const before = target.relationship;
    const result = askBestFriend(createCtx(state), target.id);
    expect(result.ok).toBe(true);
    expect(result.tone).toBe('bad');
    expect(target.relation).toBe('friend');
    expect(target.relationship).toBeLessThan(before);
  });

  it('refuse ce qui n’a pas de sens, et le dit', () => {
    const state = grown(13);
    const target = friend(state, { loyalty: 90, bond: 90 });
    expect(askBestFriendBlocker(state, target)).toBeNull();

    /*
     * Une fois par an — mais il faut d'abord que la demande **aboutisse** pour
     * que ce soit la limite annuelle qu'on lise. Avec une chance sur deux
     * qu'elle soit acceptée, la version d'avant lisait tantôt « une fois par
     * an », tantôt « il l'est déjà », selon la graine ; elle est passée
     * pendant des mois puis a cassé le jour où quatre nouvelles enfances ont
     * décalé la séquence aléatoire. Un test qui dépend de l'ordre des tirages
     * ne mesure pas ce qu'il croit mesurer.
     */
    askBestFriend(createCtx(state), target.id);
    if (target.relation === 'bestFriend') target.relation = 'friend';
    expect(askBestFriendBlocker(state, target)).toContain('an');

    state.player.yearActions = {};
    target.relation = 'bestFriend';
    expect(askBestFriendBlocker(state, target)).toContain('déjà');

    target.relation = 'spouse';
    expect(askBestFriendBlocker(state, target)).toContain('genre');

    target.relation = 'friend';
    target.alive = false;
    expect(askBestFriendBlocker(state, target)).toBeTruthy();
  });
});

/* ------------------------------------------------------------------ */
/* Ce qu'un écran promet et ce qu'il fait                              */
/* ------------------------------------------------------------------ */

/**
 * **Le garde-fou que le défaut ci-dessus rendait nécessaire.**
 *
 * `RelationshipsScreen` aiguille chaque action par un `switch`, et son dernier
 * cas rend `undefined` : une action que le registre propose mais que l'écran
 * ne route pas est donc un bouton qui **ne fait rien du tout**, en silence.
 * C'est le même défaut que celui du meilleur ami, en pire — celui-là faisait
 * autre chose, celui-ci ne ferait rien.
 *
 * On lit donc l'écran comme un texte, on relève ce qu'il sait faire, et l'on
 * demande au registre s'il peut proposer autre chose dans ce contexte-là.
 */
describe('l’écran des proches', () => {
  it('route toutes les actions qu’il peut recevoir', () => {
    const source = readFileSync(
      new URL('../../screens/RelationshipsScreen.tsx', import.meta.url).pathname, 'utf8',
    );
    // Le `switch` de l'écran : tout ce qu'il sait faire.
    const routed = new Set([...source.matchAll(/case '([a-zA-Z]+)':/g)].map((m) => m[1]!));
    expect(routed.size).toBeGreaterThan(15);

    const state = grown(17, 34);
    const offered = new Set<string>();
    for (const npc of Object.values(state.npcs)) {
      if (!npc.alive || npc.petSpecies) continue;
      for (const action of getAvailableActions(state, npc, 'général')) offered.add(action.id);
    }
    // Et quelques liens que la partie n'a pas forcément produits.
    for (const relation of ['friend', 'bestFriend', 'coworker', 'ex', 'acquaintance'] as const) {
      const made = createPerson(createCtx(state), { relation, age: 33 });
      made.relationship = 70;
      for (const action of getAvailableActions(state, made, 'général')) offered.add(action.id);
    }

    const orphans = [...offered].filter((id) => !routed.has(id));
    expect(orphans, `actions proposées et non routées : ${orphans.join(', ')}`).toEqual([]);
  });
});
