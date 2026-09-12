/**
 * Fabrique une sauvegarde où quelqu'un vient de mourir, et où la salle a
 * quelque chose à dire.
 *
 * Pourquoi : l'écran ne montre l'essentiel — ceux qui viennent, ceux qui ne
 * viennent pas **et pourquoi**, la portée que chaque forme achète — qu'à
 * condition qu'il y ait à la fois des présents et des absents. Une vie tirée au
 * hasard donne presque toujours l'un des deux extrêmes : tout le monde vient
 * (rien à lire), ou personne (rien non plus).
 *
 * Rien n'est truqué du côté des gens : les proches viennent du foyer et des
 * années jouées, et le décès est celui que le moteur a produit. On pose
 * seulement de quoi payer, parce que ce qu'on veut montrer est le choix de la
 * forme, pas la probabilité de pouvoir se l'offrir.
 *
 *   node --experimental-strip-types tools/fixture-obseques.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import { turnout, wakeOf } from '../src/systems/wake.ts';

function mournerLife() {
  for (let seed = 91_000; seed < 92_000; seed += 1) {
    const life = createNewLife({ seed });
    for (let i = 0; i < 90 && !life.gameOver && life.player.alive; i += 1) {
      simulateYear(life);
      const ctx = createCtx(life);
      for (const pending of [...life.pending]) resolvePending(ctx, pending.id, 0);
      life.pending = [];

      const wake = wakeOf(life);
      if (!wake || life.player.prison) continue;

      /*
       * Ce que la scène doit contenir pour valoir une marche : quelqu'un qui
       * viendrait, plusieurs qui ne viendraient pas, et au moins deux raisons
       * différentes de ne pas venir — sans quoi la liste des absents affiche
       * vingt fois la même phrase.
       */
      const all = turnout(life, { ...wake, formId: 'service' });
      const come = all.filter((t) => t.comes);
      const away = all.filter((t) => !t.comes);
      const reasons = new Set(away.map((t) => t.held));
      if (come.length < 1 || away.length < 3 || reasons.size < 2) continue;

      life.player.money = 90_000 * life.world.inflation;
      life.player.yearActions = {};
      return life;
    }
  }
  throw new Error('aucune graine ne donne des obsèques avec des présents et des absents');
}

const state = mournerLife();
process.stdout.write(JSON.stringify(state));
