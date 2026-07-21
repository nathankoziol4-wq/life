/**
 * Menu principal — écran d'accueil animé et "addictif".
 * Fond vivant (orbes + particules d'événements qui montent), logo animé, tagline
 * qui défile, CTA lumineux pulsant, et un mode "Vie express" pour rejouer aussitôt.
 * 100 % CSS/JS embarqué (aucune dépendance), fonctionne dans le fichier autonome.
 */
import { useEffect, useMemo, useState } from "react";

const TAGLINES = [
  "Chaque choix façonne une vie entière.",
  "Nais milliardaire à Monaco… ou orphelin à Lagos.",
  "Deviens PDG, artiste, parrain — ou légende.",
  "Deux personnages, deux destins radicalement différents.",
  "Ta tête, tes gènes, tes vices : tout compte.",
  "Braque une banque. Fonde une famille. Ou les deux.",
  "Une IA écrit des événements inédits à chaque partie.",
];

const PARTICLE_EMOJIS = ["💼", "❤️", "🎓", "💰", "🎂", "🔫", "🎨", "🏠", "👶", "✈️", "💊", "🎰", "⚖️", "🩺", "🎤", "🏆", "💍", "🕶️", "🧬", "📈", "🎸", "⚽"];

const FEATURES = [
  { icon: "🌍", label: "32 pays" },
  { icon: "🎭", label: "Création massive" },
  { icon: "🕶️", label: "Crime & prison" },
  { icon: "👥", label: "Relations vivantes" },
  { icon: "✨", label: "IA générative" },
];

export function HomeScreen({ onNewLife, onExpress, livesLived }: { onNewLife: () => void; onExpress: () => void; livesLived: number }) {
  const [tag, setTag] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTag((n) => (n + 1) % TAGLINES.length), 3200);
    return () => clearInterval(t);
  }, []);

  // Particules d'événements qui s'élèvent en fond (positions/durées aléatoires figées).
  const particles = useMemo(
    () =>
      Array.from({ length: 22 }).map((_, i) => ({
        e: PARTICLE_EMOJIS[i % PARTICLE_EMOJIS.length],
        left: Math.random() * 100,
        delay: Math.random() * 12,
        dur: 11 + Math.random() * 12,
        size: 14 + Math.random() * 22,
        drift: (Math.random() * 2 - 1) * 40,
      })),
    []
  );

  return (
    <div className="home">
      {/* Fond animé */}
      <div className="home-bg">
        <span className="orb orb-a" />
        <span className="orb orb-b" />
        <span className="orb orb-c" />
        <div className="home-grid" />
      </div>

      {/* Particules d'événements */}
      <div className="particles" aria-hidden>
        {particles.map((p, i) => (
          <span
            key={i}
            className="particle"
            style={{
              left: `${p.left}%`,
              fontSize: `${p.size}px`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.dur}s`,
              // @ts-expect-error variable CSS custom
              "--drift": `${p.drift}px`,
            }}
          >
            {p.e}
          </span>
        ))}
      </div>

      {/* Contenu */}
      <div className="home-content">
        <div className="home-emblem rise" style={{ animationDelay: "0.05s" }}>🎲</div>
        <h1 className="home-logo rise" style={{ animationDelay: "0.12s" }}>
          LifeSim <span className="x100">X100</span>
        </h1>

        <div className="home-tag-wrap rise" style={{ animationDelay: "0.2s" }}>
          <p key={tag} className="home-tag">{TAGLINES[tag]}</p>
        </div>

        <div className="home-cta rise" style={{ animationDelay: "0.3s" }}>
          <button className="btn-hero" onClick={onNewLife}>
            <span className="bh-icon">▶</span>
            <span className="bh-text">
              <b>Nouvelle vie</b>
              <small>Crée ton personnage en détail</small>
            </span>
            <span className="bh-glow" />
          </button>
          <button className="btn-express" onClick={onExpress}>
            <span>🎲</span> Vie express
            <small>Aléatoire · instantané</small>
          </button>
        </div>

        <div className="home-features rise" style={{ animationDelay: "0.42s" }}>
          {FEATURES.map((f, i) => (
            <span key={f.label} className="feat-chip" style={{ animationDelay: `${0.5 + i * 0.07}s` }}>
              <span className="fc-icon">{f.icon}</span> {f.label}
            </span>
          ))}
        </div>

        <div className="home-foot rise" style={{ animationDelay: "0.7s" }}>
          {livesLived > 0 ? `${livesLived} vie${livesLived > 1 ? "s" : ""} déjà vécue${livesLived > 1 ? "s" : ""} cette session` : "Prêt à naître ?"}
        </div>
      </div>
    </div>
  );
}
