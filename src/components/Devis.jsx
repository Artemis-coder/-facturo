import React, { useState, useEffect } from "react";
import { Plus, ArrowRight, Download, FileText, Edit3, Clock, CheckCircle2, DollarSign, MessageCircle } from "lucide-react";
import { T, fmt } from "../lib/theme";
import { td } from "../lib/tableStyles";
import { totals, LOCKED_STATUTS } from "../lib/helpers";
import { TableShell, Btn, Modal, Badge, EmptyState, KpiBar } from "./ui";
import { DocBuilder } from "./DocBuilder";
import { DocPreview } from "./DocPreview";
import { ReminderComposer } from "./ReminderComposer";

export function Devis({ devis, clients, produits, projets, entreprise, createDevis, updateDevis, marquerTransforme, creerDepuisDevis, lierProjet, notify, onPrint, canCreate = true, createRequest, onCreateHandled }) {
  const [builder, setBuilder] = useState(null); // null closed, {} new, {...doc} editing
  const [previewing, setPreviewing] = useState(null);
  const [filter, setFilter] = useState("Tous");
  const [reminding, setReminding] = useState(null);
  const [openedFromCreate, setOpenedFromCreate] = useState(0);
  useEffect(() => {
    if (createRequest?.kind === "devis" && canCreate && createRequest.ts > openedFromCreate) {
      setOpenedFromCreate(createRequest.ts);
      setBuilder({});
      onCreateHandled?.();
    }
  }, [createRequest, canCreate]);
  const cli = (id) => clients.find((c) => c.id === id);
  const proj = (id) => projets?.find((p) => p.id === id);
  const statuts = ["Tous", "Brouillon", "Envoyé", "Accepté", "Refusé", "Expiré"];
  const list = devis.filter((d) => filter === "Tous" || d.statut === filter);
  const canEditDoc = (d) => !LOCKED_STATUTS.includes(d.statut);

  const totalDevisCount = devis.length;
  const brouillonsCount = devis.filter((d) => d.statut === "Brouillon").length;
  const enAttenteCount = devis.filter((d) => d.statut === "Envoyé").length;
  const acceptesCount = devis.filter((d) => d.statut === "Accepté").length;
  const totalEstimeTTC = devis.reduce((s, d) => s + totals(d.lignes, d.remiseGlobale).ttc, 0);

  const kpiItems = [
    { label: "Total Devis", value: `${totalDevisCount}`, sub: "Tous statuts confondus", tone: T.ink, icon: FileText, onClick: () => setFilter("Tous") },
    { label: "Brouillons", value: `${brouillonsCount}`, sub: "En cours de préparation", tone: T.slate, icon: Edit3, onClick: () => setFilter("Brouillon") },
    { label: "Devis Envoyés", value: `${enAttenteCount}`, sub: "En attente de signature", tone: T.gold, icon: Clock, onClick: () => setFilter("Envoyé") },
    { label: "Devis Acceptés", value: `${acceptesCount}`, sub: "Validés par les clients", tone: T.teal, icon: CheckCircle2, onClick: () => setFilter("Accepté") },
    { label: "Volume Déclaré TTC", value: fmt(totalEstimeTTC), sub: "Total devisé cumulé", tone: T.slate, icon: DollarSign },
  ];

  const save = async (data) => {
    if (builder?.uuid) {
      await updateDevis(builder, data);
      notify("Devis mis à jour");
    } else {
      await createDevis(data);
      notify("Devis créé");
    }
    setBuilder(null);
    setPreviewing(null);
  };

  const transformer = async (d) => {
    const numero = await creerDepuisDevis(d);
    await marquerTransforme(d, numero);
    notify("Devis transformé en facture");
    setPreviewing(null);
  };

  return (
    <div>
      <KpiBar items={kpiItems} />
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {statuts.map((s) => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: "6px 14px", borderRadius: 20, fontSize: 12, cursor: "pointer",
            border: `1px solid ${filter === s ? T.ink : T.line}`, background: filter === s ? T.ink : "#fff",
            color: filter === s ? "#fff" : T.inkSoft,
          }}>{s}</button>
        ))}
      </div>
      <TableShell headers={["N°", "Client", "Projet", "Date", "Montant TTC", "Statut", ""]} onSearch={() => {}} searchPlaceholder="Rechercher…"
        action={canCreate && <Btn icon={Plus} onClick={() => setBuilder({})}>Nouveau devis</Btn>}>
        {list.length === 0 && (
          <tr><td colSpan={7}><EmptyState icon={FileText} title="Aucun devis" subtitle="Créez votre premier devis pour démarrer." /></td></tr>
        )}
        {list.map((d) => (
          <tr key={d.uuid}>
            <td style={{ ...td, fontFamily: "'IBM Plex Mono', monospace" }}>
              <a style={{ color: T.ink, cursor: "pointer", fontWeight: 600 }} onClick={() => setPreviewing(d)}>{d.id}</a>
            </td>
            <td style={td}>{cli(d.clientId)?.societe}</td>
            <td style={{ ...td, color: proj(d.projetId) ? T.ink : T.inkSoft }}>{proj(d.projetId)?.nom || "—"}</td>
            <td style={{ ...td, fontFamily: "'IBM Plex Mono', monospace" }}>{d.date}</td>
            <td style={{ ...td, fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(totals(d.lignes, d.remiseGlobale).ttc)}</td>
            <td style={td}><Badge statut={d.statut} /></td>
            <td style={{ ...td, textAlign: "right", display: "flex", gap: 6, justifyContent: "flex-end" }}>
              <Btn variant="ghost" small onClick={() => setPreviewing(d)}>Aperçu</Btn>
              {canCreate && d.statut === "Envoyé" && <Btn variant="ghost" small icon={MessageCircle} onClick={() => setReminding(d)}>Relancer</Btn>}
              {canCreate && d.statut !== "Brouillon" && <Btn variant="ghost" small icon={ArrowRight} onClick={() => transformer(d)}>Facturer</Btn>}
              <Btn variant="ghost" small icon={Download} onClick={() => onPrint(d, "devis", cli(d.clientId))}>PDF</Btn>
            </td>
          </tr>
        ))}
      </TableShell>

      {previewing && (
        <Modal title={`Aperçu — ${previewing.id}`} onClose={() => setPreviewing(null)} wide>
          <DocPreview doc={previewing} client={cli(previewing.clientId)}
            onDownload={() => onPrint(previewing, "devis", cli(previewing.clientId))}
            onEdit={canCreate && canEditDoc(previewing) ? () => { setBuilder(previewing); setPreviewing(null); } : null}
            lockedNote={!canEditDoc(previewing) ? "Ce devis est verrouillé : son statut ne permet plus de modification." : null}
            editNote={previewing.statut === "Envoyé" ? "Une modification à ce stade sera enregistrée dans l'historique de traçabilité." : null}
            projets={canCreate ? projets : null}
            onLinkProjet={canCreate ? async (projetId) => {
              const { error } = await lierProjet(previewing, projetId);
              notify(error ? "Échec : " + error.message : "Projet mis à jour");
              setPreviewing((p) => (p ? { ...p, projetId } : p));
            } : null}
          />
          {canCreate && previewing.statut === "Envoyé" && (
            <div style={{ marginTop: 16 }}>
              <Btn variant="ghost" icon={MessageCircle} onClick={() => { setReminding(previewing); setPreviewing(null); }}>Préparer une relance</Btn>
            </div>
          )}
        </Modal>
      )}

      {reminding && (
        <Modal title={`Relancer — ${reminding.id}`} onClose={() => setReminding(null)}>
          <ReminderComposer doc={reminding} client={cli(reminding.clientId)} entreprise={entreprise} type="devis" notify={notify} />
        </Modal>
      )}

      {builder && (
        <Modal title={builder.uuid ? `Modifier — ${builder.id}` : "Nouveau devis"} onClose={() => setBuilder(null)} extraWide>
          <DocBuilder clients={clients} produits={produits} projets={projets} entreprise={entreprise} onSave={save} docType="devis" initial={builder.uuid ? builder : null} onClose={() => setBuilder(null)} />
        </Modal>
      )}
    </div>
  );
}
