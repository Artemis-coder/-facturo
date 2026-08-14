import React, { useState } from "react";
import { UserPlus, X, Copy, MessageCircle, Check, Clock, Mail, RefreshCw, AlertTriangle } from "lucide-react";
import { T, inputStyle } from "../lib/theme";
import { td } from "../lib/tableStyles";
import { Card, Field, Btn, Select, Modal } from "./ui";

const ROLE_LABELS = {
  super_admin: "Super Admin",
  administrateur: "Administrateur",
  comptable: "Comptable",
  commercial: "Commercial",
  employe: "Employé",
};
const ROLES = Object.keys(ROLE_LABELS).filter((r) => r !== "super_admin");

const APP_URL = typeof window !== "undefined" ? window.location.origin : "https://facturo.app";

function buildMessage(entrepriseNom, email, role) {
  return (
    `Bonjour ! Vous êtes invité(e) à rejoindre "${entrepriseNom}" sur Ma Boîte, ` +
    `avec le rôle ${ROLE_LABELS[role]}.\n\n` +
    `Un e-mail avec un lien de connexion vient de vous être envoyé à ${email} — ` +
    `il vous suffit de cliquer dessus pour rejoindre l'équipe automatiquement.\n\n` +
    `Si vous ne le recevez pas, allez sur ${APP_URL} et inscrivez-vous avec CETTE adresse e-mail précise : ${email}.`
  );
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR");
}

export function Users({ profiles, invitations, changeRole, invite, resendInviteEmail, cancelInvitation, notify, currentUserId, entreprise }) {
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("employe");
  const [justInvited, setJustInvited] = useState(null); // { email, role, emailError }
  const [sharing, setSharing] = useState(null); // invitation existante dont on montre le message

  const sendInvite = async () => {
    if (!email.trim()) { notify("Renseignez une adresse e-mail"); return; }
    const { error, emailError } = await invite(email.trim(), role);
    if (error) {
      notify(error.code === "23505" ? "Cette adresse a déjà une invitation en attente" : "Erreur : " + error.message);
      return;
    }
    setInviting(false);
    setJustInvited({ email: email.trim(), role, emailError });
    setEmail(""); setRole("employe");
  };

  const renvoyer = async (inv) => {
    const { error } = await resendInviteEmail(inv.email);
    notify(error ? "Échec de l'envoi : " + error.message : `E-mail renvoyé à ${inv.email}`);
  };

  const copier = async (texte) => {
    try {
      await navigator.clipboard.writeText(texte);
      notify("Message copié — collez-le dans WhatsApp, SMS ou e-mail");
    } catch {
      notify("Impossible de copier automatiquement — sélectionnez le texte manuellement");
    }
  };

  return (
    <div>
      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px", borderBottom: `1px solid ${T.line}` }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14.5 }}>Membres de l'équipe</div>
          <Btn icon={UserPlus} small onClick={() => setInviting(true)}>Inviter</Btn>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.id}>
                <td style={{ ...td, fontWeight: 600 }}>{p.nom_complet || p.email}</td>
                <td style={td}>{p.email}</td>
                <td style={{ ...td, width: 200 }}>
                  {p.role === "super_admin" || p.id === currentUserId ? (
                    <span style={{ fontSize: 12.5, color: T.inkSoft }}>{ROLE_LABELS[p.role]}{p.id === currentUserId ? " (vous)" : ""}</span>
                  ) : (
                    <Select value={p.role} onChange={(e) => changeRole(p.id, e.target.value)}>
                      {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                    </Select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {invitations.length > 0 && (
        <Card style={{ marginTop: 16 }}>
          <div style={{ padding: "14px 18px", borderBottom: `1px solid ${T.line}`, fontFamily: "'Space Grotesk', sans-serif", fontSize: 14 }}>Invitations en attente</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {invitations.map((inv) => (
                <tr key={inv.id}>
                  <td style={td}>{inv.email}</td>
                  <td style={td}>{ROLE_LABELS[inv.role]}</td>
                  <td style={{ ...td, color: T.inkSoft, fontSize: 11.5 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Clock size={12} /> Envoyée le {formatDate(inv.created_at)}
                    </span>
                  </td>
                  <td style={{ ...td, textAlign: "right", display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <Btn variant="ghost" small icon={RefreshCw} onClick={() => renvoyer(inv)}>Renvoyer l'e-mail</Btn>
                    <Btn variant="ghost" small icon={Copy} onClick={() => setSharing(inv)}>Message</Btn>
                    <Btn variant="danger" small icon={X} onClick={() => cancelInvitation(inv.id)}>Annuler</Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {inviting && (
        <Modal title="Inviter un membre" onClose={() => setInviting(false)}>
          <Field label="Adresse e-mail"><input style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="collegue@entreprise.ci" /></Field>
          <Field label="Rôle">
            <Select value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </Select>
          </Field>
          <p style={{ fontSize: 12, color: T.inkSoft, lineHeight: 1.6, marginBottom: 16 }}>
            Un e-mail avec un lien de connexion sera envoyé automatiquement à cette adresse —
            un clic suffit pour rejoindre l'équipe, sans mot de passe à créer.
          </p>
          <Btn variant="gold" icon={Mail} onClick={sendInvite}>Envoyer l'invitation par e-mail</Btn>
        </Modal>
      )}

      {/* Confirmation juste après la création de l'invitation */}
      {justInvited && (
        <Modal title="Invitation envoyée" onClose={() => setJustInvited(null)}>
          {justInvited.emailError ? (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: T.brickSoft, color: T.brick, borderRadius: 8, padding: "10px 12px", fontSize: 12.5, marginBottom: 16 }}>
              <AlertTriangle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
              L'e-mail n'a pas pu être envoyé automatiquement ({justInvited.emailError.message}). L'invitation est bien créée —
              utilisez "Renvoyer l'e-mail" plus tard, ou partagez le message ci-dessous manuellement.
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.tealSoft, color: T.teal, borderRadius: 8, padding: "9px 12px", fontSize: 12.5, marginBottom: 16 }}>
              <Check size={14} /> E-mail envoyé automatiquement à {justInvited.email} — un lien de connexion l'attend dans sa boîte de réception.
            </div>
          )}
          <p style={{ fontSize: 11.5, color: T.inkSoft, marginBottom: 8 }}>En secours, vous pouvez aussi partager ce message vous-même :</p>
          <textarea readOnly value={buildMessage(entreprise?.nom || "votre entreprise", justInvited.email, justInvited.role)}
            style={{ ...inputStyle, height: "auto", minHeight: 140, padding: "10px 12px", fontSize: 12, lineHeight: 1.6, marginBottom: 14 }} />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Btn variant="ghost" icon={Copy} onClick={() => copier(buildMessage(entreprise?.nom || "votre entreprise", justInvited.email, justInvited.role))}>Copier le message</Btn>
            <a href={`https://wa.me/?text=${encodeURIComponent(buildMessage(entreprise?.nom || "votre entreprise", justInvited.email, justInvited.role))}`}
              target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
              <Btn variant="ghost" icon={MessageCircle}>Envoyer via WhatsApp</Btn>
            </a>
          </div>
        </Modal>
      )}

      {/* Partager le message d'une invitation déjà existante */}
      {sharing && (
        <Modal title={`Message pour ${sharing.email}`} onClose={() => setSharing(null)}>
          <textarea readOnly value={buildMessage(entreprise?.nom || "votre entreprise", sharing.email, sharing.role)}
            style={{ ...inputStyle, height: "auto", minHeight: 140, padding: "10px 12px", fontSize: 12, lineHeight: 1.6, marginBottom: 14 }} />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Btn variant="gold" icon={Copy} onClick={() => copier(buildMessage(entreprise?.nom || "votre entreprise", sharing.email, sharing.role))}>Copier le message</Btn>
            <a href={`https://wa.me/?text=${encodeURIComponent(buildMessage(entreprise?.nom || "votre entreprise", sharing.email, sharing.role))}`}
              target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
              <Btn variant="ghost" icon={MessageCircle}>Envoyer via WhatsApp</Btn>
            </a>
          </div>
        </Modal>
      )}
    </div>
  );
}
