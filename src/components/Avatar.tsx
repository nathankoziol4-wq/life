/**
 * Avatar SVG — dessine une "tête" stylisée à partir d'AvatarParams.
 * Utilisé pour le personnage joueur (création, HUD) et les connaissances (PNJ).
 */
import type { AvatarParams } from "../types";

export function Avatar({ a, size = 64, ring }: { a: AvatarParams; size?: number; ring?: string }) {
  const hair = a.hair;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block", borderRadius: "50%", background: "linear-gradient(160deg,#20283a,#141a26)", boxShadow: ring ? `0 0 0 2px ${ring}` : undefined }}>
      {/* Cou */}
      <rect x="42" y="70" width="16" height="18" rx="6" fill={a.skin} />
      {/* Oreilles */}
      <circle cx="22" cy="52" r="6" fill={a.skin} />
      <circle cx="78" cy="52" r="6" fill={a.skin} />
      {a.accessory === "boucle_oreille" && <circle cx="22" cy="59" r="2.2" fill="#ffd85e" />}
      {/* Cheveux arrière (afro / long / tresses / queue) */}
      {a.hairStyle === "afro" && <circle cx="50" cy="46" r="36" fill={hair} />}
      {a.hairStyle === "long" && <path d="M16 44 Q16 92 30 92 L30 50 Q50 30 70 50 L70 92 Q84 92 84 44 Z" fill={hair} />}
      {a.hairStyle === "tresses" && (
        <g fill={hair}>
          <rect x="14" y="46" width="9" height="42" rx="4" /><rect x="77" y="46" width="9" height="42" rx="4" />
          <circle cx="18.5" cy="60" r="4.5" /><circle cx="18.5" cy="72" r="4.5" /><circle cx="81.5" cy="60" r="4.5" /><circle cx="81.5" cy="72" r="4.5" />
        </g>
      )}
      {a.hairStyle === "queue" && <path d="M70 40 Q90 44 86 70 Q84 82 78 84 Q84 66 72 50 Z" fill={hair} />}
      {/* Tête */}
      <ellipse cx="50" cy="50" rx="30" ry="32" fill={a.skin} />
      {/* Cheveux avant selon le style */}
      {renderHair(a.hairStyle, hair)}
      {/* Sourcils */}
      <rect x="34" y="42" width="12" height="2.6" rx="1.3" fill="#3a2b20" />
      <rect x="54" y="42" width="12" height="2.6" rx="1.3" fill="#3a2b20" />
      {/* Yeux */}
      <ellipse cx="40" cy="50" rx="5.5" ry="4" fill="#fff" />
      <ellipse cx="60" cy="50" rx="5.5" ry="4" fill="#fff" />
      <circle cx="40.5" cy="50" r="2.6" fill={a.eyes} />
      <circle cx="60.5" cy="50" r="2.6" fill={a.eyes} />
      <circle cx="40.5" cy="50" r="1.1" fill="#111" />
      <circle cx="60.5" cy="50" r="1.1" fill="#111" />
      {/* Nez */}
      <path d="M50 53 L47 61 Q50 63 53 61 Z" fill="rgba(0,0,0,0.10)" />
      {/* Bouche */}
      <path d="M42 67 Q50 73 58 67" stroke="#8a3b39" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      {/* Traits distinctifs */}
      {a.feature === "taches" && (
        <g fill="rgba(120,72,40,0.55)">
          <circle cx="36" cy="58" r="1.1" /><circle cx="40" cy="60" r="1.1" /><circle cx="44" cy="58" r="1.1" />
          <circle cx="56" cy="58" r="1.1" /><circle cx="60" cy="60" r="1.1" /><circle cx="64" cy="58" r="1.1" />
        </g>
      )}
      {a.feature === "cicatrice" && <path d="M62 38 L68 56" stroke="#a8695a" strokeWidth="1.8" strokeLinecap="round" />}
      {/* Barbe / moustache */}
      {a.accessory === "barbe" && <path d="M26 56 Q50 92 74 56 Q70 74 50 78 Q30 74 26 56 Z" fill={hair} opacity="0.92" />}
      {a.accessory === "moustache" && <path d="M40 62 Q50 66 60 62 Q56 68 50 67 Q44 68 40 62 Z" fill={hair} opacity="0.9" />}
      {/* Cache-œil */}
      {a.accessory === "cache_oeil" && (
        <g>
          <path d="M30 42 L72 52" stroke="#111" strokeWidth="2.4" />
          <rect x="54" y="45" width="13" height="10" rx="2.5" fill="#111" />
        </g>
      )}
      {/* Lunettes */}
      {(a.accessory === "lunettes" || a.accessory === "soleil") && (
        <g stroke="#20242e" strokeWidth="2" fill={a.accessory === "soleil" ? "#20242e" : "rgba(255,255,255,0.10)"}>
          <rect x="33" y="45" width="14" height="10" rx="3" />
          <rect x="53" y="45" width="14" height="10" rx="3" />
          <line x1="47" y1="50" x2="53" y2="50" />
        </g>
      )}
      {/* Chapeau */}
      {a.accessory === "chapeau" && (
        <g fill="#2b2f3c">
          <rect x="24" y="26" width="52" height="6" rx="3" />
          <rect x="33" y="12" width="34" height="18" rx="4" />
        </g>
      )}
      {/* Casquette */}
      {a.accessory === "casquette" && (
        <g fill="#c0392b">
          <path d="M22 32 Q50 12 78 32 Q78 24 50 22 Q22 24 22 32 Z" />
          <path d="M72 32 Q92 33 92 40 L72 38 Z" />
        </g>
      )}
    </svg>
  );
}

function renderHair(style: string, hair: string) {
  switch (style) {
    case "rase":
      return <path d="M22 44 Q50 20 78 44 Q78 34 50 24 Q22 34 22 44 Z" fill={hair} opacity="0.55" />;
    case "chignon":
      return (
        <g fill={hair}>
          <circle cx="50" cy="20" r="8" />
          <path d="M20 46 Q50 14 80 46 Q80 30 50 24 Q20 30 20 46 Z" />
        </g>
      );
    case "boucle":
      return (
        <g fill={hair}>
          <circle cx="30" cy="34" r="10" /><circle cx="44" cy="28" r="11" /><circle cx="58" cy="28" r="11" /><circle cx="70" cy="34" r="10" />
        </g>
      );
    case "crete":
      return (
        <g fill={hair}>
          <path d="M44 12 L56 12 L54 34 L46 34 Z" />
          <path d="M46 10 L50 4 L54 10 Z" />
          <path d="M20 46 Q22 38 34 36 L36 32 Q30 38 20 46 Z" opacity="0.8" />
          <path d="M80 46 Q78 38 66 36 L64 32 Q70 38 80 46 Z" opacity="0.8" />
        </g>
      );
    case "afro":
      return null; // dessiné en arrière-plan
    case "long":
    case "court":
    default:
      return <path d="M20 48 Q18 20 50 18 Q82 20 80 48 Q72 34 50 34 Q28 34 20 48 Z" fill={hair} />;
  }
}
