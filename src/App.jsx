import React, { useState } from "react";
import { useAuth } from "./lib/useAuth";
import { isSupabaseConfigured } from "./lib/supabaseClient";
import { useClients } from "./lib/useClients";
import { useProduits } from "./lib/useProduits";
import { useDevis } from "./lib/useDevis";
import { useFactures } from "./lib/useFactures";
import { useEntreprise } from "./lib/useEntreprise";
import { useUsers } from "./lib/useUsers";
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
import { PrintArea } from "./components/PrintArea";
import { Toast } from "./components/ui";

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
  #print-area { display: none; }
  @media print {
    body * { visibility: hidden; }
    #print-area, #print-area * { visibility: visible; }
    #print-area { display: block; position: absolute; top: 0; left: 0; width: 100%; }
  }
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
  const { session, profile, loading, signIn, signUp, signOut } = useAuth();
  const [view, setView] = useState("dashboard");
  const [toast, setToast] = useState("");
  const notify = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2200); };
  const [printJob, setPrintJob] = useState(null);
  const requestPrint = (doc, type, client) => {
    setPrintJob({ doc, type, client });
    setTimeout(() => window.print(), 120);
  };

  const entrepriseId = profile?.entreprise_id;
  const userId = session?.user?.id;
  const role = profile?.role;

  const { clients, saveClient, loading: loadingClients } = useClients(entrepriseId);
  const { produits, saveProduit, loading: loadingProduits } = useProduits(entrepriseId);
  const { devis, createDevis, updateDevis, marquerTransforme, loading: loadingDevis } = useDevis(entrepriseId, userId);
  const { factures, createFacture, creerDepuisDevis, enregistrerPaiement, marquerProjetTermine, deleteFacture, loading: loadingFactures } = useFactures(entrepriseId, userId);
  const { entreprise, saveProfil, saveParametres, loading: loadingEntreprise } = useEntreprise(entrepriseId);
  const { profiles, invitations, changeRole, invite, cancelInvitation } = useUsers(entrepriseId);

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
    return (<><GlobalStyles /><FullscreenMessage>Chargement…</FullscreenMessage></>);
  }

  if (!session) {
    return (<><GlobalStyles /><Login onSignIn={signIn} onSignUp={signUp} /></>);
  }

  if (!profile) {
    return (<><GlobalStyles /><FullscreenMessage>Création de votre espace en cours…</FullscreenMessage></>);
  }

  const dataReady = !loadingClients && !loadingProduits && !loadingDevis && !loadingFactures && !loadingEntreprise;
  const isAdmin = role === "administrateur" || role === "super_admin";
  const canManageClients = ["administrateur", "comptable", "commercial", "super_admin"].includes(role);
  const canManageProduits = ["administrateur", "comptable", "super_admin"].includes(role);
  const canCreateDevis = ["administrateur", "commercial", "super_admin"].includes(role);
  const canManageFactures = ["administrateur", "comptable", "super_admin"].includes(role);

  return (
    <>
      <GlobalStyles />
      <Shell view={view} setView={setView} onLogout={signOut} entreprise={entreprise} role={role}>
        {!dataReady ? (
          <div style={{ color: T.inkSoft, fontSize: 13 }}>Chargement des données…</div>
        ) : (
          <>
            {view === "dashboard" && <Dashboard factures={factures} devis={devis} clients={clients} setView={setView} />}
            {view === "clients" && <Clients clients={clients} onSaveClient={saveClient} devis={devis} factures={factures} notify={notify} canEdit={canManageClients} />}
            {view === "produits" && <Produits produits={produits} onSaveProduit={saveProduit} notify={notify} canEdit={canManageProduits} />}
            {view === "devis" && (
              <Devis devis={devis} clients={clients} produits={produits}
                createDevis={createDevis} updateDevis={updateDevis} marquerTransforme={marquerTransforme}
                creerDepuisDevis={creerDepuisDevis} notify={notify} onPrint={requestPrint} canCreate={canCreateDevis} />
            )}
            {view === "factures" && (
              <Factures factures={factures} clients={clients} produits={produits}
                createFacture={createFacture} enregistrerPaiement={enregistrerPaiement} marquerProjetTermine={marquerProjetTermine} deleteFacture={deleteFacture}
                notify={notify} onPrint={requestPrint} canManage={canManageFactures} canDelete={isAdmin} />
            )}
            {view === "rapports" && <Rapports factures={factures} clients={clients} notify={notify} />}
            {view === "utilisateurs" && isAdmin && (
              <Users profiles={profiles} invitations={invitations} changeRole={changeRole} invite={invite}
                cancelInvitation={cancelInvitation} notify={notify} currentUserId={userId} />
            )}
            {view === "entreprise" && <Entreprise entreprise={entreprise} onSaveProfil={saveProfil} notify={notify} canEdit={isAdmin} />}
            {view === "parametres" && <Parametres entreprise={entreprise} onSaveParametres={saveParametres} notify={notify} canEdit={isAdmin} />}
          </>
        )}
      </Shell>
      <Toast message={toast} />
      <PrintArea printJob={printJob} entreprise={entreprise} />
    </>
  );
}
