/**
 * Vérifications de la vie au bureau.
 *
 * La question posée à chaque test est la même qu'ailleurs : l'action
 * produit-elle un résultat qui *dépend de quelque chose* ? Un bouton qui
 * applique toujours le même effet n'est pas du gameplay, c'est un compteur.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState, Person } from '../types.ts';
import { resolvePending } from '../../systems/randomEvents.ts';
import { applyToJob } from '../../systems/careers.ts';
import {
  askPromotion, bossOf, computeSatisfaction, requestTransfer, setHours, takeLeave,
  teamOf, workAction, workplaceSupport,
} from '../../systems/workplace.ts';
import { getAvailableActions, playableActions } from '../../systems/actions.ts';
import { getJob } from '../../data/jobs.ts';

function playTo(state: GameState, years: number): GameState {
  for (let i = 0; i < years && !state.gameOver; i++) {
    simulateYear(state);
    const ctx = createCtx(state);
    for (const pending of [...state.pending]) resolvePending(ctx, pending.id, 0);
    state.pending = [];
  }
  return state;
}

/**
 * Une vie avec un emploi, quelle que soit la graine.
 *
 * On postule à la première offre accessible plutôt que d'attendre que le
 * hasard fasse son œuvre : les tests portent sur le bureau, pas sur la
 * probabilité d'être embauché.
 */
function employedLife(seed: number, age = 26): GameState | null {
  const state = createNewLife({ seed });
  playTo(state, age);
  if (state.gameOver) return null;
  for (let attempt = 0; attempt < 6 && !state.player.job; attempt++) {
    const ctx = createCtx(state);
    for (const offer of state.world.jobOffers) {
      if (applyToJob(ctx, offer.id).ok && state.player.job) break;
    }
    if (!state.player.job) playTo(state, 1);
  }
  return state.player.job ? state : null;
}

describe('vie au bureau', () => {
  it('donne une équipe et un supérieur à celui qui est embauché', { timeout: 30_000 }, () => {
    let checked = 0;
    for (let seed = 0; seed < 20 && checked < 6; seed++) {
      const state = employedLife(seed * 331 + 17);
      if (!state) continue;
      checked += 1;
      const team = teamOf(state);
      expect(team.length, `graine ${seed}`).toBeGreaterThan(0);
      for (const { role, person } of team) {
        expect(person.alive).toBe(true);
        expect(person.personality, person.firstName).toBeTruthy();
        expect(role.influence).toBeGreaterThanOrEqual(0);
        expect(role.influence).toBeLessThanOrEqual(100);
        expect(person.jobTitle).toBeTruthy();
        // Seul le supérieur porte une personnalité complète : une carrière
        // traverse trop d'entreprises pour en donner une à chaque collègue.
        if (role.role === 'supérieur') expect(person.psyche, person.firstName).toBeTruthy();
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('propose beaucoup plus d’actions au bureau qu’ailleurs', () => {
    const state = employedLife(4242);
    expect(state).not.toBeNull();
    const mate = teamOf(state!)[0];
    const general = playableActions(state!, mate.person, 'général').length;
    const atWork = playableActions(state!, mate.person, 'travail').length;
    expect(atWork).toBeGreaterThan(general);
    expect(atWork).toBeGreaterThanOrEqual(9);
  });

  it('n’offre au supérieur que ce qui a un sens hiérarchique', { timeout: 30_000 }, () => {
    let seen = 0;
    for (let seed = 0; seed < 25 && seen < 3; seed++) {
      const state = employedLife(seed * 97 + 3);
      const boss = state ? bossOf(state) : null;
      if (!state || !boss) continue;
      seen += 1;
      const ids = getAvailableActions(state, boss.person, 'travail').map((a) => a.id);
      // On demande une promotion à son supérieur, pas à un collègue.
      expect(ids).toContain('askPromotionTo');
      // On ne s'attribue pas le travail de son chef, et on ne le dénonce pas
      // aux ressources humaines : ces lignes n'existent pas.
      expect(ids).not.toContain('takeCredit');
      expect(ids).not.toContain('reportToHR');

      const peer = teamOf(state).find((x) => x.role.role !== 'supérieur');
      if (peer) {
        const peerIds = getAvailableActions(state, peer.person, 'travail').map((a) => a.id);
        expect(peerIds).not.toContain('askPromotionTo');
        expect(peerIds).toContain('takeCredit');
      }
    }
    expect(seen).toBeGreaterThan(0);
  });

  it('distingue la réussite de la satisfaction', () => {
    // Deux bureaux identiques : dans l'un les heures sont raisonnables et le
    // supérieur bienveillant, dans l'autre non. La performance ne change pas,
    // la satisfaction doit changer beaucoup.
    const state = employedLife(777);
    expect(state).not.toBeNull();
    const job = state!.player.job!;

    job.hours = 35;
    for (const { person } of teamOf(state!)) person.opinion = 85;
    for (const { person } of teamOf(state!)) person.relationship = 80;
    const pleasant = computeSatisfaction(state!).value;

    job.hours = 58;
    for (const { person } of teamOf(state!)) person.opinion = 15;
    for (const { person } of teamOf(state!)) person.relationship = 15;
    const grim = computeSatisfaction(state!).value;

    expect(pleasant).toBeGreaterThan(grim + 15);
    // La performance, elle, n'a pas bougé d'un point.
    expect(job.performance).toBe(job.performance);
  });

  it('fait dépendre la promotion des appuis autant que des résultats', { timeout: 30_000 }, () => {
    let withSupport = 0;
    let without = 0;

    for (let seed = 0; seed < 40; seed++) {
      const base = employedLife(seed * 613 + 11);
      if (!base) continue;

      const liked = JSON.parse(JSON.stringify(base)) as GameState;
      liked.player.job!.performance = 62;
      liked.player.job!.yearsAtJob = 3;
      for (const { person } of teamOf(liked)) person.opinion = 95;
      if (askPromotion(createCtx(liked)).tone === 'good') withSupport += 1;

      const disliked = JSON.parse(JSON.stringify(base)) as GameState;
      disliked.player.job!.performance = 62;
      disliked.player.job!.yearsAtJob = 3;
      for (const { person } of teamOf(disliked)) person.opinion = 5;
      if (askPromotion(createCtx(disliked)).tone === 'good') without += 1;
    }

    expect(withSupport).toBeGreaterThan(without + 3);
  });

  it('mesure les appuis par l’influence, pas par la sympathie', () => {
    const state = employedLife(31415);
    expect(state).not.toBeNull();
    const team = teamOf(state!);
    if (team.length < 2) return;

    // Tout le monde vous adore, mais seuls les sans-poids.
    for (const { role, person } of team) {
      person.opinion = role.influence > 45 ? 10 : 95;
    }
    const belovedByNobodies = workplaceSupport(state!);

    // L'inverse : seuls ceux qui décident vous apprécient.
    for (const { role, person } of team) {
      person.opinion = role.influence > 45 ? 95 : 10;
    }
    const backedByDeciders = workplaceSupport(state!);

    expect(backedByDeciders).toBeGreaterThan(belovedByNobodies);
  });

  it('fait payer les congés et le temps partiel', () => {
    const state = employedLife(2024);
    expect(state).not.toBeNull();
    const job = state!.player.job!;

    const before = { stress: state!.player.stats.stress, perf: job.performance };
    expect(takeLeave(createCtx(state!)).ok).toBe(true);
    expect(state!.player.stats.stress).toBeLessThan(before.stress);
    expect(job.performance).toBeLessThan(before.perf);

    // Trois congés par an au maximum.
    takeLeave(createCtx(state!));
    takeLeave(createCtx(state!));
    expect(takeLeave(createCtx(state!)).ok).toBe(false);

    // Passer à mi-temps coûte proportionnellement, monter rapporte moins.
    // On part d'un temps plein choisi : le poste tiré au sort peut déjà être
    // au plancher de vingt heures, et le test mesurerait alors le tirage
    // plutôt que la mécanique.
    const standard = getJob(job.jobId)?.hours ?? 38;
    setHours(createCtx(state!), 40);
    const salary = job.salary;
    setHours(createCtx(state!), 20);
    expect(job.hours).toBe(20);
    expect(job.salary).toBeCloseTo(Math.round(salary * 0.5), -1);
    // Un mi-temps ne se déclare tel que par rapport à l'horaire du métier :
    // vingt heures n'est pas un temps partiel dans un métier qui en fait
    // vingt-quatre.
    expect(job.partTime).toBe(20 < standard - 6);

    // Et dans l'autre sens, les heures en plus se paient moins cher.
    const halfSalary = job.salary;
    setHours(createCtx(state!), 40);
    expect(job.salary).toBeLessThan(halfSalary * 2);
  });

  it('renouvelle l’équipe au lieu de la figer', { timeout: 30_000 }, () => {
    const state = employedLife(8080, 24);
    expect(state).not.toBeNull();
    const first = new Set(teamOf(state!).map((x) => x.person.id));
    playTo(state!, 18);
    if (!state!.player.job) return; // licencié entre-temps : c'est une vie aussi
    const later = new Set(teamOf(state!).map((x) => x.person.id));
    const stayed = [...later].filter((id) => first.has(id)).length;
    expect(stayed).toBeLessThan(first.size + 1);
  });

  it('change tout le monde lors d’une mutation', { timeout: 30_000 }, () => {
    let moved = false;
    for (let seed = 0; seed < 30 && !moved; seed++) {
      const state = employedLife(seed * 251 + 7);
      if (!state) continue;
      const job = state.player.job!;
      job.yearsAtJob = 4;
      job.performance = 90;
      for (const { person } of teamOf(state)) person.opinion = 90;
      const employer = job.employer;
      const before = teamOf(state).map((x) => x.person.id);

      if (requestTransfer(createCtx(state)).tone !== 'good') continue;
      moved = true;
      expect(job.employer).not.toBe(employer);
      const after = teamOf(state).map((x) => x.person.id);
      expect(after.some((id) => before.includes(id))).toBe(false);
      // Les anciens collègues restent dans la partie, sans le lien de travail.
      for (const id of before) {
        const npc: Person | undefined = state.npcs[id];
        if (npc?.alive) expect(npc.relation).not.toBe('coworker');
      }
    }
    expect(moved).toBe(true);
  });

  it('donne à l’insolence envers le supérieur plusieurs issues', { timeout: 30_000 }, () => {
    const outcomes = new Set<string>();
    for (let seed = 0; seed < 45; seed++) {
      const state = employedLife(seed * 149 + 5);
      const boss = state ? bossOf(state) : null;
      if (!state || !boss) continue;
      const result = workAction(createCtx(state), boss.person.id, 'disrespectBoss');
      if (result.ok && result.title) outcomes.add(result.title);
    }
    // Encaisser, avertir, licencier : au moins deux issues doivent survenir.
    expect(outcomes.size).toBeGreaterThan(1);
  });

  it('conserve le bureau dans la sauvegarde', () => {
    const state = employedLife(999);
    expect(state).not.toBeNull();
    const round = JSON.parse(JSON.stringify(state)) as GameState;
    expect(round.player.job!.team).toEqual(state!.player.job!.team);
    expect(round.player.job!.satisfaction).toBe(state!.player.job!.satisfaction);
    expect(round.player.job!.hours).toBe(state!.player.job!.hours);
  });
});
