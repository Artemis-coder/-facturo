# Espace Prestataire : compte de connexion, contrats liés, tâches et alertes

## Objectif
Faire du prestataire un vrai utilisateur connecté avec un portail dédié, et enrichir sa fiche côté admin :
1. **Fiche prestataire (admin)** : projets *(déjà fait)* + contrats liés + tâches par projet.
2. **Tâches** : to-do par prestataire/projet, statuts « À faire / En cours / Terminée », dates d'échéance.
3. **Compte prestataire** : nouveau rôle `prestataire` (enum SQL), invitation par e-mail depuis la fiche (lien magique), liaison automatique compte ↔ fiche.
4. **Portail prestataire** : il ne voit QUE ses projets, ses contrats (lecture seule, brouillons masqués), ses tâches (création + changement de statut, suppression réservée à l'admin).
5. **Alertes in-app** : calculées à l'affichage — tâches non terminées en retard (échéance < aujourd'hui) ou à ≤ 3 jours → bannière + badges. Seuil `SEUIL_ALERTE_JOURS = 3` en constante.

## Décisions validées
- Invitation depuis la fiche prestataire ; liaison auto compte ↔ fiche par e-mail (trigger étendu).
- Contrats : colonne `prestataire_id` sur `contracts` ; le prestataire voit les siens en lecture seule, statut ≠ Brouillon.
- Tâches : 3 statuts ; prestataire crée + change statut, admin supprime.
- Alertes : calcul à l'affichage (pas de cron/infra).
- Invitation possible par admin / comptable / commercial.

## Tâches

### 1. Migration `supabase/migrations/0015_espace_prestataire.sql`
```sql
alter type public.user_role add value if not exists 'prestataire';
```
(enrober dans `do $$ ... exception when duplicate_object ...` si problème de transaction)

- **`prestataires`** : ajouter `user_id uuid references auth.users(id)` (nullable) + index unique partiel sur `user_id` où non null.
- **`invitations`** : ajouter `prestataire_id uuid references public.prestataires(id)` (nullable).
- **Nouvelle table `taches`** :
  ```sql
  create table public.taches (
    id uuid primary key default gen_random_uuid(),
    entreprise_id uuid not null references public.entreprises(id) on delete cascade,
    projet_id uuid not null references public.projets(id) on delete cascade,
    prestataire_id uuid not null references public.prestataires(id) on delete cascade,
    titre text not null check (char_length(trim(titre)) > 0),
    description text not null default '',
    statut text not null default 'À faire' check (statut in ('À faire', 'En cours', 'Terminée')),
    echeance date,
    created_by uuid references public.profiles(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  );
  ```
  Index : `(entreprise_id, projet_id)`, `(prestataire_id)`.
- **`contracts`** : `alter table public.contracts add column if not exists prestataire_id uuid references public.prestataires(id) on delete set null;`
- **Fonctions helper** (security definer, `search_path = public`, comme migration 0001:57-70) :
  - `public.current_prestataire_id()` → `select id from public.prestataires where user_id = auth.uid() limit 1`.
  - `public.is_assigned_to_prestataire(p_projet_id uuid)` → existence dans `projet_prestataires` avec `prestataire_id = public.current_prestataire_id()`.
- **Trigger `handle_new_user` étendu** (remplace la version migration 0003) : après création du profil, si `invite.prestataire_id is not null` → `update public.prestataires set user_id = new.id where id = invite.prestataire_id and user_id is null;`
- **RLS** (toutes les tables activées ; zero-trust §1) :
  - `taches` : SELECT = même entreprise (admin/comptable/commercial/super_admin) OU `prestataire_id = public.current_prestataire_id()` ; INSERT/UPDATE = ces rôles entreprise OU prestataire avec `prestataire_id = public.current_prestataire_id() and public.is_assigned_to_prestataire(projet_id)` et `entreprise_id = public.current_entreprise_id()` ; DELETE = administrateur uniquement.
  - `prestataires` : ajouter SELECT `id = public.current_prestataire_id()` (le prestataire lit sa propre fiche) ; UPDATE de `user_id` réservé admin (policy existante déjà admin/comptable/commercial — restreindre : garder telle quelle, l'admin pose le user_id via invitation ; acceptable).
  - `projet_prestataires` : ajouter SELECT pour le prestataire `prestataire_id = public.current_prestataire_id()`.
  - `projets` : ajouter SELECT pour le prestataire `public.is_assigned_to_prestataire(id)`.
  - `contracts` : ajouter SELECT pour le prestataire `prestataire_id = public.current_prestataire_id() and statut <> 'Brouillon'`.
  - `invitations` : élargir la policy existante (admin seul, migration 0003:19-22) à admin/comptable/commercial en `for all`.
  - Ne pas toucher les policies existantes sinon.

### 2. Hook `src/lib/usePrestataires.js` — extension
- Ajouter `TACHE_SELECT` explicite : `"id, projet_id, prestataire_id, titre, description, statut, echeance, created_by, created_at, updated_at"`.
- Charger aussi les tâches dans `load()` (3 requêtes parallèles) + `mapTache`.
- Nouvelles fonctions :
  - `saveTache(form)` : insert si pas d'id, sinon update (`updated_at`), puis reload.
  - `deleteTache(id)`.
  - `inviterPrestataire(prestataire)` : validation email requis côté UI ; insert `invitations` `{ entreprise_id, email: prestataire.email, role: 'prestataire', prestataire_id: prestataire.id, invited_by: userId }` puis `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: window.location.origin } })` (même mécanique que `useUsers.js:27-40`). Retourner `{ error, emailError }`.
- Exports enrichis : `taches, saveTache, deleteTache, inviterPrestataire`.

### 3. Hook `src/lib/useContracts.js` — colonne prestataire
- `CONTRACT_SELECT` : ajouter `prestataire_id` ; `mapContract` : ajouter `prestataireId`.
- `saveContract` et `updateContract` : ajouter `prestataire_id: form.prestataireId || null`.

### 4. Module Contrats — lier un prestataire (`src/components/Contracts.jsx`)
- `Contracts` reçoit `prestataires` (depuis App.jsx).
- `ContractBuilder` : nouveau champ « Prestataire associé (optionnel) » (Select sur `prestataires`, option « — Aucun — »), initialisé depuis `initial?.prestataireId`, inclus dans le payload `onSave`.
- `ContractFallbackEditor` : idem.
- `ContractPreview` : afficher le nom du prestataire si lié.
- Table des contrats : ajouter colonne « Prestataire ».

### 5. Fiche prestataire enrichie (`src/components/Prestataires.jsx`)
- Props supplémentaires : `taches, contrats, onSaveTache, onDeleteTache, inviterPrestataire`.
- Bouton « Inviter (connexion) » dans le détail (visible si email renseigné et `canManage` + rôle dans [admin, comptable, commercial]) → confirmation via modale type `Users.jsx` (message copiable / WhatsApp en secours si l'e-mail échoue). Si le prestataire a déjà un `user_id` (compte créé), afficher « Compte lié » à la place.
- Détail prestataire : trois sections dans l'ordre —
  1. **Projets attribués** (existant).
  2. **Contrats** : liste des contrats avec `prestataireId === detail.id` (titre, statut Badge, prestataire lié) — lecture seule ici.
  3. **Tâches** : regroupées par projet ; chaque tâche : titre, statut (Badge — ajouter « À faire »/« En cours »/« Terminée » dans la map de `Badge.jsx`), échéance formatée fr, badge d'alerte (`En retard` rouge, `J-x` or) si non terminée et échéance proche/dépassée ; boutons : ajouter une tâche (admin/comptable/commercial), éditer statut, supprimer (admin seul).
- Utilitaire d'alerte partagé `src/lib/helpers.js` :
  ```js
  export const SEUIL_ALERTE_JOURS = 3;
  export const alerteTache = (t) => // retourne { level: "retard"|"proche", jours } ou null
  ```

### 6. Détail projet (`src/components/Projets.jsx`)
- Props supplémentaires : `taches, saveTache, deleteTache`.
- Dans la liste des prestataires du projet : sous chaque ligne prestataire, afficher ses tâches sur CE projet (statut + échéance + badges d'alerte) et un bouton « Ajouter une tâche » (pré-rempli projet + prestataire).

### 7. Portail prestataire — nouveau composant `src/components/PortalPrestataire.jsx`
- Rendu par `App.jsx` quand `role === "prestataire"` (avant le Shell classique).
- Hook dédié `src/lib/usePrestatairePortal.js` : charge via Supabase (RLS filtre automatiquement) :
  - sa fiche (`prestataires`), ses liens `projet_prestataires`, ses `projets`, ses `contrats` (`statut <> 'Brouillon'`), ses `taches`.
- Layout : même charte (sidebar sombre `T.ink` + header) mais navigation propre à 3 entrées : **Mes projets** / **Mes contrats** / **Mes tâches** + déconnexion. Réutiliser `Modal, Btn, Card, Badge, KpiBar, EmptyState`.
- **Header** : cloche (`Bell`) avec compteur = tâches en alerte (retard + ≤ 3 jours) ; clic → panneau listant ces tâches. Bannière en haut du contenu si au moins une alerte : « X tâche(s) en retard, Y à échéance proche ».
- **Mes projets** : cartes avec nom, description, statut, MA mission (depuis le lien).
- **Mes contrats** : liste (titre, statut, date) + modal lecture : contenu, télécharger PDF (`downloadContractPdf`), ouvrir WhatsApp (même mécanique que `Contracts.jsx:55-59`).
- **Mes tâches** : liste triable par projet/échéance ; création (titre, description, projet parmi les siens, échéance) ; changement de statut (3 statuts) ; pas de suppression.
- Toutes ces capacités restent bornées par le RLS (un prestataire malveillant ne peut pas lire/écrire hors de ses données).

### 8. Raccordement `src/App.jsx`
- `if (role === "prestataire")` → `<PortalPrestataire ... onLogout={signOut} entreprise={entreprise} />` (avant le bloc Shell).
- Passer à `<Prestataires>` et `<Projets>` les nouvelles props (taches, contrats, saveTache, deleteTache, inviterPrestataire).
- Passer `prestataires` à `<Contracts>`.
- S'assurer que `canManage*` n'incluent jamais `prestataire`.

### 9. Ajustements existants
- `src/components/Users.jsx` : ajouter `prestataire: "Prestataire"` dans `ROLE_LABELS` ; exclure `prestataire` de `ROLES` (pas invitable depuis cette page) ; profils prestataires affichés en libellé non éditable (comme super_admin) avec mention « géré depuis la page Prestataires ».
- `src/components/ui/Badge.jsx` : ajouter les statuts de tâches (« À faire » slate, « En cours » gold, « Terminée » teal).
- Rien à changer dans `Login.jsx` / `useAuth.js` (le magic link fonctionne déjà ; `handle_new_user` étendu fait le reste).

## Cas limites
- Prestataire sans email → bouton d'invitation désactivé avec message « Renseignez l'e-mail du prestataire ».
- Double invitation : unique `(entreprise_id, email)` sur `invitations` → gérer l'erreur 23505 avec message clair (comme `Users.jsx:44`).
- Prestataire invité mais fiche supprimée avant acceptation : `prestataire_id` reste nullable / dangling → le profil reçoit le rôle prestataire sans fiche liée ; `current_prestataire_id()` renvoie null → portail vide. Acceptable, à documenter dans la modale de suppression.
- `on delete set null` sur `contracts.prestataire_id` : suppression d'une fiche prestataire détache les contrats sans les perdre.
- Migration 0014 (`prestataires`) n'a peut-être pas encore été exécutée côté Supabase : la 0015 dépend de son existence → rappeler d'exécuter 0014 puis 0015 dans l'ordre (SQL Editor ou `supabase db push`).
- `ALTER TYPE ... ADD VALUE` : si l'exécution en transaction échoue, l'exécuter en autocommit (note dans l'en-tête de la migration).

## Sécurité (CONTROLE_DE_SECURITE.md)
- §1 zero-trust : toutes les restrictions ci-dessus doublées en RLS ; le portail front n'est qu'une couche d'affichage.
- §3 : nouvelle table `taches` + policies CRUD isolées par `entreprise_id` + policies dédiées prestataire ; pas d'UPDATE permettant au prestataire de changer son `entreprise_id` ou le `prestataire_id` d'une tâche (with check sur les valeurs attendues).
- §4 RBAC : nouveau rôle `prestataire` — lecture limitée à ses données ; l'admin/comptable/commercial gardent la main ; suppression tâches/fiches = admin.
- §2 : sélecteurs SQL explicites (pas de `select('*')`), pas de console.log, montants non concernés, pas de secrets.
- Grille §6 complète à exécuter avant le push (`npm audit`, `npm run build`, relecture diff, grep secrets, `.env` non stagé). `CONTROLE_DE_SECURITE.md` ne doit PAS être modifié.

## Validation
1. Exécuter les migrations 0014 puis 0015 dans Supabase.
2. `npm audit` (0 vuln) + `npm run build`.
3. Tests manuels (`npm run dev`) :
   - **Admin** : inviter un prestataire avec email → e-mail reçu ; accepter le magic link (fenêtre privée) → profil créé avec rôle prestataire ET `prestataires.user_id` relié.
   - Lier un contrat à un prestataire ; vérifier qu'un brouillon lié n'apparaît pas dans le portail, qu'un « Envoyé » apparaît.
   - Créer des tâches depuis le détail projet ET depuis la fiche prestataire ; statuts/échéances persistés ; suppression possible côté admin, impossible côté portail.
   - **Portail prestataire** : ne voit QUE ses projets/contrats/tâches (vérifier aussi qu'une requête console Supabase directe en tant que prestataire sur `clients`/`factures` renvoie une erreur RLS) ; alerte affichée pour tâche en retard et J-3.
   - **Employé/comptable** : navigation et droits inchangés ; page Utilisateurs affiche le profil prestataire en lecture seule.
4. Push uniquement après grille §6 verte, en consignant chaque contrôle.
