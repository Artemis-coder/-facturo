import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) throw new Error("Authentification requise.");
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey, { global: { headers: { Authorization: authorization } } });
    const token = authorization.replace("Bearer ", "");
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) throw new Error("Session invalide.");
    const { data: profile } = await admin.from("profiles").select("entreprise_id, role").eq("id", authData.user.id).single();
    if (!profile || !["administrateur", "super_admin"].includes(profile.role)) throw new Error("Accès réservé aux administrateurs.");

    const request = await req.json();
    if (request.mode === "contract-suggestions") {
      const templateContent = String(request.templateContent || "").slice(0, 30000);
      const values = request.values && typeof request.values === "object" ? request.values : {};
      const apiKey = Deno.env.get("OPENAI_API_KEY");
      if (!apiKey) throw new Error("Le service de suggestions IA n'est pas configuré.");
      const prompt = `Propose uniquement des valeurs courtes et professionnelles en français pour compléter ce contrat. Ne fournis ni avis juridique, ni clause juridique nouvelle. Retourne seulement un objet JSON {"suggestions": {"livrables": "...", "conditions_paiement": "..."}}. Ne suggère que les champs manquants parmi les valeurs fournies. Modèle : ${templateContent}\nValeurs : ${JSON.stringify(values)}`;
      const suggestionResponse = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "gpt-4.1-mini", input: prompt, text: { format: { type: "json_object" } } }) });
      if (!suggestionResponse.ok) throw new Error("La suggestion IA n'a pas pu être générée.");
      const suggestionResult = await suggestionResponse.json();
      return Response.json(JSON.parse(suggestionResult.output_text), { headers: corsHeaders });
    }
    const { sourcePath } = request;
    if (typeof sourcePath !== "string" || !sourcePath.startsWith(`${profile.entreprise_id}/`)) throw new Error("Document source invalide.");
    const { data: pdf, error: downloadError } = await admin.storage.from("contract-sources").download(sourcePath);
    if (downloadError || !pdf) throw new Error("Impossible de lire le PDF privé.");
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) throw new Error("Le service de suggestions IA n'est pas configuré.");

    const fileForm = new FormData();
    fileForm.append("purpose", "user_data");
    fileForm.append("file", new File([pdf], "contrat-source.pdf", { type: "application/pdf" }));
    const fileResponse = await fetch("https://api.openai.com/v1/files", { method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: fileForm });
    if (!fileResponse.ok) throw new Error("L'import du document vers le service IA a échoué.");
    const file = await fileResponse.json();
    const prompt = `Analyse ce contrat fourni comme référence. Retourne uniquement un JSON valide contenant : name, serviceType, content. content doit être un modèle de contrat professionnel en français, éditable, sans conseil juridique, et utiliser les variables {{entreprise.nom}}, {{client.nom}}, {{client.societe}}, {{service}}, {{livrables}}, {{date_debut}}, {{date_fin}}, {{montant}}, {{conditions_paiement}}, {{date_contrat}}. Ne copie pas de données personnelles identifiantes du PDF source.`;
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-4.1-mini", input: [{ role: "user", content: [{ type: "input_file", file_id: file.id }, { type: "input_text", text: prompt }] }], text: { format: { type: "json_object" } } }),
    });
    if (!response.ok) throw new Error("La suggestion IA n'a pas pu être générée.");
    const result = await response.json();
    const text = result.output_text || result.output?.flatMap((item: any) => item.content || []).find((item: any) => item.type === "output_text")?.text;
    const suggestion = JSON.parse(text);
    return Response.json(suggestion, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Erreur inattendue" }, { status: 400, headers: corsHeaders });
  }
});
