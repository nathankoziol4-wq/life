/** Événements de la petite enfance et de l'enfance (0-12 ans). */

import { ev, type GameEvent } from './types.ts';

export const CHILDHOOD_EVENTS: GameEvent[] = [
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
