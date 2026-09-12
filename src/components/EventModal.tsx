/**
 * Modale d'événement interactif : présente la situation et les choix, puis
 * transmet la réponse au moteur.
 */

import { Modal } from './Modal.tsx';
import { useGame } from '../ui/GameContext.tsx';

export function EventModal() {
  const { currentEvent, answerEvent, result } = useGame();
  // Le résultat de l'événement précédent a la priorité d'affichage.
  if (!currentEvent || result) return null;

  return (
    <Modal
      open
      dismissible={false}
      icon={currentEvent.icon}
      title={currentEvent.title}
      text={currentEvent.text}
    >
      <div className="modal-choices">
        {currentEvent.choices.map((choice, index) => (
          <button
            key={`${choice.label}-${index}`}
            className="choice"
            onClick={() => answerEvent(index)}
            type="button"
          >
            {choice.label}
          </button>
        ))}
      </div>
    </Modal>
  );
}

/** Modale générique affichant le résultat d'une action ou d'un choix. */
export function ResultModal() {
  const { result, dismissResult } = useGame();
  if (!result) return null;

  const icon = result.icon ?? (result.tone === 'good' ? '✅' : result.tone === 'bad' ? '⚠️' : 'ℹ️');
  return (
    <Modal open onClose={dismissResult} icon={icon} title={result.title} text={result.message}>
      <button className="btn btn-primary" onClick={dismissResult} type="button">
        Continuer
      </button>
    </Modal>
  );
}
