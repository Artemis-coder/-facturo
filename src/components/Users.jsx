import React, { useState } from "react";
import { UserPlus, X, Copy, MessageCircle, Check, Clock } from "lucide-react";
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
    `Bonjour ! Vous êtes invité(e) à rejoindre "${entrepriseNom}" sur Facturo, ` +
    `avec le rôle ${ROLE_LABELS[role]}.\n\n` +
    `Pour rejoindre l'équipe :\n` +
    `1. Allez sur ${APP_URL}\n` +
    `2. Cliquez sur "Inscription"\n` +
    `3. Créez votre compte avec CETTE adresse e-mail précise : ${email}\n\n` +
    `Vous rejoindrez automatiquement l'entreprise avec le bon rôle, sans rien configurer.`
  );
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR");
}

export function Users({ profiles, invitations, changeRole, invite, cancelInvitation, notify, currentUserId, entreprise }) {
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("employe");
  const [justInvited, setJustInvited] = useState(null); // { email, role } — pour afficher le message juste après création
  const [sharing, setSharing] = useState(null); // invitation existante dont on montre le message

  const sendInvite = async () => {
    if (!email.trim()) { notify("Renseignez une adresse e-mail"); return; }
    const { error } = await invite(email.trim(), role);
    if (error) {
      notify(error.code === "23505" ? "Cette adresse a déjà une invitation en attente" : "Erreur : " + error.message);
      return;
    }
    setInviting(false);
    setJustInvited({ email: email.trim(), role });
    setEmail(""); setRole("employe");
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
            Facturo n'envoie pas encore d'e-mail automatique — à l'étape suivante, vous pourrez copier
            un message prêt à envoyer (WhatsApp, SMS ou e-mail) avec les instructions pour rejoindre l'équipe.
          </p>
          <Btn variant="gold" onClick={sendInvite}>Créer l'invitation</Btn>
        </Modal>
      )}

      {/* Étape 2 : message prêt à partager, juste après la création de l'invitation */}
      {justInvited && (
        <Modal title="Invitation créée" onClose={() => setJustInvited(null)}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.tealSoft, color: T.teal, borderRadius: 8, padding: "9px 12px", fontSize: 12.5, marginBottom: 16 }}>
            <Check size={14} /> Il ne reste plus qu'à transmettre ce message à {justInvited.email}
          </div>
          <textarea readOnly value={buildMessage(entreprise?.nom || "votre entreprise", justInvited.email, justInvited.role)}
            style={{ ...inputStyle, height: "auto", minHeight: 160, padding: "10px 12px", fontSize: 12.5, lineHeight: 1.6, marginBottom: 14 }} />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Btn variant="gold" icon={Copy} onClick={() => copier(buildMessage(entreprise?.nom || "votre entreprise", justInvited.email, justInvited.role))}>Copier le message</Btn>
            <a href={`https://wa.me/?text=${encodeURIComponent(buildMessage(entreprise?.nom || "votre entreprise", justInvited.email, justInvited.role))}`}
              target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
              <Btn variant="ghost" icon={MessageCircle}>Envoyer via WhatsApp</Btn>
            </a>
          </div>
        </Modal>
      )}

      {/* Renvoyer le message d'une invitation déjà existante */}
      {sharing && (
        <Modal title={`Message pour ${sharing.email}`} onClose={() => setSharing(null)}>
          <textarea readOnly value={buildMessage(entreprise?.nom || "votre entreprise", sharing.email, sharing.role)}
            style={{ ...inputStyle, height: "auto", minHeight: 160, padding: "10px 12px", fontSize: 12.5, lineHeight: 1.6, marginBottom: 14 }} />
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
