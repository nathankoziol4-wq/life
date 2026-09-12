/**
 * Le palmarès : ce qu'aucune de tes vies n'avait fait avant celle-ci.
 *
 * **Ce que ce fichier existe pour régler.** Le catalogue portait cet aveu :
 * « Système de succès — aucun succès, aucun palier, aucune trace d'une vie
 * remarquable ». Il a été relu deux fois avant d'être traité, parce que le jeu
 * avait déjà deux systèmes voisins et qu'un troisième aurait fait doublon :
 *
 * - les **défis** (`data/challenges.ts`) se prennent *à l'avance* : on décide
 *   au départ ce qu'on veut faire de la vie, et le jeu suit ;
 * - les **titres** (`data/ribbons.ts`) se décernent *à la mort* : quarante
 *   noms qui relisent la vie entière et en disent la forme.
 *
 * Entre les deux il manquait exactement une chose : **rien ne remarque, au
 * moment où cela arrive, qu'une vie vient de dépasser toutes les
 * précédentes.** Un joueur qui n'avait rien juré et qui n'est pas encore mort
 * ne recevait jamais rien.
 *
 * **Un record n'est pas un palier fixe**, et c'est ce qui le distingue d'une
 * liste de succès : il ne se compare pas à un seuil décidé par le jeu mais à
 * ce que le joueur a fait de mieux jusque-là. La première vie les établit
 * tous, puisqu'il n'y a rien à battre ; les suivantes n'en battent que
 * quelques-uns. C'est une échelle, pas une case à cocher, et un test le
 * mesure sur des centaines de vies.
 *
 * **Et cela ne donne aucun avantage.** Comme le cabinet des défis — dont un
 * test vérifie déjà qu'il n'accorde rien —, un record ne change ni les
 * statistiques, ni les prix, ni les chances. Il change ce qu'on vise.
 */

import type { GameState } from '../engine/types.ts';

export interface RecordDef {
  id: string;
  label: string;
  emoji: string;
  /** Ce que ça veut dire, pour le joueur. */
  note: string;
  /** Comment l'écrire : « 42 ans », « 3 pays ». Vide pour une somme d'argent. */
  unit: string;
  /** Vrai quand c'est le **plus petit** qui gagne. */
  lower?: boolean;
  /**
   * La mesure, lue sur la partie en cours.
   *
   * Rend `null` quand la mesure n'a pas de sens pour cette vie-là — quelqu'un
   * qui n'a jamais travaillé n'a pas un salaire de zéro, il n'en a pas. Les
   * compter comme zéro écraserait le record de quelqu'un d'autre, et c'est
   * précisément ce qu'un palmarès ne doit pas faire.
   */
  read: (state: GameState) => number | null;
}

/**
 * Dix-sept mesures.
 *
 * Elles sont choisies pour **traverser** les systèmes plutôt que pour les
 * résumer : le plus jeune diplômé demande l'école et la discipline, la lignée
 * demande l'héritage, les biens possédés demandent la finance et le
 * patrimoine. Une mesure qui ne lirait qu'une statistique serait un compteur,
 * pas un record — c'est déjà la règle que les titres se donnent.
 */
export const RECORDS: RecordDef[] = [
  {
    id: 'age', label: 'La vie la plus longue', emoji: '🕰️',
    note: 'L’âge atteint.', unit: 'ans',
    read: (s) => s.player.age || null,
  },
  {
    id: 'fortune', label: 'La plus grosse fortune', emoji: '💰',
    note: 'Ce qu’on a eu en banque, au plus haut.', unit: '',
    read: (s) => (s.player.money > 0 ? Math.round(s.player.money) : null),
  },
  {
    id: 'salaire', label: 'Le plus haut salaire', emoji: '📈',
    note: 'Ce qu’un employeur a payé en une année.', unit: '',
    read: (s) => (s.player.job ? Math.round(s.player.job.salary) : null),
  },
  {
    id: 'metiers', label: 'Le plus de métiers exercés', emoji: '🧰',
    note: 'Combien de postes différents dans une seule vie.', unit: 'métiers',
    read: (s) => s.player.careerHistory.length || null,
  },
  {
    id: 'pays', label: 'Le plus de pays habités', emoji: '🌍',
    note: 'Ceux où l’on a vécu, pas ceux qu’on a visités.', unit: 'pays',
    read: (s) => s.player.livedCountries.length || null,
  },
  {
    id: 'lieux', label: 'Le plus d’endroits vus', emoji: '🧳',
    note: 'Les lieux traversés au moins une fois.', unit: 'lieux',
    read: (s) => s.player.seenPlaces.length || null,
  },
  {
    id: 'abonnes', label: 'La plus grande audience', emoji: '📣',
    note: 'Le nombre d’abonnés au plus haut.', unit: 'abonnés',
    read: (s) => s.player.followers || null,
  },
  {
    id: 'renommee', label: 'La plus grande notoriété', emoji: '⭐',
    note: 'Ce que le monde savait de toi, au mieux.', unit: '/ 100',
    read: (s) => Math.round(s.player.fame.peak) || null,
  },
  {
    id: 'enfants', label: 'La plus grande famille', emoji: '👨‍👩‍👧‍👦',
    note: 'Les enfants qu’on a eus.', unit: 'enfants',
    read: (s) => Object.values(s.npcs)
      .filter((p) => p.relation === 'son' || p.relation === 'daughter').length || null,
  },
  {
    id: 'proches', label: 'Le plus grand entourage', emoji: '🫂',
    note: 'Les gens vivants qui comptent vraiment.', unit: 'proches',
    read: (s) => Object.values(s.npcs)
      .filter((p) => p.alive && !p.petSpecies && p.relationship >= 60).length || null,
  },
  {
    id: 'diplome', label: 'Le plus jeune diplômé', emoji: '🎓',
    note: 'L’âge du premier diplôme. Ici, le plus petit gagne.', unit: 'ans',
    lower: true,
    read: (s) => {
      const first = s.player.education.degrees[0];
      if (!first) return null;
      return Math.max(1, first.year - (s.year - s.player.age));
    },
  },
  {
    id: 'moyenne', label: 'La meilleure moyenne', emoji: '📚',
    note: 'La note tenue à l’école.', unit: '/ 20',
    read: (s) => (s.player.education.grades > 0 ? Math.round(s.player.education.grades) : null),
  },
  {
    id: 'maitrise', label: 'Le plus de savoir-faire maîtrisés', emoji: '🛠️',
    note: 'Les compétences portées au plus haut rang.', unit: 'savoir-faire',
    read: (s) => Object.values(s.player.skills).filter((k) => k.level >= 80).length || null,
  },
  {
    id: 'langues', label: 'Le plus de langues parlées', emoji: '🗣️',
    note: 'Celles qu’on parle assez pour travailler avec.', unit: 'langues',
    read: (s) => Object.values(s.player.languages).filter((l) => l >= 55).length || null,
  },
  {
    id: 'biens', label: 'Le plus de biens possédés', emoji: '🏠',
    note: 'Logements, véhicules et objets de valeur réunis.', unit: 'biens',
    read: (s) => (s.player.properties.length + s.player.vehicles.length
      + s.player.valuables.length) || null,
  },
  {
    id: 'peine', label: 'La plus lourde condamnation', emoji: '🔒',
    note: 'La peine la plus longue prononcée contre toi.', unit: 'ans',
    read: (s) => {
      const worst = s.player.criminalRecord.convictions
        .reduce((n, c) => Math.max(n, c.sentenceYears), 0);
      return worst || null;
    },
  },
  {
    id: 'defis', label: 'Le plus de défis tenus', emoji: '🏅',
    note: 'Ceux qu’on s’était fixés et qu’on a menés au bout.', unit: 'défis',
    read: (s) => s.player.challenges.filter((c) => c.doneYear !== null).length || null,
  },
];

export function getRecord(id: string): RecordDef | undefined {
  return RECORDS.find((r) => r.id === id);
}

/** Ce que vaut une mesure, telle qu'elle s'écrit. */
export function show(record: RecordDef, value: number): string {
  const n = Math.round(value).toLocaleString('fr-FR');
  return record.unit ? `${n} ${record.unit}` : n;
}
