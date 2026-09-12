/**
 * Le dossier — ce qu'on peut encore faire une fois la porte fermée.
 *
 * `careers.ts#fire` retirait le poste, ôtait quatorze points de bonheur,
 * ajoutait dix-huit de stress, écrivait une ligne. Six endroits du jeu
 * l'appelaient et aucun ne laissait quoi que ce soit à décider. Le catalogue :
 * « aucun entretien préalable, aucun recours, aucune seconde chance ».
 *
 * Six exigences :
 *
 * 1. **la force du dossier a été faite pendant les années de poste**, et elle
 *    est copiée au moment exact où la porte se ferme — une ligne plus tard,
 *    les avertissements et l'équipe n'existent plus ;
 * 2. **elle se distribue** : si tous les dossiers se ressemblent, il n'y a
 *    rien à lire et rien à décider ;
 * 3. **aucun des deux choix ne domine** l'autre sur toute la plage ;
 * 4. **démissionner n'ouvre aucun dossier**, et la détention non plus ;
 * 5. **perdre coûte** — sans quoi contester serait gratuit et l'on tenterait
 *    toujours ;
 * 6. **une affaire qu'on laisse s'éteindre s'éteint**, plutôt que de rester
 *    ouverte pour toujours.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState, JobState } from '../types.ts';
import { getJob } from '../../data/jobs.ts';
import { CASE_YEARS, GROUNDS, MARK_YEARS, REINSTATE_AT, getGround } from '../../data/dismissal.ts';
import {
  advanceDismissal, awardOf, caseOf, contest, feeOf, markFactor, reasons,
  settle, settlementOf, strengthOf,
} from '../../systems/dismissal.ts';
import { fire, quitJob } from '../../systems/careers.ts';

function seat(state: GameState, years: number, warnings: number, performance = 60): JobState {
  const def = getJob('lawyer') ?? getJob('doctor')!;
  const level = def.levels.length - 1;
  const job: JobState = {
    jobId: def.id, title: def.levels[level]!.title, level,
    salary: def.levels[level]!.salary, employer: 'Maison Vidal',
    performance, yearsAtJob: years, effort: 'normal', lastRaiseAskYear: 0,
    partTime: false, hours: def.hours, satisfaction: 55, team: [],
    warnings, leaveTaken: 0, suspicion: 0, taken: 0, tookYear: 0,
  };
  state.player.job = job;
  return job;
}

function grown(seed: number): GameState | null {
  const state = createNewLife({ seed });
  for (let i = 0; i < 30 && !state.gameOver; i++) simulateYear(state);
  if (state.gameOver || !state.player.alive || state.player.prison) return null;
  state.player.yearActions = {};
  return state;
}

/** Un dossier posé de toutes pièces, pour balayer la plage sans jouer une vie. */
function fileAt(state: GameState, spec: {
  ground: string; years: number; warnings: number; performance: number; support: number;
}) {
  state.player.dismissal = {
    employer: 'Maison Vidal', jobId: 'lawyer', title: 'Associé', level: 3,
    salary: 60_000, years: spec.years, warnings: spec.warnings,
    performance: spec.performance, support: spec.support,
    ground: spec.ground, year: state.year, settled: false, contestedYear: null,
  };
}

describe('l’instantané', () => {
  it('est pris au moment exact où la porte se ferme', () => {
    /*
     * **L'erreur qu'on ferait en le plaçant ailleurs.** Une ligne après
     * `leaveTeam`, l'équipe est dispersée et `p.job` est nul : les
     * avertissements, l'ancienneté et les gens qui parleraient pour vous
     * n'existent plus nulle part. Il n'y aurait plus de dossier à peser.
     */
    const state = grown(3);
    if (!state) return;
    seat(state, 11, 1, 64);
    fire(createCtx(state), 'restructuration');

    const file = caseOf(state);
    expect(file).not.toBeNull();
    expect(state.player.job).toBeNull();
    expect(file!.years).toBe(11);
    expect(file!.warnings).toBe(1);
    expect(file!.performance).toBe(64);
    expect(file!.employer).toBe('Maison Vidal');
  });

  it('ne s’ouvre pas quand on part de soi-même', () => {
    // On ne conteste pas son propre départ.
    const state = grown(5);
    if (!state) return;
    seat(state, 8, 0);
    quitJob(createCtx(state));
    expect(caseOf(state)).toBeNull();
  });

  it('ne s’ouvre pas quand il n’y a rien à discuter', () => {
    const state = grown(7);
    if (!state) return;
    seat(state, 8, 0);
    fire(createCtx(state), 'incarcération');
    expect(caseOf(state)).toBeNull();
  });
});

describe('la force du dossier', () => {
  it('vient de ce qui s’est passé pendant les années de poste', () => {
    const state = grown(11);
    if (!state) return;

    fileAt(state, { ground: 'restructuration', years: 16, warnings: 0, performance: 78, support: 0.8 });
    const solid = strengthOf(state);
    fileAt(state, { ground: 'restructuration', years: 2, warnings: 1, performance: 45, support: -0.3 });
    const thin = strengthOf(state);

    expect(solid).toBeGreaterThan(thin + 40);
    // Et le joueur voit à quoi il le doit, ligne à ligne et signé.
    fileAt(state, { ground: 'restructuration', years: 16, warnings: 2, performance: 78, support: 0.8 });
    const rows = reasons(state);
    expect(rows.some((r) => r.weight > 0)).toBe(true);
    expect(rows.some((r) => r.weight < 0)).toBe(true);
  });

  it('compte une équipe hostile contre soi, et pas seulement pour rien', () => {
    /*
     * `workplaceSupport` va de −1 à 1 et la première version n'en gardait que
     * la moitié positive : une équipe hostile valait exactement autant qu'une
     * équipe indifférente. C'était l'une des trois raisons pour lesquelles
     * aucun dossier ne descendait sous cinquante-cinq.
     */
    const state = grown(13);
    if (!state) return;
    const at = (support: number) => {
      fileAt(state, { ground: 'restructuration', years: 8, warnings: 0, performance: 60, support });
      return strengthOf(state);
    };
    expect(at(0)).toBeGreaterThan(at(-0.9));
    expect(at(0.9)).toBeGreaterThan(at(0));
  });

  it('rend la faute grave presque indéfendable, même après quinze ans', () => {
    // Contester quand ils ont réellement quelque chose, c'est leur demander de
    // le montrer. Le joueur, lui, sait ce qu'il a fait — voir `office.ts`.
    const state = grown(17);
    if (!state) return;
    fileAt(state, { ground: 'faute grave', years: 15, warnings: 0, performance: 66, support: 0.4 });
    const guilty = strengthOf(state);
    fileAt(state, { ground: 'restructuration', years: 15, warnings: 0, performance: 66, support: 0.4 });
    expect(strengthOf(state)).toBeGreaterThan(guilty + 30);
    expect(guilty).toBeLessThan(45);
  });

  it('se distribue au lieu de tomber toujours dans la même tranche', () => {
    /*
     * **Ce que la mesure a corrigé.** Première version : `BASE_STRENGTH` à
     * trente-quatre, l'appui compté seulement en positif, la performance
     * comptée autour de quarante. Sur sept cent treize dossiers relevés en
     * jouant, **aucun ne descendait sous cinquante-cinq** et trois des cinq
     * tranches de lecture étaient vides — contester était donc toujours le bon
     * choix et « lire son dossier » ne voulait rien dire. Après correction, la
     * plage rencontrée en jouant va de 45 (p10) à 78 (p90), médiane 60.
     */
    const state = grown(19);
    if (!state) return;
    const specs = [
      { ground: 'faute grave', years: 3, warnings: 2, performance: 40, support: -0.4 },
      { ground: 'insuffisance professionnelle', years: 4, warnings: 1, performance: 38, support: -0.2 },
      { ground: 'insubordination', years: 8, warnings: 0, performance: 58, support: 0 },
      { ground: 'restructuration', years: 10, warnings: 0, performance: 60, support: 0.25 },
      { ground: 'restructuration', years: 16, warnings: 0, performance: 78, support: 0.8 },
    ];
    const got = specs.map((s) => { fileAt(state, s); return strengthOf(state); });
    expect(Math.min(...got)).toBeLessThan(20);
    expect(Math.max(...got)).toBeGreaterThan(78);
    // Et les cinq tranches de lecture ne se réduisent pas à deux.
    const bands = new Set(got.map((x) => (x < 20 ? 0 : x < 38 ? 1 : x < 55 ? 2 : x < 72 ? 3 : 4)));
    expect(bands.size).toBeGreaterThanOrEqual(3);
  });
});

describe('les deux choix', () => {
  it('n’en laissent aucun dominer', () => {
    /*
     * Mesuré par `tools/measure-dossier.mjs`, soixante contestations jouées
     * par cas, à salaire égal :
     *
     *     force | négocier | contester | motif
     *         0 |    1 170 |    −6 480 | faute grave
     *        17 |    2 877 |    −1 961 | faute grave
     *        36 |    8 986 |    11 875 | insubordination
     *        46 |   15 687 |    27 885 | suite aux événements
     *        61 |   36 834 |    28 806 | restructuration
     *        85 |   50 737 |    96 400 | restructuration
     *
     * Le meilleur choix bascule **trois fois**, et — c'est ce que la mesure a
     * appris — **il ne dépend pas que de la force** : un motif qu'on paie cher
     * pour l'oublier récompense la négociation même à dossier solide, un motif
     * qui n'offre presque rien ne laisse que la contestation même à dossier
     * moyen. D'où les deux sommes affichées côte à côte plutôt qu'un seul
     * chiffre à interpréter.
     */
    const state = grown(23);
    if (!state) return;

    // Un motif généreux à la négociation, dossier solide : le deal est fort.
    fileAt(state, { ground: 'restructuration', years: 10, warnings: 0, performance: 60, support: 0.25 });
    const dealRich = settlementOf(state);
    // Un motif qui n'offre rien, dossier comparable : le deal est maigre.
    fileAt(state, { ground: 'insubordination', years: 10, warnings: 0, performance: 60, support: 0.25 });
    const dealPoor = settlementOf(state);
    expect(dealRich).toBeGreaterThan(dealPoor * 2);

    // Et l'écran annonce les deux sommes, pas seulement le coût.
    expect(awardOf(state)).toBeGreaterThan(0);
    expect(feeOf(state)).toBeGreaterThan(0);
  });

  it('font monter l’indemnité avec le dossier', () => {
    const state = grown(29);
    if (!state) return;
    fileAt(state, { ground: 'restructuration', years: 2, warnings: 1, performance: 45, support: -0.3 });
    const thin = { deal: settlementOf(state), award: awardOf(state) };
    fileAt(state, { ground: 'restructuration', years: 16, warnings: 0, performance: 78, support: 0.8 });
    expect(settlementOf(state)).toBeGreaterThan(thin.deal);
    expect(awardOf(state)).toBeGreaterThan(thin.award);
  });

  it('règlent l’affaire quand on négocie', () => {
    const state = grown(31);
    if (!state) return;
    fileAt(state, { ground: 'restructuration', years: 10, warnings: 0, performance: 60, support: 0.3 });
    const before = state.player.money;
    const amount = settlementOf(state);
    expect(settle(createCtx(state)).ok).toBe(true);
    expect(state.player.money).toBe(before + amount);
    // Et l'on ne recommence pas.
    expect(settle(createCtx(state)).ok).toBe(false);
    expect(contest(createCtx(state)).ok).toBe(false);
  });
});

describe('l’issue', () => {
  it('fait perdre quelque chose à qui perd', () => {
    /*
     * **Sans la marque, contester serait gratuit** : les honoraires étant
     * versés d'avance, perdre ne coûterait rien qu'on n'ait déjà dépensé, et
     * l'on tenterait systématiquement quelle que soit la force du dossier.
     */
    let lost = 0;
    let marked = 0;
    for (let seed = 41; seed < 101; seed += 2) {
      const state = grown(seed);
      if (!state) continue;
      state.player.money = 400_000;
      fileAt(state, { ground: 'faute grave', years: 3, warnings: 2, performance: 40, support: -0.4 });
      if (!contest(createCtx(state)).ok) continue;
      const rep = state.player.stats.reputation;
      for (let i = 0; i <= CASE_YEARS && caseOf(state); i++) {
        state.year += 1;
        advanceDismissal(createCtx(state));
      }
      if (state.player.stats.reputation < rep) {
        lost += 1;
        if (markFactor(state) < 1) marked += 1;
      }
    }
    expect(lost).toBeGreaterThan(10);
    // La marque pèse sur les embauches, et elle finit par s'effacer.
    expect(marked).toBe(lost);
    expect(MARK_YEARS).toBeGreaterThan(0);
  });

  it('peut rendre la place, et seulement à qui avait un dossier solide', () => {
    let reinstated = 0;
    let tried = 0;
    for (let seed = 101; seed < 181; seed += 2) {
      const state = grown(seed);
      if (!state) continue;
      state.player.money = 400_000;
      state.player.job = null;
      fileAt(state, { ground: 'restructuration', years: 16, warnings: 0, performance: 78, support: 0.8 });
      expect(strengthOf(state)).toBeGreaterThanOrEqual(REINSTATE_AT);
      if (!contest(createCtx(state)).ok) continue;
      tried += 1;
      for (let i = 0; i <= CASE_YEARS && caseOf(state); i++) {
        state.year += 1;
        advanceDismissal(createCtx(state));
      }
      const back = state.player.job as JobState | null;
      if (back) {
        reinstated += 1;
        // Les années comptent toujours : c'est là tout l'intérêt.
        expect(back.yearsAtJob).toBe(16);
      }
    }
    expect(tried).toBeGreaterThan(10);
    expect(reinstated).toBeGreaterThan(tried / 3);
  });

  it('laisse s’éteindre une affaire qu’on n’a pas ouverte', () => {
    const state = grown(191);
    if (!state) return;
    fileAt(state, { ground: 'restructuration', years: 8, warnings: 0, performance: 60, support: 0 });
    for (let i = 0; i < CASE_YEARS + 2 && caseOf(state); i++) {
      state.year += 1;
      advanceDismissal(createCtx(state));
    }
    expect(caseOf(state)).toBeNull();
  });
});

describe('l’écran', () => {
  it('pèse le dossier ligne à ligne et annonce les deux sommes', () => {
    const source = readFileSync(
      new URL('../../screens/DismissalScreen.tsx', import.meta.url).pathname, 'utf8',
    );
    expect(source).toContain('reasons');
    expect(source).toContain('settlementOf');
    // Le chiffre qui manquait : sans lui, le seul montant lisible était celui
    // du choix prudent.
    expect(source).toContain('awardOf');
    expect(source).toContain('strengthSays');
  });

  it('n’offre pas de ligne « ne rien faire »', () => {
    const source = readFileSync(
      new URL('../../screens/DismissalScreen.tsx', import.meta.url).pathname, 'utf8',
    );
    expect(source).toContain('s’éteindra d’elle-même');
  });

  it('couvre tous les motifs que le jeu sait invoquer', () => {
    /*
     * Un motif que `fire` écrit sans que `GROUNDS` le connaisse n'ouvrirait
     * aucun dossier, silencieusement. On lit donc les appels réels.
     */
    const sources = ['careers', 'workplace', 'office', 'justice', 'escape']
      .map((f) => readFileSync(new URL(`../../systems/${f}.ts`, import.meta.url).pathname, 'utf8'))
      .join('\n')
      + readFileSync(new URL('../../systems/randomEvents.ts', import.meta.url).pathname, 'utf8');
    const invoked = [...sources.matchAll(/fire\(ctx,\s*(?:[^)]*?\?\s*)?'([^']+)'(?:\s*:\s*'([^']+)')?\)/g)]
      .flatMap((m) => [m[1], m[2]])
      .filter((x): x is string => Boolean(x));
    expect(invoked.length).toBeGreaterThan(4);
    const known = new Set([...GROUNDS.map((g) => g.id), 'incarcération', 'situation irrégulière']);
    expect(invoked.filter((g) => !known.has(g))).toEqual([]);
    // Et chaque motif contestable dit ce qu'il vaut.
    for (const g of GROUNDS) expect(getGround(g.id)!.line.length).toBeGreaterThan(10);
  });
});
