import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { todayISO } from "./helpers";

const TEMPLATE_SELECT = "id, nom, type_service, contenu, source_path, created_at, updated_at";
const CONTRACT_SELECT = "id, template_id, client_id, facture_id, devis_id, projet_id, prestataire_id, titre, type_service, statut, contenu_final, variables, envoye_le, signe_le, created_at, updated_at";

const mapTemplate = (row) => ({ id: row.id, nom: row.nom, typeService: row.type_service, contenu: row.contenu, sourcePath: row.source_path, createdAt: row.created_at, updatedAt: row.updated_at });
const mapContract = (row) => ({ id: row.id, templateId: row.template_id, clientId: row.client_id, factureId: row.facture_id, devisId: row.devis_id, projetId: row.projet_id, prestataireId: row.prestataire_id, titre: row.titre, typeService: row.type_service, statut: row.statut, contenu: row.contenu_final, variables: row.variables || {}, envoyeLe: row.envoye_le, signeLe: row.signe_le, createdAt: row.created_at });

export function useContracts(entrepriseId, userId) {
  const [templates, setTemplates] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!entrepriseId) return;
    const [{ data: templateRows, error: templateError }, { data: contractRows, error: contractError }] = await Promise.all([
      supabase.from("contract_templates").select(TEMPLATE_SELECT).eq("entreprise_id", entrepriseId).order("updated_at", { ascending: false }),
      supabase.from("contracts").select(CONTRACT_SELECT).eq("entreprise_id", entrepriseId).order("created_at", { ascending: false }),
    ]);
    if (!templateError) setTemplates((templateRows || []).map(mapTemplate));
    if (!contractError) setContracts((contractRows || []).map(mapContract));
    setLoading(false);
  }, [entrepriseId]);

  useEffect(() => { load(); }, [load]);

  const saveTemplate = async (form) => {
    const row = { entreprise_id: entrepriseId, nom: form.nom.trim(), type_service: form.typeService.trim(), contenu: form.contenu, source_path: form.sourcePath || null, updated_at: new Date().toISOString() };
    let error;
    if (form.id) ({ error } = await supabase.from("contract_templates").update(row).eq("id", form.id));
    else ({ error } = await supabase.from("contract_templates").insert({ ...row, created_by: userId }));
    if (!error) await load();
    return { error };
  };

  const uploadTemplateSource = async (file) => {
    if (file.type !== "application/pdf") return { error: new Error("Seuls les fichiers PDF sont acceptés.") };
    if (file.size > 15 * 1024 * 1024) return { error: new Error("Le PDF ne peut pas dépasser 15 Mo.") };
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${entrepriseId}/${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabase.storage.from("contract-sources").upload(path, file, { contentType: "application/pdf", upsert: false });
    return { error, path: error ? null : path };
  };

  const suggestTemplateFromSource = async (sourcePath) => {
    const { data, error } = await supabase.functions.invoke("suggest-contract-template", { body: { sourcePath } });
    return { data, error };
  };

  const suggestContractFields = async ({ templateContent, values }) => {
    const { data, error } = await supabase.functions.invoke("suggest-contract-template", {
      body: { mode: "contract-suggestions", templateContent, values },
    });
    return { data, error };
  };

  const saveContract = async (form) => {
    const row = {
      entreprise_id: entrepriseId, template_id: form.templateId || null, client_id: form.clientId || null,
      facture_id: form.factureId || null, devis_id: form.devisId || null, projet_id: form.projetId || null,
      prestataire_id: form.prestataireId || null,
      titre: form.titre.trim(), type_service: form.typeService.trim(), contenu_final: form.contenu,
      variables: form.variables, statut: form.statut || "Brouillon", updated_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from("contracts").insert({ ...row, created_by: userId }).select("id").single();
    if (!error) {
      await supabase.from("contract_history").insert({ contract_id: data.id, action: "Création", detail: "Contrat créé en brouillon", created_by: userId });
      await load();
    }
    return { error };
  };

  const updateContract = async (contract, form) => {
    const row = {
      template_id: form.templateId || null, client_id: form.clientId || null,
      facture_id: form.factureId || null, devis_id: form.devisId || null, projet_id: form.projetId || null,
      prestataire_id: form.prestataireId || null,
      titre: form.titre.trim(), type_service: form.typeService.trim(), contenu_final: form.contenu,
      variables: form.variables || {}, updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("contracts").update(row).eq("id", contract.id);
    if (!error) {
      await supabase.from("contract_history").insert({ contract_id: contract.id, action: "Modification", detail: "Contrat modifié avant envoi", created_by: userId });
      await load();
    }
    return { error };
  };

  const updateStatus = async (contract, statut) => {
    const patch = { statut, updated_at: new Date().toISOString() };
    if (statut === "Envoyé") patch.envoye_le = todayISO();
    if (statut === "Signé") patch.signe_le = todayISO();
    const { error } = await supabase.from("contracts").update(patch).eq("id", contract.id);
    if (!error) {
      await supabase.from("contract_history").insert({ contract_id: contract.id, action: statut, detail: `Contrat marqué comme ${statut.toLowerCase()}`, created_by: userId });
      if (statut === "Signé" || statut === "Résilié") {
        const titre = statut === "Signé" ? "Contrat signé" : "Contrat résilié";
        const message = `Le contrat « ${contract.titre} » vient d'être ${statut.toLowerCase()}.`;
        const { data: adminIds } = await supabase.rpc("get_admin_user_ids", { p_entreprise_id: entrepriseId });
        for (const adminId of (adminIds || [])) {
          if (adminId === userId) continue;
          await supabase.rpc("notify_evenement", {
            p_destinataire_user_id: adminId,
            p_entreprise_id: entrepriseId,
            p_type: "contrat_change",
            p_titre: titre,
            p_message: message,
          });
        }
        if (contract.prestataireId) {
          const { data: prest } = await supabase.from("prestataires").select("user_id").eq("id", contract.prestataireId).maybeSingle();
          if (prest?.user_id) {
            await supabase.rpc("notify_evenement", {
              p_destinataire_user_id: prest.user_id,
              p_entreprise_id: entrepriseId,
              p_type: "contrat_change",
              p_titre: titre,
              p_message: message,
            });
          }
        }
      }
      await load();
    }
    return { error };
  };

  return { templates, contracts, loading, saveTemplate, uploadTemplateSource, suggestTemplateFromSource, suggestContractFields, saveContract, updateContract, updateStatus, reload: load };
}
