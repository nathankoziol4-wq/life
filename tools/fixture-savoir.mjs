/**
 * Fabrique une sauvegarde où l'on peut apprendre quelque chose.
 *
 * Pourquoi : l'écran des compétences n'a d'intérêt qu'à trois conditions, et
 * une partie prise au hasard n'en réunit aucune. Il faut de quoi payer les
 * séances, un métier pour que la ligne « ton métier » ait un sens, et
 * surtout **une compétence dont le don est déjà connu à côté d'une dont il ne
 * l'est pas** — c'est la distinction que l'écran doit rendre lisible, et la
 * seule qu'une capture d'écran puisse démentir.
 *
 * Rien n'est posé à la main : les séances passent par `practice`, la même
 * fonction que joue le joueur, et le don se lit de la graine.
 *
 *   node --experimental-strip-types tools/fixture-savoir.mjs
 */

import { createCtx } from '../src/engine/context.ts';
import { autoplayLife } from '../src/engine/__bench__/autoplay.ts';
import { availableSkills, giftKnown, practice, practiceBlocker } from '../src/systems/skills.ts';
import { REVEAL } from '../src/data/skills.ts';

function savoirLife() {
  // L'auto-joueur, pas une vie laissée à elle-même : une vie non jouée ne
  // postule jamais, et la ligne « ton métier » de l'écran resterait vide —
  // c'est exactement ce qui avait déjà fait échouer le fixture de parent.
  for (let seed = 20_000; seed < 22_000; seed++) {
    const life = autoplayLife(seed, { maxYears: 34 });
    if (life.gameOver || !life.player.alive || life.player.prison) continue;
    if (!life.player.job) continue;

    // De quoi payer : l'écran doit montrer des lignes ouvertes, pas dix
    // refus « il te faudrait tant ».
    life.player.money = Math.max(life.player.money, 150_000);

    // Un don cherché jusqu'au bout, sur la première compétence ouverte.
    const open = availableSkills(life);
    if (open.length < 3) continue;
    const cherché = open[0];
    for (let i = 0; i < REVEAL; i++) {
      life.player.yearActions = {};
      if (practiceBlocker(life, cherché.id)) break;
      practice(createCtx(life), cherché.id);
    }
    if (!giftKnown(life, cherché.id)) continue;

    // Et une seconde entamée sans l'être assez pour savoir : c'est le
    // contraste que l'écran doit rendre.
    life.player.yearActions = {};
    practice(createCtx(life), open[1].id);
    if (giftKnown(life, open[1].id)) continue;

    life.player.yearActions = {};
    life.pending = [];
    return life;
  }
  throw new Error('aucune graine ne donne un don connu à côté d’un don inconnu');
}

const state = savoirLife();
process.stdout.write(JSON.stringify(state));
