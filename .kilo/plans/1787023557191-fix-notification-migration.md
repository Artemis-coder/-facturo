# Pré-push : fix bugs bloquants + audit §6 + commit + push

## But
Pousser sur `origin/main` le lot notifications/statuts/timeline de façon sûre, conformément à AGENTS.md (Grille d'Audit §6 de CONTROLE_DE_SECURITE.md).

## Contexte vérifié
- 14 fichiers modifiés + 5 non suivis (`NotifsBell.jsx`, `useNotifications.js`, `0022_statuts_notifications.sql`, 2 plan files).
- `Timeline` existe bien dans `src/components/ui/index.js:11`.
- `usePrestataires.js:31-42` mappe les tâches en camelCase (`projetId`, `parentTaskId`, `statut`, `echeance`).
- `profiles`/`entreprises` existent (0001) → la migration 0022 est valide ; l'erreur « Load failed (api.supabase.com) » est un problème d'application CLI/réseau, pas du SQL.

## Tâches ordonnées

### 1. Fix import manquant — `src/components/Prestataires.jsx:10`
Ajouter `Timeline` à l'import `./ui`.

### 2. Fix clés timeline — `src/components/Prestataires.jsx:399-456`
Remplacer dans la section « Suivi des tâches » :
- `t.parent_task_id` → `t.parentTaskId` (filtres lignes 408 et 424, et recherche du parent ligne 438)
- `t.projet_id` → `t.projetId` (lignes 415 et 431)
- Tri : ne pas parser `new Date(date formatée fr-FR)` ; trier sur `t.echeance` brut (ISO) ascendant, échéances nulles/vides à la fin (« Sans échéance » en dernier).

### 3. Fix création sous-tâche — `src/components/PortalPrestataire.jsx`
- Destructurer `addSousTache`, `deleteSousTache`, `changerStatutSousTache` depuis `usePrestatairePortal` (ligne 36).
- Supprimer les versions locales `addSousTache` (l. 103-119) et `deleteSousTache` (l. 121-127) ; la version du hook a la bonne signature `(parentId, titre, echeance, statut)` et résout `projet_id` depuis la tâche parente.
- Appel `onAdded` ligne 464 : `await addSousTache(drawerTask.id, titre, echeance, statut)` ; après succès, re-fetcher la tâche du tiroir depuis `taches` rechargées (le hook fait `reload()` interne).

### 4. Sélecteur de statut par sous-tâche (validation du plan) — `SousTacheList` (PortalPrestataire.jsx:506)
- Passer `onChangeStatut` à `SousTacheList` (branché sur `changerStatutSousTache`).
- Remplacer le simple `<Badge statut>` de chaque sous-tâche par un petit `Select` (`STATUTS_TACHE`) qui appelle `onChangeStatut(sousTache, valeur)`, comme pour la tâche parente (l. 456).

### 5. Audit sécurité §6 (AGENTS.md) — avant tout commit
1. `bun install` si besoin puis `bun audit` → 0 vulnérabilité.
2. `bun run build` → succès.
3. Relecture intégrale de `git diff` (déjà partiellement faite cette session).
4. Secrets :
   - `grep -riE "SERVICE_ROLE|SUPABASE_JWT_SECRET|service_role" src/` → vide
   - `grep -rE "eyJ[A-Za-z0-9_-]{20,}" . --include="*.js" --include="*.jsx" --include="*.ts" --include="*.json" --include="*.md"` → vide
   - aucun `.env` stagé (seul `.env.example` sans valeurs réelles autorisé)
5. `grep -r "console.log" src/` → rien de sensible.
6. RLS : migration 0022 — table `notifications` avec RLS, select/update restreints à `destinataire_user_id = auth.uid()`, pas de policy insert client (inserts via `notify_evenement` security definer). ✓ déjà dans le SQL.
7. RBAC : statuts « Bloquée »/« Résilié » bloqués côté UI **et** via check constraints DB.

### 6. Commit + push
- `git add` des fichiers suivants (explicitement, pas de `git add -A`) :
  - `src/**` modifiés + `NotifsBell.jsx`, `useNotifications.js`
  - `supabase/migrations/0022_statuts_notifications.sql`
  - `supabase/email-templates/*` (rebranding Ma Bouate — confirmer avec l'utilisateur que c'est intentionnel)
  - `.kilo/plans/*` (fichiers déjà suivis par le repo)
- Message de commit dans le style du log existant (français, préfixe feat/fix) :
  `feat(notifications): statuts Bloquée/Résilié, notifications temps réel, timeline suivi tâches (0022)`
- `git push origin main`.

## Échec / rollback
- Si un contrôle §6 échoue : corriger puis re-auditer avant de pousser (règle de blocage AGENTS.md).
- Si la migration 0022 échoue à l'application sur Supabase : SQL syntaxiquement correct ; l'erreur « Load failed (api.supabase.com) » est CLI/réseau → réessayer, ou appliquer via l'éditeur SQL du dashboard, section par section.

## Validation post-push
- Build vert, audit 0.
- Côté app (après application de la migration) : ajouter une sous-tâche avec statut « Bloquée » dans le tiroir de tâche ; changer le statut d'une sous-tâche existante → notification admin reçue ; timeline de la fiche prestataire affiche tâches/sous-tâches avec projet correct et badge « Bloquée ».

## Notes
- `STATUTS_TACHE` doit rester synchronisé entre `Prestataires.jsx:14`, `PortalPrestataire.jsx:23`, `Projets.jsx:10`.
- La timeline utilise `Timeline` de `./ui` (items `{ title, date, detail }`).
