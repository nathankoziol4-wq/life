/** Événements de fin de vie, de prison et situations diverses. */

import { ev, type GameEvent } from './types.ts';

export const SENIOR_EVENTS: GameEvent[] = [
  ev({
    id: 'sn_retirement_boredom', kind: 'life', icon: '🪑', title: 'Le vide', weight: 28,
    cond: { minAge: 62, retired: true },
    text: 'Cela fait six mois que tu ne travailles plus. Les journées sont longues et bizarrement identiques.',
    choices: [
      { label: 'Reprendre une activité bénévole', outcomes: [{ text: 'Trois demi-journées par semaine, et le sentiment d’être utile revient.', tone: 'good', effects: { stats: { happiness: 14, karma: 10, health: 3, fitness: 2 } } }] },
      { label: 'Se lancer dans un projet personnel', outcomes: [{ text: 'Jardin, écriture, atelier — peu importe. Tu retrouves une raison de te lever tôt.', tone: 'good', effects: { stats: { happiness: 12, intelligence: 4, discipline: 5 } } }] },
      { label: 'Voyager', requiresMoney: 6000, outcomes: [{ text: 'Tu vois enfin les endroits que tu remettais toujours à plus tard.', tone: 'good', effects: { money: -6000, stats: { happiness: 18, health: 2, intelligence: 5 } } }] },
      { label: 'Ne rien faire', outcomes: [{ text: 'La télévision tourne du matin au soir. Les mois se ressemblent.', tone: 'bad', effects: { stats: { happiness: -10, health: -6, fitness: -6, intelligence: -3 } } }] },
    ],
  }),
  ev({
    id: 'sn_fall', kind: 'health', icon: '🩹', title: 'Une chute', weight: 30,
    cond: { minAge: 68 },
    text: 'Un tapis mal posé, un instant d’inattention, et te voilà par terre dans le couloir.',
    choices: [
      { label: 'Appeler immédiatement', outcomes: [
        { weight: 3, text: 'Rien de cassé. On te garde en observation une nuit, par précaution.', tone: 'neutral', effects: { money: -280, stats: { health: -5, stress: 8 } } },
        { weight: 2, text: 'Fracture du col du fémur. La rééducation prendra des mois.', tone: 'bad', effects: { stats: { health: -16, fitness: -18, happiness: -10 }, special: 'illness', specialArg: 'fracture' } },
      ] },
      { label: 'Se relever et ne rien dire', outcomes: [
        { weight: 2, text: 'Ça passe au bout de quelques jours.', tone: 'neutral', effects: { stats: { health: -4, fitness: -3 } } },
        { weight: 3, text: 'La blessure s’aggrave faute de soins.', tone: 'bad', effects: { stats: { health: -14, fitness: -14, happiness: -8 } } },
      ] },
    ],
  }),
  ev({
    id: 'sn_memory', kind: 'health', icon: '🧩', title: 'Des oublis', weight: 24,
    cond: { minAge: 70 },
    text: 'Tu as oublié le prénom d’un voisin que tu connais depuis vingt ans. Ce n’est pas la première fois cette année.',
    choices: [
      { label: 'Consulter', outcomes: [
        { weight: 3, text: 'Un bilan rassurant : rien d’anormal pour ton âge.', tone: 'good', effects: { money: -180, stats: { stress: -8, happiness: 5 } } },
        { weight: 2, text: 'Le diagnostic tombe. Le suivi commence tôt, ce qui change beaucoup de choses.', tone: 'bad', effects: { money: -180, stats: { happiness: -12 }, special: 'illness', specialArg: 'alzheimer' } },
      ] },
      { label: 'Faire des exercices de mémoire', outcomes: [{ text: 'Mots croisés, lectures, cartes. Ça n’arrête pas le temps, mais ça aide.', tone: 'good', effects: { stats: { intelligence: 4, happiness: 4, discipline: 3 } } }] },
      { label: 'Ne pas s’inquiéter', outcomes: [{ text: 'Tu mets ça sur le compte de la fatigue.', tone: 'neutral', effects: { stats: { happiness: 2, intelligence: -2 } } }] },
    ],
  }),
  ev({
    id: 'sn_will', kind: 'money', icon: '📜', title: 'Mettre de l’ordre', weight: 24,
    cond: { minAge: 65, minMoney: 10000, lacksFlag: 'willDone' },
    text: 'Un notaire te suggère de formaliser tes dernières volontés pendant que tout est encore simple.',
    choices: [
      { label: 'Rédiger un testament détaillé', outcomes: [{ text: 'Tout est écrit noir sur blanc. Tes proches n’auront pas à se déchirer.', tone: 'good', effects: { money: -450, stats: { karma: 10, stress: -12, happiness: 5 }, flag: 'willDone' } }] },
      { label: 'Remettre à plus tard', outcomes: [{ text: 'Tu repousses. Comme la dernière fois.', tone: 'neutral', effects: { stats: { stress: 4 } } }] },
    ],
  }),
  ev({
    id: 'sn_grandkids_visit', kind: 'family', icon: '🧒', title: 'Une visite', weight: 26,
    cond: { minAge: 60, hasChildren: true },
    text: 'Tes petits-enfants passent le week-end. La maison n’a pas été aussi bruyante depuis trente ans.',
    choices: [
      { label: 'Sortir les vieux albums', outcomes: [{ text: 'Ils posent mille questions et tu racontes tout. Ils s’en souviendront.', tone: 'good', effects: { stats: { happiness: 16, karma: 6, health: 2 } } }] },
      { label: 'Les emmener dehors', outcomes: [{ text: 'Parc, glaces, genoux écorchés. Tu es épuisé et ravi.', tone: 'good', effects: { stats: { happiness: 14, fitness: 3, health: 2 } } }] },
      { label: 'Écourter le week-end', outcomes: [{ text: 'C’était beaucoup pour toi. Tu les raccompagnes le samedi soir.', tone: 'neutral', effects: { stats: { happiness: -2, stress: -6 } } }] },
    ],
  }),
  ev({
    id: 'sn_old_friend_death', kind: 'life', icon: '🕯️', title: 'Un enterrement', weight: 26,
    cond: { minAge: 60 },
    text: 'Un ami de longue date est mort. Vous vous connaissiez depuis quarante ans.',
    choices: [
      { label: 'Prononcer quelques mots', outcomes: [{ text: 'Tu parles cinq minutes et toute l’assemblée pleure. C’était juste.', tone: 'neutral', effects: { stats: { happiness: -10, karma: 8, stress: 8 } } }] },
      { label: 'Rester en retrait', outcomes: [{ text: 'Tu restes au fond de l’église. Tu pars avant le café.', tone: 'bad', effects: { stats: { happiness: -12, stress: 10 } } }] },
      { label: 'Appeler tous ceux qui restent', outcomes: [{ text: 'Tu passes la semaine au téléphone. Certaines amitiés reprennent vie.', tone: 'good', effects: { stats: { happiness: -4, karma: 8 }, special: 'newFriend' } }] },
    ],
  }),
  ev({
    id: 'sn_downsize', kind: 'asset', icon: '📦', title: 'Trop grand pour un seul', weight: 20,
    cond: { minAge: 68, hasProperty: true },
    text: 'La maison est immense, l’escalier devient difficile et le chauffage coûte une fortune.',
    choices: [
      { label: 'Vendre et prendre plus petit', outcomes: [{ text: 'Un appartement de plain-pied, moins de charges, plus de tranquillité.', tone: 'good', effects: { stats: { happiness: 8, stress: -12, health: 3 } } }] },
      { label: 'Rester coûte que coûte', outcomes: [{ text: 'C’est chez toi. Tant pis pour l’escalier.', tone: 'neutral', effects: { stats: { happiness: 5, health: -4, fitness: -3 } } }] },
    ],
  }),
];

export const PRISON_EVENTS: GameEvent[] = [
  ev({
    id: 'pr_new_inmate', kind: 'crime', icon: '🚪', title: 'Premier jour', weight: 40,
    cond: { inPrison: true },
    text: 'La porte se referme. Une trentaine de regards évaluent ce que tu vaux, en quelques secondes.',
    choices: [
      { label: 'Regarder droit devant', outcomes: [
        { weight: 3, text: 'On te laisse tranquille. Pour l’instant.', tone: 'neutral', effects: { stats: { stress: 12, reputation: 3 } } },
        { weight: 2, text: 'Quelqu’un teste ta réaction dès le premier soir.', tone: 'bad', effects: { stats: { health: -8, stress: 18, happiness: -10 } } },
      ] },
      { label: 'Chercher un allié tout de suite', outcomes: [
        { weight: 2, text: 'Tu tombes sur quelqu’un de correct. Ça change tout.', tone: 'good', effects: { stats: { stress: -6, criminality: 4 }, special: 'newFriend' } },
        { weight: 3, text: 'Tu tombes sur le mauvais interlocuteur. Tu lui dois désormais quelque chose.', tone: 'bad', effects: { stats: { stress: 16, criminality: 6, happiness: -8 } } },
      ] },
    ],
  }),
  ev({
    id: 'pr_contraband', kind: 'crime', icon: '📦', title: 'Un service à rendre', weight: 34,
    cond: { inPrison: true },
    text: 'Un détenu te demande de garder un objet interdit dans ta cellule pendant quelques jours.',
    choices: [
      { label: 'Accepter', outcomes: [
        { weight: 3, text: 'Rien ne se passe. Tu gagnes en crédit auprès des autres.', tone: 'neutral', effects: { stats: { reputation: 6, criminality: 6, stress: 12 } } },
        { weight: 2, text: 'Fouille surprise. Ta peine est allongée.', tone: 'bad', effects: { stats: { happiness: -16, stress: 20 }, flag: 'prisonExtra' } },
      ] },
      { label: 'Refuser', outcomes: [
        { weight: 3, text: 'Tu refuses poliment. On te met à l’écart, ce qui te va très bien.', tone: 'neutral', effects: { stats: { reputation: -4, discipline: 6 } } },
        { weight: 2, text: 'Ton refus est mal pris. Les semaines suivantes sont tendues.', tone: 'bad', effects: { stats: { stress: 16, health: -6 } } },
      ] },
      { label: 'Prévenir un surveillant', outcomes: [
        { weight: 3, text: 'Ton comportement est noté positivement au dossier. Mais dans la cour, tout se sait.', tone: 'neutral', effects: { stats: { reputation: -12, karma: 5, stress: 18 }, flag: 'prisonInformer' } },
      ] },
    ],
  }),
  ev({
    id: 'pr_visit', kind: 'family', icon: '🪑', title: 'Parloir', weight: 32,
    cond: { inPrison: true },
    text: 'Quelqu’un a fait la route pour venir te voir. Quarante-cinq minutes, une table, deux chaises.',
    choices: [
      { label: 'Parler de l’avenir', outcomes: [{ text: 'Vous faites des projets pour après. Ça tient chaud pendant des mois.', tone: 'good', effects: { stats: { happiness: 14, stress: -12 } } }] },
      { label: 'Demander de l’argent', outcomes: [{ text: 'La visite se termine mal. Tu regrettes aussitôt.', tone: 'bad', effects: { stats: { happiness: -10, karma: -5 }, money: 200 } }] },
      { label: 'Pleurer', outcomes: [{ text: 'Tu craques complètement. Étrangement, ça libère quelque chose.', tone: 'neutral', effects: { stats: { happiness: 4, stress: -16 } } }] },
    ],
  }),
  ev({
    id: 'pr_fight', kind: 'crime', icon: '💢', title: 'Altercation dans la cour', weight: 30,
    cond: { inPrison: true },
    text: 'Un détenu te bouscule volontairement devant tout le monde. Tout s’arrête.',
    choices: [
      { label: 'Riposter', outcomes: [
        { weight: 2, text: 'Tu prends le dessus. On ne t’embêtera plus, mais tu passes au mitard.', tone: 'neutral', effects: { stats: { reputation: 12, health: -8, happiness: -6, criminality: 6 } } },
        { weight: 3, text: 'Tu prends une correction et une sanction disciplinaire.', tone: 'bad', effects: { stats: { health: -16, reputation: -8, happiness: -14 }, flag: 'prisonExtra' } },
      ] },
      { label: 'Ne pas réagir', outcomes: [
        { weight: 3, text: 'Tu encaisses. Ta conduite reste irréprochable au dossier.', tone: 'neutral', effects: { stats: { reputation: -6, stress: 14, discipline: 8 } } },
      ] },
      { label: 'Appeler un surveillant', outcomes: [{ text: 'L’incident est arrêté net. Ta réputation dans la cour aussi.', tone: 'neutral', effects: { stats: { reputation: -14, health: 0, discipline: 5 } } }] },
    ],
  }),
  ev({
    id: 'pr_study', kind: 'school', icon: '📚', title: 'Formation en détention', weight: 28,
    cond: { inPrison: true },
    text: 'L’administration propose une formation diplômante. Peu de détenus s’inscrivent.',
    choices: [
      { label: 'S’inscrire', outcomes: [{ text: 'Deux heures par jour dans une salle calme. Tu y prends goût.', tone: 'good', effects: { stats: { intelligence: 8, discipline: 8, happiness: 6, criminality: -4 } } }] },
      { label: 'Laisser tomber', outcomes: [{ text: 'Tu retournes dans la cour.', tone: 'neutral', effects: { stats: { criminality: 2 } } }] },
    ],
  }),
];

export const MISC_EVENTS: GameEvent[] = [
  ev({
    id: 'mi_natural_disaster', kind: 'random', icon: '🌊', title: 'Catastrophe naturelle', weight: 10,
    cond: { minAge: 5 },
    text: 'Une inondation touche ton quartier. L’eau monte plus vite que prévu.',
    choices: [
      { label: 'Évacuer immédiatement', outcomes: [{ text: 'Tu pars à temps avec l’essentiel. Les dégâts matériels sont lourds mais tu es indemne.', tone: 'bad', effects: { moneyPct: -0.1, stats: { stress: 18, happiness: -10 }, special: 'propertyDamage' } }] },
      { label: 'Aider les voisins', outcomes: [
        { weight: 3, text: 'Tu évacues deux personnes âgées. Le quartier ne t’oubliera pas.', tone: 'good', effects: { moneyPct: -0.08, stats: { karma: 20, reputation: 14, health: -6, stress: 16 } } },
        { weight: 2, text: 'Tu te blesses en portant du matériel dans l’eau.', tone: 'bad', effects: { moneyPct: -0.08, stats: { karma: 15, health: -14 }, special: 'injury' } },
      ] },
      { label: 'Rester protéger tes affaires', outcomes: [
        { weight: 2, text: 'Tu sauves une partie de tes biens.', tone: 'neutral', effects: { moneyPct: -0.04, stats: { stress: 20, karma: -4 } } },
        { weight: 3, text: 'Tu es piégé à l’étage pendant douze heures. Les secours te récupèrent en hélicoptère.', tone: 'bad', effects: { moneyPct: -0.12, stats: { health: -12, stress: 25, happiness: -12 } } },
      ] },
    ],
  }),
  ev({
    id: 'mi_famous_encounter', kind: 'random', icon: '🌟', title: 'Une rencontre inattendue', weight: 12,
    cond: { minAge: 10 },
    text: 'Tu croises quelqu’un de très connu dans une file d’attente parfaitement banale.',
    choices: [
      { label: 'Engager la conversation', outcomes: [
        { weight: 3, text: 'La personne est charmante. Vous discutez cinq minutes de choses ordinaires.', tone: 'good', effects: { stats: { happiness: 10, reputation: 4 } } },
        { weight: 2, text: 'On te fait comprendre poliment de circuler.', tone: 'neutral', effects: { stats: { happiness: -3 } } },
      ] },
      { label: 'Demander une photo', outcomes: [
        { weight: 3, text: 'La photo fait le tour de tes contacts pendant une semaine.', tone: 'good', effects: { stats: { happiness: 8 }, special: 'gainFollowers', specialArg: 600 } },
        { weight: 2, text: 'Refus sec. La photo ratée reste dans ta galerie.', tone: 'neutral', effects: { stats: { happiness: -4 } } },
      ] },
      { label: 'Faire comme si de rien n’était', outcomes: [{ text: 'Tu payes tes courses et tu repars. Une forme d’élégance.', tone: 'neutral', effects: { stats: { discipline: 4, happiness: 2 } } }] },
    ],
  }),
  ev({
    id: 'mi_jury_duty', kind: 'justice', icon: '⚖️', title: 'Convocation comme juré', weight: 16,
    cond: { minAge: 23, maxAge: 70, inPrison: false },
    text: 'Tu es convoqué comme juré. L’affaire durera trois semaines.',
    choices: [
      { label: 'Assumer le devoir', outcomes: [{ text: 'Trois semaines intenses. Tu ne verras plus jamais la justice de la même façon.', tone: 'good', effects: { stats: { intelligence: 8, karma: 8, reputation: 5, stress: 12 }, money: -300 } }] },
      { label: 'Chercher une dispense', outcomes: [
        { weight: 3, text: 'La dispense est accordée. Tu retournes à ton quotidien.', tone: 'neutral', effects: { stats: { karma: -3 } } },
        { weight: 2, text: 'Refusée. Tu y vas de mauvaise grâce.', tone: 'neutral', effects: { stats: { stress: 10, happiness: -5 }, money: -300 } },
      ] },
    ],
  }),
  ev({
    id: 'mi_found_talent_late', kind: 'life', icon: '🎨', title: 'Une découverte tardive', weight: 16,
    cond: { minAge: 30 },
    text: 'Tu essaies quelque chose pour la première fois, un peu par hasard, et tu te découvres doué.',
    choices: [
      { label: 'S’y consacrer sérieusement', outcomes: [{ text: 'Deux heures par jour pendant un an. Tu deviens vraiment bon.', tone: 'good', effects: { stats: { happiness: 14, discipline: 8, intelligence: 4, stress: -8 }, flag: 'lateTalent' } }] },
      { label: 'En faire un loisir', outcomes: [{ text: 'Un plaisir du dimanche, sans pression. C’est peut-être mieux ainsi.', tone: 'good', effects: { stats: { happiness: 8, stress: -6 } } }] },
      { label: 'Passer à autre chose', outcomes: [{ text: 'Tu n’y reviendras pas.', tone: 'neutral', effects: {} } ] },
    ],
  }),
  ev({
    id: 'mi_animal_rescue', kind: 'random', icon: '🐈', title: 'Un animal abandonné', weight: 20,
    cond: { minAge: 12, hasPet: false },
    text: 'Un chat maigre te suit dans la rue sur trois cents mètres. Il n’a pas de collier.',
    choices: [
      { label: 'Le recueillir', outcomes: [{ text: 'Vétérinaire, gamelle, panier. Il ne quittera plus jamais l’appartement.', tone: 'good', effects: { money: -180, stats: { happiness: 12, karma: 10 }, special: 'newPet' } }] },
      { label: 'Appeler un refuge', outcomes: [{ text: 'Il est pris en charge dans la journée. Tu penses souvent à lui.', tone: 'good', effects: { stats: { karma: 8, happiness: 3 } } }] },
      { label: 'Continuer son chemin', outcomes: [{ text: 'Il s’arrête au coin de la rue et te regarde partir.', tone: 'neutral', effects: { stats: { karma: -4, happiness: -3 } } }] },
    ],
  }),
  ev({
    id: 'mi_viral_shaming', kind: 'random', icon: '📸', title: 'Filmé à ton insu', weight: 14,
    cond: { minAge: 16, minStat: { reputation: 30 } },
    text: 'Une vidéo de toi, sortie de son contexte, circule beaucoup et pas en bien.',
    choices: [
      { label: 'S’expliquer publiquement', outcomes: [
        { weight: 3, text: 'Ton explication calme les choses. L’affaire s’éteint en une semaine.', tone: 'good', effects: { stats: { reputation: -5, stress: 14, intelligence: 3 } } },
        { weight: 2, text: 'Ton explication relance tout. C’est pire.', tone: 'bad', effects: { stats: { reputation: -18, stress: 22, happiness: -14 } } },
      ] },
      { label: 'Se taire et attendre', outcomes: [
        { weight: 3, text: 'Internet passe à autre chose en quatre jours.', tone: 'good', effects: { stats: { reputation: -6, stress: 12, discipline: 5 } } },
        { weight: 2, text: 'L’affaire remonte jusqu’à ton employeur.', tone: 'bad', effects: { stats: { reputation: -14, stress: 20 }, special: 'loseJob' } },
      ] },
      { label: 'Engager un avocat', requiresMoney: 4000, outcomes: [{ text: 'La vidéo est retirée. Cher, mais efficace.', tone: 'good', effects: { money: -4000, stats: { reputation: -2, stress: 10 } } }] },
    ],
  }),
  ev({
    id: 'mi_time_capsule', kind: 'life', icon: '⏳', title: 'Une lettre de toi-même', weight: 12,
    cond: { minAge: 25 },
    text: 'Tu retrouves une lettre que tu t’étais écrite il y a très longtemps. Tu ne te souvenais même pas de l’avoir écrite.',
    choices: [
      { label: 'La lire en entier', outcomes: [
        { weight: 3, text: 'Tes projets d’alors n’ont presque rien à voir avec ta vie actuelle. C’est troublant, et pas forcément triste.', tone: 'neutral', effects: { stats: { happiness: 5, intelligence: 4, stress: 4 } } },
        { weight: 2, text: 'Tu as tenu presque toutes tes promesses. Tu ne l’avais jamais réalisé.', tone: 'good', effects: { stats: { happiness: 16, discipline: 5 } } },
      ] },
      { label: 'La ranger sans la lire', outcomes: [{ text: 'Certaines choses sont mieux là où elles sont.', tone: 'neutral', effects: { stats: { stress: -3 } } }] },
    ],
  }),
  ev({
    id: 'mi_train_stranger', kind: 'random', icon: '🚆', title: 'Une conversation dans un train', weight: 22,
    cond: { minAge: 15 },
    text: 'Ton voisin de train engage la conversation. Vous avez quatre heures devant vous.',
    choices: [
      { label: 'Discuter', outcomes: [
        { weight: 3, text: 'Une des meilleures conversations de ta vie, avec quelqu’un que tu ne reverras jamais.', tone: 'good', effects: { stats: { happiness: 10, intelligence: 4, stress: -6 } } },
        { weight: 1, text: 'La personne travaille exactement dans ton domaine. Vous échangez vos contacts.', tone: 'good', effects: { stats: { happiness: 8, reputation: 5 }, special: 'newFriend' } },
        { weight: 2, text: 'Quatre heures de monologue sur un sujet qui ne t’intéresse pas.', tone: 'neutral', effects: { stats: { stress: 6, happiness: -3 } } },
      ] },
      { label: 'Mettre des écouteurs', outcomes: [{ text: 'Tu regardes le paysage défiler en paix.', tone: 'neutral', effects: { stats: { stress: -4 } } }] },
    ],
  }),
];
