/** Profil complet : identité, statistiques internes, santé, bilan de vie. */

import { useRef } from 'react';
import { Button, Card, Gauge, Pill, Row, Section, Sheet } from '../components/Modal.tsx';
import { StatsDetail } from '../components/StatsBar.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { avatarFor, compactNumber, money, years } from '../ui/format.ts';
import { getCountry } from '../data/countries.ts';
import { estimatedLifespan } from '../engine/simulateYear.ts';
import { netWorth, socialSupport, totalDebt } from '../systems/finance.ts';
import { experienceYears } from '../systems/careers.ts';
import { healthSummary } from '../systems/health.ts';
import { STAGE_LABELS } from '../systems/education.ts';
import { getDisease } from '../data/diseases.ts';
import { economyLabel } from '../systems/markets.ts';

export function ProfileScreen({ onBack }: { onBack: () => void }) {
  const { state, settings, updateSettings, abandonLife, downloadSave, importSave } = useGame();
  const fileInput = useRef<HTMLInputElement>(null);
  if (!state) return null;
  const p = state.player;
  const country = getCountry(p.countryId);
  const health = healthSummary(state);
  const o = p.origin;

  return (
    <Sheet title="Profil" onBack={onBack}>
      <Card pad>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ fontSize: 46 }}>{avatarFor(p)}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: '-0.3px' }}>
              {p.firstName} {p.lastName}
            </div>
            <div className="row-sub">
              Né{p.sex === 'F' ? 'e' : ''} le {p.birthDay}/{p.birthMonth}/{p.birthYear}
            </div>
            <div className="row-sub">
              {country.flag} {p.cityName}, {country.name}
            </div>
          </div>
        </div>
        <div className="chips" style={{ marginTop: 12 }}>
          <Pill tone={health.tone === 'neutral' ? undefined : health.tone}>{health.label}</Pill>
          <Pill>{p.sex === 'F' ? 'Femme' : 'Homme'}</Pill>
          <Pill>
            {p.orientation === 'hetero' ? 'Hétérosexuel' : p.orientation === 'homo' ? 'Homosexuel' : 'Bisexuel'}
          </Pill>
          {p.flags.license ? <Pill tone="accent">Permis</Pill> : null}
          {p.followers > 0 && <Pill tone="primary">{compactNumber(p.followers)} abonnés</Pill>}
        </div>
      </Card>

      <Section title="Statistiques complètes">
        <StatsDetail stats={p.stats} />
      </Section>

      <Section title="Où tu vis">
        <Card>
          <Row emoji="🏘️" title={o.neighborhood.name} sub={`${o.neighborhood.zone} · ${o.city.name}`} />
          <Row
            emoji="🏠"
            title={`${o.housing.type} · ${o.housing.areaM2} m²`}
            sub={`${o.housing.bedrooms} chambre${o.housing.bedrooms > 1 ? 's' : ''} pour ${o.housing.occupants} personne${o.housing.occupants > 1 ? 's' : ''} · ${o.housing.tenure}`}
          />
          <Row emoji="🛡️" title="Sécurité du quartier" right={<Gauge value={o.neighborhood.safety} />} />
          <Row emoji="🤝" title="Vie de quartier" right={<Gauge value={o.neighborhood.socialOpportunity} />} />
          <Row emoji="🏫" title="Accès aux écoles" right={<Gauge value={o.neighborhood.educationAccess} />} />
          <Row emoji="💼" title="Emploi de proximité" right={<Gauge value={o.neighborhood.economicOpportunity} />} />
          <Row emoji="📉" title="Chômage local" right={`${Math.round(o.economy.unemployment)} %`} />
        </Card>
      </Section>

      <Section title="Ce que ton environnement ouvre">
        <Card>
          <Row emoji="🎓" title="Éducation" right={<Gauge value={o.opportunities.education} />} />
          <Row emoji="💼" title="Carrière" right={<Gauge value={o.opportunities.career} />} />
          <Row emoji="💰" title="Moyens" right={<Gauge value={o.opportunities.financial} />} />
          <Row emoji="🫂" title="Social" right={<Gauge value={o.opportunities.social} />} />
          <Row emoji="🎭" title="Culture" right={<Gauge value={o.opportunities.cultural} />} />
          <Row emoji="🏅" title="Sport" right={<Gauge value={o.opportunities.sport} />} />
        </Card>
      </Section>

      <Section title="Ce qu’il complique">
        <Card>
          <Row emoji="💸" title="Argent" right={<Gauge value={o.difficulties.financial} />} />
          <Row emoji="🏠" title="Instabilité familiale" right={<Gauge value={o.difficulties.familyInstability} />} />
          <Row emoji="📕" title="Scolarité" right={<Gauge value={o.difficulties.education} />} />
          <Row emoji="🫥" title="Isolement social" right={<Gauge value={o.difficulties.social} />} />
          <Row emoji="🛣️" title="Éloignement" right={<Gauge value={o.difficulties.geographicIsolation} />} />
        </Card>
      </Section>

      <Section title="Caractère">
        <Card>
          <Row emoji="🎯" title="Ambition" right={<Gauge value={p.traits.ambition} />} />
          <Row emoji="🧭" title="Discipline" right={<Gauge value={p.traits.discipline} />} />
          <Row emoji="💪" title="Confiance" right={<Gauge value={p.traits.confidence} />} />
          <Row emoji="🫀" title="Empathie" right={<Gauge value={p.traits.empathy} />} />
          <Row emoji="🕊️" title="Indépendance" right={<Gauge value={p.traits.independence} />} />
          <Row emoji="📚" title="Goût de l’étude" right={<Gauge value={p.traits.studiousness} />} />
          <Row emoji="🎨" title="Créativité" right={<Gauge value={p.traits.creativity} />} />
          <Row emoji="🗣️" title="Sociabilité" right={<Gauge value={p.traits.sociability} />} />
        </Card>
        <p className="small muted" style={{ margin: '8px 4px 0' }}>
          Ces traits ne sont pas fixés à la naissance : ils se construisent avec
          le milieu, les rencontres et les décisions — et se figent lentement
          avec l’âge.
        </p>
      </Section>

      {o.history.length > 1 && (
        <Section title="Là où tu as vécu">
          <Card>
            {o.history.map((h, i) => (
              <Row
                key={`${h.fromAge}_${i}`}
                emoji="📍"
                title={`${h.neighborhoodName}, ${h.cityName}`}
                sub={h.reason}
                right={h.toAge === null ? 'depuis tes ' + h.fromAge + ' ans' : `${h.fromAge}–${h.toAge} ans`}
              />
            ))}
          </Card>
        </Section>
      )}

      {o.memories.length > 0 && (
        <Section title="Souvenirs marquants">
          <Card>
            {[...o.memories]
              .sort((a, b) => b.weight - a.weight)
              .slice(0, 8)
              .map((m) => (
                <Row key={m.id} emoji="💭" title={m.text} sub={`À ${m.age} ans`} />
              ))}
          </Card>
        </Section>
      )}

      <Section title="Bilan">
        <Card>
          <Row emoji="⏳" title="Espérance de vie estimée" right={`${estimatedLifespan(state)} ans`} />
          <Row emoji="💰" title="Patrimoine net" right={money(state, netWorth(state))} />
          <Row emoji="📉" title="Dettes totales" right={money(state, totalDebt(state))} />
          <Row emoji="💵" title="Revenus cumulés" right={money(state, p.lifetimeEarnings)} />
          <Row emoji="🎓" title="Niveau d’études" right={STAGE_LABELS[p.education.stage]} />
          <Row emoji="🗂️" title="Expérience" right={years(experienceYears(state))} />
          {!p.job && !p.retired && p.age >= 18 && socialSupport(state) > 0 && (
            <Row emoji="🤝" title="Aide sociale annuelle" right={money(state, socialSupport(state))} />
          )}
          {p.retired && <Row emoji="🏖️" title="Pension annuelle" right={money(state, p.pension)} />}
        </Card>
      </Section>

      {p.diseases.filter((d) => d.diagnosed).length > 0 && (
        <Section title="Santé">
          <Card>
            {p.diseases.filter((d) => d.diagnosed).map((d) => (
              <Row
                key={d.id}
                emoji={getDisease(d.id)?.emoji ?? '🩹'}
                title={d.name}
                sub={`Depuis ${d.yearsIll} an(s)${d.chronic ? ' · chronique' : ''}`}
                right={d.treated ? <Pill tone="good">Traitée</Pill> : <Pill tone="bad">Non traitée</Pill>}
              />
            ))}
          </Card>
        </Section>
      )}

      <Section title="Monde">
        <Card>
          <Row emoji="📅" title="Année" right={String(state.year)} />
          <Row emoji="📊" title="Conjoncture" right={economyLabel(state.world.economy)} />
          <Row emoji="🏘️" title="Indice immobilier" right={`×${state.world.propertyIndex.toFixed(2)}`} />
          <Row emoji="💹" title="Inflation cumulée" right={`×${state.world.inflation.toFixed(2)}`} />
          <Row emoji="🏦" title="Devise" right={`${country.currency} (${country.symbol})`} />
        </Card>
      </Section>

      <Section title="Réglages">
        <Card>
          <Row
            emoji="💾"
            title="Sauvegarde automatique"
            sub="Enregistre la partie après chaque action"
            right={
              <button
                className={`pill ${settings.autoSave ? 'pill-good' : ''}`}
                onClick={() => updateSettings({ autoSave: !settings.autoSave })}
                type="button"
              >
                {settings.autoSave ? 'Activée' : 'Désactivée'}
              </button>
            }
          />
        </Card>
        <div style={{ marginTop: 12 }}>
          <Button
            variant="danger"
            onClick={() => {
              if (window.confirm('Abandonner cette vie ? La partie en cours sera définitivement perdue.')) {
                abandonLife();
              }
            }}
          >
            Abandonner cette vie
          </Button>
        </div>
      </Section>

      <Section title="Transférer la partie">
        <Card>
          <Row
            emoji="⬇️"
            title="Exporter la partie"
            sub="Un fichier à conserver, ou à ouvrir sur un autre appareil"
            onClick={downloadSave}
            chevron
          />
          <Row
            emoji="⬆️"
            title="Importer une partie"
            sub="Remplace la vie en cours par une sauvegarde"
            onClick={() => fileInput.current?.click()}
            chevron
          />
        </Card>
        <p className="small muted" style={{ margin: '8px 4px 0' }}>
          Utile pour changer de téléphone, garder une copie, ou si le navigateur
          efface ses données.
        </p>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            const text = await file.text();
            if (
              window.confirm('Remplacer la vie en cours par cette sauvegarde ? La partie actuelle sera perdue.')
            ) {
              if (importSave(text)) onBack();
            }
          }}
        />
      </Section>
    </Sheet>
  );
}
