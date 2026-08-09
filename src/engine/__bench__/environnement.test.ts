/**
 * Vérifications de l'environnement.
 *
 * Deux exigences opposées doivent tenir en même temps :
 *
 * 1. l'environnement doit *compter* — deux personnages génétiquement
 *    identiques mais élevés dans des milieux différents doivent mener des
 *    vies mesurablement différentes ;
 * 2. l'environnement ne doit pas *décider* — aucune origine ne doit verrouiller
 *    une trajectoire, ni vers le haut ni vers le bas.
 *
 * Un test qui échouerait dans un sens comme dans l'autre signale un vrai
 * problème de conception, pas un simple déséquilibre numérique.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { simulateYear } from '../simulateYear.ts';
import { createCtx } from '../context.ts';
import type { GameState } from '../types.ts';
import { validateEnvironmentImpact } from '../../systems/environmentAudit.ts';
import { netWorth } from '../../systems/finance.ts';
import { ORIGIN_PRESETS } from '../../data/originPresets.ts';
import { resolvePending } from '../../systems/randomEvents.ts';
import { autoplayLife } from './autoplay.ts';
import { coherenceWarnings, previewOrigin } from '../../systems/originGen.ts';
import { exposureSignals, originSignals } from '../../systems/exposure.ts';
import { getEducationContext } from '../../systems/contexts.ts';

/** Joue `years` années en répondant au hasard aux situations proposées. */
function playTo(state: GameState, years: number): GameState {
  for (let i = 0; i < years && !state.gameOver; i++) {
    simulateYear(state);
    const ctx = createCtx(state);
    for (const pending of [...state.pending]) {
      resolvePending(ctx, pending.id, 0);
    }
    state.pending = [];
  }
  return state;
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);
}

describe('impact de l’environnement', () => {
  it('n’accepte aucun paramètre décoratif', { timeout: 60_000 }, () => {
    // L'audit perturbe chaque champ de l'environnement et vérifie qu'il
    // change quelque chose. Un champ sans effet est une promesse non tenue.
    for (const preset of ORIGIN_PRESETS) {
      const state = createNewLife({ seed: 4242, draft: { presetId: preset.id } });
      const orphans = validateEnvironmentImpact(state).filter((i) => i.kind === 'orphelin');
      expect(orphans.map((o) => o.path), `préréglage ${preset.id}`).toEqual([]);
    }
  });

  it('laisse l’environnement intact après un audit', () => {
    const state = createNewLife({ seed: 31 });
    const before = JSON.stringify(state.player.origin);
    validateEnvironmentImpact(state);
    expect(JSON.stringify(state.player.origin)).toBe(before);
  });

  it('produit des vies différentes à partir de milieux différents', { timeout: 120_000 }, () => {
    // Même graine, mêmes tirages de départ : seul le milieu change.
    const rich: number[] = [];
    const poor: number[] = [];
    const richGrades: number[] = [];
    const poorGrades: number[] = [];
    const richHonours: number[] = [];
    const poorHonours: number[] = [];

    for (let seed = 0; seed < 26; seed++) {
      // Même joueur automatique, mêmes efforts : seul le milieu diffère.
      const a = autoplayLife(seed * 977 + 13, { maxYears: 45, draft: { presetId: 'affluent' } });
      const b = autoplayLife(seed * 977 + 13, { maxYears: 45, draft: { presetId: 'projects' } });
      rich.push(netWorth(a));
      poor.push(netWorth(b));
      // On mesure la moyenne obtenue et les mentions, pas le niveau atteint :
      // un pilote automatique appliqué finit ses études des deux côtés, si
      // bien que `education.level` sature et ne distingue plus rien. Ce qui
      // sépare réellement les deux milieux, c'est la qualité du parcours.
      richGrades.push(a.player.education.grades);
      poorGrades.push(b.player.education.grades);
      richHonours.push(a.player.education.degrees.filter((d) => d.honors).length);
      poorHonours.push(b.player.education.degrees.filter((d) => d.honors).length);
    }

    // L'avantage doit être net : sinon l'environnement ne sert à rien.
    expect(mean(richGrades)).toBeGreaterThan(mean(poorGrades) + 1);
    expect(mean(richHonours)).toBeGreaterThan(mean(poorHonours));
    // Sur le patrimoine, aucune statistique unique ne convient. La moyenne se
    // laisse déplacer par une seule vie exceptionnelle ; la médiane tombe dans
    // le plateau des vies qui finissent à zéro exactement ; le nombre de vies
    // endettées ne dit rien, parce qu'à quarante-cinq ans une dette est aussi
    // souvent un crédit immobilier qu'une misère.
    //
    // On compare donc toute la moitié haute de la distribution, quantile par
    // quantile : c'est là que le milieu se voit, et une comparaison qui tient
    // sur quatre points à la fois ne bascule pas sur un tirage.
    const quantile = (xs: number[], q: number) =>
      [...xs].sort((a, b) => a - b)[Math.floor(xs.length * q)];

    // Le dernier décile est volontairement exclu : sur vingt-six vies il ne
    // représente que deux ou trois trajectoires, et la queue de distribution
    // est si lourde qu'une seule réussite exceptionnelle du côté pauvre suffit
    // à l'inverser. Ce n'est pas le milieu qu'on mesurerait, c'est la chance.
    for (const q of [0.5, 0.6, 0.75]) {
      expect(quantile(rich, q), `quantile ${q}`).toBeGreaterThanOrEqual(quantile(poor, q));
    }
    // Et l'écart doit être franc quelque part, pas seulement non négatif.
    expect(quantile(rich, 0.75)).toBeGreaterThan(quantile(poor, 0.75));
  });

  it('ne verrouille aucune trajectoire', { timeout: 120_000 }, () => {
    // On compare deux populations, l'une partie du bas, l'autre du haut, en
    // faisant varier l'application du joueur : tout le monde ne s'investit
    // pas de la même façon. La question n'est pas « qui gagne en moyenne »
    // — l'autre test s'en charge — mais « les deux distributions se
    // recouvrent-elles ». Si elles ne se recouvrent pas, l'origine est
    // devenue un destin, et c'est exactement ce que le jeu ne doit pas faire.
    const sample = 50;
    const poor: number[] = [];
    const rich: number[] = [];

    for (let seed = 0; seed < sample; seed++) {
      const diligence = 0.35 + (seed % 5) * 0.16;
      poor.push(netWorth(autoplayLife(seed * 613 + 5, {
        maxYears: 60, diligence, draft: { presetId: 'projects' },
      })));
      rich.push(netWorth(autoplayLife(seed * 613 + 5, {
        maxYears: 60, diligence, draft: { presetId: 'wealthy' },
      })));
    }

    const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
    const poorMedian = median(poor);
    const richMedian = median(rich);

    // Ascension : des vies parties du bas dépassent la médiane des vies
    // parties du haut.
    const roseAbove = poor.filter((x) => x > richMedian).length;
    // Déclassement : des vies parties du haut tombent sous la médiane des
    // vies parties du bas.
    const fellBelow = rich.filter((x) => x < poorMedian).length;

    expect(roseAbove).toBeGreaterThan(0);
    expect(fellBelow).toBeGreaterThan(0);
    // Sans être pour autant équivalentes : la mobilité reste minoritaire.
    expect(roseAbove).toBeLessThan(sample / 2);
  });

  it('fait vivre l’environnement au fil des années', () => {
    const state = createNewLife({ seed: 8081 });
    const start = JSON.parse(JSON.stringify(state.player.origin));
    playTo(state, 18);
    const now = state.player.origin;

    // Le quartier et l'économie locale doivent avoir bougé.
    const moved = now.neighborhood.reputation !== start.neighborhood.reputation
      || now.neighborhood.safety !== start.neighborhood.safety;
    expect(moved).toBe(true);
    expect(now.economy.priceIndex).toBeGreaterThan(1);
    // Les axes restent bornés quoi qu'il arrive.
    for (const value of Object.values(now.opportunities)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
    for (const value of Object.values(now.difficulties)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });

  it('fait dériver la personnalité acquise sans effacer le tempérament', () => {
    const state = createNewLife({ seed: 5150 });
    const born = { ...state.player.traits };
    const temperament = { ...state.player.psyche.temperament };
    playTo(state, 25);

    // Le tempérament ne bouge jamais.
    expect(state.player.psyche.temperament).toEqual(temperament);
    // Les traits acquis, eux, ont évolué.
    const changed = (Object.keys(born) as (keyof typeof born)[])
      .filter((k) => Math.abs(state.player.traits[k] - born[k]) > 2);
    expect(changed.length).toBeGreaterThan(2);
  });

  it('respecte les choix explicites de la création', () => {
    const state = createNewLife({
      seed: 12,
      countryId: 'fr',
      draft: {
        presetId: 'ruralModest',
        neighborhoodId: 'village',
        zone: 'zone rurale',
        housingType: 'ferme',
        tenure: 'propriétaire',
        anomalyExplanation: 'La ferme vient de la famille depuis quatre générations.',
      },
    });
    const o = state.player.origin;
    expect(o.countryId).toBe('fr');
    expect(o.neighborhood.archetypeId).toBe('village');
    expect(o.neighborhood.zone).toBe('zone rurale');
    expect(o.housing.type).toBe('ferme');
    expect(o.housing.tenure).toBe('propriétaire');
    expect(o.anomalyExplanation).toContain('quatre générations');
    expect(state.timeline.some((e) => e.text.includes('quatre générations'))).toBe(true);
  });

  it('interroge les situations impossibles sans les interdire', () => {
    // Une famille sans moyens dans une propriété de prestige : le jeu
    // l'autorise, mais demande comment.
    const impossible = previewOrigin({
      presetId: 'projects',
      neighborhoodId: 'affluent',
      zone: 'quartier huppé',
      housingType: 'propriété de luxe',
      countryId: 'fr',
    }, 4242, 2026);
    const warnings = coherenceWarnings(impossible.origin, impossible.nationalIncome);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0].suggestions.length).toBeGreaterThan(1);

    // À l'inverse, une grande maison à la campagne n'a rien d'étonnant :
    // elle y coûte réellement moins cher qu'un deux-pièces en capitale.
    const ordinary = previewOrigin({
      presetId: 'ruralModest',
      neighborhoodId: 'village',
      zone: 'zone rurale',
      housingType: 'maison',
      countryId: 'fr',
    }, 4242, 2026);
    expect(coherenceWarnings(ordinary.origin, ordinary.nationalIncome)).toEqual([]);
  });

  it('applique les réglages fins de la création jusque dans la partie', () => {
    // L'écran de création propose des curseurs par chemin de champ. S'ils ne
    // faisaient que décorer le brouillon, la promesse serait fausse : on
    // vérifie donc qu'ils traversent la génération *et* qu'ils changent ce
    // que le moteur en fait.
    const strict = createNewLife({
      seed: 909,
      draft: { overrides: { 'values.school': 96, 'atmosphere.conflict': 8 } },
    });
    const loose = createNewLife({
      seed: 909,
      draft: { overrides: { 'values.school': 4, 'atmosphere.conflict': 88 } },
    });

    expect(strict.player.origin.values.school).toBe(96);
    expect(loose.player.origin.values.school).toBe(4);
    // Et la conséquence : les études pèsent réellement sur la scolarité.
    expect(getEducationContext(strict).gradeBonus)
      .toBeGreaterThan(getEducationContext(loose).gradeBonus);
  });

  it('montre à la création la même exposition que celle de la partie', () => {
    // L'aperçu « ce que ce départ met à sa portée » doit être calculé par le
    // moteur, pas approximé pour l'affichage : à environnement égal, il donne
    // exactement les mêmes signaux.
    const state = createNewLife({ seed: 2024 });
    const o = state.player.origin;
    const preview = originSignals(o, { age: state.player.age, hasPet: state.player.pets.length > 0 });
    const real = exposureSignals(state);
    for (const key of Object.keys(preview)) {
      // Seuls les signaux venant de l'entourage s'ajoutent en cours de partie.
      if (key.startsWith('parentMusicien') || key.startsWith('parentBénévole')) continue;
      expect(real[key], key).toBeCloseTo(preview[key], 10);
    }
  });

  it('donne au tempérament choisi la valeur demandée, sans rejouer le reste', () => {
    // Bouger un curseur ne doit pas re-tirer les onze autres axes : sinon
    // régler un tempérament devient impossible.
    const base = previewOrigin({}, 77, 2026).psyche.temperament;
    const pinned = previewOrigin({ temperament: { curiosity: 91 } }, 77, 2026).psyche.temperament;

    expect(pinned.curiosity).toBe(91);
    expect(pinned.sociability).toBe(base.sociability);
    expect(pinned.persistence).toBe(base.persistence);
    expect(pinned.energy).toBe(base.energy);
  });

  it('garde une population de dix mille vies cohérente', { timeout: 120_000 }, () => {
    // Test de masse volontairement léger (naissance seule) : il vérifie que
    // la génération ne produit jamais d'environnement absurde, sur un
    // échantillon assez grand pour attraper les cas rares.
    const seen = { housing: new Set<string>(), zones: new Set<string>(), presets: new Set<string>() };
    for (let i = 0; i < 10000; i++) {
      const state = createNewLife({ seed: i * 7919 + 3 });
      const o = state.player.origin;
      expect(o.housing.areaM2).toBeGreaterThan(0);
      expect(o.housing.occupants).toBeGreaterThanOrEqual(2);
      expect(o.parents.length).toBeGreaterThan(0);
      expect(Number.isFinite(o.finance.disposableIncome)).toBe(true);
      expect(o.finance.financialStress).toBeGreaterThanOrEqual(0);
      expect(o.finance.financialStress).toBeLessThanOrEqual(100);
      seen.housing.add(o.housing.type);
      seen.zones.add(o.neighborhood.zone);
      seen.presets.add(state.player.flags.preset as string);
    }
    // Sur dix mille naissances, la variété doit être réelle.
    expect(seen.housing.size).toBeGreaterThan(5);
    expect(seen.zones.size).toBeGreaterThan(5);
    expect(seen.presets.size).toBe(ORIGIN_PRESETS.length);
  });
});
