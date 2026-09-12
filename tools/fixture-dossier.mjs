/**
 * Fabrique une sauvegarde où un dossier attend une décision.
 *
 * Pourquoi : l'écran « Ton dossier » n'existe qu'entre la porte et l'oubli —
 * deux ans — et une partie prise au hasard n'y tombe presque jamais. Trois
 * conditions, et la deuxième est celle qui rend l'écran lisible :
 *
 *   1. **un licenciement subi**, et non une démission : on ne conteste pas son
 *      propre départ ;
 *   2. **un dossier au milieu de la plage**, ni écrasant ni désespéré — c'est
 *      là que les deux issues se valent à peu près, donc là que l'écran montre
 *      une décision plutôt qu'une évidence ;
 *   3. **des poids des deux signes** dans la pesée, parce qu'une colonne toute
 *      verte ne prouverait pas que le dossier se lit.
 *
 * Rien n'est posé à la main : les années passent par le moteur, et le
 * licenciement par `careers.ts#fire`, exactement comme dans une partie — ce
 * qui garantit au passage que l'instantané est bien pris au bon moment.
 *
 *   node --experimental-strip-types tools/fixture-dossier.mjs
 */

import { createCtx } from '../src/engine/context.ts';
import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { getJob } from '../src/data/jobs.ts';
import { buildTeam } from '../src/systems/workplace.ts';
import { fire } from '../src/systems/careers.ts';
import { caseOf, reasons, strengthOf } from '../src/systems/dismissal.ts';

function dismissedLife() {
  for (let seed = 60_000; seed < 64_000; seed++) {
    const life = createNewLife({ seed });
    for (let year = 0; year < 42 && !life.gameOver; year++) simulateYear(life);
    if (life.gameOver || !life.player.alive || life.player.prison) continue;
    if (life.player.age < 40) continue;

    // Une place tenue depuis un moment, avec un avertissement au dossier :
    // c'est ce qui fait une pesée contrastée plutôt qu'une colonne verte.
    const def = getJob('lawyer') ?? getJob('doctor');
    if (!def) continue;
    const level = Math.max(1, def.levels.length - 2);
    life.player.job = {
      jobId: def.id,
      title: def.levels[level].title,
      level,
      salary: def.levels[level].salary,
      employer: 'Cabinet Vasseur',
      performance: 63,
      yearsAtJob: 9,
      effort: 'normal',
      lastRaiseAskYear: 0,
      partTime: false,
      hours: def.hours,
      satisfaction: 55,
      team: [],
      warnings: 1,
      leaveTaken: 0,
      suspicion: 0,
      taken: 0,
      tookYear: 0,
    };
    life.player.job.team = buildTeam(createCtx(life));

    // Le licenciement passe par le moteur : c'est lui qui doit ouvrir le
    // dossier, et le faire au bon moment.
    fire(createCtx(life), 'restructuration');
    const file = caseOf(life);
    if (!file) continue;

    // Condition 2 : au milieu, là où la décision en est une.
    const strength = strengthOf(life);
    if (strength < 40 || strength > 70) continue;

    // Condition 3 : les deux signes dans la pesée.
    const rows = reasons(life);
    if (!rows.some((r) => r.weight > 0)) continue;
    if (!rows.some((r) => r.weight < 0)) continue;

    // De quoi pouvoir payer les honoraires, sinon les deux lignes seraient
    // fermées et l'écran ne montrerait aucune décision.
    life.player.money = Math.max(life.player.money, 60_000);
    life.player.yearActions = {};
    life.pending = [];
    return life;
  }
  throw new Error('aucune graine ne donne un dossier au milieu de la plage et contrasté');
}

const state = dismissedLife();
process.stdout.write(JSON.stringify(state));
