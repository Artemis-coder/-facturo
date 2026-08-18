# KPIs portails + statuts Bloquée/Résilié + suivi admin + notifications temps réel avec son

## Décisions arrêtées avec l'utilisateur
1. **4 événements notifiés** : tâche/mission attribuée (admin→prestataire), tâche bloquée (prestataire→admin), tâche terminée (prestataire→admin), changement de statut contrat (les deux sens).
2. **« Projets bloqués » = dérivé** : projet ayant ≥ 1 tâche au statut « Bloquée » (pas de nouveau statut projet).
3. **Suivi admin = timeline dans la fiche prestataire** existante (réutilisation de `ui/Timeline.jsx`).

## Contraintes découvertes dans le code
- `taches.statut` check : `('À faire','En cours','Terminée')` (0016:40) → extension requise.
- `contracts.statut` check : `('Brouillon','Envoyé','Signé')` (0013:24) → ajouter 'Résilié'.
- `projets.statut` : inchangé ('En cours','Terminé','Annulé').
- `KpiBar` et `Timeline` existent dans `src/components/ui/` → réutilisation.
- Aucun usage realtime actuel dans le front ; aucun système de notifications existant.

## Tâches ordonnées

### 1. Migration `supabase/migrations/0022_statuts_notifications.sql`
- `taches.statut` : drop check existant, recréer avec `('À faire','En cours','Terminée','Bloquée')`.
- `contracts.statut` : drop check existant, recréer avec `('Brouillon','Envoyé','Signé','Résilié')`.
- Table `public.notifications` :
  ```
  id uuid pk, entreprise_id uuid not null (FK entreprises),
  destinataire_user_id uuid not null (FK auth.users) on delete cascade,
  type text not null (check: 'tache_attribuee','mission_attribuee','tache_bloquee','tache_terminee','contrat_change'),
  titre text not null, message text not null,
  lu boolean not null default false,
  created_at timestamptz default now()
  ```
  Index sur (destinataire_user_id, lu, created_at desc). RLS = destinataire lit/sa propre ligne, update pour marquer lu (destinataire uniquement), pas d'insert côté client (inserts faits par fonction definer).
- Fonction security definer `public.notify_evenement(p_destinataire uuid, p_entreprise uuid, p_type text, p_titre text, p_message text)` : insert direct (bypass RLS), utilisée par le front pour créer des notifs sans avoir le droit d'insert générique.
- Fonction security definer `public.get_admin_user_ids(p_entreprise uuid)` : retourne les `auth.uid()` des profils administrateur de l'entreprise (le prestataire ne peut pas lister la team ; cette fonction ne renvoie que des UUIDs d'admins).
- Activer la **replication** sur `notifications` (nécessaire au realtime) : `alter publication supabase_realtime add table public.notifications;`

### 2. Hook `src/lib/useNotifications.js` (nouveau)
- `useNotifications(userId)` : charge les 30 dernières notifs (`lu` d'abord false), compte non-lues.
- Abonnement realtime : `supabase.channel('notifs-' + userId).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'destinataire_user_id=eq.' + userId }, cb)` — à la réception → prepend, incrémenter compteur, **jouer le son**, déclencher notification navigateur si permission accordée.
- `marquerLues(ids)` : update lu=true.
- Son : WebAudio API (oscillateur bref, 2 notes) — aucun fichier audio à ajouter, pas d'asset. Fonction `jouerSonNotification()` exportée.
- Nettoyage du channel au unmount.

### 3. Insertion des notifications aux bons endroits (appels à `notify_evenement`)
- **`src/lib/usePrestataires.js`** :
  - `affecterPrestataire` : notif `mission_attribuee` au prestataire (via son `user_id` s'il a un compte, sinon pas de notif) : « Vous avez été affecté au projet X ».
  - `saveTache` (création admin) : notif `tache_attribuee` au prestataire concerné.
- **`src/lib/usePrestatairePortal.js`** :
  - `changerStatutTache` vers 'Bloquée' : notifs `tache_bloquee` à tous les admins (`get_admin_user_ids`).
  - vers 'Terminée' : notifs `tache_terminee` aux admins.
  - Idem pour les sous-tâches (`changerStatutSousTache`, nouvelle fonction du hook) : Bloquée → admins, Terminée → admins.
- **Contrats** (`src/components/Contracts.jsx` ou là où le statut contrat change) : à chaque update de statut (`Signé`, `Résilié`) → notifs `contrat_change` aux admins et, si le contrat a un `prestataire_id` avec compte lié, au prestataire. Vérifier le lieu exact de changement de statut lors de l'implémentation.

### 4. Portail prestataire — KPIs (`src/components/PortalPrestataire.jsx`)
- **Menu Mes tâches** : `KpiBar` 4 items — À faire / En cours / Terminée / Bloquée. Comptage des tâches parentes uniquement (`!t.parentTaskId`). Icônes lucide existantes + ton couleurs (gold/teal/ink/brick).
- **Menu Mes contrats** : `KpiBar` 3 items — Signés / En attente (= statut 'Envoyé') / Résiliés.
- **Menu Mes projets** : `KpiBar` 4 items — En cours / Terminés / Bloqués (projet avec ≥1 tâche bloquée) / Attribués (= total liens).
- **Sous-tâches** : dans `SousTacheList`, ajouter un `Select` de statut par sous-tâche (`STATUTS_TACHE` étendu avec « Bloquée ») qui appelle `changerStatutSousTache` ; le dropdown de statut de la tâche parente (tiroir) gagne aussi l'option « Bloquée ».
- Notifications : brancher `useNotifications` ; cloche `Bell` avec badge dans le header du portail (réutiliser le style), dropdown liste + « Tout marquer lu », son + notification navigateur.

### 5. Espace admin — suivi/chronogramme (`src/components/Prestataires.jsx`)
- Dans `PrestataireDetail` (fiche) : nouvelle section **« Suivi des tâches »** avec le composant `Timeline` : items = tâches + sous-tâches du prestataire triées par échéance (tâches parentes puis sous-tâches imbriquées), chaque item montrant titre, projet, statut (badge, « Bloquée » en tone brick), échéance.
- Ajouter `STATUTS_TACHE = ["À faire", "En cours", "Terminée", "Bloquée"]` (export existant, Prestataires.jsx:14) — le formulaire admin de tâche hérite automatiquement de l'option.

### 6. Espace admin — cloche de notifications (`src/components/Shell.jsx`)
- Header (Shell.jsx:191) : icône `Bell` avec badge compteur, dropdown des notifs (titre, message, date, état lu/non-lu), « Tout marquer comme lu ».
- Brancher `useNotifications(session.user.id)` dans App.jsx et passer au Shell. Son + notification navigateur à la réception.

### 7. Audit sécurité + build + push
- `npm audit` = 0, `npm run build` = succès (PATH `/opt/homebrew/bin`).
- Greps §6 : SERVICE_ROLE, JWT, console.log, `.env`.
- Relecture du diff, commit `feat(...)` + push.

## Action requise de l'utilisateur
- Appliquer la migration **0022** dans Supabase → SQL Editor → Run.
- Vérifier que Realtime est activé (la migration ajoute la table à la publication `supabase_realtime`).

## Validation
1. Admin affecte un prestataire à un projet → le prestataire (connecté) reçoit la notif en temps réel avec son (2 navigateurs pour le test).
2. Prestataire passe une tâche à « Bloquée » → l'admin reçoit la notif + son ; le KPI Bloquée du prestataire devient 1 ; le projet apparaît dans le KPI « Bloqués ».
3. Prestataire termine une tâche → notif admin « tâche terminée ».
4. Contrat marqué « Résilié » → KPI portail prestataire à jour + notif admin.
5. Fiche prestataire côté admin → timeline de suivi affiche les tâches/sous-tâches avec statuts et échéances.
6. KPIs corrects : comptages cohérents avec les données réelles (0 vs N).
7. RLS : un prestataire ne lit que SES notifications (test select avec 2 prestataires).

## Risques
- Realtime requiert la table dans la publication ; si Supabase est en plan gratuit avec Realtime limité, repli simple : polling 30 s dans `useNotifications` (mentionner si le test échoue).
- Les notifications admin nécessitent `get_admin_user_ids` : si une entreprise n'a aucun admin, pas d'insert → ne pas bloquer sur ce cas.
- Le son WebAudio peut être bloqué avant une première interaction utilisateur sur la page (politique navigateur) — acceptable : le son fonctionne si l'utilisateur est actif sur la page.
- « Résilié » sur contrats existants : aucune donnée n'est touchée (extension de check uniquement).
