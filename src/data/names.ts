/**
 * Banques de prénoms et de noms par aire culturelle.
 * Ajouter un jeu de noms = ajouter une entrée ici, aucun code à modifier.
 */

export interface NameSet {
  id: string;
  male: string[];
  female: string[];
  surnames: string[];
}

const sets: NameSet[] = [
  {
    id: 'fr',
    male: [
      'Lucas', 'Hugo', 'Gabriel', 'Léo', 'Raphaël', 'Arthur', 'Louis', 'Jules', 'Adam', 'Maël',
      'Paul', 'Nathan', 'Théo', 'Sacha', 'Ethan', 'Noah', 'Antoine', 'Baptiste', 'Clément', 'Damien',
      'Émile', 'Fabien', 'Gaspard', 'Hervé', 'Ismaël', 'Julien', 'Kévin', 'Laurent', 'Mathis', 'Nicolas',
      'Olivier', 'Pierre', 'Quentin', 'Rémi', 'Sébastien', 'Thibaut', 'Ulysse', 'Victor', 'Xavier', 'Yanis',
      'Alexandre', 'Benoît', 'Cédric', 'Dorian', 'Enzo', 'Florian', 'Guillaume', 'Hadrien', 'Ilan', 'Joachim',
    ],
    female: [
      'Emma', 'Jade', 'Louise', 'Alice', 'Chloé', 'Lina', 'Rose', 'Anna', 'Mia', 'Léa',
      'Manon', 'Camille', 'Sarah', 'Inès', 'Zoé', 'Julie', 'Clara', 'Éva', 'Nina', 'Lucie',
      'Adèle', 'Bérénice', 'Céline', 'Delphine', 'Élise', 'Fanny', 'Gabrielle', 'Hélène', 'Iris', 'Joséphine',
      'Karine', 'Laure', 'Margaux', 'Noémie', 'Océane', 'Pauline', 'Quitterie', 'Romane', 'Sophie', 'Thaïs',
      'Ambre', 'Béatrice', 'Charlotte', 'Diane', 'Estelle', 'Flavie', 'Garance', 'Héloïse', 'Isaure', 'Jeanne',
    ],
    surnames: [
      'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau',
      'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier',
      'Morel', 'Girard', 'André', 'Lefèvre', 'Mercier', 'Dupont', 'Lambert', 'Bonnet', 'François', 'Martinez',
      'Legrand', 'Garnier', 'Faure', 'Rousseau', 'Blanc', 'Guerin', 'Muller', 'Henry', 'Roussel', 'Nicolas',
      'Perrin', 'Morin', 'Mathieu', 'Clement', 'Gauthier', 'Dumont', 'Lopez', 'Fontaine', 'Chevalier', 'Robin',
    ],
  },
  {
    id: 'en',
    male: [
      'James', 'Oliver', 'Liam', 'Noah', 'William', 'Henry', 'Jack', 'Ethan', 'Mason', 'Logan',
      'Daniel', 'Matthew', 'Andrew', 'Joseph', 'Samuel', 'David', 'Ryan', 'Nathan', 'Connor', 'Dylan',
      'Aaron', 'Brandon', 'Caleb', 'Dominic', 'Elliot', 'Finn', 'George', 'Harrison', 'Isaac', 'Jasper',
      'Kyle', 'Leo', 'Miles', 'Nolan', 'Owen', 'Parker', 'Quinn', 'Reid', 'Spencer', 'Tyler',
      'Victor', 'Wesley', 'Xander', 'Zachary', 'Adrian', 'Blake', 'Cameron', 'Declan', 'Everett', 'Grant',
    ],
    female: [
      'Olivia', 'Emma', 'Ava', 'Sophia', 'Isabella', 'Mia', 'Charlotte', 'Amelia', 'Harper', 'Evelyn',
      'Abigail', 'Emily', 'Elizabeth', 'Sofia', 'Ella', 'Grace', 'Chloe', 'Victoria', 'Riley', 'Aria',
      'Hazel', 'Nora', 'Lily', 'Zoe', 'Stella', 'Violet', 'Aurora', 'Savannah', 'Audrey', 'Brooklyn',
      'Claire', 'Delilah', 'Eleanor', 'Faith', 'Georgia', 'Hannah', 'Ivy', 'Juliet', 'Kinsley', 'Lucy',
      'Maya', 'Naomi', 'Paisley', 'Quinn', 'Ruby', 'Sadie', 'Tessa', 'Willow', 'Ximena', 'Zara',
    ],
    surnames: [
      'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson', 'Anderson', 'Taylor',
      'Thomas', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris', 'Clark', 'Lewis',
      'Walker', 'Hall', 'Allen', 'Young', 'King', 'Wright', 'Scott', 'Green', 'Baker', 'Adams',
      'Nelson', 'Hill', 'Campbell', 'Mitchell', 'Roberts', 'Carter', 'Phillips', 'Evans', 'Turner', 'Parker',
      'Collins', 'Edwards', 'Stewart', 'Morris', 'Murphy', 'Cook', 'Rogers', 'Bailey', 'Reed', 'Bell',
    ],
  },
  {
    id: 'es',
    male: [
      'Alejandro', 'Mateo', 'Santiago', 'Diego', 'Javier', 'Carlos', 'Miguel', 'Pablo', 'Sergio', 'Adrián',
      'Álvaro', 'Andrés', 'Bruno', 'Daniel', 'Emilio', 'Fernando', 'Gonzalo', 'Hugo', 'Ignacio', 'Joaquín',
      'Leandro', 'Manuel', 'Nicolás', 'Óscar', 'Pedro', 'Rafael', 'Rodrigo', 'Salvador', 'Tomás', 'Vicente',
      'Agustín', 'Benjamín', 'Cristóbal', 'Damián', 'Esteban', 'Federico', 'Gael', 'Héctor', 'Iván', 'Julián',
    ],
    female: [
      'Lucía', 'María', 'Martina', 'Paula', 'Sofía', 'Valeria', 'Daniela', 'Carmen', 'Elena', 'Alba',
      'Ana', 'Beatriz', 'Clara', 'Diana', 'Esperanza', 'Fernanda', 'Gabriela', 'Inés', 'Julia', 'Laura',
      'Marta', 'Natalia', 'Olga', 'Patricia', 'Rocío', 'Sara', 'Teresa', 'Valentina', 'Ximena', 'Yolanda',
      'Adriana', 'Bárbara', 'Camila', 'Dolores', 'Emilia', 'Florencia', 'Guadalupe', 'Isabel', 'Jimena', 'Lorena',
    ],
    surnames: [
      'García', 'Rodríguez', 'González', 'Fernández', 'López', 'Martínez', 'Sánchez', 'Pérez', 'Gómez', 'Martín',
      'Jiménez', 'Ruiz', 'Hernández', 'Díaz', 'Moreno', 'Álvarez', 'Muñoz', 'Romero', 'Alonso', 'Gutiérrez',
      'Navarro', 'Torres', 'Domínguez', 'Vázquez', 'Ramos', 'Gil', 'Ramírez', 'Serrano', 'Blanco', 'Molina',
      'Morales', 'Suárez', 'Ortega', 'Delgado', 'Castro', 'Ortiz', 'Rubio', 'Marín', 'Sanz', 'Núñez',
    ],
  },
  {
    id: 'de',
    male: [
      'Lukas', 'Leon', 'Finn', 'Jonas', 'Paul', 'Maximilian', 'Felix', 'Elias', 'Noah', 'Ben',
      'Anton', 'Bastian', 'Christoph', 'Dominik', 'Erik', 'Florian', 'Gunter', 'Hannes', 'Jakob', 'Klaus',
      'Lars', 'Matthias', 'Niklas', 'Oskar', 'Philipp', 'Rainer', 'Sebastian', 'Tobias', 'Ulrich', 'Wolfgang',
      'Andreas', 'Bernd', 'Dieter', 'Emil', 'Frederik', 'Gustav', 'Heinrich', 'Johann', 'Konrad', 'Ludwig',
    ],
    female: [
      'Mia', 'Emilia', 'Hannah', 'Sofia', 'Lina', 'Marie', 'Lena', 'Anna', 'Leni', 'Clara',
      'Annika', 'Birgit', 'Christina', 'Doris', 'Elke', 'Franziska', 'Gisela', 'Heidi', 'Ingrid', 'Johanna',
      'Katharina', 'Lisbeth', 'Magdalena', 'Nadine', 'Ottilie', 'Petra', 'Renate', 'Sabine', 'Theresa', 'Ulrike',
      'Verena', 'Wilhelmina', 'Agnes', 'Brigitte', 'Cordula', 'Dorothea', 'Erika', 'Freya', 'Greta', 'Helga',
    ],
    surnames: [
      'Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz', 'Hoffmann',
      'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf', 'Schröder', 'Neumann', 'Schwarz', 'Zimmermann', 'Braun',
      'Krüger', 'Hofmann', 'Hartmann', 'Lange', 'Werner', 'Krause', 'Meier', 'Lehmann', 'Schmitt', 'Köhler',
      'Herrmann', 'Walter', 'König', 'Mayer', 'Huber', 'Kaiser', 'Fuchs', 'Peters', 'Lang', 'Scholz',
    ],
  },
  {
    id: 'it',
    male: [
      'Leonardo', 'Francesco', 'Alessandro', 'Lorenzo', 'Matteo', 'Andrea', 'Gabriele', 'Riccardo', 'Tommaso', 'Edoardo',
      'Antonio', 'Bruno', 'Carlo', 'Davide', 'Enrico', 'Fabio', 'Giovanni', 'Luca', 'Marco', 'Nicola',
      'Paolo', 'Roberto', 'Salvatore', 'Stefano', 'Vincenzo', 'Alberto', 'Claudio', 'Dario', 'Emanuele', 'Giuseppe',
    ],
    female: [
      'Sofia', 'Giulia', 'Aurora', 'Alice', 'Ginevra', 'Emma', 'Giorgia', 'Beatrice', 'Vittoria', 'Chiara',
      'Alessia', 'Bianca', 'Camilla', 'Daniela', 'Elisa', 'Federica', 'Gaia', 'Ilaria', 'Laura', 'Martina',
      'Nicoletta', 'Paola', 'Rebecca', 'Serena', 'Teresa', 'Valentina', 'Adriana', 'Cristina', 'Elena', 'Francesca',
    ],
    surnames: [
      'Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco',
      'Bruno', 'Gallo', 'Conti', 'De Luca', 'Costa', 'Giordano', 'Mancini', 'Rizzo', 'Lombardi', 'Moretti',
      'Barbieri', 'Fontana', 'Santoro', 'Mariani', 'Rinaldi', 'Caruso', 'Ferrara', 'Galli', 'Martini', 'Leone',
    ],
  },
  {
    id: 'ar',
    male: [
      'Youssef', 'Omar', 'Karim', 'Rachid', 'Samir', 'Tarek', 'Amine', 'Bilal', 'Hakim', 'Ismail',
      'Jamal', 'Khalid', 'Mehdi', 'Nabil', 'Rami', 'Sofiane', 'Walid', 'Yassine', 'Zakaria', 'Adel',
      'Farid', 'Ghali', 'Hicham', 'Idriss', 'Jalil', 'Lotfi', 'Mounir', 'Noureddine', 'Riad', 'Sami',
    ],
    female: [
      'Amina', 'Fatima', 'Leila', 'Nour', 'Yasmine', 'Sana', 'Rania', 'Hiba', 'Salma', 'Meriem',
      'Aicha', 'Bushra', 'Dounia', 'Farah', 'Ghizlane', 'Hanane', 'Imane', 'Jamila', 'Karima', 'Lamia',
      'Malika', 'Nadia', 'Ouarda', 'Rim', 'Souad', 'Tasnim', 'Wafa', 'Zineb', 'Assia', 'Btissam',
    ],
    surnames: [
      'Benali', 'El Amrani', 'Haddad', 'Cherif', 'Mansouri', 'Bouzid', 'Saidi', 'Belkacem', 'Ziani', 'Rahmani',
      'Aziz', 'Bennani', 'Chaoui', 'Dahmani', 'El Fassi', 'Ghazali', 'Hamdi', 'Idrissi', 'Jelloun', 'Kabbaj',
      'Lahlou', 'Mrabet', 'Naciri', 'Ouazzani', 'Qadiri', 'Sabri', 'Tazi', 'Wahbi', 'Yousfi', 'Zerhouni',
    ],
  },
  {
    id: 'jp',
    male: [
      'Haruto', 'Yuto', 'Sota', 'Ren', 'Riku', 'Kaito', 'Hinata', 'Yuki', 'Takumi', 'Daiki',
      'Akira', 'Hiroshi', 'Kenji', 'Masaru', 'Naoki', 'Osamu', 'Ryo', 'Satoshi', 'Tatsuya', 'Yusuke',
    ],
    female: [
      'Yui', 'Aoi', 'Hina', 'Sakura', 'Mei', 'Rin', 'Yuna', 'Mio', 'Akari', 'Koharu',
      'Ayaka', 'Emi', 'Haruka', 'Kaori', 'Miyu', 'Nanami', 'Rei', 'Saki', 'Tomoko', 'Yuka',
    ],
    surnames: [
      'Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato',
      'Yoshida', 'Yamada', 'Sasaki', 'Yamaguchi', 'Matsumoto', 'Inoue', 'Kimura', 'Hayashi', 'Shimizu', 'Saito',
    ],
  },
  {
    id: 'cn',
    male: [
      'Wei', 'Jun', 'Hao', 'Lei', 'Ming', 'Yang', 'Chen', 'Feng', 'Gang', 'Hui',
      'Jian', 'Kun', 'Long', 'Peng', 'Qiang', 'Sheng', 'Tao', 'Xiang', 'Yong', 'Zhi',
    ],
    female: [
      'Li', 'Fang', 'Xiu', 'Ying', 'Yan', 'Juan', 'Min', 'Jing', 'Hong', 'Lan',
      'Mei', 'Ning', 'Ping', 'Qing', 'Rong', 'Shan', 'Ting', 'Wen', 'Xia', 'Zhen',
    ],
    surnames: [
      'Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Huang', 'Zhao', 'Wu', 'Zhou',
      'Xu', 'Sun', 'Ma', 'Zhu', 'Hu', 'Guo', 'He', 'Lin', 'Gao', 'Luo',
    ],
  },
  {
    id: 'in',
    male: [
      'Aarav', 'Vihaan', 'Arjun', 'Rohan', 'Ishaan', 'Kabir', 'Aditya', 'Rahul', 'Sanjay', 'Vikram',
      'Amit', 'Deepak', 'Gaurav', 'Harsh', 'Karan', 'Manish', 'Nikhil', 'Pranav', 'Raj', 'Suresh',
    ],
    female: [
      'Aanya', 'Diya', 'Priya', 'Ananya', 'Kavya', 'Meera', 'Neha', 'Riya', 'Saanvi', 'Tara',
      'Anjali', 'Divya', 'Isha', 'Lakshmi', 'Nisha', 'Pooja', 'Radha', 'Shreya', 'Sunita', 'Vidya',
    ],
    surnames: [
      'Sharma', 'Verma', 'Patel', 'Singh', 'Kumar', 'Gupta', 'Reddy', 'Nair', 'Rao', 'Mehta',
      'Chopra', 'Desai', 'Iyer', 'Joshi', 'Kapoor', 'Malhotra', 'Pillai', 'Sethi', 'Trivedi', 'Bose',
    ],
  },
  {
    id: 'br',
    male: [
      'Miguel', 'Arthur', 'Gael', 'Théo', 'Davi', 'Bernardo', 'Gabriel', 'Pedro', 'Lucas', 'Matheus',
      'Bruno', 'Caio', 'Diego', 'Eduardo', 'Felipe', 'Gustavo', 'Henrique', 'João', 'Leandro', 'Rafael',
    ],
    female: [
      'Helena', 'Alice', 'Laura', 'Manuela', 'Valentina', 'Sophia', 'Isabella', 'Heloísa', 'Luiza', 'Cecília',
      'Ana', 'Bruna', 'Carla', 'Daniela', 'Fernanda', 'Gabriela', 'Juliana', 'Larissa', 'Mariana', 'Renata',
    ],
    surnames: [
      'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes',
      'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Almeida', 'Lopes', 'Soares', 'Fernandes', 'Vieira', 'Barbosa',
    ],
  },
  {
    id: 'ru',
    male: [
      'Alexei', 'Dmitri', 'Ivan', 'Mikhail', 'Nikolai', 'Pavel', 'Sergei', 'Vladimir', 'Yuri', 'Andrei',
      'Boris', 'Fyodor', 'Grigori', 'Igor', 'Konstantin', 'Leonid', 'Maxim', 'Oleg', 'Roman', 'Viktor',
    ],
    female: [
      'Anastasia', 'Daria', 'Ekaterina', 'Irina', 'Ludmila', 'Maria', 'Natalia', 'Olga', 'Svetlana', 'Tatiana',
      'Alina', 'Elena', 'Galina', 'Ksenia', 'Larisa', 'Nadia', 'Polina', 'Sofia', 'Valeria', 'Yulia',
    ],
    surnames: [
      'Ivanov', 'Smirnov', 'Kuznetsov', 'Popov', 'Vasiliev', 'Petrov', 'Sokolov', 'Mikhailov', 'Novikov', 'Fedorov',
      'Morozov', 'Volkov', 'Alexeev', 'Lebedev', 'Semenov', 'Egorov', 'Pavlov', 'Kozlov', 'Stepanov', 'Nikolaev',
    ],
  },
  {
    id: 'scandi',
    male: [
      'Erik', 'Lars', 'Magnus', 'Nils', 'Olav', 'Sven', 'Bjorn', 'Anders', 'Gustav', 'Henrik',
      'Jonas', 'Kristian', 'Mikkel', 'Rasmus', 'Soren', 'Thor', 'Viggo', 'Axel', 'Emil', 'Frode',
    ],
    female: [
      'Astrid', 'Freja', 'Ingrid', 'Karin', 'Linnea', 'Maja', 'Nora', 'Sigrid', 'Solveig', 'Tove',
      'Agnes', 'Elsa', 'Hanna', 'Ida', 'Johanna', 'Kirsten', 'Liv', 'Mette', 'Runa', 'Ylva',
    ],
    surnames: [
      'Andersson', 'Johansson', 'Karlsson', 'Nilsson', 'Eriksson', 'Larsson', 'Olsen', 'Hansen', 'Pedersen', 'Nielsen',
      'Berg', 'Lindqvist', 'Sundberg', 'Dahl', 'Holm', 'Lund', 'Nyberg', 'Ostberg', 'Strand', 'Vik',
    ],
  },
  {
    id: 'af',
    male: [
      'Kwame', 'Kofi', 'Chidi', 'Emeka', 'Tunde', 'Sekou', 'Mamadou', 'Ousmane', 'Ibrahima', 'Abdoulaye',
      'Thabo', 'Sipho', 'Kojo', 'Yaw', 'Obi', 'Baba', 'Dembo', 'Lamine', 'Moussa', 'Cheikh',
    ],
    female: [
      'Ama', 'Abena', 'Chiamaka', 'Ngozi', 'Folake', 'Aminata', 'Fatou', 'Awa', 'Mariama', 'Khadija',
      'Nomsa', 'Thandi', 'Efua', 'Adjoa', 'Ifeoma', 'Zainab', 'Bintou', 'Coumba', 'Kadiatou', 'Sokhna',
    ],
    surnames: [
      'Mensah', 'Owusu', 'Okafor', 'Adeyemi', 'Diallo', 'Traoré', 'Diop', 'Ndiaye', 'Sow', 'Camara',
      'Nkosi', 'Dlamini', 'Boateng', 'Asante', 'Eze', 'Balogun', 'Keita', 'Cissé', 'Fall', 'Sylla',
    ],
  },
  {
    id: 'kr',
    male: [
      'Minjun', 'Seojun', 'Doyun', 'Yejun', 'Siwoo', 'Hajun', 'Jiho', 'Junseo', 'Eunwoo', 'Jihoon',
      'Sangwoo', 'Taeyang', 'Woojin', 'Younghoon', 'Chanwoo', 'Daehyun', 'Gunwoo', 'Hyunwoo', 'Jaemin', 'Kyungsoo',
    ],
    female: [
      'Seoyeon', 'Jiwoo', 'Seoyun', 'Hayoon', 'Jiyoo', 'Soeun', 'Yerin', 'Chaewon', 'Yuna', 'Dahyun',
      'Eunji', 'Haeun', 'Jimin', 'Minji', 'Nayeon', 'Sohee', 'Sujin', 'Yeji', 'Hyewon', 'Boram',
    ],
    surnames: [
      'Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Kang', 'Cho', 'Yoon', 'Jang', 'Lim',
      'Han', 'Oh', 'Seo', 'Shin', 'Kwon', 'Hwang', 'Ahn', 'Song', 'Yoo', 'Hong',
    ],
  },
];

export const NAME_SETS: Record<string, NameSet> = Object.fromEntries(
  sets.map((s) => [s.id, s]),
);

export function getNameSet(id: string): NameSet {
  return NAME_SETS[id] ?? NAME_SETS.en;
}

/** Noms de sociétés génériques, composés à la volée. */
export const COMPANY_PREFIXES = [
  'Aurea', 'Novéo', 'Kartis', 'Orbelin', 'Verdania', 'Solmax', 'Tramontane', 'Halcyon', 'Ferrix', 'Lumibra',
  'Cordis', 'Nimbus', 'Zephyra', 'Ombrelle', 'Vulcania', 'Astramar', 'Kelvix', 'Basalte', 'Périgée', 'Talweg',
  'Cyanis', 'Ébenor', 'Fortis', 'Grévin', 'Hélionde', 'Ixora', 'Jonquil', 'Krypto', 'Lithane', 'Méridia',
];

export const COMPANY_SUFFIXES = [
  'Group', 'SA', 'Partners', 'Industries', 'Solutions', 'Collectif', 'Holding', 'Atelier', 'Conseil', 'Systèmes',
  'Réseau', 'Manufacture', 'Studio', 'Compagnie', 'Associés', 'Labs', 'Union', 'Consortium',
];

/** Noms d'établissements scolaires. */
export const SCHOOL_NAMES = [
  'Val-Fleuri', 'Sainte-Aurore', 'Les Tilleuls', 'Pierre-Loriot', 'Beaulieu', 'Montcalme', 'Les Cyprès',
  'Rive-Douce', 'Jean-Vasseur', 'Les Ormeaux', 'Clair-Matin', 'Hauteville', 'Le Grand Chêne', 'Bellerive',
  'Marguerite-Aubry', 'Les Peupliers', 'Fontenoy', 'Saint-Elme', 'La Colline', 'Verval',
];

export const UNIVERSITY_NAMES = [
  'Université de Verdal', 'Institut Corvin', 'Université Sainte-Marne', 'Académie Belmont',
  'Université de Hauteclaire', 'Institut Polytechnique de Rivemont', 'Université du Val-d’Aure',
  'Collège Universitaire Orvane', 'Université Lorenzi', 'Institut Terrancourt',
];

export const PRISON_NAMES = [
  'Centre pénitentiaire de Fontgris', 'Maison d’arrêt de Valcreux', 'Établissement de Roche-Noire',
  'Centre de détention de Sombreval', 'Pénitencier de Cap-Ardoise', 'Maison centrale de Brumelieu',
];

/**
 * « de Marc », mais « d'Eunji ».
 *
 * Une capture d'écran a montré « Tu ne sais encore rien de Eunji » : le jeu
 * tire ses prénoms dans une quarantaine de pays, et un prénom sur cinq
 * commence par une voyelle.
 */
export function de(name: string): string {
  return /^[aeiouyâàäéèêëîïôöûüh]/i.test(name) ? `d’${name}` : `de ${name}`;
}
