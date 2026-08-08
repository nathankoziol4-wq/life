/**
 * Création d'une vie.
 *
 * L'écran est construit autour d'une conviction : ce qui rend deux vies
 * différentes, ce n'est pas la couleur des yeux, c'est l'endroit où l'on naît
 * et la famille dans laquelle on tombe. L'apparence tient donc en une carte,
 * l'environnement en occupe une douzaine.
 *
 * Chaque réglage affiche l'effet qu'il produit, et l'aperçu est recalculé par
 * le vrai générateur : ce qu'on voit ici est exactement ce que la partie
 * utilisera.
 */

import { useMemo, useState } from 'react';
import { Button, Card, Gauge, Pill, Row, Section, Segmented, Sheet } from '../components/Modal.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { COUNTRIES, getCountry } from '../data/countries.ts';
import { ORIGIN_PRESETS, getPreset } from '../data/originPresets.ts';
import { NEIGHBORHOOD_ARCHETYPES, NEIGHBORHOOD_MAP, ZONE_LABELS } from '../data/neighborhoods.ts';
import { HOUSING_MAP, LIVING_LABELS, housingForZone, tenuresFor } from '../data/housing.ts';
import { SCHOOL_MAP } from '../data/schools.ts';
import { REGION_ARCHETYPES, regionsFor } from '../data/regions.ts';
import { coherenceWarnings, previewOrigin } from '../systems/originGen.ts';
import { randomSeed } from '../engine/rng.ts';
import type {
  FamilyStructure, HousingType, LivingConditions, OriginDraft, ResidentialZone, Tenure,
} from '../engine/origin.ts';
import type { Sex } from '../engine/types.ts';

type Draft = Partial<OriginDraft>;

const STRUCTURES: FamilyStructure[] = [
  'deux parents', 'parent seul', 'parents séparés', 'famille recomposée',
  'adoption', 'famille d’accueil', 'grands-parents',
];

const SEX_OPTIONS = [
  { value: 'random' as const, label: 'Hasard' },
  { value: 'M' as const, label: 'Garçon' },
  { value: 'F' as const, label: 'Fille' },
];

export function CreationScreen({ onBack }: { onBack: () => void }) {
  const { startNewLife } = useGame();
  const [advanced, setAdvanced] = useState(false);
  const [seed, setSeed] = useState(() => randomSeed());
  const [draft, setDraft] = useState<Draft>({});
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [sex, setSex] = useState<Sex | 'random'>('random');
  const [explanation, setExplanation] = useState('');

  const birthYear = new Date().getFullYear();
  const preview = useMemo(
    () => previewOrigin(draft, seed, birthYear),
    [draft, seed, birthYear],
  );
  const { origin, draft: resolved, nationalIncome } = preview;
  const warnings = useMemo(
    () => coherenceWarnings(origin, nationalIncome),
    [origin, nationalIncome],
  );
  const country = getCountry(resolved.countryId);
  const preset = getPreset(resolved.presetId);

  /** Fixe un champ du brouillon. Les champs dépendants sont libérés. */
  const set = (patch: Draft) => setDraft((d) => ({ ...d, ...patch }));

  /** Rejoue le hasard sur une catégorie en effaçant ce qu'elle contient. */
  const shuffle = (keys: (keyof OriginDraft)[]) => {
    setDraft((d) => {
      const next = { ...d };
      for (const key of keys) delete next[key];
      return next;
    });
    setSeed(randomSeed());
  };

  const dice = (keys: (keyof OriginDraft)[]) => (
    <button className="pill" type="button" onClick={() => shuffle(keys)} aria-label="Au hasard">
      🎲
    </button>
  );

  const zones = NEIGHBORHOOD_MAP[resolved.neighborhoodId]?.zones ?? [];
  const housingChoices = housingForZone(resolved.zone);
  const money = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} ${country.symbol}`;

  return (
    <Sheet
      title="Créer une vie"
      onBack={onBack}
      action={dice([
        'presetId', 'countryId', 'regionId', 'cityName', 'neighborhoodId',
        'zone', 'housingType', 'tenure', 'structure', 'siblings',
      ])}
    >
      <div className="field">
        <Segmented
          value={advanced ? 'advanced' : 'quick'}
          onChange={(v) => setAdvanced(v === 'advanced')}
          options={[
            { value: 'quick', label: 'Rapide' },
            { value: 'advanced', label: 'Détaillé' },
          ]}
        />
        <p className="small muted" style={{ margin: '8px 4px 0' }}>
          {advanced
            ? 'Chaque réglage indique ce qu’il change dans la simulation.'
            : 'Choisis un point de départ, le reste est tiré de façon cohérente.'}
        </p>
      </div>

      {/* 1. Contexte de départ ------------------------------------- */}
      <Section title="Point de départ" action={dice(['presetId'])}>
        <Card>
          {ORIGIN_PRESETS.map((p) => (
            <Row
              key={p.id}
              emoji={p.emoji}
              title={p.label}
              sub={p.description}
              right={resolved.presetId === p.id ? <Pill tone="primary">Choisi</Pill> : undefined}
              onClick={() => set({
                presetId: p.id,
                neighborhoodId: undefined,
                zone: undefined,
                housingType: undefined,
                tenure: undefined,
                structure: undefined,
                siblings: undefined,
                regionId: undefined,
              })}
            />
          ))}
        </Card>
        <Card>
          <Row emoji="✅" title="Ce que ça facilite" sub={preset.strengths.join(' · ')} />
          <Row emoji="⚠️" title="Ce que ça complique" sub={preset.hurdles.join(' · ')} />
        </Card>
      </Section>

      {/* 2. Identité ------------------------------------------------ */}
      <Section title="Identité" action={dice(['firstName', 'lastName', 'sex'])}>
        <Card pad>
          <div className="field">
            <label className="field-label">Prénom</label>
            <input
              className="input" value={firstName} maxLength={20} placeholder="Au hasard"
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field-label">Nom</label>
            <input
              className="input" value={lastName} maxLength={24} placeholder="Au hasard"
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field-label">Sexe</label>
            <Segmented value={sex} onChange={setSex} options={SEX_OPTIONS} />
          </div>
        </Card>
        <p className="small muted" style={{ margin: '8px 4px 0' }}>
          L’apparence et le tempérament sont tirés à la naissance, comme dans la
          vraie vie. Ils comptent — mais bien moins que ce qui suit.
        </p>
      </Section>

      {/* 3. Pays et région ------------------------------------------ */}
      <Section title="Pays" action={dice(['countryId', 'regionId', 'cityName'])}>
        <Card pad>
          <select
            className="input"
            value={resolved.countryId}
            onChange={(e) => set({
              countryId: e.target.value, regionId: undefined, cityName: undefined,
            })}
          >
            {COUNTRIES.map((c) => (
              <option key={c.id} value={c.id}>{c.flag} {c.name}</option>
            ))}
          </select>
        </Card>
        <Card>
          <Row emoji="💶" title="Revenu médian" right={money(nationalIncome)} />
          <Row emoji="🏥" title="Prise en charge des soins" right={`${Math.round(country.healthcare * 100)} %`} />
          <Row emoji="🎓" title="Système scolaire" right={`${Math.round(country.education * 100)} / 100`} />
          <Row emoji="⚖️" title="Sévérité judiciaire" right={`${Math.round(country.justice * 100)} / 100`} />
        </Card>
      </Section>

      {advanced && (
        <Section title="Région" action={dice(['regionId', 'cityName'])}>
          <Card>
            {regionsFor(resolved.countryId).map((r) => {
              const arch = REGION_ARCHETYPES.find((a) => a.id === r.id);
              return (
                <Row
                  key={r.id}
                  emoji={arch?.emoji ?? '📍'}
                  title={r.name}
                  sub={arch?.description}
                  right={resolved.regionId === r.id ? <Pill tone="primary">Choisie</Pill> : undefined}
                  onClick={() => set({ regionId: r.id, cityName: undefined })}
                />
              );
            })}
          </Card>
        </Section>
      )}

      {/* 4. Ville --------------------------------------------------- */}
      <Section title="Ville" action={dice(['cityName'])}>
        <Card>
          <Row emoji="🏙️" title={origin.city.name} sub={`${origin.city.size} · ${origin.city.population.toLocaleString('fr-FR')} habitants`} />
          <Row emoji="💼" title="Débouchés professionnels" right={<Gauge value={origin.city.jobOpportunity} />} />
          <Row emoji="🎓" title="Universités" right={<Gauge value={origin.city.universities} />} />
          <Row emoji="🚇" title="Transports" right={<Gauge value={origin.city.transport} />} />
          <Row emoji="🎭" title="Culture et sorties" right={<Gauge value={origin.city.entertainment} />} />
          <Row emoji="📉" title="Chômage local" right={`${Math.round(origin.city.unemployment)} %`} />
        </Card>
        {advanced && (
          <Card pad>
            <select
              className="input"
              value={resolved.cityName}
              onChange={(e) => set({ cityName: e.target.value })}
            >
              {country.cities.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </Card>
        )}
      </Section>

      {/* 5. Quartier ------------------------------------------------ */}
      <Section title="Quartier" action={dice(['neighborhoodId', 'zone'])}>
        <Card>
          {NEIGHBORHOOD_ARCHETYPES.map((n) => (
            <Row
              key={n.id}
              emoji={n.emoji}
              title={n.label}
              sub={n.description}
              right={resolved.neighborhoodId === n.id ? <Pill tone="primary">Choisi</Pill> : undefined}
              onClick={() => set({ neighborhoodId: n.id, zone: undefined, housingType: undefined })}
            />
          ))}
        </Card>
        {advanced && zones.length > 1 && (
          <Card>
            {zones.map((z: ResidentialZone) => (
              <Row
                key={z}
                emoji={ZONE_LABELS[z].emoji}
                title={z}
                sub={ZONE_LABELS[z].description}
                right={resolved.zone === z ? <Pill tone="primary">Choisie</Pill> : undefined}
                onClick={() => set({ zone: z, housingType: undefined })}
              />
            ))}
          </Card>
        )}
        <Card>
          <Row emoji="🛡️" title="Sécurité" right={<Gauge value={origin.neighborhood.safety} />} />
          <Row emoji="🏫" title="Accès aux écoles" right={<Gauge value={origin.neighborhood.educationAccess} />} />
          <Row emoji="🤝" title="Vie de quartier" right={<Gauge value={origin.neighborhood.socialOpportunity} />} />
          <Row emoji="💼" title="Emploi de proximité" right={<Gauge value={origin.neighborhood.economicOpportunity} />} />
          <Row emoji="⚠️" title="Exposition à la délinquance" right={<Gauge value={origin.neighborhood.crimeExposure} />} />
          <Row emoji="🫱" title="Solidarité" right={<Gauge value={origin.neighborhood.communityCohesion} />} />
        </Card>
      </Section>

      {/* 6. Logement ------------------------------------------------ */}
      <Section title="Logement" action={dice(['housingType', 'tenure'])}>
        <Card>
          {housingChoices.map((h) => (
            <Row
              key={h.id}
              emoji={h.emoji}
              title={h.label}
              sub={h.description}
              right={resolved.housingType === h.id ? <Pill tone="primary">Choisi</Pill> : undefined}
              onClick={() => set({ housingType: h.id as HousingType, tenure: undefined })}
            />
          ))}
        </Card>
        {advanced && (
          <Card>
            {tenuresFor(resolved.housingType).map((t: Tenure) => (
              <Row
                key={t}
                emoji={t === 'propriétaire' ? '🔑' : t === 'accédant' ? '🏦' : t === 'logement social' ? '🏢' : '📄'}
                title={t}
                right={resolved.tenure === t ? <Pill tone="primary">Choisi</Pill> : undefined}
                onClick={() => set({ tenure: t })}
              />
            ))}
          </Card>
        )}
        <Card>
          <Row emoji="📐" title="Surface" right={`${origin.housing.areaM2} m²`} />
          <Row emoji="🚪" title="Chambres" right={`${origin.housing.bedrooms} pour ${origin.housing.occupants} personnes`} />
          <Row emoji="🧱" title="État" right={<Gauge value={origin.housing.condition} />} />
          <Row emoji="🛋️" title="Confort" right={<Gauge value={origin.housing.comfort} />} />
          <Row emoji="💸" title="Coût annuel" right={money(origin.housing.annualHousingCost)} />
        </Card>
      </Section>

      {/* 7. Conditions de vie --------------------------------------- */}
      <Section title="Conditions de vie">
        <Card>
          {(Object.keys(LIVING_LABELS) as (keyof LivingConditions)[]).map((key) => (
            <Row
              key={key}
              emoji={LIVING_LABELS[key].emoji}
              title={LIVING_LABELS[key].label}
              sub={LIVING_LABELS[key].effect}
              right={origin.living[key]
                ? <Pill tone="good">Oui</Pill>
                : <Pill tone="bad">Non</Pill>}
            />
          ))}
        </Card>
        <p className="small muted" style={{ margin: '8px 4px 0' }}>
          Ces conditions découlent du logement, des revenus du foyer et de
          l’époque. Aucune n’est décorative : chacune agit sur la simulation.
        </p>
      </Section>

      {/* 8. Famille ------------------------------------------------- */}
      <Section title="Famille" action={dice(['structure', 'siblings'])}>
        <Card>
          {STRUCTURES.map((s) => (
            <Row
              key={s}
              emoji={s === 'deux parents' ? '👨‍👩‍👦' : s === 'parent seul' ? '🧍' : s === 'parents séparés' ? '↔️' : s === 'famille recomposée' ? '🔀' : s === 'adoption' ? '💝' : s === 'grands-parents' ? '👵' : '🏠'}
              title={s}
              right={resolved.structure === s ? <Pill tone="primary">Choisie</Pill> : undefined}
              onClick={() => set({ structure: s })}
            />
          ))}
        </Card>
        <Card>
          <Row
            emoji="👶"
            title="Frères et sœurs"
            sub={resolved.siblings.length === 0
              ? 'Enfant unique'
              : resolved.siblings
                .map((s) => `${s.sex === 'M' ? 'un frère' : 'une sœur'} ${s.ageGap > 0 ? `de ${s.ageGap} ans de plus` : `de ${-s.ageGap} ans de moins`}`)
                .join(', ')}
            right={String(resolved.siblings.length)}
          />
          <Row emoji="🧮" title="Personnes au foyer" right={String(origin.housing.occupants)} />
        </Card>
        {advanced && (
          <Card>
            <Row
              emoji="➕"
              title="Ajouter un frère ou une sœur"
              onClick={() => set({
                siblings: [
                  ...resolved.siblings,
                  { sex: resolved.siblings.length % 2 === 0 ? 'M' : 'F', ageGap: 2 + resolved.siblings.length, kind: 'plein' },
                ],
              })}
              chevron
            />
            <Row
              emoji="➖"
              title="Retirer le dernier"
              disabled={resolved.siblings.length === 0}
              onClick={() => set({ siblings: resolved.siblings.slice(0, -1) })}
              chevron
            />
          </Card>
        )}
      </Section>

      {/* 9. Situation financière ------------------------------------ */}
      <Section title="Situation financière du foyer">
        <Card>
          <Row emoji="💰" title="Revenu disponible" right={money(origin.finance.disposableIncome)} />
          <Row emoji="🏦" title="Patrimoine familial" right={money(origin.finance.assets)} />
          <Row emoji="📉" title="Dettes" right={money(origin.finance.debt)} />
          <Row emoji="🧾" title="Rapport à l’argent" right={origin.finance.behaviour} />
          <Row emoji="😟" title="Tension financière" right={<Gauge value={origin.finance.financialStress} />} />
          <Row emoji="🔒" title="Stabilité de l’emploi" right={<Gauge value={origin.finance.jobSecurity} />} />
        </Card>
      </Section>

      {/* 10. École --------------------------------------------------- */}
      <Section title="École">
        <Card>
          <Row
            emoji="🏫"
            title={origin.school?.name ?? 'Non scolarisé'}
            sub={origin.school ? SCHOOL_MAP[origin.school.archetypeId]?.description : undefined}
          />
          {origin.school && (
            <>
              <Row emoji="📘" title="Niveau académique" right={<Gauge value={origin.school.academic} />} />
              <Row emoji="👩‍🏫" title="Qualité de l’enseignement" right={<Gauge value={origin.school.teacherQuality} />} />
              <Row emoji="👥" title="Élèves par classe" right={String(origin.school.classSize)} />
              <Row emoji="🎯" title="Pression scolaire" right={<Gauge value={origin.school.pressure} />} />
              <Row emoji="🎭" title="Clubs et activités" right={<Gauge value={origin.school.clubs} />} />
              <Row emoji="💳" title="Frais annuels" right={origin.school.tuition > 0 ? money(origin.school.tuition) : 'Gratuit'} />
            </>
          )}
        </Card>
      </Section>

      {/* 11. Environnement social ------------------------------------ */}
      <Section title="Environnement social">
        <Card>
          <Row emoji="🧒" title="Enfants du même âge à proximité" right={String(origin.social.peersNearby)} />
          <Row emoji="🤝" title="Cohésion du voisinage" right={<Gauge value={origin.social.communityCohesion} />} />
          <Row emoji="🎪" title="Activités locales" right={<Gauge value={origin.social.localActivities} />} />
          <Row emoji="🚶" title="Isolement" right={<Gauge value={origin.social.isolation} />} />
          <Row emoji="🧳" title="Rotation du voisinage" right={<Gauge value={origin.social.residentialMobility} />} />
        </Card>
      </Section>

      {/* 12. Culture familiale --------------------------------------- */}
      <Section title="Ce que la famille valorise">
        <Card>
          <Row emoji="📚" title="Les études" right={<Gauge value={origin.values.school} />} />
          <Row emoji="⚽" title="Le sport" right={<Gauge value={origin.values.sport} />} />
          <Row emoji="💼" title="Le travail" right={<Gauge value={origin.values.work} />} />
          <Row emoji="💰" title="L’argent" right={<Gauge value={origin.values.money} />} />
          <Row emoji="🏡" title="La famille" right={<Gauge value={origin.values.family} />} />
          <Row emoji="🎨" title="La création" right={<Gauge value={origin.values.creativity} />} />
          <Row emoji="🕊️" title="L’autonomie" right={<Gauge value={origin.values.autonomy} />} />
          <Row emoji="🏆" title="La réussite" right={<Gauge value={origin.values.achievement} />} />
        </Card>
      </Section>

      {/* 13. Climat du foyer ----------------------------------------- */}
      <Section title="Climat du foyer">
        <Card>
          <Row emoji="🌤️" title="Calme" right={<Gauge value={origin.atmosphere.calm} />} />
          <Row emoji="⚡" title="Conflits" right={<Gauge value={origin.atmosphere.conflict} />} />
          <Row emoji="❤️" title="Affection" right={<Gauge value={origin.atmosphere.affection} />} />
          <Row emoji="💬" title="Dialogue" right={<Gauge value={origin.atmosphere.communication} />} />
          <Row emoji="⚖️" title="Stabilité" right={<Gauge value={origin.atmosphere.stability} />} />
          <Row emoji="🚪" title="Intimité" right={<Gauge value={origin.atmosphere.privacy} />} />
        </Card>
      </Section>

      {/* 14. Opportunités et difficultés ----------------------------- */}
      <Section title="Ce que ce départ ouvre">
        <Card>
          <Row emoji="🎓" title="Éducation" right={<Gauge value={origin.opportunities.education} />} />
          <Row emoji="💼" title="Carrière" right={<Gauge value={origin.opportunities.career} />} />
          <Row emoji="💰" title="Moyens" right={<Gauge value={origin.opportunities.financial} />} />
          <Row emoji="🫂" title="Social" right={<Gauge value={origin.opportunities.social} />} />
          <Row emoji="🎭" title="Culture" right={<Gauge value={origin.opportunities.cultural} />} />
          <Row emoji="🏅" title="Sport" right={<Gauge value={origin.opportunities.sport} />} />
        </Card>
      </Section>

      <Section title="Ce que ce départ complique">
        <Card>
          <Row emoji="💸" title="Argent" right={<Gauge value={origin.difficulties.financial} />} />
          <Row emoji="🏠" title="Instabilité familiale" right={<Gauge value={origin.difficulties.familyInstability} />} />
          <Row emoji="📕" title="Scolarité" right={<Gauge value={origin.difficulties.education} />} />
          <Row emoji="🫥" title="Isolement social" right={<Gauge value={origin.difficulties.social} />} />
          <Row emoji="🛣️" title="Éloignement" right={<Gauge value={origin.difficulties.geographicIsolation} />} />
        </Card>
        <p className="small muted" style={{ margin: '8px 4px 0' }}>
          Aucun départ n’est meilleur qu’un autre : chacun ouvre des portes et
          en ferme d’autres. L’environnement pèse sur les probabilités, jamais
          sur le résultat.
        </p>
      </Section>

      {/* 15. Cohérence ----------------------------------------------- */}
      {warnings.length > 0 && (
        <Section title="Une situation inhabituelle">
          {warnings.map((w) => (
            <Card key={w.question} pad>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>{w.question}</div>
              <p className="small muted" style={{ marginTop: 0 }}>
                Rien ne l’interdit — mais l’histoire mérite une explication, et
                elle rejoindra ta timeline de naissance.
              </p>
              <div className="stack">
                {w.suggestions.map((s) => (
                  <Button key={s} variant="ghost" small onClick={() => setExplanation(s)}>
                    {s}
                  </Button>
                ))}
              </div>
              <div className="field" style={{ marginTop: 10 }}>
                <input
                  className="input"
                  value={explanation}
                  maxLength={140}
                  placeholder="Ou écris ta propre explication"
                  onChange={(e) => setExplanation(e.target.value)}
                />
              </div>
            </Card>
          ))}
        </Section>
      )}

      {/* 16. Résumé --------------------------------------------------- */}
      <Section title="Résumé">
        <Card pad>
          <p style={{ margin: 0, lineHeight: 1.55 }}>
            {firstName || 'Ton personnage'} naît à {origin.city.name}, {country.name}, dans
            {' '}{HOUSING_MAP[origin.housing.type]?.label.toLowerCase()} de {origin.housing.areaM2} m²
            {' '}({origin.housing.tenure}) situé {origin.neighborhood.name}, {origin.neighborhood.zone}.
            {' '}Le foyer compte {origin.housing.occupants} personnes et dispose de
            {' '}{money(origin.finance.disposableIncome)} par an une fois les charges payées.
          </p>
        </Card>
      </Section>

      <div className="stack" style={{ marginTop: 8, marginBottom: 24 }}>
        <Button
          onClick={() => {
            startNewLife({
              seed,
              firstName: firstName.trim() || undefined,
              lastName: lastName.trim() || undefined,
              sex: sex === 'random' ? undefined : sex,
              draft: {
                ...resolved,
                anomalyExplanation: warnings.length > 0 && explanation.trim()
                  ? explanation.trim()
                  : null,
              },
            });
            onBack();
          }}
        >
          Naître ici
        </Button>
        <Button variant="ghost" onClick={() => { setDraft({}); setSeed(randomSeed()); setExplanation(''); }}>
          Tout retirer au hasard
        </Button>
      </div>
    </Sheet>
  );
}
