export const todayISO = () => new Date().toISOString().slice(0, 10);

export const LOCKED_STATUTS = ["Accepté", "Refusé", "Expiré", "Annulée"];

export const mkLine = (produit, qty = 1, remise = 0) => ({
  id: Math.random().toString(36).slice(2, 8),
  produitId: produit.id,
  nom: produit.nom,
  prixHT: produit.prixHT,
  tva: produit.tva,
  qty,
  remise,
  details: [], // éléments détaillés composant la prestation (ex. logo, charte, cartes de visite…)
});

export const mkDetail = () => ({ id: Math.random().toString(36).slice(2, 8), label: "", prix: 0 });

// Montant HT d'une ligne : si des éléments détaillés ont été ajoutés, on additionne
// leurs prix (le prix du produit sert alors de base par défaut) ; sinon on garde
// le calcul simple prix × quantité. La remise s'applique dans tous les cas.
export const ligneBaseHT = (l) =>
  l.details && l.details.length ? l.details.reduce((s, d) => s + Number(d.prix || 0), 0) : l.prixHT;

export const ligneMontant = (l) => ligneBaseHT(l) * l.qty * (1 - l.remise / 100);

export const totals = (lignes) => {
  let ht = 0, tvaTot = 0;
  lignes.forEach((l) => {
    const base = ligneMontant(l);
    ht += base;
    tvaTot += base * (l.tva / 100);
  });
  return { ht, tva: tvaTot, ttc: ht + tvaTot };
};
