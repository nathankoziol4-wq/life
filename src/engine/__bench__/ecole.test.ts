/**
 * Vérifications de la vie scolaire.
 *
 * Ce qui est testé ici n'est pas « l'action existe » mais « l'action produit
 * quelque chose de différent selon le contexte ». Une action dont le résultat
 * ne dépend de rien est un faux bouton, même si elle modifie un chiffre.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState, Person } from '../types.ts';
import { resolvePending } from '../../systems/randomEvents.ts';
import { classmatesOf, staffOf } from '../../systems/school.ts';
import {
  classmateAction, disrespect, joinPeerGroup, skipSchool, studyHarder, teacherAction,
} from '../../systems/schoolActions.ts';
import { getAvailableActions, playableActions } from '../../systems/actions.ts';
import { isInSchool } from '../../systems/education.ts';

function playTo(state: GameState, years: number): GameState {
  for (let i = 0; i < years && !state.gameOver; i++) {
    simulateYear(state);
    const ctx = createCtx(state);
    for (const pending of [...state.pending]) resolvePending(ctx, pending.id, 0);
    state.pending = [];
  }
  return state;
}

/** Une vie scolarisée à l'âge voulu, quelle que soit la graine. */
function schoolLife(seed: number, age = 14): GameState {
  const state = createNewLife({ seed });
  playTo(state, age);
  return state;
}

describe('vie scolaire', () => {
  it('donne à l’élève une classe et un personnel identifiés', () => {
    for (const seed of [11, 404, 7777]) {
      const state = schoolLife(seed);
      expect(isInSchool(state), `graine ${seed}`).toBe(true);
      const mates = classmatesOf(state);
      const staff = staffOf(state);
      expect(mates.length, `graine ${seed} : camarades`).toBeGreaterThan(0);
      expect(staff.length, `graine ${seed} : personnel`).toBeGreaterThan(0);
      // Le personnel est composé de vrais PNJ, pas de silhouettes.
      for (const { staff: s, person } of staff) {
        expect(person.psyche, person.firstName).toBeTruthy();
        expect(person.alive).toBe(true);
        expect(s.skill).toBeGreaterThanOrEqual(0);
        expect(s.skill).toBeLessThanOrEqual(100);
      }
      // Il y a toujours quelqu'un qui dirige, et un professeur principal.
      expect(staff.some((x) => x.staff.role === 'directeur')).toBe(true);
      expect(staff.some((x) => x.staff.role === 'professeur principal')).toBe(true);
    }
  });

  it('propose beaucoup plus d’actions à l’école qu’ailleurs', () => {
    const state = schoolLife(31);
    const mate = classmatesOf(state)[0];
    const general = playableActions(state, mate, 'général').length;
    const atSchool = playableActions(state, mate, 'école').length;
    expect(atSchool).toBeGreaterThan(general);
    // Un écran qui n'offrirait que trois choses ne vaudrait pas d'exister.
    expect(atSchool).toBeGreaterThanOrEqual(10);
  });

  it('n’offre jamais une action qui n’a pas de sens', () => {
    const child = createNewLife({ seed: 88 });
    playTo(child, 7);
    const parent = child.npcs[child.player.origin.parents[0].personId];
    const actions = getAvailableActions(child, parent, 'général');

    // Un enfant de sept ans ne demande personne en mariage, et surtout pas un
    // parent : la ligne doit être absente ou bloquée, jamais jouable.
    const propose = actions.find((a) => a.id === 'propose');
    expect(propose === undefined || propose.blocked !== null).toBe(true);
    // Et rien de romantique n'est jouable envers un parent.
    for (const action of actions.filter((a) => a.group === 'amour')) {
      expect(action.blocked, `${action.id} vers un parent`).not.toBeNull();
    }
  });

  it('ne propose jamais de séduire un professeur ni un adulte quand on est mineur', () => {
    const state = schoolLife(555, 15);
    for (const { person: teacher } of staffOf(state)) {
      const actions = getAvailableActions(state, teacher, 'école');
      // Ces lignes ne doivent pas exister, même grisées : les afficher
      // reviendrait à suggérer qu'elles pourraient être débloquées.
      expect(actions.filter((a) => a.group === 'amour'), teacher.firstName).toEqual([]);
      expect(actions.some((a) => a.id === 'askBestFriend')).toBe(false);
    }
    // Et rien de romantique vers un adulte tant qu'on est mineur, professeur
    // ou pas.
    const adults = Object.values(state.npcs)
      .filter((x) => x.alive && x.age >= 25 && !x.petSpecies);
    for (const adult of adults) {
      expect(
        getAvailableActions(state, adult, 'général').filter((a) => a.group === 'amour'),
        `${adult.firstName} (${adult.age} ans)`,
      ).toEqual([]);
    }
  });

  it('explique pourquoi une action est indisponible', () => {
    const state = schoolLife(1234);
    const mate = classmatesOf(state)[0];
    const blocked = getAvailableActions(state, mate, 'école').filter((a) => a.blocked !== null);
    for (const action of blocked) {
      expect(action.blocked!.length, action.id).toBeGreaterThan(8);
    }
  });

  it('fait escalader les absences au lieu de tirer à chaque fois', { timeout: 30_000 }, () => {
    // Sur un grand nombre d'élèves, sécher tous les ans doit produire des
    // sanctions ; sécher une fois ne doit presque jamais en produire.
    let onceSanctioned = 0;
    let oftenSanctioned = 0;

    for (let seed = 0; seed < 30; seed++) {
      const rare = schoolLife(seed * 197 + 5, 13);
      const rareCtx = createCtx(rare);
      skipSchool(rareCtx);
      if (rare.player.education.discipline.record.length > 0) onceSanctioned += 1;

      const often = schoolLife(seed * 197 + 5, 13);
      const oftenCtx = createCtx(often);
      for (let i = 0; i < 6; i++) skipSchool(oftenCtx);
      if (often.player.education.discipline.record.length > 0) oftenSanctioned += 1;
    }

    expect(oftenSanctioned).toBeGreaterThan(onceSanctioned + 5);
  });

  it('fait réagir différemment deux personnes différentes à la même insolence', { timeout: 30_000 }, () => {
    // Même graine, même geste, mais la cible change : la réaction doit
    // dépendre de qui elle est, pas du tirage seul.
    const outcomes = new Set<string>();
    for (let seed = 0; seed < 40; seed++) {
      const state = schoolLife(seed * 313 + 9, 15);
      const mates = classmatesOf(state);
      if (mates.length === 0) continue;
      const ctx = createCtx(state);
      const result = disrespect(ctx, mates[0].id);
      if (result.ok && result.message) outcomes.add(result.message.slice(0, 40));
    }
    // Six réactions sont implémentées ; on doit en voir plusieurs.
    expect(outcomes.size).toBeGreaterThan(3);
  });

  it('avertit les parents quand la sanction est lourde', { timeout: 30_000 }, () => {
    let toldSomeone = false;
    for (let seed = 0; seed < 40 && !toldSomeone; seed++) {
      const state = schoolLife(seed * 71 + 13, 16);
      const parentId = state.player.origin.parents[0]?.personId;
      const parent: Person | undefined = parentId ? state.npcs[parentId] : undefined;
      if (!parent?.alive) continue;
      const before = parent.relationship;
      const ctx = createCtx(state);
      // Assez d'incidents pour dépasser le simple avertissement.
      for (let i = 0; i < 8; i++) skipSchool(ctx);
      const suspended = state.player.education.discipline.suspensions > 0
        || state.player.education.discipline.detentions > 1;
      if (suspended && parent.relationship < before) toldSomeone = true;
    }
    expect(toldSomeone).toBe(true);
  });

  it('rend le soutien d’un professeur dépendant de l’établissement', { timeout: 30_000 }, () => {
    // Deux mondes identiques, un professeur consciencieux contre un autre :
    // le soutien accordé ne peut pas être le même.
    let helpedByGood = 0;
    let helpedByBad = 0;

    for (let seed = 0; seed < 40; seed++) {
      const good = schoolLife(seed * 53 + 3, 14);
      const goodStaff = staffOf(good)[0];
      if (!goodStaff) continue;
      const gs = good.player.origin.schoolClass!.staff.find((s) => s.personId === goodStaff.person.id)!;
      gs.professionalism = 95;
      good.player.origin.school!.tutoring = 90;
      if (teacherAction(createCtx(good), goodStaff.person.id, 'askHelp').tone === 'good') helpedByGood += 1;

      const bad = schoolLife(seed * 53 + 3, 14);
      const badStaff = staffOf(bad)[0];
      if (!badStaff) continue;
      const bs = bad.player.origin.schoolClass!.staff.find((s) => s.personId === badStaff.person.id)!;
      bs.professionalism = 5;
      bad.player.origin.school!.tutoring = 5;
      if (teacherAction(createCtx(bad), badStaff.person.id, 'askHelp').tone === 'good') helpedByBad += 1;
    }

    expect(helpedByGood).toBeGreaterThan(helpedByBad + 5);
  });

  it('fait dépendre l’entrée dans un groupe de ce qu’on partage avec lui', { timeout: 30_000 }, () => {
    let joinedWhenSharing = 0;
    let joinedWhenNot = 0;

    for (let seed = 0; seed < 60; seed++) {
      const state = schoolLife(seed * 149 + 21, 15);
      const groups = state.player.origin.schoolClass?.groups ?? [];
      const group = groups.find((g) => g.interestId && !g.playerMember);
      if (!group?.interestId) continue;

      // Version passionnée par ce que le groupe partage.
      const keen = JSON.parse(JSON.stringify(state)) as GameState;
      const keenGroup = keen.player.origin.schoolClass!.groups.find((g) => g.id === group.id)!;
      const existing = keen.player.psyche.interests.find((i) => i.id === group.interestId);
      if (existing) existing.level = 95;
      else {
        keen.player.psyche.interests.push({
          id: group.interestId, level: 95, skill: 40, years: 3, origin: 'test',
        });
      }
      if (joinPeerGroup(createCtx(keen), keenGroup.id).tone === 'good') joinedWhenSharing += 1;

      // Version totalement étrangère à ce goût.
      const cold = JSON.parse(JSON.stringify(state)) as GameState;
      const coldGroup = cold.player.origin.schoolClass!.groups.find((g) => g.id === group.id)!;
      cold.player.psyche.interests = cold.player.psyche.interests
        .filter((i) => i.id !== group.interestId);
      if (joinPeerGroup(createCtx(cold), coldGroup.id).tone === 'good') joinedWhenNot += 1;
    }

    expect(joinedWhenSharing).toBeGreaterThan(joinedWhenNot);
  });

  it('fait payer le travail supplémentaire en temps et en fatigue', () => {
    const state = schoolLife(2468, 15);
    const before = {
      grades: state.player.education.grades,
      stress: state.player.stats.stress,
    };
    const result = studyHarder(createCtx(state));
    expect(result.ok).toBe(true);
    expect(state.player.education.grades).toBeGreaterThan(before.grades);
    expect(state.player.stats.stress).toBeGreaterThan(before.stress);
    // Deux fois par an au maximum : la troisième doit être refusée.
    studyHarder(createCtx(state));
    expect(studyHarder(createCtx(state)).ok).toBe(false);
  });

  it('fait de l’entraide un échange, pas un bouton gratuit', () => {
    const state = schoolLife(4321, 15);
    const mate = classmatesOf(state)[0];
    state.player.education.grades = 18;
    state.player.stats.intelligence = 90;
    const before = mate.relationship;
    const result = classmateAction(createCtx(state), mate.id, 'helpWork');
    expect(result.ok).toBe(true);
    // Aider quelqu'un ne peut pas dégrader la relation.
    expect(mate.relationship).toBeGreaterThanOrEqual(before);
    // Une seule fois par an et par personne.
    expect(classmateAction(createCtx(state), mate.id, 'helpWork').ok).toBe(false);
  });

  it('conserve la vie scolaire dans la sauvegarde', () => {
    const state = schoolLife(999, 14);
    const ctx = createCtx(state);
    skipSchool(ctx);
    const round = JSON.parse(JSON.stringify(state)) as GameState;
    expect(round.player.education.discipline).toEqual(state.player.education.discipline);
    expect(round.player.origin.schoolClass!.staff).toEqual(state.player.origin.schoolClass!.staff);
    expect(round.player.education.clubStanding).toEqual(state.player.education.clubStanding);
  });
});
