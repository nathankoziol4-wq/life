/**
 * Fabrique une sauvegarde d'un étudiant au milieu de son cursus.
 *
 * Pourquoi : la promotion — les gens avec qui l'on fait ses études, et qui
 * entreront dans le même métier — n'existe que pendant les années
 * d'université. Les sept sauvegardes du parcours ont 9, 17, 29, 38, 44, 45 et
 * 47 ans, et sont toutes soit écolières, soit diplômées, soit sorties en
 * route : **aucune n'est étudiante**. L'écran de la promotion n'aurait donc
 * figuré dans aucun témoin, exactement comme l'enfance n'y figurait pas.
 *
 * Rien n'est posé à la main : on joue une vie entière avec le vrai moteur, on
 * entre à l'université par `enrollUniversity` comme le ferait le joueur, et
 * l'on avance de deux années pour que la promotion ait vécu un peu. On garde
 * la première graine où l'admission passe — elle reste un tirage.
 *
 *   node --experimental-strip-types tools/fixture-promo.mjs
 */

import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { createCtx } from '../src/engine/context.ts';
import { resolvePending } from '../src/systems/randomEvents.ts';
import { enrollUniversity } from '../src/systems/education.ts';
import { hasCohort, spendYear } from '../src/systems/cohort.ts';
import { MAJORS } from '../src/data/degrees.ts';

function play(life, years) {
  for (let year = 0; year < years && !life.gameOver; year++) {
    simulateYear(life);
    const ctx = createCtx(life);
    for (const pending of [...life.pending]) resolvePending(ctx, pending.id, 0);
    life.pending = [];
  }
}

function studentLife() {
  for (let seed = 30_000; seed < 30_600; seed++) {
    const life = createNewLife({ seed });
    // Jusqu'au bac : on ne triche pas sur le parcours scolaire, dont dépend
    // l'admission.
    while (!life.gameOver && life.player.alive && life.player.age < 18) play(life, 1);
    if (life.gameOver || !life.player.alive) continue;
    if (life.player.education.level < 1) continue;

    // Une filière que ce dossier peut viser. Sans quoi l'on ne mesurerait que
    // des refus, ce qui est déjà couvert ailleurs.
    const major = MAJORS.find((m) => m.minIntelligence <= life.player.stats.intelligence - 4);
    if (!major) continue;
    life.player.yearActions = {};
    enrollUniversity(createCtx(life), major.id);
    if (!hasCohort(life)) continue;

    // Deux années d'études, dont une passée avec eux : la promotion doit
    // avoir une histoire, sinon l'écran montre quatre inconnus à vingt.
    spendYear(createCtx(life), 'sortir');
    play(life, 1);
    if (life.gameOver || !life.player.alive || !hasCohort(life)) continue;
    spendYear(createCtx(life), 'réviser');
    play(life, 1);
    if (life.gameOver || !life.player.alive || !hasCohort(life)) continue;

    return life;
  }
  throw new Error('aucune graine ne donne un étudiant en cours de cursus');
}

const state = studentLife();
state.player.yearActions = {};
process.stdout.write(JSON.stringify(state));
