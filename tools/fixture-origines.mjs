/**
 * Fabrique une sauvegarde où la question « d'où je viens » est ouverte.
 *
 * Pourquoi : l'écran n'a d'intérêt qu'à quatre conditions, et une partie prise
 * au hasard n'en réunit aucune — deux enfances sur sept se posent la question,
 * et il faut ensuite des années pour arriver au moment intéressant.
 *
 *   1. **une enfance adoptée ou placée**, sinon l'écran dit seulement que la
 *      question ne se pose pas ;
 *   2. **le personnage doit savoir**, sans quoi l'écran est muet — c'est
 *      voulu, mais ça ne se photographie pas ;
 *   3. **une piste déjà entamée sans être finie**, pour que la jauge, la
 *      solidité et les chances de chaque ligne soient à l'image ;
 *   4. **une tension visible chez ceux qui l'ont élevé**, parce que c'est la
 *      monnaie que le joueur dépense sans la voir, et la seule raison pour
 *      laquelle « leur demander » n'est pas la réponse évidente à tout.
 *
 * Rien n'est posé à la main : les années passent par le moteur et les pistes
 * par `follow`, exactement comme chez le joueur.
 *
 *   node --experimental-strip-types tools/fixture-origines.mjs
 */

import { createCtx } from '../src/engine/context.ts';
import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { canGo, follow, leadBlocker, raisedBy, rootsOf } from '../src/systems/roots.ts';

function rootedLife() {
  for (let seed = 60_000; seed < 66_000; seed++) {
    const life = createNewLife({ seed });
    if (!rootsOf(life)) continue;

    // On avance jusqu'à ce qu'il sache, puis on cherche quelques années.
    for (let year = 0; year < 26 && !life.gameOver; year++) {
      simulateYear(life);
      life.player.money = Math.max(life.player.money, 120_000);
      const roots = rootsOf(life);
      if (roots.knownYear === null || roots.outcome !== null) continue;

      /*
       * Une politique qui produit l'image qu'on veut : on demande deux fois
       * (pour la tension), puis on paie (pour la solidité). C'est aussi une
       * façon de jouer parfaitement plausible, et c'est important — un
       * fixture qui met le jeu dans un état qu'aucun joueur n'atteindrait
       * photographie autre chose que le jeu.
       */
      const wanted = roots.tried.length < 2 ? ['demander'] : ['organisme', 'registre', 'parente'];
      const lead = wanted.find((id) => leadBlocker(life, id) === null);
      if (lead) follow(createCtx(life), lead);
      if (canGo(life)) break;
    }

    const roots = rootsOf(life);
    if (life.gameOver || !life.player.alive) continue;
    if (roots.knownYear === null || roots.outcome !== null) continue;
    // Entamée mais pas finie : c'est l'état où toutes les décisions sont
    // encore devant le joueur.
    if (roots.trail <= 0 || roots.trail >= 100) continue;
    if (roots.strain <= 0) continue;
    if (raisedBy(life).length === 0) continue;

    life.player.yearActions = {};
    life.pending = [];
    return life;
  }
  throw new Error('aucune graine ne donne une recherche entamée et vivante');
}

const state = rootedLife();
process.stdout.write(JSON.stringify(state));
