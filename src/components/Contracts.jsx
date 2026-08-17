import React, { useMemo, useState } from "react";
import { Bot, CheckCircle2, Copy, Download, FilePlus2, FileText, FolderOpen, MessageCircle, Pencil, Plus, Save, Send, ShieldCheck, Sparkles, Upload, Layers } from "lucide-react";
import { T, fmt, inputStyle } from "../lib/theme";
import { totals } from "../lib/helpers";
import { Btn, EmptyState, Field, KpiBar, Modal, Select, TableShell, Badge } from "./ui";
import { td } from "../lib/tableStyles";
import { downloadContractPdf } from "../lib/contractPdf";

const DEFAULT_TEMPLATE = `CONTRAT DE PRESTATION DE SERVICES

Entre {{entreprise.nom}}, ci-après désignée « le Prestataire », et {{client.societe}}, représentée par {{client.nom}}, ci-après désignée « le Client ».

Article 1 - Objet
Le présent contrat a pour objet la réalisation de la prestation suivante : {{service}}.

Article 2 - Prestations et livrables
Le Prestataire s'engage à fournir les prestations suivantes : {{livrables}}.

Article 3 - Durée
La mission débute le {{date_debut}} et se termine le {{date_fin}}.

Article 4 - Conditions financières
La prestation est convenue pour un montant de {{montant}}. Les modalités de règlement sont les suivantes : {{conditions_paiement}}.

Article 5 - Confidentialité
Chaque partie s'engage à préserver la confidentialité des informations reçues dans le cadre de la présente mission.

Fait le {{date_contrat}}, en deux exemplaires.`;

const tokensOf = (content) => [...new Set([...content.matchAll(/{{\s*([\w.-]+)\s*}}/g)].map((match) => match[1]))];
const frenchDate = (value) => value ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00`)) : "";

export function Contracts({ templates, contracts, clients, factures, devis, projets, entreprise, saveTemplate, uploadTemplateSource, suggestTemplateFromSource, suggestContractFields, saveContract, updateContract, updateStatus, notify }) {
  const [section, setSection] = useState("contracts");
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [building, setBuilding] = useState(null);
  const [editingContract, setEditingContract] = useState(null);
  const [viewing, setViewing] = useState(null);
  const client = (id) => clients.find((item) => item.id === id);
  const facture = (id) => factures.find((item) => item.uuid === id);
  const devisItem = (id) => devis.find((item) => item.uuid === id);
  const projet = (id) => projets.find((item) => item.id === id);

  const contratsEnCours = contracts.filter((c) => c.statut !== "Brouillon").length;
  const contratsEnvoyes = contracts.filter((c) => c.statut === "Envoyé").length;
  const contratsBrouillons = contracts.filter((c) => c.statut === "Brouillon").length;
  const contratsGenerees = contracts.length;
  const modelesUtilises = new Set(contracts.map((c) => c.templateId).filter(Boolean)).size;
  const contratsKpis = [
    { label: "Contrats en cours", value: `${contratsEnCours}`, sub: "Envoyés + signés", tone: T.teal, icon: FileText },
    { label: "Contrats envoyés", value: `${contratsEnvoyes}`, sub: "En attente de signature", tone: T.gold, icon: Send },
    { label: "Brouillons", value: `${contratsBrouillons}`, sub: "À finaliser avant envoi", tone: T.slate, icon: Pencil },
  ];
  const modelesKpis = [
    { label: "Modèles disponibles", value: `${templates.length}`, sub: "Catalogue de modèles", tone: T.ink, icon: Layers },
    { label: "Modèles utilisés", value: `${modelesUtilises} / ${templates.length}`, sub: `${contratsGenerees} contrat${contratsGenerees > 1 ? "s" : ""} généré${contratsGenerees > 1 ? "s" : ""}`, tone: T.gold, icon: Sparkles },
  ];

  const templateDisponible = (contract) => templates.some((item) => item.id === contract.templateId);

  const saveTemplateAndClose = async (form) => {
    if (!form.nom.trim() || !form.contenu.trim()) return notify("Le nom et le contenu du modèle sont requis.");
    const { error } = await saveTemplate(form);
    notify(error ? `Impossible d'enregistrer : ${error.message}` : "Modèle de contrat enregistré");
    if (!error) setEditingTemplate(null);
  };
  const saveNewContract = async (form) => {
    if (!form.clientId || !form.titre.trim() || !form.contenu.trim()) return notify("Client, titre et contenu sont requis.");
    const { error } = await saveContract(form);
    notify(error ? `Impossible d'enregistrer : ${error.message}` : "Contrat créé en brouillon");
    if (!error) setBuilding(null);
  };
  const editContract = (contract) => {
    if (contract.statut !== "Brouillon") return notify("Un contrat déjà envoyé ne peut plus être modifié.");
    setViewing(null);
    setEditingContract(contract);
  };
  const saveEditedContract = async (form) => {
    if (!editingContract || editingContract.statut !== "Brouillon") return notify("Un contrat déjà envoyé ne peut plus être modifié.");
    if (!form.clientId || !form.titre.trim() || !form.contenu.trim()) return notify("Client, titre et contenu sont requis.");
    const { error } = await updateContract(editingContract, form);
    notify(error ? `Impossible d'enregistrer : ${error.message}` : "Contrat mis à jour");
    if (!error) setEditingContract(null);
  };
  const sendContract = (contract) => {
    const recipient = client(contract.clientId)?.societe || client(contract.clientId)?.nom || "votre client";
    window.open(`https://wa.me/?text=${encodeURIComponent(`Bonjour,\n\nVeuillez trouver ci-joint le contrat « ${contract.titre} ».\n\nCordialement,\n${entreprise?.nom || "Ma Bouate"}`)}`, "_blank", "noopener,noreferrer");
    notify(`WhatsApp est ouvert pour ${recipient}. Joignez le PDF téléchargé.`);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: 21 }}>Contrats</h2>
          <p style={{ margin: "5px 0 0", color: T.inkSoft, fontSize: 13 }}>Modèles privés, contrats finalisés et suivi de signature.</p>
        </div>
        <Btn icon={section === "templates" ? Plus : FilePlus2} onClick={() => section === "templates" ? setEditingTemplate({ contenu: DEFAULT_TEMPLATE, nom: "", typeService: "", sourcePath: "" }) : setBuilding({})}>
          {section === "templates" ? "Nouveau modèle" : "Nouveau contrat"}
        </Btn>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {[{ id: "contracts", label: "Contrats", icon: FileText }, { id: "templates", label: "Modèles", icon: FolderOpen }].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setSection(id)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", cursor: "pointer", borderRadius: 8, border: `1px solid ${section === id ? T.ink : T.line}`, background: section === id ? T.ink : "#fff", color: section === id ? "#fff" : T.inkSoft, fontWeight: 600, fontSize: 12.5 }}><Icon size={14} />{label}</button>
        ))}
      </div>

      {section === "contracts" ? (
        <>
        <KpiBar items={contratsKpis} />
        <TableShell headers={["Contrat", "Client", "Service", "Créé le", "Statut", ""]} onSearch={() => {}} searchPlaceholder="Rechercher un contrat…">
          {contracts.length === 0 && <tr><td colSpan={6}><EmptyState icon={FileText} title="Aucun contrat" subtitle="Créez un contrat à partir d'un modèle enregistré." /></td></tr>}
          {contracts.map((contract) => <tr key={contract.id}>
            <td style={{ ...td, fontWeight: 600 }}>{contract.titre}</td>
            <td style={td}>{client(contract.clientId)?.societe || client(contract.clientId)?.nom || "—"}</td>
            <td style={td}>{contract.typeService || "—"}</td>
            <td style={{ ...td, fontFamily: "'IBM Plex Mono', monospace" }}>{contract.createdAt?.slice(0, 10)}</td>
            <td style={td}><Badge statut={contract.statut} /></td>
            <td style={{ ...td, textAlign: "right" }}>
              {contract.statut === "Brouillon" && <Btn variant="ghost" small icon={Pencil} onClick={() => editContract(contract)}>Modifier</Btn>}{" "}
              <Btn variant="ghost" small onClick={() => setViewing(contract)}>Ouvrir</Btn>
            </td>
          </tr>)}
        </TableShell>
        </>
      ) : (
        <>
        <KpiBar items={modelesKpis} />
        <TableShell headers={["Modèle", "Type de service", "Source", "Mis à jour", ""]} onSearch={() => {}} searchPlaceholder="Rechercher un modèle…">
          {templates.length === 0 && <tr><td colSpan={5}><EmptyState icon={FolderOpen} title="Aucun modèle" subtitle="Ajoutez votre premier modèle de contrat." /></td></tr>}
          {templates.map((template) => <tr key={template.id}>
            <td style={{ ...td, fontWeight: 600 }}>{template.nom}</td><td style={td}>{template.typeService || "Non précisé"}</td>
            <td style={td}>{template.sourcePath ? "PDF archivé" : "Éditeur interne"}</td><td style={td}>{template.updatedAt?.slice(0, 10)}</td>
            <td style={{ ...td, textAlign: "right" }}><Btn variant="ghost" small icon={Pencil} onClick={() => setEditingTemplate(template)}>Modifier</Btn></td>
          </tr>)}
        </TableShell>
        </>
      )}

      {editingTemplate && <Modal title={editingTemplate.id ? "Modifier le modèle" : "Nouveau modèle de contrat"} onClose={() => setEditingTemplate(null)} extraWide>
        <TemplateEditor initial={editingTemplate} uploadTemplateSource={uploadTemplateSource} suggestTemplateFromSource={suggestTemplateFromSource} onSave={saveTemplateAndClose} notify={notify} />
      </Modal>}
      {building && <Modal title="Nouveau contrat" onClose={() => setBuilding(null)} extraWide>
        <ContractBuilder templates={templates} clients={clients} factures={factures} devis={devis} projets={projets} entreprise={entreprise} suggestContractFields={suggestContractFields} notify={notify} onSave={saveNewContract} />
      </Modal>}
      {editingContract && (
        templateDisponible(editingContract) ? (
          <Modal title={`Modifier le brouillon — ${editingContract.titre}`} onClose={() => setEditingContract(null)} extraWide>
            <ContractBuilder templates={templates} clients={clients} factures={factures} devis={devis} projets={projets} entreprise={entreprise} suggestContractFields={suggestContractFields} notify={notify} initial={editingContract} onSave={saveEditedContract} />
          </Modal>
        ) : (
          <Modal title={`Modifier le brouillon — ${editingContract.titre}`} onClose={() => setEditingContract(null)} extraWide>
            <ContractFallbackEditor contract={editingContract} clients={clients} factures={factures} devis={devis} projets={projets} onSave={saveEditedContract} />
          </Modal>
        )
      )}
      {viewing && <Modal title={viewing.titre} onClose={() => setViewing(null)} wide>
        <ContractPreview contract={viewing} client={client(viewing.clientId)} entreprise={entreprise} onDownload={() => downloadContractPdf(viewing, client(viewing.clientId), entreprise)} onWhatsApp={() => sendContract(viewing)} onEdit={() => editContract(viewing)} onStatus={async (statut) => { const { error } = await updateStatus(viewing, statut); notify(error ? `Mise à jour impossible : ${error.message}` : `Contrat marqué comme ${statut.toLowerCase()}`); if (!error) setViewing((item) => ({ ...item, statut })); }} facture={facture(viewing.factureId)} devis={devisItem(viewing.devisId)} projet={projet(viewing.projetId)} />
      </Modal>}
    </div>
  );
}

function TemplateEditor({ initial, uploadTemplateSource, suggestTemplateFromSource, onSave, notify }) {
  const [form, setForm] = useState({ id: initial.id, nom: initial.nom || "", typeService: initial.typeService || "", contenu: initial.contenu || DEFAULT_TEMPLATE, sourcePath: initial.sourcePath || "" });
  const [importing, setImporting] = useState(false);
  const set = (key) => (event) => setForm((item) => ({ ...item, [key]: event.target.value }));
  const importPdf = async (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    setImporting(true);
    const { path, error } = await uploadTemplateSource(file);
    if (error) { notify(error.message); setImporting(false); return; }
    setForm((item) => ({ ...item, sourcePath: path }));
    const result = await suggestTemplateFromSource(path);
    if (result.error) notify("PDF archivé. La conversion IA n'est pas disponible : complétez le modèle manuellement.");
    else setForm((item) => ({ ...item, nom: result.data?.name || item.nom, typeService: result.data?.serviceType || item.typeService, contenu: result.data?.content || item.contenu }));
    setImporting(false);
  };
  return <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, .7fr) minmax(350px, 1.3fr)", gap: 22 }}>
    <div>
      <div style={{ padding: 15, border: `1px solid ${T.line}`, borderRadius: 12, background: T.bg, marginBottom: 16 }}><div style={{ display: "flex", gap: 8, color: T.teal, fontWeight: 700, fontSize: 13 }}><ShieldCheck size={16} /> Modèle privé de votre entreprise</div><p style={{ margin: "7px 0 0", color: T.inkSoft, fontSize: 12, lineHeight: 1.5 }}>Le PDF source est stocké dans un espace privé. Relisez toujours la proposition IA avant de l'utiliser.</p></div>
      <Field label="Nom du modèle"><input style={inputStyle} value={form.nom} onChange={set("nom")} placeholder="Contrat - Gestion des réseaux sociaux" /></Field>
      <Field label="Type de service"><input style={inputStyle} value={form.typeService} onChange={set("typeService")} placeholder="Gestion de réseaux sociaux" /></Field>
      <label style={{ display: "block", marginBottom: 8, fontSize: 12.5, color: T.inkSoft, fontWeight: 600 }}>PDF de référence (optionnel)</label>
      <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, minHeight: 42, borderRadius: 9, border: `1px dashed ${T.gold}`, color: T.ink, background: "#fff", cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}><Upload size={15} />{importing ? "Analyse en cours…" : form.sourcePath ? "Remplacer le PDF source" : "Importer un PDF"}<input type="file" accept="application/pdf" onChange={importPdf} style={{ display: "none" }} disabled={importing} /></label>
      {form.sourcePath && <div style={{ fontSize: 11.5, color: T.teal, marginTop: 7 }}>PDF source archivé en privé.</div>}
    </div>
    <div><Field label="Contenu du modèle"><textarea style={{ ...inputStyle, height: 460, padding: 12, lineHeight: 1.55, resize: "vertical" }} value={form.contenu} onChange={set("contenu")} /></Field><div style={{ color: T.inkSoft, fontSize: 11.5, margin: "-8px 0 14px" }}>Variables disponibles : <code>{"{{client.nom}}"}</code>, <code>{"{{client.societe}}"}</code>, <code>{"{{entreprise.nom}}"}</code>, ou vos propres champs entre accolades.</div><Btn icon={Copy} onClick={() => onSave(form)}>Enregistrer le modèle</Btn></div>
  </div>;
}

const DEFAULT_VALUES = { service: "", livrables: "", date_debut: "", date_fin: "", montant: "", conditions_paiement: "", date_contrat: new Date().toISOString().slice(0, 10) };

function ContractBuilder({ templates, clients, factures, devis, projets, entreprise, suggestContractFields, notify, onSave, initial = null }) {
  const [templateId, setTemplateId] = useState(initial?.templateId || templates[0]?.id || "");
  const [clientId, setClientId] = useState(initial?.clientId || clients[0]?.id || "");
  const [factureId, setFactureId] = useState(initial?.factureId || "");
  const [devisId, setDevisId] = useState(initial?.devisId || "");
  const [projetId, setProjetId] = useState(initial?.projetId || "");
  const template = templates.find((item) => item.id === templateId);
  const selectedClient = clients.find((item) => item.id === clientId);
  const [values, setValues] = useState(initial?.variables ? { ...DEFAULT_VALUES, ...initial.variables } : DEFAULT_VALUES);
  const [title, setTitle] = useState(initial?.titre || "");
  const [suggestion, setSuggestion] = useState(null);
  const [suggesting, setSuggesting] = useState(false);
  const baseValues = useMemo(() => ({ "client.nom": selectedClient?.nom || "", "client.societe": selectedClient?.societe || selectedClient?.nom || "", "client.email": selectedClient?.email || "", "entreprise.nom": entreprise?.nom || "", "entreprise.adresse": entreprise?.adresse || "" }), [selectedClient, entreprise]);
  const content = template?.contenu || "";
  const tokenList = tokensOf(content);
  const dynamicTokens = tokenList.filter((token) => !(token in baseValues));
  const render = () => content.replace(/{{\s*([\w.-]+)\s*}}/g, (_, token) => baseValues[token] || (token.startsWith("date_") ? frenchDate(values[token]) : values[token] || `{{${token}}}`));
  const chooseFacture = (id) => { setFactureId(id); const item = factures.find((f) => f.uuid === id); if (item) { setClientId(item.clientId); setValues((v) => ({ ...v, service: item.lignes.map((l) => l.nom).join(", "), montant: fmt(totals(item.lignes).ttc) })); } };
  if (!templates.length) return <EmptyState icon={FolderOpen} title="Créez d'abord un modèle" subtitle="Un contrat est toujours généré à partir d'un modèle validé." />;
  return <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, .75fr) minmax(360px, 1.25fr)", gap: 22 }}>
    <div><Field label="Modèle"><Select value={templateId} onChange={(e) => { setTemplateId(e.target.value); setTitle(""); }}>{templates.map((item) => <option key={item.id} value={item.id}>{item.nom}</option>)}</Select></Field><Field label="Titre du contrat"><input style={inputStyle} value={title} placeholder={template?.nom || "Titre"} onChange={(e) => setTitle(e.target.value)} /></Field><Field label="Client"><Select value={clientId} onChange={(e) => setClientId(e.target.value)}>{clients.map((item) => <option key={item.id} value={item.id}>{item.societe || item.nom}</option>)}</Select></Field><Field label="Facture associée (optionnel)"><Select value={factureId} onChange={(e) => chooseFacture(e.target.value)}><option value="">— Aucune —</option>{factures.map((item) => <option key={item.uuid} value={item.uuid}>{item.id}</option>)}</Select></Field><Field label="Devis associé (optionnel)"><Select value={devisId} onChange={(e) => setDevisId(e.target.value)}><option value="">— Aucun —</option>{devis.map((item) => <option key={item.uuid} value={item.uuid}>{item.id}</option>)}</Select></Field><Field label="Projet associé (optionnel)"><Select value={projetId} onChange={(e) => setProjetId(e.target.value)}><option value="">— Aucun —</option>{projets.map((item) => <option key={item.id} value={item.id}>{item.nom}</option>)}</Select></Field></div>
    <div><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, color: T.ink, fontWeight: 700, fontSize: 13, marginBottom: 12 }}><span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><Sparkles size={16} color={T.gold} /> Informations à compléter</span><Btn variant="ghost" small icon={Bot} disabled={suggesting} onClick={async () => { setSuggesting(true); const { data, error } = await suggestContractFields({ templateContent: content, values }); setSuggesting(false); if (error) notify("Les suggestions IA sont indisponibles. Vous pouvez compléter le contrat manuellement."); else setSuggestion(data?.suggestions || null); }}>{suggesting ? "Analyse…" : "Suggérer"}</Btn></div>{dynamicTokens.map((token) => <Field key={token} label={token.replaceAll("_", " ")}><input type={token.startsWith("date_") ? "date" : "text"} style={inputStyle} value={values[token] || ""} onChange={(e) => setValues((item) => ({ ...item, [token]: e.target.value }))} /></Field>)}{suggestion && <div style={{ padding: 12, border: `1px solid ${T.gold}`, background: T.goldSoft, borderRadius: 10, marginBottom: 14 }}><div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 7 }}>Suggestions IA à valider</div>{Object.entries(suggestion).map(([key, value]) => <div key={key} style={{ fontSize: 12, lineHeight: 1.45, marginTop: 7 }}><b>{key.replaceAll("_", " ")} :</b> {String(value)}</div>)}<Btn small variant="ghost" onClick={() => { setValues((item) => ({ ...item, ...suggestion })); setSuggestion(null); }}>Appliquer les suggestions</Btn></div>}<div style={{ padding: 14, border: `1px solid ${T.line}`, borderRadius: 10, background: T.bg, marginBottom: 14 }}><div style={{ fontSize: 11.5, color: T.inkSoft, fontWeight: 700, textTransform: "uppercase", marginBottom: 7 }}>Aperçu du contenu</div><div style={{ whiteSpace: "pre-wrap", fontSize: 12, lineHeight: 1.55, maxHeight: 220, overflow: "auto" }}>{render()}</div></div><Btn icon={initial ? Save : FilePlus2} onClick={() => onSave({ templateId, clientId, factureId, devisId, projetId, titre: title || template.nom, typeService: template.typeService, contenu: render(), variables: { ...baseValues, ...values } })}>{initial ? "Enregistrer les modifications" : "Créer le brouillon"}</Btn></div>
  </div>;
}

function ContractPreview({ contract, client, entreprise, onDownload, onWhatsApp, onStatus, onEdit, facture, devis, projet }) {
  return <div><div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 15 }}><Badge statut={contract.statut} />{facture && <span style={{ fontSize: 12, color: T.inkSoft }}>Facture : {facture.id}</span>}{devis && <span style={{ fontSize: 12, color: T.inkSoft }}>Devis : {devis.id}</span>}{projet && <span style={{ fontSize: 12, color: T.inkSoft }}>Projet : {projet.nom}</span>}</div><div style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.7, color: T.ink, border: `1px solid ${T.line}`, borderRadius: 10, padding: 16, maxHeight: 420, overflow: "auto" }}>{contract.contenu}</div><div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginTop: 16 }}><Btn icon={Download} onClick={onDownload}>Télécharger le PDF</Btn>{contract.statut === "Brouillon" && <Btn variant="ghost" icon={Pencil} onClick={onEdit}>Modifier le brouillon</Btn>}{contract.statut === "Brouillon" && <Btn variant="ghost" icon={Send} onClick={() => onStatus("Envoyé")}>Marquer envoyé</Btn>}{contract.statut !== "Signé" && <Btn variant="ghost" icon={CheckCircle2} onClick={() => onStatus("Signé")}>Marquer signé</Btn>}<Btn variant="ghost" icon={MessageCircle} onClick={onWhatsApp}>Ouvrir WhatsApp</Btn></div><p style={{ color: T.inkSoft, fontSize: 11.5, lineHeight: 1.5, marginTop: 12 }}>Téléchargez le PDF avant d’ouvrir WhatsApp, puis joignez-le au message. La validation juridique et la signature restent sous votre responsabilité.</p></div>;
}

function ContractFallbackEditor({ contract, clients, factures, devis, projets, onSave }) {
  const [form, setForm] = useState({
    templateId: null,
    clientId: contract.clientId || "",
    factureId: contract.factureId || "",
    devisId: contract.devisId || "",
    projetId: contract.projetId || "",
    titre: contract.titre || "",
    typeService: contract.typeService || "",
    contenu: contract.contenu || "",
    variables: contract.variables || {},
  });
  const set = (key) => (event) => setForm((item) => ({ ...item, [key]: event.target.value }));
  return <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, .75fr) minmax(360px, 1.25fr)", gap: 22 }}>
    <div>
      <div style={{ padding: 14, border: `1px solid ${T.gold}`, background: T.goldSoft, borderRadius: 10, marginBottom: 16 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: T.ink, marginBottom: 6 }}>Modèle d'origine introuvable</div>
        <p style={{ margin: 0, color: T.inkSoft, fontSize: 12, lineHeight: 1.5 }}>Le modèle utilisé pour générer ce contrat n'existe plus. Modifiez directement les informations et le contenu du texte ci-contre.</p>
      </div>
      <Field label="Titre du contrat"><input style={inputStyle} value={form.titre} onChange={set("titre")} /></Field>
      <Field label="Client"><Select value={form.clientId} onChange={set("clientId")}>{clients.map((item) => <option key={item.id} value={item.id}>{item.societe || item.nom}</option>)}</Select></Field>
      <Field label="Facture associée (optionnel)"><Select value={form.factureId} onChange={set("factureId")}><option value="">— Aucune —</option>{factures.map((item) => <option key={item.uuid} value={item.uuid}>{item.id}</option>)}</Select></Field>
      <Field label="Devis associé (optionnel)"><Select value={form.devisId} onChange={set("devisId")}><option value="">— Aucun —</option>{devis.map((item) => <option key={item.uuid} value={item.uuid}>{item.id}</option>)}</Select></Field>
      <Field label="Projet associé (optionnel)"><Select value={form.projetId} onChange={set("projetId")}><option value="">— Aucun —</option>{projets.map((item) => <option key={item.id} value={item.id}>{item.nom}</option>)}</Select></Field>
    </div>
    <div>
      <Field label="Contenu du contrat"><textarea style={{ ...inputStyle, height: 340, padding: 12, lineHeight: 1.55, resize: "vertical" }} value={form.contenu} onChange={set("contenu")} /></Field>
      <div style={{ display: "flex", gap: 10 }}>
        <Btn icon={Save} onClick={() => onSave(form)}>Enregistrer les modifications</Btn>
      </div>
    </div>
  </div>;
}
