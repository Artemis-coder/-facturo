import React, { useState } from "react";
import { UserPlus, X } from "lucide-react";
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

export function Users({ profiles, invitations, changeRole, invite, cancelInvitation, notify, currentUserId }) {
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("employe");

  const sendInvite = async () => {
    const { error } = await invite(email, role);
    if (error) { notify("Erreur : " + error.message); return; }
    notify("Invitation créée — communiquez à la personne de s'inscrire avec cet e-mail");
    setEmail(""); setRole("employe"); setInviting(false);
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
                  <td style={{ ...td, textAlign: "right" }}>
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
            La personne doit ensuite créer son compte sur Facturo avec exactement cette adresse e-mail —
            elle rejoindra automatiquement votre entreprise avec le rôle choisi.
          </p>
          <Btn variant="gold" onClick={sendInvite}>Créer l'invitation</Btn>
        </Modal>
      )}
    </div>
  );
}
