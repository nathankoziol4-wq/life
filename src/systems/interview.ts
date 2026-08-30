/**
 * Passer l'entretien soi-même.
 *
 * `applyToJob` calculait déjà très bien ses chances — diplôme, expérience,
 * intelligence, allure, réputation, casier, conjoncture, marché local, et
 * jusqu'au savoir-faire acquis hors diplôme — puis lançait le dé. Le message
 * disait « entretien manqué » sans qu'aucun entretien ait eu lieu. C'est la
 * chose qu'un joueur fait le plus souvent dans une vie, et c'était la seule
 * où il n'avait rien à décider.
 *
 * **Ce qui se joue est une lecture, pas un examen.** L'employeur tient à deux
 * registres sur quatre et ne le dit pas ; la même réponse ouvre chez l'un et
 * ferme chez l'autre. Le personnage aide sans jouer à la place du joueur : la
 * parole, quand elle est assez sûre, laisse deviner ce que l'employeur
 * cherche — exactement comme elle laisse lire une réaction en soirée.
 *
 * **Et l'entretien ne remplace pas le calcul, il le module.** Un dossier
 * faible bien défendu peut passer devant un dossier moyen mal défendu, et
 * c'est tout ce qu'on lui demande. S'il décidait seul, le diplôme et
 * l'expérience ne voudraient plus rien dire — le défaut inverse, et pas
 * meilleur.
 */

import type { GameState, JobOffer } from '../engine/types.ts';
import {
  QUESTIONS, REGISTER_LABEL, type Question, type Register,
} from '../data/interviews.ts';
import { getJob } from '../data/jobs.ts';
import { levelOf } from './skills.ts';

/** Nombre de questions par entretien. */
export const ROUNDS = 4;

/** À partir de quelle aisance on devine ce que l'employeur cherche. */
export const READS_AT = 35;

const REGISTERS: Register[] = ['métier', 'tenue', 'élan', 'entente'];

/**
 * Un tirage stable, dérivé de l'offre et de l'année.
 *
 * Le même que celui des soirées et des nouvelles du marché, et pour la même
 * raison : rouvrir la feuille ne doit pas rebattre les cartes, sinon il
 * suffirait de sortir et de rentrer jusqu'à tomber sur des questions faciles.
 * Et rien n'est pris au hasard de la partie, dont la suite resterait décalée.
 */
function draw(seed: number, salt: number): number {
  let h = (Math.abs(Math.round(seed)) ^ (salt * 0x9e37_79b9)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85eb_ca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2_ae35) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4_294_967_296;
}

function keyOf(state: GameState, offer: JobOffer): number {
  let n = state.year * 7 + offer.level * 101 + offer.salary;
  for (let i = 0; i < offer.id.length; i++) n = (n * 31 + offer.id.charCodeAt(i)) | 0;
  return n;
}

/**
 * Ce à quoi cet employeur tient : deux registres sur quatre.
 *
 * Deux, et pas un : avec un seul, une fois deviné, tout l'entretien se
 * répondrait de la même façon. Avec deux, il reste à choisir lequel servir à
 * chaque question, et parfois aucun des deux n'est proposé.
 */
export function wants(state: GameState, offer: JobOffer): Register[] {
  const key = keyOf(state, offer);
  const first = REGISTERS[Math.floor(draw(key, 11) * REGISTERS.length) % REGISTERS.length]!;
  const rest = REGISTERS.filter((r) => r !== first);
  const second = rest[Math.floor(draw(key, 29) * rest.length) % rest.length]!;
  return [first, second];
}

/** Les questions de cet entretien-là. */
export function interviewFor(state: GameState, offer: JobOffer): Question[] {
  const key = keyOf(state, offer);
  const out: Question[] = [];
  const used = new Set<string>();
  for (let i = 0; out.length < ROUNDS && i < QUESTIONS.length * 4; i++) {
    const q = QUESTIONS[Math.floor(draw(key, 41 + i * 13) * QUESTIONS.length) % QUESTIONS.length]!;
    if (used.has(q.id)) continue;
    used.add(q.id);
    out.push(q);
  }
  return out;
}

/** L'aisance du personnage à sentir ce qu'on attend de lui. */
export function reading(state: GameState): number {
  return levelOf(state, 'parole');
}

export function readsRoom(state: GameState): boolean {
  return reading(state) >= READS_AT;
}

/**
 * Ce que le joueur peut deviner avant de commencer.
 *
 * Sous le seuil, une phrase et rien de plus : il reste à lire l'offre
 * elle-même, ce qui est une information et non une absence. Au-dessus, on
 * annonce **un** des deux registres — jamais les deux, sinon l'entretien
 * n'aurait plus de pari du tout.
 */
export function hint(state: GameState, offer: JobOffer): string {
  if (!readsRoom(state)) {
    return 'Tu ne sais pas ce qu’ils cherchent. À toi de le sentir.';
  }
  const [first] = wants(state, offer);
  return `Tu sens qu’ils tiennent à ${REGISTER_LABEL[first]} — et à autre chose.`;
}

/**
 * Ce que valent les réponses données.
 *
 * Une réponse qui touche un registre attendu compte pour un ; les autres pour
 * rien. On ne pénalise pas : se tromper de registre, c'est perdre l'occasion
 * de marquer, pas commettre une faute. Le prix de l'erreur est déjà là.
 */
export function fitOf(state: GameState, offer: JobOffer, picks: Register[]): number {
  const wanted = new Set(wants(state, offer));
  return picks.filter((p) => wanted.has(p)).length;
}

/**
 * Ce que l'entretien fait aux chances, en facteur.
 *
 * Les bornes sont le cœur du réglage. En bas, on divise par deux : un
 * entretien raté fait mal sans condamner un dossier excellent. En haut, on
 * multiplie par 1,6 : de quoi rattraper un dossier moyen, jamais de quoi
 * inventer un candidat. Entre les deux, chaque bonne réponse pèse autant.
 */
export function edgeOf(fit: number): number {
  const share = fit / ROUNDS;
  return 0.5 + share * 1.1;
}

/** Ce que l'entretien a donné, en une phrase. */
export function verdictOf(fit: number): string {
  if (fit >= ROUNDS) return 'Tout est tombé juste. Ils ont fini par sourire.';
  if (fit >= ROUNDS - 1) return 'Ça s’est bien passé. Un blanc, vite oublié.';
  if (fit >= ROUNDS / 2) return 'Correct. Ni mémorable, ni raté.';
  if (fit > 0) return 'Tu as senti que ça n’accrochait pas.';
  return 'Vous n’avez pas parlé de la même chose pendant vingt minutes.';
}

/**
 * Ce que le personnage répondrait tout seul.
 *
 * La porte « laisser faire », qui existe partout ailleurs dans ce jeu. Il
 * répond avec ce qu'il sait : plus il a de parole, plus souvent il tombe sur
 * un registre attendu — sans jamais atteindre la lecture d'un joueur qui a
 * compris. C'est ce qui fait qu'y aller soi-même vaut la peine.
 */
export function autoPicks(state: GameState, offer: JobOffer): Register[] {
  const wanted = wants(state, offer);
  const skill = reading(state);
  const key = keyOf(state, offer);
  return interviewFor(state, offer).map((q, i) => {
    // Au mieux deux fois sur trois : au-delà, personne n'aurait de raison de
    // passer l'entretien lui-même.
    const odds = 0.25 + (skill / 100) * 0.42;
    if (draw(key, 601 + i * 17) < odds) {
      const good = q.answers.find((a) => wanted.includes(a.appeals));
      if (good) return good.appeals;
    }
    const at = Math.floor(draw(key, 907 + i * 23) * q.answers.length) % q.answers.length;
    return q.answers[at]!.appeals;
  });
}

/** L'intitulé du poste, pour les titres de feuille. */
export function offerTitle(offer: JobOffer): string {
  return `${offer.title} · ${offer.employer}`;
}

/** L'emoji du métier visé, ou un pis-aller. */
export function offerEmoji(offer: JobOffer): string {
  return getJob(offer.jobId)?.emoji ?? '💼';
}
