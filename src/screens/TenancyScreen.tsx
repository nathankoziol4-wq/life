/**
 * Le bien vu par son bailleur.
 *
 * L'écran est construit autour du fait que **quelqu'un habite là**. La
 * première carte n'est donc pas un rendement mais une personne : depuis quand
 * elle est là, ce qu'elle paie, ce qu'elle doit, et ce qu'elle pense de vous.
 *
 * Le loyer demandé vient ensuite, parce que c'est le seul levier — et parce
 * qu'il ne coupe pas là où on croit. Demander cher ne fait pas fuir tout le
 * monde : cela fait fuir ceux qui ont le choix. L'écran le dit, et laisse le
 * joueur en tirer les conclusions.
 */

import { AmountPicker, Field, Gauge, Meter, Pill, Sheet } from '../components/Modal.tsx';
import { Card, Row, Section } from '../ui/components/list.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { avatarFor, money } from '../ui/format.ts';
import type { OwnedProperty } from '../engine/types.ts';
import {
  acceptTenant, askingRent, careHint, evictTenant, handleRepair, listForRent,
  marketRent, renewLease, setAskingRent, stopRenting, strainHint, tenantOf,
} from '../systems/tenancy.ts';

export function TenancyScreen({ propertyId, onBack }: {
  propertyId: string;
  onBack: () => void;
}) {
  const { state, run } = useGame();
  if (!state) return null;
  const prop = state.player.properties.find((x) => x.id === propertyId);
  if (!prop) return null;

  const market = marketRent(state, prop);
  const asked = askingRent(state, prop);
  const tenant = tenantOf(state, prop);
  const tenancy = prop.tenancy;

  return (
    <Sheet title={prop.name} onBack={onBack}>
      {/* ---- Qui habite là ---- */}
      {tenancy && tenant ? (
        <>
          <Card pad>
            <div className="spread">
              <div>
                <div className="row-title">{avatarFor(tenant)} {tenant.firstName} {tenant.lastName}</div>
                <div className="row-sub">
                  Locataire depuis {state.year - tenancy.since} an(s)
                  {tenancy.yearsLeft > 0 ? ` · bail encore ${tenancy.yearsLeft} an(s)` : ' · bail échu'}
                </div>
              </div>
              <strong>{money(state, tenancy.rent)}</strong>
            </div>
            <div className="chips" style={{ marginTop: 12 }}>
              {tenancy.arrears > 0 && <Pill tone="bad">{money(state, Math.round(tenancy.arrears))} d’impayés</Pill>}
              {tenancy.noticeYear !== null && <Pill tone="warn">Procédure engagée</Pill>}
              {tenancy.rent < market * 0.9 && <Pill>Sous le marché</Pill>}
            </div>
            <div className="spread small muted" style={{ marginTop: 14 }}>
              <span>Ce qu’il pense de toi</span>
              <span>{Math.round(tenancy.goodwill)}</span>
            </div>
            <Meter value={tenancy.goodwill} />
            <div className="spread small muted" style={{ marginTop: 10 }}>
              <span>Le soin qu’il prend du logement</span>
              <span>{Math.round(tenancy.care)}</span>
            </div>
            <Meter value={tenancy.care} />
            <p className="small muted" style={{ margin: '12px 0 0', lineHeight: 1.55 }}>
              {tenancy.care < 35
                ? 'Le logement s’abîme plus vite qu’il ne devrait. Tu le paieras en travaux.'
                : tenancy.goodwill > 70
                  ? 'Il est bien ici. C’est ce qui te permettra d’augmenter le loyer sans le perdre.'
                  : 'Rien d’alarmant.'}
            </p>
          </Card>

          {/* ---- Ce qu'il demande ---- */}
          {prop.repair && (
            <Section title="Il attend une réponse">
              <Card pad>
                <div className="row-title">{prop.repair.label}</div>
                <p className="small muted" style={{ margin: '8px 0 0', lineHeight: 1.55 }}>
                  Les travaux coûteraient {money(state, prop.repair.cost)}. Sans
                  réponse de ta part avant l’an prochain, ce sera un refus.
                </p>
              </Card>
              <Card>
                <Row
                  emoji="🔧"
                  title="Faire les travaux"
                  sub={`${money(state, prop.repair.cost)} — le bien remonte, et il s’en souviendra`}
                  onClick={() => run((ctx) => handleRepair(ctx, prop.id, 'faire'), '🔧')}
                  chevron
                />
                <Row
                  emoji="🩹"
                  title="Faire au moins cesser la fuite"
                  sub={`${money(state, Math.round(prop.repair.cost * 0.35))} — ça tiendra un temps`}
                  onClick={() => run((ctx) => handleRepair(ctx, prop.id, 'bâcler'), '🩹')}
                  chevron
                />
                <Row
                  emoji="🙈"
                  title="Ne rien faire"
                  sub="Rien à payer. Le bien s’abîme, et lui aussi tient des comptes"
                  onClick={() => run((ctx) => handleRepair(ctx, prop.id, 'refuser'), '🙈')}
                  chevron
                />
              </Card>
            </Section>
          )}

          {/* ---- Le renouvellement ---- */}
          {tenancy.yearsLeft === 0 && (
            <Section title="Le bail est échu">
              <Card pad>
                <p style={{ margin: 0, lineHeight: 1.55 }}>
                  Il paie {money(state, tenancy.rent)} ; le marché est à{' '}
                  {money(state, market)}.
                </p>
                <p className="small muted" style={{ margin: '10px 0 0', lineHeight: 1.55 }}>
                  Augmenter fait partir ceux qui peuvent partir. Ne pas
                  augmenter laisse ton loyer glisser derrière le marché, année
                  après année : c’est le prix d’un bon locataire.
                </p>
              </Card>
              <Card>
                <Row
                  emoji="🤝"
                  title="Ne rien changer"
                  sub={`Il reste à ${money(state, tenancy.rent)}`}
                  onClick={() => run((ctx) => renewLease(ctx, prop.id, tenancy.rent), '🤝')}
                  chevron
                />
                <Row
                  emoji="📈"
                  title="Aligner sur le marché"
                  sub={money(state, market)}
                  onClick={() => run((ctx) => renewLease(ctx, prop.id, market), '📈')}
                  chevron
                />
                <Row
                  emoji="💰"
                  title="Demander davantage"
                  sub={`${money(state, Math.round(market * 1.2))} — il partira peut-être`}
                  onClick={() => run((ctx) => renewLease(ctx, prop.id, Math.round(market * 1.2)), '💰')}
                  chevron
                />
              </Card>
            </Section>
          )}

          <Section title="En finir">
            <Card>
              <Row
                emoji="🚪"
                title={tenancy.noticeYear === null ? 'Demander son départ' : 'Aller au bout de la procédure'}
                sub={tenancy.noticeYear === null
                  ? 'Long, et il n’aura plus aucune raison de ménager le logement'
                  : 'Des frais, et les impayés resteront impayés'}
                onClick={() => run((ctx) => evictTenant(ctx, prop.id), '🚪')}
                chevron
              />
            </Card>
          </Section>
        </>
      ) : (
        <>
          {/* ---- Le loyer demandé ---- */}
          <Card pad>
            <div className="spread">
              <div>
                <div className="row-title">🔑 Personne n’habite ici</div>
                <div className="row-sub">
                  {prop.vacantYears > 0
                    ? `Vide depuis ${prop.vacantYears} an(s)`
                    : 'À louer'}
                </div>
              </div>
              <Pill tone={prop.vacantYears > 1 ? 'bad' : undefined}>
                {money(state, prop.annualCost)}/an de charges
              </Pill>
            </div>
          </Card>

          <Section title="Ton loyer">
            <Card>
              <div className="card-pad">
                <Field label={`${money(state, asked)} par an · le marché est à ${money(state, market)}`}>
                  <AmountPicker
                    value={asked}
                    max={Math.round(market * 2.4)}
                    step={Math.max(1, Math.round(market / 40))}
                    onChange={(v) => run((ctx) => setAskingRent(ctx, prop.id, v))}
                  />
                </Field>
                <p className="small muted" style={{ margin: '12px 0 0', lineHeight: 1.55 }}>
                  {asked > market * 1.2
                    ? 'Au-dessus du marché, ceux qui ont le choix vont ailleurs. Il te restera ceux qui n’en ont pas — et ceux-là paient mieux jusqu’au jour où ils ne paient plus.'
                    : asked < market * 0.85
                      ? 'En dessous du marché : beaucoup de dossiers, donc un vrai choix, et moins d’argent chaque année.'
                      : 'Dans les prix du quartier. Tu auras quelques dossiers.'}
                </p>
              </div>
            </Card>
          </Section>

          {/* ---- Les dossiers ---- */}
          <Section title={prop.applicants.length > 0 ? `Dossiers (${prop.applicants.length})` : 'Trouver quelqu’un'}>
            {prop.applicants.length === 0 ? (
              <Card>
                <Row
                  emoji="📣"
                  title="Publier l’annonce"
                  sub="Une fois par an. Les candidatures dépendent du prix et de l’état du bien"
                  onClick={() => run((ctx) => listForRent(ctx, prop.id), '📣')}
                  chevron
                />
              </Card>
            ) : (
              <Card>
                {prop.applicants.map((a) => {
                  const npc = state.npcs[a.personId];
                  if (!npc) return null;
                  return (
                    <Row
                      key={a.id}
                      emoji={avatarFor(npc)}
                      title={`${npc.firstName} ${npc.lastName}`}
                      sub={`${a.hint} ${strainHint(a)}. ${careHint(a)}.`}
                      right={<Pill tone={a.offer > asked ? 'good' : undefined}>{money(state, a.offer)}</Pill>}
                      onClick={() => run((ctx) => acceptTenant(ctx, prop.id, a.id), '🔑')}
                      chevron
                    />
                  );
                })}
              </Card>
            )}
            <p className="small muted" style={{ margin: '10px 4px 0', lineHeight: 1.55 }}>
              Un dossier ne dit jamais tout. Ce qui se voit, c’est ce qu’ils
              gagnent ; ce qui compte, c’est ce qu’ils feront du logement — et
              ça, personne ne l’écrit sur une fiche.
            </p>
          </Section>

          {prop.rentedOut && (
            <Section title="">
              <Card>
                <Row
                  emoji="↩️"
                  title="Retirer de la location"
                  sub="Le bien reste vide, sans annonce"
                  onClick={() => run((ctx) => stopRenting(ctx, prop.id), '↩️')}
                  chevron
                />
              </Card>
            </Section>
          )}
        </>
      )}

      {/* ---- L'état du bien, toujours visible ---- */}
      <Section title="Le bien">
        <Card>
          <Row emoji="🔧" title="État" sub={prop.condition < 40 ? 'Il faudrait s’en occuper' : 'Correct'} right={<Gauge value={prop.condition} />} />
          <Row emoji="💶" title="Valeur" right={<strong>{money(state, prop.value)}</strong>} />
          <Row emoji="💸" title="Charges annuelles" right={money(state, prop.annualCost)} />
        </Card>
      </Section>
    </Sheet>
  );
}

/** Une ligne de synthèse, pour la liste des biens. */
export function tenancyLine(state: NonNullable<ReturnType<typeof useGame>['state']>, prop: OwnedProperty): string {
  const tenant = tenantOf(state, prop);
  if (tenant && prop.tenancy) {
    const parts = [`Loué à ${tenant.firstName}`];
    if (prop.tenancy.arrears > 0) parts.push('impayés');
    if (prop.repair) parts.push('travaux demandés');
    if (prop.tenancy.yearsLeft === 0) parts.push('bail échu');
    return parts.join(' · ');
  }
  if (prop.applicants.length > 0) return `${prop.applicants.length} dossier(s) à examiner`;
  if (prop.rentedOut) return prop.vacantYears > 0 ? `Vide depuis ${prop.vacantYears} an(s)` : 'À louer, sans candidat';
  return 'Pas en location';
}

/** Ce qui réclame une décision sur ce bien. */
export function tenancyAlert(prop: OwnedProperty): boolean {
  return Boolean(prop.repair)
    || prop.applicants.length > 0
    || (prop.tenancy?.yearsLeft === 0)
    || ((prop.tenancy?.arrears ?? 0) > 0);
}

