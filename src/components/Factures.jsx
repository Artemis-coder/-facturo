import React, { useState } from "react";
import { Plus, Printer } from "lucide-react";
import { T, fmt, inputStyle } from "../lib/theme";
import { td } from "../lib/tableStyles";
import { totals } from "../lib/helpers";
import { TableShell, Btn, Modal, Badge, Field, Select } from "./ui";
import { DocBuilder } from "./DocBuilder";

export function Factures({ factures, clients, produits, createFacture, enregistrerPaiement, notify, onPrint, canManage = true }) {
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState("Tous");
  const [paying, setPaying] = useState(null);
  const cli = (id) => clients.find((c) => c.id === id);
  const statuts = ["Tous", "Brouillon", "Envoyée", "Payée", "Partiellement payée", "En retard", "Annulée"];
  const list = factures.filter((f) => filter === "Tous" || f.statut === filter);

  const save = async (data) => {
    await createFacture(data);
    notify("Facture créée");
    setCreating(false);
  };

  const payer = async (montant, mode) => {
    await enregistrerPaiement(paying, montant, mode);
    notify("Paiement enregistré");
    setPaying(null);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {statuts.map((s) => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: "6px 14px", borderRadius: 20, fontSize: 12, cursor: "pointer",
            border: `1px solid ${filter === s ? T.ink : T.line}`, background: filter === s ? T.ink : "#fff",
            color: filter === s ? "#fff" : T.inkSoft,
          }}>{s}</button>
        ))}
      </div>
      <TableShell headers={["N°", "Client", "Échéance", "Montant TTC", "Statut", ""]} onSearch={() => {}} searchPlaceholder="Rechercher…"
        action={canManage && <Btn icon={Plus} onClick={() => setCreating(true)}>Nouvelle facture</Btn>}>
        {list.map((f) => (
          <tr key={f.uuid}>
            <td style={{ ...td, fontFamily: "'IBM Plex Mono', monospace" }}>{f.id}</td>
            <td style={td}>{cli(f.clientId)?.societe}</td>
            <td style={{ ...td, fontFamily: "'IBM Plex Mono', monospace" }}>{f.echeance}</td>
            <td style={{ ...td, fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(totals(f.lignes).ttc)}</td>
            <td style={td}><Badge statut={f.statut} /></td>
            <td style={{ ...td, textAlign: "right", display: "flex", gap: 6, justifyContent: "flex-end" }}>
              {canManage && f.statut !== "Payée" && f.statut !== "Annulée" && (
                <Btn variant="ghost" small onClick={() => setPaying(f)}>Enregistrer paiement</Btn>
              )}
              <Btn variant="ghost" small icon={Printer} onClick={() => onPrint(f, "facture", cli(f.clientId))}>PDF</Btn>
            </td>
          </tr>
        ))}
      </TableShell>
      {creating && (
        <Modal title="Nouvelle facture" onClose={() => setCreating(false)} wide>
          <DocBuilder clients={clients} produits={produits} onSave={save} docType="facture" />
        </Modal>
      )}
      {paying && (
        <Modal title={`Paiement — ${paying.id}`} onClose={() => setPaying(null)}>
          <PaiementForm facture={paying} onSave={payer} />
        </Modal>
      )}
    </div>
  );
}

function PaiementForm({ facture, onSave }) {
  const t = totals(facture.lignes).ttc;
  const resteA = t - (facture.regle || 0);
  const [montant, setMontant] = useState(resteA);
  const [mode, setMode] = useState("Virement");
  return (
    <div>
      <div style={{ fontSize: 13, color: T.inkSoft, marginBottom: 14 }}>Reste à payer : <b style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.ink }}>{fmt(resteA)}</b></div>
      <Field label="Montant reçu (FCFA)"><input type="number" style={inputStyle} value={montant} onChange={(e) => setMontant(e.target.value)} /></Field>
      <Field label="Mode de paiement">
        <Select value={mode} onChange={(e) => setMode(e.target.value)}>
          {["Virement", "Espèces", "Chèque", "Carte bancaire"].map((m) => <option key={m}>{m}</option>)}
        </Select>
      </Field>
      <Btn variant="gold" onClick={() => onSave(montant, mode)}>Confirmer le paiement</Btn>
    </div>
  );
}
