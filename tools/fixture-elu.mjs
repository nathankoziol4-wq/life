/**
 * Fabrique une sauvegarde de quelqu'un qui gouverne.
 *
 * Pourquoi : un mandat ne s'obtient pas par hasard. Il faut des années de
 * métier politique, une notoriété, une campagne financée et menée, et un
 * scrutin gagné. Une vie jouée toute seule n'ouvre donc jamais cet écran, et
 * il ne serait photographié qu'à l'état vide.
 *
 * Rien n'est posé à la main : le programme, la caisse, les sondages,
 * l'adversaire et le résultat sortent de `togglePlank`, `raiseFunds`,
 * `playTactic`, `settleDebate` et `holdElection` — c'est-à-dire des mêmes
 * fonctions que joue le joueur. On se contente de faire campagne.
 *
 * **Deux arrêts possibles.** Par défaut on va jusqu'au mandat. Avec
 * `--campagne`, on s'arrête juste avant le scrutin : le programme est posé,
 * la caisse faite, les coups joués, et rien n'est encore décidé.
 *
 * Pourquoi les deux : l'écran des campagnes montre *soit* un mandat en cours,
 * *soit* une campagne en cours — jamais les deux. La sauvegarde qui gouverne
 * ne relève donc que la moitié haute de l'écran, et les axes, le financement,
 * les coups et le débat — c'est-à-dire l'essentiel de ses 510 lignes —
 * n'étaient sous aucun témoin.
 *
 *   node --experimental-strip-types tools/fixture-elu.mjs
 *   node --experimental-strip-types tools/fixture-elu.mjs --campagne
 */

/** S'arrêter la veille du scrutin plutôt qu'après. */
const beforeElection = process.argv.includes('--campagne');

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import { autoPerform, acceptOffer, startDiscipline } from '../src/systems/stage.ts';
import {
  candidacyBlocker, declareRun, holdElection, playTactic, raiseFunds,
  settleDebate, tacticBlocker, togglePlank,
} from '../src/systems/politics.ts';
import { getOffice } from '../src/data/politics.ts';

function play(life, years) {
  for (let year = 0; year < years && !life.gameOver; year++) {
    simulateYear(life);
    const ctx = createCtx(life);
    for (const pending of [...life.pending]) resolvePending(ctx, pending.id, 0);
    life.pending = [];
  }
}

function electedLife() {
  for (let seed = 60_000; seed < 61_500; seed++) {
    const life = createNewLife({ seed });
    play(life, 27);
    if (life.gameOver || !life.player.alive || life.player.prison) continue;
    if (life.player.criminalRecord.wanted) continue;

    life.player.yearActions = {};
    if (!startDiscipline(createCtx(life), 'tribune').ok) continue;

    // Douze ans de métier : on accepte ce qu'on nous propose et on le tient
    // comme le personnage sait le faire. C'est ainsi qu'on devient quelqu'un
    // à qui l'on peut confier une ville.
    for (let year = 0; year < 12 && !life.gameOver && life.player.alive; year++) {
      const stage = life.player.stage;
      if (stage && !stage.current && stage.offers.length > 0) {
        if (acceptOffer(createCtx(life), stage.offers[0].id).ok) {
          autoPerform(createCtx(life));
        }
      }
      play(life, 1);
    }
    if (life.gameOver || !life.player.alive || life.player.prison) continue;

    const office = getOffice('mairie');
    life.player.yearActions = {};
    if (candidacyBlocker(life, office)) continue;
    if (!declareRun(createCtx(life), 'mairie').ok) continue;

    // Une campagne complète, jouée comme le ferait quelqu'un qui s'y prend
    // bien : un programme cohérent, de l'argent propre, du terrain, et le
    // débat. Six coups, pas un de plus.
    togglePlank(createCtx(life), 'services');
    togglePlank(createCtx(life), 'emploi');
    raiseFunds(createCtx(life), 'petits');
    raiseFunds(createCtx(life), 'poche');
    for (const tactic of ['terrain', 'affichage', 'meeting']) {
      if (!tacticBlocker(life, tactic)) playTactic(createCtx(life), tactic);
    }
    settleDebate(createCtx(life), 0.82);

    // La veille du scrutin : tout est engagé, rien n'est tranché. On garde un
    // coup en réserve pour que l'écran ait encore quelque chose d'ouvert.
    if (beforeElection) {
      if (!life.player.campaign) continue;
      return life;
    }

    holdElection(createCtx(life));
    if (!life.player.mandate) continue;

    // Deux ans de mandat, pour qu'il y ait un bilan à montrer et une
    // décision sur le bureau.
    for (let year = 0; year < 2 && !life.gameOver && life.player.alive; year++) {
      play(life, 1);
    }
    if (life.gameOver || !life.player.alive) continue;
    const held = life.player.mandate;
    if (!held || !held.pending) continue;
    if (held.record.length === 0) continue;
    return life;
  }
  throw new Error('aucune graine ne donne un mandat en cours');
}

const state = electedLife();
state.player.yearActions = {};
process.stdout.write(JSON.stringify(state));
