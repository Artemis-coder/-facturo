import React, { useState } from "react";
import { Mail, Lock, ArrowRight, Building2, User } from "lucide-react";
import { T, inputStyle } from "../lib/theme";
import { Card, Field, Btn } from "./ui";

export function Login({ onSignIn, onSignUp }) {
  const [mode, setMode] = useState("connexion");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [entrepriseNom, setEntrepriseNom] = useState("");
  const [nomComplet, setNomComplet] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    setBusy(true);
    const { error } = mode === "connexion"
      ? await onSignIn(email, password)
      : await onSignUp(email, password, entrepriseNom, nomComplet);
    setBusy(false);
    if (error) setError(error.message || "Une erreur est survenue.");
  };

  return (
    <div style={{ minHeight: "100vh", background: T.ink, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'IBM Plex Sans', sans-serif" }}>
      <div style={{ width: 380, maxWidth: "92vw" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginBottom: 30, justifyContent: "center" }}>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, color: "#fff", fontWeight: 600 }}>Facturo</span>
          <span style={{ width: 6, height: 6, background: T.gold, display: "inline-block", marginLeft: 3 }} />
        </div>
        <Card style={{ padding: 26 }}>
          <div style={{ display: "flex", marginBottom: 20, borderBottom: `1px solid ${T.line}` }}>
            {["connexion", "inscription"].map((m) => (
              <button key={m} onClick={() => { setMode(m); setError(""); }} style={{
                flex: 1, padding: "10px 0", background: "none", border: "none", cursor: "pointer",
                borderBottom: mode === m ? `2px solid ${T.gold}` : "2px solid transparent",
                color: mode === m ? T.ink : T.inkSoft, fontWeight: 600, fontSize: 13, textTransform: "capitalize",
              }}>{m}</button>
            ))}
          </div>

          {mode === "inscription" && (
            <>
              <Field label="Nom de l'entreprise">
                <div style={{ position: "relative" }}>
                  <Building2 size={14} style={{ position: "absolute", left: 10, top: 12, color: T.inkSoft }} />
                  <input style={{ ...inputStyle, paddingLeft: 30 }} placeholder="Ex. Koné Textiles" value={entrepriseNom} onChange={(e) => setEntrepriseNom(e.target.value)} />
                </div>
              </Field>
              <Field label="Votre nom">
                <div style={{ position: "relative" }}>
                  <User size={14} style={{ position: "absolute", left: 10, top: 12, color: T.inkSoft }} />
                  <input style={{ ...inputStyle, paddingLeft: 30 }} placeholder="Ex. Aïcha Koné" value={nomComplet} onChange={(e) => setNomComplet(e.target.value)} />
                </div>
              </Field>
            </>
          )}

          <Field label="Adresse e-mail">
            <div style={{ position: "relative" }}>
              <Mail size={14} style={{ position: "absolute", left: 10, top: 12, color: T.inkSoft }} />
              <input style={{ ...inputStyle, paddingLeft: 30 }} placeholder="vous@entreprise.ci" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </Field>
          <Field label="Mot de passe">
            <div style={{ position: "relative" }}>
              <Lock size={14} style={{ position: "absolute", left: 10, top: 12, color: T.inkSoft }} />
              <input style={{ ...inputStyle, paddingLeft: 30 }} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </Field>

          {mode === "connexion" && (
            <div style={{ textAlign: "right", marginBottom: 16, marginTop: -6 }}>
              <a style={{ fontSize: 12, color: T.inkSoft, cursor: "pointer" }}>Mot de passe oublié ?</a>
            </div>
          )}

          {error && (
            <div style={{ background: "#F3DCDE", color: "#AE3B45", fontSize: 12.5, borderRadius: 8, padding: "9px 12px", marginBottom: 14 }}>
              {error}
            </div>
          )}

          <Btn variant="gold" fullWidth onClick={submit}>
            {busy ? "Un instant…" : (mode === "connexion" ? "Se connecter" : "Créer mon compte")} <ArrowRight size={14} />
          </Btn>
        </Card>
        {mode === "inscription" && (
          <p style={{ textAlign: "center", color: "#B9BFCF", fontSize: 11.5, marginTop: 18, lineHeight: 1.6 }}>
            Votre compte est créé avec le rôle Administrateur de votre nouvelle entreprise.
            Vous pourrez inviter des collègues (Comptable, Commercial, Employé…) ensuite.
          </p>
        )}
      </div>
    </div>
  );
}
