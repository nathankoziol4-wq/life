/**
 * Le seul endroit où une statistique du joueur monte.
 *
 * La mesure a montré deux statistiques mortes : à quarante ans, l'intelligence
 * moyenne était de 94,7 et le karma de 99,9 — plus aucune ne distinguait qui
 * que ce soit. La cause n'était pas une formule mais leur nombre : sept
 * endroits différents ajoutaient de l'intelligence, chacun avec ses règles ou
 * sans règle du tout, et le catalogue d'événements à lui seul donnait +358
 * contre −9.
 *
 * Corriger un site sur sept ne sert à rien : il suffit d'un canal oublié pour
 * que tout reparte vers cent. Ce fichier existe donc pour qu'il n'y ait plus
 * qu'un chemin.
 *
 * Trois régimes, et ils disent trois choses différentes :
 *
 * - **`intelligence`** vise le plafond propre à la personne. Ce plafond n'est
 *   pas cent : c'est ce que son héritage, le capital culturel de son foyer et
 *   son goût de l'étude lui permettent d'atteindre. Au-dessus, plus rien.
 * - **`karma`** a des rendements décroissants aux deux bouts. Un bon geste de
 *   plus ne rachète pas grand-chose quand on est déjà irréprochable ; un écart
 *   de plus ne noircit pas beaucoup quelqu'un de déjà noir.
 * - **le reste** passe inchangé. La mesure montre que les autres
 *   statistiques ne dérivent pas — la forme, l'allure, la santé et le moral
 *   déclinent d'eux-mêmes avec l'âge — et les « corriger par symétrie »
 *   reviendrait à créer un problème pour faire joli.
 */

import { clampStat, gainStat, toward } from '../engine/rng.ts';
import { cognitiveCeiling } from '../engine/probability.ts';
import type { GameState, StatKey } from '../engine/types.ts';

/**
 * Le plafond cognitif du personnage.
 *
 * Lu par tous les systèmes qui font progresser l'intelligence : l'école, les
 * rencontres, les activités, les événements, la détention. Ils visent tous le
 * même, sinon le plafond n'en serait pas un.
 */
export function cognitiveCeilingOf(state: GameState): number {
  const p = state.player;
  return cognitiveCeiling({
    potential: p.genetics.cognitivePotential,
    culturalCapital: p.origin.capitals.cultural,
    studiousness: p.traits.studiousness,
  });
}

/**
 * Statistiques où l'accumulation ralentit près du maximum.
 *
 * L'intelligence n'y figure pas : elle a mieux qu'un ralentissement, elle a
 * un plafond.
 */
const DIMINISHING: StatKey[] = ['fitness', 'looks', 'health', 'happiness'];

/**
 * Applique une variation à une statistique du joueur.
 *
 * Les baisses passent toujours telles quelles : on peut tout perdre, on ne
 * peut pas tout gagner. C'est volontaire et c'est ce qui rend une vie
 * fragile.
 */
export function shiftStat(state: GameState, key: StatKey, delta: number): void {
  const p = state.player;
  if (delta === 0) return;

  if (key === 'intelligence') {
    p.stats.intelligence = delta > 0
      ? toward(p.stats.intelligence, cognitiveCeilingOf(state), delta)
      : clampStat(p.stats.intelligence + delta);
    return;
  }

  if (key === 'karma') {
    // La marge restante du côté où l'on pousse, symétriquement.
    const room = delta > 0 ? (100 - p.stats.karma) / 100 : p.stats.karma / 100;
    p.stats.karma = clampStat(p.stats.karma + delta * Math.pow(room, 0.85));
    return;
  }

  if (delta > 0 && DIMINISHING.includes(key)) {
    p.stats[key] = gainStat(p.stats[key], delta);
    return;
  }
  p.stats[key] = clampStat(p.stats[key] + delta);
}

/** Applique un ensemble de variations d'un coup. */
export function shiftStats(
  state: GameState,
  deltas: Partial<Record<StatKey, number>>,
  scale = 1,
): void {
  for (const [key, value] of Object.entries(deltas)) {
    shiftStat(state, key as StatKey, (value as number) * scale);
  }
}
