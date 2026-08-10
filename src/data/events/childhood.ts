/** Événements de la petite enfance et de l'enfance (0-12 ans). */

import { ev, type GameEvent } from './types.ts';

export const CHILDHOOD_EVENTS: GameEvent[] = [
  /* ---------------- Petite enfance : 0-5 ans ---------------- */
  // L'audit a chiffré le trou : huit événements éligibles avant cinq ans,
  // contre plus de quatre-vingts à l'âge adulte. Les vingt qui suivent
  // comblent la tranche la plus pauvre du jeu — celle où il ne se passait
  // littéralement presque rien.
  ev({
    id: 'ch_night_fear', kind: 'family', icon: '🌙', title: 'Il y a quelque chose', weight: 34,
    cond: { minAge: 3, maxAge: 7 }, target: ['mother', 'father'],
    text: 'Tu es sûr qu’il y a quelque chose sous le lit. Absolument sûr. Tu appelles {name}.',
    choices: [
      { label: 'Attendre qu’on vienne', outcomes: [
        { weight: 3, text: '{name} regarde sous le lit, montre qu’il n’y a rien, et reste jusqu’à ce que tu dormes.', tone: 'good', effects: { stats: { happiness: 5, stress: -8 }, rel: 6 } },
        { weight: 2, text: '{name} crie « il n’y a rien ! » depuis le salon. Tu ne redemandes pas.', tone: 'bad', effects: { stats: { stress: 8, happiness: -4 }, rel: -3 } },
      ] },
      { label: 'Se cacher sous la couette', outcomes: [
        { text: 'Tu tiens jusqu’au matin sans bouger. Tu apprends à ne pas appeler.', tone: 'neutral', effects: { stats: { stress: 5, discipline: 3 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_lost_toy', kind: 'random', icon: '🧸', title: 'Il a disparu', weight: 32,
    cond: { minAge: 2, maxAge: 7 },
    text: 'Le doudou n’est plus là. Nulle part. La maison entière se met à chercher.',
    choices: [
      { label: 'Ne pas dormir sans lui', outcomes: [
        { weight: 3, text: 'On le retrouve derrière le radiateur à minuit. Tu ne le lâches plus pendant une semaine.', tone: 'good', effects: { stats: { happiness: 6, stress: -4 } } },
        { weight: 2, text: 'On ne le retrouve jamais. Tu mets des mois à ne plus le chercher des yeux.', tone: 'bad', effects: { stats: { happiness: -8, stress: 6 } } },
      ] },
      { label: 'Faire comme si de rien n’était', outcomes: [
        { text: 'Tu dis que tu es grand. Tu y crois presque.', tone: 'neutral', effects: { stats: { discipline: 4, happiness: -3 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_puddle', kind: 'random', icon: '🌧️', title: 'La flaque', weight: 38,
    cond: { minAge: 2, maxAge: 8 },
    text: 'Il y a une flaque magnifique. Profonde, large, parfaite. On vient de te mettre des chaussures propres.',
    choices: [
      { label: 'Sauter dedans', outcomes: [
        { weight: 4, text: 'Tu sautes des deux pieds. C’est le meilleur moment de la semaine, et tu te fais gronder après.', tone: 'good', effects: { stats: { happiness: 7, discipline: -3, fitness: 2 } } },
        { weight: 1, text: 'Tu sautes, tu glisses, tu te retrouves assis dedans. Tout le monde rit, toi le premier.', tone: 'neutral', effects: { stats: { happiness: 4, health: -2 } } },
      ] },
      { label: 'Faire le tour', outcomes: [
        { text: 'Tu contournes proprement. On te félicite d’être raisonnable. Tu regardes la flaque encore un moment.', tone: 'neutral', effects: { stats: { discipline: 5, happiness: -2 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_why', kind: 'family', icon: '❓', title: 'Pourquoi ?', weight: 36,
    cond: { minAge: 3, maxAge: 7 }, target: ['mother', 'father'],
    text: 'Tu as trouvé le mot le plus puissant de la langue et tu comptes bien t’en servir. « Pourquoi ? » — à chaque réponse.',
    choices: [
      { label: 'Continuer jusqu’au bout', outcomes: [
        { weight: 3, text: '{name} tient bon jusqu’à « parce que c’est comme ça ». Vous en riez tous les deux.', tone: 'good', effects: { stats: { intelligence: 4, happiness: 4 }, rel: 4 } },
        { weight: 2, text: '{name} craque au bout de la quatrième. Tu comprends qu’il y a une limite aux questions.', tone: 'neutral', effects: { stats: { intelligence: 2 }, rel: -2 } },
      ] },
      { label: 'Se taire', outcomes: [
        { text: 'Tu gardes la question pour toi. Tu la reposeras plus tard, ou jamais.', tone: 'neutral', effects: { stats: { intelligence: 1, happiness: -2 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_shared_snack', kind: 'family', icon: '🍪', title: 'Le dernier gâteau', weight: 30,
    cond: { minAge: 3, maxAge: 10 }, target: ['brother', 'sister'],
    text: 'Il reste un gâteau. Vous êtes deux. {name} le regarde aussi.',
    choices: [
      { label: 'Le partager', outcomes: [
        { text: 'Vous le cassez en deux, très mal. {name} prend le petit morceau sans rien dire.', tone: 'good', effects: { stats: { karma: 4, happiness: 3 }, rel: 7 } },
      ] },
      { label: 'Le prendre', outcomes: [
        { weight: 3, text: 'Tu le manges vite, debout. {name} ne dit rien, et s’en souvient.', tone: 'neutral', effects: { stats: { happiness: 3, karma: -3 }, rel: -6 } },
        { weight: 1, text: '{name} te le reprend des mains. Vous finissez par vous battre pour des miettes.', tone: 'bad', effects: { stats: { happiness: -4 }, rel: -8 } },
      ] },
    ],
  }),
  ev({
    id: 'ch_drawing', kind: 'life', icon: '🖍️', title: 'Le chef-d’œuvre', weight: 34,
    cond: { minAge: 3, maxAge: 9 }, target: ['mother', 'father'],
    text: 'Tu as passé une heure sur ce dessin. Tu le tends à {name} en le regardant droit dans les yeux.',
    choices: [
      { label: 'Attendre le verdict', outcomes: [
        { weight: 3, text: '{name} le met sur le frigo. Il y restera trois ans.', tone: 'good', effects: { stats: { happiness: 8, intelligence: 2 }, rel: 6, flag: 'exposé:dessin' } },
        { weight: 2, text: '« C’est joli. » Sans lever les yeux. Le dessin finit dans un tiroir.', tone: 'bad', effects: { stats: { happiness: -5 }, rel: -3 } },
      ] },
      { label: 'Le garder pour soi', outcomes: [
        { text: 'Tu le ranges dans ta boîte. Il est très bien là.', tone: 'neutral', effects: { stats: { happiness: 2 }, flag: 'exposé:dessin' } },
      ] },
    ],
  }),
  ev({
    id: 'ch_first_lie', kind: 'life', icon: '🤥', title: 'Le premier mensonge', weight: 28,
    cond: { minAge: 4, maxAge: 9 }, once: true, target: ['mother', 'father'],
    text: 'Quelque chose est cassé. {name} demande qui l’a fait. Tu découvres à cet instant qu’on peut dire autre chose que la vérité.',
    choices: [
      { label: 'Dire que ce n’est pas toi', outcomes: [
        { weight: 2, text: 'Ça passe. Tu passes la soirée à te sentir bizarre.', tone: 'neutral', effects: { stats: { karma: -5, stress: 4 } } },
        { weight: 3, text: 'Ça ne passe pas du tout. La punition est pour le mensonge, pas pour l’objet.', tone: 'bad', effects: { stats: { karma: -3, happiness: -5 }, rel: -6 } },
      ] },
      { label: 'Avouer', outcomes: [
        { text: 'Tu avoues tout de suite. {name} te punit quand même, mais différemment.', tone: 'neutral', effects: { stats: { karma: 6, discipline: 4, happiness: -2 }, rel: 4 } },
      ] },
    ],
  }),
  ev({
    id: 'ch_animal_dead', kind: 'life', icon: '🐦', title: 'L’oiseau', weight: 24,
    cond: { minAge: 4, maxAge: 10 }, once: true,
    text: 'Tu trouves un oiseau au pied de la fenêtre. Il ne bouge pas. Tu comprends quelque chose que tu ne savais pas encore.',
    choices: [
      { label: 'L’enterrer dans le jardin', outcomes: [
        { text: 'Tu creuses un trou et tu mets une pierre dessus. Tu y penses encore des années après.', tone: 'neutral', effects: { stats: { happiness: -4, intelligence: 3 } } },
      ] },
      { label: 'Aller chercher un adulte', outcomes: [
        { weight: 3, text: 'On t’explique, doucement. Ce n’est pas facile, mais c’est expliqué.', tone: 'neutral', effects: { stats: { intelligence: 4, stress: 3 } } },
        { weight: 2, text: 'On te dit de ne pas y toucher et on s’en occupe sans toi. Tu restes avec la question.', tone: 'bad', effects: { stats: { stress: 6, happiness: -3 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_birthday', kind: 'family', icon: '🎂', title: 'L’anniversaire', weight: 32,
    cond: { minAge: 4, maxAge: 11 },
    text: 'C’est ton anniversaire. Tu as passé la semaine à compter les jours.',
    choices: [
      { label: 'Inviter tout le monde', outcomes: [
        { weight: 3, text: 'La maison est pleine, ça crie partout, c’est parfait.', tone: 'good', effects: { stats: { happiness: 9 }, money: -60 } },
        { weight: 2, text: 'La moitié ne vient pas. Tu fais semblant que ce n’est pas grave.', tone: 'bad', effects: { stats: { happiness: -5, stress: 4 }, money: -60 } },
      ] },
      { label: 'Juste la famille', outcomes: [
        { text: 'Un gâteau, quelques bougies, personne d’autre. C’est bien comme ça.', tone: 'good', effects: { stats: { happiness: 5 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_hide', kind: 'random', icon: '🫥', title: 'La meilleure cachette', weight: 30,
    cond: { minAge: 4, maxAge: 10 },
    text: 'Tu as trouvé une cachette imbattable. Tu y es depuis vingt minutes. Personne ne t’a trouvé. Personne ne te cherche non plus.',
    choices: [
      { label: 'Tenir encore', outcomes: [
        { weight: 2, text: 'On finit par s’inquiéter pour de vrai. Tu sors, et on te serre fort.', tone: 'neutral', effects: { stats: { happiness: 3, stress: 3 } } },
        { weight: 3, text: 'Tu t’endors dedans. On te retrouve deux heures plus tard.', tone: 'good', effects: { stats: { happiness: 4 } } },
      ] },
      { label: 'Sortir en criant « je suis là »', outcomes: [
        { text: 'Personne n’avait remarqué que tu jouais. Tu vas jouer à autre chose.', tone: 'bad', effects: { stats: { happiness: -4 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_stranger_kind', kind: 'random', icon: '🧓', title: 'La voisine', weight: 26,
    cond: { minAge: 4, maxAge: 12 },
    text: 'La vieille dame du dessous te donne un bonbon chaque fois qu’elle te croise dans l’escalier. Aujourd’hui, elle te demande de rester cinq minutes.',
    choices: [
      { label: 'Rester', outcomes: [
        { text: 'Elle te raconte l’immeuble d’il y a quarante ans. Tu ne comprends pas tout, mais tu écoutes.', tone: 'good', effects: { stats: { happiness: 4, intelligence: 3 }, flag: 'exposé:histoire' } },
      ] },
      { label: 'Filer', outcomes: [
        { text: 'Tu montes les escaliers quatre à quatre. Tu la recroiseras demain.', tone: 'neutral', effects: { stats: { happiness: 1 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_scraped_knee', kind: 'health', icon: '🩹', title: 'Le genou', weight: 36,
    cond: { minAge: 3, maxAge: 11 },
    text: 'Tu tombes en courant. Le genou saigne, ça pique horriblement, et il y a du monde autour.',
    choices: [
      { label: 'Ne pas pleurer', outcomes: [
        { weight: 3, text: 'Tu te relèves et tu repars en boitant. Tu pleures plus tard, tout seul.', tone: 'neutral', effects: { stats: { discipline: 5, health: -2, stress: 3 } } },
        { weight: 2, text: 'Tu tiens dix secondes, puis tout sort d’un coup. C’était trop demander.', tone: 'neutral', effects: { stats: { happiness: -2, health: -2 } } },
      ] },
      { label: 'Pleurer très fort', outcomes: [
        { text: 'On accourt, on souffle dessus, on met un pansement trop grand. Ça va déjà mieux.', tone: 'good', effects: { stats: { happiness: 3, health: -1 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_new_word', kind: 'life', icon: '🗯️', title: 'Le mot interdit', weight: 28,
    cond: { minAge: 4, maxAge: 10 },
    text: 'Tu as entendu un mot dans la cour. Un mot qui fait beaucoup d’effet. Tu le répètes à table.',
    choices: [
      { label: 'Le redire plus fort', outcomes: [
        { weight: 3, text: 'Le silence est total. Puis quelqu’un rit, et tout le monde s’y met.', tone: 'neutral', effects: { stats: { happiness: 4, discipline: -4 } } },
        { weight: 2, text: 'On t’envoie dans ta chambre sans explication. Tu ne sais toujours pas ce que ça veut dire.', tone: 'bad', effects: { stats: { happiness: -4, discipline: 2 } } },
      ] },
      { label: 'Demander ce que ça veut dire', outcomes: [
        { text: 'On t’explique à moitié, mal, et en changeant de sujet. Tu retiens surtout qu’il ne faut pas le dire.', tone: 'neutral', effects: { stats: { intelligence: 2 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_want_help', kind: 'family', icon: '🧺', title: 'Vouloir aider', weight: 26,
    cond: { minAge: 3, maxAge: 8 }, target: ['mother', 'father'],
    text: 'Tu veux porter le panier de linge. Il est plus grand que toi. Tu insistes.',
    choices: [
      { label: 'Insister', outcomes: [
        { weight: 3, text: '{name} te laisse le traîner sur trois mètres et te remercie sérieusement.', tone: 'good', effects: { stats: { happiness: 6, discipline: 3 }, rel: 5 } },
        { weight: 2, text: 'Le panier se renverse. On ramasse en soupirant, sans toi.', tone: 'bad', effects: { stats: { happiness: -4 } } },
      ] },
      { label: 'Laisser faire', outcomes: [
        { text: 'Tu regardes depuis le couloir.', tone: 'neutral', effects: { stats: { happiness: -1 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_night_noise', kind: 'family', icon: '🚪', title: 'La dispute', weight: 30,
    cond: { minAge: 4, maxAge: 12 },
    text: 'Ça crie en bas. Tu ne comprends pas les mots mais tu comprends le ton. Tu es assis en haut des escaliers.',
    choices: [
      { label: 'Descendre', outcomes: [
        { weight: 3, text: 'Le silence se fait d’un coup. On te ramène au lit en parlant doucement.', tone: 'neutral', effects: { stats: { stress: 6, happiness: -3 } } },
        { weight: 2, text: 'On ne t’entend même pas arriver. Tu remontes tout seul.', tone: 'bad', effects: { stats: { stress: 10, happiness: -6 } } },
      ] },
      { label: 'Remonter se coucher', outcomes: [
        { text: 'Tu mets l’oreiller sur ta tête. Tu apprends à faire ça.', tone: 'bad', effects: { stats: { stress: 8, discipline: 2, happiness: -4 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_collect', kind: 'life', icon: '🐚', title: 'La collection', weight: 28,
    cond: { minAge: 5, maxAge: 12 },
    text: 'Tu as commencé à ramasser des choses. Des cailloux, des capsules, des coquillages — la boîte est déjà pleine.',
    choices: [
      { label: 'Tout garder', outcomes: [
        { text: 'La boîte devient deux boîtes. Tu connais chaque pièce par cœur.', tone: 'good', effects: { stats: { happiness: 4, intelligence: 2 } } },
      ] },
      { label: 'Échanger avec quelqu’un', outcomes: [
        { weight: 3, text: 'Tu troques ta plus belle pièce contre trois moyennes. Tu ne regrettes pas.', tone: 'good', effects: { stats: { happiness: 3, intelligence: 3 } } },
        { weight: 2, text: 'On t’a bien eu. Tu apprends quelque chose sur les échanges.', tone: 'neutral', effects: { stats: { intelligence: 4, happiness: -2 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_bath_refuse', kind: 'family', icon: '🛁', title: 'Pas envie', weight: 30,
    cond: { minAge: 3, maxAge: 8 }, target: ['mother', 'father'],
    text: 'C’est l’heure du bain. Tu as décidé que non. Fermement.',
    choices: [
      { label: 'Tenir bon', outcomes: [
        { weight: 2, text: 'Tu gagnes. Tu sens le chien pendant deux jours et personne ne relève.', tone: 'neutral', effects: { stats: { discipline: -4, happiness: 3 } } },
        { weight: 3, text: '{name} te porte dedans en riant. Une fois dans l’eau, tu ne veux plus sortir.', tone: 'good', effects: { stats: { happiness: 4 }, rel: 3 } },
      ] },
      { label: 'Céder', outcomes: [
        { text: 'Tu y vas en traînant les pieds, pour la forme.', tone: 'neutral', effects: { stats: { discipline: 3 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_big_kid', kind: 'random', icon: '🛴', title: 'Les grands', weight: 26,
    cond: { minAge: 5, maxAge: 11 },
    text: 'Les grands du quartier te laissent traîner avec eux cet après-midi. Ils te proposent de faire quelque chose que tu sais interdit.',
    choices: [
      { label: 'Les suivre', outcomes: [
        { weight: 3, text: 'Vous ne vous faites pas prendre. Tu as l’impression d’avoir dix ans de plus.', tone: 'neutral', effects: { stats: { happiness: 6, discipline: -5, criminality: 3 } } },
        { weight: 2, text: 'Vous vous faites prendre. Les grands courent plus vite que toi.', tone: 'bad', effects: { stats: { happiness: -6, discipline: -2, criminality: 2 } } },
      ] },
      { label: 'Rentrer', outcomes: [
        { text: 'Tu rentres. On te traite de bébé pendant une semaine, puis on oublie.', tone: 'neutral', effects: { stats: { discipline: 4, happiness: -3 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_teacher_note', kind: 'school', icon: '📩', title: 'Le mot dans le cahier', weight: 30,
    cond: { minAge: 6, maxAge: 12 }, target: ['mother', 'father'],
    text: 'Il y a un mot de l’école dans ton cahier, à faire signer. Tu sais ce qu’il y a dedans.',
    choices: [
      { label: 'Le donner tout de suite', outcomes: [
        { weight: 3, text: '{name} le lit, soupire, signe, et vous en parlez. C’est fini en cinq minutes.', tone: 'neutral', effects: { stats: { karma: 4, happiness: -2 }, rel: 3 } },
        { weight: 2, text: '{name} le prend très mal. La soirée est longue.', tone: 'bad', effects: { stats: { happiness: -6, stress: 6 }, rel: -5 } },
      ] },
      { label: 'Imiter la signature', outcomes: [
        { weight: 2, text: 'Ça passe. Tu recommenceras.', tone: 'neutral', effects: { stats: { karma: -5, discipline: -4, criminality: 3 } } },
        { weight: 3, text: 'Ça ne passe pas du tout. L’école appelle à la maison.', tone: 'bad', effects: { stats: { happiness: -8, karma: -4 }, rel: -8 } },
      ] },
    ],
  }),
  ev({
    id: 'ch_grandparent_visit', kind: 'family', icon: '👴', title: 'Le dimanche', weight: 28,
    cond: { minAge: 3, maxAge: 12 }, target: ['grandmother', 'grandfather'],
    text: 'On va chez {name} dimanche. Il y aura à manger, des questions sur l’école, et beaucoup de temps.',
    choices: [
      { label: 'Y aller de bon cœur', outcomes: [
        { text: 'Tu passes l’après-midi à écouter des histoires que tu connais déjà. C’est bien.', tone: 'good', effects: { stats: { happiness: 5 }, rel: 7, flag: 'exposé:histoire' } },
      ] },
      { label: 'Traîner les pieds', outcomes: [
        { weight: 3, text: 'Tu t’ennuies une heure, puis tu finis par jouer aux cartes avec {name}.', tone: 'neutral', effects: { stats: { happiness: 2 }, rel: 3 } },
        { weight: 2, text: 'Tu passes l’après-midi dans un coin. {name} ne dit rien mais s’en aperçoit.', tone: 'bad', effects: { rel: -4 } },
      ] },
    ],
  }),
  ev({
    id: 'ch_first_steps', kind: 'life', icon: '👣', title: 'Premiers pas', weight: 30,
    cond: { minAge: 1, maxAge: 2 }, once: true,
    text: 'Tu lâches le bord de la table basse et tu traverses le salon sur tes deux jambes. Tout le monde applaudit comme si tu venais de gagner un marathon.',
    choices: [
      { label: 'Recommencer !', outcomes: [{ text: 'Tu recommences vingt fois. Tes parents filment tout.', tone: 'good', effects: { stats: { happiness: 6, fitness: 3 } } }] },
      { label: 'Se rasseoir', outcomes: [{ text: 'Tu retombes sur les fesses et tu ris. C’était bien assez pour aujourd’hui.', tone: 'neutral', effects: { stats: { happiness: 3 } } }] },
    ],
  }),
  ev({
    id: 'ch_first_word', kind: 'life', icon: '🗣️', title: 'Premier mot', weight: 28,
    cond: { minAge: 1, maxAge: 3 }, once: true, target: ['mother', 'father'],
    text: 'Tu prononces ton tout premier mot devant {name}, qui te regarde comme si tu venais de réciter un poème entier.',
    choices: [
      { label: 'Dire son nom', outcomes: [{ text: '{name} en a les larmes aux yeux et raconte la scène à tout le monde pendant six mois.', tone: 'good', effects: { stats: { happiness: 5, intelligence: 2 }, rel: 8 } }] },
      { label: 'Dire « non »', outcomes: [{ text: 'Ton premier mot est « non ». C’est un programme.', tone: 'neutral', effects: { stats: { happiness: 3, discipline: -3 } } }] },
    ],
  }),
  ev({
    id: 'ch_sandbox', kind: 'random', icon: '🏖️', title: 'Le bac à sable', weight: 40,
    cond: { minAge: 3, maxAge: 6 },
    text: 'Un enfant du parc t’arrache la pelle des mains sans un mot.',
    choices: [
      { label: 'La reprendre', outcomes: [
        { weight: 3, text: 'Tu la récupères d’un geste sec. L’autre pleure, mais la pelle est à toi.', tone: 'neutral', effects: { stats: { happiness: 3, discipline: -2, karma: -2 } } },
        { weight: 2, text: 'Vous vous disputez et tu tombes en arrière. Bosse au front.', tone: 'bad', effects: { stats: { health: -3, happiness: -4 } } },
      ] },
      { label: 'Partager', outcomes: [{ text: 'Vous construisez un château à deux. Vous ne saurez jamais son prénom, mais c’était un bon après-midi.', tone: 'good', effects: { stats: { happiness: 6, karma: 4 } } }] },
      { label: 'Aller voir un adulte', outcomes: [{ text: 'Un parent intervient, la pelle revient. Tu apprends que se plaindre marche parfois.', tone: 'neutral', effects: { stats: { happiness: 1, karma: 1 } } }] },
    ],
  }),
  ev({
    id: 'ch_imaginary_friend', kind: 'random', icon: '👻', title: 'Ami imaginaire', weight: 22,
    cond: { minAge: 4, maxAge: 8 }, once: true,
    text: 'Tu as un nouvel ami. Il s’appelle Blaireau, il mesure trois mètres et personne d’autre ne le voit.',
    choices: [
      { label: 'Lui mettre une assiette à table', outcomes: [{ text: 'Tes parents jouent le jeu pendant des mois. Blaireau a même un anniversaire.', tone: 'good', effects: { stats: { happiness: 7, intelligence: 3 } } }] },
      { label: 'Le garder secret', outcomes: [{ text: 'Blaireau reste ton affaire. Vous avez de longues conversations sous le lit.', tone: 'neutral', effects: { stats: { happiness: 4, intelligence: 2 } } }] },
    ],
  }),
  ev({
    id: 'ch_pet_wish', kind: 'family', icon: '🐶', title: 'Un animal !', weight: 30,
    cond: { minAge: 5, maxAge: 11, hasPet: false }, target: ['mother', 'father'],
    text: 'Tu supplies {name} d’adopter un animal. Tu promets de t’en occuper tous les jours, ce qui est statistiquement improbable.',
    choices: [
      { label: 'Insister lourdement', outcomes: [
        { weight: 2, text: '{name} finit par craquer. Un compagnon entre dans ta vie.', tone: 'good', effects: { stats: { happiness: 10 }, special: 'newPet' } },
        { weight: 3, text: '{name} craque… de nerfs. Sujet clos pendant deux ans.', tone: 'bad', effects: { stats: { happiness: -5 }, rel: -6 } },
      ] },
      { label: 'Faire un dossier illustré', outcomes: [
        { weight: 3, text: 'Ton exposé de six pages sur les besoins d’un hamster emporte la décision.', tone: 'good', effects: { stats: { happiness: 9, intelligence: 4 }, rel: 5, special: 'newPet' } },
        { weight: 2, text: '{name} trouve ça adorable, mais la réponse reste non.', tone: 'neutral', effects: { stats: { intelligence: 3, happiness: -2 }, rel: 3 } },
      ] },
      { label: 'Laisser tomber', outcomes: [{ text: 'Tu comprends que ce n’est pas le moment. Tu dessines des chiens à la place.', tone: 'neutral', effects: { stats: { discipline: 3 } } }] },
    ],
  }),
  ev({
    id: 'ch_bike', kind: 'life', icon: '🚲', title: 'Sans les petites roues', weight: 28,
    cond: { minAge: 5, maxAge: 9 }, once: true,
    text: 'On vient de retirer les stabilisateurs de ton vélo. La descente devant la maison paraît soudain immense.',
    choices: [
      { label: 'Foncer', outcomes: [
        { weight: 3, text: 'Vingt mètres, puis cinquante, puis toute la rue. Tu ne t’arrêtes plus.', tone: 'good', effects: { stats: { happiness: 8, fitness: 5, discipline: 2 } } },
        { weight: 2, text: 'Chute spectaculaire dans les buissons. Genou en sang, fierté intacte.', tone: 'bad', effects: { stats: { health: -4, happiness: -2, fitness: 2 } } },
      ] },
      { label: 'Demander qu’on te tienne', outcomes: [{ text: 'On te tient la selle jusqu’au bout de la rue. Tu ne sauras que plus tard qu’on avait lâché depuis longtemps.', tone: 'good', effects: { stats: { happiness: 6, fitness: 3 } } }] },
    ],
  }),
  ev({
    id: 'ch_school_first', kind: 'school', icon: '🎒', title: 'Première rentrée', weight: 26,
    cond: { minAge: 5, maxAge: 7 }, once: true, target: ['mother', 'father'],
    text: 'Premier jour d’école. {name} te dépose devant la grille et te dit que tout va bien se passer.',
    choices: [
      { label: 'Entrer sans se retourner', outcomes: [{ text: 'Tu entres droit devant. {name} pleure discrètement dans la voiture.', tone: 'good', effects: { stats: { happiness: 4, discipline: 5, intelligence: 2 } } }] },
      { label: 'Pleurer et s’accrocher', outcomes: [{ text: 'Il faut trois adultes pour te décrocher de la jambe de {name}. À midi tu as déjà deux amis.', tone: 'neutral', effects: { stats: { happiness: -2, discipline: -2 }, rel: 3 } }] },
    ],
  }),
  ev({
    id: 'ch_bully', kind: 'random', icon: '😠', title: 'Moqueries', weight: 42,
    cond: { minAge: 6, maxAge: 15 },
    text: 'Un camarade se moque de toi devant toute la classe. Tout le monde rit, y compris ceux que tu croyais tes amis.',
    choices: [
      { label: 'L’ignorer', outcomes: [
        { weight: 3, text: 'Tu ne réagis pas. Il se lasse au bout de quelques semaines.', tone: 'neutral', effects: { stats: { happiness: -4, discipline: 4, stress: 5 } } },
        { weight: 2, text: 'Ton silence l’encourage. Ça dure toute l’année.', tone: 'bad', effects: { stats: { happiness: -10, stress: 12, reputation: -5 } } },
      ] },
      { label: 'Lui répondre', outcomes: [
        { weight: 3, text: 'Ta réplique fait mouche. Le rire change de camp.', tone: 'good', effects: { stats: { happiness: 6, reputation: 8, intelligence: 1 } } },
        { weight: 2, text: 'Tu bafouilles. C’est pire.', tone: 'bad', effects: { stats: { happiness: -7, reputation: -6, stress: 8 } } },
      ] },
      { label: 'Prévenir un professeur', outcomes: [
        { weight: 3, text: 'Le professeur intervient. Les moqueries cessent, mais on te colle une étiquette.', tone: 'neutral', effects: { stats: { happiness: 2, reputation: -4, karma: 2 } } },
        { weight: 2, text: 'Le professeur prend l’affaire au sérieux et l’élève est sanctionné. Tu respires.', tone: 'good', effects: { stats: { happiness: 5, stress: -6 } } },
      ] },
      { label: 'Se battre', outcomes: [
        { weight: 2, text: 'Tu gagnes l’échange. On ne t’embête plus, mais tu es convoqué.', tone: 'neutral', effects: { stats: { reputation: 10, discipline: -8, happiness: 3, criminality: 3 } } },
        { weight: 3, text: 'Tu perds, devant tout le monde, et tu es exclu trois jours.', tone: 'bad', effects: { stats: { happiness: -12, health: -5, reputation: -8, discipline: -10 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_reading', kind: 'school', icon: '📖', title: 'Le livre de trop', weight: 26,
    cond: { minAge: 7, maxAge: 13 },
    text: 'Tu tombes sur un roman beaucoup trop long pour ton âge dans la bibliothèque de la classe.',
    choices: [
      { label: 'Le lire en entier', outcomes: [
        { weight: 3, text: 'Trois semaines, la lampe de poche sous la couette. Tu n’as rien compris à la moitié, et c’était formidable.', tone: 'good', effects: { stats: { intelligence: 7, happiness: 4, health: -2 } } },
        { weight: 1, text: 'Tu abandonnes page 90, mais quelque chose reste.', tone: 'neutral', effects: { stats: { intelligence: 3 } } },
      ] },
      { label: 'Reprendre les bandes dessinées', outcomes: [{ text: 'Pas de honte à avoir. Tu dévores quatre albums dans la semaine.', tone: 'neutral', effects: { stats: { happiness: 4, intelligence: 1 } } }] },
    ],
  }),
  ev({
    id: 'ch_talent', kind: 'life', icon: '🎹', title: 'Un don caché', weight: 20,
    cond: { minAge: 6, maxAge: 12 }, once: true,
    text: 'Un professeur remarque que tu es particulièrement doué pour quelque chose. Il propose des cours en dehors de l’école.',
    choices: [
      { label: 'Accepter (musique)', outcomes: [{ text: 'Tu apprends le solfège. C’est laborieux, puis un jour ça devient beau.', tone: 'good', effects: { stats: { intelligence: 5, happiness: 5, discipline: 6 }, flag: 'talent_music' } }] },
      { label: 'Accepter (sport)', outcomes: [{ text: 'Trois entraînements par semaine. Ton corps change.', tone: 'good', effects: { stats: { fitness: 10, discipline: 6, happiness: 3 }, flag: 'talent_sport' } }] },
      { label: 'Accepter (mathématiques)', outcomes: [{ text: 'Tu passes tes mercredis à résoudre des énigmes. C’est étrangement satisfaisant.', tone: 'good', effects: { stats: { intelligence: 9, discipline: 4, happiness: 1 }, flag: 'talent_math' } }] },
      { label: 'Refuser', outcomes: [{ text: 'Tu préfères garder tes mercredis. On ne saura jamais.', tone: 'neutral', effects: { stats: { happiness: 3 } } }] },
    ],
  }),
  ev({
    id: 'ch_parents_argue', kind: 'family', icon: '🌩️', title: 'Une dispute derrière la porte', weight: 32,
    cond: { minAge: 4, maxAge: 16, hasParents: true },
    text: 'Tu entends tes parents se disputer dans la cuisine. Ils baissent la voix dès que tu approches.',
    choices: [
      { label: 'Écouter à la porte', outcomes: [
        { weight: 3, text: 'C’est une histoire d’argent. Tu ne comprends pas tout, mais tu comprends l’essentiel.', tone: 'bad', effects: { stats: { happiness: -6, stress: 10, intelligence: 2 } } },
        { weight: 2, text: 'Ils te surprennent. La gêne est totale.', tone: 'bad', effects: { stats: { happiness: -8, stress: 8 } } },
      ] },
      { label: 'Monter le son de la télé', outcomes: [{ text: 'Tu montes le volume et tu fais comme si de rien n’était. Une compétence que tu garderas.', tone: 'neutral', effects: { stats: { happiness: -3, stress: 5, discipline: 2 } } }] },
      { label: 'Entrer dans la cuisine', outcomes: [{ text: 'Tu entres. Ils s’arrêtent net et te serrent dans leurs bras. La dispute reprendra plus tard.', tone: 'neutral', effects: { stats: { happiness: -1, stress: 3 } } }] },
    ],
  }),
  ev({
    id: 'ch_sibling_fight', kind: 'family', icon: '🥊', title: 'Guerre fraternelle', weight: 34,
    cond: { minAge: 4, maxAge: 18, hasSiblings: true }, target: ['brother', 'sister'],
    text: '{name} a cassé quelque chose qui t’appartenait, puis a juré que ce n’était pas {le}.',
    choices: [
      { label: 'Le dire aux parents', outcomes: [
        { weight: 3, text: '{name} est puni{e}. La vengeance viendra, tôt ou tard.', tone: 'neutral', effects: { stats: { happiness: 3 }, rel: -14, opinion: -12 } },
        { weight: 2, text: 'Personne ne te croit. Double injustice.', tone: 'bad', effects: { stats: { happiness: -8, stress: 6 }, rel: -6 } },
      ] },
      { label: 'Se venger discrètement', outcomes: [{ text: 'Tu échanges le sucre et le sel dans son bol. Justice est faite.', tone: 'neutral', effects: { stats: { happiness: 5, karma: -3 }, rel: -8 } }] },
      { label: 'Laisser couler', outcomes: [{ text: 'Tu ne dis rien. {name} le remarque et devient bizarrement gentil{e} pendant une semaine.', tone: 'good', effects: { stats: { karma: 5, discipline: 3 }, rel: 8, opinion: 10 } }] },
    ],
  }),
  ev({
    id: 'ch_lost', kind: 'random', icon: '🏬', title: 'Perdu dans le magasin', weight: 22,
    cond: { minAge: 3, maxAge: 8 },
    text: 'Tu lèves les yeux au rayon des céréales : plus personne. Le magasin est immense et tout à coup très silencieux.',
    choices: [
      { label: 'Aller à l’accueil', outcomes: [{ text: 'Tu expliques calmement la situation à une vendeuse. On t’annonce au micro. Tes parents arrivent en courant.', tone: 'good', effects: { stats: { intelligence: 5, discipline: 4, happiness: -2, stress: 6 } } }] },
      { label: 'Courir dans les allées', outcomes: [{ text: 'Vingt minutes de panique avant qu’on te retrouve en pleurs près des surgelés.', tone: 'bad', effects: { stats: { happiness: -8, stress: 14 } } }] },
      { label: 'Attendre sur place', outcomes: [{ text: 'Tu ne bouges pas d’un centimètre. On te retrouve exactement là. Bonne pioche.', tone: 'neutral', effects: { stats: { discipline: 5, stress: 5 } } }] },
    ],
  }),
  ev({
    id: 'ch_tooth', kind: 'life', icon: '🦷', title: 'La dent qui bouge', weight: 24,
    cond: { minAge: 5, maxAge: 9 },
    text: 'Ta dent de devant tient par un fil depuis trois jours. Tu ne penses plus qu’à ça.',
    choices: [
      { label: 'Tirer un grand coup', outcomes: [{ text: 'Un « clac » horrible, du sang, puis une pièce sous l’oreiller.', tone: 'good', effects: { stats: { happiness: 4, discipline: 3 }, money: 5 } }] },
      { label: 'Attendre qu’elle tombe seule', outcomes: [{ text: 'Elle tombe dans une pomme deux jours plus tard. Tu l’avales à moitié.', tone: 'neutral', effects: { stats: { happiness: 2 }, money: 5 } }] },
    ],
  }),
  ev({
    id: 'ch_birthday_flop', kind: 'family', icon: '🎂', title: 'Un anniversaire compliqué', weight: 20,
    cond: { minAge: 6, maxAge: 13 },
    text: 'Tu as invité toute la classe. Trois personnes sont venues.',
    choices: [
      { label: 'Faire la fête quand même', outcomes: [{ text: 'Vous êtes quatre et c’est bien mieux. Ces trois-là, tu t’en souviendras.', tone: 'good', effects: { stats: { happiness: 6, karma: 3 }, special: 'newFriend' } }] },
      { label: 'Bouder dans sa chambre', outcomes: [{ text: 'Tu passes l’après-midi enfermé. Le gâteau reste entier.', tone: 'bad', effects: { stats: { happiness: -10, reputation: -4, stress: 6 } } }] },
    ],
  }),
  ev({
    id: 'ch_grandparent', kind: 'family', icon: '🧓', title: 'Chez les grands-parents', weight: 26,
    cond: { minAge: 4, maxAge: 16 },
    text: 'Tu passes l’été chez tes grands-parents. Il n’y a rien à faire et tout le temps du monde.',
    choices: [
      { label: 'Écouter leurs histoires', outcomes: [{ text: 'Tu apprends des choses sur ta famille que personne d’autre ne t’aurait racontées.', tone: 'good', effects: { stats: { happiness: 8, intelligence: 5, karma: 4 } } }] },
      { label: 'Explorer le jardin', outcomes: [{ text: 'Cabanes, insectes, genoux écorchés. Un été parfait.', tone: 'good', effects: { stats: { happiness: 9, fitness: 6, health: 2 } } }] },
      { label: 'S’ennuyer ferme', outcomes: [{ text: 'Tu comptes les jours. Plus tard, tu regretteras de ne pas avoir posé plus de questions.', tone: 'neutral', effects: { stats: { happiness: -3, stress: 3 } } }] },
    ],
  }),
  ev({
    id: 'ch_allowance', kind: 'money', icon: '🪙', title: 'Argent de poche', weight: 28,
    cond: { minAge: 7, maxAge: 15 }, target: ['mother', 'father'],
    text: '{name} te propose de l’argent de poche en échange de quelques tâches à la maison.',
    choices: [
      { label: 'Accepter et bosser', outcomes: [{ text: 'Poubelles, vaisselle, courses. Tu commences à comprendre le rapport entre l’effort et la monnaie.', tone: 'good', effects: { stats: { discipline: 7, happiness: 2 }, money: 300, rel: 5 } }] },
      { label: 'Négocier un meilleur tarif', outcomes: [
        { weight: 3, text: '{name} rit, puis accepte. Première négociation réussie.', tone: 'good', effects: { stats: { intelligence: 4, discipline: 3 }, money: 480, rel: 3 } },
        { weight: 2, text: 'La négociation tourne court. C’est à prendre ou à laisser.', tone: 'neutral', effects: { stats: { discipline: 2 }, money: 200, rel: -2 } },
      ] },
      { label: 'Refuser', outcomes: [{ text: 'Tu préfères ta liberté. Elle ne rapporte rien.', tone: 'neutral', effects: { stats: { discipline: -3, happiness: 2 } } }] },
    ],
  }),
  ev({
    id: 'ch_nightmare', kind: 'random', icon: '🌙', title: 'Cauchemars', weight: 22,
    cond: { minAge: 3, maxAge: 11 },
    text: 'Depuis deux semaines, tu te réveilles en pleine nuit avec le même rêve.',
    choices: [
      { label: 'En parler', outcomes: [{ text: 'On t’écoute, on laisse une veilleuse allumée. Ça finit par passer.', tone: 'good', effects: { stats: { happiness: 4, stress: -8 } } }] },
      { label: 'Garder ça pour soi', outcomes: [{ text: 'Tu dors mal pendant des mois. Personne ne le remarque.', tone: 'bad', effects: { stats: { health: -4, happiness: -5, stress: 12, intelligence: -1 } } }] },
    ],
  }),
  ev({
    id: 'ch_class_pet', kind: 'school', icon: '🐹', title: 'La mascotte de la classe', weight: 18,
    cond: { minAge: 6, maxAge: 11 },
    text: 'C’est ton tour de ramener le hamster de la classe à la maison pour le week-end.',
    choices: [
      { label: 'Le surveiller comme un trésor', outcomes: [{ text: 'Rendu lundi en parfait état. La maîtresse te confie désormais tout.', tone: 'good', effects: { stats: { discipline: 6, reputation: 5, happiness: 4 } } }] },
      { label: 'Le laisser explorer le salon', outcomes: [
        { weight: 2, text: 'Deux heures pour le retrouver derrière le canapé. Il va bien. Toi non.', tone: 'neutral', effects: { stats: { stress: 10, happiness: -2 } } },
        { weight: 1, text: 'Il disparaît sous le parquet. Le lundi est très long.', tone: 'bad', effects: { stats: { happiness: -10, reputation: -8, stress: 14 } } },
      ] },
    ],
  }),
  ev({
    id: 'ch_moving', kind: 'family', icon: '📦', title: 'Déménagement', weight: 18,
    cond: { minAge: 5, maxAge: 17 },
    text: 'Tes parents annoncent que la famille déménage. Nouvelle ville, nouvelle école, nouveaux visages.',
    choices: [
      { label: 'Prendre ça comme une aventure', outcomes: [{ text: 'Tu décides que ce sera bien. C’est en grande partie ce qui fait que ça l’est.', tone: 'good', effects: { stats: { happiness: 3, discipline: 4, intelligence: 2 } } }] },
      { label: 'Protester', outcomes: [{ text: 'Ça ne change rien au calendrier des cartons. Tu perds tes amis d’avant.', tone: 'bad', effects: { stats: { happiness: -10, stress: 10 }, special: 'loseFriend' } }] },
    ],
  }),
  ev({
    id: 'ch_swim', kind: 'life', icon: '🏊', title: 'Apprendre à nager', weight: 22,
    cond: { minAge: 4, maxAge: 10 }, once: true,
    text: 'Au bord du grand bassin, le maître-nageur te tend la main.',
    choices: [
      { label: 'Sauter', outcomes: [
        { weight: 4, text: 'Tu bois la tasse, tu remontes, tu recommences. Trois semaines plus tard tu traverses le bassin.', tone: 'good', effects: { stats: { fitness: 8, happiness: 5, discipline: 4 } } },
        { weight: 1, text: 'Tu paniques sous l’eau. Il faudra des années pour revenir à la piscine.', tone: 'bad', effects: { stats: { happiness: -8, stress: 14, fitness: -2 }, flag: 'aquaphobia' } },
      ] },
      { label: 'Rester dans le petit bain', outcomes: [{ text: 'Tu ne quittes pas la zone où tu as pied. C’est prudent, et un peu triste.', tone: 'neutral', effects: { stats: { fitness: 2, happiness: 1 } } }] },
    ],
  }),
  ev({
    id: 'ch_broken_vase', kind: 'family', icon: '🏺', title: 'Le vase', weight: 24,
    cond: { minAge: 5, maxAge: 13 },
    text: 'Le vase préféré de la maison gît en morceaux sur le carrelage. Personne d’autre n’était dans la pièce.',
    choices: [
      { label: 'Avouer', outcomes: [{ text: 'Tu es puni, mais on te dit que tu as bien fait de le dire. Les deux sont vrais.', tone: 'neutral', effects: { stats: { karma: 8, discipline: 5, happiness: -4 } } }] },
      { label: 'Accuser le chat', outcomes: [
        { weight: 2, text: 'Ça passe. Le chat te regarde différemment depuis.', tone: 'neutral', effects: { stats: { karma: -6, happiness: 2, criminality: 3 } } },
        { weight: 3, text: 'Il n’y a pas de chat dans cette maison. Le mensonge coûte plus cher que le vase.', tone: 'bad', effects: { stats: { karma: -8, happiness: -8, discipline: -5 } } },
      ] },
      { label: 'Cacher les morceaux', outcomes: [{ text: 'On les retrouve trois jours plus tard dans la poubelle du garage.', tone: 'bad', effects: { stats: { karma: -5, happiness: -6, criminality: 4 } } }] },
    ],
  }),
  ev({
    id: 'ch_science_fair', kind: 'school', icon: '🔭', title: 'Exposé de sciences', weight: 22,
    cond: { minAge: 8, maxAge: 15 },
    text: 'La classe organise un concours de projets scientifiques.',
    choices: [
      { label: 'Se donner à fond', requiresStat: { intelligence: 45 }, outcomes: [
        { weight: 3, text: 'Ton volcan fonctionne trop bien. Tu gagnes, et la table du fond est fichue.', tone: 'good', effects: { stats: { intelligence: 8, reputation: 8, happiness: 7, discipline: 4 } } },
        { weight: 2, text: 'Ton projet ne marche pas le jour J. Tu as quand même appris énormément.', tone: 'neutral', effects: { stats: { intelligence: 5, happiness: -3 } } },
      ] },
      { label: 'Faire le minimum', outcomes: [{ text: 'Trois affiches recopiées la veille. Personne n’est dupe.', tone: 'neutral', effects: { stats: { intelligence: 1, discipline: -4, reputation: -3 } } }] },
      { label: 'Ne pas participer', outcomes: [{ text: 'Tu regardes les autres présenter. Certains sont vraiment bons.', tone: 'neutral', effects: { stats: { happiness: -2 } } }] },
    ],
  }),
];
