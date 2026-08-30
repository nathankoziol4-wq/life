/**
 * Fabrique une sauvegarde où le chemin vers un enfant est engagé.
 *
 * Pourquoi : l'écran « Fonder une famille » n'a d'intérêt qu'à quatre
 * conditions, et une partie prise au hasard n'en réunit aucune — il faut avoir
 * vingt-cinq ans, de quoi payer, et surtout avoir déjà commencé quelque chose.
 *
 *   1. **un dossier ouvert et en cours**, pour que l'étape et l'attente
 *      restante soient à l'image — un écran qui ne montre que « aucun dossier »
 *      ne montre rien de ce que le système fait ;
 *   2. **un protocole déjà engagé plusieurs fois**, pour que le total dépensé
 *      et le « le énième rendra moins que le premier » se lisent ;
 *   3. **des poids négatifs et positifs à la fois** dans l'examen du dossier,
 *      parce que c'est la section qui distingue un dossier d'un tirage, et
 *      qu'une colonne toute verte ne prouve rien ;
 *   4. **encore des décisions devant soi** : ni refusé, ni abouti.
 *
 * Rien n'est posé à la main : les années passent par le moteur, le dossier par
 * `openFile` et les protocoles par `runCycle`, exactement comme chez le joueur.
 *
 *   node --experimental-strip-types tools/fixture-famille.mjs
 */

import { createCtx } from '../src/engine/context.ts';
import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import {
  fileFactors, fileOf, openFile, parenthoodOf, runCycle,
} from '../src/systems/parenthood.ts';

function familyLife() {
  for (let seed = 70_000; seed < 74_000; seed++) {
    const life = createNewLife({ seed });
    for (let year = 0; year < 31 && !life.gameOver; year++) simulateYear(life);
    if (life.gameOver || !life.player.alive || life.player.prison) continue;
    if (life.player.age < 27) continue;

    // De quoi payer les frais et quelques protocoles — sans cela l'écran
    // n'afficherait que des lignes fermées faute d'argent.
    life.player.money = Math.max(life.player.money, 300_000);

    // Deux protocoles, pour que le total dépensé et l'épuisement se voient.
    for (let i = 0; i < 2; i++) {
      parenthoodOf(life).lastCycle = null;
      life.player.yearActions = {};
      runCycle(createCtx(life));
    }
    if (parenthoodOf(life).cycles < 2) continue;

    // Un dossier ouvert sur l'enfant plus grand : une attente moyenne, donc
    // une ligne qui dit encore quelque chose plutôt qu'un compte à rebours
    // terminé.
    if (!openFile(createCtx(life), 'grand').ok) continue;

    // Et on le fait avancer de deux ans, pour sortir de la constitution.
    for (let year = 0; year < 2 && !life.gameOver; year++) {
      simulateYear(life);
      life.player.money = Math.max(life.player.money, 300_000);
    }
    const file = fileOf(life);
    if (!file || file.stage === 'refusé' || file.stage === 'arrivé') continue;

    // Condition 3 : l'examen doit montrer les deux signes. Une colonne d'un
    // seul côté ne prouverait pas que les poids se lisent.
    const factors = fileFactors(life);
    if (!factors.some((f) => f.weight > 0)) continue;
    if (!factors.some((f) => f.weight < 0)) continue;

    life.player.yearActions = {};
    life.pending = [];
    return life;
  }
  throw new Error('aucune graine ne donne un dossier en cours et un examen contrasté');
}

const state = familyLife();
process.stdout.write(JSON.stringify(state));
