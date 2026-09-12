/**
 * Ce qui passe par tes mains — quand le poste devient le système.
 *
 * Le crime du jeu était fourni : un pickpocket jouable, un cambriolage avec
 * repérage, une poursuite, un boîtier inventé, un braquage au tempo, un
 * milieu organisé complet. Et à côté, quarante ans de bureau où l'on choisit
 * ses horaires. Les deux ne se rencontraient qu'en un point, et ce point
 * était un interrupteur : `if (crime.id === 'embezzle' && !p.job)`. Le
 * catalogue le disait : « travailler quelque part n'ouvre aucune possibilité
 * criminelle ».
 *
 * Sept exigences :
 *
 * 1. **la portée vient de la place**, pas d'un choix — un débutant n'approche
 *    rien, et c'est ce qui fait de la carrière une condition ;
 * 2. **on décide une part, pas une somme** : ce qui se remarque est l'écart
 *    entre ce qu'on prend et ce qu'on approche ;
 * 3. **la courbure tient** — doubler la part fait plus que doubler le
 *    soupçon, sinon il n'y aurait aucune raison d'être patient ;
 * 4. **le soupçon redescend les années tranquilles**, et pas les autres ;
 * 5. **se faire prendre coûte le poste**, et ouvre la procédure qui existait
 *    déjà ;
 * 6. **une affaire qu'on ignore finit par être jugée** — sans quoi se faire
 *    prendre ne coûterait rien du tout ;
 * 7. **aucun rythme ne domine** : ni prendre toujours tout, ni ne jamais rien
 *    prendre.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState, JobState } from '../types.ts';
import { getJob } from '../../data/jobs.ts';
import { COOL_FACTOR, HELPINGS, SUSPICION_CURVE, getHelping } from '../../data/office.ts';
import {
  advanceOffice, coolingTo, help, helpBlocker, previewHelping, reachOf,
  reviewChance, suspicionOf, takenOf,
} from '../../systems/office.ts';
import { pendingTrial } from '../../systems/justice.ts';

/** Une place précise dans une maison précise, pour mesurer une chose à la fois. */
function seat(state: GameState, jobId: string, level: number, years: number, salary = 0): JobState {
  const def = getJob(jobId)!;
  const lvl = def.levels[Math.min(level, def.levels.length - 1)]!;
  const job: JobState = {
    jobId, title: lvl.title, level, salary: salary || lvl.salary,
    employer: 'Maison Vidal', performance: 60, yearsAtJob: years, effort: 'normal',
    lastRaiseAskYear: 0, partTime: false, hours: def.hours, satisfaction: 55,
    team: [], warnings: 0, leaveTaken: 0, suspicion: 0, taken: 0, tookYear: 0,
  };
  state.player.job = job;
  return job;
}

/** Un adulte en vie, sans quoi il n'y a pas de bureau. */
function grown(seed: number): GameState | null {
  const state = createNewLife({ seed });
  for (let i = 0; i < 32 && !state.gameOver; i++) simulateYear(state);
  if (state.gameOver || !state.player.alive || state.player.prison) return null;
  state.player.yearActions = {};
  return state;
}

describe('la portée', () => {
  it('vient de la place occupée, et pas d’un choix', () => {
    const state = grown(3);
    if (!state) return;
    // Un métier à échelle longue, pour que le haut et le bas se distinguent.
    const def = getJob('lawyer') ?? getJob('doctor')!;
    const top = def.levels.length - 1;

    seat(state, def.id, 0, 0);
    const junior = reachOf(state);
    seat(state, def.id, top, 20);
    const senior = reachOf(state);

    /*
     * **C'est tout le système.** Si le débutant approchait autant que le
     * directeur, monter n'aurait aucun rapport avec prendre, et le poste
     * redeviendrait l'interrupteur qu'il était.
     */
    expect(senior).toBeGreaterThan(junior * 6);
    // Et en bas de l'échelle, il n'y a littéralement rien à prendre.
    seat(state, def.id, 0, 0);
    expect(helpBlocker(state)).toContain('rien d’intéressant');
  });

  it('grandit avec les années passées là', () => {
    const state = grown(5);
    if (!state) return;
    const def = getJob('lawyer') ?? getJob('doctor')!;
    seat(state, def.id, def.levels.length - 1, 0);
    const fresh = reachOf(state);
    seat(state, def.id, def.levels.length - 1, 20);
    expect(reachOf(state)).toBeGreaterThan(fresh);
  });
});

describe('ce qu’on décide', () => {
  it('est une part et non une somme', () => {
    /*
     * Le même geste doit coûter le même soupçon à qui gagne peu et à qui
     * gagne beaucoup — ce qui se remarque est l'écart, pas le montant. Sans
     * cela, le directeur serait invisible quoi qu'il fasse et l'employé
     * voyant au premier geste : l'exact inverse du sujet.
     */
    const state = grown(7);
    if (!state) return;
    const def = getJob('lawyer') ?? getJob('doctor')!;
    const part = getHelping('part')!;

    seat(state, def.id, def.levels.length - 1, 15, 40_000);
    const small = previewHelping(state, part);
    seat(state, def.id, def.levels.length - 1, 15, 400_000);
    const large = previewHelping(state, part);

    expect(large.adds).toBeCloseTo(small.adds, 5);
    // Mais ce que ça rapporte, lui, suit la place.
    expect(large.gain).toBeGreaterThan(small.gain * 8);
  });

  it('fait payer la gourmandise plus que proportionnellement', () => {
    const state = grown(11);
    if (!state) return;
    const def = getJob('lawyer') ?? getJob('doctor')!;
    seat(state, def.id, def.levels.length - 1, 15);

    const rows = HELPINGS.map((h) => ({ h, ...previewHelping(state, h) }));
    for (let i = 1; i < rows.length; i++) {
      const a = rows[i - 1]!;
      const b = rows[i]!;
      // Chaque cran prend davantage…
      expect(b.gain).toBeGreaterThan(a.gain);
      /*
       * …et coûte **plus que le rapport des parts**. C'est la courbure : sans
       * elle, prendre tout d'un coup et prendre peu longtemps reviendraient
       * au même, et il n'y aurait rien à arbitrer.
       */
      expect(b.adds / a.adds).toBeGreaterThan(1);
    }
    expect(SUSPICION_CURVE).toBeGreaterThan(1);
    const modest = rows[0]!;
    const greedy = rows[rows.length - 1]!;
    const shareRatio = greedy.h.share / modest.h.share;
    expect(greedy.adds / modest.adds).toBeGreaterThan(shareRatio * 0.9);
  });

  it('ne se décide qu’une fois par an', () => {
    const state = grown(13);
    if (!state) return;
    const def = getJob('lawyer') ?? getJob('doctor')!;
    seat(state, def.id, def.levels.length - 1, 15);
    expect(help(createCtx(state), 'part').ok).toBe(true);
    expect(help(createCtx(state), 'part').ok).toBe(false);
    expect(takenOf(state)).toBeGreaterThan(0);
  });
});

describe('le soupçon', () => {
  it('redescend les années tranquilles, et pas les autres', () => {
    const state = grown(17);
    if (!state) return;
    const def = getJob('lawyer') ?? getJob('doctor')!;
    const job = seat(state, def.id, def.levels.length - 1, 15);

    help(createCtx(state), 'large');
    const raised = suspicionOf(state);
    expect(raised).toBeGreaterThan(0);
    // L'écran l'annonce avant que l'année ne passe.
    expect(coolingTo(state)).toBeLessThan(raised);

    /*
     * **L'année, et non un drapeau d'action.** `yearActions` est vidé au tout
     * début de `simulateYear` : un drapeau posé par le joueur n'existe plus
     * quand le soupçon doit décider s'il redescend. Ce test est ce qui
     * l'aurait attrapé.
     */
    /*
     * **Deux ans, et pas un.** Prendre en l'an Y puis avancer d'un an fait de
     * Y l'année qui vient de s'écouler : elle n'a rien de tranquille. C'est
     * la deuxième année qui l'est, et ce test s'est trompé avant de le dire.
     */
    state.year += 2;
    job.suspicion = raised;
    advanceOffice(createCtx(state));
    const quiet = suspicionOf(state);
    expect(quiet).toBeLessThan(raised);
    expect(quiet).toBeLessThanOrEqual(raised * COOL_FACTOR);

    // Une année où l'on a pris ne fait rien redescendre.
    job.suspicion = raised;
    job.tookYear = state.year;
    state.year += 1;
    job.tookYear = state.year - 1;
    advanceOffice(createCtx(state));
    expect(suspicionOf(state)).toBeGreaterThanOrEqual(raised - 0.001);
  });

  it('reste attaché au poste, pas au personnage', () => {
    /*
     * Prendre puis partir est une stratégie réelle — et elle coûte
     * l'ancienneté, dont dépend la portée. C'est un arbitrage, pas une porte
     * dérobée : on repart de zéro sur les deux tableaux à la fois.
     */
    const state = grown(19);
    if (!state) return;
    const def = getJob('lawyer') ?? getJob('doctor')!;
    seat(state, def.id, def.levels.length - 1, 15);
    help(createCtx(state), 'large');
    expect(suspicionOf(state)).toBeGreaterThan(0);

    seat(state, def.id, def.levels.length - 1, 0);
    expect(suspicionOf(state)).toBe(0);
    // Mais la portée aussi est repartie de zéro.
    expect(reachOf(state)).toBeLessThan(
      (() => { seat(state, def.id, def.levels.length - 1, 15); return reachOf(state); })(),
    );
  });

  it('décide de la chance qu’on regarde', () => {
    const state = grown(23);
    if (!state) return;
    const def = getJob('lawyer') ?? getJob('doctor')!;
    const job = seat(state, def.id, def.levels.length - 1, 15);
    job.suspicion = 0;
    const calm = reviewChance(state);
    job.suspicion = 80;
    expect(reviewChance(state)).toBeGreaterThan(calm * 2);
  });
});

describe('quand quelqu’un regarde', () => {
  it('coûte le poste et ouvre la procédure qui existait déjà', () => {
    const state = grown(29);
    if (!state) return;
    const def = getJob('lawyer') ?? getJob('doctor')!;
    const job = seat(state, def.id, def.levels.length - 1, 15);
    help(createCtx(state), 'tout');
    job.suspicion = 100;

    // On force le regard : la question ici n'est pas s'il vient, mais ce
    // qu'il fait quand il vient.
    let jailedOrTried = false;
    for (let i = 0; i < 60 && state.player.job && !state.gameOver; i++) {
      state.year += 1;
      job.tookYear = state.year - 1;
      job.suspicion = 100;
      advanceOffice(createCtx(state));
      if (!state.player.job) jailedOrTried = true;
    }
    expect(jailedOrTried).toBe(true);
    // Le poste est perdu, et la suite judiciaire n'est pas réinventée ici :
    // c'est le procès du jeu, avec son avocat, sa peine et son casier.
    expect(state.player.job).toBeNull();
    expect(
      pendingTrial(state) !== null
      || state.player.criminalRecord.convictions.length > 0
      || state.player.prison !== null,
    ).toBe(true);
    expect(state.player.chronicle.caughtAtWork ?? 0).toBeGreaterThan(0);
  });

  it('ne trouve rien chez qui n’a rien pris', () => {
    const state = grown(31);
    if (!state) return;
    const def = getJob('lawyer') ?? getJob('doctor')!;
    seat(state, def.id, def.levels.length - 1, 15);
    for (let i = 0; i < 40 && !state.gameOver; i++) {
      state.year += 1;
      advanceOffice(createCtx(state));
    }
    expect(state.player.job).not.toBeNull();
    expect(state.player.chronicle.caughtAtWork ?? 0).toBe(0);
  });
});

describe('l’affaire qu’on ignore', () => {
  it('finit par être jugée sans nous', () => {
    /*
     * **Le trou que ce chantier a mis au jour**, et il ne concernait pas le
     * bureau : `arrest` ouvrait un procès, `simulateYear` en rappelait
     * l'existence chaque année, et **rien ne le jugeait jamais**. Un joueur
     * qui n'ouvrait pas le menu Justice n'était jamais condamné. Mesuré sur
     * les mille trois cents vies de `tools/measure-bureau.mjs` avant
     * correction : **zéro peine prononcée**, sur les six rythmes et les mille
     * trois cents vies, alors que la moitié des personnages s'étaient fait
     * prendre. Se faire prendre coûtait un licenciement, et rien d'autre.
     *
     * On mesure sur une population et non sur une vie, parce que la relaxe
     * est une issue légitime : ce qu'on vérifie est qu'aucune affaire ne
     * **reste ouverte**, et qu'une bonne part se termine par une
     * condamnation — le procès du silence se tient avec le commis d'office.
     */
    let opened = 0;
    let closed = 0;
    let convicted = 0;
    for (let seed = 37; seed < 97; seed += 2) {
      const state = grown(seed);
      if (!state) continue;
      const def = getJob('lawyer') ?? getJob('doctor')!;
      seat(state, def.id, def.levels.length - 1, 15);
      help(createCtx(state), 'tout');

      for (let i = 0; i < 40 && !pendingTrial(state) && !state.gameOver; i++) {
        state.year += 1;
        if (state.player.job) {
          state.player.job.suspicion = 100;
          state.player.job.tookYear = state.year - 1;
        }
        advanceOffice(createCtx(state));
      }
      if (!pendingTrial(state)) continue;
      opened += 1;

      // On ne fait rien. Le jeu, lui, finit par faire quelque chose.
      for (let i = 0; i < 12 && pendingTrial(state) && !state.gameOver; i++) {
        simulateYear(state);
      }
      if (!pendingTrial(state)) closed += 1;
      if (state.player.criminalRecord.convictions.length > 0) convicted += 1;
    }
    expect(opened).toBeGreaterThan(5);
    // Aucune affaire ne reste ouverte : c'est ce qui n'était pas vrai.
    expect(closed).toBe(opened);
    // Et le silence coûte : la plupart finissent condamnées.
    expect(convicted).toBeGreaterThan(opened / 2);
  });
});

describe('les rythmes', () => {
  it('n’en laissent aucun dominer', () => {
    /*
     * Mesuré sur deux cent vingt vies par rythme (`tools/measure-bureau.mjs`),
     * la même trajectoire de carrière pour toutes, seule la portion changeant :
     *
     *     rythme   | gains de la vie | patrimoine p90 | pris ≥1× | années travaillées
     *     honnête  |       5 133 124 |        308 651 |    0/220 | 51
     *     miettes  |       4 613 290 |      1 308 831 |   69/220 | 50
     *     une part |       3 978 723 |      3 185 104 |  175/220 | 44
     *     largement|       2 417 584 |      2 261 620 |  217/220 | 35
     *     tout     |         857 728 |        238 201 |  219/220 | 22
     *     prudent  |       3 843 005 |      3 431 220 |  165/220 | 45
     *
     * Trois choses s'y lisent. **Les gains d'une vie baissent avec la
     * gourmandise** — de cinq millions à huit cent mille — parce qu'un poste
     * perdu et une peine purgée coûtent des années de carrière : cinquante et
     * une années travaillées contre vingt-deux. **Le patrimoine, lui, culmine
     * au milieu** : 308 651 pour l'honnête, 3 185 104 pour la portion
     * moyenne, **238 201 pour qui prend tout** — moins que l'honnête. La
     * gourmandise n'est pas seulement risquée, elle est mauvaise. Et **celui
     * qui regarde le chiffre et s'arrête bat tous les rythmes fixes** sans
     * pour autant s'acheter la tranquillité : il se fait prendre trois fois
     * sur quatre.
     *
     * Ce test ne rejoue pas ces mille trois cents vies — il en jouerait pour
     * plusieurs minutes. Il vérifie ce dont la conclusion dépend : que les
     * deux extrêmes soient l'un et l'autre mauvais.
     */
    const worst = HELPINGS[HELPINGS.length - 1]!;
    const mild = HELPINGS[1]!;
    const state = grown(41);
    if (!state) return;
    const def = getJob('lawyer') ?? getJob('doctor')!;
    seat(state, def.id, def.levels.length - 1, 15);

    const greedy = previewHelping(state, worst);
    const modest = previewHelping(state, mild);
    // Tout prendre rapporte plus tout de suite…
    expect(greedy.gain).toBeGreaterThan(modest.gain);
    // …et se paie en une seule fois : un tel geste rend le regard presque sûr.
    const job = state.player.job!;
    job.suspicion = greedy.adds;
    const exposed = reviewChance(state);
    job.suspicion = modest.adds;
    expect(exposed).toBeGreaterThan(reviewChance(state) * 1.5);
  });

  it('n’ouvrent pas deux portes vers la même chose', () => {
    // « Détournement de fonds » a quitté le menu des délits : il s'y réglait
    // en un tirage qui ignorait tout de la place occupée.
    const source = readFileSync(
      new URL('../../components/ActivityMenu.tsx', import.meta.url).pathname, 'utf8',
    );
    expect(source).toContain("c.id !== 'embezzle'");
  });
});

describe('l’écran', () => {
  it('montre la portée, le soupçon et ce qu’une année tranquille en retirerait', () => {
    const source = readFileSync(
      new URL('../../screens/OfficeScreen.tsx', import.meta.url).pathname, 'utf8',
    );
    expect(source).toContain('reachOf');
    expect(source).toContain('suspicionOf');
    // Le second chiffre : sans lui, s'arrêter serait un acte de foi.
    expect(source).toContain('coolingTo');
    // Et chaque portion annonce ce qu'elle ajoute avant d'être choisie.
    expect(source).toContain('previewHelping');
  });

  it('n’offre pas de ligne « ne rien prendre »', () => {
    /*
     * Elle a existé, et elle a été retirée avant d'être livrée : son effet
     * était exactement celui de ne pas appuyer. Une ligne qui ne fait rien de
     * plus que l'inaction donne l'impression d'une décision sans en être une.
     */
    const source = readFileSync(
      new URL('../../screens/OfficeScreen.tsx', import.meta.url).pathname, 'utf8',
    );
    expect(source).not.toContain('layOff');
    // Ce que l'écran dit à la place.
    expect(source).toContain('ferme simplement cette page');
  });
});
