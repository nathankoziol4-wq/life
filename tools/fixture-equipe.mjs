/**
 * Fabrique une sauvegarde de patron qui a déjà une équipe et des candidats.
 *
 * Pourquoi : monter une entreprise, lui faire de la demande et embaucher
 * demande une vie entière et beaucoup de chance. La marche de contrôle serait
 * arrivée sur un écran vide — ni salarié à ouvrir, ni candidat à comparer,
 * c'est-à-dire rien de ce que le chantier ajoute.
 *
 * Rien n'est truqué : l'entreprise passe par `foundBusiness`, les candidats par
 * `openShortlist` et les embauches par `offer`. Seuls le renom et la qualité
 * sont posés — sans demande, embaucher est perdant quoi qu'on fasse, et l'écran
 * montrerait une équipe qu'aucun joueur n'aurait de raison d'avoir.
 *
 *   node --experimental-strip-types tools/fixture-equipe.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import { getBusinessKind } from '../src/data/ventures.ts';
import { foundBusiness, wageOf } from '../src/systems/venture.ts';
import { crewOf, offer, openShortlist } from '../src/systems/crew.ts';

function play(life, years) {
  for (let year = 0; year < years && !life.gameOver && life.player.alive; year++) {
    simulateYear(life);
    const ctx = createCtx(life);
    for (const pending of [...life.pending]) resolvePending(ctx, pending.id, 0);
    life.pending = [];
  }
}

function bossLife() {
  for (let seed = 71_000; seed < 71_400; seed++) {
    const life = createNewLife({ seed });
    play(life, 32);
    if (life.gameOver || !life.player.alive || life.player.prison) continue;

    life.player.money = 900_000 * life.world.inflation;
    life.player.business = null;
    if (!foundBusiness(createCtx(life), 'cafe').ok) continue;
    const b = life.player.business;
    if (!b) continue;
    b.cash = 600_000 * life.world.inflation;
    b.renown = 70;
    b.quality = 70;

    // Deux embauches, un an d'écart : assez pour que l'un ait de l'ancienneté
    // et que les deux aient un moral qui a bougé.
    const kind = getBusinessKind(b.kindId);
    for (let round = 0; round < 2; round++) {
      life.player.yearActions = {};
      if (!openShortlist(createCtx(life), b, wageOf(life, kind)).ok) break;
      const list = [...(b.shortlist ?? [])];
      if (list.length === 0) break;
      const want = list.reduce((a, c) => (a.competence > c.competence ? a : c));
      // Le second est pris un peu en dessous : l'écart de salaire doit se voir
      // à l'écran, et c'est ce qui fait la différence entre les deux fiches.
      offer(createCtx(life), b, want.personId, Math.round(want.asking * (round === 0 ? 1 : 0.82)));
      play(life, 1);
      if (life.gameOver || !life.player.alive) break;
    }
    if (life.gameOver || !life.player.alive || life.player.prison) continue;
    if (crewOf(b).length < 2) continue;

    // Et une fournée de candidats à comparer, dans l'année en cours.
    life.player.yearActions = {};
    if (!openShortlist(createCtx(life), b, wageOf(life, kind)).ok) continue;
    if ((b.shortlist ?? []).length === 0) continue;

    return life;
  }
  throw new Error('aucune graine ne donne un patron avec une équipe');
}

const state = bossLife();
process.stdout.write(JSON.stringify(state));
