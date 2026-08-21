export const todayISO = () => new Date().toISOString().slice(0, 10);

export const LOCKED_STATUTS = ["Accepté", "Refusé", "Expiré", "Annulée"];

export const mkLine = (produit, qty = 1, remise = 0) => ({
  id: Math.random().toString(36).slice(2, 8),
  produitId: produit.id,
  nom: produit.nom,
  description: "",
  prixHT: produit.prixHT,
  tva: produit.tva,
  qty,
  remise,
});

export const ligneMontant = (l) => l.prixHT * l.qty * (1 - l.remise / 100);

export const totals = (lignes, remiseGlobale = 0) => {
  let ht = 0, tvaTot = 0;
  lignes.forEach((l) => {
    const base = ligneMontant(l);
    ht += base;
    tvaTot += base * (l.tva / 100);
  });
  const discountFactor = remiseGlobale > 0 ? (1 - Math.min(100, Math.max(0, Number(remiseGlobale))) / 100) : 1;
  const htNet = ht * discountFactor;
  const tvaNet = tvaTot * discountFactor;
  return { ht: htNet, htBrut: ht, tva: tvaNet, ttc: htNet + tvaNet };
};

// Source unique de vérité pour "montant encaissé" — utilisée partout
// (Tableau de bord, Rapports…) pour que le même chiffre s'affiche partout.
// Se base sur `regle` (montant réellement réglé par le client), qui inclut
// aussi bien les factures payées en totalité que les paiements partiels.
export const montantEncaisseTotal = (factures) =>
  factures.reduce((s, f) => s + Number(f.regle || 0), 0);

export const montantPaiementsPartiels = (factures) =>
  factures.filter((f) => f.statut === "Partiellement payée").reduce((s, f) => s + Number(f.regle || 0), 0);

// --- Alertes d'échéance des tâches (calcul à l'affichage) ---
export const SEUIL_ALERTE_JOURS = 3;

export const alerteTache = (tache) => {
  if (!tache || !tache.echeance || tache.statut === "Terminée") return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(`${tache.echeance}T00:00:00`);
  const jours = Math.round((due - today) / 86400000);
  if (jours < 0) return { level: "retard", jours: -jours };
  if (jours <= SEUIL_ALERTE_JOURS) return { level: "proche", jours };
  return null;
};
