import React, { useState } from "react";
import { Plus, Trash2, Send, Building2, User, Calendar, DollarSign, FileText, CheckCircle2, Printer, Download, Sparkles, FolderKanban } from "lucide-react";
import { T, fmt, inputStyle } from "../lib/theme";
import { mkLine, ligneMontant, totals, todayISO } from "../lib/helpers";
import { Field, Select, Btn } from "./ui";

export function DocBuilder({ clients, produits, projets = [], entreprise, onSave, docType = "devis", initial, onClose }) {
  const [clientId, setClientId] = useState(initial?.clientId || clients[0]?.id || "");
  const [projetId, setProjetId] = useState(initial?.projetId || "");
  const [dateDoc, setDateDoc] = useState(initial?.date || todayISO());
  const [devise, setDevise] = useState(initial?.devise || "FCFA");
  const [lignes, setLignes] = useState(
    initial?.lignes ? initial.lignes.map((l) => ({ ...l })) : (produits[0] ? [mkLine(produits[0])] : [])
  );
  const [enableRemiseGlobale, setEnableRemiseGlobale] = useState(Boolean(initial?.remiseGlobale));
  const [remiseGlobale, setRemiseGlobale] = useState(initial?.remiseGlobale || 0);
  const [notes, setNotes] = useState(initial?.notes || "Paiement à 30 jours à compter de la date d'émission.");

  const selectedClient = clients.find((c) => c.id === clientId);
  const selectedProjet = projets.find((p) => p.id === projetId);
  const docTitle = docType === "devis" ? "Devis" : "Facture";
  const docCode = initial?.id || `${docType === "devis" ? "DEV" : "FAC"}-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

  const activeRemise = enableRemiseGlobale ? Number(remiseGlobale) : 0;
  const t = totals(lignes, activeRemise);

  const addLigne = () => {
    if (produits[0]) {
      setLignes([...lignes, mkLine(produits[0])]);
    } else {
      setLignes([...lignes, {
        id: Math.random().toString(36).slice(2, 8),
        produitId: "",
        nom: "Prestation sur mesure",
        description: "",
        prixHT: 10000,
        tva: 18,
        qty: 1,
        remise: 0,
      }]);
    }
  };

  const updateLigne = (id, patch) => setLignes(lignes.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const removeLigne = (id) => setLignes(lignes.filter((l) => l.id !== id));

  const handleSave = (statut) => {
    onSave({
      clientId,
      projetId: projetId || null,
      date: dateDoc,
      devise,
      lignes,
      remiseGlobale: activeRemise,
      notes,
      statut,
    });
  };

  return (
    <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "flex-start" }}>
      {/* LEFT COLUMN: Interactive Builder Form */}
      <div style={{ flex: "1 1 520px", minWidth: 320, display: "flex", flexDirection: "column", gap: 20 }}>
        
        {/* Top Header Card */}
        <div style={{
          background: "linear-gradient(135deg, #16213A 0%, #1E2D4A 100%)",
          color: "#fff", padding: "16px 20px", borderRadius: 12,
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12
        }}>
          <div>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, color: T.gold, fontWeight: 600 }}>
              {docTitle} N°
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 18, fontWeight: 700 }}>
              {docCode}
            </div>
          </div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "rgba(255,255,255,0.08)", padding: "6px 12px", borderRadius: 20,
            fontSize: 12, border: "1px solid rgba(255,255,255,0.12)"
          }}>
            <Sparkles size={13} color={T.gold} /> Modèle dynamique
          </div>
        </div>

        {/* Company & Client Selector Card */}
        <div style={{ background: "#fff", border: `1px solid ${T.line}`, borderRadius: 12, padding: 18 }}>
          <div style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 700, color: T.inkSoft, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <Building2 size={14} color={T.gold} /> Informations Client
          </div>

          <Field label="Client Destinataire*">
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.societe ? `${c.societe} — ${c.nom}` : c.nom}
                </option>
              ))}
            </Select>
          </Field>

          {selectedClient && (
            <div style={{
              background: T.bg, border: `1px solid ${T.line}`, borderRadius: 10,
              padding: "12px 14px", marginTop: 10, display: "flex", alignItems: "center", gap: 12
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, background: T.ink, color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16
              }}>
                {selectedClient.societe?.[0] || selectedClient.nom?.[0] || "C"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {selectedClient.societe || selectedClient.nom}
                </div>
                <div style={{ fontSize: 12, color: T.inkSoft }}>
                  {selectedClient.nom} · {selectedClient.email || selectedClient.telephone || "Aucun contact"}
                </div>
              </div>
            </div>
          )}

          {projets.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <Field label="Projet associé (optionnel)">
                <Select value={projetId} onChange={(e) => setProjetId(e.target.value)}>
                  <option value="">— Aucun projet —</option>
                  {projets.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
                </Select>
              </Field>
            </div>
          )}
        </div>

        {/* Date & Devise */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ background: "#fff", border: `1px solid ${T.line}`, borderRadius: 12, padding: 14 }}>
            <Field label="Date d'émission">
              <input type="date" style={inputStyle} value={dateDoc} onChange={(e) => setDateDoc(e.target.value)} />
            </Field>
          </div>
          <div style={{ background: "#fff", border: `1px solid ${T.line}`, borderRadius: 12, padding: 14 }}>
            <Field label="Devise">
              <Select value={devise} onChange={(e) => setDevise(e.target.value)}>
                <option value="FCFA">FCFA (XOF / XAF)</option>
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
              </Select>
            </Field>
          </div>
        </div>

        {/* Line Items Section */}
        <div style={{ background: "#fff", border: `1px solid ${T.line}`, borderRadius: 12, padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, display: "flex", alignItems: "center", gap: 6 }}>
              <FileText size={15} color={T.gold} /> Services & Prestations ({lignes.length})
            </div>
            <span style={{ fontSize: 11.5, color: T.inkSoft }}>Calcul automatique</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {lignes.map((l, index) => (
              <div key={l.id} style={{
                border: `1px solid ${T.line}`, borderRadius: 10, padding: 14,
                background: T.bg, transition: "all 0.2s ease"
              }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 6, background: T.ink, color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700
                  }}>
                    {index + 1}
                  </div>

                  <Select wrapperStyle={{ flex: 1 }} value={l.produitId} onChange={(e) => {
                    const p = produits.find((p) => p.id === e.target.value);
                    if (p) {
                      updateLigne(l.id, { produitId: p.id, nom: p.nom, prixHT: p.prixHT, tva: p.tva });
                    }
                  }}>
                    <option value="">Article / Service libre</option>
                    {produits.map((p) => <option key={p.id} value={p.id}>{p.nom} ({fmt(p.prixHT)})</option>)}
                  </Select>

                  <button
                    onClick={() => removeLigne(l.id)}
                    title="Supprimer la ligne"
                    style={{
                      background: "rgba(224, 86, 36, 0.08)", border: "1px solid rgba(224, 86, 36, 0.2)",
                      borderRadius: 6, width: 32, height: 32, display: "flex", alignItems: "center",
                      justifyContent: "center", color: T.brick, cursor: "pointer", flexShrink: 0
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {/* Nom personnalisé si libre */}
                {!l.produitId && (
                  <input
                    type="text"
                    placeholder="Intitulé de la prestation / produit"
                    value={l.nom || ""}
                    onChange={(e) => updateLigne(l.id, { nom: e.target.value })}
                    style={{ ...inputStyle, fontSize: 12.5, marginBottom: 8 }}
                  />
                )}

                <textarea
                  placeholder="Description détaillée de la prestation (optionnelle)..."
                  value={l.description || ""}
                  onChange={(e) => updateLigne(l.id, { description: e.target.value })}
                  style={{
                    ...inputStyle, height: "auto", minHeight: 44, padding: "8px 10px",
                    fontSize: 12, marginBottom: 10, resize: "vertical"
                  }}
                />

                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr 0.8fr 1.2fr", gap: 8, alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 10.5, color: T.inkSoft, marginBottom: 3 }}>Prix HT ({devise})</div>
                    <input
                      type="number"
                      style={{ ...inputStyle, fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}
                      value={l.prixHT}
                      onChange={(e) => updateLigne(l.id, { prixHT: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, color: T.inkSoft, marginBottom: 3 }}>Qté</div>
                    <input
                      type="number"
                      style={{ ...inputStyle, fontSize: 12 }}
                      value={l.qty}
                      min={1}
                      onChange={(e) => updateLigne(l.id, { qty: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, color: T.inkSoft, marginBottom: 3 }}>Remise %</div>
                    <input
                      type="number"
                      style={{ ...inputStyle, fontSize: 12 }}
                      value={l.remise}
                      min={0}
                      max={100}
                      onChange={(e) => updateLigne(l.id, { remise: Number(e.target.value) })}
                    />
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10.5, color: T.inkSoft, marginBottom: 3 }}>Sous-total</div>
                    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12.5, fontWeight: 600, color: T.ink }}>
                      {fmt(ligneMontant(l))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 14 }}>
            <Btn variant="ghost" small icon={Plus} onClick={addLigne}>
              Ajouter une ligne de prestation
            </Btn>
          </div>
        </div>

        {/* Global Discounts & Notes */}
        <div style={{ background: "#fff", border: `1px solid ${T.line}`, borderRadius: 12, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <input
              type="checkbox"
              id="enableRemise"
              checked={enableRemiseGlobale}
              onChange={(e) => setEnableRemiseGlobale(e.target.checked)}
              style={{ cursor: "pointer", width: 16, height: 16 }}
            />
            <label htmlFor="enableRemise" style={{ fontSize: 13, fontWeight: 600, color: T.ink, cursor: "pointer" }}>
              Appliquer une remise commerciale globale
            </label>
          </div>

          {enableRemiseGlobale && (
            <div style={{ marginBottom: 14, paddingLeft: 24 }}>
              <Field label="Pourcentage de remise globale (%)">
                <input
                  type="number"
                  style={{ ...inputStyle, maxWidth: 160 }}
                  value={remiseGlobale}
                  min={0}
                  max={100}
                  onChange={(e) => setRemiseGlobale(e.target.value)}
                />
              </Field>
            </div>
          )}

          <Field label="Notes & Conditions de règlement">
            <textarea
              style={{ ...inputStyle, height: "auto", minHeight: 60, padding: "8px 10px", fontSize: 12, resize: "vertical" }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </div>

        {/* Footer Actions */}
        <div style={{
          display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "flex-end",
          background: "#fff", border: `1px solid ${T.line}`, borderRadius: 12, padding: 16
        }}>
          {onClose && <Btn variant="ghost" onClick={onClose}>Annuler</Btn>}
          <Btn variant="gold" onClick={() => handleSave("Brouillon")}>
            Enregistrer en brouillon
          </Btn>
          <Btn variant="primary" icon={Send} onClick={() => handleSave(docType === "devis" ? "Envoyé" : "Envoyée")}>
            Enregistrer & Envoyer
          </Btn>
        </div>
      </div>

      {/* RIGHT COLUMN: Real-Time Live Preview Canvas */}
      <div style={{
        flex: "1 1 480px", minWidth: 320, background: "#F4F6F9",
        border: `1px solid ${T.line}`, borderRadius: 14, padding: 20,
        position: "sticky", top: 10
      }}>
        {/* Preview Toolbar Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, display: "flex", alignItems: "center", gap: 6 }}>
            <Sparkles size={14} color={T.gold} /> Aperçu en temps réel
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => window.print()}
              style={{
                background: "#fff", border: `1px solid ${T.line}`, borderRadius: 8,
                padding: "6px 12px", fontSize: 12, color: T.ink, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 5
              }}
            >
              <Printer size={13} /> Imprimer
            </button>
          </div>
        </div>

        {/* Paper Document Container */}
        <div style={{
          background: "#ffffff", borderRadius: 12,
          boxShadow: "0 10px 28px rgba(22, 33, 58, 0.06)", border: `1px solid ${T.line}`,
          padding: 24, fontSize: 12.5, color: T.ink
        }}>
          {/* Header Branding */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, borderBottom: `1px solid ${T.line}`, paddingBottom: 16 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 6, background: T.gold,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: 14, color: "#fff"
                }}>
                  M
                </div>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700 }}>
                  {entreprise?.nom || "Ma Bouate"}
                </span>
              </div>
              <div style={{ fontSize: 11, color: T.inkSoft }}>
                {[entreprise?.email, entreprise?.tel || entreprise?.telephone].filter(Boolean).join(" · ") || "contact@mabouate.com"}
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{
                display: "inline-block", background: T.ink, color: "#fff",
                padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: "uppercase"
              }}>
                {docTitle}
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, fontWeight: 600, marginTop: 4 }}>
                {docCode}
              </div>
              <div style={{ fontSize: 11, color: T.inkSoft }}>
                Date : {dateDoc}
              </div>
            </div>
          </div>

          {/* Client Details */}
          <div style={{ background: T.bg, borderRadius: 8, padding: 12, marginBottom: 20 }}>
            <div style={{ fontSize: 10.5, textTransform: "uppercase", color: T.inkSoft, fontWeight: 700, marginBottom: 4 }}>
              Destinataire (Facturé à)
            </div>
            {selectedClient ? (
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: T.ink }}>{selectedClient.societe || selectedClient.nom}</div>
                {selectedClient.societe && <div style={{ fontSize: 12, color: T.inkSoft }}>Attn: {selectedClient.nom}</div>}
                <div style={{ fontSize: 11.5, color: T.inkSoft }}>{selectedClient.email} · {selectedClient.telephone}</div>
              </div>
            ) : (
              <div style={{ fontStyle: "italic", color: T.inkSoft, fontSize: 12 }}>
                Sélectionnez un client dans le formulaire pour afficher ses coordonnées.
              </div>
            )}
          </div>

          {/* Line items Table */}
          <div style={{ border: `1px solid ${T.line}`, borderRadius: 8, overflow: "hidden", marginBottom: 20 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: T.bg, borderBottom: `1px solid ${T.line}` }}>
                  <th style={{ textAlign: "left", padding: "8px 10px", fontSize: 10.5, textTransform: "uppercase", color: T.inkSoft }}>Description</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", fontSize: 10.5, textTransform: "uppercase", color: T.inkSoft }}>Qté</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", fontSize: 10.5, textTransform: "uppercase", color: T.inkSoft }}>Prix HT</th>
                  <th style={{ textAlign: "right", padding: "8px 10px", fontSize: 10.5, textTransform: "uppercase", color: T.inkSoft }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {lignes.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: 16, color: T.inkSoft, fontStyle: "italic" }}>
                      Aucune ligne ajoutée pour le moment.
                    </td>
                  </tr>
                ) : (
                  lignes.map((l) => (
                    <React.Fragment key={l.id}>
                      <tr style={{ borderBottom: `1px solid ${T.line}` }}>
                        <td style={{ padding: "8px 10px", fontWeight: 600 }}>{l.nom || "Prestation"}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "'IBM Plex Mono', monospace" }}>{l.qty}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(l.prixHT)}</td>
                        <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600 }}>
                          {fmt(ligneMontant(l))}
                        </td>
                      </tr>
                      {l.description && (
                        <tr style={{ borderBottom: `1px solid ${T.line}` }}>
                          <td colSpan={4} style={{ padding: "4px 10px 8px 10px", fontSize: 11, color: T.inkSoft, fontStyle: "italic" }}>
                            {l.description}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", width: 220, fontSize: 12, color: T.inkSoft }}>
              <span>Sous-total HT :</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(t.htBrut || t.ht)}</span>
            </div>

            {enableRemiseGlobale && Number(remiseGlobale) > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", width: 220, fontSize: 12, color: T.brick }}>
                <span>Remise globale ({remiseGlobale}%) :</span>
                <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>-{fmt((t.htBrut || t.ht) * (Number(remiseGlobale) / 100))}</span>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", width: 220, fontSize: 12, color: T.inkSoft }}>
              <span>TVA (18%) :</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{fmt(t.tva)}</span>
            </div>

            <div style={{
              display: "flex", justifyContent: "space-between", width: 220, fontSize: 15,
              fontWeight: 700, color: T.ink, borderTop: `2px solid ${T.ink}`, paddingTop: 8, marginTop: 4
            }}>
              <span>Total TTC :</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.gold }}>{fmt(t.ttc)} {devise !== "FCFA" ? devise : ""}</span>
            </div>
          </div>

          {/* Notes & Terms */}
          {notes && (
            <div style={{ borderTop: `1px dashed ${T.line}`, paddingTop: 12, marginTop: 12 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", color: T.inkSoft, marginBottom: 4 }}>
                Conditions & Notes
              </div>
              <div style={{ fontSize: 11, color: T.inkSoft, whiteSpace: "pre-wrap" }}>
                {notes}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
