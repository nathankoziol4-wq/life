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
  group: 'lien' | 'argent' | 'amour' | 'conflit' | 'école' | 'travail';
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
    blocked: common() ?? (p.money <= 0 ? 'Tu n’as rien à offrir.' : null),
  });
  add({
    id: 'advice', label: 'Demander conseil', emoji: '🧭', group: 'lien',
    hint: 'Ce qu’il te dira dépend de ce qu’il a vécu',
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
  add({ id: 'argue', label: 'Se disputer', emoji: '😠', group: 'conflit', blocked: common() });
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
        hint: 'Il peut encaisser, sanctionner, ou te mettre dehors', blocked: workBlock,
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
