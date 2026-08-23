import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response("Méthode non autorisée", { status: 405, headers: corsHeaders });
  }

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) {
      return new Response("Authentification requise.", { status: 401, headers: corsHeaders });
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const admin = createClient(url, serviceKey, { global: { headers: { Authorization: authorization } } });

    const token = authorization.replace("Bearer ", "");
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) {
      return new Response("Session invalide.", { status: 401, headers: corsHeaders });
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("entreprise_id, role")
      .eq("id", authData.user.id)
      .single();

    if (!profile) {
      return new Response("Profil introuvable.", { status: 403, headers: corsHeaders });
    }

    const contractId = req.url.split("?")[1]?.split("&").find((p) => p.startsWith("contract_id="))?.split("=")[1];
    if (!contractId) {
      return new Response("contract_id requis.", { status: 400, headers: corsHeaders });
    }

    const version = req.url.split("&").find((p) => p.startsWith("version="))?.split("=")[1] || "transmitted";

    const { data: contract, error: contractError } = await admin
      .from("contracts")
      .select("id, entreprise_id, prestataire_id, titre")
      .eq("id", contractId)
      .single();

    if (contractError || !contract) {
      return new Response("Contrat introuvable.", { status: 404, headers: corsHeaders });
    }

    if (contract.entreprise_id !== profile.entreprise_id) {
      return new Response("Accès refusé.", { status: 403, headers: corsHeaders });
    }

    const isAdmin = ["administrateur", "super_admin"].includes(profile.role);
    const isPrestataire = !isAdmin && contract.prestataire_id !== null;

    if (!isAdmin && !isPrestataire) {
      return new Response("Accès refusé.", { status: 403, headers: corsHeaders });
    }

    if (isPrestataire) {
      const { data: prestataire } = await admin
        .from("prestataires")
        .select("id")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (!prestataire || contract.prestataire_id !== prestataire.id) {
        return new Response("Accès refusé.", { status: 403, headers: corsHeaders });
      }
    }

    const { data: document, error: documentError } = await admin
      .from("contract_documents")
      .select("file_path, file_size, mime_type")
      .eq("contract_id", contractId)
      .eq("version", version)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (documentError || !document) {
      return new Response("Document introuvable.", { status: 404, headers: corsHeaders });
    }

    const { data: signedUrlData, error: signedUrlError } = await admin.storage
      .from("contract-documents")
      .createSignedUrl(document.file_path, 60);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      return new Response("Impossible de générer le lien de téléchargement.", { status: 500, headers: corsHeaders });
    }

    const fileResponse = await fetch(signedUrlData.signedUrl);
    if (!fileResponse.ok) {
      return new Response("Impossible de récupérer le fichier.", { status: 500, headers: corsHeaders });
    }

    const fileBlob = await fileResponse.arrayBuffer();
    const filename = contract.titre
      .replace(/[^a-z0-9]+/gi, "-")
      .toLowerCase() || "contrat";
    const suffix = version === "signed" ? "-signe" : "";
    const finalFilename = `${filename}${suffix}.pdf`;

    return new Response(fileBlob, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": document.mime_type || "application/pdf",
        "Content-Disposition": `attachment; filename="${finalFilename}"`,
        "Content-Length": String(document.file_size || fileBlob.byteLength),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Erreur inattendue" },
      { status: 500, headers: corsHeaders }
    );
  }
});
