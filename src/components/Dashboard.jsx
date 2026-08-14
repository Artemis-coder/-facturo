import React from "react";
import { DashboardAdmin } from "./DashboardAdmin";
import { DashboardComptable } from "./DashboardComptable";
import { DashboardCommercial } from "./DashboardCommercial";
import { DashboardEmploye } from "./DashboardEmploye";

// Chaque rôle a un tableau de bord pensé pour ce qui lui est utile :
// - Administrateur / Super Admin : vue complète (finance, devis, factures, projets)
// - Comptable : suivi financier + devis à vérifier (lecture seule)
// - Commercial : prospects, clients validés, projets en cours — jamais la finance
// - Employé : uniquement ses propres devis/factures (déjà filtré par les RLS)
export function Dashboard({ role, factures, devis, clients, projets, setView }) {
  if (role === "comptable") {
    return <DashboardComptable devis={devis} factures={factures} clients={clients} setView={setView} />;
  }
  if (role === "commercial") {
    return <DashboardCommercial devis={devis} clients={clients} projets={projets} setView={setView} />;
  }
  if (role === "employe") {
    return <DashboardEmploye devis={devis} factures={factures} clients={clients} setView={setView} />;
  }
  // administrateur / super_admin / fallback
  return <DashboardAdmin factures={factures} devis={devis} clients={clients} setView={setView} />;
}
