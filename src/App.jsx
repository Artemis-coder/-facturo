import React, { useState, useEffect } from "react";
import { useAuth } from "./lib/useAuth";
import { isSupabaseConfigured, supabase } from "./lib/supabaseClient";
import { useClients } from "./lib/useClients";
import { useProduits } from "./lib/useProduits";
import { useDevis } from "./lib/useDevis";
import { useFactures } from "./lib/useFactures";
import { useEntreprise } from "./lib/useEntreprise";
import { useUsers } from "./lib/useUsers";
import { useProjets } from "./lib/useProjets";
import { usePaiements } from "./lib/usePaiements";
import { useDepenses } from "./lib/useDepenses";
import { useContracts } from "./lib/useContracts";
import { usePrestataires } from "./lib/usePrestataires";
import { useFichiersProjets } from "./lib/useFichiersProjets";
import { useAmountVisibility } from "./lib/useAmountVisibility";
import { useOnlineStatus } from "./lib/useOnlineStatus";
import { flushQueue, queueLength } from "./lib/offline";
import { T } from "./lib/theme";
import { Login } from "./components/Login";
import { Shell } from "./components/Shell";
import { Dashboard } from "./components/Dashboard";
import { Clients } from "./components/Clients";
import { Produits } from "./components/Produits";
import { Devis } from "./components/Devis";
import { Factures } from "./components/Factures";
import { Rapports } from "./components/Rapports";
import { Entreprise } from "./components/Entreprise";
import { Parametres } from "./components/Parametres";
import { Users } from "./components/Users";
import { Projets } from "./components/Projets";
import { Finance } from "./components/Finance";
import { Contracts } from "./components/Contracts";
import { Prestataires } from "./components/Prestataires";
import { PortalPrestataire } from "./components/PortalPrestataire";
import { genererDocumentPDF } from "./lib/documentPdf";
import { Toast, LoadingState } from "./components/ui";
import { Analytics } from "@vercel/analytics/react";

const FONT_LINKS = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap";

const GLOBAL_STYLE = `
  * { box-sizing: border-box; }
  body { margin: 0; }
  input, select, textarea { transition: border-color .15s, box-shadow .15s; outline: none; }
  input:focus, select:focus, textarea:focus { border-color: ${T.gold} !important; box-shadow: 0 0 0 3px ${T.goldSoft}; }
  table tbody tr { transition: background .12s; }
  table tbody tr:hover { background: #FAF8F3; }
  button { font-family: inherit; }
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-thumb { background: #D9D6CC; border-radius: 8px; }
  ::-webkit-scrollbar-track { background: transparent; }
  @keyframes drawerIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes facturo-spin { to { transform: rotate(360deg); } }
  @keyframes fadeInUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  button, a { transition: opacity .15s, transform .1s, box-shadow .15s; }
  button:active { transform: scale(.97); }
  .kpi-card { transition: box-shadow .15s, transform .15s; }
  .kpi-card:hover { box-shadow: 0 4px 14px rgba(22,33,58,.08); transform: translateY(-1px); }
  .nav-overlay { display: none; }
  @media (max-width: 880px) {
    .app-sidebar { position: fixed; top: 0; left: 0; height: 100vh; z-index: 60; transform: translateX(-100%); transition: transform .25s ease; }
    .app-sidebar.open { transform: translateX(0); box-shadow: 12px 0 32px rgba(22,33,58,.25); }
    .nav-close-btn { display: flex !important; }
    .nav-menu-btn { display: flex !important; }
    .nav-overlay { display: block; position: fixed; inset: 0; background: #16213A66; z-index: 55; animation: fadeIn .2s ease; }
    .app-header { padding: 14px 16px !important; }
    .app-header-title { font-size: 17px !important; }
    .app-content { padding: 16px !important; }
    .grid-kpi { grid-template-columns: repeat(2, 1fr) !important; }
    .grid-dash { grid-template-columns: 1fr !important; }
    .grid-2, .grid-3 { grid-template-columns: 1fr !important; }
  }
  @media (max-width: 480px) {
    .grid-kpi { grid-template-columns: 1fr !important; }
    .table-toolbar { flex-direction: column; align-items: stretch !important; }
    .table-toolbar > div:first-child { max-width: none !important; }
    .table-toolbar > button { width: 100%; justify-content: center; }
  }
`;

function GlobalStyles() {
  return (
    <>
      <link rel="stylesheet" href={FONT_LINKS} />
      <style>{GLOBAL_STYLE}</style>
    </>
  );
}

function FullscreenMessage({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: T.ink, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14 }}>
      {children}
    </div>
  );
}

export default function App() {
  const { session, profile, loading, signIn, signUp, signInWithOtp, signOut } = useAuth();
  const [view, setView] = useState("dashboard");
  const { hidden: amountsHidden, toggle: toggleAmounts } = useAmountVisibility();
  const online = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(queueLength());
  const [toast, setToast] = useState("");
  const notify = (msg) => { setToast(msg); setPendingCount(queueLength()); setTimeout(() => setToast(""), 2200); };

  const entrepriseId = profile?.entreprise_id;
  const userId = session?.user?.id;
  const role = profile?.role;

  useEffect(() => {
    if (!online || !entrepriseId) return;
    (async () => {
      const { synced, failed } = await flushQueue({
        saveClient: (row) => supabase.from("clients").insert(row),
        saveDepense: (row) => supabase.from("depenses").insert(row),
        enregistrerPaiement: enregistrerPaiementDepuisFile,
      });
      setPendingCount(queueLength());
      if (synced > 0) {
        notify(`${synced} action${synced > 1 ? "s" : ""} synchronisée${synced > 1 ? "s" : ""}` + (failed ? `, ${failed} en attente` : ""));
        reloadClients(); reloadDepenses(); reloadFactures();
      }
    })();
  }, [online, entrepriseId]);
  const requestPrint = async (doc, type, client) => {
    await genererDocumentPDF(doc, type, client, entreprise);
  };


  const { clients, saveClient, loading: loadingClients, reload: reloadClients } = useClients(entrepriseId);
  const { produits, saveProduit, loading: loadingProduits } = useProduits(entrepriseId);
  const { devis, createDevis, updateDevis, marquerTransforme, lierProjet: lierProjetDevis, loading: loadingDevis } = useDevis(entrepriseId, userId);
  const { factures, createFacture, creerDepuisDevis, enregistrerPaiement, enregistrerPaiementDepuisFile, marquerProjetTermine, lierProjet: lierProjetFacture, deleteFacture, loading: loadingFactures, reload: reloadFactures } = useFactures(entrepriseId, userId);
  const { entreprise, saveProfil, saveParametres, uploadLogo, loading: loadingEntreprise } = useEntreprise(entrepriseId);
  const { profiles, invitations, invitationsAcceptees, changeRole, invite, resendInviteEmail, cancelInvitation } = useUsers(entrepriseId);
  const { projets, saveProjet, changerStatut, deleteProjet, loading: loadingProjets } = useProjets(entrepriseId);
  const { paiements, loading: loadingPaiements } = usePaiements(entrepriseId);
  const { depenses, saveDepense, deleteDepense, loading: loadingDepenses, reload: reloadDepenses } = useDepenses(entrepriseId);
  const { templates, contracts, loading: loadingContracts, saveTemplate, uploadTemplateSource, suggestTemplateFromSource, suggestContractFields, saveContract, updateContract, updateStatus: updateContractStatus } = useContracts(entrepriseId, userId);
  const { prestataires, liens: liensPrestataires, taches, loading: loadingPrestataires, savePrestataire, deletePrestataire, affecterPrestataire, detacherPrestataire, saveTache, deleteTache, inviterPrestataire } = usePrestataires(entrepriseId, userId);
  const { fichiers: fichiersProjets, loading: loadingFichiers, uploadFichier, supprimerFichier } = useFichiersProjets(entrepriseId, userId);

  if (!isSupabaseConfigured) {
    return (
      <>
        <GlobalStyles />
        <FullscreenMessage>
          <div style={{ maxWidth: 420, textAlign: "center", padding: 24 }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, marginBottom: 12 }}>Configuration manquante</div>
            <p style={{ color: "#B9BFCF", lineHeight: 1.7, fontSize: 13.5 }}>
              Les variables <code>VITE_SUPABASE_URL</code> et <code>VITE_SUPABASE_ANON_KEY</code> ne sont pas définies.
              Sur Vercel : <b>Project Settings → Environment Variables</b>, ajoutez les deux valeurs
              (Project Settings → API dans Supabase), puis relancez un déploiement (<b>Redeploy</b>).
            </p>
          </div>
        </FullscreenMessage>
      </>
    );
  }

  if (loading) {
    return (<><GlobalStyles /><FullscreenMessage><LoadingState label="Chargement…" light /></FullscreenMessage></>);
  }

  if (!session) {
    return (<><GlobalStyles /><Login onSignIn={signIn} onSignUp={signUp} onSignInWithOtp={signInWithOtp} /></>);
  }

  if (!profile) {
    return (<><GlobalStyles /><FullscreenMessage><LoadingState label="Création de votre espace en cours…" light /></FullscreenMessage></>);
  }

  if (role === "prestataire") {
    return (
      <>
        <GlobalStyles />
        <PortalPrestataire entrepriseId={entrepriseId} userId={userId} entreprise={entreprise} onLogout={signOut} />
      </>
    );
  }

  const dataReady = !loadingClients && !loadingProduits && !loadingDevis && !loadingFactures && !loadingEntreprise && !loadingProjets && !loadingPaiements && !loadingDepenses && !loadingContracts && !loadingPrestataires && !loadingFichiers;
  const isAdmin = role === "administrateur" || role === "super_admin";
  const canManageClients = ["administrateur", "comptable", "commercial", "super_admin"].includes(role);
  const canManageProduits = ["administrateur", "comptable", "super_admin"].includes(role);
  const canCreateDevis = ["administrateur", "commercial", "super_admin"].includes(role);
  const canManageFactures = ["administrateur", "comptable", "super_admin"].includes(role);
  const canManageProjets = ["administrateur", "comptable", "commercial", "super_admin"].includes(role);
  const canManageFinance = ["administrateur", "comptable", "super_admin"].includes(role);

  return (
    <>
      <GlobalStyles />
      <Shell view={view} setView={setView} onLogout={signOut} entreprise={entreprise} role={role}
        amountsHidden={amountsHidden} onToggleAmounts={toggleAmounts} userId={userId}>
        {!dataReady ? (
          <LoadingState label="Chargement des données…" />
        ) : (
          <>
            {view === "dashboard" && <Dashboard role={role} factures={factures} devis={devis} clients={clients} projets={projets} setView={setView} />}
            {view === "finance" && canManageFinance && (
              <Finance paiements={paiements} depenses={depenses} clients={clients}
                saveDepense={saveDepense} deleteDepense={deleteDepense} userId={userId}
                notify={notify} canManage={canManageFinance} canDelete={isAdmin} />
            )}
            {view === "projets" && (
              <Projets projets={projets} clients={clients} devis={devis} factures={factures}
                prestataires={prestataires} liensPrestataires={liensPrestataires} taches={taches}
                fichiersProjets={fichiersProjets}
                affecterPrestataire={affecterPrestataire} detacherPrestataire={detacherPrestataire}
                saveTache={saveTache} deleteTache={deleteTache}
                saveProjet={saveProjet} changerStatut={changerStatut} deleteProjet={deleteProjet}
                lierDevis={lierProjetDevis} lierFacture={lierProjetFacture}
                uploadFichier={uploadFichier} supprimerFichier={supprimerFichier}
                notify={notify} canManage={canManageProjets} canDelete={isAdmin} />
            )}
            {view === "prestataires" && (
              <Prestataires projets={projets} prestataires={prestataires} liens={liensPrestataires}
                taches={taches} contrats={contracts}
                onSavePrestataire={savePrestataire} onDeletePrestataire={deletePrestataire}
                affecterPrestataire={affecterPrestataire} detacherPrestataire={detacherPrestataire}
                onSaveTache={saveTache} onDeleteTache={deleteTache} inviterPrestataire={inviterPrestataire}
                notify={notify} canManage={canManageProjets} canDelete={isAdmin} />
            )}
            {view === "clients" && <Clients clients={clients} onSaveClient={saveClient} devis={devis} factures={factures} projets={projets} notify={notify} canEdit={canManageClients} />}
            {view === "produits" && <Produits produits={produits} onSaveProduit={saveProduit} notify={notify} canEdit={canManageProduits} />}
            {view === "devis" && (
              <Devis devis={devis} clients={clients} produits={produits} projets={projets} entreprise={entreprise}
                createDevis={createDevis} updateDevis={updateDevis} marquerTransforme={marquerTransforme}
                creerDepuisDevis={creerDepuisDevis} lierProjet={lierProjetDevis} notify={notify} onPrint={requestPrint} canCreate={canCreateDevis} />
            )}
            {view === "factures" && (
              <Factures factures={factures} clients={clients} produits={produits} projets={projets} paiements={paiements} entreprise={entreprise}
                createFacture={createFacture} enregistrerPaiement={enregistrerPaiement} marquerProjetTermine={marquerProjetTermine}
                lierProjet={lierProjetFacture} deleteFacture={deleteFacture}
                notify={notify} onPrint={requestPrint} canManage={canManageFactures} canDelete={isAdmin} />
            )}
            {view === "contrats" && isAdmin && (
              <Contracts templates={templates} contracts={contracts} clients={clients} factures={factures} devis={devis} projets={projets} prestataires={prestataires} entreprise={entreprise}
                saveTemplate={saveTemplate} uploadTemplateSource={uploadTemplateSource} suggestTemplateFromSource={suggestTemplateFromSource}
                suggestContractFields={suggestContractFields} saveContract={saveContract} updateContract={updateContract} updateStatus={updateContractStatus} notify={notify} />
            )}
            {view === "rapports" && <Rapports factures={factures} clients={clients} entreprise={entreprise} notify={notify} />}
            {view === "utilisateurs" && isAdmin && (
              <Users profiles={profiles} invitations={invitations} invitationsAcceptees={invitationsAcceptees} changeRole={changeRole} invite={invite} resendInviteEmail={resendInviteEmail}
                cancelInvitation={cancelInvitation} notify={notify} currentUserId={userId} entreprise={entreprise} />
            )}
            {view === "entreprise" && <Entreprise entreprise={entreprise} onSaveProfil={saveProfil} uploadLogo={uploadLogo} notify={notify} canEdit={isAdmin} />}
            {view === "parametres" && <Parametres entreprise={entreprise} onSaveParametres={saveParametres} notify={notify} canEdit={isAdmin} />}
          </>
        )}
      </Shell>
      {!online && (
        <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: T.brick, color: "#fff", padding: "9px 18px", borderRadius: 30, fontSize: 12.5, zIndex: 200, boxShadow: "0 6px 20px rgba(22,33,58,.25)" }}>
          Hors ligne — les modifications seront synchronisées automatiquement ({pendingCount} en attente)
        </div>
      )}
      <Toast message={toast} />
      <Analytics />
    </>
  );
}
