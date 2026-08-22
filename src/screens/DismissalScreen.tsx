/**
 * Écran « Ton dossier ».
 *
 * Il n'existait pas : perdre son poste retirait quatorze points de bonheur et
 * écrivait une ligne dans le journal.
 *
 * Ce que l'écran doit rendre lisible, c'est que **la force du dossier a été
 * faite pendant les années de poste** et qu'elle ne bouge plus. D'où la
 * section du milieu, qui pèse le dossier ligne à ligne et signée : sans elle,
 * les deux choix seraient un pari sur un nombre, et le joueur n'aurait aucun
 * moyen de comprendre que ce sont ses quinze années sans avertissement qui
 * viennent de lui payer une indemnité.
 *
 * Les deux lignes annoncent chacune **deux** chiffres comparables : ce que
 * la négociation donnerait à coup sûr, et ce qu'une victoire vaudrait contre
 * ce que la tentative coûte. La première version n'affichait que les
 * honoraires du côté de la contestation, si bien que le seul montant lisible
 * à l'écran était celui du choix prudent — alors que le meilleur choix
 * bascule trois fois sur la plage mesurée, et qu'il ne dépend pas que de la
 * force : un motif qu'on paie cher pour l'oublier récompense la négociation,
 * un motif qui n'offre rien ne laisse que la contestation.
 *
 * Il n'y a pas de troisième ligne « ne rien faire » — l'affaire s'éteint
 * d'elle-même, et l'écran le dit plutôt que d'en faire un bouton.
 */

import { Empty, Meter, Pill, Sheet } from '../components/Modal.tsx';
import { Card, Row, Section } from '../ui/components/list.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { money } from '../ui/format.ts';
import { CASE_YEARS, REINSTATE_AT } from '../data/dismissal.ts';
import {
  awardOf, caseBlocker, caseOf, contest, dropCase, feeOf, groundOf, reasons,
  settle, settlementOf, strengthOf, strengthSays, wouldReinstate,
} from '../systems/dismissal.ts';

export function DismissalScreen({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  if (!state) return null;
  const file = caseOf(state);

  if (!file) {
    return (
      <Sheet title="Ton dossier" onBack={onBack}>
        <Empty>Il n’y a rien à contester.</Empty>
      </Sheet>
    );
  }

  const ground = groundOf(state);
  const strength = strengthOf(state);
  const why = caseBlocker(state);
  const running = file.contestedYear !== null;
  const left = running ? CASE_YEARS - (state.year - file.contestedYear!) : 0;

  return (
    <Sheet title="Ton dossier" onBack={onBack}>
      <Card pad>
        <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-0.3px' }}>
          {ground?.emoji} {ground?.label}
        </div>
        <div className="row-sub">{file.employer} · {file.title}</div>
        <p className="small muted" style={{ margin: '10px 0 0', lineHeight: 1.5 }}>
          {ground?.line}
        </p>
        <div className="chips" style={{ marginTop: 12 }}>
          <Pill>{file.years} an(s) de maison</Pill>
          <Pill tone={file.warnings > 0 ? 'bad' : 'good'}>
            {file.warnings > 0 ? `${file.warnings} avertissement(s)` : 'dossier vierge'}
          </Pill>
          <Pill tone="primary">{money(state, file.salary)}/an perdus</Pill>
        </div>
      </Card>

      <Section title="Ce que ton dossier vaut">
        <Card>
          <div className="card-pad">
            <Meter value={strength} />
            <p className="small" style={{ margin: '8px 0 0', lineHeight: 1.5 }}>
              {strengthSays(state)}
            </p>
          </div>
        </Card>
        {/*
          Ligne à ligne et signé : c'est ce qui distingue un dossier d'un
          tirage, et ce qui montre que la partie s'est jouée il y a des années.
        */}
        <Card>
          {reasons(state).map((r) => (
            <Row
              key={r.label}
              emoji={r.weight > 0 ? '➕' : '➖'}
              title={r.label}
              right={
                /*
                 * Le signe typographique, comme partout ailleurs dans le jeu —
                 * `ParenthoodScreen` fait de même. Un nombre négatif rendu tel
                 * quel donne un trait d'union, qui se lit mal et jure avec le
                 * reste des pesées.
                 */
                <Pill tone={r.weight > 0 ? 'good' : 'bad'}>
                  {r.weight > 0 ? '+' : '−'}{Math.abs(r.weight)}
                </Pill>
              }
            />
          ))}
        </Card>
      </Section>

      {running ? (
        <Section title="L’affaire suit son cours">
          <Card>
            <Row
              emoji="⏳"
              title={left > 0 ? `Encore ${left} an(s)` : 'L’issue est proche'}
              sub={`Au-dessus de ${REINSTATE_AT}, on peut retrouver sa place plutôt qu’une indemnité.`}
            />
            <Row
              emoji="🚪"
              title="Laisser tomber"
              sub="Ce qui a été versé est perdu"
              onClick={() => run((ctx) => dropCase(ctx), '🚪')}
              chevron
            />
          </Card>
        </Section>
      ) : (
        <Section title="Ce que tu peux faire">
          <Card>
            <Row
              emoji="🤝"
              title="Négocier un départ"
              sub="Sûr, tout de suite, et l’affaire s’arrête là"
              right={money(state, settlementOf(state))}
              closed={Boolean(why)}
              because={why}
              onClick={() => run((ctx) => settle(ctx), '🤝')}
              chevron={!why}
            />
            {/*
              Les deux lignes doivent annoncer une somme comparable. Sans
              celle-ci, le seul montant lisible à l'écran était celui du choix
              prudent, et « contester » n'était qu'un coût — alors que le
              meilleur choix bascule trois fois sur la plage mesurée.
            */}
            <Row
              emoji="⚖️"
              title="Contester"
              sub={wouldReinstate(state)
                ? `${CASE_YEARS} ans d’attente. Gagner te rendrait ta place.`
                : `${CASE_YEARS} ans d’attente. Gagner vaudrait ${money(state, awardOf(state))}.`}
              right={`− ${money(state, feeOf(state))}`}
              closed={Boolean(why)}
              because={why}
              onClick={() => run((ctx) => contest(ctx), '⚖️')}
              chevron={!why}
            />
          </Card>
          <p className="small muted" style={{ margin: '8px 4px 0', lineHeight: 1.5 }}>
            Ne rien faire ne demande aucun geste : l’affaire s’éteindra d’elle-même
            au bout de {CASE_YEARS} ans. Perdre une contestation, en revanche, se
            sait — et rend les embauches plus difficiles pendant un temps.
          </p>
        </Section>
      )}
    </Sheet>
  );
}
