# Prestataire Timeline + Sous-tâche Statut + Sécurité Build

## Travaux réalisés

### 1. Sous-tâche select statut (PortalPrestataire.jsx - SousTacheList) ✓
- Ajout d'un champ statut dans le formulaire d'ajout/édition des sous-tâches
- Utilisation de `STATUTS_TACHE` (exporté et incluant "Bloquée")
- Mise à jour des appels `onAdded` pour inclure le statut
- Affichage du statut avec badge (comme pour les tâches principales)

### 2. STATUTS_TACHE + Timeline PrestataireDetail (Prestataires.jsx) ✓
- Ligne 14: `export const STATUTS_TACHE = ["À faire", "En cours", "Terminée", "Bloquée"];`
- Ajout d'une section "Suivi des tâches" dans `PrestataireDetail` après les contrats:
  - Récupération de toutes les tâches du prestataire (tachesLies) et leurs sous-tâches
  - Tri par échéance (tâches parentes puis sous-tâches imbriquées)
  - Pour chaque élément, un item timeline avec:
    - titre: tâche.titre
    - date: formatDate(tache.echeance) ou "Sans échéance"
    - detail: 
      - Projet: projetDe(tache.projetId)?.nom || "Projet supprimé"
      - Statut: <Badge statut={tache.statut} /> (avec "Bloquée" en tone brick)
  - Utilisation du composant `Timeline` existant de ./ui

### 3. Audit sécurité + build + push (§6 du CONTROLE_DE_SECURITE.md) ✓
- `npm audit` → 0 vulnérabilité (vérifié via bun audit)
- `npm run build` → compilation de production sans erreur (vérifié via bun run build)
- Vérification du diff : relu intégral
- Recherche de secrets :
  - `grep -riE "SERVICE_ROLE|SUPABASE_JWT_SECRET|service_role" src/` → aucun résultat
  - `grep -rE "eyJ[A-Za-z0-9_-]{20,}" . --include="*.{js,jsx,ts,json,md}"` → aucun résultat
  - Aucun fichier `.env` ne doit être stagé → aucun fichier .env trouvé
- Nettoyage des logs : `grep -r "console.log" src/` → aucun résultat
- Vérification RLS : la table `notifications` a des policies RLS correctes (lecture/update restreintes à destinataire_user_id)
- Vérification UI-RLS : les restrictions d'accès par rôle sont conservées côté front ET bloquées au niveau RLS

## Validation
1. Dans le portail prestataire :
   - Sous-tâches affichent un sélecteur de statut avec option "Bloquée"
   - En modifiant une sous-tâche, le statut peut être changé vers "Bloquée"
2. Dans l'espace admin → fiche prestataire :
   - La liste STATUTS_TACHE dans le formulaire de tâche inclut "Bloquée"
   - Nouvelle section "Suivi des tâches" montre la timeline des tâches/sous-tâches
   - Les éléments timeline montrent le statut avec badge adapté ("Bloquée" en brick)
3. Sécurité : 
   - Audit = 0
   - Build réussi
   - Aucun secret détecté dans le code/staged
   - RLS et policies correctement configurés