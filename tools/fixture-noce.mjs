/**
 * Fabrique une sauvegarde où la noce est à préparer.
 *
 * Pourquoi : l'écran « La noce » n'existe qu'entre le oui et le jour, et une
 * partie prise au hasard ne tombe presque jamais dans cet entre-deux. Il lui
 * faut quatre choses, et la quatrième est celle qui compte :
 *
 *   1. **des fiançailles en cours**, sinon l'écran ne montre que « rien à
 *      préparer » ;
 *   2. **l'année d'attente passée**, sinon la seule ligne qui conclut est
 *      fermée et l'on ne voit pas ce que la journée fait ;
 *   3. **de quoi payer une salle mais pas un domaine** — c'est ce qui rend le
 *      bandeau de prix lisible : un personnage à trois millions choisirait le
 *      plus beau lieu sans y penser, et il n'y aurait pas d'arbitrage à
 *      l'image ;
 *   4. **assez de proches pour qu'il en reste dehors**, parce que le chiffre
 *      « n proche(s) dehors » est le seul des trois que le joueur ne
 *      calculerait pas lui-même, et le seul qui fasse de la mairie à quatre
 *      places autre chose qu'une bonne affaire.
 *
 * Rien n'est posé à la main : les années passent par le moteur et les
 * fiançailles par `betroth`, comme après une demande acceptée.
 *
 *   node --experimental-strip-types tools/fixture-noce.mjs
 */

import { createCtx } from '../src/engine/context.ts';
import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createPerson } from '../src/systems/npc.ts';
import { PLANNING } from '../src/data/wedding.ts';
import { betroth, leftOut, planOf, setSpread, setVenue, weddingBlocker } from '../src/systems/wedding.ts';

function engagedLife() {
  for (let seed = 90_000; seed < 94_000; seed++) {
    const life = createNewLife({ seed });
    for (let year = 0; year < 29 && !life.gameOver; year++) simulateYear(life);
    if (life.gameOver || !life.player.alive || life.player.prison) continue;
    if (life.player.age < 26) continue;

    // Un fiancé, comme après une demande acceptée.
    const mate = createPerson(createCtx(life), { relation: 'partner', age: life.player.age });
    mate.relationship = 84;
    betroth(createCtx(life), mate);

    // L'année de préparation, jouée et non posée : la vie continue pendant
    // les fiançailles, et c'est le sujet.
    for (let year = 0; year < PLANNING && !life.gameOver; year++) simulateYear(life);
    if (life.gameOver || !life.player.alive) continue;
    const plan = planOf(life);
    if (!plan || plan.done) continue;

    /*
     * Condition 3 : une salle des fêtes à portée, un domaine hors de portée.
     * C'est la fourchette où le bandeau de prix devient une décision plutôt
     * qu'une formalité.
     */
    life.player.money = 9_400;
    setVenue(createCtx(life), 'salle');
    setSpread(createCtx(life), 'simple');
    if (weddingBlocker(life) !== null) continue;

    // Condition 4 : il doit rester du monde dehors, sinon le troisième côté
    // de l'arbitrage n'est pas à l'image.
    if (leftOut(life) < 3) continue;

    life.player.yearActions = {};
    life.pending = [];
    return life;
  }
  throw new Error('aucune graine ne donne des fiançailles prêtes et des proches à laisser dehors');
}

const state = engagedLife();
process.stdout.write(JSON.stringify(state));
