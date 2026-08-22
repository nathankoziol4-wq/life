/**
 * Écran « Ce qui passe par tes mains ».
 *
 * Il n'existait pas : le détournement de fonds était une ligne du menu des
 * délits, avec pour toute condition d'avoir un emploi — n'importe lequel.
 *
 * Ce que l'écran doit rendre lisible, c'est que **la décision n'est pas une
 * somme mais une part**, et qu'elle se prend une fois par an pendant toute une
 * carrière. Trois choses, donc, et dans cet ordre :
 *
 * 1. **la portée** — ce qui passe par ses mains, qui vient de la place qu'on
 *    occupe et non d'un choix ; c'est ce qui explique pourquoi les mêmes
 *    portions rapportent dix fois plus à cinquante ans qu'à trente ;
 * 2. **le soupçon**, avec ce qu'une année tranquille en retirerait — parce
 *    que sans ce second chiffre, s'arrêter serait un acte de foi ;
 * 3. **les portions**, chacune annonçant à l'avance ce qu'elle rapporte *et*
 *    ce qu'elle ajoute, de sorte qu'on choisisse en connaissance de cause
 *    plutôt qu'en espérant.
 *
 * Il n'y a **pas** de ligne « ne rien prendre » : elle ferait exactement ce
 * que fait le fait de ne pas appuyer. Ce que l'écran fait à la place, c'est
 * dire où le soupçon retomberait.
 */

import { Empty, Meter, Pill, Sheet } from '../components/Modal.tsx';
import { Card, Row, Section } from '../ui/components/list.tsx';
import { useGame } from '../ui/GameContext.tsx';
import { money } from '../ui/format.ts';
import {
  HELPINGS, coolingTo, help, helpBlocker, previewHelping, reachOf,
  suspicionOf, suspicionSays, takenOf,
} from '../systems/office.ts';

export function OfficeScreen({ onBack }: { onBack: () => void }) {
  const { state, run } = useGame();
  if (!state) return null;
  const job = state.player.job;

  if (!job) {
    return (
      <Sheet title="Par tes mains" onBack={onBack}>
        <Empty>Il faut une place quelque part.</Empty>
      </Sheet>
    );
  }

  const reach = reachOf(state);
  const suspicion = suspicionOf(state);
  const taken = takenOf(state);
  const cooling = coolingTo(state);
  const why = helpBlocker(state);

  return (
    <Sheet title="Par tes mains" onBack={onBack}>
      <Card pad>
        <p className="small muted" style={{ margin: 0, lineHeight: 1.5 }}>
          Ce que ta place te fait approcher chez {job.employer}. Personne ne
          compte ce qui est petit ; tout le monde finit par compter ce qui est
          gros.
        </p>
        <div className="chips" style={{ marginTop: 12 }}>
          <Pill tone="primary">{money(state, reach)}/an à portée</Pill>
          {taken > 0 && <Pill tone="warn">{money(state, taken)} pris ici</Pill>}
        </div>
      </Card>

      <Section title="Ce qu’on pense de toi ici">
        <Card>
          <div className="card-pad">
            <Meter value={suspicion} />
            <p className="small" style={{ margin: '8px 0 0', lineHeight: 1.5 }}>
              {suspicionSays(state)}
            </p>
            {/* Le second chiffre : sans lui, s'arrêter serait un pari. */}
            {suspicion > 0 && (
              <p className="small muted" style={{ margin: '6px 0 0', lineHeight: 1.5 }}>
                Une année sans rien prendre le ramènerait vers {cooling}.
              </p>
            )}
          </div>
        </Card>
      </Section>

      <Section
        title="Cette année"
        sub="Une part de ce que tu approches — pas une somme. C’est l’écart qui se remarque."
      >
        <Card>
          {HELPINGS.map((h) => {
            const { gain, adds } = previewHelping(state, h);
            const blocked = why ?? helpBlocker(state, h);
            return (
              <Row
                key={h.id}
                emoji={h.emoji}
                title={h.label}
                sub={`${h.line} · soupçon +${adds}`}
                right={money(state, gain)}
                closed={Boolean(blocked)}
                because={blocked}
                onClick={() => run((ctx) => help(ctx, h.id), h.emoji)}
                chevron={!blocked}
              />
            );
          })}
        </Card>
        <p className="small muted" style={{ margin: '8px 4px 0', lineHeight: 1.5 }}>
          Ne rien prendre ne demande aucun geste : ferme simplement cette page.
          Changer d’employeur remet le soupçon à zéro — et l’ancienneté aussi,
          dont dépend ce que tu approches.
        </p>
      </Section>
    </Sheet>
  );
}
