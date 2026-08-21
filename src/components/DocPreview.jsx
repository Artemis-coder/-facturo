import React, { useState } from "react";
import { Download, Pencil, Lock, AlertTriangle, FolderKanban } from "lucide-react";
import { T, fmt } from "../lib/theme";
import { ligneMontant, totals } from "../lib/helpers";
import { Badge, Btn, Select, Timeline } from "./ui";

export function DocPreview({ doc, client, onDownload, onEdit, lockedNote, editNote, extraInfo, projets, onLinkProjet }) {
  const t = totals(doc.lignes, doc.remiseGlobale || 0);
  const [linking, setLinking] = useState(false);
  const [choix, setChoix] = useState(doc.projetId || "");
  const projetActuel = projets?.find((p) => p.id === doc.projetId);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
        <div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: T.inkSoft }}>{doc.id}</div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 17, marginTop: 2 }}>{client?.societe || client?.nom}</div>
          <div style={{ fontSize: 12.5, color: T.inkSoft }}>{client?.nom} · {client?.email}</div>
        </div>
        <Badge statut={doc.statut} />
      </div>

      {projets && onLinkProjet && (
        <div style={{ border: `1px solid ${T.line}`, borderRadius: 8, padding: "10px 12px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <FolderKanban size={15} color={T.inkSoft} style={{ flexShrink: 0 }} />
          {!linking ? (
            <>
              <span style={{ fontSize: 12.5, color: T.inkSoft, flex: 1 }}>
                Projet : <b style={{ color: T.ink }}>{projetActuel ? projetActuel.nom : "Non rattaché"}</b>
              </span>
              <Btn variant="ghost" small onClick={() => setLinking(true)}>{projetActuel ? "Changer" : "Rattacher à un projet"}</Btn>
            </>
          ) : (
            <>
              <Select wrapperStyle={{ flex: 1, minWidth: 160 }} value={choix} onChange={(e) => setChoix(e.target.value)}>
                <option value="">— Aucun projet —</option>
                {projets.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
              </Select>
              <Btn variant="gold" small onClick={async () => { await onLinkProjet(choix || null); setLinking(false); }}>Valider</Btn>
              <Btn variant="ghost" small onClick={() => { setChoix(doc.projetId || ""); setLinking(false); }}>Annuler</Btn>
            </>
          )}
        </div>
      )}

      {extraInfo}

      <div style={{ border: `1px solid ${T.line}`, borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: T.bg }}>
              {["Désignation", "Qté", "Remise", "Total"].map((h) => (
                <th key={h} style={{ textAlign: h === "Désignation" ? "left" : "right", fontSize: 10.5, textTransform: "uppercase", color: T.inkSoft, padding: "8px 12px" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {doc.lignes.map((l) => (
              <React.Fragment key={l.id}>
                <tr>
                  <td style={{ padding: "9px 12px", fontSize: 12.5, borderTop: `1px solid ${T.line}` }}>{l.nom}</td>
                  <td style={{ padding: "9px 12px", fontSize: 12.5, textAlign: "right", borderTop: `1px solid ${T.line}`, fontFamily: "'IBM Plex Mono', monospace" }}>{l.qty}</td>
                  <td style={{ padding: "9px 12px", fontSize: 12.5, textAlign: "right", borderTop: `1px solid ${T.line}`, fontFamily: "'IBM Plex Mono', monospace" }}>{l.remise}%</td>
                  <td style={{ padding: "9px 12px", fontSize: 12.5, textAlign: "right", borderTop: `1px solid ${T.line}`, fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(ligneMontant(l))}</td>
                </tr>
                {l.description && (
                  <tr>
                    <td colSpan={4} style={{ padding: "2px 12px 8px 12px", fontSize: 11.5, color: T.inkSoft, fontStyle: "italic" }}>{l.description}</td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: T.inkSoft, marginBottom: 4 }}>
          <span>Sous-total HT</span><span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(t.htBrut || t.ht)}</span>
        </div>
        {doc.remiseGlobale > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: T.brick, marginBottom: 4 }}>
            <span>Remise globale ({doc.remiseGlobale}%)</span>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>-{fmt((t.htBrut || t.ht) * (Number(doc.remiseGlobale) / 100))}</span>
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: T.inkSoft, marginBottom: 4 }}>
          <span>TVA (18%)</span><span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(t.tva)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 600, marginTop: 6 }}>
          <span>Total TTC</span><span style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.gold }}>{fmt(t.ttc)}</span>
        </div>
      </div>

      {lockedNote && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: T.brickSoft, color: T.brick, borderRadius: 8, padding: "10px 12px", fontSize: 12.5, marginBottom: 16 }}>
          <Lock size={14} style={{ marginTop: 1, flexShrink: 0 }} />{lockedNote}
        </div>
      )}
      {editNote && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: T.goldSoft, color: T.gold, borderRadius: 8, padding: "10px 12px", fontSize: 12.5, marginBottom: 16 }}>
          <AlertTriangle size={14} style={{ marginTop: 1, flexShrink: 0 }} />{editNote}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 22 }}>
        <Btn variant="gold" icon={Download} onClick={onDownload}>Télécharger le PDF</Btn>
        {onEdit && <Btn variant="ghost" icon={Pencil} onClick={onEdit}>Modifier</Btn>}
      </div>

      {doc.historique && (
        <div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13.5, marginBottom: 10 }}>Historique &amp; traçabilité</div>
          <Timeline items={doc.historique.slice().reverse().map((h) => ({ title: h.action, date: h.date, detail: h.detail }))} />
        </div>
      )}
    </div>
  );
}
