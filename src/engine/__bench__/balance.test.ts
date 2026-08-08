/**
 * Tests d'équilibrage (§28).
 *
 * On simule des centaines de vies pilotées par un joueur automatique
 * raisonnable, puis on vérifie que les grandes distributions restent
 * plausibles. Ces bornes sont larges à dessein : elles détectent les
 * dérives de conception (spirale de dettes, promotions automatiques,
 * immortalité) sans casser au moindre ajustement de contenu.
 */

import { describe, expect, it } from 'vitest';
import { autoplayLife } from './autoplay.ts';

const N = 200;

interface Sample {
  ages: number[];
  worths: number[];
  married: number;
  children: number;
  degrees: number;
  properties: number;
  bankruptcies: number;
  topTier: number;
}

function collect(): Sample {
  const s: Sample = { ages: [], worths: [], married: 0, children: 0, degrees: 0, properties: 0, bankruptcies: 0, topTier: 0 };
  for (let i = 0; i < N; i++) {
    const st = autoplayLife(i * 7919 + 3);
    s.ages.push(st.player.age);
    s.worths.push(Number(st.player.flags.finalNetWorth ?? 0));
    if (Object.values(st.npcs).some((p) => p.relation === 'spouse')) s.married += 1;
    s.children += Object.values(st.npcs).filter((p) => p.relation === 'son' || p.relation === 'daughter').length;
    s.degrees += st.player.education.degrees.length;
    s.properties += st.player.properties.length;
    s.bankruptcies += Number(st.player.flags.bankruptcies ?? 0);
    if (Number(st.player.flags.finalNetWorth ?? 0) > 10_000_000) s.topTier += 1;
  }
  s.ages.sort((a, b) => a - b);
  s.worths.sort((a, b) => a - b);
  return s;
}

const q = (arr: number[], p: number) => arr[Math.min(arr.length - 1, Math.floor(arr.length * p))];

describe('équilibrage global', () => {
  const s = collect();

  it('produit une distribution d’âge au décès réaliste', () => {
    const mean = s.ages.reduce((a, b) => a + b, 0) / N;
    console.log(
      `âge — moyenne ${mean.toFixed(1)} | p10 ${q(s.ages, 0.1)} | médiane ${q(s.ages, 0.5)} | p90 ${q(s.ages, 0.9)} | max ${s.ages.at(-1)}`,
    );
    expect(mean).toBeGreaterThan(65);
    expect(mean).toBeLessThan(88);
    // Une minorité doit mourir jeune, et une minorité atteindre un grand âge.
    expect(q(s.ages, 0.1)).toBeLessThan(72);
    expect(s.ages.at(-1)!).toBeGreaterThan(90);
    expect(s.ages.at(-1)!).toBeLessThan(120);
  });

  it('ne distribue pas la fortune gratuitement', () => {
    console.log(
      `patrimoine — médiane ${q(s.worths, 0.5).toLocaleString('fr-FR')} | p90 ${q(s.worths, 0.9).toLocaleString('fr-FR')} | max ${s.worths.at(-1)?.toLocaleString('fr-FR')}`,
    );
    // Une carrière appliquée doit payer…
    expect(q(s.worths, 0.5)).toBeGreaterThan(10_000);
    // …sans que la fortune soit la norme.
    expect(q(s.worths, 0.5)).toBeLessThan(1_500_000);
    expect(s.topTier / N).toBeLessThan(0.15);
  });

  it('garde la faillite exceptionnelle mais possible', () => {
    console.log(`faillites par vie ${(s.bankruptcies / N).toFixed(2)} | biens ${(s.properties / N).toFixed(2)} | enfants ${(s.children / N).toFixed(2)} | mariés ${((s.married / N) * 100).toFixed(0)} %`);
    expect(s.bankruptcies / N).toBeLessThan(0.6);
  });

  it('permet une vie de famille et des études', () => {
    expect(s.married / N).toBeGreaterThan(0.2);
    expect(s.children / N).toBeGreaterThan(0.4);
    expect(s.degrees / N).toBeGreaterThan(1);
    expect(s.properties / N).toBeGreaterThan(0.3);
  });
});
