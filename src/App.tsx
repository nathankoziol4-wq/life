/**
 * App — machine à états du jeu : création → récap → vie → fin.
 * La sauvegarde est en mémoire (état React), pas de localStorage (par choix).
 */
import { useState } from "react";
import type { CharacterCreation, Character } from "./types";
import { createCharacter } from "./engine/character";
import { CreationMenu } from "./components/CreationMenu";
import { RecapScreen } from "./components/RecapScreen";
import { GameScreen } from "./components/GameScreen";
import { EndScreen } from "./components/EndScreen";

type Phase = "creation" | "recap" | "game" | "end";

export default function App() {
  const [phase, setPhase] = useState<Phase>("creation");
  const [creation, setCreation] = useState<CharacterCreation | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);

  return (
    <div className="app">
      <div className="app-header">
        <div className="brand">LifeSim X100</div>
        <div className="tag">Chaque choix façonne mécaniquement une vie entière.</div>
      </div>

      {phase === "creation" && (
        <CreationMenu
          onComplete={(c) => {
            setCreation(c);
            setPhase("recap");
          }}
        />
      )}

      {phase === "recap" && creation && (
        <RecapScreen
          creation={creation}
          onBack={() => setPhase("creation")}
          onStart={() => {
            setCharacter(createCharacter(creation));
            setPhase("game");
          }}
        />
      )}

      {phase === "game" && character && (
        <GameScreen
          initial={character}
          onDeath={(c) => {
            setCharacter(c);
            setPhase("end");
          }}
        />
      )}

      {phase === "end" && character && (
        <EndScreen
          char={character}
          onRestart={() => {
            setCreation(null);
            setCharacter(null);
            setPhase("creation");
          }}
        />
      )}
    </div>
  );
}
