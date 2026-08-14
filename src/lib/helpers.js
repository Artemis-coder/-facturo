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

export const totals = (lignes) => {
  let ht = 0, tvaTot = 0;
  lignes.forEach((l) => {
    const base = ligneMontant(l);
    ht += base;
    tvaTot += base * (l.tva / 100);
  });
  return { ht, tva: tvaTot, ttc: ht + tvaTot };
};

// Source unique de vérité pour "montant encaissé" — utilisée partout
// (Tableau de bord, Rapports…) pour que le même chiffre s'affiche partout.
// Se base sur `regle` (montant réellement réglé par le client), qui inclut
// aussi bien les factures payées en totalité que les paiements partiels.
export const montantEncaisseTotal = (factures) =>
  factures.reduce((s, f) => s + Number(f.regle || 0), 0);

export const montantPaiementsPartiels = (factures) =>
  factures.filter((f) => f.statut === "Partiellement payée").reduce((s, f) => s + Number(f.regle || 0), 0);
