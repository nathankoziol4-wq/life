/**
 * Menu de création — le cœur du jeu. Six onglets, chacun poussant des choix qui
 * modifient mécaniquement le personnage. Un panneau d'impact vit à droite/bas et
 * se met à jour en temps réel. Le bouton "Valider" mène à l'écran de récap.
 */
import { useMemo, useState } from "react";
import type { CharacterCreation, StatKey } from "../types";
import { STAT_KEYS, STAT_LABELS } from "../types";
import { ChoiceGrid } from "./ui";
import { COUNTRIES } from "../data/countries";
import { ERAS } from "../data/eras";
import { SOCIAL_CLASSES } from "../data/socialClasses";
import { FAMILY_STRUCTURES } from "../data/familyStructures";
import { BUILDS, PREDISPOSITIONS, BLOOD_TYPES, ALLERGIES, DISABILITIES } from "../data/physique";
import { TRAITS } from "../data/traits";
import { TALENTS, CHALLENGES } from "../data/talents";
import { ZODIAC_SIGNS } from "../data/zodiac";
import { computeImpact, STAT_POOL, STAT_MAX_ALLOC } from "../engine/character";
import { destinyPhrase } from "../engine/destiny";

const TABS = [
  { id: "origine", label: "Origine", icon: "🌍" },
  { id: "physique", label: "Génétique", icon: "🧬" },
  { id: "stats", label: "Stats", icon: "📊" },
  { id: "perso", label: "Personnalité", icon: "🎭" },
  { id: "talents", label: "Talents & Défis", icon: "⭐" },
  { id: "astro", label: "Astro", icon: "🔮" },
] as const;

const emptyStats = () => STAT_KEYS.reduce((o, k) => ({ ...o, [k]: 0 }), {} as Record<StatKey, number>);

const DEFAULT: CharacterCreation = {
  firstName: "",
  lastName: "",
  sex: "homme",
  countryId: "fr",
  eraId: "millennial",
  socialClassId: "moyen",
  familyStructureId: "maries",
  appearance: 50,
  height: 172,
  build: "moyenne",
  genetics: { bloodType: "O+", predispositions: [], allergies: [], disability: "aucun" },
  allocatedStats: emptyStats(),
  traitIds: [],
  moralAlignment: 0,
  talentIds: [],
  challengeIds: [],
  zodiacId: "belier",
  startingKarma: 0,
};

export function CreationMenu({ onComplete }: { onComplete: (c: CharacterCreation) => void }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("origine");
  const [c, setC] = useState<CharacterCreation>(DEFAULT);

  const impact = useMemo(() => computeImpact(c), [c]);
  const spent = STAT_KEYS.reduce((s, k) => s + c.allocatedStats[k], 0);
  const remaining = STAT_POOL - spent;

  const set = (patch: Partial<CharacterCreation>) => setC((prev) => ({ ...prev, ...patch }));

  // --- Sélecteurs génériques ---
  const single = (key: keyof CharacterCreation) => (id: string) => set({ [key]: id } as Partial<CharacterCreation>);
  const toggleMulti = (key: "traitIds" | "talentIds" | "challengeIds", max?: number) => (id: string) => {
    const arr = c[key];
    const next = arr.includes(id) ? arr.filter((x) => x !== id) : max && arr.length >= max ? arr : [...arr, id];
    set({ [key]: next } as Partial<CharacterCreation>);
  };
  const togglePredis = (id: string) => {
    const arr = c.genetics.predispositions;
    const next = arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
    set({ genetics: { ...c.genetics, predispositions: next } });
  };
  const toggleAllergy = (id: string) => {
    const arr = c.genetics.allergies;
    const next = arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
    set({ genetics: { ...c.genetics, allergies: next } });
  };

  const nameOk = c.firstName.trim().length > 0 && c.lastName.trim().length > 0;
  const traitsOk = c.traitIds.length >= 3;
  const statsOk = remaining >= 0;
  const canValidate = nameOk && traitsOk && statsOk;

  const tabIndex = TABS.findIndex((t) => t.id === tab);
  const isLast = tabIndex === TABS.length - 1;

  return (
    <div>
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`tab${t.id === tab ? " active" : ""}`} onClick={() => setTab(t.id)}>
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      {/* ----------------------------- ORIGINE ----------------------------- */}
      {tab === "origine" && (
        <div>
          <div className="section">
            <div className="section-title">Identité</div>
            <div className="row">
              <input className="input" placeholder="Prénom" value={c.firstName} onChange={(e) => set({ firstName: e.target.value })} />
              <input className="input" placeholder="Nom" value={c.lastName} onChange={(e) => set({ lastName: e.target.value })} />
            </div>
            <div className="spacer-sm" />
            <ChoiceGrid
              compact
              options={[
                { id: "homme", label: "Homme", icon: "♂", modifiers: [] },
                { id: "femme", label: "Femme", icon: "♀", modifiers: [] },
                { id: "non-binaire", label: "Non-binaire", icon: "⚧", modifiers: [] },
              ]}
              selected={[c.sex]}
              onSelect={(id) => set({ sex: id as CharacterCreation["sex"] })}
            />
          </div>

          <div className="section">
            <div className="section-title">Pays de naissance</div>
            <div className="field-hint">Détermine espérance de vie, revenus, coût des études, santé publique et criminalité.</div>
            <ChoiceGrid compact options={COUNTRIES} selected={[c.countryId]} onSelect={single("countryId")} />
          </div>

          <div className="section">
            <div className="section-title">Époque de naissance</div>
            <div className="field-hint">Change les technologies, métiers et événements historiques traversés.</div>
            <ChoiceGrid options={ERAS} selected={[c.eraId]} onSelect={single("eraId")} />
          </div>

          <div className="section">
            <div className="section-title">Milieu social des parents</div>
            <ChoiceGrid options={SOCIAL_CLASSES} selected={[c.socialClassId]} onSelect={single("socialClassId")} />
          </div>

          <div className="section">
            <div className="section-title">Structure familiale</div>
            <ChoiceGrid options={FAMILY_STRUCTURES} selected={[c.familyStructureId]} onSelect={single("familyStructureId")} />
          </div>
        </div>
      )}

      {/* ----------------------------- PHYSIQUE ----------------------------- */}
      {tab === "physique" && (
        <div>
          <div className="section">
            <div className="section-title">Apparence (attrait)</div>
            <div className="field-hint">Influence relations, popularité, certaines carrières — et le harcèlement.</div>
            <Slider min={0} max={100} value={c.appearance} onChange={(v) => set({ appearance: v })} suffix="/100" />
          </div>
          <div className="section">
            <div className="section-title">Taille</div>
            <Slider min={140} max={210} value={c.height} onChange={(v) => set({ height: v })} suffix=" cm" />
          </div>
          <div className="section">
            <div className="section-title">Corpulence</div>
            <ChoiceGrid options={BUILDS} selected={[c.build]} onSelect={single("build")} />
          </div>
          <div className="section">
            <div className="section-title">Prédispositions génétiques (multi)</div>
            <div className="field-hint">Chaque prédisposition arme des événements santé qui se déclencheront plus tard.</div>
            <ChoiceGrid options={PREDISPOSITIONS} selected={c.genetics.predispositions} onSelect={togglePredis} />
          </div>
          <div className="section">
            <div className="section-title">Groupe sanguin</div>
            <select value={c.genetics.bloodType} onChange={(e) => set({ genetics: { ...c.genetics, bloodType: e.target.value } })}>
              {BLOOD_TYPES.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          <div className="section">
            <div className="section-title">Allergies (multi)</div>
            <ChoiceGrid compact options={ALLERGIES} selected={c.genetics.allergies} onSelect={toggleAllergy} />
          </div>
          <div className="section">
            <div className="section-title">Handicap éventuel</div>
            <ChoiceGrid options={DISABILITIES} selected={[c.genetics.disability ?? "aucun"]} onSelect={(id) => set({ genetics: { ...c.genetics, disability: id } })} />
          </div>
        </div>
      )}

      {/* ----------------------------- STATS ----------------------------- */}
      {tab === "stats" && (
        <div>
          <div className="pool-banner">
            <span>Points à répartir</span>
            <span className={`pts${remaining <= 0 ? " empty" : ""}`}>{remaining}</span>
          </div>
          <div className="field-hint">
            Chaque perso démarre à 30 dans chaque stat. Répartis {STAT_POOL} points bonus (max {STAT_MAX_ALLOC}/stat). Les
            backgrounds ajoutent leurs propres bonus/malus par-dessus. La <strong>Chance</strong> influence tous les jets aléatoires.
          </div>
          <div className="stat-alloc">
            {STAT_KEYS.map((k) => (
              <div key={k} className="slider-row">
                <div className="slider-head">
                  <span>{STAT_LABELS[k]} <span className="warn-text">→ {impact.stats[k]} final</span></span>
                  <span className="stepper">
                    <button disabled={c.allocatedStats[k] <= 0} onClick={() => set({ allocatedStats: { ...c.allocatedStats, [k]: c.allocatedStats[k] - 5 } })}>−</button>
                    <span className="num">{c.allocatedStats[k]}</span>
                    <button
                      disabled={remaining <= 0 || c.allocatedStats[k] >= STAT_MAX_ALLOC}
                      onClick={() => set({ allocatedStats: { ...c.allocatedStats, [k]: Math.min(STAT_MAX_ALLOC, c.allocatedStats[k] + 5) } })}
                    >+</button>
                  </span>
                </div>
                <div className="statbar">
                  <span className="track"><span className="fill" style={{ width: `${impact.stats[k]}%` }} /></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ----------------------------- PERSONNALITÉ ----------------------------- */}
      {tab === "perso" && (
        <div>
          <div className="section">
            <div className="section-title">Traits de caractère (choisis 3 à 5)</div>
            <div className="field-hint">
              Sélectionnés : {c.traitIds.length}/5. {c.traitIds.length < 3 ? <span className="warn-text">Minimum 3 requis.</span> : null} Les traits ouvrent ou verrouillent des choix dans les événements.
            </div>
            <ChoiceGrid options={TRAITS} selected={c.traitIds} onSelect={toggleMulti("traitIds", 5)} />
          </div>
          <div className="section">
            <div className="section-title">Orientation morale</div>
            <div className="field-hint">Axe opportuniste ↔ altruiste. Débloque des branches (crime, philanthropie, politique).</div>
            <div className="slider-head">
              <span className="warn-text">Opportuniste</span>
              <span className="val">{c.moralAlignment > 0 ? "+" : ""}{c.moralAlignment}</span>
              <span className="warn-text">Altruiste</span>
            </div>
            <input type="range" min={-100} max={100} step={5} value={c.moralAlignment} onChange={(e) => set({ moralAlignment: Number(e.target.value) })} />
          </div>
        </div>
      )}

      {/* ----------------------------- TALENTS & DÉFIS ----------------------------- */}
      {tab === "talents" && (
        <div>
          <div className="section">
            <div className="section-title">Dons innés (multi)</div>
            <div className="field-hint">Boostent l'apprentissage et déclenchent des événements "prodige".</div>
            <ChoiceGrid options={TALENTS} selected={c.talentIds} onSelect={toggleMulti("talentIds")} />
          </div>
          <div className="section">
            <div className="section-title">Malédictions / défis (mode hardcore)</div>
            <div className="field-hint">Malus lourds, mais chaque défi ouvre des branches narratives uniques.</div>
            <ChoiceGrid options={CHALLENGES} selected={c.challengeIds} onSelect={toggleMulti("challengeIds")} />
          </div>
        </div>
      )}

      {/* ----------------------------- ASTRO ----------------------------- */}
      {tab === "astro" && (
        <div>
          <div className="section">
            <div className="section-title">Signe astrologique</div>
            <div className="field-hint">Couche mystique optionnelle : petits modificateurs de chance et clins d'œil.</div>
            <ChoiceGrid compact options={ZODIAC_SIGNS} selected={[c.zodiacId]} onSelect={single("zodiacId")} />
          </div>
          <div className="section">
            <div className="section-title">Karma de départ</div>
            <div className="slider-head">
              <span className="warn-text">Malchance</span>
              <span className="val">{c.startingKarma > 0 ? "+" : ""}{c.startingKarma}</span>
              <span className="warn-text">Bénédiction</span>
            </div>
            <input type="range" min={-50} max={50} step={5} value={c.startingKarma} onChange={(e) => set({ startingKarma: Number(e.target.value) })} />
          </div>
        </div>
      )}

      {/* ----------------------------- APERÇU IMPACT (toujours visible) ----------------------------- */}
      <div className="section">
        <div className="section-title">Aperçu d'impact en direct</div>
        <div className="impact-panel">
          {STAT_KEYS.map((k) => {
            const bd = impact.statBreakdown[k];
            const delta = bd ? bd.final - bd.base : 0;
            return (
              <div key={k} className="impact-item">
                <span>{STAT_LABELS[k]} <strong>{impact.stats[k]}</strong></span>
                <span className={`delta ${delta >= 0 ? "pos" : "neg"}`}>{delta >= 0 ? "+" : ""}{delta} via choix</span>
              </div>
            );
          })}
          <div className="divider" />
          <div className="destiny">{destinyPhrase(c, impact.stats)}</div>
        </div>
      </div>

      {/* ----------------------------- NAVIGATION ----------------------------- */}
      <div style={{ height: 12 }} />
      <div className="row">
        {tabIndex > 0 && (
          <button className="btn btn-ghost" onClick={() => setTab(TABS[tabIndex - 1].id)}>← Précédent</button>
        )}
        {!isLast ? (
          <button className="btn btn-primary" onClick={() => setTab(TABS[tabIndex + 1].id)}>Suivant →</button>
        ) : (
          <button className="btn btn-primary" disabled={!canValidate} onClick={() => onComplete(c)}>
            {canValidate ? "Voir le récap ✓" : nameOk ? (traitsOk ? "Répartis tes points" : "Choisis 3 traits min.") : "Nomme ton perso"}
          </button>
        )}
      </div>
    </div>
  );
}

function Slider({ min, max, value, onChange, suffix }: { min: number; max: number; value: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div className="slider-row">
      <div className="slider-head">
        <span />
        <span className="val">{value}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}
