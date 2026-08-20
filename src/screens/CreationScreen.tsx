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
import {
  Button, Card, Gauge, Pill, Row, Section, Segmented, Sheet, Slider, TextField,
} from '../components/Modal.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { COUNTRIES, getCountry } from '../data/countries.ts';
import { ORIGIN_PRESETS, getPreset } from '../data/originPresets.ts';
import { NEIGHBORHOOD_ARCHETYPES, NEIGHBORHOOD_MAP, ZONE_LABELS } from '../data/neighborhoods.ts';
import { HOUSING_MAP, LIVING_LABELS, housingForZone, tenuresFor } from '../data/housing.ts';
import { SCHOOL_MAP } from '../data/schools.ts';
import { REGION_ARCHETYPES, regionsFor } from '../data/regions.ts';
import { coherenceWarnings, previewOrigin } from '../systems/originGen.ts';
import { originSignals, exposureTo } from '../systems/exposure.ts';
import { INTERESTS } from '../data/interests.ts';
import {
  BUILDS, GIFTS, GIFT_STEP, HEIGHT_SPREAD, HEIGHT_STEP, LOOKS, LOOK_POOLS,
  canLower, canRaise, giftWord, remaining,
} from '../data/cradle.ts';
import { TEMPERAMENT_KEYS } from '../engine/psyche.ts';
import {
  TEMPERAMENT_TEXT, TemperamentEditor, temperamentReading,
} from '../components/PersonalityPanel.tsx';
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

/**
 * Réglages fins ouverts en mode détaillé (§59-60).
 *
 * Chacun désigne un champ réel de l'origine par son chemin, et chaque note dit
 * ce que le réglage produit dans la simulation — jamais en pourcentage, parce
 * qu'un joueur ne gagne rien à lire « +7 % de réussite scolaire ».
 */
const FAMILY_VALUE_SLIDERS = [
  { path: 'values.school', label: 'Les études', note: 'Des parents qui suivent les devoirs, poussent, s’inquiètent des notes — et en font parfois trop.' },
  { path: 'values.sport', label: 'Le sport', note: 'Un enfant inscrit tôt dans un club, plus endurant — et moins de temps pour le reste.' },
  { path: 'values.work', label: 'Le travail', note: 'Un rapport sérieux à l’effort — et une famille moins présente à la maison.' },
  { path: 'values.money', label: 'L’argent', note: 'Un enfant qui compte tôt et négocie bien — et qui mesure les gens à ce qu’ils gagnent.' },
  { path: 'values.family', label: 'La famille', note: 'Des liens solides sur lesquels s’appuyer — et un départ du foyer plus difficile.' },
  { path: 'values.creativity', label: 'La création', note: 'De la place pour la musique, le dessin, l’écriture — moins pour la sécurité.' },
  { path: 'values.autonomy', label: 'L’autonomie', note: 'Un enfant débrouillard tôt — et qui demande rarement de l’aide, même quand il en aurait besoin.' },
  { path: 'values.achievement', label: 'La réussite', note: 'Une ambition installée tôt — et un échec qui coûte beaucoup plus cher.' },
  { path: 'values.manners', label: 'Les convenances', note: 'De l’aisance en société — et la peur permanente du regard des autres.' },
  { path: 'values.leisure', label: 'Le plaisir', note: 'Une enfance plus légère — et moins d’acharnement quand il en faudra.' },
];

const ATMOSPHERE_SLIDERS = [
  { path: 'atmosphere.calm', label: 'Calme', note: 'Un foyer reposant, où l’on récupère — un peu moins de stimulation.' },
  { path: 'atmosphere.conflict', label: 'Conflits', note: 'Des disputes fréquentes usent, mais apprennent aussi à tenir tête.' },
  { path: 'atmosphere.affection', label: 'Affection', note: 'La base de l’estime de soi et de la confiance dans les autres.' },
  { path: 'atmosphere.communication', label: 'Dialogue', note: 'Un enfant qui sait mettre des mots sur ce qu’il ressent — et discute tout.' },
  { path: 'atmosphere.stability', label: 'Stabilité', note: 'Des repères fiables — et moins d’entraînement à l’imprévu.' },
  { path: 'atmosphere.privacy', label: 'Intimité', note: 'De quoi s’isoler, lire, travailler, exister seul.' },
];

/** Lecture d'une note sur 100 en mots. */
function levelWord(value: number): string {
  if (value >= 78) return 'très fort';
  if (value >= 60) return 'fort';
  if (value >= 40) return 'moyen';
  if (value >= 22) return 'faible';
  return 'absent';
}

/** Lit un champ de l'origine désigné par son chemin. */
function pathValue(origin: unknown, path: string): number {
  let node: unknown = origin;
  for (const part of path.split('.')) {
    if (!node || typeof node !== 'object') return 0;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'number' ? node : 0;
}

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
  const { origin, draft: resolved, nationalIncome, psyche } = preview;
  const warnings = useMemo(
    () => coherenceWarnings(origin, nationalIncome),
    [origin, nationalIncome],
  );

  // Les tendances innées vraiment marquées, dans un sens ou dans l'autre.
  const marked = useMemo(
    () => TEMPERAMENT_KEYS
      .map((key) => ({ key, value: psyche.temperament[key] }))
      .filter((x) => Math.abs(x.value - 50) >= 18)
      .sort((a, b) => Math.abs(b.value - 50) - Math.abs(a.value - 50))
      .slice(0, 5),
    [psyche],
  );

  // Ce à quoi ce départ expose réellement l'enfant, calculé par le moteur.
  // C'est la chaîne du §58 rendue visible avant même la naissance : le jeu ne
  // promet pas un métier, il montre ce que la vie mettra à portée de main.
  const exposed = useMemo(() => {
    const signals = originSignals(origin, { age: 8, hasPet: false });
    return INTERESTS
      .map((def) => ({ def, ...exposureTo(signals, def.id) }))
      .filter((x) => x.total > 0.45)
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [origin]);
  const country = getCountry(resolved.countryId);
  const preset = getPreset(resolved.presetId);

  /** Fixe un champ du brouillon. Les champs dépendants sont libérés. */
  const set = (patch: Draft) => setDraft((d) => ({ ...d, ...patch }));

  /** Impose la valeur d'un champ de l'origine désigné par son chemin. */
  const override = (path: string, value: number) =>
    setDraft((d) => ({ ...d, overrides: { ...d.overrides, [path]: value } }));

  /**
   * Fait tourner un champ d'apparence sur sa liste.
   *
   * Un menu déroulant par champ ferait cinq menus pour du décor ; toucher la
   * ligne suffit, et l'aperçu montre aussitôt ce qui naîtra — c'est le même
   * générateur qui le calcule, pas une approximation d'affichage.
   */
  const cycleLook = (key: (typeof LOOKS)[number]['key']) => {
    const pool = LOOK_POOLS[key] ?? [];
    if (pool.length === 0) return;
    const at = pool.indexOf(String(preview.appearance[key]));
    set({ appearance: { ...resolved.appearance, [key]: pool[(at + 1) % pool.length] } });
  };

  const cycleBuild = () => {
    const at = BUILDS.indexOf(preview.appearance.build);
    set({ appearance: { ...resolved.appearance, build: BUILDS[(at + 1) % BUILDS.length] } });
  };

  /**
   * Fait varier la taille visée, en revenant au plus petit une fois en haut.
   *
   * Les bornes suivent la moyenne du sexe : la même fourchette pour tout le
   * monde donnerait des tailles impossibles d'un côté et fades de l'autre.
   */
  const bumpHeight = () => {
    const mean = (resolved.sex ?? 'F') === 'M' ? 176 : 163;
    const next = preview.appearance.targetHeight + HEIGHT_STEP;
    set({
      appearance: {
        ...resolved.appearance,
        targetHeight: next > mean + HEIGHT_SPREAD ? mean - HEIGHT_SPREAD : next,
      },
    });
  };

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
        'temperament', 'overrides',
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
          <TextField
            label="Prénom" kind="given" value={firstName} onChange={setFirstName}
            maxLength={20} placeholder="Au hasard"
          />
          <TextField
            label="Nom" kind="family" value={lastName} onChange={setLastName}
            maxLength={24} placeholder="Au hasard"
          />
          <div className="field">
            <label className="field-label">Sexe</label>
            <Segmented value={sex} onChange={setSex} options={SEX_OPTIONS} />
          </div>
        </Card>
        <p className="small muted" style={{ margin: '8px 4px 0' }}>
          L’apparence est tirée à la naissance, comme dans la vraie vie. Elle
          compte — mais bien moins que ce qui suit.
        </p>
      </Section>

      {/* 2 bis. Tempérament ----------------------------------------- */}
      <Section title="Tempérament" action={dice(['temperament'])}>
        {advanced ? (
          <>
            <TemperamentEditor
              value={psyche.temperament}
              onChange={(key, next) => set({
                temperament: { ...resolved.temperament, [key]: next },
              })}
            />
            <p className="small muted" style={{ margin: '8px 4px 0' }}>
              Ces douze tendances sont innées et ne changeront jamais. Elles ne
              décident pas de ce que l’enfant deviendra : elles décident par où
              l’expérience va passer. Aucun réglage n’est meilleur qu’un autre.
            </p>
          </>
        ) : (
          <>
            <Card>
              {marked.map(({ key, value }) => (
                <Row
                  key={key}
                  title={TEMPERAMENT_TEXT[key]}
                  sub={temperamentReading(key, value).note}
                  right={<Pill>{temperamentReading(key, value).word}</Pill>}
                />
              ))}
              {marked.length === 0 && (
                <Row emoji="😐" title="Un tempérament sans relief" sub="Rien de très marqué dans un sens ou dans l’autre." />
              )}
            </Card>
            <p className="small muted" style={{ margin: '8px 4px 0' }}>
              Tiré à la naissance, comme dans la vraie vie. Passe en mode
              détaillé pour le régler toi-même.
            </p>
          </>
        )}
      </Section>

      {/* 2 bis. Ce dont il hérite ---------------------------------- */}
      {/* L'intelligence, la forme et la santé de départ viennent de trois
          potentiels que rien ne permettait de régler : c'était la seule
          feuille de ce groupe sans aucun chemin de données. L'enveloppe est
          exactement neutre — composer rend différent, jamais plus fort. */}
      <Section title="Ce dont il hérite" action={dice(['gifts'])}>
        {advanced ? (
          <>
            <Card>
              {GIFTS.map((gift) => {
                const value = resolved.gifts[gift.key] ?? gift.base;
                return (
                  <div key={gift.key} style={{ padding: '12px 14px' }}>
                    <div className="spread">
                      <div className="row-title">{gift.emoji} {gift.label}</div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <Pill>{giftWord(value)}</Pill>
                        <Button
                          small
                          disabled={!canLower(resolved.gifts, gift.key)}
                          onClick={() => set({
                            gifts: { ...resolved.gifts, [gift.key]: value - GIFT_STEP },
                          })}
                        >
                          −
                        </Button>
                        <Button
                          small
                          disabled={!canRaise(resolved.gifts, gift.key)}
                          onClick={() => set({
                            gifts: { ...resolved.gifts, [gift.key]: value + GIFT_STEP },
                          })}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                    <div style={{ margin: '8px 0 4px' }}><Gauge value={value} /></div>
                    <div className="small muted">{gift.note}</div>
                  </div>
                );
              })}
            </Card>
            <p className="small muted" style={{ margin: '8px 4px 0', lineHeight: 1.5 }}>
              {remaining(resolved.gifts) === 0
                ? 'Tout est placé. Pour monter quelque chose, il faut baisser autre chose.'
                : `Il te reste ${remaining(resolved.gifts)} à placer.`}
              {' '}Ce n’est qu’un potentiel : la moitié seulement s’exprime à la
              naissance, le reste se gagne ou se perd.
            </p>
          </>
        ) : (
          <>
            <Card>
              {GIFTS.map((gift) => (
                <Row
                  key={gift.key}
                  emoji={gift.emoji}
                  title={gift.label}
                  sub={gift.note}
                  right={<Gauge value={resolved.gifts[gift.key] ?? gift.base} />}
                />
              ))}
            </Card>
            <p className="small muted" style={{ margin: '8px 4px 0' }}>
              Tiré à la naissance. Passe en mode détaillé pour répartir toi-même.
            </p>
          </>
        )}
      </Section>

      {/* 2 quater. Le visage ---------------------------------------- */}
      <Section title="Le visage" action={dice(['appearance'])}>
        <Card>
          {LOOKS.map((look) => (
            <Row
              key={look.key}
              emoji={look.emoji}
              title={look.label}
              right={<Pill>{String(preview.appearance[look.key])}</Pill>}
              onClick={advanced ? () => cycleLook(look.key) : undefined}
              chevron={advanced}
            />
          ))}
          <Row
            emoji="🧍"
            title="La carrure"
            sub="La seule qui compte un peu : elle touche l’allure de quelques points."
            right={<Pill>{preview.appearance.build}</Pill>}
            onClick={advanced ? () => cycleBuild() : undefined}
            chevron={advanced}
          />
          <Row
            emoji="📏"
            title="Taille adulte visée"
            right={<Pill>{preview.appearance.targetHeight} cm</Pill>}
            onClick={advanced ? () => bumpHeight() : undefined}
            chevron={advanced}
          />
        </Card>
        <p className="small muted" style={{ margin: '8px 4px 0', lineHeight: 1.5 }}>
          {advanced
            ? 'Touche une ligne pour la faire tourner. Rien de tout cela ne se paie : l’apparence est du décor.'
            : 'Tirée à la naissance. Passe en mode détaillé pour la choisir.'}
        </p>
      </Section>

      {/* 2 ter. Ce à quoi ce départ expose --------------------------- */}
      <Section title="Ce que ce départ met à sa portée">
        {exposed.length === 0 ? (
          <Card pad>
            <p className="small muted" style={{ margin: 0 }}>
              Ce départ n’expose l’enfant à presque rien de particulier. Ses
              goûts viendront d’ailleurs — de l’école, des rencontres, du hasard.
            </p>
          </Card>
        ) : (
          <Card>
            {exposed.map(({ def, total, terms }) => (
              <Row
                key={def.id}
                emoji={def.emoji}
                title={def.label}
                sub={terms.slice(0, 3).map((t) => t.label).join(' · ')}
                // Seuils calés sur la distribution réelle des expositions :
                // « très présent » correspond au dernier décile, sans quoi
                // tout se retrouverait au même niveau.
                right={<Pill tone={total > 1.7 ? 'primary' : undefined}>
                  {total > 1.7 ? 'très présent' : total > 1.1 ? 'présent' : 'à portée'}
                </Pill>}
              />
            ))}
          </Card>
        )}
        <p className="small muted" style={{ margin: '8px 4px 0' }}>
          Être exposé à quelque chose n’est pas le devenir. L’enfant peut
          passer dix ans à côté d’un piano sans jamais y toucher — et un autre
          se prendre de passion pour ce que personne autour de lui ne pratique.
        </p>
      </Section>

      {/* 3. Pays et région ------------------------------------------ */}
      <Section title="Pays" action={dice(['countryId', 'regionId', 'cityName'])}>
        <Card pad>
          <select
            className="input"
            aria-label="Pays de naissance"
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
              aria-label="Ville de naissance"
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
        {advanced ? (
          <Card>
            {FAMILY_VALUE_SLIDERS.map(({ path, label, note }) => (
              <Slider
                key={path}
                label={label}
                value={pathValue(origin, path)}
                onChange={(next) => override(path, next)}
                reading={levelWord(pathValue(origin, path))}
                note={note}
              />
            ))}
          </Card>
        ) : (
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
        )}
        <p className="small muted" style={{ margin: '8px 4px 0' }}>
          Ce que la famille valorise devient ce que l’enfant valorisera — en
          partie seulement, et il pourra s’y opposer plus tard.
        </p>
      </Section>

      {/* 13. Climat du foyer ----------------------------------------- */}
      <Section title="Climat du foyer">
        {advanced ? (
          <Card>
            {ATMOSPHERE_SLIDERS.map(({ path, label, note }) => (
              <Slider
                key={path}
                label={label}
                value={pathValue(origin, path)}
                onChange={(next) => override(path, next)}
                reading={levelWord(pathValue(origin, path))}
                note={note}
              />
            ))}
          </Card>
        ) : (
          <Card>
            <Row emoji="🌤️" title="Calme" right={<Gauge value={origin.atmosphere.calm} />} />
            <Row emoji="⚡" title="Conflits" right={<Gauge value={origin.atmosphere.conflict} />} />
            <Row emoji="❤️" title="Affection" right={<Gauge value={origin.atmosphere.affection} />} />
            <Row emoji="💬" title="Dialogue" right={<Gauge value={origin.atmosphere.communication} />} />
            <Row emoji="⚖️" title="Stabilité" right={<Gauge value={origin.atmosphere.stability} />} />
            <Row emoji="🚪" title="Intimité" right={<Gauge value={origin.atmosphere.privacy} />} />
          </Card>
        )}
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
              <div style={{ marginTop: 10 }}>
                <TextField
                  label="Ta propre explication"
                  kind="sentence"
                  value={explanation}
                  maxLength={140}
                  placeholder="Ou écris ta propre explication"
                  onChange={setExplanation}
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
