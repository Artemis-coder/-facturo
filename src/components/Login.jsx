import React, { useState } from "react";
import { Mail, Lock, ArrowRight, Building2, User, CheckCircle2, Download } from "lucide-react";
import { T, inputStyle } from "../lib/theme";
import { useInstallPrompt } from "../lib/useInstallPrompt";
import { Card, Field, Btn } from "./ui";

export function Login({ onSignIn, onSignUp }) {
  const { canInstall, promptInstall } = useInstallPrompt();
  const [mode, setMode] = useState("connexion");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [entrepriseNom, setEntrepriseNom] = useState("");
  const [nomComplet, setNomComplet] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [createdAccount, setCreatedAccount] = useState(null); // { email, nomComplet } once signup succeeds

  const submit = async () => {
    setError("");
    setBusy(true);
    if (mode === "connexion") {
      const { error } = await onSignIn(email, password);
      setBusy(false);
      if (error) setError(error.message || "Une erreur est survenue.");
    } else {
      const { error } = await onSignUp(email, password, entrepriseNom, nomComplet);
      setBusy(false);
      if (error) { setError(error.message || "Une erreur est survenue."); return; }
      setCreatedAccount({ email, nomComplet });
    }
  };

  if (createdAccount) {
    return (
      <div style={{ minHeight: "100vh", background: T.ink, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'IBM Plex Sans', sans-serif" }}>
        <div style={{ width: 380, maxWidth: "92vw" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginBottom: 30, justifyContent: "center" }}>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, color: "#fff", fontWeight: 600 }}>Facturo</span>
            <span style={{ width: 6, height: 6, background: T.gold, display: "inline-block", marginLeft: 3 }} />
          </div>
          <Card style={{ padding: 28, textAlign: "center" }}>
            <div style={{ width: 52, height: 52, borderRadius: 26, background: T.tealSoft, color: T.teal, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
              <CheckCircle2 size={26} />
            </div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, marginBottom: 10 }}>Compte créé avec succès</div>
            <p style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.7, marginBottom: 18 }}>
              Bienvenue{createdAccount.nomComplet ? `, ${createdAccount.nomComplet}` : ""} ! Un e-mail de confirmation vient d'être
              envoyé à <b style={{ color: T.ink }}>{createdAccount.email}</b>. Ouvrez-le et cliquez sur le lien pour activer votre compte.
            </p>
            <div style={{ background: T.bg, borderRadius: 8, padding: "12px 14px", textAlign: "left", fontSize: 12.5, color: T.inkSoft, lineHeight: 1.7, marginBottom: 20 }}>
              <div><b style={{ color: T.ink }}>Adresse de connexion :</b> {createdAccount.email}</div>
              <div><b style={{ color: T.ink }}>Mot de passe :</b> celui que vous venez de choisir</div>
            </div>
            <Btn variant="gold" fullWidth onClick={() => { setCreatedAccount(null); setMode("connexion"); setPassword(""); }}>
              Aller à la connexion
            </Btn>
          </Card>
        </div>
      </div>
    );
  }

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
                <div style={{ fontSize: 11, color: "#8891A3", marginTop: 5, lineHeight: 1.5 }}>
                  Déjà invité(e) par une entreprise ? Ignorez ce champ — utilisez simplement
                  l'adresse e-mail exacte reçue dans l'invitation, vous la rejoindrez automatiquement.
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
        {canInstall && (
          <div onClick={promptInstall} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 18, color: "#B9BFCF", fontSize: 12.5, cursor: "pointer" }}>
            <Download size={13} /> Installer Facturo sur cet appareil
          </div>
        )}
      </div>
    </div>
  );
}
