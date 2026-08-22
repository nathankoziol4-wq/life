/**
 * Écran « D'où tu viens ».
 *
 * Ce que cet écran doit rendre visible n'est pas la progression — c'est le
 * **prix**. Un joueur qui ne verrait qu'une jauge monter suivrait la piste la
 * plus efficace et n'aurait rien décidé. L'ordre est donc celui de la
 * décision :
 *
 * 1. **Ce que tu sais**, et ce que ça t'a déjà coûté : la piste rassemblée, la
 *    solidité de ce qu'on a, et la tension chez ceux qui t'ont élevé — parce
 *    que c'est la monnaie qu'on dépense sans s'en apercevoir.
 * 2. **Y aller**, dès que c'est possible, avec ce qu'on devine de ce qui
 *    attend quand la piste est assez solide. C'est le seul moment où renoncer
 *    en connaissance de cause est possible, et il doit sauter aux yeux.
 * 3. **Les pistes**, avec pour chacune ses chances, son prix en argent **et**
 *    son prix chez eux, avant qu'on la suive.
 * 4. **Laisser tomber**, en dernier et toujours ouvert. Un écran où arrêter
 *    n'est pas proposé transforme un choix en couloir.
 */

import { Empty, Meter, Pill, Sheet } from '../components/Modal.tsx';
import { Card, Row, Section } from '../ui/components/list.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { money } from '../ui/format.ts';
import { CLOSED, ENOUGH } from '../data/roots.ts';
import {
  availableLeads, canGo, closedOff, follow, goAndSee, leadBlocker, leadOdds,
  leftThisYear, letGo, letGoYear, priceOf, raisedBy, rootsOf, whatYouKnow,
} from '../systems/roots.ts';

/** Ce que la piste laisse deviner, en clair. */
const SAID = {
  accueil: 'Ce que tu rassembles laisse penser qu’elle t’attend.',
  refus: 'Ce que tu rassembles laisse penser qu’elle ne voudra pas.',
  dur: 'Ce que tu rassembles n’annonce rien de bon.',
} as const;

const DONE = {
  accueil: 'Elle t’a ouvert la porte.',
  refus: 'Elle n’a pas voulu te connaître.',
  tard: 'Tu es arrivé quelques années trop tard.',
  dur: 'Tu sais pourquoi. Ça ne répare rien.',
} as const;

export function RootsScreen({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  if (!state) return null;
  const roots = rootsOf(state);
  if (!roots) {
    return (
      <Sheet title="D’où tu viens" onBack={onBack}>
        <Empty>Tu as grandi chez les tiens. La question ne se pose pas.</Empty>
      </Sheet>
    );
  }

  const home = roots.how === 'adoption' ? 'adopté' : 'placé';

  if (roots.knownYear === null) {
    // On ne montre rien : le personnage ne sait pas. L'écran existe quand même,
    // sans quoi il apparaîtrait un jour de nulle part.
    return (
      <Sheet title="D’où tu viens" onBack={onBack}>
        <Empty>Tu n’as jamais eu de raison de te poser la question.</Empty>
      </Sheet>
    );
  }

  if (roots.outcome !== null) {
    const gaveUp = letGoYear(state) !== null;
    return (
      <Sheet title="D’où tu viens" onBack={onBack}>
        <Card pad>
          <p style={{ margin: 0, lineHeight: 1.5 }}>
            {gaveUp
              ? 'Tu as cessé de chercher. Ceux qui t’ont élevé sont ceux que tu as.'
              : DONE[roots.outcome]}
          </p>
          <div className="chips" style={{ marginTop: 12 }}>
            <Pill>{roots.tried.length} piste(s) suivie(s)</Pill>
            {roots.metYear !== null && <Pill>en {roots.metYear}</Pill>}
          </div>
        </Card>
      </Sheet>
    );
  }

  const said = whatYouKnow(state);
  const left = leftThisYear(state);
  const open = availableLeads(state);
  const shut = closedOff(state);

  return (
    <Sheet title="D’où tu viens" onBack={onBack}>
      <Card pad>
        <p className="small muted" style={{ margin: 0, lineHeight: 1.5 }}>
          Tu as été {home}. Tu peux chercher d’où tu viens — et chaque piste se
          paie deux fois : en argent, et chez ceux qui t’ont élevé.
        </p>
        <div style={{ margin: '12px 0 8px' }}>
          <Meter value={(roots.trail / ENOUGH) * 100} />
        </div>
        <div className="chips">
          <Pill tone={roots.trail >= ENOUGH ? 'good' : 'primary'}>
            {Math.round(roots.trail)} / {ENOUGH}
          </Pill>
          {/* La tension : la monnaie qu'on dépense sans la voir. C'est la
              seule raison pour laquelle « leur demander » n'est pas la
              réponse évidente à tout. */}
          <Pill tone={shut ? 'bad' : roots.strain > CLOSED / 2 ? 'warn' : undefined}>
            {shut ? 'ils se sont fermés' : `tension ${Math.round(roots.strain)}`}
          </Pill>
          <Pill tone={left > 0 ? 'primary' : 'warn'}>
            {left > 0 ? 'une piste cette année' : 'plus rien cette année'}
          </Pill>
        </div>
        {said && (
          <p className="small" style={{ margin: '10px 0 0', lineHeight: 1.5 }}>
            <strong>{SAID[said]}</strong> Tu peux encore décider de ne pas y
            aller — c’est ce que des pistes sérieuses t’auront acheté.
          </p>
        )}
        {roots.strain > CLOSED / 2 && !shut && (
          <p className="small" style={{ margin: '10px 0 0', lineHeight: 1.5 }}>
            Ils encaissent mal. Encore quelques demandes et ils cesseront de
            répondre — laisse passer une année et ça retombera un peu.
          </p>
        )}
      </Card>

      {canGo(state) && (
        <Section title="Y aller">
          <Card>
            <Row
              emoji="🚪"
              title="Aller la voir"
              sub={said
                ? 'Tu sais à peu près ce qui t’attend. Une fois, sans retour.'
                : 'Tu ne sais pas ce que tu trouveras. Une fois, sans retour.'}
              onClick={() => run((ctx) => goAndSee(ctx), '🚪')}
              chevron
            />
          </Card>
          <p className="small muted" style={{ margin: '8px 4px 0', lineHeight: 1.5 }}>
            Savoir qui elle est ne dit pas si elle sera encore là. Cela, personne
            ne peut te le dire avant que tu y ailles.
          </p>
        </Section>
      )}

      <Section title="Chercher">
        {open.length === 0 ? (
          <Empty>Rien ne t’est encore ouvert. Il faudra grandir.</Empty>
        ) : (
          <Card>
            {open.map((lead) => {
              const why = leadBlocker(state, lead.id);
              const odds = leadOdds(state, lead.id);
              const price = priceOf(state, lead);
              return (
                <Row
                  key={lead.id}
                  emoji={lead.emoji}
                  title={lead.label}
                  // Les chances **et** le prix chez eux, avant de cliquer.
                  // Découvrir après coup qu'une question a coûté un quart du
                  // lien avec sa mère n'est pas une décision.
                  sub={`${Math.round(odds * 100)} % · ${lead.strain > 0
                    ? `leur coûte ${lead.strain}` : 'ne leur coûte rien'} · ${lead.line}`}
                  right={price === 0 ? 'Gratuit' : money(state, price)}
                  closed={Boolean(why)}
                  because={why}
                  onClick={() => run((ctx) => follow(ctx, lead.id), lead.emoji)}
                  chevron={!why}
                />
              );
            })}
          </Card>
        )}
      </Section>

      <Section title="Ou pas">
        <Card>
          <Row
            emoji="🕊️"
            title="Laisser tomber"
            sub={raisedBy(state).length > 0
              ? 'Définitif. Ce que ça rend : la paix, et ce que tu leur as pris'
              : 'Définitif. Tu cesses d’attendre une réponse'}
            onClick={() => run((ctx) => letGo(ctx), '🕊️')}
            chevron
          />
        </Card>
        <p className="small muted" style={{ margin: '8px 4px 0', lineHeight: 1.5 }}>
          Une vie sur quatre trouve mieux en s’arrêtant qu’en continuant. Ce
          n’est pas une porte de sortie : c’est une des réponses.
        </p>
      </Section>
    </Sheet>
  );
}
