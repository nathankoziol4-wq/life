/**
 * Fabrique une sauvegarde d'un musicien avec un catalogue derrière lui.
 *
 * Pourquoi : un disque ne se voit que des années après avoir été enregistré.
 * Il faut du métier pour qu'on vous signe, deux ans pour produire un album,
 * et plusieurs années encore pour que le classement raconte quelque chose.
 * Une vie jouée toute seule n'ouvre jamais cet écran.
 *
 * Rien n'est posé à la main : les titres, les rangs, les droits et la
 * tournée sortent de `startRecording`, `advanceRecords` et `hitTheRoad` —
 * c'est-à-dire des mêmes fonctions que joue le joueur.
 *
 *   node --experimental-strip-types tools/fixture-disque.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import { acceptOffer, autoPerform, startDiscipline } from '../src/systems/stage.ts';
import {
  addDate, bestChart, hitTheRoad, inProduction, recordBlocker, released,
  signBlocker, signLabel, startRecording,
} from '../src/systems/records.ts';
import { getFormat } from '../src/data/records.ts';

function play(life, years) {
  for (let year = 0; year < years && !life.gameOver; year++) {
    simulateYear(life);
    const ctx = createCtx(life);
    for (const pending of [...life.pending]) resolvePending(ctx, pending.id, 0);
    life.pending = [];
  }
}

function recordingLife() {
  for (let seed = 40_000; seed < 41_500; seed++) {
    const life = createNewLife({ seed });
    play(life, 22);
    if (life.gameOver || !life.player.alive || life.player.prison) continue;
    if (life.player.criminalRecord.wanted) continue;

    life.player.yearActions = {};
    if (!startDiscipline(createCtx(life), 'musique').ok) continue;

    // Vingt ans de métier : on joue ce qu'on nous propose, on enregistre dès
    // qu'on peut, et l'on signe quand quelqu'un veut bien de nous.
    for (let year = 0; year < 20 && !life.gameOver && life.player.alive; year++) {
      const stage = life.player.stage;
      if (!stage) break;
      life.player.yearActions = {};

      if (!stage.deal && !signBlocker(life, { id: 'indep', craft: 28, fame: 4 })) {
        for (const id of ['moyen', 'indep']) {
          if (!signBlocker(life, { id, craft: 0, fame: 0 })) { /* garde-fou */ }
        }
      }
      // On signe la meilleure maison accessible, une seule fois.
      if (!stage.deal) {
        for (const id of ['major', 'moyen', 'indep']) {
          const label = { id };
          if (signLabel(createCtx(life), id).ok) break;
          void label;
        }
      }

      if (!inProduction(life)) {
        // Le format le plus ambitieux qu'on puisse produire.
        for (const id of ['album', 'ep', 'single', 'demo']) {
          const format = getFormat(id);
          if (format && !recordBlocker(life, format)) {
            startRecording(createCtx(life), id);
            break;
          }
        }
      }

      if (stage.current === null && stage.offers.length > 0) {
        if (acceptOffer(createCtx(life), stage.offers[0].id).ok) {
          autoPerform(createCtx(life));
        }
      }
      play(life, 1);
    }
    if (life.gameOver || !life.player.alive || life.player.prison) continue;
    const stage = life.player.stage;
    if (!stage) continue;

    // Une tournée posée mais pas encore partie : l'écran doit montrer la
    // composition, qui est le cœur de ce système.
    life.player.yearActions = {};
    for (const venue of ['theatre', 'club', 'club', 'theatre']) {
      addDate(createCtx(life), venue);
    }

    if (released(life).length < 3) continue;
    if (bestChart(life) === 0 || bestChart(life) > 80) continue;
    if (!stage.tour || stage.tour.dates.length === 0) continue;
    return life;
  }
  throw new Error('aucune graine ne donne un catalogue de disques');
}

const state = recordingLife();
state.player.yearActions = {};
process.stdout.write(JSON.stringify(state));
