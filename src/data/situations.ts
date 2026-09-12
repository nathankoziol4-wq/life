/**
 * Les situations composées : des scènes qui se lient à quelqu'un de réel.
 *
 * **Ce que ce fichier existe pour régler.** Le catalogue porte deux aveux
 * voisins : « Banque d'événements — moins de deux cents événements écrits à la
 * main : l'architecture tient, le volume non » et « Génération procédurale —
 * aucun événement composé à la volée ». Mesuré sur quarante vies : cent
 * soixante-neuf événements écrits, **quatre-vingt-un distincts par vie**, et
 * **72,8 % de recouvrement entre deux vies**. Une vie épuise la moitié du
 * catalogue et rejoue chaque scène deux fois ; deux vies se ressemblent.
 *
 * **Ce qui suit n'est pas du texte tiré au sort.** Une situation composée
 * n'invente ni personne ni décor : elle prend une scène — on demande de
 * l'aide, on est en retard, on apprend quelque chose sur quelqu'un — et elle
 * la **lie à un vrai PNJ de la partie**, avec son vrai caractère.
 *
 * C'est là que se trouve la variété, et elle n'est pas cosmétique : **ce que
 * l'autre vaut sur le trait mis à l'épreuve décide de l'issue.** Demander de
 * l'argent à un frère généreux et à un frère qui compte ne donne pas la même
 * scène, ni le même résultat, ni la même ligne dans le journal.
 *
 * **Et l'on apprend quelque chose.** `dates.ts` couvre les traits d'un proche
 * et les fait découvrir en sortant avec lui. Une situation composée est
 * l'autre façon de les découvrir : la vie s'en charge. Sortir avec quelqu'un
 * est délibéré et coûte de l'argent ; une situation arrive, et l'on apprend
 * malgré soi. Les deux chemins mènent au même savoir, ce qui est le propos.
 */

import type { RelationKind, TimelineKind } from '../engine/types.ts';
import type { TraitId } from './dates.ts';

/** Ce qu'une issue fait, en plus de son texte. */
export interface SituationOutcome {
  text: string;
  tone: 'good' | 'bad' | 'neutral';
  /** Variations de statistiques du joueur. */
  happiness?: number;
  stress?: number;
  /** Variation d'argent, avant ajustement au pays. */
  money?: number;
  /** Variation de la relation avec l'autre. */
  rel?: number;
}

export interface SituationChoice {
  label: string;
  /**
   * Ce qui arrive selon ce que l'autre vaut **vraiment** sur le trait.
   *
   * Deux issues, pas un tirage : c'est le caractère de la personne en face
   * qui décide, et c'est ce qui distingue une scène composée d'un dé.
   */
  high: SituationOutcome;
  low: SituationOutcome;
}

export interface SituationDef {
  id: string;
  kind: TimelineKind;
  icon: string;
  /** Le trait que la scène met à l'épreuve, et qu'elle fait découvrir. */
  trait: TraitId;
  /** Qui peut tenir ce rôle. La scène ne se pose pas si personne ne peut. */
  actors: RelationKind[];
  from?: number;
  to?: number;
  /** Titre et corps. Mêmes balises que les événements écrits. */
  title: string;
  text: string;
  choices: SituationChoice[];
}

/**
 * Quatorze scènes.
 *
 * Elles ne cherchent pas à couvrir la vie entière — les événements écrits font
 * cela très bien. Elles cherchent le contraire : **des moments ordinaires que
 * seul le caractère de l'autre distingue.** Un service demandé, une promesse
 * qui tient ou ne tient pas, une soirée qui tourne. Ce sont exactement les
 * scènes qu'il serait absurde d'écrire à la main, puisqu'il faudrait les
 * réécrire pour chaque proche.
 */
export const SITUATIONS: SituationDef[] = [
  {
    id: 'pret', kind: 'money', icon: '💸', trait: 'generosity',
    actors: ['mother', 'father', 'brother', 'sister', 'bestFriend', 'friend'],
    from: 18,
    title: 'Le mois est trop long',
    text: 'Il te manque de quoi finir le mois. {name} est la seule personne à qui tu peux demander sans que ça fasse toute une histoire — enfin, tu crois.',
    choices: [
      {
        label: 'Demander franchement',
        high: {
          text: '{name} ne pose aucune question et vire la somme le soir même. « Tu me rendras quand tu pourras. »',
          tone: 'good', money: 900, rel: 4, happiness: 4,
        },
        low: {
          text: '{name} explique longuement que ce n’est pas contre toi, puis propose la moitié, à rendre le mois prochain. Vous n’en reparlerez plus jamais de la même façon.',
          tone: 'bad', money: 400, rel: -9, stress: 8,
        },
      },
      {
        label: 'Tourner autour du pot',
        high: {
          text: '{name} comprend avant que tu aies fini ta phrase et te coupe : « Combien ? »',
          tone: 'good', money: 700, rel: 3,
        },
        low: {
          text: '{name} fait semblant de ne pas comprendre jusqu’à ce que tu changes de sujet. Vous parlez du temps qu’il fait.',
          tone: 'bad', happiness: -5, rel: -2,
        },
      },
      {
        label: 'Ne rien demander',
        high: {
          text: 'Tu te débrouilles. Deux semaines plus tard, {name} te demande pourquoi tu n’as rien dit.',
          tone: 'neutral', stress: 8, rel: 2,
        },
        low: {
          text: 'Tu te débrouilles. Personne ne remarque rien — et c’est peut-être ce que tu pouvais faire de mieux.',
          tone: 'neutral', stress: 6,
        },
      },
    ],
  },
  {
    id: 'confidence', kind: 'family', icon: '🤐', trait: 'loyalty',
    actors: ['bestFriend', 'friend', 'brother', 'sister', 'coworker', 'classmate'],
    from: 12,
    title: 'Ce que tu as dit à {name}',
    text: 'Tu as raconté à {name} quelque chose que tu ne racontes pas. Depuis, deux personnes t’en ont parlé à demi-mot.',
    choices: [
      {
        label: 'Lui demander en face',
        high: {
          text: '{name} tombe des nues, et va lui-même trouver celui qui a parlé. Ce n’était pas {lui}.',
          tone: 'good', rel: 6, happiness: 3,
        },
        low: {
          text: '{name} admet l’avoir dit « à une seule personne », comme si le nombre changeait quelque chose.',
          tone: 'bad', rel: -12, happiness: -8,
        },
      },
      {
        label: 'Laisser courir',
        high: {
          text: 'Tu n’en parles pas. La rumeur s’éteint d’elle-même — et tu apprendras plus tard que {name} y était pour quelque chose.',
          tone: 'good', rel: 3,
        },
        low: {
          text: 'Tu n’en parles pas. La rumeur, elle, continue de circuler, et tu sais maintenant par où.',
          tone: 'bad', rel: -6, stress: 6,
        },
      },
    ],
  },
  {
    id: 'retard', kind: 'family', icon: '⏰', trait: 'temper',
    actors: ['partner', 'spouse', 'bestFriend', 'friend', 'boss'],
    from: 14,
    title: 'Une heure de retard',
    text: 'Tu arrives avec une heure de retard, sans avoir prévenu. {name} attend depuis une heure.',
    choices: [
      {
        label: 'S’excuser platement',
        high: {
          text: '{name} explose d’abord, puis s’excuse de s’être emporté{e}. La soirée met du temps à repartir.',
          tone: 'bad', happiness: -5, rel: -4, stress: 8,
        },
        low: {
          text: '{name} hausse les épaules, commande autre chose et reprend la conversation où elle en était.',
          tone: 'neutral', rel: -1,
        },
      },
      {
        label: 'Trouver une bonne raison',
        high: {
          text: 'Ta raison n’était pas assez bonne. {name} te le fait savoir, longuement, et devant du monde.',
          tone: 'bad', happiness: -8, rel: -7,
        },
        low: {
          text: '{name} n’a pas l’air d’y croire, mais n’insiste pas et enchaîne. Tu t’en sors mieux que tu ne le mérites.',
          tone: 'good', happiness: 4, rel: 1,
        },
      },
    ],
  },
  {
    id: 'coupdefil', kind: 'family', icon: '📞', trait: 'warmth',
    actors: ['mother', 'father', 'bestFriend', 'brother', 'sister', 'partner', 'spouse'],
    from: 14,
    title: 'Onze heures du soir',
    text: 'La journée a été mauvaise, et tu regardes le nom de {name} sur ton téléphone depuis dix minutes.',
    choices: [
      {
        label: 'Appeler',
        high: {
          text: '{name} décroche à la deuxième sonnerie et ne raccroche pas avant une heure. Tu ne sais plus très bien de quoi vous avez parlé.',
          tone: 'good', happiness: 10, stress: -12, rel: 6,
        },
        low: {
          text: '{name} décroche, répond correctement, et trouve une raison de raccrocher au bout de six minutes. Tu te sens plus seul{e} qu’avant d’appeler.',
          tone: 'bad', happiness: -9, stress: 6, rel: -2,
        },
      },
      {
        label: 'Reposer le téléphone',
        high: {
          text: 'Tu n’appelles pas. {name} appelle le lendemain matin, sans raison particulière.',
          tone: 'good', happiness: 5, rel: 3,
        },
        low: {
          text: 'Tu n’appelles pas. La nuit passe, et le lendemain va un peu mieux, comme souvent.',
          tone: 'neutral', happiness: -3, stress: 3,
        },
      },
    ],
  },
  {
    id: 'poste', kind: 'work', icon: '🪜', trait: 'ambition',
    actors: ['boss', 'coworker', 'friend', 'bestFriend'],
    from: 20,
    title: 'Un poste qui se libère',
    text: 'Quelque chose se libère, et {name} est au courant avant tout le monde.',
    choices: [
      {
        label: 'Demander à {name} d’en parler pour toi',
        high: {
          text: '{name} en parle — après avoir posé sa propre candidature. Tu l’apprends le jour des entretiens.',
          tone: 'bad', rel: -8, happiness: -6,
        },
        low: {
          text: '{name} n’en voulait pas et pousse ton nom sans arrière-pensée. Ça n’aboutit pas, mais tu sais que c’était sincère.',
          tone: 'neutral', rel: 5,
        },
      },
      {
        label: 'Y aller sans le dire',
        high: {
          text: 'Tu postules seul{e}. {name} le découvre et te trouve un peu discret{e} — venant de {lui}, c’est presque un compliment.',
          tone: 'neutral', rel: -2, happiness: 3,
        },
        low: {
          text: 'Tu postules seul{e}. {name} s’en fiche complètement, et te souhaite bonne chance sans y penser.',
          tone: 'neutral', happiness: 2,
        },
      },
    ],
  },
  {
    id: 'demenagement', kind: 'family', icon: '📦', trait: 'generosity',
    actors: ['bestFriend', 'friend', 'brother', 'sister', 'coworker', 'partner'],
    from: 18,
    title: 'Un samedi et six étages',
    text: 'Tu déménages. Il faut des bras, un samedi, et personne n’aime ça.',
    choices: [
      {
        label: 'Demander à {name}',
        high: {
          text: '{name} arrive à huit heures avec du café et repart à vingt heures. On ne parle pas de ce genre de dette.',
          tone: 'good', rel: 8, happiness: 6, stress: -5,
        },
        low: {
          text: '{name} passe en fin d’après-midi, porte deux cartons et doit filer. Tu finis à la nuit tombée.',
          tone: 'bad', rel: -3, stress: 10,
        },
      },
      {
        label: 'Payer des déménageurs',
        high: {
          text: '{name} vient quand même, vexé{e} de ne pas avoir été appelé{e}, et reste jusqu’au bout.',
          tone: 'good', money: -600, rel: 4,
        },
        low: {
          text: 'Personne ne vient, et c’est très bien ainsi. La facture, elle, reste.',
          tone: 'neutral', money: -600,
        },
      },
    ],
  },
  {
    id: 'secret', kind: 'life', icon: '🔍', trait: 'loyalty',
    actors: ['coworker', 'classmate', 'ex', 'acquaintance', 'friend'],
    from: 16,
    title: '{name} sait quelque chose',
    text: 'Il y a une chose de ta vie que tu préférerais garder pour toi, et {name} vient de comprendre laquelle.',
    choices: [
      {
        label: 'Prendre les devants',
        high: {
          text: 'Tu en parles le premier. {name} hausse les épaules : « Et alors ? » Tu as passé trois semaines à t’inquiéter de rien.',
          tone: 'neutral', stress: -4, rel: 2,
        },
        low: {
          text: 'Tu en parles le premier, ce qui donne à {name} une confirmation qu’{il} n’avait pas. L’air de rien.',
          tone: 'bad', stress: 10, rel: -4,
        },
      },
      {
        label: 'Faire comme si de rien n’était',
        high: {
          text: 'Rien ne se passe. Des mois plus tard, tu comprendras que {name} aurait pu s’en servir et ne l’a pas fait.',
          tone: 'good', rel: 4, happiness: 4, stress: -4,
        },
        low: {
          text: 'Trois semaines plus tard, la chose revient à tes oreilles par un chemin qui ne trompe personne.',
          tone: 'bad', stress: 12, happiness: -7, rel: -9,
        },
      },
    ],
  },
  {
    id: 'repas', kind: 'family', icon: '🍽️', trait: 'temper',
    actors: ['mother', 'father', 'brother', 'sister', 'spouse', 'stepmother', 'stepfather'],
    from: 16,
    title: 'La conversation qu’il ne fallait pas lancer',
    text: 'À table, quelqu’un lance un sujet qu’on évite d’habitude. {name} pose sa fourchette.',
    choices: [
      {
        label: 'Dire ce que tu penses',
        high: {
          text: 'Le repas se termine debout, et deux personnes ne se parlent plus. Tu n’avais pourtant pas tort.',
          tone: 'bad', happiness: -8, stress: 12, rel: -8,
        },
        low: {
          text: '{name} t’écoute jusqu’au bout, réfléchit, et dit qu’{il} n’avait pas vu les choses comme ça.',
          tone: 'good', happiness: 5, rel: 5,
        },
      },
      {
        label: 'Changer de sujet',
        high: {
          text: 'Trop tard : {name} a déjà commencé. Tu passes le reste du repas à regarder ton assiette.',
          tone: 'bad', stress: 9, happiness: -4,
        },
        low: {
          text: 'Le sujet retombe aussitôt. On parle d’autre chose et la soirée se termine bien.',
          tone: 'neutral', happiness: 2,
        },
      },
    ],
  },
  {
    id: 'succes', kind: 'work', icon: '🏅', trait: 'ambition',
    actors: ['coworker', 'friend', 'bestFriend', 'brother', 'sister', 'classmate'],
    from: 16,
    title: 'Tu as eu ce que {name} voulait',
    text: 'Vous visiez la même chose. Tu l’as eue.',
    choices: [
      {
        label: 'En parler à {name} le premier',
        high: {
          text: '{name} te félicite avec un temps de retard, et met des mois à en reparler normalement.',
          tone: 'neutral', rel: -6, happiness: 3,
        },
        low: {
          text: '{name} est franchement content{e} pour toi, et un peu soulagé{e} de ne pas avoir eu à s’en occuper.',
          tone: 'good', rel: 5, happiness: 6,
        },
      },
      {
        label: 'Laisser {le} l’apprendre autrement',
        high: {
          text: '{name} l’apprend par un tiers, et te le fait payer pendant un bon moment.',
          tone: 'bad', rel: -11, stress: 7,
        },
        low: {
          text: '{name} l’apprend par un tiers et t’envoie un message le soir même. Ça n’allait pas plus loin que ça.',
          tone: 'neutral', rel: -1,
        },
      },
      {
        label: 'Lui proposer d’en partager quelque chose',
        high: {
          text: '{name} accepte, et la rivalité retombe d’un coup. Vous travaillez mieux ensemble qu’avant.',
          tone: 'good', rel: 10, happiness: 5,
        },
        low: {
          text: '{name} décline poliment, et te demande pourquoi tu lui proposes ça. La question reste en suspens.',
          tone: 'bad', rel: -5, happiness: -3,
        },
      },
    ],
  },
  {
    id: 'malade', kind: 'health', icon: '🤒', trait: 'warmth',
    actors: ['partner', 'spouse', 'mother', 'father', 'son', 'daughter', 'bestFriend'],
    from: 12,
    title: 'Deux semaines au lit',
    text: 'Rien de grave, mais rien de rapide non plus. Tu ne sors pas de chez toi.',
    choices: [
      {
        label: 'Prévenir {name}',
        high: {
          text: '{name} passe trois fois, fait les courses sans qu’on le lui demande, et repart sans rester trop longtemps.',
          tone: 'good', happiness: 9, stress: -10, rel: 7,
        },
        low: {
          text: '{name} envoie un message par jour, ce qui est déjà quelque chose, et ne passe pas.',
          tone: 'neutral', happiness: -3,
        },
      },
      {
        label: 'Ne prévenir personne',
        high: {
          text: '{name} finit par s’inquiéter du silence et débarque sans prévenir. Tu n’as pas eu à demander.',
          tone: 'good', happiness: 7, stress: -6, rel: 5,
        },
        low: {
          text: 'Personne ne s’aperçoit de rien. Quinze jours passent très lentement.',
          tone: 'bad', happiness: -9, stress: 8,
        },
      },
      {
        label: 'Demander explicitement à {name} de passer',
        high: {
          text: '{name} vient, évidemment — et te fait remarquer, gentiment, que tu n’avais pas besoin de demander.',
          tone: 'neutral', happiness: 3, rel: -2,
        },
        low: {
          text: '{name} n’aurait rien proposé de {lui}-même, mais à une demande claire {il} répond : trois passages, et les courses faites.',
          tone: 'good', happiness: 8, stress: -9, rel: 5,
        },
      },
    ],
  },
  {
    id: 'partage', kind: 'money', icon: '⚖️', trait: 'generosity',
    actors: ['brother', 'sister'],
    from: 25,
    title: 'Une petite succession à partager',
    text: 'Rien d’énorme, mais il faut se mettre d’accord avec {name}, et il y a un objet que vous voulez tous les deux.',
    choices: [
      {
        label: 'Proposer de couper en deux',
        high: {
          text: '{name} accepte, puis te laisse l’objet en disant que tu y tenais plus. Ce n’est même pas discutable.',
          tone: 'good', money: 2400, rel: 7, happiness: 5,
        },
        low: {
          text: '{name} accepte la moitié, emporte l’objet, et la moitié se révèle plus petite que prévu une fois les comptes faits.',
          tone: 'bad', money: 1500, rel: -6,
        },
      },
      {
        label: 'Demander l’objet, laisser le reste',
        high: {
          text: '{name} refuse : tu prendras ta part aussi, et l’objet. Vous en reparlerez dans dix ans en riant.',
          tone: 'good', money: 1800, rel: 8,
        },
        low: {
          text: '{name} accepte immédiatement, trop vite. Tu comprends en signant que le compte n’y était pas.',
          tone: 'bad', money: 300, rel: -5, happiness: -4,
        },
      },
      {
        label: 'Passer par un notaire',
        high: {
          text: '{name} accepte sans discuter, mais te demande si tu avais peur de quelque chose. Les frais sont pour vous deux.',
          tone: 'neutral', money: 2050, rel: -7,
        },
        low: {
          text: 'Les frais font mal, et c’était la seule façon d’obtenir ta part entière. {name} n’a pas apprécié.',
          tone: 'good', money: 2050, rel: -3,
        },
      },
    ],
  },
  {
    id: 'guichet', kind: 'life', icon: '🗂️', trait: 'temper',
    actors: ['partner', 'spouse', 'mother', 'father', 'friend', 'bestFriend'],
    from: 18,
    title: 'Un dossier, un guichet, deux heures',
    text: 'Une démarche qui devait prendre vingt minutes en prend deux heures, et {name} t’accompagne.',
    choices: [
      {
        label: 'Laisser {name} parler',
        high: {
          text: '{name} hausse le ton, on vous demande de sortir, et le dossier repart pour un mois.',
          tone: 'bad', stress: 14, happiness: -6, rel: -3,
        },
        low: {
          text: '{name} obtient en quatre phrases calmes ce que tu n’aurais pas obtenu en deux heures.',
          tone: 'good', stress: -8, happiness: 6, rel: 5,
        },
      },
      {
        label: 'Parler toi-même',
        high: {
          text: '{name} intervient quand même, au pire moment. Tu passes la fin de la file à t’excuser.',
          tone: 'bad', stress: 10, rel: -4,
        },
        low: {
          text: '{name} te laisse faire, et te souffle deux ou trois choses au bon moment. Ça finit par passer.',
          tone: 'good', stress: -4, rel: 3,
        },
      },
    ],
  },
  {
    id: 'recommandation', kind: 'work', icon: '📇', trait: 'loyalty',
    actors: ['boss', 'coworker', 'friend', 'bestFriend', 'ex'],
    from: 20,
    title: 'On appelle {name} à ton sujet',
    text: 'Quelqu’un vérifie qui tu es — un bailleur, un employeur, on ne sait pas trop. {name} figure sur la liste.',
    choices: [
      {
        label: 'Prévenir {name} à l’avance',
        high: {
          text: '{name} prend l’appel au sérieux et dit de toi des choses que tu ne savais pas qu’{il} pensait.',
          tone: 'good', rel: 6, happiness: 6,
        },
        low: {
          text: '{name} répond « je ne suis pas sûr d’être la bonne personne » et raccroche vite. C’est une réponse aussi.',
          tone: 'bad', rel: -4, happiness: -4,
        },
      },
      {
        label: 'Ne rien dire',
        high: {
          text: 'Personne ne t’a prévenu{e}, mais {name} a répondu comme il fallait. Tu l’apprendras par hasard.',
          tone: 'good', rel: 4,
        },
        low: {
          text: 'On te rappelle pour « préciser un point ». Tu comprends à la question posée ce qui a été dit.',
          tone: 'bad', stress: 9, rel: -6,
        },
      },
      {
        label: 'Donner un autre nom',
        high: {
          text: 'Tu écartes {name} de la liste, et {il} l’apprendra sans comprendre pourquoi — {il} aurait dit du bien de toi.',
          tone: 'bad', rel: -8, happiness: -3,
        },
        low: {
          text: 'Tu écartes {name} de la liste, et l’appel se passe très bien avec quelqu’un d’autre. Tu ne sauras jamais à quoi tu as échappé.',
          tone: 'good', happiness: 6, stress: -5,
        },
      },
    ],
  },
  {
    id: 'soir', kind: 'love', icon: '🌙', trait: 'warmth',
    actors: ['crush', 'partner', 'friend', 'classmate', 'coworker'],
    from: 15,
    title: 'Une soirée qui peut tourner',
    text: 'Le groupe se disperse, il est tard, et vous restez à deux, {name} et toi.',
    choices: [
      {
        label: 'Prolonger',
        high: {
          text: 'Vous marchez jusqu’au bout de la nuit sans voir passer les heures. Rien de spectaculaire, et pourtant.',
          tone: 'good', happiness: 12, rel: 9, stress: -8,
        },
        low: {
          text: '{name} regarde son téléphone deux fois de trop, et finit par dire qu’{il} se lève tôt.',
          tone: 'bad', happiness: -5, rel: -2,
        },
      },
      {
        label: 'Rentrer',
        high: {
          text: 'Tu rentres. {name} t’écrit vingt minutes plus tard pour dire qu’{il} aurait bien continué.',
          tone: 'good', happiness: 6, rel: 5,
        },
        low: {
          text: 'Tu rentres. Vous ne reparlerez pas de cette soirée, ni l’un ni l’autre.',
          tone: 'neutral', rel: -1,
        },
      },
    ],
  },
];

export function getSituation(id: string): SituationDef | undefined {
  return SITUATIONS.find((s) => s.id === id);
}
