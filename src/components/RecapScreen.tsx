/**
 * Écran de récap d'impact — la "fiche de personnage" avant de lancer la vie.
 * Montre les stats finales calculées, les méta-stats (pays/social), le détail
 * des contributions par choix, et la phrase de destin générée.
 */
import type { CharacterCreation } from "../types";
import { STAT_KEYS, STAT_LABELS, META_LABELS, type MetaKey } from "../types";
import { computeImpact } from "../engine/character";
import { destinyPhrase } from "../engine/destiny";
import { StatBar, money } from "./ui";
import { Avatar } from "./Avatar";
import { avatarFromCreation } from "../engine/avatar";
import { COUNTRY_BY_ID } from "../data/countries";
import { ERA_BY_ID } from "../data/eras";

const META_SHOWN: MetaKey[] = [
  "lifeExpectancy",
  "startingMoney",
  "inheritance",
  "familyDebt",
  "healthcareQuality",
  "networkQuality",
  "mentalHealth",
  "addictionRisk",
];

export function RecapScreen({ creation, onStart, onBack }: { creation: CharacterCreation; onStart: () => void; onBack: () => void }) {
  const impact = computeImpact(creation);
  const country = COUNTRY_BY_ID[creation.countryId];
  const era = ERA_BY_ID[creation.eraId];

  // Regroupe toutes les contributions par source pour le "récap d'impact".
  const bySource = new Map<string, number>();
  for (const m of impact.allModifiers) {
    bySource.set(m.source, (bySource.get(m.source) ?? 0) + 1);
  }

  return (
    <div>
      <div className="sheet">
        <div className="sheet-head">
          <Avatar a={avatarFromCreation(creation)} size={82} ring="var(--accent)" />
          <div>
            <h2>{country?.icon} {creation.firstName} {creation.lastName}</h2>
            <div className="field-hint">
              {creation.sex} · {country?.label} · Époque {era?.label}
            </div>
          </div>
        </div>

        <div className="destiny">{destinyPhrase(creation, impact.stats)}</div>

        <div className="section-title">Stats finales</div>
        <div className="stat-alloc">
          {STAT_KEYS.map((k) => (
            <StatBar key={k} name={STAT_LABELS[k]} value={impact.stats[k]} />
          ))}
        </div>

        <div className="meta-grid">
          {META_SHOWN.map((k) => (
            <div key={k} className="meta-cell">
              <div className="k">{META_LABELS[k]}</div>
              <div className="v">
                {k === "startingMoney" || k === "inheritance" || k === "familyDebt"
                  ? money(impact.meta[k])
                  : k === "lifeExpectancy"
                    ? `${impact.meta[k]} ans`
                    : impact.meta[k]}
              </div>
            </div>
          ))}
        </div>

        <div className="divider" />
        <div className="section-title">Patrimoine net de départ</div>
        <div className="age-badge">
          <span className={impact.money >= 0 ? "money-badge pos" : "money-badge neg"}>{money(impact.money)}</span>
        </div>
      </div>

      <div className="spacer" />

      <div className="section">
        <div className="section-title">Comment tes choix ont façonné ce perso</div>
        <div className="impact-panel">
          {[...bySource.entries()].map(([source, count]) => (
            <div key={source} className="impact-item">
              <span>{source}</span>
              <span className="src">{count} modificateur{count > 1 ? "s" : ""}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="row">
        <button className="btn btn-ghost" onClick={onBack}>← Modifier</button>
        <button className="btn btn-primary" onClick={onStart}>Commencer la vie →</button>
      </div>
      <div style={{ height: 20 }} />
    </div>
  );
}
