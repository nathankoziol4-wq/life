/**
 * Ceux qui viennent.
 *
 * Un décès de proche ne donnait rien à faire : un retrait de bonheur, une part
 * d'héritage, une ligne dans le journal. Treize proches meurent par vie, et le
 * joueur les lisait passer. Le catalogue demandait « qui vient, ce qui se dit,
 * ce que ça coûte ».
 *
 * Ce que ce fichier assure, et chaque point vient d'une mesure qui a d'abord
 * dit le contraire :
 *
 * 1. **rien ne se tire** — l'assemblée est un calcul, pas un dé ;
 * 2. **le sang vient pour le mort**, que le joueur l'ait tenu ou non ;
 * 3. **le cercle vient pour le vivant**, et seulement si on l'a tenu ;
 * 4. **la dépense est une pente**, pas une falaise ni un impôt ;
 * 5. **avoir connu du monde ne se retourne pas contre soi** ;
 * 6. **une phrase creuse coûte plus qu'elle ne rapporte** ;
 * 7. **cela se règle toujours**, joué ou non, et une seule fois à la fois.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { createCtx } from '../context.ts';
import { simulateYear } from '../simulateYear.ts';
import type { GameState, Person, WakeState } from '../types.ts';
import { FORMS, TELLS } from '../../data/wake.ts';
import {
  arrangedByUs, attendance, hold, holds, openWake, tell, turnout, advanceWake,
  wakeOf,
} from '../../systems/wake.ts';

/* ------------------------------------------------------------------ */
/* De quoi poser une scène sans dépendre du hasard d'une vie           */
/* ------------------------------------------------------------------ */

function blankPerson(state: GameState, id: string, over: Partial<Person>): Person {
  const who: Person = {
    id,
    firstName: id, lastName: 'Témoin', sex: 'F',
    birthYear: state.year - 50, birthMonth: 1, birthDay: 1, age: 50, alive: true,
    stats: {
      ...state.player.stats, health: 80,
    },
    personality: {
      warmth: 50, ambition: 50, temper: 50, loyalty: 50, generosity: 50,
      madness: 10, discipline: 50, religiosity: 20, sociability: 50,
    },
    orientation: 'hetero',
    relation: 'friend', relationship: 50, opinion: 60,
    wealth: 0, jobTitle: null, salary: 0, maritalStatus: 'single',
    parentIds: [], childrenIds: [], partnerId: null, exPartnerIds: [],
    metYear: state.year - 30, lastInteractionYear: state.year,
    interactionsThisYear: 0, estranged: false, incarcerated: false,
    history: [], flags: {},
  };
  Object.assign(who, over);
  state.npcs[id] = who;
  return who;
}

/** Une mère qui vient de mourir, un frère, et un ami. Rien d'autre. */
function scene(): { state: GameState; wake: WakeState; dead: Person } {
  const state = createNewLife({ seed: 4242 });
  state.npcs = {};
  const dead = blankPerson(state, 'mere', {
    relation: 'mother', alive: false, deathYear: state.year, age: 78,
    jobTitle: 'institutrice', wealth: 1000, opinion: 70, relationship: 55,
  });
  blankPerson(state, 'frere', {
    relation: 'brother', relationship: 50, parentIds: ['mere'],
    // Le frère n'a pas parlé au joueur depuis trente ans. Il vient quand même.
    lastInteractionYear: state.year - 30,
  });
  blankPerson(state, 'ami', { relation: 'bestFriend', relationship: 62 });
  // Et quelqu'un du cercle qu'on n'a pas soigné autant : il ne se déplacera que
  // si l'on fait les choses en grand. C'est lui qui fait la pente.
  blankPerson(state, 'copain', { relation: 'friend', relationship: 34 });
  state.player.money = 500_000;
  const ctx = createCtx(state);
  openWake(ctx, dead);
  return { state, wake: wakeOf(state)!, dead };
}

const at = (state: GameState, wake: WakeState, formId: string) =>
  turnout(state, { ...wake, formId });

/* ------------------------------------------------------------------ */

describe('ce qui décide de l’assemblée', () => {
  it('ne se tire pas', () => {
    /*
     * Le corps de `turnout` et celui de `hold` ne doivent voir aucun tirage.
     * C'est la promesse du système : la salle est la lecture d'une vie, et une
     * lecture qui varie d'une fois sur l'autre ne lit rien.
     */
    const source = readFileSync(new URL('../../systems/wake.ts', import.meta.url), 'utf8');
    const body = source.slice(
      source.indexOf('export function turnout'),
      source.indexOf('export function summary'),
    );
    expect(body).not.toMatch(/\brng\b/);
    expect(body).not.toMatch(/Math\.random/);
  });

  it('fait venir le sang, même négligé', () => {
    const { state, wake } = scene();
    const brother = at(state, wake, 'service').find((t) => t.who.id === 'frere')!;
    expect(brother.forDeceased).toBe(true);
    expect(brother.comes).toBe(true);
  });

  it('ne fait venir le cercle que si on l’a tenu', () => {
    const { state, wake } = scene();
    const warm = at(state, wake, 'grand').find((t) => t.who.id === 'ami')!;
    expect(warm.comes).toBe(true);

    // Le même homme, le même lien, vingt-cinq ans sans un mot.
    state.npcs.ami.lastInteractionYear = state.year - 25;
    const cold = at(state, wake, 'grand').find((t) => t.who.id === 'ami')!;
    expect(cold.comes).toBe(false);
    expect(cold.held).toBe('oubli');
  });

  it('dit ce qui retient chacun, et pas une raison de remplacement', () => {
    const { state, wake } = scene();
    state.npcs.ami.incarcerated = true;
    expect(at(state, wake, 'grand').find((t) => t.who.id === 'ami')!.held).toBe('détenu');
    state.npcs.ami.incarcerated = false;
    state.npcs.ami.estranged = true;
    expect(at(state, wake, 'grand').find((t) => t.who.id === 'ami')!.held).toBe('brouille');
    state.npcs.ami.estranged = false;
    state.npcs.ami.relationship = 12;
    // Ni brouille ni oubli : il n'y avait plus grand-chose, voilà tout.
    expect(at(state, wake, 'grand').find((t) => t.who.id === 'ami')!.held).toBe('lien');
  });
});

describe('ce que la dépense achète', () => {
  it('est une pente, et jamais une falaise', () => {
    const { state, wake } = scene();
    const fills = FORMS.map((f) => attendance(state, { ...wake, formId: f.id }));
    // Croissante, sans marche à zéro entre deux formes payantes.
    for (let i = 1; i < fills.length; i += 1) expect(fills[i]).toBeGreaterThanOrEqual(fills[i - 1]);
    expect(fills[0]).toBe(0);
    expect(fills[fills.length - 1]).toBeGreaterThan(fills[1]);
  });

  it('laisse toujours la possibilité de ne rien faire', () => {
    expect(FORMS.find((f) => f.id === 'rien')!.cost).toBe(0);
  });

  it('n’empêche pas la famille de venir, sauf si l’on n’organise rien', () => {
    const { state, wake } = scene();
    const chez = at(state, wake, 'chezSoi').find((t) => t.who.id === 'frere')!;
    expect(chez.comes).toBe(true);
    const rien = at(state, wake, 'rien').find((t) => t.who.id === 'frere')!;
    expect(rien.comes).toBe(false);
  });
});

describe('ce qui reste au joueur ce jour-là', () => {
  it('trois visites, pas davantage', () => {
    const { state, wake } = scene();
    for (let i = 0; i < TELLS + 2; i += 1) {
      blankPerson(state, `loin${i}`, { relation: 'friend', relationship: 20 });
    }
    const ctx = createCtx(state);
    let taken = 0;
    for (let i = 0; i < TELLS + 2; i += 1) if (tell(ctx, `loin${i}`).ok) taken += 1;
    expect(taken).toBe(TELLS);
    expect(wake.toldIds).toHaveLength(TELLS);
  });

  it('fait venir quelqu’un qui ne serait pas venu', () => {
    const { state, wake } = scene();
    blankPerson(state, 'presque', { relation: 'friend', relationship: 27 });
    expect(at(state, wake, 'service').find((t) => t.who.id === 'presque')!.comes).toBe(false);
    tell(createCtx(state), 'presque');
    expect(at(state, wake, 'service').find((t) => t.who.id === 'presque')!.comes).toBe(true);
  });
});

describe('ce que l’assemblée vaut', () => {
  it('ne punit pas d’avoir connu du monde', () => {
    /*
     * Le dénominateur est **la place que les gens auraient eue**, prise par le
     * rôle. Sans cela, cinquante camarades de classe croisés une fois faisaient
     * baisser la note de qui n'y pouvait rien — et, mesuré, retournaient
     * complètement le résultat : les vies où tout le monde avait été laissé
     * filer sortaient devant les autres.
     */
    const { state, wake } = scene();
    const before = attendance(state, { ...wake, formId: 'service' });
    for (let i = 0; i < 20; i += 1) {
      blankPerson(state, `foule${i}`, { relation: 'acquaintance', relationship: 8 });
    }
    expect(attendance(state, { ...wake, formId: 'service' })).toBe(before);
  });

  it('ne compte pas contre le joueur ceux que rien n’aurait fait venir', () => {
    const { state, wake } = scene();
    const before = attendance(state, { ...wake, formId: 'service' });
    blankPerson(state, 'detenu', { relation: 'friend', relationship: 70, incarcerated: true });
    expect(attendance(state, { ...wake, formId: 'service' })).toBe(before);
    // Ni celui que le grand âge cloue chez lui — c'est une absence, ce n'est
    // pas une absence dont on répond.
    blankPerson(state, 'tante', {
      relation: 'grandmother', relationship: 70, age: 92, parentIds: [],
    });
    expect(attendance(state, { ...wake, formId: 'service' })).toBe(before);
  });
});

describe('ce qui se dit', () => {
  it('se départage : toutes les phrases ne tiennent pas', () => {
    const { state, dead } = scene();
    // On lui a parlé cette année : « tu étais là » tient, « on ne se parlait
    // plus » ne tient pas. Les deux s'appuient sur le même fait.
    expect(holds(state, dead, 'présence')).toBe(true);
    expect(holds(state, dead, 'silence')).toBe(false);
    dead.lastInteractionYear = state.year - 20;
    expect(holds(state, dead, 'présence')).toBe(false);
    expect(holds(state, dead, 'silence')).toBe(true);
    // Et l'aveu tient toujours : il n'y a pas de piège à ne rien prétendre.
    expect(holds(state, dead, 'aveu')).toBe(true);
  });

  it('fait payer la phrase creuse à ceux qui savaient', () => {
    const { state, wake } = scene();
    wake.formId = 'service';
    wake.speaker = 'toi';
    // Vingt ans sans un mot, et l'on prétend avoir été là.
    state.npcs.mere.lastInteractionYear = state.year - 20;
    wake.wordId = 'présence';
    const before = state.npcs.frere.opinion;
    hold(createCtx(state), true);
    expect(state.npcs.frere.opinion).toBeLessThan(before);
  });

  it('récompense la phrase juste auprès des mêmes', () => {
    const { state, wake } = scene();
    wake.formId = 'service';
    wake.speaker = 'toi';
    wake.wordId = 'présence';
    const before = state.npcs.frere.opinion;
    hold(createCtx(state), true);
    expect(state.npcs.frere.opinion).toBeGreaterThan(before);
  });
});

describe('le règlement', () => {
  it('se referme tout seul l’année d’après, même si l’on n’a rien fait', () => {
    const { state } = scene();
    expect(wakeOf(state)).not.toBeNull();
    state.year += 1;
    advanceWake(createCtx(state));
    expect(wakeOf(state)).toBeNull();
    expect(state.player.wake?.done).toBe(true);
    expect(state.player.wake?.formId).toBeTruthy();
  });

  it('n’en ouvre qu’une à la fois', () => {
    const { state } = scene();
    const other = blankPerson(state, 'pere', {
      relation: 'father', alive: false, deathYear: state.year,
    });
    openWake(createCtx(state), other);
    expect(wakeOf(state)!.whoId).toBe('mere');
  });

  it('sait quand ce n’est pas à nous', () => {
    const state = createNewLife({ seed: 77 });
    state.npcs = {};
    const gran = blankPerson(state, 'mamie', {
      relation: 'grandmother', alive: false, deathYear: state.year,
    });
    // Sans personne de plus proche, c'est à nous.
    expect(arrangedByUs(state, gran)).toBe(true);
    // Avec son fils vivant, c'est à lui.
    blankPerson(state, 'papa', { relation: 'father', parentIds: ['mamie'] });
    expect(arrangedByUs(state, gran)).toBe(false);
  });

  it('n’ouvre rien pour quelqu’un dont on n’enterre pas les gens', () => {
    const state = createNewLife({ seed: 78 });
    state.npcs = {};
    const boss = blankPerson(state, 'chef', {
      relation: 'boss', alive: false, deathYear: state.year,
    });
    openWake(createCtx(state), boss);
    expect(wakeOf(state)).toBeNull();
  });

  it('arrive dans une vie jouée, et se règle', () => {
    // Le bout à bout : personne ne pose la scène à la main.
    let seen = 0;
    for (let seed = 300_000; seed < 300_020 && seen === 0; seed += 1) {
      const life = createNewLife({ seed });
      for (let i = 0; i < 90 && !life.gameOver && life.player.alive; i += 1) {
        simulateYear(life);
        if (wakeOf(life)) { seen += 1; break; }
      }
    }
    expect(seen).toBeGreaterThan(0);
  });
});
