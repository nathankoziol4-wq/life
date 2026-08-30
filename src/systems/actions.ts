/**
 * Ce que le joueur peut faire, et avec qui.
 *
 * Un seul endroit décide de la liste des actions proposées face à quelqu'un.
 * Sans cela, chaque écran refait ses propres conditions à la main, les oublie
 * à moitié, et on finit par proposer « demander en mariage » à un enfant de
 * sept ans ou « meilleur ami » à un collègue croisé la veille.
 *
 * Une action indisponible n'est pas seulement retirée : elle porte la raison
 * pour laquelle elle ne l'est pas. Le joueur voit donc ce qui existe et ce
 * qu'il lui manque pour y accéder, au lieu d'un menu qui change sans
 * explication.
 */

import type { GameState, Person } from '../engine/types.ts';
import { isRomanticallyCompatible } from './relationships.ts';
import { isInSchool } from './education.ts';
import { ailing, faraway } from './lives.ts';
import { entrustable, mealCost, owed, owesFavour, promised } from './socialActs.ts';
import { ASK_TONES, CONFRONT_TONES, HARD_TONES } from '../data/approaches.ts';

/** Où se déroule l'interaction : le contexte ouvre des actions différentes. */
export type ActionContext = 'général' | 'école' | 'travail' | 'prison';

export interface AvailableAction {
  /** Identifiant stable, consommé par l'écran. */
  id: string;
  label: string;
  emoji: string;
  /** Une ligne d'explication, quand elle apporte quelque chose. */
  hint?: string;
  /** Raison du blocage, ou `null` si l'action est jouable. */
  blocked: string | null;
  /** Regroupement d'affichage. */
  group: 'lien' | 'argent' | 'amour' | 'conflit' | 'école' | 'travail' | 'prison' | 'famille';
  /**
   * Les manières de s'y prendre, quand il y en a plusieurs.
   *
   * C'est de là que vient le volume : une action × une personne × une manière
   * × un contexte, plutôt qu'une ligne de plus dans un fichier. Chaque manière
   * change réellement le résultat — `socialActs.ts#approachOdds` la confronte
   * au caractère de la personne, qu'on ne connaît que si on l'a découvert.
   */
  approaches?: string[];
  /** L'action demande-t-elle un montant ? */
  amount?: boolean;
}

const FAMILY: Person['relation'][] = [
  'mother', 'father', 'brother', 'sister', 'son', 'daughter',
  'stepmother', 'stepfather', 'grandmother', 'grandfather', 'aunt', 'uncle', 'cousin',
];

const MAX_INTERACTIONS_PER_YEAR = 3;

/**
 * Liste complète des actions face à une personne, disponibles ou non.
 *
 * L'appelant filtre s'il veut ; garder les actions bloquées dans la liste est
 * volontaire, c'est ce qui permet d'afficher « il faut 18 ans » plutôt que de
 * faire disparaître la ligne.
 */
export function getAvailableActions(
  state: GameState,
  target: Person,
  context: ActionContext = 'général',
): AvailableAction[] {
  const p = state.player;
  const out: AvailableAction[] = [];
  const add = (a: AvailableAction) => out.push(a);

  const dead = !target.alive;
  const estranged = target.estranged;
  const exhausted = target.interactionsThisYear >= MAX_INTERACTIONS_PER_YEAR;

  /** Le blocage le plus fort en premier : mort, brouille, quota. */
  const common = (): string | null => {
    if (dead) return `${target.firstName} n’est plus là.`;
    if (estranged) return `Tu as coupé les ponts avec ${target.firstName}.`;
    if (exhausted) return `Tu as déjà passé beaucoup de temps avec ${target.firstName} cette année.`;
    return null;
  };

  /* --- Entretenir le lien --- */
  add({ id: 'talk', label: 'Discuter', emoji: '💬', group: 'lien', blocked: common() });
  add({
    id: 'time', label: 'Passer du temps ensemble', emoji: '🕰️', group: 'lien',
    hint: 'Le plus efficace, et le plus coûteux en temps', blocked: common(),
  });
  add({ id: 'compliment', label: 'Faire un compliment', emoji: '🌟', group: 'lien', blocked: common() });
  add({
    id: 'gift', label: 'Offrir un cadeau', emoji: '🎁', group: 'lien',
    // Le contexte scolaire ajoutait sa propre ligne « Offrir quelque chose »,
    // avec le même identifiant : deux boutons, un seul effet. Un test le
    // trouve maintenant — deux lignes identiques sont deux fois le même
    // choix pour le joueur, quoi qu'en dise le code.
    hint: context === 'école' ? 'Ça achète du temps, jamais de l’estime' : undefined,
    blocked: common() ?? (p.money <= 0 ? 'Tu n’as rien à offrir.' : null),
  });
  add({
    id: 'advice', label: 'Demander conseil', emoji: '🧭', group: 'lien',
    hint: 'Le conseil vaut ce que vaut la vie de qui le donne',
    blocked: common() ?? (target.age < p.age + 4 && target.age < 25
      ? `${target.firstName} n’a pas plus de recul que toi.`
      : null),
  });

  /* --- Argent --- */
  add({
    id: 'giveMoney', label: 'Donner de l’argent', emoji: '💸', group: 'argent',
    blocked: dead ? 'Trop tard.' : p.money <= 0 ? 'Tu n’as rien à donner.' : null,
  });
  add({
    id: 'askMoney', label: 'Demander de l’argent', emoji: '🙏', group: 'argent',
    // La manière change réellement la réponse : insister paie et abîme,
    // demander calmement laisse intact et obtient moins.
    approaches: ASK_TONES,
    blocked: dead ? 'Trop tard.' : estranged ? 'Vous ne vous parlez plus.'
      : target.wealth <= 0 ? `${target.firstName} n’a rien à te prêter.` : null,
  });

  /* --- Amour --- */
  const incest = FAMILY.includes(target.relation);
  // Le personnel de l'établissement et les mineurs face à un adulte ne sont
  // pas des cas « bloqués » qu'on afficherait grisés : ces lignes n'ont rien
  // à faire dans le menu, on ne les propose pas du tout.
  const staff = target.relation === 'teacher' || target.flags.staff === true;
  const minorAdultGap = (p.age < 18) !== (target.age < 18);
  const romantic = !dead && !incest
    && isRomanticallyCompatible(p.sex, p.orientation, target);
  const tooYoung = p.age < 13 || target.age < 13;
  const gapProblem = Math.abs(target.age - p.age) > Math.max(10, p.age * 0.35);

  if (!incest && !staff && !minorAdultGap) {
    const romanticBlock = dead ? 'Trop tard.'
      : tooYoung ? 'Vous êtes bien trop jeunes.'
        : !romantic ? `${target.firstName} n’est pas intéressé par toi de cette façon.`
          : gapProblem ? 'L’écart d’âge rend la chose impossible.'
            : null;

    if (target.relation !== 'spouse' && target.relation !== 'partner') {
      add({ id: 'kiss', label: 'Embrasser', emoji: '😘', group: 'amour', blocked: romanticBlock });
      add({
        id: 'askOut', label: 'Proposer de sortir ensemble', emoji: '💐', group: 'amour',
        blocked: romanticBlock ?? (target.maritalStatus === 'married'
          ? `${target.firstName} est marié.` : null),
      });
    }
    if (target.relation === 'partner') {
      add({ id: 'kiss', label: 'Embrasser', emoji: '😘', group: 'amour', blocked: romanticBlock });
      add({
        id: 'propose', label: 'Faire une demande en mariage', emoji: '💍', group: 'amour',
        hint: p.flags.ringValue ? 'Bague achetée' : 'Sans bague, c’est plus dur',
        blocked: romanticBlock ?? (p.age < 18 ? 'Il faut être majeur.' : null),
      });
      add({ id: 'breakUp', label: 'Rompre', emoji: '💔', group: 'amour', blocked: dead ? 'Trop tard.' : null });
    }
    if (target.relation === 'spouse') {
      add({ id: 'kiss', label: 'Embrasser', emoji: '😘', group: 'amour', blocked: dead ? 'Trop tard.' : null });
      add({
        id: 'breakUp', label: 'Divorcer', emoji: '⚖️', group: 'amour',
        hint: 'Partage des biens, éventuelle pension', blocked: dead ? 'Trop tard.' : null,
      });
    }
  }

  /* --- Amitié --- */
  if (!incest && !staff && target.relation !== 'spouse' && target.relation !== 'partner') {
    add({
      id: 'askBestFriend', label: 'Demander à devenir meilleur ami', emoji: '🤝', group: 'lien',
      blocked: dead ? 'Trop tard.'
        : target.relation === 'bestFriend' ? `${target.firstName} l’est déjà.`
          : target.relationship < 62 ? 'Vous n’êtes pas assez proches.'
            : null,
    });
  }

  /* --- Conflit --- */
  add({
    id: 'argue', label: 'Se disputer', emoji: '😠', group: 'conflit',
    approaches: CONFRONT_TONES, blocked: common(),
  });
  add({ id: 'insult', label: 'Insulter', emoji: '🤬', group: 'conflit', blocked: common() });
  if (estranged) {
    add({
      id: 'reconnect', label: 'Tenter de renouer', emoji: '🕊️', group: 'conflit',
      blocked: dead ? 'Trop tard.' : null,
    });
  } else {
    add({
      id: 'cutTies', label: 'Couper les ponts', emoji: '✂️', group: 'conflit',
      blocked: dead ? 'Trop tard.' : null,
    });
  }

  /* --- Ce qu'on fait avec ses proches, et qui change avec l'âge ---
     Mesuré avant que ce bloc existe : le moteur connaissait dix actions pour
     une mère, huit d'entre elles identiques à six, seize et trente-cinq ans.
     Une vie d'adulte ne fait pas avec sa mère ce qu'un enfant de six ans
     fait, et c'est ce trou-là que ces lignes comblent. */
  if (context === 'général' && !dead) {
    const close = FAMILY.includes(target.relation)
      || ['spouse', 'partner', 'bestFriend', 'friend'].includes(target.relation);
    const grown = p.age >= 16;
    const adult = p.age >= 18;

    if (close && grown) {
      add({
        id: 'invite', label: 'L’inviter à manger', emoji: '🍽️', group: 'famille',
        hint: faraway(target) ? 'Il vit loin : ça compte double' : 'Deux heures, et le lien tient',
        blocked: estranged ? `Tu ne vois plus ${target.firstName}.`
          : p.money < mealCost(state) ? 'Tu n’as pas de quoi.' : null,
      });
    }
    if (close && p.age >= 12) {
      add({
        id: 'confide', label: 'Te confier', emoji: '🫂', group: 'famille',
        hint: 'Tu apprendras quelque chose sur cette personne',
        approaches: HARD_TONES,
        blocked: estranged ? `Vous ne vous parlez plus.` : null,
      });
    }
    if (close && adult && FAMILY.includes(target.relation)) {
      // Présenter quelqu'un : seulement à la famille, et une fois par couple.
      const partner = Object.values(state.npcs).find(
        (x) => x.alive && (x.relation === 'partner' || x.relation === 'spouse'),
      );
      if (partner && partner.id !== target.id) {
        add({
          id: 'introduce', label: `Lui présenter ${partner.firstName}`, emoji: '👋', group: 'famille',
          hint: 'Ce qu’ils penseront l’un de l’autre restera',
          blocked: target.flags[`met:${partner.id}`] === true
            ? `${target.firstName} le connaît déjà.` : null,
        });
      }
    }
    if (close && adult && ailing(target)) {
      add({
        id: 'careFor', label: 'L’accompagner à l’hôpital', emoji: '🏥', group: 'famille',
        hint: 'Ça coûte, et ça change ses chances',
        blocked: null,
      });
    }
    if (close && adult && entrustable(state).length > 0 && target.age >= 18) {
      add({
        id: 'entrust', label: 'Lui confier les enfants', emoji: '🧸', group: 'famille',
        hint: 'Une année plus légère, et un lien qui se crée sans toi',
        blocked: estranged ? `Pas à ${target.firstName}.` : null,
      });
    }
    if (adult && target.age >= 60 && FAMILY.includes(target.relation)) {
      add({
        id: 'willTalk', label: 'Parler de ce qui restera', emoji: '📜', group: 'famille',
        hint: 'Difficile à dire, et personne ne le dit jamais',
        approaches: HARD_TONES,
        blocked: estranged ? `Vous ne vous parlez plus.` : null,
      });
    }

    /* --- Ce qui crée des choix pour plus tard --- */
    if (adult) {
      add({
        id: 'lend', label: 'Lui prêter de l’argent', emoji: '🤲', group: 'argent',
        hint: 'Ce n’est pas donner : tu pourras le réclamer',
        amount: true,
        blocked: p.money <= 0 ? 'Tu n’as rien à prêter.'
          : owed(target) > 0 ? `${target.firstName} te doit déjà quelque chose.` : null,
      });
    }
    if (owed(target) > 0) {
      add({
        id: 'reclaim', label: 'Réclamer ce qu’il te doit', emoji: '📬', group: 'argent',
        hint: 'La manière décide, et laisse des traces',
        approaches: ASK_TONES,
        blocked: null,
      });
    }
    if (p.age >= 14) {
      add({
        id: 'doFavour', label: 'Lui rendre service', emoji: '🧰', group: 'lien',
        hint: 'Du temps donné, et quelque chose qu’on pourra rappeler',
        blocked: estranged ? `Vous ne vous parlez plus.`
          : owesFavour(target) ? `${target.firstName} te doit déjà un service.` : null,
      });
    }
    if (owesFavour(target)) {
      add({
        id: 'callFavour', label: 'Lui demander ce service', emoji: '🎟️', group: 'lien',
        hint: 'Ce qui sera donné dépend de ce que la personne est',
        blocked: null,
      });
    }
    if (p.age >= 12 && close) {
      add({
        id: 'promise', label: 'Lui promettre d’être là', emoji: '🤞', group: 'famille',
        hint: 'Le moteur s’en souviendra à la fin de l’année',
        blocked: promised(state, target) ? 'Tu lui as déjà promis quelque chose.' : null,
      });
    }
  }

  /* --- Actions propres à l'école --- */
  if (context === 'école') {
    const schooled = isInSchool(state);
    const schoolBlock = dead ? 'Trop tard.'
      : !schooled ? 'Tu n’es plus scolarisé.' : null;

    if (target.relation === 'teacher') {
      add({ id: 'question', label: 'Poser une question', emoji: '🙋', group: 'école', blocked: schoolBlock });
      add({
        id: 'askHelpTeacher', label: 'Demander du soutien', emoji: '📘', group: 'école',
        hint: 'Cours particuliers en dehors des heures', blocked: schoolBlock,
      });
      add({ id: 'thank', label: 'Remercier', emoji: '🙏', group: 'école', blocked: schoolBlock });
      add({
        id: 'complain', label: 'Contester une note', emoji: '📝', group: 'école',
        hint: 'Passe mieux avec un bon dossier', blocked: schoolBlock,
      });
      add({
        id: 'reportIssue', label: 'Signaler un problème', emoji: '🚩', group: 'école',
        hint: 'Harcèlement, injustice, difficulté', blocked: schoolBlock,
      });
      // La seule action qui puisse *défaire* une ligne du dossier. Sans elle,
      // une sanction était définitive et le comportement ne faisait que
      // descendre.
      const record = state.player.education.discipline;
      if (record.warnings + record.detentions + record.suspensions > 0) {
        add({
          id: 'plead', label: 'Plaider ta cause', emoji: '⚖️', group: 'école',
          hint: 'Auprès de la direction, et une seule fois par an',
          blocked: schoolBlock,
        });
      }
      add({
        id: 'disrespect', label: 'Manquer de respect', emoji: '😤', group: 'conflit',
        hint: 'La classe regarde', blocked: schoolBlock,
      });
    } else {
      add({
        id: 'helpWork', label: 'Aider pour les cours', emoji: '📚', group: 'école',
        blocked: schoolBlock ?? (p.education.grades < 8
          ? 'Tu n’es pas en position d’aider qui que ce soit.' : null),
      });
      add({ id: 'askHelpMate', label: 'Demander de l’aide', emoji: '🆘', group: 'école', blocked: schoolBlock });
      add({ id: 'tease', label: 'Taquiner', emoji: '😜', group: 'école', blocked: schoolBlock });
      add({
        id: 'prank', label: 'Faire une farce', emoji: '🎈', group: 'école',
        hint: 'Drôle si la classe rit avec toi, cruelle sinon', blocked: schoolBlock,
      });
      // Le premier amour scolaire : l'audit relevait que la séduction ne
      // commençait qu'à l'âge adulte.
      if (p.age >= 12) {
        add({
          id: 'askOutMate', label: 'L’inviter à sortir', emoji: '💗', group: 'amour',
          hint: 'Un refus devant témoins se paie longtemps', blocked: schoolBlock,
        });
      }
      if (target.relationship < 45 || target.estranged) {
        add({
          id: 'makeUp', label: 'Te réconcilier', emoji: '🕊️', group: 'lien',
          hint: 'Le temps fait la moitié du travail', blocked: schoolBlock,
        });
      }
      add({
        id: 'defend', label: 'Prendre sa défense', emoji: '🛡️', group: 'école',
        hint: 'Courageux, et pas sans risque', blocked: schoolBlock,
      });
      add({
        id: 'provoke', label: 'Provoquer', emoji: '😤', group: 'conflit', blocked: schoolBlock,
      });
      add({
        id: 'report', label: 'Signaler son comportement', emoji: '🚩', group: 'conflit',
        hint: 'La classe n’aime pas ça', blocked: schoolBlock,
      });
      // L'autre côté du harcèlement. Le jeu ne l'interdit pas ; il en tient la
      // comptabilité — le karma, les amitiés, et le dossier au bout de deux
      // fois.
      add({
        id: 'tellAdult', label: 'En parler à un adulte', emoji: '🧑‍🏫', group: 'conflit',
        hint: 'Ce qu’ils en font ne dépend pas de toi', blocked: schoolBlock,
      });
      add({
        id: 'pickOn', label: 'T’en prendre à cette personne', emoji: '😈', group: 'conflit',
        hint: 'Une fois par an et par personne. Ça laisse des traces des deux côtés',
        blocked: schoolBlock,
      });
    }
  }

  /* --- Actions propres au travail --- */
  if (context === 'travail') {
    const job = p.job;
    const role = job?.team.find((c) => c.personId === target.id);
    const workBlock = dead ? 'Trop tard.'
      : !job ? 'Tu n’as pas d’emploi.'
        : !role ? `${target.firstName} ne travaille plus avec toi.` : null;
    const isBoss = role?.role === 'supérieur';
    const hasHR = Boolean(job?.team.some((c) => c.role === 'ressources humaines'));

    add({
      id: 'askAdvice', label: 'Demander conseil sur le métier', emoji: '🧰', group: 'travail',
      hint: 'Ne vaut que ce que vaut celui qui le donne', blocked: workBlock,
    });
    add({
      id: 'complain', label: 'Se plaindre', emoji: '😮‍💨', group: 'travail',
      hint: role && role.influence < 35 ? 'Il n’a aucun poids ici' : undefined,
      blocked: workBlock,
    });

    if (isBoss) {
      add({
        id: 'askPromotionTo', label: 'Demander une promotion', emoji: '📈', group: 'travail',
        hint: 'Les résultats comptent, les appuis aussi', blocked: workBlock,
      });
      add({
        id: 'disrespectBoss', label: 'Manquer de respect', emoji: '😤', group: 'conflit',
        hint: 'Encaisser, sanctionner, ou te mettre dehors : à voir', blocked: workBlock,
      });
    } else {
      add({ id: 'cover', label: 'Le couvrir', emoji: '🤝', group: 'travail', blocked: workBlock });
      add({ id: 'askCover', label: 'Lui demander de te couvrir', emoji: '🫥', group: 'travail', blocked: workBlock });
      add({
        id: 'takeCredit', label: 'S’attribuer son travail', emoji: '🎭', group: 'conflit',
        hint: 'Payant, et rarement invisible', blocked: workBlock,
      });
      add({
        id: 'reportToHR', label: 'Signaler aux ressources humaines', emoji: '🚩', group: 'conflit',
        blocked: workBlock ?? (hasHR ? null : 'Il n’y a pas de ressources humaines ici.'),
      });
    }
  }

  /* --- Actions propres à la détention --- */
  if (context === 'prison') {
    const prison = p.prison;
    const inside = target.relation === 'inmate';
    const prisonBlock = dead ? 'Trop tard.'
      : !prison ? 'Tu n’es plus en détention.'
        : !inside ? `${target.firstName} n’est plus détenu avec toi.` : null;

    add({
      id: 'seekProtection', label: 'Se ranger derrière lui', emoji: '🛡️', group: 'prison',
      hint: 'On te laissera tranquille. On te croira aussi à lui.',
      blocked: prisonBlock,
    });
    add({
      id: 'backUp', label: 'Le soutenir dans la cour', emoji: '🤜', group: 'prison',
      hint: 'Ce qui se gagne ici se paie au dossier',
      blocked: prisonBlock,
    });
    add({
      id: 'askFavor', label: 'Demander un service', emoji: '🎟️', group: 'prison',
      hint: 'Ce qui circule ici ne s’achète pas avec de l’argent',
      blocked: prisonBlock,
    });
    add({
      id: 'standUpTo', label: 'Le remettre à sa place', emoji: '😠', group: 'conflit',
      hint: 'Le respect se gagne comme ça, et la santé s’y perd',
      blocked: prisonBlock,
    });
  }

  return out;
}

/** Raccourci : seulement ce qui est réellement jouable. */
export function playableActions(
  state: GameState,
  target: Person,
  context: ActionContext = 'général',
): AvailableAction[] {
  return getAvailableActions(state, target, context).filter((a) => a.blocked === null);
}
