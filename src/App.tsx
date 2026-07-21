/**
 * App — machine à états du jeu : accueil → création → récap → vie → fin.
 * La sauvegarde est en mémoire (état React), pas de localStorage (par choix).
 */
import { useState } from "react";
import type { CharacterCreation, Character } from "./types";
import { createCharacter } from "./engine/character";
import { randomCreation } from "./engine/random";
import { HomeScreen } from "./components/HomeScreen";
import { CreationMenu } from "./components/CreationMenu";
import { RecapScreen } from "./components/RecapScreen";
import { GameScreen } from "./components/GameScreen";
import { EndScreen } from "./components/EndScreen";

type Phase = "home" | "creation" | "recap" | "game" | "end";

export default function App() {
  const [phase, setPhase] = useState<Phase>("home");
  const [creation, setCreation] = useState<CharacterCreation | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);
  const [lives, setLives] = useState(0);

  const isHome = phase === "home";

  return (
    <div className={isHome ? "app app-home" : "app"}>
      {!isHome && (
        <div className="app-header">
          <div className="brand" onClick={() => setPhase("home")} role="button" title="Menu principal">LifeSim X100</div>
          <div className="tag">Chaque choix façonne mécaniquement une vie entière.</div>
        </div>
      )}

      {phase === "home" && (
        <HomeScreen
          livesLived={lives}
          onNewLife={() => setPhase("creation")}
          onExpress={() => {
            const c = randomCreation();
            setCreation(c);
            setCharacter(createCharacter(c));
            setPhase("game");
          }}
        />
      )}

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
            setLives((n) => n + 1);
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
            setPhase("home");
          }}
        />
      )}
    </div>
  );
}
