import React, { useState, useEffect } from "react";
import { T, inputStyle } from "../lib/theme";
import { Card, Field, Btn, Select } from "./ui";

export function Entreprise({ entreprise, onSaveProfil, notify, canEdit = true }) {
  const [form, setForm] = useState(entreprise);
  const [error, setError] = useState("");
  useEffect(() => { setForm(entreprise); }, [entreprise]);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  if (!form) return null;

  const save = async () => {
    setError("");
    const { error } = await onSaveProfil(form);
    if (error) setError("Échec de l'enregistrement : " + error.message);
    else notify("Profil entreprise enregistré");
  };

  return (
    <Card style={{ padding: 24, maxWidth: 640 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 22 }}>
        <div style={{ width: 64, height: 64, background: T.goldSoft, border: `1px solid ${T.line}`, borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", color: T.gold, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 22 }}>
          {form.nom?.[0] || "F"}
        </div>
        {canEdit && <Btn variant="ghost" small>Changer le logo</Btn>}
      </div>
      <fieldset disabled={!canEdit} style={{ border: "none", padding: 0, margin: 0 }}>
        <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Nom de l'entreprise"><input style={inputStyle} value={form.nom} onChange={set("nom")} /></Field>
          <Field label="Téléphone"><input style={inputStyle} value={form.tel} onChange={set("tel")} /></Field>
          <Field label="RCCM"><input style={inputStyle} value={form.rccm} onChange={set("rccm")} /></Field>
          <Field label="NIF"><input style={inputStyle} value={form.nif} onChange={set("nif")} /></Field>
          <Field label="Devise">
            <Select value={form.devise} onChange={set("devise")}>
              {["FCFA (XOF)", "EUR", "USD"].map((d) => <option key={d}>{d}</option>)}
            </Select>
          </Field>
          <Field label="Langue">
            <Select value={form.langue} onChange={set("langue")}>
              {["Français", "English"].map((d) => <option key={d}>{d}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Adresse"><input style={inputStyle} value={form.adresse} onChange={set("adresse")} /></Field>
        <Field label="Conditions générales"><textarea style={{ ...inputStyle, height: "auto", minHeight: 80, padding: "10px 12px" }} value={form.conditions} onChange={set("conditions")} /></Field>
      </fieldset>
      {error && (
        <div style={{ background: T.brickSoft, color: T.brick, fontSize: 12.5, borderRadius: 8, padding: "9px 12px", marginBottom: 14 }}>{error}</div>
      )}
      {canEdit ? (
        <Btn variant="gold" onClick={save}>Enregistrer</Btn>
      ) : (
        <p style={{ fontSize: 12, color: T.inkSoft }}>Seul un Administrateur peut modifier les informations de l'entreprise.</p>
      )}
    </Card>
  );
}
