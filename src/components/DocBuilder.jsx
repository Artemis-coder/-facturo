import React, { useState } from "react";
import { Plus, Trash2, Send } from "lucide-react";
import { T, fmt, inputStyle } from "../lib/theme";
import { mkLine, ligneMontant, totals } from "../lib/helpers";
import { Field, Select, Btn } from "./ui";

export function DocBuilder({ clients, produits, projets = [], onSave, docType, initial }) {
  const [clientId, setClientId] = useState(initial?.clientId || clients[0]?.id || "");
  const [projetId, setProjetId] = useState(initial?.projetId || "");
  const [lignes, setLignes] = useState(initial?.lignes ? initial.lignes.map((l) => ({ ...l })) : []);
  const t = totals(lignes);

  const addLigne = () => { if (produits[0]) setLignes([...lignes, mkLine(produits[0])]); };
  const updateLigne = (id, patch) => setLignes(lignes.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const removeLigne = (id) => setLignes(lignes.filter((l) => l.id !== id));

  return (
    <div>
      <Field label="Client">
        <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.societe} — {c.nom}</option>)}
        </Select>
      </Field>

      <Field label="Projet associé (optionnel)">
        <Select value={projetId} onChange={(e) => setProjetId(e.target.value)}>
          <option value="">— Aucun projet —</option>
          {projets.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
        </Select>
      </Field>

      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, margin: "16px 0 8px" }}>Lignes</div>
      {lignes.map((l) => (
        <div key={l.id} style={{ border: `1px solid ${T.line}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <Select wrapperStyle={{ flex: 1 }} value={l.produitId} onChange={(e) => {
              const p = produits.find((p) => p.id === e.target.value);
              updateLigne(l.id, { produitId: p.id, nom: p.nom, prixHT: p.prixHT, tva: p.tva });
            }}>
              {produits.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
            </Select>
            <button onClick={() => removeLigne(l.id)} style={{ background: "none", border: "none", cursor: "pointer", color: T.brick, flexShrink: 0, display: "flex" }}><Trash2 size={15} /></button>
          </div>

          <textarea
            placeholder="Description (optionnelle) — précise ce que comprend la prestation, non chiffrée séparément"
            value={l.description || ""}
            onChange={(e) => updateLigne(l.id, { description: e.target.value })}
            style={{ ...inputStyle, height: "auto", minHeight: 44, padding: "8px 10px", fontSize: 12.5, marginBottom: 10, resize: "vertical" }}
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.3fr", gap: 8, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 10.5, color: T.inkSoft, marginBottom: 3 }}>Quantité</div>
              <input type="number" style={inputStyle} value={l.qty} min={1} onChange={(e) => updateLigne(l.id, { qty: Number(e.target.value) })} />
            </div>
            <div>
              <div style={{ fontSize: 10.5, color: T.inkSoft, marginBottom: 3 }}>Remise %</div>
              <input type="number" style={inputStyle} value={l.remise} min={0} max={100} onChange={(e) => updateLigne(l.id, { remise: Number(e.target.value) })} />
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10.5, color: T.inkSoft, marginBottom: 3 }}>Sous-total</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, paddingTop: 8 }}>{fmt(ligneMontant(l))}</div>
            </div>
          </div>
        </div>
      ))}
      <Btn variant="ghost" small icon={Plus} onClick={addLigne}>Ajouter une ligne</Btn>

      <div style={{ marginTop: 18, borderTop: `1px solid ${T.line}`, paddingTop: 14 }}>
        {[["Total HT", t.ht], ["TVA", t.tva]].map(([l, v]) => (
          <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: T.inkSoft, marginBottom: 4 }}>
            <span>{l}</span><span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(v)}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 600, marginTop: 6 }}>
          <span>Total TTC</span><span style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.gold }}>{fmt(t.ttc)}</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 20 }}>
        <Btn variant="gold" onClick={() => onSave({ clientId, projetId: projetId || null, lignes, statut: "Brouillon" })}>Enregistrer en brouillon</Btn>
        <Btn variant="primary" icon={Send} onClick={() => onSave({ clientId, projetId: projetId || null, lignes, statut: docType === "devis" ? "Envoyé" : "Envoyée" })}>Enregistrer et envoyer</Btn>
      </div>
    </div>
  );
}
