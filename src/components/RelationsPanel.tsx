/**
 * Panneau "Mes relations" (sous-branche Social) — liste les connaissances avec
 * leur tête (avatar), leur lien (jauge de complicité) et les activités possibles
 * avec chacune (y compris les actions sombres).
 */
import { useState } from "react";
import type { Character, Relationship } from "../types";
import { activitiesFor } from "../engine/relationships";
import { avatarForRelationship } from "../engine/avatar";
import { Avatar } from "./Avatar";
import { money } from "./ui";

const KIND_LABEL: Record<Relationship["kind"], string> = {
  parent: "Parent",
  fratrie: "Frère/Sœur",
  ami: "Ami·e",
  partenaire: "Partenaire",
  ennemi: "Ennemi·e",
  enfant: "Enfant",
  collegue: "Collègue",
};

export function RelationsPanel({ char, disabled, onAct }: { char: Character; disabled: boolean; onAct: (rel: Relationship, activityId: string) => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const rels = char.relationships.filter((r) => r.alive);

  if (!rels.length) {
    return <div className="field-hint">Tu ne connais encore personne. Va te faire des amis (action « Se faire des amis ») ou attends les rencontres de la vie.</div>;
  }

  return (
    <div className="rel-list">
      {rels.map((rel) => {
        const open = openId === rel.id;
        const acts = activitiesFor(char, rel);
        return (
          <div key={rel.id} className={`rel-card${open ? " open" : ""}`}>
            <button className="rel-head" onClick={() => setOpenId(open ? null : rel.id)}>
              <Avatar a={avatarForRelationship(rel)} size={48} ring={rel.closeness >= 0 ? "var(--good)" : "var(--bad)"} />
              <div className="rel-info">
                <div className="rel-name">{rel.name} <span className="rel-kind">{KIND_LABEL[rel.kind]}</span></div>
                <div className="rel-bar">
                  <span className="rel-bar-fill" style={{ width: `${(rel.closeness + 100) / 2}%`, background: rel.closeness >= 0 ? "linear-gradient(90deg,var(--good),var(--accent))" : "var(--bad)" }} />
                </div>
              </div>
              <span className="rel-caret">{open ? "▾" : "›"}</span>
            </button>
            {open && (
              <div className="rel-acts">
                {acts.filter((a) => a.available || a.reason !== "N/A").map(({ activity, available, reason }) => (
                  <button
                    key={activity.id}
                    className={`rel-act${activity.dark ? " dark" : ""}${available ? "" : " locked"}`}
                    disabled={!available || disabled}
                    onClick={() => available && !disabled && onAct(rel, activity.id)}
                    title={activity.description}
                  >
                    <span className="ra-icon">{activity.icon}</span>
                    <span className="ra-label">{activity.label}{activity.cost ? <span className="ra-cost"> · {money(activity.cost)}</span> : null}</span>
                    {!available && reason && reason !== "N/A" ? <span className="ra-lock">{reason}</span> : null}
                  </button>
                ))}
                {disabled && <div className="field-hint warn-text">Termine les événements de l'année d'abord.</div>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
