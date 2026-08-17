import React, { useState } from "react";
import { Plus, Printer, Trash2, CheckCircle2, Receipt, Clock, AlertTriangle, DollarSign, MessageCircle } from "lucide-react";
import { T, fmt, inputStyle } from "../lib/theme";
import { td } from "../lib/tableStyles";
import { totals, montantEncaisseTotal } from "../lib/helpers";
import { TableShell, Btn, Modal, Badge, Field, Select, EmptyState, Timeline, KpiBar } from "./ui";
import { DocBuilder } from "./DocBuilder";
import { DocPreview } from "./DocPreview";
import { ReminderComposer } from "./ReminderComposer";

export function Factures({ factures, clients, produits, projets, paiements = [], entreprise, createFacture, enregistrerPaiement, marquerProjetTermine, lierProjet, deleteFacture, notify, onPrint, canManage = true, canDelete = false }) {
  const [creating, setCreating] = useState(false);
  const [previewing, setPreviewing] = useState(null);
  const [filter, setFilter] = useState("Tous");
  const [projetsTerminesUniquement, setProjetsTerminesUniquement] = useState(false);
  const [paying, setPaying] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [reminding, setReminding] = useState(null);
  const cli = (id) => clients.find((c) => c.id === id);
  const proj = (id) => projets?.find((p) => p.id === id);
  const statuts = ["Tous", "Brouillon", "Envoyée", "Payée", "Partiellement payée", "En retard", "Annulée"];
  const list = factures
    .filter((f) => filter === "Tous" || f.statut === filter)
    .filter((f) => !projetsTerminesUniquement || f.projetTermine);

  const totalFacturesCount = factures.length;
  const payeesCount = factures.filter((f) => f.statut === "Payée").length;
  const impayeesCount = factures.filter((f) => ["Envoyée", "Partiellement payée"].includes(f.statut)).length;
  const enRetardCount = factures.filter((f) => f.statut === "En retard").length;
  const canRemind = (facture) => ["Envoyée", "Partiellement payée", "En retard"].includes(facture.statut);
  const totalEncaisse = montantEncaisseTotal(factures);

  const kpiItems = [
    { label: "Total Factures", value: `${totalFacturesCount}`, sub: "Toutes factures émises", tone: T.ink, icon: Receipt, onClick: () => setFilter("Tous") },
    { label: "Factures Payées", value: `${payeesCount}`, sub: "Règlements intégralement perçus", tone: T.teal, icon: CheckCircle2, onClick: () => setFilter("Payée") },
    { label: "En Attente / Partiel", value: `${impayeesCount}`, sub: "Règlements en cours", tone: T.gold, icon: Clock, onClick: () => setFilter("Envoyée") },
    { label: "Factures en Retard", value: `${enRetardCount}`, sub: "Échéances dépassées", tone: T.brick, icon: AlertTriangle, onClick: () => setFilter("En retard") },
    { label: "Total Encaissé", value: fmt(totalEncaisse), sub: "Règlements cumulés perçus", tone: T.teal, icon: DollarSign },
  ];

  const save = async (data) => {
    await createFacture(data);
    notify("Facture créée");
    setCreating(false);
  };

  const payer = async (montant, mode, date) => {
    await enregistrerPaiement(paying, montant, mode, date);
    notify("Paiement enregistré");
    setPaying(null);
  };

  const marquerTermine = async (facture) => {
    const { error } = await marquerProjetTermine(facture);
    notify(error ? "Échec : " + error.message : "Projet marqué comme terminé");
    setPreviewing(null);
  };

  const confirmerSuppression = async () => {
    const { error } = await deleteFacture(deleting);
    notify(error ? "Suppression refusée : " + error.message : "Facture supprimée");
    setDeleting(null);
  };

  return (
    <div>
      <KpiBar items={kpiItems} />
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {statuts.map((s) => (
            <button key={s} onClick={() => setFilter(s)} style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 12, cursor: "pointer",
              border: `1px solid ${filter === s ? T.ink : T.line}`, background: filter === s ? T.ink : "#fff",
              color: filter === s ? "#fff" : T.inkSoft,
            }}>{s}</button>
          ))}
        </div>
        <button onClick={() => setProjetsTerminesUniquement(!projetsTerminesUniquement)} style={{
          display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 20, fontSize: 12, cursor: "pointer",
          border: `1px solid ${projetsTerminesUniquement ? T.teal : T.line}`,
          background: projetsTerminesUniquement ? T.tealSoft : "#fff",
          color: projetsTerminesUniquement ? T.teal : T.inkSoft,
        }}>
          <CheckCircle2 size={13} /> Projets terminés uniquement
        </button>
      </div>
      <TableShell headers={["N°", "Client", "Projet", "Échéance", "Montant TTC", "Statut", ""]} onSearch={() => {}} searchPlaceholder="Rechercher…"
        action={canManage && <Btn icon={Plus} onClick={() => setCreating(true)}>Nouvelle facture</Btn>}>
        {list.length === 0 && (
          <tr><td colSpan={7}><EmptyState icon={Receipt} title="Aucune facture" subtitle="Vos factures apparaîtront ici." /></td></tr>
        )}
        {list.map((f) => (
          <tr key={f.uuid}>
            <td style={{ ...td, fontFamily: "'IBM Plex Mono', monospace" }}>
              <a style={{ color: T.ink, cursor: "pointer", fontWeight: 600 }} onClick={() => setPreviewing(f)}>{f.id}</a>
            </td>
            <td style={td}>{cli(f.clientId)?.societe}</td>
            <td style={{ ...td, color: proj(f.projetId) ? T.ink : T.inkSoft }}>{proj(f.projetId)?.nom || "—"}</td>
            <td style={{ ...td, fontFamily: "'IBM Plex Mono', monospace" }}>{f.echeance}</td>
            <td style={{ ...td, fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(totals(f.lignes, f.remiseGlobale).ttc)}</td>
            <td style={td}>
              <Badge statut={f.statut} />
              {f.projetTermine && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, marginLeft: 6, fontSize: 11, color: T.teal }}>
                  <CheckCircle2 size={12} /> Terminé
                </span>
              )}
            </td>
            <td style={{ ...td, textAlign: "right", display: "flex", gap: 6, justifyContent: "flex-end" }}>
              <Btn variant="ghost" small onClick={() => setPreviewing(f)}>Aperçu</Btn>
              {canManage && f.statut !== "Payée" && f.statut !== "Annulée" && (
                <Btn variant="ghost" small onClick={() => setPaying(f)}>Enregistrer paiement</Btn>
              )}
              {canManage && canRemind(f) && (
                <Btn variant="ghost" small icon={MessageCircle} onClick={() => setReminding(f)}>Relancer</Btn>
              )}
              {canManage && f.statut === "Payée" && !f.projetTermine && (
                <Btn variant="ghost" small icon={CheckCircle2} onClick={() => marquerTermine(f)}>Marquer terminé</Btn>
              )}
              <Btn variant="ghost" small icon={Printer} onClick={() => onPrint(f, "facture", cli(f.clientId))}>PDF</Btn>
              {canDelete && (
                <Btn variant="danger" small icon={Trash2} onClick={() => setDeleting(f)}>Supprimer</Btn>
              )}
            </td>
          </tr>
        ))}
      </TableShell>

      {previewing && (
        <Modal title={`Facture — ${previewing.id}`} onClose={() => setPreviewing(null)} wide>
          <DocPreview doc={previewing} client={cli(previewing.clientId)}
            onDownload={() => onPrint(previewing, "facture", cli(previewing.clientId))}
            extraInfo={
              <div>
                <div style={{ display: "flex", gap: 20, fontSize: 12.5, color: T.inkSoft, marginBottom: previewing.projetTermine ? 10 : 16, flexWrap: "wrap" }}>
                  <div>Échéance : <b style={{ color: T.ink, fontFamily: "'IBM Plex Mono', monospace" }}>{previewing.echeance}</b></div>
                  <div>Réglé : <b style={{ color: T.teal, fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(previewing.regle || 0)}</b></div>
                  <div>Reste à payer : <b style={{ color: T.brick, fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(totals(previewing.lignes).ttc - (previewing.regle || 0))}</b></div>
                </div>
                {previewing.projetTermine && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.tealSoft, color: T.teal, borderRadius: 8, padding: "9px 12px", fontSize: 12.5, marginBottom: 16 }}>
                    <CheckCircle2 size={14} /> Facture marquée comme terminée le {previewing.termineLe}
                  </div>
                )}
                {paiements.filter((p) => p.factureId === previewing.uuid).length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13.5, marginBottom: 10 }}>Historique des paiements</div>
                    <Timeline items={paiements.filter((p) => p.factureId === previewing.uuid)
                      .slice().sort((a, b) => (a.date < b.date ? 1 : -1))
                      .map((p) => ({ title: fmt(p.montant), date: p.date, detail: p.mode }))} />
                  </div>
                )}
              </div>
            }
            projets={canManage ? projets : null}
            onLinkProjet={canManage ? async (projetId) => {
              const { error } = await lierProjet(previewing, projetId);
              notify(error ? "Échec : " + error.message : "Projet mis à jour");
              setPreviewing((p) => (p ? { ...p, projetId } : p));
            } : null}
          />
          {canManage && previewing.statut !== "Payée" && previewing.statut !== "Annulée" && (
            <div style={{ marginTop: -8, marginBottom: 4, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Btn variant="primary" onClick={() => { setPaying(previewing); setPreviewing(null); }}>Enregistrer un paiement</Btn>
              {canRemind(previewing) && <Btn variant="ghost" icon={MessageCircle} onClick={() => { setReminding(previewing); setPreviewing(null); }}>Préparer une relance</Btn>}
            </div>
          )}
          {canManage && previewing.statut === "Payée" && !previewing.projetTermine && (
            <div style={{ marginTop: -8, marginBottom: 4 }}>
              <Btn variant="primary" icon={CheckCircle2} onClick={() => marquerTermine(previewing)}>Marquer cette facture comme terminée</Btn>
            </div>
          )}
        </Modal>
      )}

      {creating && (
        <Modal title="Nouvelle facture" onClose={() => setCreating(false)} extraWide>
          <DocBuilder clients={clients} produits={produits} projets={projets} entreprise={entreprise} onSave={save} docType="facture" onClose={() => setCreating(false)} />
        </Modal>
      )}
      {paying && (
        <Modal title={`Paiement — ${paying.id}`} onClose={() => setPaying(null)}>
          <PaiementForm facture={paying} onSave={payer} />
        </Modal>
      )}
      {reminding && (
        <Modal title={`Relancer — ${reminding.id}`} onClose={() => setReminding(null)}>
          <ReminderComposer doc={reminding} client={cli(reminding.clientId)} entreprise={entreprise} type="facture" notify={notify} />
        </Modal>
      )}
      {deleting && (
        <Modal title={`Supprimer ${deleting.id} ?`} onClose={() => setDeleting(null)}>
          <p style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.7, marginBottom: 20 }}>
            Cette action est <b>définitive</b> et supprimera aussi ses lignes, ses détails de
            prestation et son historique de paiement. Le client <b>{cli(deleting.clientId)?.societe}</b> ne
            verra plus cette facture.
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="danger" onClick={confirmerSuppression}>Oui, supprimer définitivement</Btn>
            <Btn variant="ghost" onClick={() => setDeleting(null)}>Annuler</Btn>
          </div>
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
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  return (
    <div>
      <div style={{ fontSize: 13, color: T.inkSoft, marginBottom: 14 }}>Reste à payer : <b style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.ink }}>{fmt(resteA)}</b></div>
      <Field label="Montant reçu (FCFA)"><input type="number" style={inputStyle} value={montant} onChange={(e) => setMontant(e.target.value)} /></Field>
      <Field label="Date d'encaissement"><input type="date" style={inputStyle} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
      <Field label="Mode de paiement">
        <Select value={mode} onChange={(e) => setMode(e.target.value)}>
          {["Espèces", "Virement", "Mobile Money", "Chèque", "Carte bancaire"].map((m) => <option key={m}>{m}</option>)}
        </Select>
      </Field>
      <Btn variant="gold" onClick={() => onSave(montant, mode, date)}>Confirmer le paiement</Btn>
    </div>
  );
}
