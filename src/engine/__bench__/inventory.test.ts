/** Inventaire du contenu : garde-fou contre l'appauvrissement des données. */

import { expect, it } from 'vitest';
import { ALL_EVENTS } from '../../data/events/index.ts';
import { JOBS, TOTAL_POSITIONS } from '../../data/jobs.ts';
import { COUNTRIES } from '../../data/countries.ts';
import { DISEASES } from '../../data/diseases.ts';
import { VEHICLE_MODELS } from '../../data/vehicles.ts';
import { PROPERTY_ARCHETYPES } from '../../data/properties.ts';
import { MAJORS, VOCATIONAL_COURSES } from '../../data/degrees.ts';
import { CRIMES } from '../../data/crimes.ts';
import { COSMETIC_PROCEDURES, DESTINATIONS, NIGHTLIFE, PET_SPECIES, SHOP_ITEMS, SPORTS, WELLNESS } from '../../data/activities.ts';

it('recense le contenu disponible', () => {
  let choices = 0;
  let outcomes = 0;
  for (const e of ALL_EVENTS) {
    choices += e.choices.length;
    for (const c of e.choices) outcomes += c.outcomes.length;
  }
  const cities = COUNTRIES.reduce((s, c) => s + c.cities.length, 0);
  const activities = COSMETIC_PROCEDURES.length + DESTINATIONS.length + NIGHTLIFE.length
    + PET_SPECIES.length + SHOP_ITEMS.length + SPORTS.length + WELLNESS.length;

  console.log(
    `événements ${ALL_EVENTS.length} (${choices} choix, ${outcomes} issues) · `
    + `métiers ${JOBS.length} → ${TOTAL_POSITIONS} postes · pays ${COUNTRIES.length} (${cities} villes) · `
    + `maladies ${DISEASES.length} · véhicules ${VEHICLE_MODELS.length} · biens ${PROPERTY_ARCHETYPES.length} · `
    + `filières ${MAJORS.length} + ${VOCATIONAL_COURSES.length} · délits ${CRIMES.length} · activités ${activities}`,
  );

  // Seuils bas volontairement : ils signalent une régression, pas un plafond.
  expect(ALL_EVENTS.length).toBeGreaterThanOrEqual(100);
  expect(outcomes).toBeGreaterThanOrEqual(300);
  expect(TOTAL_POSITIONS).toBeGreaterThanOrEqual(300);
  expect(activities).toBeGreaterThanOrEqual(60);
});
