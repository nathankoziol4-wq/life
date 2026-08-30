/**
 * Fabrique une sauvegarde avec une affaire ouverte et de quoi la plaider.
 *
 * Pourquoi : l'audience n'existe qu'entre l'arrestation et le verdict, et une
 * partie prise au hasard n'y tombe presque jamais — il faut avoir commis
 * quelque chose, s'être fait prendre, et ne pas encore avoir choisi d'avocat.
 * Trois conditions, et la troisième est celle qui rend l'écran lisible :
 *
 *   1. **un procès en attente**, sinon la section Justice ne montre rien ;
 *   2. **de quoi payer un avocat**, sans quoi toutes les lignes seraient
 *      fermées et l'on ne verrait aucune décision ;
 *   3. **des charges contrastées** — au moins une que l'accusation tient, au
 *      moins une creuse. Une audience dont tous les points se ressemblent ne
 *      montrerait pas ce que le système fait, qui est précisément de choisir
 *      où dépenser son crédit.
 *
 * L'arrestation passe par le moteur : c'est `justice.ts#arrest` qui doit
 * ouvrir l'affaire, avec la force de preuve qu'il calcule lui-même.
 *
 *   node --experimental-strip-types tools/fixture-audience.mjs
 */

import { createCtx } from '../src/engine/context.ts';
import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { CRIME_MAP } from '../src/data/crimes.ts';
import { arrest, pendingTrial } from '../src/systems/justice.ts';
import { chargesOf, solidityOf } from '../src/systems/hearing.ts';

function accusedLife() {
  for (let seed = 50_000; seed < 54_000; seed++) {
    const life = createNewLife({ seed });
    for (let year = 0; year < 34 && !life.gameOver; year++) simulateYear(life);
    if (life.gameOver || !life.player.alive || life.player.prison) continue;
    if (life.player.age < 30) continue;

    // Condition 2 : de quoi choisir, y compris le plus cher — sinon la
    // gamme d'avocats ne se lirait pas.
    life.player.money = Math.max(life.player.money, 400_000);

    arrest(createCtx(life), CRIME_MAP.burglary, 0);
    const trial = pendingTrial(life);
    if (!trial) continue;

    /*
     * Condition 3 : des charges des deux sortes. On lit la solidité réelle
     * ici — le joueur, lui, n'en verra qu'une part selon son avocat.
     */
    const solidities = chargesOf(life).map((c) => solidityOf(life, c));
    if (!solidities.some((s) => s >= 65)) continue;
    if (!solidities.some((s) => s <= 35)) continue;

    life.player.yearActions = {};
    life.pending = [];
    return life;
  }
  throw new Error('aucune graine ne donne une affaire ouverte et des charges contrastées');
}

const state = accusedLife();
process.stdout.write(JSON.stringify(state));
