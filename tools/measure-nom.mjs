/**
 * Le nom vaut-il quelque chose, et pas partout ?
 *
 * Quatre questions, dans l'ordre où elles peuvent invalider le système :
 *
 *   1. **est-ce assez rare pour rester une exception ?** Un milieu de plus
 *      dans la liste ne serait pas une autre façon de jouer ;
 *   2. **le nom n'ouvre-t-il que sa porte ?** S'il aide partout, c'est une
 *      prime de départ déguisée ;
 *   3. **se paie-t-il vraiment ?** On est regardé dès l'enfance : si cela ne
 *      coûte rien, il n'y a pas d'arbitrage à suivre le parent ou non ;
 *   4. **s'use-t-il ?** Un capital qui ne fond pas est un revenu.
 *
 *   node --experimental-strip-types tools/measure-nom.mjs
 */

import { createCtx } from '../src/engine/context.ts';
import { createNewLife } from '../src/engine/newLife.ts';
import { simulateYear } from '../src/engine/simulateYear.ts';
import { doorFor, legacyOf, nameLevel, watchedFactor } from '../src/systems/legacy.ts';
import { advanceFame, recognitionFactor } from '../src/systems/fame.ts';
import { FAME_FIELDS } from '../src/data/fame.ts';
import { BORN_KNOWN, FORGOTTEN } from '../src/data/legacy.ts';

const N = 3_000;
const pct = (a, b) => `${((a / b) * 100).toFixed(2)} %`;

/* 1. La fréquence. */
{
  let born = 0;
  const fields = new Map();
  const standings = new Map();
  for (let s = 0; s < N; s++) {
    const state = createNewLife({ seed: s * 31 + 7 });
    const legacy = state.player.legacy;
    if (!legacy) continue;
    born += 1;
    fields.set(legacy.field, (fields.get(legacy.field) ?? 0) + 1);
    standings.set(legacy.standing, (standings.get(legacy.standing) ?? 0) + 1);
  }
  console.log(`Naître d’un nom : ${born}/${N} = ${pct(born, N)} (visé ${(BORN_KNOWN * 100).toFixed(1)} %)`);
  console.log('  hauteurs :', [...standings].map(([k, v]) => `${k} ${v}`).join(' · '));
  console.log(`  domaines rencontrés : ${fields.size}/11`);
}

/* Une vie qui commence avec un nom, pour les mesures suivantes. */
function named(from = 0) {
  for (let s = from; s < from + 40_000; s++) {
    const state = createNewLife({ seed: s * 31 + 7 });
    if (state.player.legacy) return state;
  }
  return null;
}

/* 2. La porte n'ouvre que son domaine. */
{
  const state = named();
  if (state) {
    const legacy = state.player.legacy;
    const inField = doorFor(state, legacy.field);
    const elsewhere = doorFor(state, 'fourneaux' === legacy.field ? 'terrain' : 'fourneaux');
    const nowhere = doorFor(state, null);
    console.log('');
    console.log('Ce que le nom ouvre :');
    console.log(`  dans son domaine (${legacy.field}) : ×${inField.toFixed(3)}`);
    console.log(`  dans un autre                      : ×${elsewhere.toFixed(3)}`);
    console.log(`  là où rien n’est public            : ×${nowhere.toFixed(3)}`);
    console.log(`  rapport dedans/dehors : ${(((inField - 1) / Math.max(0.0001, elsewhere - 1))).toFixed(1)}×`);
  }
}

/* 3. Ce qu'il coûte en discrétion, dès l'enfance. */
{
  const named0 = named();
  const plain = createNewLife({ seed: 999_331 });
  if (named0) {
    console.log('');
    console.log('Ce que le nom coûte en discrétion :');
    console.log(`  enfant connu  : ×${watchedFactor(named0).toFixed(3)} · reconnaissance ×${recognitionFactor(named0).toFixed(3)}`);
    console.log(`  enfant quelconque : ×${watchedFactor(plain).toFixed(3)} · reconnaissance ×${recognitionFactor(plain).toFixed(3)}`);
  }
}

/* 4. L'usure, jouée pour de vrai. */
{
  const state = named();
  if (state) {
    console.log('');
    console.log('Ce que le temps en fait :');
    const marks = [0, 10, 20, 30, 40, 50];
    let forgottenAt = null;
    for (let age = 0; age <= 55 && !state.gameOver && state.player.alive; age++) {
      if (marks.includes(age)) {
        const parent = state.npcs[state.player.legacy.parentId];
        console.log(`  ${String(age).padStart(2)} ans : ${String(nameLevel(state)).padStart(3)}/100`
          + ` · parent ${parent?.alive ? 'vivant' : 'disparu'}`);
      }
      if (forgottenAt === null && nameLevel(state) < FORGOTTEN) forgottenAt = age;
      simulateYear(state);
    }
    console.log(`  oublié vers ${forgottenAt ?? '—'} ans (seuil ${FORGOTTEN})`);
  }
}

/* 5. Suivre le parent, ou non — mesuré sur le mécanisme et non sur une vie.
 *
 * Une vie jouée passivement ne devient jamais connue : le nom y serait
 * invisible et l'on n'apprendrait rien. On mesure donc ce que le nom fait à
 * la notoriété **quand on en fait quelque chose**, dans son domaine et
 * ailleurs.
 */
{
  const state = named();
  if (state) {
    const legacy = state.player.legacy;
    const other = FAME_FIELDS.find((f) => f.id !== 'aucun' && f.id !== legacy.field).id;

    /*
     * **Une vraie source de notoriété, et non un niveau poussé à la main.**
     * La première version montait `fame.level` directement, or la porte
     * multiplie la *pression* — ce que les sources apportent dans l'année.
     * Multiplier zéro par 1,6 donnait zéro, et la mesure ne disait rien. On
     * donne donc un métier qui expose, ce qui est le chemin réel.
     */
    const run = (field, years) => {
      const life = createNewLife({ seed: 4242 });
      life.player.legacy = { ...legacy, field };
      life.player.job = {
        jobId: 'journalist', title: 'Journaliste', level: 3, salary: 60_000,
        employer: 'La Gazette', performance: 80, yearsAtJob: 6, effort: 'normal',
        lastRaiseAskYear: 0, partTime: false, hours: 40, satisfaction: 60,
        team: [], warnings: 0, leaveTaken: 0, suspicion: 0, taken: 0, tookYear: 0,
      };
      life.player.fame = {
        level: 8, peak: 8, field: 'plateau', controversy: 55, goodwill: 50,
        scandals: [], interview: null, earnedThisYear: 0,
      };
      for (let i = 0; i < years; i++) advanceFame(createCtx(life));
      return { level: life.player.fame.level, controversy: life.player.fame.controversy };
    };

    // Le métier expose dans « plateau » : on compare un parent connu pour ce
    // domaine-là à un parent connu pour un autre.
    const inside = run('plateau', 12);
    const outside = run(other === 'plateau' ? 'terrain' : other, 12);
    console.log('');
    console.log('Suivre le parent, ou non — même métier exposé, douze ans :');
    console.log(`  dans son domaine : notoriété ${inside.level.toFixed(1)} · reproches ${inside.controversy.toFixed(1)}`);
    console.log(`  ailleurs         : notoriété ${outside.level.toFixed(1)} · reproches ${outside.controversy.toFixed(1)}`);
    console.log(`  le nom porte ${(inside.level - outside.level).toFixed(1)} points plus haut,`
      + ` et laisse ${(inside.controversy - outside.controversy).toFixed(1)} de reproches en plus.`);
  }
}
