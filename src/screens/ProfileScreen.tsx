/** Profil complet : identité, statistiques internes, santé, bilan de vie. */

import { Button, Card, Pill, Row, Section, Sheet } from '../components/Modal.tsx';
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
  const { state, settings, updateSettings, abandonLife } = useGame();
  if (!state) return null;
  const p = state.player;
  const country = getCountry(p.countryId);
  const health = healthSummary(state);

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
    </Sheet>
  );
}
