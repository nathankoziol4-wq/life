/** Événements de couple, de famille et d'amitié. */

import { ev, type GameEvent } from './types.ts';

export const RELATIONSHIP_EVENTS: GameEvent[] = [
  ev({
    id: 're_partner_wants_child', kind: 'love', icon: '👶', title: 'Une conversation sérieuse', weight: 34,
    cond: { minAge: 20, maxAge: 48, hasPartner: true }, target: ['partner', 'spouse'],
    text: '{name} veut un enfant. Pas un jour, pas plus tard : maintenant.',
    choices: [
      { label: 'Dire oui', outcomes: [
        { weight: 3, text: 'Vous décidez d’essayer. {name} est rayonnant{e}.', tone: 'good', effects: { rel: 15, opinion: 14, stats: { happiness: 10 }, flag: 'tryingForBaby' } },
        { weight: 1, text: 'Vous décidez d’essayer, et la nouvelle arrive plus vite que prévu.', tone: 'good', effects: { rel: 16, opinion: 15, stats: { happiness: 12 }, special: 'pregnancy' } },
      ] },
      { label: 'Demander du temps', outcomes: [
        { weight: 3, text: '{name} comprend, mais le sujet reviendra.', tone: 'neutral', effects: { rel: -5, opinion: -4, stats: { stress: 6 } } },
        { weight: 2, text: '{name} le prend très mal. La discussion dure jusqu’à trois heures du matin.', tone: 'bad', effects: { rel: -14, opinion: -12, stats: { happiness: -8, stress: 12 } } },
      ] },
      { label: 'Dire non, définitivement', outcomes: [
        { weight: 2, text: '{name} accepte ta position. Vous en reparlerez sans doute, mais la relation tient.', tone: 'neutral', effects: { rel: -10, opinion: -8 } },
        { weight: 3, text: 'C’était rédhibitoire. {name} met fin à la relation.', tone: 'bad', effects: { stats: { happiness: -20, stress: 16 }, special: 'breakup' } },
      ] },
    ],
  }),
  ev({
    id: 're_partner_cheating_suspicion', kind: 'love', icon: '🔍', title: 'Un doute', weight: 26,
    cond: { minAge: 18, hasPartner: true }, target: ['partner', 'spouse'],
    text: '{name} rentre tard, garde son téléphone retourné et répond à côté quand tu poses des questions.',
    choices: [
      { label: 'Demander franchement', outcomes: [
        { weight: 3, text: 'C’était une surprise d’anniversaire pour toi. Tu te sens un peu bête.', tone: 'good', effects: { rel: 6, stats: { happiness: 8, stress: -8 } } },
        { weight: 2, text: '{name} avoue une liaison. La conversation dure toute la nuit.', tone: 'bad', effects: { rel: -40, opinion: -20, stats: { happiness: -25, stress: 25 }, flag: 'partnerCheated' } },
      ] },
      { label: 'Fouiller son téléphone', outcomes: [
        { weight: 2, text: 'Rien du tout. Mais {name} te surprend en train de fouiller.', tone: 'bad', effects: { rel: -25, opinion: -25, stats: { happiness: -12, karma: -8 } } },
        { weight: 2, text: 'Tu trouves des messages sans ambiguïté.', tone: 'bad', effects: { rel: -35, opinion: -10, stats: { happiness: -22, stress: 22 }, flag: 'partnerCheated' } },
      ] },
      { label: 'Ne rien dire', outcomes: [{ text: 'Tu ranges le doute quelque part. Il ne disparaît pas.', tone: 'neutral', effects: { stats: { stress: 14, happiness: -8 }, rel: -6 } }] },
    ],
  }),
  ev({
    id: 're_temptation', kind: 'love', icon: '💋', title: 'Une tentation', weight: 24,
    cond: { minAge: 18, hasPartner: true },
    text: 'Quelqu’un te fait des avances très claires lors d’une soirée. Ton partenaire n’est pas là.',
    choices: [
      { label: 'Refuser poliment', outcomes: [{ text: 'Tu dis non sans hésiter. Tu rentres et tu es content de toi.', tone: 'good', effects: { stats: { karma: 8, discipline: 8, happiness: 4 } } }] },
      { label: 'Céder', outcomes: [
        { weight: 3, text: 'Personne ne saura jamais. Sauf toi.', tone: 'neutral', effects: { stats: { karma: -16, happiness: -4, stress: 12 }, flag: 'cheated' } },
        { weight: 2, text: 'Une connaissance commune vous voit. L’information circule vite.', tone: 'bad', effects: { stats: { karma: -18, reputation: -12, happiness: -14 }, special: 'breakup' } },
      ] },
      { label: 'Partir immédiatement', outcomes: [{ text: 'Tu récupères ton manteau et tu appelles un taxi. Certaines situations ne se gèrent pas, elles s’évitent.', tone: 'good', effects: { stats: { karma: 10, discipline: 10 } } }] },
    ],
  }),
  ev({
    id: 're_parent_illness', kind: 'family', icon: '🏥', title: 'Un parent hospitalisé', weight: 24,
    cond: { minAge: 18, hasParents: true }, target: ['mother', 'father'],
    text: 'On t’appelle : {name} a été hospitalisé{e} en urgence.',
    choices: [
      { label: 'Tout laisser et y aller', outcomes: [{ text: 'Tu passes trois jours à l’hôpital. {name} s’en sort, et se souviendra que tu étais là.', tone: 'good', effects: { rel: 25, opinion: 22, stats: { karma: 12, stress: 16, happiness: -4 }, moneyPct: -0.02 } }] },
      { label: 'Y aller le week-end', outcomes: [{ text: 'Tu passes le samedi. C’est mieux que rien, et {name} le sait aussi.', tone: 'neutral', effects: { rel: 8, opinion: 5, stats: { stress: 8 } } }] },
      { label: 'Appeler seulement', outcomes: [{ text: 'Un coup de fil de dix minutes. Un silence gênant à la fin.', tone: 'bad', effects: { rel: -12, opinion: -14, stats: { karma: -8, stress: 6 } } }] },
    ],
  }),
  ev({
    id: 're_family_money_request', kind: 'family', icon: '💶', title: 'Une demande d’argent', weight: 28,
    cond: { minAge: 20, minMoney: 4000 }, target: ['brother', 'sister', 'mother', 'father', 'friend', 'bestFriend'],
    text: '{name} te demande de lui prêter une somme importante. {il} promet de rembourser « très vite ».',
    choices: [
      { label: 'Prêter la somme', requiresMoney: 4000, outcomes: [
        { weight: 2, text: '{name} rembourse intégralement en un an. La confiance est renforcée.', tone: 'good', effects: { rel: 20, opinion: 18, stats: { karma: 8 } } },
        { weight: 3, text: 'Tu ne reverras jamais cet argent, ni {name} d’ailleurs.', tone: 'bad', effects: { moneyPct: -0.15, rel: -20, stats: { happiness: -10, karma: 4 } } },
      ] },
      { label: 'Donner une partie', outcomes: [{ text: 'Tu donnes ce que tu peux perdre, sans rien attendre. Sage.', tone: 'neutral', effects: { moneyPct: -0.05, rel: 10, opinion: 10, stats: { karma: 7, intelligence: 3 } } }] },
      { label: 'Refuser', outcomes: [
        { weight: 3, text: '{name} comprend, ou fait semblant.', tone: 'neutral', effects: { rel: -12, opinion: -14 } },
        { weight: 2, text: '{name} le prend très mal et coupe les ponts.', tone: 'bad', effects: { rel: -30, opinion: -30, stats: { happiness: -8 }, special: 'estrange' } },
      ] },
    ],
  }),
  ev({
    id: 're_friend_betrayal', kind: 'random', icon: '🗡️', title: 'Une trahison', weight: 22,
    cond: { minAge: 14 }, target: ['friend', 'bestFriend'],
    text: 'Tu apprends que {name} a raconté à tout le monde quelque chose que tu lui avais confié en privé.',
    choices: [
      { label: 'Demander des explications', outcomes: [
        { weight: 3, text: '{name} s’excuse sincèrement. Il faudra du temps, mais l’amitié survit.', tone: 'neutral', effects: { rel: -12, opinion: -5, stats: { happiness: -6 } } },
        { weight: 2, text: '{name} minimise et te reproche d’en faire trop. Tout est dit.', tone: 'bad', effects: { rel: -30, stats: { happiness: -12 }, special: 'estrange' } },
      ] },
      { label: 'Couper les ponts', outcomes: [{ text: 'Tu effaces le numéro. C’est net, et ça fait mal.', tone: 'bad', effects: { stats: { happiness: -12, stress: 8, discipline: 4 }, special: 'estrange' } }] },
      { label: 'Faire comme si de rien n’était', outcomes: [{ text: 'Tu gardes la relation, avec une distance nouvelle et définitive.', tone: 'neutral', effects: { rel: -8, stats: { happiness: -5, stress: 6 } } }] },
    ],
  }),
  ev({
    id: 're_wedding_invite', kind: 'love', icon: '💒', title: 'Un mariage', weight: 24,
    cond: { minAge: 20 }, target: ['friend', 'bestFriend', 'brother', 'sister'],
    text: '{name} se marie et te demande d’être témoin.',
    choices: [
      { label: 'Accepter et faire un discours', outcomes: [
        { weight: 3, text: 'Ton discours fait rire et pleurer la salle entière. Tu es la star de la soirée après les mariés.', tone: 'good', effects: { rel: 20, opinion: 18, stats: { happiness: 14, reputation: 8 }, money: -350 } },
        { weight: 2, text: 'Tu te perds dans tes notes. La salle est bienveillante mais gênée.', tone: 'neutral', effects: { rel: 8, stats: { happiness: 2, reputation: -3 }, money: -350 } },
      ] },
      { label: 'Accepter sans discours', outcomes: [{ text: 'Tu tiens ton rôle discrètement et parfaitement.', tone: 'good', effects: { rel: 14, opinion: 12, stats: { happiness: 8 }, money: -300 } }] },
      { label: 'Décliner', outcomes: [{ text: '{name} dit comprendre. Ce n’est pas tout à fait vrai.', tone: 'bad', effects: { rel: -18, opinion: -16, stats: { happiness: -4 } } }] },
    ],
  }),
  ev({
    id: 're_child_trouble', kind: 'family', icon: '🚸', title: 'Convoqué à l’école', weight: 30,
    cond: { minAge: 25, hasChildren: true }, target: ['son', 'daughter'],
    text: 'L’école appelle : {name} a eu un comportement inacceptable en classe.',
    choices: [
      { label: 'Écouter {name} d’abord', outcomes: [
        { weight: 3, text: 'Il y avait un contexte que personne n’avait pris la peine de demander. Vous réglez ça ensemble.', tone: 'good', effects: { rel: 18, opinion: 16, stats: { karma: 6, intelligence: 3 } } },
        { weight: 2, text: '{name} n’a aucune excuse, mais apprécie d’avoir été écouté{e} avant d’être jugé{e}.', tone: 'neutral', effects: { rel: 8, opinion: 8 } },
      ] },
      { label: 'Punir sévèrement', outcomes: [
        { weight: 2, text: 'Le comportement cesse immédiatement. La relation se refroidit.', tone: 'neutral', effects: { rel: -14, opinion: -12, stats: { discipline: 3 } } },
        { weight: 2, text: '{name} se referme complètement. Vous ne parlerez plus vraiment pendant des années.', tone: 'bad', effects: { rel: -25, opinion: -22, stats: { happiness: -10 } } },
      ] },
      { label: 'Prendre la défense de {name} contre l’école', outcomes: [
        { weight: 2, text: '{name} adore. L’école, beaucoup moins.', tone: 'neutral', effects: { rel: 15, opinion: 15, stats: { reputation: -6 } } },
        { weight: 3, text: 'Tu apprends plus tard que {name} t’avait menti sur toute la ligne.', tone: 'bad', effects: { rel: -8, stats: { happiness: -10, reputation: -8 } } },
      ] },
    ],
  }),
  ev({
    id: 're_child_leaves', kind: 'family', icon: '🎒', title: 'Le départ', weight: 26,
    cond: { minAge: 38, hasChildren: true }, target: ['son', 'daughter'],
    text: '{name} annonce qu’{il} part vivre ailleurs. Les cartons sont déjà commandés.',
    choices: [
      { label: 'Aider au déménagement', outcomes: [{ text: 'Tu portes des cartons toute la journée et tu repars le cœur serré. {name} t’appelle le soir même.', tone: 'good', effects: { rel: 16, opinion: 14, stats: { happiness: -4, karma: 6, fitness: 2 } } }] },
      { label: 'Aider financièrement', requiresMoney: 3000, outcomes: [{ text: 'Un coup de pouce pour la caution. {name} n’oubliera pas.', tone: 'good', effects: { money: -3000, rel: 14, opinion: 16, stats: { karma: 6 } } }] },
      { label: 'Essayer de {le} retenir', outcomes: [{ text: 'La conversation tourne mal. {name} part quand même, en claquant la porte.', tone: 'bad', effects: { rel: -16, opinion: -14, stats: { happiness: -12 } } }] },
    ],
  }),
  ev({
    id: 're_inlaws', kind: 'family', icon: '🍽️', title: 'Repas de famille tendu', weight: 24,
    cond: { minAge: 22, hasPartner: true }, target: ['partner', 'spouse'],
    text: 'Le repas de famille dérape sur un sujet sensible. La belle-famille de {name} attend visiblement ta réaction.',
    choices: [
      { label: 'Défendre ton opinion', outcomes: [
        { weight: 2, text: 'Tu argumentes calmement. Certains changent d’avis, d’autres te respectent.', tone: 'good', effects: { stats: { reputation: 6, intelligence: 3 }, rel: 5 } },
        { weight: 3, text: 'Le repas se termine dans un silence glacial. {name} t’en veut.', tone: 'bad', effects: { rel: -14, stats: { happiness: -8, stress: 10 } } },
      ] },
      { label: 'Détourner la conversation', outcomes: [{ text: 'Tu lances une question sur la recette du dessert. Sauvetage réussi.', tone: 'good', effects: { rel: 10, opinion: 8, stats: { intelligence: 4, happiness: 3 } } }] },
      { label: 'Se taire', outcomes: [{ text: 'Tu manges en silence en comptant les minutes.', tone: 'neutral', effects: { stats: { stress: 8, happiness: -4 } } }] },
    ],
  }),
  ev({
    id: 're_partner_job_loss', kind: 'love', icon: '📉', title: 'Le partenaire perd son emploi', weight: 22,
    cond: { minAge: 22, hasPartner: true }, target: ['partner', 'spouse'],
    text: '{name} rentre plus tôt que d’habitude, avec un carton sous le bras.',
    choices: [
      { label: 'Rassurer et prendre le relais', outcomes: [{ text: 'Tu assumes les dépenses le temps qu’il faut. {name} ne l’oubliera jamais.', tone: 'good', effects: { moneyPct: -0.08, rel: 22, opinion: 22, stats: { karma: 8, stress: 10 } } }] },
      { label: 'Faire pression pour qu’{il} retrouve vite', outcomes: [
        { weight: 3, text: '{name} retrouve un poste en trois mois, mais garde un souvenir amer de ces semaines.', tone: 'neutral', effects: { rel: -10, opinion: -12 } },
        { weight: 2, text: 'La pression aggrave tout. Les disputes s’enchaînent.', tone: 'bad', effects: { rel: -20, opinion: -18, stats: { happiness: -12, stress: 14 } } },
      ] },
    ],
  }),
  ev({
    id: 're_ex_returns', kind: 'love', icon: '📲', title: 'Un message d’un ex', weight: 22,
    cond: { minAge: 18 }, target: ['ex'],
    text: '{name}, que tu n’avais plus de nouvelles depuis longtemps, t’envoie un message à 23 h 40.',
    choices: [
      { label: 'Répondre', outcomes: [
        { weight: 2, text: 'Vous discutez trois heures. Rien ne se rallume, mais quelque chose se répare.', tone: 'good', effects: { rel: 15, opinion: 12, stats: { happiness: 6 } } },
        { weight: 2, text: 'Vous remuez tout ce qui n’était pas réglé. Nuit blanche.', tone: 'bad', effects: { rel: 5, stats: { happiness: -10, stress: 14 } } },
      ] },
      { label: 'Ignorer', outcomes: [{ text: 'Tu laisses le message en « vu ». C’est probablement le plus sain.', tone: 'neutral', effects: { stats: { discipline: 5, happiness: -2 } } }] },
      { label: 'Bloquer le numéro', outcomes: [{ text: 'Fin de l’histoire, pour de bon.', tone: 'neutral', effects: { rel: -20, stats: { discipline: 7, stress: -6 } } }] },
    ],
  }),
  ev({
    id: 're_friend_success', kind: 'random', icon: '🌟', title: 'La réussite d’un ami', weight: 22,
    cond: { minAge: 20 }, target: ['friend', 'bestFriend'],
    text: '{name} annonce une réussite spectaculaire. Tout le monde le félicite. Tu ressens quelque chose de compliqué.',
    choices: [
      { label: 'Se réjouir sincèrement', outcomes: [{ text: 'Tu es le premier à l’appeler. La joie partagée est plus grande que l’envie.', tone: 'good', effects: { rel: 16, opinion: 14, stats: { happiness: 8, karma: 8 } } }] },
      { label: 'Féliciter du bout des lèvres', outcomes: [{ text: 'Un message court et poli. {name} le sent.', tone: 'neutral', effects: { rel: -6, opinion: -6, stats: { happiness: -5 } } }] },
      { label: 'S’en servir comme moteur', outcomes: [{ text: 'Tu transformes la jalousie en carburant. Ce n’est pas très élégant, mais ça fonctionne.', tone: 'good', effects: { stats: { discipline: 10, stress: 6, happiness: -2 }, rel: 3 } }] },
    ],
  }),
  ev({
    id: 're_grandchild', kind: 'family', icon: '👶', title: 'Grand-parent', weight: 22,
    cond: { minAge: 45, hasChildren: true }, target: ['son', 'daughter'],
    text: '{name} t’annonce que tu vas être grand-parent.',
    choices: [
      { label: 'Éclater de joie', outcomes: [{ text: 'Tu pleures au téléphone. Tu appelles ensuite six personnes pour le raconter.', tone: 'good', effects: { rel: 18, opinion: 16, stats: { happiness: 20, health: 2 } } }] },
      { label: 'Proposer une aide financière', requiresMoney: 5000, outcomes: [{ text: 'Tu ouvres un livret pour le petit. Discret et durable.', tone: 'good', effects: { money: -5000, rel: 16, opinion: 18, stats: { happiness: 15, karma: 6 } } }] },
      { label: 'Rappeler que c’est beaucoup de travail', outcomes: [{ text: 'Ce n’était pas la réaction attendue. Le silence au bout du fil dure trop longtemps.', tone: 'bad', effects: { rel: -14, opinion: -14, stats: { happiness: 4 } } }] },
    ],
  }),
  ev({
    id: 're_partner_addiction', kind: 'love', icon: '🍷', title: 'Un problème qui s’installe', weight: 18,
    cond: { minAge: 22, hasPartner: true }, target: ['partner', 'spouse'],
    text: 'Tu comptes les bouteilles. Il y en a beaucoup trop, et {name} refuse d’en parler.',
    choices: [
      { label: 'Imposer une prise en charge', outcomes: [
        { weight: 3, text: 'C’est violent, mais {name} accepte de se soigner. Le chemin sera long.', tone: 'good', effects: { rel: -8, opinion: 10, stats: { karma: 14, stress: 18 }, moneyPct: -0.06 } },
        { weight: 2, text: '{name} le vit comme une trahison et s’enferme davantage.', tone: 'bad', effects: { rel: -20, opinion: -15, stats: { happiness: -14, stress: 20 } } },
      ] },
      { label: 'Accompagner sans forcer', outcomes: [{ text: 'Tu restes présent. Ça n’avance pas vite, mais {name} n’est pas seul{e}.', tone: 'neutral', effects: { rel: 8, opinion: 12, stats: { stress: 16, happiness: -8, karma: 8 } } }] },
      { label: 'Partir', outcomes: [{ text: 'Tu ne peux pas porter ça. Personne ne peut te le reprocher.', tone: 'bad', effects: { stats: { happiness: -16, stress: 12, karma: -2 }, special: 'breakup' } }] },
    ],
  }),
  ev({
    id: 're_best_friend_move', kind: 'random', icon: '🧳', title: 'Un ami s’en va', weight: 22,
    cond: { minAge: 12 }, target: ['bestFriend', 'friend'],
    text: '{name} déménage à l’autre bout du pays le mois prochain.',
    choices: [
      { label: 'Organiser une dernière soirée', outcomes: [{ text: 'Vous refaites le monde jusqu’à l’aube. Vous vous appellerez, cette fois pour de vrai.', tone: 'good', effects: { rel: 15, opinion: 14, stats: { happiness: 8 }, money: -120 } }] },
      { label: 'Promettre de venir le voir', outcomes: [
        { weight: 2, text: 'Tu y vas vraiment, deux fois par an. L’amitié tient.', tone: 'good', effects: { rel: 10, opinion: 12, stats: { happiness: 6 }, money: -400 } },
        { weight: 3, text: 'Tu n’y vas jamais. Les messages s’espacent, puis s’arrêtent.', tone: 'bad', effects: { rel: -20, stats: { happiness: -8 } } },
      ] },
      { label: 'Prendre ses distances tout de suite', outcomes: [{ text: 'Tu coupes avant que ça fasse mal. Ça fait mal quand même.', tone: 'bad', effects: { rel: -25, stats: { happiness: -10, stress: 6 } } }] },
    ],
  }),
  ev({
    id: 're_sibling_success_gap', kind: 'family', icon: '⚖️', title: 'La comparaison', weight: 20,
    cond: { minAge: 25, hasSiblings: true }, target: ['brother', 'sister'],
    text: 'À chaque repas de famille, quelqu’un compare ta situation à celle de {name}. Aujourd’hui encore.',
    choices: [
      { label: 'Recadrer la conversation', outcomes: [{ text: 'Tu dis clairement que cette comparaison n’a aucun sens. Le silence qui suit te donne raison.', tone: 'good', effects: { stats: { reputation: 5, happiness: 4, discipline: 4 }, rel: 4 } }] },
      { label: 'En rire', outcomes: [{ text: 'Tu en fais une blague. La tension retombe et tout le monde passe au dessert.', tone: 'good', effects: { stats: { happiness: 5, reputation: 3 }, rel: 6, opinion: 5 } }] },
      { label: 'S’en prendre à {name}', outcomes: [{ text: '{name} n’y était pour rien. La dispute laisse des traces.', tone: 'bad', effects: { rel: -20, opinion: -18, stats: { happiness: -8 } } }] },
    ],
  }),
  ev({
    id: 're_parent_moves_in', kind: 'family', icon: '🏠', title: 'Un parent qui vieillit', weight: 20,
    cond: { minAge: 40, hasParents: true }, target: ['mother', 'father'],
    text: '{name} ne peut plus vraiment vivre seul{e}. Il faut décider quelque chose.',
    choices: [
      { label: 'L’accueillir chez toi', outcomes: [{ text: 'Le quotidien change beaucoup. La relation aussi, souvent en mieux.', tone: 'good', effects: { rel: 25, opinion: 25, stats: { karma: 16, stress: 14, happiness: -2 }, moneyPct: -0.05 } }] },
      { label: 'Financer une aide à domicile', requiresMoney: 8000, outcomes: [{ text: 'Une solution coûteuse mais qui préserve l’autonomie de {name}.', tone: 'good', effects: { money: -8000, rel: 14, opinion: 15, stats: { karma: 8, stress: 4 } } }] },
      { label: 'Chercher un établissement', outcomes: [
        { weight: 3, text: 'La maison de retraite est correcte. {name} met des mois à s’y faire.', tone: 'neutral', effects: { moneyPct: -0.06, rel: -8, opinion: -10, stats: { stress: 10, karma: 2 } } },
        { weight: 2, text: '{name} s’y plaît finalement beaucoup et s’y fait des amis.', tone: 'good', effects: { moneyPct: -0.06, rel: 6, opinion: 4, stats: { karma: 4 } } },
      ] },
    ],
  }),
];
