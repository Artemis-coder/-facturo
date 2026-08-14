import React, { useState } from "react";
import { 
  Mail, Lock, ArrowRight, Building2, User, CheckCircle2, Download, 
  Eye, EyeOff, ShieldCheck, Zap, Smartphone, Sparkles, Check
} from "lucide-react";
import { T, inputStyle } from "../lib/theme";
import { useInstallPrompt } from "../lib/useInstallPrompt";
import { Card, Field, Btn } from "./ui";
import { supabase } from "../lib/supabaseClient";

export function Login({ onSignIn, onSignUp }) {
  const { canInstall, promptInstall } = useInstallPrompt();
  const [mode, setMode] = useState("connexion"); // 'connexion' | 'inscription' | 'reset'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [entrepriseNom, setEntrepriseNom] = useState("");
  const [nomComplet, setNomComplet] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [createdAccount, setCreatedAccount] = useState(null);

  const submit = async (e) => {
    if (e) e.preventDefault();
    setError("");
    setSuccessMsg("");
    setBusy(true);

    try {
      if (mode === "connexion") {
        const { error } = await onSignIn(email, password);
        setBusy(false);
        if (error) setError(error.message || "Identifiants incorrects ou compte introuvable.");
      } else if (mode === "inscription") {
        if (!email || !password) {
          setError("Veuillez remplir l'adresse e-mail et le mot de passe.");
          setBusy(false);
          return;
        }
        const { error } = await onSignUp(email, password, entrepriseNom, nomComplet);
        setBusy(false);
        if (error) { setError(error.message || "Une erreur est survenue lors de l'inscription."); return; }
        setCreatedAccount({ email, nomComplet });
      } else if (mode === "reset") {
        if (!email) {
          setError("Veuillez saisir votre adresse e-mail.");
          setBusy(false);
          return;
        }
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        setBusy(false);
        if (error) {
          setError(error.message || "Impossible d'envoyer l'e-mail de réinitialisation.");
        } else {
          setSuccessMsg("Un lien de réinitialisation vous a été envoyé par e-mail.");
        }
      }
    } catch (err) {
      setBusy(false);
      setError("Une erreur inattendue est survenue.");
    }
  };

  if (createdAccount) {
    return (
      <div style={{
        minHeight: "100vh",
        background: `radial-gradient(circle at 50% 30%, #1E2942 0%, ${T.ink} 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'IBM Plex Sans', sans-serif",
        padding: 20
      }}>
        <div style={{ width: 440, maxWidth: "100%" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 28, justifyContent: "center" }}>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, color: "#fff", fontWeight: 700, letterSpacing: "-0.5px" }}>Facturo</span>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: T.gold, display: "inline-block", boxShadow: `0 0 12px ${T.gold}` }} />
          </div>
          <Card style={{
            padding: 36,
            textAlign: "center",
            background: "rgba(255, 255, 255, 0.98)",
            boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
            borderRadius: 16
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: T.tealSoft, color: T.teal,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px", boxShadow: "0 4px 14px rgba(31, 122, 99, 0.2)"
            }}>
              <CheckCircle2 size={34} />
            </div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: T.ink, marginBottom: 12 }}>
              Compte créé avec succès !
            </div>
            <p style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 1.7, marginBottom: 20 }}>
              Bienvenue{createdAccount.nomComplet ? `, ${createdAccount.nomComplet}` : ""} ! Un e-mail de confirmation vient d'être
              envoyé à <b style={{ color: T.ink }}>{createdAccount.email}</b>. Ouvrez-le et cliquez sur le lien pour activer votre espace.
            </p>
            <div style={{
              background: T.bg,
              border: `1px solid ${T.line}`,
              borderRadius: 10,
              padding: "14px 16px",
              textAlign: "left",
              fontSize: 13,
              color: T.inkSoft,
              lineHeight: 1.7,
              marginBottom: 24
            }}>
              <div><b style={{ color: T.ink }}>Identifiant :</b> {createdAccount.email}</div>
              <div><b style={{ color: T.ink }}>Entreprise :</b> {entrepriseNom || "Votre entreprise"}</div>
            </div>
            <Btn variant="gold" fullWidth style={{ padding: "12px 20px", fontSize: 14, fontWeight: 600 }} onClick={() => { setCreatedAccount(null); setMode("connexion"); setPassword(""); }}>
              Accéder à la connexion
            </Btn>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: T.ink,
      display: "flex",
      fontFamily: "'IBM Plex Sans', sans-serif",
      color: "#fff",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Background ambient glow effect */}
      <div style={{
        position: "absolute",
        top: "-15%",
        left: "-10%",
        width: "50vw",
        height: "50vw",
        borderRadius: "50%",
        background: `radial-gradient(circle, ${T.gold}1A 0%, transparent 70%)`,
        pointerEvents: "none",
        filter: "blur(60px)"
      }} />
      <div style={{
        position: "absolute",
        bottom: "-15%",
        right: "-10%",
        width: "50vw",
        height: "50vw",
        borderRadius: "50%",
        background: `radial-gradient(circle, ${T.teal}1A 0%, transparent 70%)`,
        pointerEvents: "none",
        filter: "blur(60px)"
      }} />

      {/* Main container grid */}
      <div style={{
        display: "flex",
        width: "100%",
        minHeight: "100vh",
        zIndex: 1
      }}>
        
        {/* LEFT PANEL: Branding & Showcase (Desktop) */}
        <div className="login-hero-panel" style={{
          flex: 1.2,
          padding: "60px 80px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          borderRight: "1px solid rgba(255, 255, 255, 0.08)",
          background: "linear-gradient(135deg, rgba(22, 33, 58, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)",
          position: "relative",
          boxSizing: "border-box"
        }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: `linear-gradient(135deg, ${T.gold} 0%, #D49D43 100%)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 4px 14px ${T.gold}44`, fontWeight: 700, fontSize: 20, color: "#fff"
            }}>
              F
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, color: "#fff", fontWeight: 700 }}>Facturo</span>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.gold }} />
            </div>
          </div>

          {/* Hero Content */}
          <div style={{ margin: "40px 0" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "rgba(201, 138, 43, 0.15)", border: `1px solid ${T.gold}44`,
              color: T.gold, padding: "6px 14px", borderRadius: 20, fontSize: 12.5, fontWeight: 600,
              marginBottom: 20
            }}>
              <Sparkles size={14} /> Solution de facturation & gestion commerciale
            </div>
            <h1 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 40,
              fontWeight: 700,
              lineHeight: 1.25,
              color: "#fff",
              marginBottom: 20
            }}>
              Gérez vos devis & factures en toute simplicité.
            </h1>
            <p style={{ fontSize: 16, color: "#B9BFCF", lineHeight: 1.7, maxWidth: 500, marginBottom: 36 }}>
              Facturo accompagne les entreprises et indépendants avec une plateforme moderne, rapide, conforme et utilisable hors ligne.
            </p>

            {/* Feature checklist */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {[
                { icon: Zap, text: "Génération instantanée de devis & factures en FCFA" },
                { icon: Smartphone, text: "Application PWA installable & mode hors-ligne intégré" },
                { icon: ShieldCheck, text: "Gestion multi-rôles & sécurisation de vos encaissements" }
              ].map((feat, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: T.gold, flexShrink: 0
                  }}>
                    <feat.icon size={16} />
                  </div>
                  <span style={{ fontSize: 14, color: "#E2E8F0", fontWeight: 500 }}>{feat.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom badge / footer */}
          <div style={{
            padding: "16px 20px",
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            gap: 12
          }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: T.teal, boxShadow: `0 0 8px ${T.teal}` }} />
            <span style={{ fontSize: 12.5, color: "#94A3B8" }}>
              Utilisé par des centaines de professionnels en Côte d'Ivoire & UEMOA
            </span>
          </div>
        </div>

        {/* RIGHT PANEL: Auth Card Form */}
        <div style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
          boxSizing: "border-box"
        }}>
          <div style={{ width: 420, maxWidth: "100%" }}>
            
            {/* Mobile Header Logo */}
            <div className="login-mobile-logo" style={{ display: "none", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 28 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 8,
                background: T.gold, display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: 18, color: "#fff"
              }}>
                F
              </div>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, color: "#fff", fontWeight: 700 }}>Facturo</span>
            </div>

            <Card style={{
              padding: 32,
              borderRadius: 16,
              background: "#FFFFFF",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
              border: "1px solid rgba(255, 255, 255, 0.2)"
            }}>
              {/* Tab Selector */}
              {mode !== "reset" ? (
                <div style={{
                  display: "flex",
                  marginBottom: 26,
                  background: T.bg,
                  padding: 4,
                  borderRadius: 10,
                  border: `1px solid ${T.line}`
                }}>
                  {[
                    { key: "connexion", label: "Connexion" },
                    { key: "inscription", label: "Créer un compte" }
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => { setMode(tab.key); setError(""); setSuccessMsg(""); }}
                      style={{
                        flex: 1,
                        padding: "9px 0",
                        background: mode === tab.key ? "#fff" : "transparent",
                        border: "none",
                        borderRadius: 7,
                        cursor: "pointer",
                        color: mode === tab.key ? T.ink : T.inkSoft,
                        fontWeight: mode === tab.key ? 700 : 500,
                        fontSize: 13.5,
                        boxShadow: mode === tab.key ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
                        transition: "all 0.2s ease"
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ marginBottom: 24, textAlign: "center" }}>
                  <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, margin: "0 0 6px", color: T.ink }}>
                    Réinitialiser le mot de passe
                  </h3>
                  <p style={{ fontSize: 13, color: T.inkSoft, margin: 0 }}>
                    Saisissez votre e-mail pour recevoir le lien de réinitialisation.
                  </p>
                </div>
              )}

              <form onSubmit={submit}>
                {mode === "inscription" && (
                  <>
                    <Field label="Nom de l'entreprise">
                      <div style={{ position: "relative" }}>
                        <Building2 size={15} style={{ position: "absolute", left: 12, top: 12, color: T.inkSoft }} />
                        <input
                          style={{ ...inputStyle, paddingLeft: 36 }}
                          placeholder="Ex. Akwaba Commerce"
                          value={entrepriseNom}
                          onChange={(e) => setEntrepriseNom(e.target.value)}
                        />
                      </div>
                    </Field>

                    <Field label="Votre nom complet">
                      <div style={{ position: "relative" }}>
                        <User size={15} style={{ position: "absolute", left: 12, top: 12, color: T.inkSoft }} />
                        <input
                          style={{ ...inputStyle, paddingLeft: 36 }}
                          placeholder="Ex. Kouassi Jean"
                          value={nomComplet}
                          onChange={(e) => setNomComplet(e.target.value)}
                        />
                      </div>
                    </Field>
                  </>
                )}

                <Field label="Adresse e-mail">
                  <div style={{ position: "relative" }}>
                    <Mail size={15} style={{ position: "absolute", left: 12, top: 12, color: T.inkSoft }} />
                    <input
                      style={{ ...inputStyle, paddingLeft: 36 }}
                      type="email"
                      required
                      placeholder="vous@entreprise.ci"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </Field>

                {mode !== "reset" && (
                  <Field label="Mot de passe">
                    <div style={{ position: "relative" }}>
                      <Lock size={15} style={{ position: "absolute", left: 12, top: 12, color: T.inkSoft }} />
                      <input
                        style={{ ...inputStyle, paddingLeft: 36, paddingRight: 36 }}
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: "absolute",
                          right: 10,
                          top: 10,
                          background: "none",
                          border: "none",
                          color: T.inkSoft,
                          cursor: "pointer",
                          padding: 2
                        }}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </Field>
                )}

                {mode === "connexion" && (
                  <div style={{ textAlign: "right", marginBottom: 18, marginTop: -4 }}>
                    <button
                      type="button"
                      onClick={() => { setMode("reset"); setError(""); setSuccessMsg(""); }}
                      style={{ background: "none", border: "none", fontSize: 12.5, color: T.gold, cursor: "pointer", fontWeight: 500 }}
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                )}

                {error && (
                  <div style={{
                    background: T.brickSoft,
                    color: T.brick,
                    fontSize: 13,
                    borderRadius: 8,
                    padding: "10px 14px",
                    marginBottom: 16,
                    lineHeight: 1.5,
                    border: `1px solid ${T.brick}33`
                  }}>
                    {error}
                  </div>
                )}

                {successMsg && (
                  <div style={{
                    background: T.tealSoft,
                    color: T.teal,
                    fontSize: 13,
                    borderRadius: 8,
                    padding: "10px 14px",
                    marginBottom: 16,
                    lineHeight: 1.5,
                    border: `1px solid ${T.teal}33`
                  }}>
                    {successMsg}
                  </div>
                )}

                <Btn variant="gold" fullWidth type="submit" style={{ padding: "12px", fontSize: 14, fontWeight: 600, marginTop: 6 }} disabled={busy}>
                  {busy ? "Chargement en cours…" : (
                    mode === "connexion" ? "Se connecter" : mode === "inscription" ? "Créer mon compte" : "Envoyer le lien"
                  )}
                  {!busy && <ArrowRight size={16} style={{ marginLeft: 6 }} />}
                </Btn>

                {mode === "reset" && (
                  <div style={{ textAlign: "center", marginTop: 16 }}>
                    <button
                      type="button"
                      onClick={() => { setMode("connexion"); setError(""); setSuccessMsg(""); }}
                      style={{ background: "none", border: "none", fontSize: 13, color: T.inkSoft, cursor: "pointer" }}
                    >
                      ← Retour à la connexion
                    </button>
                  </div>
                )}
              </form>
            </Card>

            {mode === "inscription" && (
              <p style={{ textAlign: "center", color: "#94A3B8", fontSize: 12, marginTop: 18, lineHeight: 1.6 }}>
                En créant un compte, vous devenez Administrateur de votre espace. Vous pourrez inviter des collaborateurs ensuite.
              </p>
            )}

            {canInstall && (
              <div
                onClick={promptInstall}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  marginTop: 22,
                  color: T.gold,
                  fontSize: 13,
                  cursor: "pointer",
                  fontWeight: 500,
                  background: "rgba(201, 138, 43, 0.1)",
                  padding: "10px 16px",
                  borderRadius: 10,
                  border: `1px solid ${T.gold}33`,
                  transition: "all 0.2s ease"
                }}
              >
                <Download size={15} /> Installer Facturo sur cet appareil
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Embedded Responsive Styles */}
      <style>{`
        @media (max-width: 900px) {
          .login-hero-panel { display: none !important; }
          .login-mobile-logo { display: flex !important; }
        }
      `}</style>
    </div>
  );
}

