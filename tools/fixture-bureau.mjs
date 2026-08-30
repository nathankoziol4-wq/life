/**
 * Fabrique une sauvegarde où il y a quelque chose à approcher.
 *
 * Pourquoi : l'écran « Ce qui passe par tes mains » ne s'ouvre qu'au-dessus
 * d'un certain rang, et une partie prise au hasard n'y arrive jamais — la
 * portée vient du haut de l'échelle et des années passées là, c'est-à-dire de
 * trente ans de carrière. Quatre conditions, et la troisième est celle qui
 * rend l'écran lisible :
 *
 *   1. **un poste haut placé et ancien**, sans quoi la ligne n'apparaît même
 *      pas dans le menu Travail ;
 *   2. **une portée franche**, pour que les quatre portions se distinguent à
 *      l'image plutôt que d'afficher quatre fois « 0 $ » ;
 *   3. **du soupçon déjà accumulé**, parce qu'une jauge à zéro ne montre ni
 *      ce que le soupçon dit, ni ce qu'une année tranquille en retirerait —
 *      c'est-à-dire aucune des deux moitiés de la décision ;
 *   4. **l'année encore libre**, pour qu'on puisse prendre devant témoin.
 *
 * Rien n'est posé à la main du côté du personnage : les années passent par le
 * moteur. Seul le poste est placé, parce qu'attendre une promotion au sommet
 * d'une échelle demanderait plusieurs centaines de graines.
 *
 *   node --experimental-strip-types tools/fixture-bureau.mjs
 */

import { createCtx } from '../src/engine/context.ts';
import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { getJob } from '../src/data/jobs.ts';
import { buildTeam } from '../src/systems/workplace.ts';
import { help, reachOf, suspicionOf } from '../src/systems/office.ts';
import { REACH_FLOOR } from '../src/data/office.ts';

function officeLife() {
  for (let seed = 80_000; seed < 84_000; seed++) {
    const life = createNewLife({ seed });
    for (let year = 0; year < 46 && !life.gameOver; year++) simulateYear(life);
    if (life.gameOver || !life.player.alive || life.player.prison) continue;
    if (life.player.age < 44) continue;

    // Une place haute dans une maison, et des années dedans.
    const def = getJob('lawyer') ?? getJob('doctor');
    if (!def) continue;
    const level = def.levels.length - 1;
    life.player.job = {
      jobId: def.id,
      title: def.levels[level].title,
      level,
      salary: def.levels[level].salary,
      employer: 'Cabinet Vasseur',
      performance: 68,
      yearsAtJob: 16,
      effort: 'normal',
      lastRaiseAskYear: 0,
      partTime: false,
      hours: def.hours,
      satisfaction: 58,
      team: [],
      warnings: 0,
      leaveTaken: 0,
      suspicion: 0,
      taken: 0,
      tookYear: 0,
    };
    life.player.job.team = buildTeam(createCtx(life));

    // Condition 2 : une portée franche, sinon les portions se ressemblent.
    if (reachOf(life) < REACH_FLOOR * 8) continue;

    /*
     * Condition 3 : du soupçon déjà là. On le fabrique en se servant une
     * fois, comme le joueur — et non en écrivant le nombre à la main, ce qui
     * pourrait afficher un état que le système ne produit jamais.
     */
    life.player.yearActions = {};
    if (!help(createCtx(life), 'large').ok) continue;
    if (suspicionOf(life) < 4) continue;

    // Condition 4 : l'année redevient libre, pour qu'on puisse décider.
    life.player.yearActions = {};
    life.pending = [];
    return life;
  }
  throw new Error('aucune graine ne donne un poste haut, ancien et déjà entamé');
}

const state = officeLife();
process.stdout.write(JSON.stringify(state));
