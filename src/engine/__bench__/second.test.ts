/**
 * Le deuxième poste.
 *
 * Le catalogue disait « un seul contrat de travail à la fois »
 * (`Carrière/Cumul`, impact 3). En inspectant, on trouve pire : **la carrière
 * ne savait rien de ce qu'on faisait à côté.** On pouvait tenir un plein temps,
 * une activité indépendante et une entreprise sans que `advanceCareer` ne s'en
 * aperçoive jamais, alors que `venture.ts#timeBudget` comptait déjà les trois
 * de l'autre côté.
 *
 * Six exigences :
 *
 * 1. **un emploi seul ne coûte rien** — le jeu ne punit personne d'avoir un
 *    travail, et c'est la condition pour que le reste soit un choix ;
 * 2. **ce qu'on prend ailleurs se paie sur le poste principal**, et à hauteur
 *    de ce que cela prend ;
 * 3. **les heures sont le curseur** : plus on en prend, plus cela coûte ;
 * 4. **les six postes ne se comparent pas terme à terme** ;
 * 5. **cela finit par se savoir**, plus ou moins vite selon l'endroit, et cela
 *    va au dossier — que `careers.ts#layoffChance` lit déjà ;
 * 6. **cela s'arrête tout seul** quand le premier poste disparaît.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { createCtx } from '../context.ts';
import type { GameState } from '../types.ts';
import { CROWDED_UNDER, HOURS_CEILING, SHIFTS } from '../../data/moonlight.ts';
import {
  advanceMoonlight, careerDrag, crowding, hourlyRate, leaveShift, moonlightOf,
  setHours, takeBlocker, takeShift, totalHours, yearlyPay,
} from '../../systems/moonlight.ts';

/** Quelqu'un qui a un emploi, et rien d'autre. */
function worker(seed = 4141): GameState {
  const state = createNewLife({ seed });
  const p = state.player;
  p.age = 32;
  p.freelance = null;
  p.business = null;
  p.job = {
    jobId: 'cashier',
    title: 'Hôte de caisse',
    level: 0,
    salary: 22_000,
    employer: 'Le Marché',
    performance: 60,
    yearsAtJob: 4,
    effort: 'normal',
    lastRaiseAskYear: 0,
    partTime: false,
    hours: 35,
    satisfaction: 60,
    team: [],
    warnings: 0,
    leaveTaken: 0,
    suspicion: 0,
    taken: 0,
    tookYear: 0,
  };
  return state;
}

describe('ce qu’un emploi seul coûte', () => {
  it('ne coûte rien du tout', () => {
    /*
     * La condition qui rend le reste jouable. `timeBudget` compte le poste
     * principal — s'en servir tel quel aurait pénalisé tout le monde pour avoir
     * un travail, ce qui est exactement le contraire de ce qu'on veut dire.
     */
    const state = worker();
    expect(crowding(state)).toBe(0);
    expect(careerDrag(state)).toBe(0);
  });

  it('ne coûte toujours rien avec quelques heures le samedi', () => {
    const state = worker();
    takeShift(createCtx(state), 'cours');
    setHours(createCtx(state), 3);
    expect(crowding(state)).toBeLessThan(CROWDED_UNDER);
    expect(careerDrag(state)).toBe(0);
  });
});

describe('ce que les heures coûtent', () => {
  it('fait monter la note avec les heures', () => {
    const state = worker();
    takeShift(createCtx(state), 'nuits');
    setHours(createCtx(state), 8);
    const light = careerDrag(state);
    setHours(createCtx(state), 24);
    const heavy = careerDrag(state);
    expect(heavy).toBeGreaterThan(light);
    expect(heavy).toBeGreaterThan(0);
  });

  it('compte aussi ce qu’on fait à son compte et l’entreprise qu’on dirige', () => {
    /*
     * Le vrai trou du jeu, et il n'était pas dans la feuille : un patron
     * présent dans sa maison et un travailleur indépendant ne payaient rien
     * sur leur poste principal. Un patron **absent** ne paie toujours rien —
     * il n'y est pas, c'est le sens du mot.
     */
    const state = worker();
    expect(careerDrag(state)).toBe(0);
    // On n'a besoin que de sa présence : `crowding` ne lit rien d'autre.
    state.player.freelance = { tradeId: 'redaction' } as NonNullable<GameState['player']['freelance']>;
    expect(crowding(state)).toBeGreaterThan(0);
  });

  it('ne prend pas plus d’heures qu’il n’y en a', () => {
    const state = worker();
    state.player.job!.hours = HOURS_CEILING - 4;
    // Il reste quatre heures : un poste dont le minimum est au-dessus est
    // refusé, et il dit pourquoi.
    expect(takeBlocker(state, 'nuits')).toContain('heures');
    expect(takeShift(createCtx(state), 'nuits').ok).toBe(false);
  });

  it('refuse de dépasser le plafond en réglant les heures', () => {
    const state = worker();
    takeShift(createCtx(state), 'veilles');
    state.player.job!.hours = HOURS_CEILING - 12;
    const before = moonlightOf(state)!.hours;
    expect(setHours(createCtx(state), 22).ok).toBe(false);
    // Refusé veut dire refusé : rien n'a bougé. Le rattrapage de ce qui est
    // déjà en cours se fait à l'année, pas ici — on ne détravaille pas des
    // heures qu'on a faites.
    expect(moonlightOf(state)!.hours).toBe(before);
  });

  it('rétrécit tout seul quand le poste principal reprend des heures', () => {
    /*
     * Trouvé par ce test : le plafond n'était vérifié qu'au moment de décider.
     * On prenait les nuits à temps partiel, on repassait à plein temps, et l'on
     * tenait soixante-dix heures cumulées pour un plafond de soixante-huit.
     */
    const state = worker();
    state.player.job!.hours = 24;
    takeShift(createCtx(state), 'nuits');
    setHours(createCtx(state), 24);
    expect(totalHours(state)).toBe(48);
    state.player.job!.hours = 52;
    advanceMoonlight(createCtx(state));
    expect(totalHours(state)).toBeLessThanOrEqual(HOURS_CEILING);
  });

  it('s’arrête quand il ne reste plus assez d’heures pour lui', () => {
    const state = worker();
    state.player.job!.hours = 24;
    takeShift(createCtx(state), 'nuits');
    state.player.job!.hours = HOURS_CEILING - 2;
    advanceMoonlight(createCtx(state));
    expect(moonlightOf(state)).toBeNull();
  });
});

describe('ce que les six postes valent', () => {
  it('ne se comparent pas terme à terme', () => {
    // Aucun n'est à la fois le mieux payé, le moins fatigant, le plus discret
    // et celui qui autorise le plus d'heures.
    for (const shift of SHIFTS) {
      const bestOn = [
        SHIFTS.every((s) => shift.rate >= s.rate),
        SHIFTS.every((s) => shift.toll <= s.toll),
        SHIFTS.every((s) => shift.quiet >= s.quiet),
        SHIFTS.every((s) => shift.max >= s.max),
      ].filter(Boolean).length;
      expect(bestOn, shift.id).toBeLessThan(3);
    }
  });

  it('paient à l’heure, et le compte est le compte', () => {
    const state = worker();
    takeShift(createCtx(state), 'extras');
    const m = moonlightOf(state)!;
    expect(yearlyPay(state)).toBe(hourlyRate(state, 'extras') * m.hours * 46);
    expect(yearlyPay(state)).toBeGreaterThan(0);
  });

  it('versent réellement, et fatiguent', () => {
    const state = worker();
    takeShift(createCtx(state), 'nuits');
    setHours(createCtx(state), 24);
    const money = state.player.money;
    const health = state.player.stats.health;
    advanceMoonlight(createCtx(state));
    expect(state.player.money).toBeGreaterThan(money);
    expect(state.player.stats.health).toBeLessThan(health);
    expect(moonlightOf(state)!.earned).toBeGreaterThan(0);
  });
});

describe('ce qui finit par se savoir', () => {
  it('va au dossier, et le dossier compte déjà', () => {
    /*
     * `careers.ts#layoffChance` lisait déjà `p.job.warnings` — le deuxième
     * poste n'a pas eu besoin d'un mécanisme à lui pour avoir des suites.
     */
    const state = worker();
    takeShift(createCtx(state), 'extras');
    setHours(createCtx(state), 18);
    let caught = 0;
    for (let i = 0; i < 30 && !moonlightOf(state)!.known; i += 1) {
      state.year += 1;
      advanceMoonlight(createCtx(state));
      caught += 1;
    }
    expect(moonlightOf(state)!.known).toBe(true);
    expect(state.player.job!.warnings).toBeGreaterThan(0);
    // Un poste très visible se sait vite.
    expect(caught).toBeLessThan(12);
  });

  it('se sait beaucoup plus tard là où personne ne passe', () => {
    const seen = (shiftId: string) => {
      const state = worker(77);
      takeShift(createCtx(state), shiftId);
      let years = 0;
      while (years < 60 && !moonlightOf(state)!.known) {
        state.year += 1;
        advanceMoonlight(createCtx(state));
        years += 1;
      }
      return years;
    };
    // Moyenné sur plusieurs graines : un tirage isolé ne dit rien.
    const mean = (id: string) => {
      let total = 0;
      for (let s = 0; s < 12; s += 1) {
        const state = worker(500 + s);
        takeShift(createCtx(state), id);
        let years = 0;
        while (years < 60 && !moonlightOf(state)!.known) {
          state.year += 1;
          advanceMoonlight(createCtx(state));
          years += 1;
        }
        total += years;
      }
      return total / 12;
    };
    expect(seen).toBeTypeOf('function');
    expect(mean('nuits')).toBeGreaterThan(mean('extras'));
  });
});

describe('ce qui s’arrête tout seul', () => {
  it('cesse quand il n’y a plus de premier poste', () => {
    const state = worker();
    takeShift(createCtx(state), 'samedis');
    state.player.job = null;
    advanceMoonlight(createCtx(state));
    expect(moonlightOf(state)).toBeNull();
  });

  it('cesse en prison', () => {
    const state = worker();
    takeShift(createCtx(state), 'samedis');
    state.player.prison = { yearsLeft: 3 } as NonNullable<GameState['player']['prison']>;
    advanceMoonlight(createCtx(state));
    expect(moonlightOf(state)).toBeNull();
  });

  it('se quitte, et dit ce qu’il a rapporté', () => {
    const state = worker();
    takeShift(createCtx(state), 'veilles');
    state.year += 1;
    advanceMoonlight(createCtx(state));
    const out = leaveShift(createCtx(state));
    expect(out.ok).toBe(true);
    expect(out.message).toMatch(/an|soirées/);
    expect(moonlightOf(state)).toBeNull();
    expect(careerDrag(state)).toBe(0);
  });
});
