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

  /* ---------------- Les gens de l'école ---------------- */

  it('ouvre le premier amour à l’école, pas seulement à l’âge adulte', () => {
    // L'audit relevait : « aucun premier amour scolaire : la séduction
    // commence à l'âge adulte ». C'était six ans de trou exactement là où ça
    // compte.
    let asked = 0;
    let accepted = 0;
    let refused = 0;
    for (let seed = 0; seed < 60; seed++) {
      const state = schoolLife(seed * 71 + 5, 15);
      if (state.gameOver || !state.player.alive) continue;
      const mates = classmatesOf(state);
      const p = state.player;
      const mate = mates.find(
        (m) => (p.orientation === 'bi')
          || (p.orientation === 'homo' ? m.sex === p.sex : m.sex !== p.sex),
      );
      if (!mate) continue;
      asked += 1;
      mate.relationship = 70;
      mate.opinion = 70;
      const result = classmateAction(createCtx(state), mate.id, 'askOut');
      if (!result.ok) continue;
      if (mate.relation === 'partner') accepted += 1; else refused += 1;
    }
    expect(asked).toBeGreaterThan(20);
    // Les deux issues existent franchement : ni formalité, ni mur.
    expect(accepted).toBeGreaterThan(3);
    expect(refused).toBeGreaterThan(3);
  });

  it('refuse une déclaration à qui n’en est pas là', () => {
    const state = schoolLife(1234, 15);
    const mate = classmatesOf(state)[0];
    if (!mate) return;
    state.player.age = 9;
    expect(classmateAction(createCtx(state), mate.id, 'askOut').ok).toBe(false);
  });

  it('fait dépendre la déclaration de ce qu’on est pour l’autre', () => {
    // À caractère égal, quelqu'un qu'on apprécie dit oui plus souvent.
    let liked = 0;
    let stranger = 0;
    for (let seed = 0; seed < 50; seed++) {
      const base = schoolLife(seed * 97 + 11, 15);
      if (base.gameOver || !base.player.alive) continue;
      const first = classmatesOf(base)[0];
      if (!first) continue;
      base.player.orientation = 'bi';
      for (const [rel, tally] of [[92, 'liked'], [26, 'stranger']] as const) {
        const state = structuredClone(base);
        const mate = state.npcs[first.id];
        mate.relationship = rel;
        mate.opinion = rel;
        classmateAction(createCtx(state), mate.id, 'askOut');
        if (state.npcs[first.id].relation === 'partner') {
          if (tally === 'liked') liked += 1; else stranger += 1;
        }
      }
    }
    expect(liked).toBeGreaterThan(stranger);
  });

  it('permet de réparer une brouille, sans que ce soit acquis', () => {
    // Une brouille était définitive : on pouvait vider une classe sans jamais
    // pouvoir revenir en arrière.
    let repaired = 0;
    let refused = 0;
    for (let seed = 0; seed < 50; seed++) {
      const state = schoolLife(seed * 53 + 7, 14);
      if (state.gameOver || !state.player.alive) continue;
      const mate = classmatesOf(state)[0];
      if (!mate) continue;
      mate.relationship = 18;
      mate.lastInteractionYear = state.year - 2;
      const before = mate.relationship;
      const result = classmateAction(createCtx(state), mate.id, 'makeUp');
      if (!result.ok) continue;
      if (mate.relationship > before) repaired += 1; else refused += 1;
    }
    expect(repaired).toBeGreaterThan(5);
    expect(refused).toBeGreaterThan(3);
  });

  it('n’a rien à réparer là où rien n’est cassé', () => {
    const state = schoolLife(4321, 14);
    const mate = classmatesOf(state)[0];
    if (!mate) return;
    mate.relationship = 80;
    mate.estranged = false;
    expect(classmateAction(createCtx(state), mate.id, 'makeUp').ok).toBe(false);
  });

  it('fait de la farce un pari sur le groupe', () => {
    // Elle doit réussir chez quelqu'un qui le prend bien et se retourner chez
    // quelqu'un de susceptible : sinon ce n'est qu'un bouton de popularité.
    let warm = 0;
    let prickly = 0;
    for (let seed = 0; seed < 50; seed++) {
      const base = schoolLife(seed * 37 + 3, 14);
      if (base.gameOver || !base.player.alive) continue;
      const first = classmatesOf(base)[0];
      if (!first) continue;
      for (const [setup, tally] of [['warm', 'warm'], ['prickly', 'prickly']] as const) {
        const state = structuredClone(base);
        const mate = state.npcs[first.id];
        mate.relationship = setup === 'warm' ? 85 : 20;
        mate.personality.temper = setup === 'warm' ? 10 : 95;
        if (mate.psyche) mate.psyche.emotion.stability = setup === 'warm' ? 90 : 15;
        const before = mate.relationship;
        classmateAction(createCtx(state), mate.id, 'prank');
        if (state.npcs[first.id].relationship >= before) {
          if (tally === 'warm') warm += 1; else prickly += 1;
        }
      }
    }
    expect(warm).toBeGreaterThan(prickly);
  });

  it('fait lire un cadeau pour ce qu’il est quand le lien est faible', () => {
    const close = schoolLife(555, 14);
    const distant = schoolLife(555, 14);
    if (close.gameOver || distant.gameOver) return;
    const a = classmatesOf(close)[0];
    const b = classmatesOf(distant)[0];
    if (!a || !b) return;
    close.player.money = 5000;
    distant.player.money = 5000;
    a.relationship = 80;
    b.relationship = 15;
    const beforeA = a.opinion;
    const beforeB = b.opinion;
    classmateAction(createCtx(close), a.id, 'gift');
    classmateAction(createCtx(distant), b.id, 'gift');
    expect(a.opinion).toBeGreaterThan(beforeA);
    expect(b.opinion).toBeLessThanOrEqual(beforeB);
    // Et ça coûte quelque chose dans les deux cas.
    expect(close.player.money).toBeLessThan(5000);
  });

  it('refuse un cadeau qu’on n’a pas les moyens d’offrir', () => {
    const state = schoolLife(556, 14);
    const mate = classmatesOf(state)[0];
    if (!mate) return;
    state.player.money = 0;
    expect(classmateAction(createCtx(state), mate.id, 'gift').ok).toBe(false);
  });

  it('fait dépendre le fait d’en parler à un adulte de l’établissement', () => {
    let heard = 0;
    let ignored = 0;
    for (let seed = 0; seed < 40; seed++) {
      const base = schoolLife(seed * 43 + 13, 14);
      if (base.gameOver || !base.player.alive) continue;
      if (!base.player.origin.school) continue;
      const first = classmatesOf(base)[0];
      if (!first || (base.player.origin.schoolClass?.staff.length ?? 0) === 0) continue;
      for (const [care, tally] of [[100, 'heard'], [0, 'ignored']] as const) {
        const state = structuredClone(base);
        state.player.origin.school!.counselling = care;
        for (const member of state.player.origin.schoolClass!.staff) {
          member.professionalism = care;
        }
        const result = classmateAction(createCtx(state), first.id, 'tellAdult');
        if (result.tone === 'good') {
          if (tally === 'heard') heard += 1; else ignored += 1;
        }
      }
    }
    expect(heard).toBeGreaterThan(ignored);
  });

  it('laisse plaider sa cause, et seulement avec un dossier à plaider', () => {
    const state = schoolLife(777, 15);
    if (state.gameOver || !state.player.alive) return;
    const head = staffOf(state).find(
      (x) => x.staff.role === 'directeur' || x.staff.role === 'conseiller',
    );
    if (!head) return;
    const d = state.player.education.discipline;
    d.warnings = 0; d.detentions = 0; d.suspensions = 0;
    // Rien à plaider : l'action se refuse d'elle-même.
    expect(teacherAction(createCtx(state), head.person.id, 'plead').ok).toBe(false);

    d.detentions = 2;
    d.behaviour = 40;
    const result = teacherAction(createCtx(state), head.person.id, 'plead');
    expect(result.ok).toBe(true);
    // Accepté, le recours efface une ligne ; rejeté, il n'en ajoute pas.
    expect(d.detentions).toBeLessThanOrEqual(2);
    // Et pas deux fois la même année.
    expect(teacherAction(createCtx(state), head.person.id, 'plead').ok).toBe(false);
  });

  it('fait dépendre le recours du dossier plutôt que de la sympathie', () => {
    let clean = 0;
    let heavy = 0;
    for (let seed = 0; seed < 50; seed++) {
      const base = schoolLife(seed * 61 + 17, 15);
      if (base.gameOver || !base.player.alive) continue;
      const head = staffOf(base).find(
        (x) => x.staff.role === 'directeur' || x.staff.role === 'conseiller',
      );
      if (!head) continue;
      for (const [behaviour, tally] of [[95, 'clean'], [10, 'heavy']] as const) {
        const state = structuredClone(base);
        const d = state.player.education.discipline;
        d.detentions = 2;
        d.behaviour = behaviour;
        const before = d.detentions;
        teacherAction(createCtx(state), head.person.id, 'plead');
        if (state.player.education.discipline.detentions < before) {
          if (tally === 'clean') clean += 1; else heavy += 1;
        }
      }
    }
    expect(clean).toBeGreaterThan(heavy);
  });

  it('refuse le recours à quelqu’un qui n’a pas la main dessus', () => {
    const state = schoolLife(888, 15);
    const plain = staffOf(state).find((x) => x.staff.role === 'professeur');
    if (!plain) return;
    state.player.education.discipline.warnings = 2;
    expect(teacherAction(createCtx(state), plain.person.id, 'plead').ok).toBe(false);
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
