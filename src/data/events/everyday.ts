/**
 * Événements du quotidien, sans prérequis.
 *
 * La plupart des événements adultes exigent un emploi, un couple ou un
 * patrimoine. Ceux-ci comblent le vide : ils peuvent survenir à n'importe qui,
 * pourvu qu'il ait l'âge, et garantissent qu'une vie reste vivante même sans
 * carrière ni famille.
 */

import { ev, type GameEvent } from './types.ts';

export const EVERYDAY_EVENTS: GameEvent[] = [
  ev({
    id: 'ev_queue', kind: 'random', icon: '🧾', title: 'La file d’attente', weight: 30,
    cond: { minAge: 14 },
    text: 'Quarante minutes de file. Quelqu’un se glisse devant toi comme si de rien n’était.',
    choices: [
      { label: 'Le faire remarquer', outcomes: [
        { weight: 3, text: 'La personne s’excuse et va se remettre au bout. Deux inconnus te remercient du regard.', tone: 'good', effects: { stats: { happiness: 4, reputation: 2 } } },
        { weight: 2, text: 'La personne le prend très mal. Le ton monte pour rien.', tone: 'bad', effects: { stats: { happiness: -5, stress: 8 } } },
      ] },
      { label: 'Laisser couler', outcomes: [{ text: 'Tu ne dis rien et tu attends dix minutes de plus, en y pensant tout du long.', tone: 'neutral', effects: { stats: { stress: 5, discipline: 2 } } }] },
    ],
  }),
  ev({
    id: 'ev_neighbour_help', kind: 'random', icon: '🪜', title: 'Un voisin sur le pas de la porte', weight: 28,
    cond: { minAge: 16 },
    text: 'Un voisin sonne : il a besoin d’un coup de main pour monter un meuble, et personne d’autre ne répond.',
    choices: [
      { label: 'Aider', outcomes: [
        { weight: 3, text: 'Deux heures, un doigt coincé, une bière partagée. Vous vous saluez différemment désormais.', tone: 'good', effects: { stats: { karma: 8, happiness: 5, fitness: 1 }, special: 'newFriend' } },
        { weight: 1, text: 'Le meuble s’effondre dans l’escalier. Personne n’est blessé, mais l’ambiance est étrange.', tone: 'neutral', effects: { stats: { karma: 5, happiness: -2 } } },
      ] },
      { label: 'Inventer une excuse', outcomes: [{ text: 'Tu prétends attendre un appel important. Il n’insiste pas.', tone: 'neutral', effects: { stats: { karma: -4 } } }] },
    ],
  }),
  ev({
    id: 'ev_bad_night', kind: 'health', icon: '🌙', title: 'Une mauvaise passe', weight: 30,
    cond: { minAge: 16, maxStat: { happiness: 45 } },
    text: 'Depuis des semaines, tu te réveilles à quatre heures du matin sans raison, et la journée n’arrange rien.',
    choices: [
      { label: 'En parler à quelqu’un', outcomes: [{ text: 'Tu poses des mots dessus pour la première fois. Ça ne règle rien, et pourtant ça allège.', tone: 'good', effects: { stats: { happiness: 10, stress: -12 } } }] },
      { label: 'Consulter', outcomes: [{ text: 'Quelques séances suffisent à identifier ce qui coince.', tone: 'good', effects: { money: -400, stats: { happiness: 12, stress: -16, intelligence: 2 } } }] },
      { label: 'Serrer les dents', outcomes: [
        { weight: 2, text: 'Ça finit par passer tout seul, au bout de plusieurs mois.', tone: 'neutral', effects: { stats: { stress: 6, health: -3 } } },
        { weight: 3, text: 'Ça ne passe pas. Ça s’installe.', tone: 'bad', effects: { stats: { happiness: -8 }, special: 'illness', specialArg: 'depression' } },
      ] },
    ],
  }),
  ev({
    id: 'ev_second_hand', kind: 'money', icon: '🪑', title: 'Une trouvaille', weight: 26,
    cond: { minAge: 16, minMoney: 100 },
    text: 'Dans une brocante, un objet poussiéreux te fait de l’œil. Le vendeur en demande trois fois rien.',
    choices: [
      { label: 'L’acheter', requiresMoney: 100, outcomes: [
        { weight: 1, text: 'C’était une pièce rare. Un antiquaire t’en propose cent fois le prix.', tone: 'good', effects: { money: 4200, stats: { happiness: 16, intelligence: 3 } } },
        { weight: 4, text: 'C’est joli, et ça ne vaut rien. Tu l’aimes bien quand même.', tone: 'neutral', effects: { money: -60, stats: { happiness: 4 } } },
      ] },
      { label: 'Se contenter de regarder', outcomes: [{ text: 'Tu reposes l’objet et tu continues ton chemin.', tone: 'neutral', effects: { stats: { discipline: 2 } } }] },
    ],
  }),
  ev({
    id: 'ev_stranger_help', kind: 'random', icon: '🚑', title: 'Un malaise dans la rue', weight: 22,
    cond: { minAge: 14 },
    text: 'Une personne s’effondre à quelques mètres de toi. Les passants ralentissent sans s’arrêter.',
    choices: [
      { label: 'Intervenir', outcomes: [
        { weight: 4, text: 'Tu appelles les secours et tu restes jusqu’à leur arrivée. Ça a compté.', tone: 'good', effects: { stats: { karma: 16, happiness: 6, stress: 8, reputation: 4 } } },
        { weight: 1, text: 'Tu interviens, mais il est trop tard. Tu y repenseras longtemps.', tone: 'bad', effects: { stats: { karma: 12, happiness: -12, stress: 18 } } },
      ] },
      { label: 'Appeler les secours et partir', outcomes: [{ text: 'Tu composes le numéro et tu continues ta route. C’est déjà mieux que rien.', tone: 'neutral', effects: { stats: { karma: 6 } } }] },
      { label: 'Ne pas s’arrêter', outcomes: [{ text: 'Quelqu’un d’autre le fera. Cette pensée te suit jusqu’au soir.', tone: 'bad', effects: { stats: { karma: -10, happiness: -6 } } }] },
    ],
  }),
  ev({
    id: 'ev_bill_error', kind: 'money', icon: '📄', title: 'Une facture aberrante', weight: 28,
    cond: { minAge: 18 },
    text: 'Ta facture d’énergie est cinq fois plus élevée que d’habitude. Le service client est injoignable.',
    choices: [
      { label: 'Insister jusqu’au bout', outcomes: [
        { weight: 4, text: 'Après six appels et deux courriers, l’erreur est reconnue et remboursée.', tone: 'good', effects: { stats: { discipline: 6, stress: 10, happiness: 3 } } },
        { weight: 2, text: 'Personne ne cède. Tu paies, en rage.', tone: 'bad', effects: { moneyPct: -0.03, stats: { stress: 14, happiness: -6 } } },
      ] },
      { label: 'Payer et passer à autre chose', outcomes: [{ text: 'Tu paies pour ne plus y penser. C’est cher, mais ta soirée est libre.', tone: 'neutral', effects: { moneyPct: -0.03, stats: { stress: -2 } } }] },
    ],
  }),
  ev({
    id: 'ev_new_skill', kind: 'life', icon: '🧑‍🍳', title: 'Apprendre quelque chose', weight: 26,
    cond: { minAge: 14 },
    text: 'Tu tombes sur un cours en ligne gratuit dans un domaine qui n’a rien à voir avec ta vie.',
    choices: [
      { label: 'Aller jusqu’au bout', outcomes: [
        { weight: 3, text: 'Trois mois plus tard, tu maîtrises quelque chose de complètement nouveau.', tone: 'good', effects: { stats: { intelligence: 6, discipline: 6, happiness: 6 } } },
        { weight: 2, text: 'Tu abandonnes au tiers du programme. Ce n’est pas la première fois.', tone: 'neutral', effects: { stats: { intelligence: 2, discipline: -3 } } },
      ] },
      { label: 'Fermer l’onglet', outcomes: [{ text: 'Tu l’ajoutes aux favoris. Il y rejoint les quarante autres.', tone: 'neutral', effects: {} }] },
    ],
  }),
  ev({
    id: 'ev_weather', kind: 'random', icon: '⛈️', title: 'Pris sous l’orage', weight: 24,
    cond: { minAge: 8 },
    text: 'L’averse tombe sans prévenir, à vingt minutes de chez toi, sans parapluie.',
    choices: [
      { label: 'Courir sous la pluie', outcomes: [
        { weight: 3, text: 'Tu rentres trempé et hilare. Rien de tel depuis des années.', tone: 'good', effects: { stats: { happiness: 8, fitness: 2, health: -2 } } },
        { weight: 2, text: 'Tu rentres trempé et tu tombes malade dans la semaine.', tone: 'bad', effects: { stats: { happiness: -3 }, special: 'illness', specialArg: 'cold' } },
      ] },
      { label: 'S’abriter et attendre', outcomes: [{ text: 'Une heure sous un porche, à regarder l’eau couler. Étrangement reposant.', tone: 'neutral', effects: { stats: { stress: -6, happiness: 3 } } }] },
    ],
  }),
  ev({
    id: 'ev_family_reunion', kind: 'family', icon: '🍽️', title: 'Réunion de famille', weight: 26,
    cond: { minAge: 12 },
    text: 'Toute la famille se retrouve pour un déjeuner qui va durer six heures.',
    choices: [
      { label: 'Jouer le jeu', outcomes: [{ text: 'Tu écoutes les mêmes histoires pour la vingtième fois, et cette fois tu les apprécies.', tone: 'good', effects: { stats: { happiness: 8, karma: 4 } } }] },
      { label: 'Rester en retrait', outcomes: [{ text: 'Tu passes l’après-midi sur ton téléphone au bout de la table.', tone: 'neutral', effects: { stats: { happiness: -2, stress: 4 } } }] },
      { label: 'Repartir tôt', outcomes: [{ text: 'Tu inventes une obligation. Personne n’est dupe, personne ne dit rien.', tone: 'bad', effects: { stats: { happiness: 1, karma: -4 } } }] },
    ],
  }),
  ev({
    id: 'ev_generosity', kind: 'money', icon: '🥖', title: 'Devant la boulangerie', weight: 26,
    cond: { minAge: 12, minMoney: 20 },
    text: 'Quelqu’un demande de quoi manger devant la boulangerie. Tu as de la monnaie dans la poche.',
    choices: [
      { label: 'Offrir un repas', requiresMoney: 20, outcomes: [{ text: 'Vous discutez cinq minutes. Il te raconte comment il en est arrivé là.', tone: 'good', effects: { money: -15, stats: { karma: 12, happiness: 6 } } }] },
      { label: 'Donner une pièce', outcomes: [{ text: 'Tu donnes ce que tu as en poche, sans t’arrêter.', tone: 'neutral', effects: { money: -3, stats: { karma: 5 } } }] },
      { label: 'Passer', outcomes: [{ text: 'Tu regardes ailleurs en poussant la porte.', tone: 'neutral', effects: { stats: { karma: -3 } } }] },
    ],
  }),
  ev({
    id: 'ev_lost_object', kind: 'random', icon: '🔑', title: 'Perdu', weight: 26,
    cond: { minAge: 12 },
    text: 'Tu as perdu quelque chose d’important. Tu as retourné l’appartement deux fois.',
    choices: [
      { label: 'Refaire le trajet de la veille', outcomes: [
        { weight: 3, text: 'Retrouvé, dans la poche d’une veste que tu n’avais pas fouillée.', tone: 'good', effects: { stats: { happiness: 6, stress: -4, intelligence: 1 } } },
        { weight: 2, text: 'Rien. Il faut tout refaire, et ça coûte.', tone: 'bad', effects: { money: -180, stats: { stress: 12, happiness: -5 } } },
      ] },
      { label: 'Tout remplacer directement', outcomes: [{ text: 'Tu tires un trait dessus et tu rachètes. La tranquillité a un prix.', tone: 'neutral', effects: { money: -220, stats: { stress: -3 } } }] },
    ],
  }),
  ev({
    id: 'ev_pet_street', kind: 'random', icon: '🐦', title: 'Un oiseau contre la vitre', weight: 20,
    cond: { minAge: 8 },
    text: 'Un oiseau vient de percuter ta fenêtre. Il est vivant, mais sonné, sur le rebord.',
    choices: [
      { label: 'Le mettre à l’abri', outcomes: [
        { weight: 3, text: 'Une heure dans une boîte à chaussures, puis il repart. Tu le regardes partir.', tone: 'good', effects: { stats: { karma: 8, happiness: 6 } } },
        { weight: 2, text: 'Il ne s’en remet pas. Tu l’enterres dans un pot de fleurs.', tone: 'bad', effects: { stats: { karma: 6, happiness: -4 } } },
      ] },
      { label: 'Le laisser récupérer seul', outcomes: [{ text: 'Une demi-heure plus tard, le rebord est vide. Tu ne sauras jamais.', tone: 'neutral', effects: {} }] },
    ],
  }),
  ev({
    id: 'ev_reconnect', kind: 'random', icon: '📮', title: 'Un vieux numéro', weight: 24,
    cond: { minAge: 22 },
    text: 'Tu retrouves le numéro de quelqu’un que tu as laissé filer, sans dispute, juste par négligence.',
    choices: [
      { label: 'Appeler', outcomes: [
        { weight: 3, text: 'La conversation reprend comme si trois ans ne s’étaient pas écoulés.', tone: 'good', effects: { stats: { happiness: 12, karma: 5 }, special: 'newFriend' } },
        { weight: 2, text: 'Le numéro n’est plus attribué. Fin de l’histoire.', tone: 'bad', effects: { stats: { happiness: -6 } } },
      ] },
      { label: 'Écrire un message', outcomes: [
        { weight: 3, text: 'Réponse trois jours plus tard, chaleureuse. Vous prévoyez de vous voir.', tone: 'good', effects: { stats: { happiness: 8 }, special: 'newFriend' } },
        { weight: 2, text: 'Message lu. Jamais répondu.', tone: 'bad', effects: { stats: { happiness: -7 } } },
      ] },
      { label: 'Ranger le numéro', outcomes: [{ text: 'Tu refermes le carnet. Certaines pages restent tournées.', tone: 'neutral', effects: { stats: { happiness: -2 } } }] },
    ],
  }),
  ev({
    id: 'ev_moral_test', kind: 'money', icon: '🧮', title: 'Une erreur en ta faveur', weight: 24,
    cond: { minAge: 16 },
    text: 'Le commerçant s’est trompé en te rendant la monnaie. Largement en ta faveur. Il ne s’en est pas aperçu.',
    choices: [
      { label: 'Le signaler', outcomes: [{ text: 'Il te remercie longuement et t’offre quelque chose. Tu repars plus riche que si tu avais gardé l’argent.', tone: 'good', effects: { stats: { karma: 12, happiness: 6, reputation: 3 } } }] },
      { label: 'Ne rien dire', outcomes: [
        { weight: 3, text: 'Tu empoches la différence. Personne ne le saura jamais.', tone: 'neutral', effects: { money: 45, stats: { karma: -8 } } },
        { weight: 2, text: 'Il s’en rend compte et te rattrape dans la rue. Le moment est très inconfortable.', tone: 'bad', effects: { stats: { karma: -8, reputation: -6, happiness: -8 } } },
      ] },
    ],
  }),
  ev({
    id: 'ev_night_noise', kind: 'random', icon: '🚨', title: 'Trois heures du matin', weight: 22,
    cond: { minAge: 16 },
    text: 'Un fracas dans la rue te réveille. Par la fenêtre, tu vois quelqu’un forcer une voiture.',
    choices: [
      { label: 'Appeler la police', outcomes: [
        { weight: 3, text: 'Une patrouille arrive en quatre minutes. Tu ne sauras jamais la suite.', tone: 'good', effects: { stats: { karma: 8, stress: 8 } } },
        { weight: 2, text: 'Le temps que quelqu’un arrive, il n’y a plus personne.', tone: 'neutral', effects: { stats: { karma: 4, stress: 10 } } },
      ] },
      { label: 'Crier par la fenêtre', outcomes: [
        { weight: 3, text: 'La personne détale immédiatement.', tone: 'good', effects: { stats: { karma: 6, happiness: 4 } } },
        { weight: 2, text: 'La personne lève les yeux vers ta fenêtre, longuement. Tu dors mal pendant un mois.', tone: 'bad', effects: { stats: { stress: 20, happiness: -8 } } },
      ] },
      { label: 'Retourner se coucher', outcomes: [{ text: 'Ce n’est pas ta voiture. Tu remets l’oreiller sur ta tête.', tone: 'neutral', effects: { stats: { karma: -4 } } }] },
    ],
  }),
  ev({
    id: 'ev_body_signal', kind: 'health', icon: '🫀', title: 'Un signal', weight: 24,
    cond: { minAge: 30 },
    text: 'Tu montes deux étages et tu es essoufflé comme jamais. Ce n’était pas le cas l’an dernier.',
    choices: [
      { label: 'Se reprendre en main', outcomes: [{ text: 'Marche quotidienne, moins d’écrans le soir. En six mois, la différence est nette.', tone: 'good', effects: { stats: { fitness: 10, health: 6, happiness: 4, discipline: 5 } } }] },
      { label: 'Faire un bilan médical', outcomes: [{ text: 'Rien de grave, mais le médecin est très clair sur ce qui arrivera si rien ne change.', tone: 'neutral', effects: { money: -140, stats: { health: 3, stress: 6, discipline: 3 } } }] },
      { label: 'Mettre ça sur le compte de la fatigue', outcomes: [{ text: 'Tu prends l’ascenseur, désormais.', tone: 'bad', effects: { stats: { fitness: -5, health: -4 } } }] },
    ],
  }),
  ev({
    id: 'ev_boredom', kind: 'life', icon: '🛋️', title: 'Un dimanche vide', weight: 26,
    cond: { minAge: 16 },
    text: 'Rien de prévu, personne à voir, rien à faire. Toute la journée devant toi.',
    choices: [
      { label: 'Sortir marcher sans but', outcomes: [{ text: 'Quatre heures dans des rues que tu ne connaissais pas. Tu rentres différent.', tone: 'good', effects: { stats: { happiness: 7, fitness: 3, stress: -10 } } }] },
      { label: 'Appeler quelqu’un', outcomes: [
        { weight: 3, text: 'Vous improvisez quelque chose. La meilleure journée du mois.', tone: 'good', effects: { stats: { happiness: 10, stress: -8 } } },
        { weight: 2, text: 'Personne ne décroche. Tu ranges le téléphone.', tone: 'bad', effects: { stats: { happiness: -6 } } },
      ] },
      { label: 'Ne rien faire du tout', outcomes: [{ text: 'Écrans, siestes, grignotage. La journée disparaît sans laisser de trace.', tone: 'neutral', effects: { stats: { happiness: 1, fitness: -2, stress: -4 } } }] },
    ],
  }),
  ev({
    id: 'ev_petty_theft_victim', kind: 'crime', icon: '🎒', title: 'Volé', weight: 22,
    cond: { minAge: 12 },
    text: 'Ton sac a disparu pendant que tu avais le dos tourné. Tout ce qu’il contenait est parti avec.',
    choices: [
      { label: 'Porter plainte', outcomes: [{ text: 'Une heure au commissariat pour une main courante. Tu ne reverras rien.', tone: 'bad', effects: { money: -200, stats: { stress: 12, happiness: -8 } } }] },
      { label: 'Refaire les papiers et oublier', outcomes: [{ text: 'Trois administrations, deux semaines, et l’affaire est classée.', tone: 'bad', effects: { money: -160, stats: { stress: 10, happiness: -5, discipline: 3 } } }] },
    ],
  }),
  ev({
    id: 'ev_neighbourhood_change', kind: 'life', icon: '🏗️', title: 'Le quartier change', weight: 20,
    cond: { minAge: 20 },
    text: 'Le café où tu allais depuis des années ferme. À la place, quelque chose de neuf et de cher.',
    choices: [
      { label: 'S’adapter', outcomes: [{ text: 'Tu finis par prendre tes habitudes ailleurs. C’est très bien aussi.', tone: 'neutral', effects: { stats: { happiness: 2 } } }] },
      { label: 'Envisager de déménager', outcomes: [{ text: 'Tu regardes des annonces pendant deux semaines, puis tu laisses tomber.', tone: 'neutral', effects: { stats: { happiness: -4, stress: 6 } } }] },
      { label: 'S’impliquer dans le quartier', outcomes: [{ text: 'Réunions, associations, pétitions. Tu connais désormais tout le monde.', tone: 'good', effects: { stats: { happiness: 8, reputation: 8, karma: 6 }, special: 'newFriend' } }] },
    ],
  }),
  ev({
    id: 'ev_favor_asked', kind: 'random', icon: '📦', title: 'Un service à rendre', weight: 24,
    cond: { minAge: 18 }, target: ['friend', 'bestFriend', 'brother', 'sister', 'coworker'],
    text: '{name} te demande de garder quelque chose chez toi « quelques semaines ». {il} reste vague sur le contenu.',
    choices: [
      { label: 'Accepter sans poser de question', outcomes: [
        { weight: 3, text: 'C’étaient des cartons de déménagement. Ils restent huit mois.', tone: 'neutral', effects: { rel: 8, stats: { stress: 5 } } },
        { weight: 1, text: 'Tu découvres plus tard ce que c’était. Tu ne le reproposeras pas.', tone: 'bad', effects: { rel: -12, stats: { stress: 14, criminality: 4 } } },
      ] },
      { label: 'Demander ce que c’est', outcomes: [
        { weight: 3, text: '{name} explique franchement. Rien de gênant, et tu acceptes en connaissance de cause.', tone: 'good', effects: { rel: 12, opinion: 10, stats: { intelligence: 2 } } },
        { weight: 2, text: '{name} se braque. La question elle-même était la réponse.', tone: 'neutral', effects: { rel: -8, stats: { intelligence: 4 } } },
      ] },
      { label: 'Refuser', outcomes: [{ text: 'Tu dis non sans te justifier. {name} trouvera quelqu’un d’autre.', tone: 'neutral', effects: { rel: -6, stats: { discipline: 4 } } }] },
    ],
  }),
  ev({
    id: 'ev_anniversary_self', kind: 'life', icon: '🎂', title: 'Ton anniversaire', weight: 22,
    cond: { minAge: 18 },
    text: 'C’est ton anniversaire. Personne n’a rien prévu, et tu n’as rien organisé non plus.',
    choices: [
      { label: 'Se faire plaisir seul', requiresMoney: 60, outcomes: [{ text: 'Bon restaurant, table pour un, livre ouvert. Une soirée étonnamment douce.', tone: 'good', effects: { money: -60, stats: { happiness: 9, stress: -8 } } }] },
      { label: 'Envoyer un message à tout le monde', outcomes: [
        { weight: 3, text: 'Six personnes débarquent dans la soirée avec de quoi improviser.', tone: 'good', effects: { stats: { happiness: 14, reputation: 4 } } },
        { weight: 2, text: 'Trois réponses polies, aucune présence. La soirée est longue.', tone: 'bad', effects: { stats: { happiness: -10 } } },
      ] },
      { label: 'Ne rien faire', outcomes: [{ text: 'Une journée comme une autre. Tu comptes quand même les messages reçus.', tone: 'neutral', effects: { stats: { happiness: -3 } } }] },
    ],
  }),
  ev({
    id: 'ev_online_purchase', kind: 'money', icon: '📦', title: 'Achat en ligne', weight: 22,
    cond: { minAge: 16, minMoney: 200 },
    text: 'Tu hésites depuis deux semaines sur un achat dont tu n’as pas vraiment besoin. Il est en promotion aujourd’hui.',
    choices: [
      { label: 'Craquer', requiresMoney: 200, outcomes: [
        { weight: 3, text: 'Livré en trois jours. Tu t’en sers beaucoup plus que prévu.', tone: 'good', effects: { money: -180, stats: { happiness: 7 } } },
        { weight: 2, text: 'Livré en trois jours. Rangé dans un placard en trois semaines.', tone: 'neutral', effects: { money: -180, stats: { happiness: 2, discipline: -3 } } },
      ] },
      { label: 'Attendre une semaine de plus', outcomes: [{ text: 'Au bout d’une semaine, l’envie est passée. Tu as économisé sans effort.', tone: 'good', effects: { stats: { discipline: 7, happiness: 3 } } }] },
    ],
  }),
  ev({
    id: 'ev_confrontation', kind: 'random', icon: '😤', title: 'Un accrochage', weight: 22,
    cond: { minAge: 16 },
    text: 'Un inconnu te bouscule violemment et te lance quelque chose de désagréable sans s’arrêter.',
    choices: [
      { label: 'Répliquer', outcomes: [
        { weight: 2, text: 'Un échange bref et vif, puis chacun repart de son côté.', tone: 'neutral', effects: { stats: { stress: 10, happiness: -2 } } },
        { weight: 2, text: 'Ça dégénère. Tu récupères un œil au beurre noir et beaucoup de regrets.', tone: 'bad', effects: { stats: { health: -8, stress: 16, happiness: -8, criminality: 3 } } },
      ] },
      { label: 'Ignorer', outcomes: [{ text: 'Tu continues ton chemin. Trente secondes plus tard, tu as déjà oublié.', tone: 'good', effects: { stats: { discipline: 6, stress: 3 } } }] },
    ],
  }),
  ev({
    id: 'ev_civic', kind: 'life', icon: '🗳️', title: 'Jour d’élection', weight: 20,
    cond: { minAge: 18 },
    text: 'Il y a une élection ce week-end. Le bureau de vote est à dix minutes à pied.',
    choices: [
      { label: 'Aller voter', outcomes: [{ text: 'Dix minutes de file, un rideau, une enveloppe. Tu ressors avec quelque chose de satisfaisant.', tone: 'good', effects: { stats: { karma: 6, happiness: 3, reputation: 2 } } }] },
      { label: 'S’abstenir', outcomes: [{ text: 'Tu restes chez toi. Tu commenteras les résultats quand même.', tone: 'neutral', effects: { stats: { karma: -2 } } }] },
      { label: 'S’engager dans la campagne', outcomes: [
        { weight: 3, text: 'Tracts, réunions, portes fermées au nez. Tu rencontres beaucoup de monde.', tone: 'good', effects: { stats: { reputation: 9, karma: 5, stress: 8 }, special: 'newFriend' } },
        { weight: 2, text: 'Ton camp perd largement. Tu as beaucoup donné pour rien.', tone: 'bad', effects: { stats: { happiness: -8, stress: 10, reputation: 3 } } },
      ] },
    ],
  }),
  ev({
    id: 'ev_neighbour_dispute', kind: 'random', icon: '🌳', title: 'Une histoire de branches', weight: 20,
    cond: { minAge: 22 },
    text: 'Un litige stupide s’envenime avec le voisinage : des branches, une haie, une limite mal placée.',
    choices: [
      { label: 'Proposer un arrangement', outcomes: [
        { weight: 4, text: 'Une discussion et un café réglent en dix minutes ce qui pourrissait depuis six mois.', tone: 'good', effects: { stats: { happiness: 6, karma: 5, stress: -8 } } },
        { weight: 1, text: 'La proposition est prise pour un aveu de faiblesse. Rien n’avance.', tone: 'neutral', effects: { stats: { stress: 8 } } },
      ] },
      { label: 'Faire appel à un professionnel', outcomes: [{ text: 'Un géomètre tranche. Tu avais raison, et ça t’a coûté plus cher que le litige.', tone: 'neutral', effects: { money: -650, stats: { stress: 6, happiness: 2 } } }] },
      { label: 'Camper sur ses positions', outcomes: [{ text: 'Deux ans de bonjours glacials par-dessus la haie.', tone: 'bad', effects: { stats: { stress: 12, happiness: -8, karma: -4 } } }] },
    ],
  }),
  ev({
    id: 'ev_late_night_idea', kind: 'life', icon: '💡', title: 'Une idée à deux heures du matin', weight: 20,
    cond: { minAge: 18 },
    text: 'Une idée te réveille en pleine nuit. Sur le moment, elle paraît absolument géniale.',
    choices: [
      { label: 'La noter et y travailler', outcomes: [
        { weight: 2, text: 'Au réveil, elle tient toujours debout. Tu commences quelque chose.', tone: 'good', effects: { stats: { intelligence: 5, happiness: 8, discipline: 4 }, flag: 'sideProject' } },
        { weight: 3, text: 'Au réveil, c’est illisible et ça n’a aucun sens.', tone: 'neutral', effects: { stats: { happiness: 2, health: -1 } } },
      ] },
      { label: 'Se rendormir', outcomes: [{ text: 'Tu te rendors immédiatement et tu ne t’en souviendras jamais.', tone: 'neutral', effects: { stats: { health: 2 } } }] },
    ],
  }),
];
