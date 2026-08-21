import React, { useState } from "react";
import { UserPlus, X, Copy, MessageCircle, Check, Clock, Mail, RefreshCw, AlertTriangle, Users as UsersIcon, UserCheck, Trash2, Shield, ShieldOff, Lock, Unlock, UserX } from "lucide-react";
import { T, inputStyle } from "../lib/theme";
import { td } from "../lib/tableStyles";
import { Card, Field, Btn, Select, Modal, KpiBar, Badge } from "./ui";
import { SITE_URL } from "../lib/siteUrl";

const ROLE_LABELS = {
  super_admin: "Super Admin",
  administrateur: "Administrateur",
  comptable: "Comptable",
  commercial: "Commercial",
  employe: "Employé",
  prestataire: "Prestataire",
};
// 'prestataire' n'est pas invitable depuis cette page : son compte est créé
// depuis la page Prestataires (fiche → « Inviter (connexion) »).
const ROLES = Object.keys(ROLE_LABELS).filter((r) => r !== "super_admin" && r !== "prestataire");

const APP_URL = SITE_URL;

function buildMessage(entrepriseNom, email, role) {
  return (
    `Bonjour ! Vous êtes invité(e) à rejoindre "${entrepriseNom}" sur Ma Bouate, ` +
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

function formatDateTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("fr-FR", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function Users({
  profiles,
  invitations,
  invitationsAcceptees,
  changeRole,
  invite,
  resendInviteEmail,
  cancelInvitation,
  notify,
  currentUserId,
  entreprise,
  prestataires,
  softDeleteUser,
  softDeletePrestataire
}) {
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("employe");
  const [justInvited, setJustInvited] = useState(null); // { email, role, emailError }
  const [sharing, setSharing] = useState(null); // invitation existante dont on montre le message
  const [deletingUser, setDeletingUser] = useState(null);
  const [deletingPrestataire, setDeletingPrestataire] = useState(null);

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

  // Préparer la liste combinée : users + prestataires
  const userList = profiles.map(p => ({
    ...p,
    type: 'user',
    displayRole: p.role,
    isCurrentUser: p.id === currentUserId,
    canChangeRole: p.role !== "super_admin" && p.role !== "prestataire" && !p.isCurrentUser,
    canDelete: p.role !== "super_admin" && !p.isCurrentUser,
    hasAccount: true,
  }));

  const prestataireList = (prestataires || []).map(p => ({
    ...p,
    type: 'prestataire',
    displayRole: 'prestataire',
    isCurrentUser: false,
    canChangeRole: false,
    canDelete: true,
    hasAccount: !!p.userId,
  }));

  const allMembers = [...userList, ...prestataireList].sort((a, b) => {
    // Trier : super_admin en premier, puis par nom
    if (a.displayRole === 'super_admin') return -1;
    if (b.displayRole === 'super_admin') return 1;
    return (a.nom_complet || a.email || '').localeCompare(b.nom_complet || b.email || '');
  });

  const totalUsers = profiles.length;
  const totalPrestataires = (prestataires || []).length;
  const totalWithAccount = allMembers.filter(m => m.hasAccount).length;

  return (
    <div>
      <KpiBar items={[
        { label: "Utilisateurs", value: `${totalUsers}`, sub: "Comptes de l'entreprise", tone: T.ink, icon: UsersIcon },
        { label: "Prestataires", value: `${totalPrestataires}`, sub: "Partenaires enregistrés", tone: T.gold, icon: UserCheck },
        { label: "Comptes actifs", value: `${totalWithAccount}`, sub: "Avec accès à la plateforme", tone: T.teal, icon: UserCheck },
      ]} />

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px", borderBottom: `1px solid ${T.line}`, flexWrap: "wrap", gap: 10 }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 14.5 }}>
            Membres de l'équipe
          </div>
          <Btn icon={UserPlus} small onClick={() => setInviting(true)}>Inviter un membre</Btn>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
                <tr style={{ background: T.bg }}>
                  <th style={{ ...td, textAlign: 'left', fontWeight: 600, color: T.inkSoft, fontSize: 11.5, padding: '10px 12px' }}>Membre</th>
                  <th style={{ ...td, textAlign: 'left', fontWeight: 600, color: T.inkSoft, fontSize: 11.5, padding: '10px 12px' }}>Email</th>
                  <th style={{ ...td, textAlign: 'left', fontWeight: 600, color: T.inkSoft, fontSize: 11.5, padding: '10px 12px', width: '180px' }}>Rôle / Type</th>
                  <th style={{ ...td, textAlign: 'left', fontWeight: 600, color: T.inkSoft, fontSize: 11.5, padding: '10px 12px', width: '120px' }}>Compte</th>
                  <th style={{ ...td, textAlign: 'right', fontWeight: 600, color: T.inkSoft, fontSize: 11.5, padding: '10px 12px', width: '200px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {allMembers.map((m) => (
                  <tr key={m.id}>
                    <td style={{ ...td, fontWeight: 600 }}>
                      {m.nom_complet || m.email}
                      {m.isCurrentUser && <span style={{ marginLeft: 6, fontSize: 11, color: T.teal, fontWeight: 600 }}> (vous)</span>}
                    </td>
                    <td style={td}>{m.email || '—'}</td>
                    <td style={td}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 12.5,
                        color: m.deleted_at ? T.brick : (m.displayRole === 'prestataire' ? T.gold : T.ink),
                        fontWeight: m.deleted_at ? 400 : 600
                      }}>
                        {m.type === 'prestataire' && <Badge statut="Prestataire" />}
                        {m.displayRole === 'super_admin' && <Badge statut="Super Admin" />}
                        {ROLE_LABELS[m.displayRole] || m.displayRole}
                      </span>
                    </td>
                    <td style={td}>
                      {m.hasAccount ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: T.teal, fontWeight: 600 }}>
                          <UserCheck size={13} /> Actif
                        </span>
                      ) : (
                        <span style={{ fontSize: 11.5, color: T.inkSoft }}>—</span>
                      )}
                    </td>
                    <td style={{ ...td, textAlign: "right", display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      {m.type === 'user' && m.canChangeRole && (
                        <Select
                          value={m.role}
                          onChange={(e) => changeRole(m.id, e.target.value)}
                          style={{ minWidth: 140 }}
                        >
                          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                        </Select>
                      )}
                      {m.type === 'prestataire' && m.hasAccount && (
                        <Btn variant="ghost" small icon={Lock} onClick={() => setDeletingPrestataire(m)} title="Restreindre l'accès">
                          Restreindre
                        </Btn>
                      )}
                      {m.canDelete && (
                        <Btn variant="danger" small icon={UserX} onClick={() => m.type === 'user' ? setDeletingUser(m) : setDeletingPrestataire(m)} title="Supprimer">
                          Supprimer
                        </Btn>
                      )}
                    </td>
                  </tr>
                ))}
                {allMembers.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ ...td, textAlign: 'center', color: T.inkSoft, padding: 24 }}>
                      Aucun membre dans l'équipe
                    </td>
                  </tr>
                )}
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

      {/* Modal confirmation suppression utilisateur */}
      {deletingUser && (
        <Modal title="Supprimer ce membre ?" onClose={() => setDeletingUser(null)} size="sm">
          <p style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.7, marginBottom: 20 }}>
            Voulez-vous vraiment supprimer <strong>{deletingUser.nom_complet || deletingUser.email}</strong> ?
            Ses données seront conservées en base pour une éventuelle restauration, mais il perdra immédiatement l'accès à la plateforme.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Btn variant="danger" onClick={async () => {
              try {
                await softDeleteUser(deletingUser.id);
                notify("Membre supprimé", "Ses données sont conservées pour restauration", "success");
              } catch (err) {
                notify("Erreur", err.message, "error");
              }
              setDeletingUser(null);
            }}>Confirmer la suppression</Btn>
            <Btn variant="ghost" onClick={() => setDeletingUser(null)}>Annuler</Btn>
          </div>
        </Modal>
      )}

      {/* Modal confirmation suppression/restriction prestataire */}
      {deletingPrestataire && (
        <Modal title={deletingPrestataire.hasAccount ? "Restreindre l'accès ?" : "Supprimer ce prestataire ?"} onClose={() => setDeletingPrestataire(null)} size="sm">
          <p style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.7, marginBottom: 20 }}>
            {deletingPrestataire.hasAccount ? (
              <>
                Voulez-vous <strong>restreindre l'accès</strong> à <strong>{deletingPrestataire.nom}</strong> ?
                Son compte sera désactivé (suppression douce) et ses données conservées pour restauration.
                Il ne pourra plus se connecter à la plateforme.
              </>
            ) : (
              <>
                Voulez-vous vraiment <strong>supprimer</strong> <strong>{deletingPrestataire.nom}</strong> ?
                Ses données seront conservées en base pour une éventuelle restauration.
              </>
            )}
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Btn variant="danger" onClick={async () => {
              try {
                await softDeletePrestataire(deletingPrestataire.id);
                notify(deletingPrestataire.hasAccount ? "Accès restreint" : "Prestataire supprimé", "Données conservées pour restauration", "success");
              } catch (err) {
                notify("Erreur", err.message, "error");
              }
              setDeletingPrestataire(null);
            }}>{deletingPrestataire.hasAccount ? "Confirmer la restriction" : "Confirmer la suppression"}</Btn>
            <Btn variant="ghost" onClick={() => setDeletingPrestataire(null)}>Annuler</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
