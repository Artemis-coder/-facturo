import React, { useState, useEffect } from "react";
import { T, inputStyle } from "../lib/theme";
import { Card, Field, Btn } from "./ui";

export function Parametres({ entreprise, onSaveParametres, notify, canEdit = true }) {
  const [form, setForm] = useState(entreprise);
  useEffect(() => { setForm(entreprise); }, [entreprise]);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const toggle = (k) => canEdit && setForm({ ...form, [k]: !form[k] });

  if (!form) return null;

  return (
    <Card style={{ padding: 24, maxWidth: 560 }}>
      <fieldset disabled={!canEdit} style={{ border: "none", padding: 0, margin: 0 }}>
        <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="TVA par défaut (%)"><input type="number" style={inputStyle} value={form.tvaDefaut} onChange={set("tvaDefaut")} /></Field>
          <Field label="Préfixe factures"><input style={inputStyle} value={form.prefixeFacture} onChange={set("prefixeFacture")} /></Field>
          <Field label="Préfixe devis"><input style={inputStyle} value={form.prefixeDevis} onChange={set("prefixeDevis")} /></Field>
          <Field label="Prochain numéro"><input type="number" style={inputStyle} value={form.prochainNumero} onChange={set("prochainNumero")} /></Field>
        </div>
      </fieldset>
      {[
        ["notifPaiement", "Notification à la réception d'un paiement"],
        ["notifEcheance", "Rappel avant échéance de facture"],
        ["relanceAuto", "Relances automatiques par e-mail"],
      ].map(([k, label]) => (
        <div key={k} onClick={() => toggle(k)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${T.line}`, cursor: canEdit ? "pointer" : "default", opacity: canEdit ? 1 : 0.6 }}>
          <div style={{ width: 34, height: 18, borderRadius: 10, background: form[k] ? T.teal : T.line, position: "relative", transition: "background .15s" }}>
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: form[k] ? 18 : 2, transition: "left .15s" }} />
          </div>
          <span style={{ fontSize: 13 }}>{label}</span>
        </div>
      ))}
      <div style={{ marginTop: 18 }}>
        {canEdit ? (
          <Btn variant="gold" onClick={async () => { await onSaveParametres(form); notify("Paramètres enregistrés"); }}>Enregistrer</Btn>
        ) : (
          <p style={{ fontSize: 12, color: T.inkSoft }}>Seul un Administrateur peut modifier ces paramètres.</p>
        )}
      </div>

      <div style={{ marginTop: 28, paddingTop: 20, borderTop: `1px solid ${T.line}` }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13.5, marginBottom: 6 }}>Données & sécurité</div>
        <p style={{ fontSize: 12, color: T.inkSoft, lineHeight: 1.6 }}>
          Toutes les données (clients, produits, devis, factures) sont stockées dans votre base Supabase dédiée,
          chiffrées au repos et en transit. L'accès est cloisonné par entreprise et par rôle via des règles de
          sécurité appliquées directement en base de données.
        </p>
      </div>
    </Card>
  );
}
