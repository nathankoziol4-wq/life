/**
 * Les langues, ou ce qui fait qu'on est étranger quelque part.
 *
 * Le catalogue reprochait à l'expatriation « ni dossier, ni délai, ni refus,
 * ni langue à apprendre ». Trois de ces quatre reproches étaient périmés — le
 * visa existe, avec ses conditions et son refus, et un test le vérifie ici
 * plutôt que de croire une note. Le quatrième ne l'était pas.
 *
 * Ce fichier vérifie les quatre règles du système :
 *
 * 1. **l'immersion fait presque tout, et l'âge décide** — c'est le seul
 *    endroit du jeu où l'âge au moment d'un choix pèse autant que le choix ;
 * 2. **ce qu'on sait déjà compte**, donc la destination est une décision ;
 * 3. **ne pas parler coûte** — au travail et dans les liens, pas seulement
 *    dans une phrase d'ambiance ;
 * 4. **ça s'oublie**, sans quoi une vie de voyages collectionnerait les
 *    langues comme des trophées.
 */

import { describe, expect, it } from 'vitest';
import { createNewLife } from '../newLife.ts';
import { createCtx } from '../context.ts';
import { simulateYear } from '../simulateYear.ts';
import type { GameState } from '../types.ts';
import {
  FLUENT, SOCIAL_FLOOR, WORK_FLOOR, advanceLanguages, ageFactor, atHome,
  fluencyHere, fluencyLabel, immersionGain, lessonCost, levelOf, localLanguage,
  nativeLanguage, nativeLanguages, socialFactor, spokenOf, study, studyBlocker,
  workFactor,
} from '../../systems/languages.ts';
import {
  COUNTRY_ALSO, COUNTRY_LANGUAGE, LANGUAGES, easeFor, getLanguage, kinship,
  languagesOfCountry,
} from '../../data/languages.ts';
import { COUNTRIES } from '../../data/countries.ts';
import { immigrate } from '../../systems/activities.ts';

function life(countryId: string, seed = 505, age = 25): GameState {
  const state = createNewLife({ seed, countryId });
  for (let i = 0; i < age; i++) simulateYear(state);
  return state;
}

/* ------------------------------------------------------------------ */
/* Le catalogue                                                        */
/* ------------------------------------------------------------------ */

describe('la carte des langues', () => {
  it('donne une langue à chaque pays jouable', () => {
    // Un pays sans langue rendrait `fluencyHere` muet, et toute la mécanique
    // disparaîtrait silencieusement pour qui y vit.
    for (const country of COUNTRIES) {
      const id = COUNTRY_LANGUAGE[country.id];
      expect(id, country.id).toBeDefined();
      expect(getLanguage(id), `${country.id} → ${id}`).toBeDefined();
    }
  });

  it('ne déclare aucune langue de secours inconnue', () => {
    for (const [countryId, extra] of Object.entries(COUNTRY_ALSO)) {
      expect(COUNTRIES.some((c) => c.id === countryId), countryId).toBe(true);
      for (const id of extra) expect(getLanguage(id), `${countryId} → ${id}`).toBeDefined();
    }
  });

  it('n’a ni doublon ni famille orpheline', () => {
    expect(new Set(LANGUAGES.map((l) => l.id)).size).toBe(LANGUAGES.length);
    const families = new Set(LANGUAGES.map((l) => l.family));
    // Des familles qui ne regrouperaient qu'une langue chacune rendraient la
    // parenté inutile : choisir où partir n'aurait plus de sens.
    expect(families.size).toBeLessThan(LANGUAGES.length);
  });

  it('mesure la parenté par paliers, jamais à zéro', () => {
    expect(kinship('fr', 'fr')).toBe(1);
    expect(kinship('fr', 'es')).toBeGreaterThan(kinship('fr', 'ja'));
    expect(kinship('fr', 'ja')).toBeGreaterThan(0);
    expect(kinship('inconnue', 'ja')).toBeGreaterThan(0);
  });

  it('fait des langues de secours un vrai avantage', () => {
    // Un pays où l'on parle aussi l'anglais doit être plus abordable qu'un
    // pays où l'on n'en parle qu'une — sans aucun cas particulier dans le code.
    expect(languagesOfCountry('nl')).toContain('en');
    expect(languagesOfCountry('jp')).toEqual(['ja']);
  });
});

/* ------------------------------------------------------------------ */
/* Règle 1 — l'immersion, et l'âge                                     */
/* ------------------------------------------------------------------ */

describe('apprendre en vivant', () => {
  it('donne sa langue natale, et rien d’autre', () => {
    const state = life('jp');
    expect(nativeLanguage(state)).toBe('ja');
    expect(levelOf(state, 'ja')).toBe(100);
    expect(spokenOf(state).length).toBe(1);
    expect(nativeLanguages('br')).toEqual({ pt: 100 });
  });

  it('apprend beaucoup plus vite jeune que vieux', () => {
    // Le cœur du système : émigrer à vingt ans et à cinquante ne sont pas la
    // même décision.
    expect(ageFactor(8)).toBeGreaterThan(ageFactor(25));
    expect(ageFactor(25)).toBeGreaterThan(ageFactor(45));
    expect(ageFactor(45)).toBeGreaterThan(ageFactor(70));
    expect(ageFactor(70)).toBeGreaterThan(0);
  });

  it('fait monter la langue d’ici, année après année', () => {
    const state = life('fr');
    state.player.countryId = 'de';
    expect(levelOf(state, 'de')).toBe(0);
    for (let i = 0; i < 10; i++) advanceLanguages(createCtx(state));
    expect(levelOf(state, 'de')).toBeGreaterThan(WORK_FLOOR);
  });

  it('ralentit à mesure qu’on approche du bout', () => {
    const state = life('fr');
    state.player.countryId = 'de';
    const first = immersionGain(state, 'de');
    state.player.languages.de = 90;
    const last = immersionGain(state, 'de');
    expect(last).toBeLessThan(first / 2);
    state.player.languages.de = 100;
    expect(immersionGain(state, 'de')).toBe(0);
  });

  it('met bien plus longtemps à cinquante ans qu’à vingt', () => {
    const measure = (age: number) => {
      const state = life('fr', 505, 20);
      state.player.age = age;
      // `jp` est le pays, `ja` la langue : les deux identifiants ne sont pas
      // les mêmes, et les confondre renvoyait silencieusement l'anglais.
      state.player.countryId = 'jp';
      let years = 0;
      while (levelOf(state, 'ja') < WORK_FLOOR && years < 200) {
        advanceLanguages(createCtx(state));
        years += 1;
      }
      return years;
    };
    const young = measure(20);
    const old = measure(55);
    expect(old).toBeGreaterThan(young);
    // Et cela reste faisable : un système où partir tard serait impossible
    // n'offrirait pas un choix mais une interdiction.
    expect(old).toBeLessThan(60);
  });
});

/* ------------------------------------------------------------------ */
/* Règle 2 — ce qu'on sait déjà                                        */
/* ------------------------------------------------------------------ */

describe('la destination est une décision', () => {
  it('rend une langue proche plus facile qu’une langue lointaine', () => {
    const near = easeFor({ fr: 100 }, 'es');
    const far = easeFor({ fr: 100 }, 'ja');
    expect(near).toBeGreaterThan(far);
  });

  it('fait apprendre plus vite un pays voisin qu’un pays lointain', () => {
    const years = (target: string) => {
      const state = life('fr', 505, 20);
      state.player.age = 30;
      state.player.countryId = target;
      let n = 0;
      const tongue = localLanguage(state);
      while (levelOf(state, tongue) < WORK_FLOOR && n < 200) {
        advanceLanguages(createCtx(state));
        n += 1;
      }
      return n;
    };
    // L'espagnol pour un francophone, contre le coréen.
    expect(years('es')).toBeLessThan(years('kr'));
  });

  it('n’empêche jamais d’apprendre, même sans rien de proche', () => {
    expect(easeFor({ ja: 100 }, 'fr')).toBeGreaterThan(0);
    expect(easeFor({}, 'fr')).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ */
/* Règle 3 — ne pas parler coûte                                       */
/* ------------------------------------------------------------------ */

describe('ce que ça coûte de ne pas parler', () => {
  it('lit la meilleure des langues utilisables sur place', () => {
    // Un anglophone s'en sort aux Pays-Bas, pas au Japon — et cela sans aucun
    // cas particulier dans le code.
    const state = life('us');
    state.player.countryId = 'nl';
    expect(fluencyHere(state)).toBe(100);
    state.player.countryId = 'jp';
    expect(fluencyHere(state)).toBe(0);
  });

  it('réduit ce que le travail propose, sans jamais l’annuler', () => {
    const state = life('fr');
    expect(workFactor(state)).toBe(1);
    state.player.countryId = 'jp';
    expect(workFactor(state)).toBeLessThan(0.5);
    expect(workFactor(state)).toBeGreaterThan(0.3);
    state.player.languages.ja = WORK_FLOOR;
    expect(workFactor(state)).toBe(1);
  });

  it('réduit ce que valent les rencontres, sans les interdire', () => {
    const state = life('fr');
    expect(socialFactor(state)).toBe(1);
    state.player.countryId = 'jp';
    expect(socialFactor(state)).toBeLessThan(0.6);
    expect(socialFactor(state)).toBeGreaterThan(0.4);
    state.player.languages.ja = SOCIAL_FLOOR;
    expect(socialFactor(state)).toBe(1);
  });

  it('coupe réellement les offres d’emploi de quelqu’un qui ne parle pas', () => {
    // La règle qui donne son poids à l'expatriation : elle doit se voir dans
    // le marché, pas seulement dans une phrase.
    const home = life('fr', 909, 24);
    const salaryOf = (state: GameState) => {
      state.world.jobOffers = [];
      simulateYear(state);
      const offers = state.world.jobOffers;
      return offers.length
        ? offers.reduce((s, o) => s + o.salary, 0) / offers.length : 0;
    };
    const native = salaryOf(home);

    const exile = life('fr', 909, 24);
    exile.player.countryId = 'jp';
    const stranger = salaryOf(exile);
    expect(stranger).toBeGreaterThan(0);
    expect(stranger).toBeLessThan(native);
  });

  it('rend « être d’ici » lisible d’une seule fonction', () => {
    const state = life('fr');
    expect(atHome(state)).toBe(true);
    state.player.countryId = 'kr';
    expect(atHome(state)).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/* Règle 4 — ça s'oublie                                               */
/* ------------------------------------------------------------------ */

describe('ce qui rouille', () => {
  it('perd lentement une langue qu’on n’emploie plus', () => {
    const state = life('fr');
    state.player.languages.es = 70;
    for (let i = 0; i < 10; i++) advanceLanguages(createCtx(state));
    expect(state.player.languages.es).toBeLessThan(70);
    expect(state.player.languages.es).toBeGreaterThan(50);
  });

  it('ne descend jamais sous ce qu’on a vraiment su', () => {
    const state = life('fr');
    state.player.languages.es = 40;
    for (let i = 0; i < 120; i++) advanceLanguages(createCtx(state));
    expect(state.player.languages.es).toBeGreaterThanOrEqual(12);
  });

  it('n’oublie ni la langue maternelle ni celle d’ici', () => {
    const state = life('fr');
    state.player.countryId = 'de';
    state.player.languages.de = 80;
    for (let i = 0; i < 40; i++) advanceLanguages(createCtx(state));
    expect(state.player.languages.fr).toBe(100);
    expect(state.player.languages.de).toBeGreaterThanOrEqual(80);
  });

  it('n’oublie pas une langue de secours du pays où l’on vit', () => {
    const state = life('fr');
    state.player.countryId = 'nl';
    state.player.languages.en = 60;
    for (let i = 0; i < 20; i++) advanceLanguages(createCtx(state));
    expect(state.player.languages.en).toBeGreaterThanOrEqual(60);
  });
});

/* ------------------------------------------------------------------ */
/* Les cours                                                           */
/* ------------------------------------------------------------------ */

describe('prendre des cours', () => {
  it('coûte, et ne se prend qu’une fois par an et par langue', () => {
    const state = life('fr');
    state.player.money = 5_000_000;
    expect(studyBlocker(state, 'es')).toBeNull();
    const before = state.player.money;
    expect(study(createCtx(state), 'es').ok).toBe(true);
    expect(state.player.money).toBe(before - lessonCost(state));
    expect(levelOf(state, 'es')).toBeGreaterThan(0);
    expect(studyBlocker(state, 'es')).not.toBeNull();
    // Une autre langue reste possible : c'est l'année qui est prise, pas toi.
    expect(studyBlocker(state, 'it')).toBeNull();
  });

  it('rapporte bien moins que d’y vivre', () => {
    // C'est ce qui rend l'immersion précieuse plutôt que l'argent.
    const state = life('fr');
    state.player.countryId = 'de';
    state.player.money = 5_000_000;
    const byLiving = immersionGain(state, 'de');
    const before = levelOf(state, 'de');
    study(createCtx(state), 'de');
    const byLesson = levelOf(state, 'de') - before;
    expect(byLesson).toBeLessThan(byLiving);
    expect(byLesson).toBeGreaterThan(0);
  });

  it('refuse ce qui n’a pas de sens', () => {
    const state = life('fr');
    state.player.money = 5_000_000;
    expect(studyBlocker(state, 'fr')).not.toBeNull();
    expect(studyBlocker(state, 'klingon')).not.toBeNull();
    state.player.money = 0;
    expect(studyBlocker(state, 'es')).toContain('coûtent');
  });
});

/* ------------------------------------------------------------------ */
/* L'expatriation, bout à bout                                         */
/* ------------------------------------------------------------------ */

describe('émigrer', () => {
  it('demande un visa, et peut le refuser — la note du catalogue était périmée', () => {
    // Le catalogue disait « ni dossier, ni délai, ni refus ». Deux de ces
    // trois reproches n'étaient plus vrais : on le vérifie plutôt que de
    // recopier une note.
    let refused = 0;
    let granted = 0;
    for (let seed = 0; seed < 30; seed++) {
      const state = life('fr', seed * 31 + 3, 30);
      state.player.money = 5_000_000;
      state.player.criminalRecord.convictions = [];
      const result = immigrate(createCtx(state), 'jp');
      if (result.title === 'Visa refusé') refused += 1;
      if (result.title === 'Visa accordé') granted += 1;
    }
    expect(granted).toBeGreaterThan(0);
    expect(refused).toBeGreaterThan(0);
  });

  it('laisse arriver quelqu’un qui ne parle pas, et le lui fait sentir', () => {
    const state = life('fr', 11, 30);
    state.player.money = 5_000_000;
    state.player.countryId = 'jp';
    expect(fluencyHere(state)).toBe(0);
    expect(fluencyLabel(0)).toBe('Pas un mot');
    expect(workFactor(state)).toBeLessThan(1);
  });

  it('finit par rendre chez soi un pays où l’on a vécu longtemps', () => {
    // La contre-épreuve : la peine doit avoir une fin, sinon partir serait
    // une condamnation et non un choix.
    const state = life('fr', 77, 22);
    state.player.countryId = 'es';
    for (let i = 0; i < 25 && state.player.alive; i++) simulateYear(state);
    expect(atHome(state)).toBe(true);
    expect(workFactor(state)).toBe(1);
    expect(levelOf(state, 'es')).toBeGreaterThan(FLUENT - 30);
  });

  it('ne casse rien pour l’immense majorité des vies, qui ne bougent pas', () => {
    for (const countryId of ['fr', 'jp', 'br', 'ru', 'ng']) {
      const state = life(countryId, 4242, 40);
      expect(atHome(state), countryId).toBe(true);
      expect(workFactor(state), countryId).toBe(1);
      expect(socialFactor(state), countryId).toBe(1);
    }
  });
});
