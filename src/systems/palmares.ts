/**
 * Battre ses propres records, et l'apprendre au moment où ça arrive.
 *
 * **Ce que ce fichier règle.** Le catalogue reprochait au jeu de n'avoir
 * « aucune trace d'une vie remarquable ». C'était à moitié vrai : les défis
 * existent, mais il faut les jurer à l'avance ; les titres existent, mais ils
 * ne se lisent qu'à la mort. Entre les deux, **rien ne remarquait qu'une vie
 * venait de dépasser toutes les précédentes**, au moment où elle le faisait.
 *
 * **Le palmarès est la seule chose du jeu qui compare une vie aux autres.** Le
 * cabinet des défis garde ce qui a été fait ; le palmarès garde *combien*, et
 * par qui. Il vit au même endroit — à côté de la sauvegarde, puisqu'une
 * sauvegarde s'efface à chaque vie — et il obéit à la même règle : **il
 * n'accorde aucun avantage.** Il ne touche ni aux statistiques, ni aux prix,
 * ni aux chances. Il change ce qu'on vise, et rien d'autre.
 */

import type { Ctx } from '../engine/context.ts';
import type { GameState } from '../engine/types.ts';
import { RECORDS, getRecord, show, type RecordDef } from '../data/palmares.ts';
import { loadBests, saveBest } from '../engine/save.ts';

/** Une ligne du palmarès : ce que quelqu'un a fait de mieux, et qui. */
export interface Best {
  recordId: string;
  value: number;
  /** Qui l'a fait, et à quel âge. Un chiffre sans nom ne raconte rien. */
  who: string;
  age: number;
}

/** Est-ce que cette valeur bat celle-là ? */
export function beats(record: RecordDef, value: number, previous: number | undefined): boolean {
  if (previous === undefined) return true;
  return record.lower ? value < previous : value > previous;
}

/** Le palmarès complet, tel qu'il est rangé. */
export function bests(): Best[] {
  return loadBests();
}

export function bestOf(recordId: string): Best | undefined {
  return bests().find((b) => b.recordId === recordId);
}

/** Ce que la vie en cours vaut sur chaque mesure. */
export function currentValues(state: GameState): Map<string, number> {
  const out = new Map<string, number>();
  for (const record of RECORDS) {
    const value = record.read(state);
    if (value !== null && Number.isFinite(value)) out.set(record.id, value);
  }
  return out;
}

/**
 * Les records que cette vie détient en ce moment.
 *
 * Sert à l'écran : on veut voir ce qu'on tient et ce qu'il reste à prendre,
 * pas seulement ce qui vient d'être battu.
 */
export function heldNow(state: GameState): string[] {
  const now = currentValues(state);
  const held: string[] = [];
  for (const [id, value] of now) {
    const record = getRecord(id);
    if (!record) continue;
    const previous = bestOf(id);
    if (!previous || beats(record, value, previous.value)) held.push(id);
  }
  return held;
}

/**
 * Regarder, chaque année, si quelque chose vient d'être dépassé.
 *
 * **On range au moment où cela arrive, pas à la mort.** C'est tout le propos :
 * une vie qui bat le record de fortune à quarante ans doit l'apprendre à
 * quarante ans, et le garder même si elle finit ruinée. Attendre la fin
 * reviendrait à ne mesurer que des vies terminées, ce que les titres font
 * déjà.
 *
 * La première vie établit tous les records puisqu'il n'y a rien à battre : on
 * ne l'annonce donc pas, sauf pour les mesures qui demandent quelque chose.
 */
export function checkRecords(ctx: Ctx): string[] {
  const { state } = ctx;
  const p = state.player;
  if (!p.alive) return [];
  const broken: string[] = [];

  for (const [id, value] of currentValues(state)) {
    const record = getRecord(id);
    if (!record) continue;
    const previous = bestOf(id);
    if (!beats(record, value, previous?.value)) continue;

    saveBest({ recordId: id, value, who: `${p.firstName} ${p.lastName}`, age: p.age });
    broken.push(id);
    /*
     * On ne dit rien quand il n'y avait rien à battre : annoncer « record
     * battu » sur la première année de la première vie, dix-sept fois de
     * suite, ne dirait rien à personne et remplirait le journal de bruit.
     */
    if (previous) {
      ctx.log(
        'life',
        `${record.label} : ${show(record, value)}. Aucune de tes vies n’avait fait mieux.`,
        'good',
      );
    }
  }
  return broken;
}

export { RECORDS, getRecord, show };
