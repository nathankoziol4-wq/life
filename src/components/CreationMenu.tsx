/**
 * Menu de création — le cœur du jeu. Six onglets, chacun poussant des choix qui
 * modifient mécaniquement le personnage. Un panneau d'impact vit à droite/bas et
 * se met à jour en temps réel. Le bouton "Valider" mène à l'écran de récap.
 */
import { useMemo, useRef, useState } from "react";
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
import {
  CITY_TYPES, RELIGIONS, SKIN_TONES, HAIR_STYLES, EYE_COLORS, FEATURES, VOICES,
  ORIENTATIONS, VALUES, FEARS, TEMPERAMENTS, VICES, LIFE_GOALS,
} from "../data/customization";
import { computeImpact, STAT_POOL, STAT_MAX_ALLOC } from "../engine/character";
import { destinyPhrase } from "../engine/destiny";
import { Avatar } from "./Avatar";
import { avatarFromCreation, HAIR_SHAPES, ACCESSORIES } from "../engine/avatar";

const HAIR_STYLE_OPTS = HAIR_SHAPES.map((h) => ({ id: h.id, label: h.label, icon: h.icon, modifiers: [] }));
const ACCESSORY_OPTS = ACCESSORIES.map((a) => ({ id: a.id, label: a.label, icon: a.icon, modifiers: [] }));

/** Prénoms/noms pour le générateur aléatoire. */
const RANDOM_FIRST = ["Camille", "Alex", "Sam", "Noa", "Lou", "Jules", "Léa", "Marius", "Inès", "Théo", "Nina", "Gabriel", "Yasmine", "Kenji", "Amara", "Diego", "Sofia", "Liam"];
const RANDOM_LAST = ["Martin", "Dubois", "Nakamura", "Okafor", "Silva", "Kowalski", "Rossi", "Andersson", "Haddad", "Nguyen", "Ivanov", "Costa"];

const TABS = [
  { id: "origine", label: "Origine", icon: "🌍" },
  { id: "physique", label: "Génétique", icon: "🧬" },
  { id: "stats", label: "Stats", icon: "📊" },
  { id: "perso", label: "Personnalité", icon: "🎭" },
  { id: "talents", label: "Talents & Défis", icon: "⭐" },
  { id: "astro", label: "Rêves & Astro", icon: "🔮" },
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
  cityTypeId: "ville",
  religionId: "aucune",
  appearance: 50,
  height: 172,
  build: "moyenne",
  genetics: { bloodType: "O+", predispositions: [], allergies: [], disability: "aucun" },
  skinToneId: "clair",
  hairId: "brun",
  hairStyleId: "court",
  eyesId: "marron",
  featureId: "aucun_feature",
  accessoryId: "aucun",
  voiceId: "posee",
  allocatedStats: emptyStats(),
  traitIds: [],
  moralAlignment: 0,
  orientationId: "hetero",
  valueIds: [],
  fearIds: [],
  temperamentId: "sanguin",
  talentIds: [],
  challengeIds: [],
  viceIds: [],
  lifeGoalId: "bonheur_simple",
  zodiacId: "belier",
  startingKarma: 0,
};

export function CreationMenu({ onComplete }: { onComplete: (c: CharacterCreation) => void }) {
  const [tab, setTabState] = useState<(typeof TABS)[number]["id"]>("origine");
  const [visited, setVisited] = useState<Set<string>>(new Set(["origine"]));
  const [c, setC] = useState<CharacterCreation>(DEFAULT);
  const tabsRef = useRef<HTMLDivElement>(null);

  const impact = useMemo(() => computeImpact(c), [c]);
  const spent = STAT_KEYS.reduce((s, k) => s + c.allocatedStats[k], 0);
  const remaining = STAT_POOL - spent;

  /** Change d'étape : marque visitée, remonte en haut, centre l'onglet actif. */
  const goTab = (id: (typeof TABS)[number]["id"]) => {
    setTabState(id);
    setVisited((v) => new Set(v).add(id));
    window.scrollTo({ top: 0, behavior: "smooth" });
    requestAnimationFrame(() => {
      const el = tabsRef.current?.querySelector(`[data-tab="${id}"]`);
      el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    });
  };

  const set = (patch: Partial<CharacterCreation>) => setC((prev) => ({ ...prev, ...patch }));

  // --- Sélecteurs génériques ---
  const single = (key: keyof CharacterCreation) => (id: string) => set({ [key]: id } as Partial<CharacterCreation>);
  const toggleMulti = (key: "traitIds" | "talentIds" | "challengeIds" | "valueIds" | "fearIds" | "viceIds", max?: number) => (id: string) => {
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
  const nextTab = TABS[tabIndex + 1];

  // Complétion par étape (pour cocher les onglets et la barre de progression).
  const doneMap: Record<string, boolean> = {
    origine: nameOk,
    physique: visited.has("physique"),
    stats: spent === STAT_POOL,
    perso: traitsOk,
    talents: visited.has("talents"),
    astro: visited.has("astro"),
  };
  const doneCount = TABS.filter((t) => doneMap[t.id]).length;
  const progressPct = Math.round((doneCount / TABS.length) * 100);

  return (
    <div>
      {/* En-tête de parcours : étape + progression */}
      <div className="creation-progress">
        <div className="cp-top">
          <span className="cp-step">Étape {tabIndex + 1}<span className="cp-total">/{TABS.length}</span> · {TABS[tabIndex].label}</span>
          <span className="cp-pct">{progressPct}%</span>
        </div>
        <div className="cp-track"><span className="cp-fill" style={{ width: `${progressPct}%` }} /></div>
      </div>

      <div className="tabs" ref={tabsRef}>
        {TABS.map((t) => (
          <button
            key={t.id}
            data-tab={t.id}
            className={`tab${t.id === tab ? " active" : ""}${doneMap[t.id] ? " done" : ""}`}
            onClick={() => goTab(t.id)}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </div>

      <div className="tab-pane" key={tab}>
      {/* ----------------------------- ORIGINE ----------------------------- */}
      {tab === "origine" && (
        <div>
          <div className="section">
            <div className="section-title">Identité</div>
            <div className="row">
              <input className="input" placeholder="Prénom" value={c.firstName} onChange={(e) => set({ firstName: e.target.value })} />
              <input className="input" placeholder="Nom" value={c.lastName} onChange={(e) => set({ lastName: e.target.value })} />
              <button className="btn btn-ghost" style={{ flex: "0 0 auto", width: "auto", padding: "0 14px" }} title="Prénom & nom aléatoires" onClick={() => set({ firstName: RANDOM_FIRST[Math.floor(Math.random() * RANDOM_FIRST.length)], lastName: RANDOM_LAST[Math.floor(Math.random() * RANDOM_LAST.length)] })}>🎲</button>
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

          <div className="section">
            <div className="section-title">Cadre de vie</div>
            <div className="field-hint">Métropole, ville ou campagne : réseau, santé et criminalité en dépendent.</div>
            <ChoiceGrid options={CITY_TYPES} selected={[c.cityTypeId]} onSelect={single("cityTypeId")} />
          </div>

          <div className="section">
            <div className="section-title">Religion / spiritualité</div>
            <ChoiceGrid compact options={RELIGIONS} selected={[c.religionId]} onSelect={single("religionId")} />
          </div>
        </div>
      )}

      {/* ----------------------------- PHYSIQUE ----------------------------- */}
      {tab === "physique" && (
        <div>
          <div className="avatar-hero">
            <Avatar a={avatarFromCreation(c)} size={110} ring="var(--accent)" />
            <div className="avatar-hero-info">
              <div className="ah-name">{c.firstName || "Ton personnage"} {c.lastName}</div>
              <div className="ah-hint">Ta tête se met à jour selon tes choix ci-dessous.</div>
            </div>
          </div>
          <div className="section">
            <div className="section-title">Coiffure</div>
            <ChoiceGrid compact options={HAIR_STYLE_OPTS} selected={[c.hairStyleId]} onSelect={single("hairStyleId")} />
          </div>
          <div className="section">
            <div className="section-title">Accessoire</div>
            <ChoiceGrid compact options={ACCESSORY_OPTS} selected={[c.accessoryId]} onSelect={single("accessoryId")} />
          </div>
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
            <div className="section-title">Carnation</div>
            <ChoiceGrid compact options={SKIN_TONES} selected={[c.skinToneId]} onSelect={single("skinToneId")} />
          </div>
          <div className="section">
            <div className="section-title">Cheveux</div>
            <ChoiceGrid compact options={HAIR_STYLES} selected={[c.hairId]} onSelect={single("hairId")} />
          </div>
          <div className="section">
            <div className="section-title">Yeux</div>
            <ChoiceGrid compact options={EYE_COLORS} selected={[c.eyesId]} onSelect={single("eyesId")} />
          </div>
          <div className="section">
            <div className="section-title">Trait distinctif</div>
            <ChoiceGrid compact options={FEATURES} selected={[c.featureId]} onSelect={single("featureId")} />
          </div>
          <div className="section">
            <div className="section-title">Voix</div>
            <ChoiceGrid compact options={VOICES} selected={[c.voiceId]} onSelect={single("voiceId")} />
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
          <div className="section">
            <div className="section-title">Tempérament</div>
            <ChoiceGrid options={TEMPERAMENTS} selected={[c.temperamentId]} onSelect={single("temperamentId")} />
          </div>
          <div className="section">
            <div className="section-title">Valeurs cardinales (jusqu'à 3)</div>
            <div className="field-hint">Ce qui compte le plus pour toi — oriente ton bonheur et tes choix.</div>
            <ChoiceGrid options={VALUES} selected={c.valueIds} onSelect={toggleMulti("valueIds", 3)} />
          </div>
          <div className="section">
            <div className="section-title">Peurs (jusqu'à 2)</div>
            <ChoiceGrid options={FEARS} selected={c.fearIds} onSelect={toggleMulti("fearIds", 2)} />
          </div>
          <div className="section">
            <div className="section-title">Orientation</div>
            <ChoiceGrid compact options={ORIENTATIONS} selected={[c.orientationId]} onSelect={single("orientationId")} />
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
          <div className="section">
            <div className="section-title">Vices & habitudes de départ (multi)</div>
            <div className="field-hint">Des plaisirs qui coûtent : santé, discipline, risque d'addiction.</div>
            <ChoiceGrid options={VICES} selected={c.viceIds} onSelect={toggleMulti("viceIds")} />
          </div>
        </div>
      )}

      {/* ----------------------------- ASTRO ----------------------------- */}
      {tab === "astro" && (
        <div>
          <div className="section">
            <div className="section-title">Objectif de vie</div>
            <div className="field-hint">Ton rêve directeur. L'atteindre couronnera ta partie d'un accomplissement.</div>
            <ChoiceGrid options={LIFE_GOALS} selected={[c.lifeGoalId]} onSelect={single("lifeGoalId")} />
          </div>
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
      </div>

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
      {!canValidate && isLast && (
        <div className="nav-hint">
          {!nameOk ? "Il te manque un prénom et un nom (étape Origine)." : !traitsOk ? "Choisis au moins 3 traits (étape Personnalité)." : "Presque prêt !"}
        </div>
      )}
      <div style={{ height: 10 }} />
      <div className="nav-bar">
        {tabIndex > 0 && (
          <button className="btn btn-ghost nav-prev" onClick={() => goTab(TABS[tabIndex - 1].id)}>←</button>
        )}
        {!isLast ? (
          <button className="btn btn-primary nav-next" onClick={() => goTab(nextTab.id)}>
            <span>Suivant</span>
            <small>{nextTab.icon} {nextTab.label}</small>
          </button>
        ) : (
          <button className="btn btn-primary nav-next" disabled={!canValidate} onClick={() => onComplete(c)}>
            {canValidate ? "✓ Voir la fiche de destin" : nameOk ? (traitsOk ? "Termine ta création" : "Choisis 3 traits min.") : "Nomme ton perso"}
          </button>
        )}
      </div>
      <div style={{ height: 20 }} />
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
