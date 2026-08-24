import { MOIS_FR } from "../components/DashboardAdmin";

export function evolutionMensuelle(items, dateField = "date", valueField = "montant", months = 6) {
  const now = new Date();
  const map = new Map();
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    map.set(key, { key, mois: MOIS_FR[d.getMonth()], valeur: 0 });
  }
  items.forEach((it) => {
    const d = new Date(it[dateField]);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const m = map.get(key);
    if (m) m.valeur += Number(it[valueField] || 0);
  });
  return Array.from(map.values());
}

export function groupByStatus(items, statusField = "statut", labelMap = null) {
  const counts = {};
  items.forEach((it) => {
    const s = it[statusField];
    counts[s] = (counts[s] || 0) + 1;
  });
  return Object.entries(counts).map(([statut, valeur]) => ({
    statut: labelMap?.[statut] || statut,
    valeur,
  }));
}

export function topNClientsByCA(factures, clients, n = 5) {
  const totals = new Map();
  factures.forEach((f) => {
    const cid = f.clientId;
    totals.set(cid, (totals.get(cid) || 0) + Number(f.regle || 0));
  });
  return Array.from(totals.entries())
    .map(([clientId, total]) => {
      const c = clients.find((cl) => cl.id === clientId);
      return { nom: c ? c.societe || c.nom : "Inconnu", total };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, n);
}
