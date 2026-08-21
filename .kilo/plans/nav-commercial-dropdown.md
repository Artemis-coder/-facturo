# Fonctionnalité « Prestataires »

## Objectif
Un prestataire = personne/entité à qui on confie une partie d'un projet (un projet peut avoir plusieurs prestataires). Livrables :
1. Table(s) Supabase dédiées + RLS.
2. Menu « Prestataires » dans la barre latérale (item simple, après « Projets »).
3. CRUD prestataires (création, édition, vue détail avec infos clés + projets attribués).
4. Affectation prestataire ↔ projet avec mission, visible des 2 côtés (page Prestataires et détail Projet).
5. KPI : nombre de prestataires + indicateurs liés (actifs, missions, types de contrat).

## Décisions validées
- **Type de projet** (domaine du prestataire) : liste fixe → `Design graphique`, `Développement web`, `Audiovisuel`, `Marketing`, `Rédaction`, `Autre`.
- **Type de contrat** : liste fixe → `Prestation de service`, `Sous-traitance`, `Freelance`, `Partenariat`.
- **Lien projet↔prestataire avec mission** : texte libre décrivant la tâche confiée sur CE projet (ex. « Conception maquettes »).
- **Menu** : item simple après « Projets », icône `Handshake` (lucide-react).
- **Rôles** : admin / comptable / commercial pour lecture + écriture ; suppression réservée à admin (même schéma que `projets`, migration 0007:36-53). `employe` n'y a pas accès. RLS = barrière réelle (zero-trust §1).

## Tâches

### 1. Migration `supabase/migrations/0014_prestataires.sql`
```sql
create table if not exists public.prestataires (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.entreprises(id) on delete cascade,
  nom text not null check (char_length(trim(nom)) > 0),
  societe text not null default '',
  email text, telephone text, notes text,
  type_projet text not null check (type_projet in ('Design graphique','Développement web','Audiovisuel','Marketing','Rédaction','Autre')),
  type_contrat text not null check (type_contrat in ('Prestation de service','Sous-traitance','Freelance','Partenariat')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projet_prestataires (
  id uuid primary key default gen_random_uuid(),
  entreprise_id uuid not null references public.entreprises(id) on delete cascade,
  projet_id uuid not null references public.projets(id) on delete cascade,
  prestataire_id uuid not null references public.prestataires(id) on delete cascade,
  mission text not null default '',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (projet_id, prestataire_id)
);
```
- Index : `prestataires(entreprise_id, created_at desc)`, `projet_prestataires(projet_id)`, `projet_prestataires(prestataire_id)`.
- RLS (modèle migration 0007) :
  - `prestataires` : SELECT par `entreprise_id = public.current_entreprise_id() or public.is_super_admin()` ; INSERT/UPDATE pour `administrateur, comptable, commercial` avec `entreprise_id = public.current_entreprise_id()` ; DELETE réservé `administrateur`.
  - `projet_prestataires` : même schéma (SELECT entreprise + super_admin ; écriture admin/comptable/commercial ; suppression admin) — vérifier l'`entreprise_id` sur la ligne.

### 2. Hook `src/lib/usePrestataires.js` (pattern `useContracts.js` / `useProjets.js`)
- Sélecteurs SQL **explicites** (pas de `select('*')` — checklist sécurité §2) :
  - `PRESTATAIRE_SELECT = "id, nom, societe, email, telephone, notes, type_projet, type_contrat, created_at, updated_at"`.
  - `LIEN_SELECT = "id, projet_id, prestataire_id, mission, created_at"`.
- `load()` : deux requêtes en parallèle filtrées par `.eq("entreprise_id", entrepriseId)` (comme `useContracts.js:18-21`).
- Mapping snake_case → camelCase (`mapPrestataire`, `mapLien`).
- Fonctions : `savePrestataire(form)` (insert ou update + `updated_at`, puis reload), `deletePrestataire(id)`, `affecterPrestataire({ projetId, prestataireId, mission })` (insert lien ; gérer l'erreur `23505` unique constraint → renvoyer `{ error }` compréhensible), `detacherPrestataire(linkId)`.
- Exports : `prestataires, liens, loading, savePrestataire, deletePrestataire, affecterPrestataire, detacherPrestataire, reload`.

### 3. Composant `src/components/Prestataires.jsx`
Structure identique aux pages existantes (`Projets.jsx`) : header + `KpiBar` + `TableShell` + modales (`Modal`, `Field`, `Select`, `Btn`, `Badge`, `EmptyState`).
- **KPI** (`KpiBar`) :
  - « Prestataires actifs » (≥1 lien vers un projet au statut `En cours`) — tone `T.gold`, icône `Users`/`Handshake`.
  - « Total prestataires » — tone `T.ink`, icône `Users`.
  - « Missions en cours » (nb de liens dont projet statut `En cours`) — tone `T.teal`, icône `ClipboardList`/`Briefcase`.
  - Répartition par type de contrat : « Freelance », « Sous-traitance », etc. — 4 cartes ou 1 carte par type non nul (max 6 cartes pour garder `KpiBar` lisible : total + actifs + missions + le type dominant ou les 2 types les plus fréquents ; décision à l'implémentation, privilégier 4 KPI).
- **Table** : Nom (clic → détail), Société, Type de projet (Badge), Type de contrat (Badge), Projets (nombre de liens), colonne actions (Voir / Modifier). Bouton « Nouveau prestataire » (si `canManage`).
- **Formulaire** (modale, pattern `ProjetForm`) : Nom*, Société, Email, Téléphone, Type de projet (Select liste fixe), Type de contrat (Select liste fixe), Notes. Validation nom requis.
- **Détail prestataire** (modale `wide`) : infos de contact, badges type projet/contrat, notes, puis section « Projets attribués » : liste des liens (nom du projet, statut du projet en Badge, mission en clair), bouton détacher (si `canManage`), et sélecteur « Affecter à un projet » (pattern `DocumentPicker` de `Projets.jsx:241-264` : choisir projet non encore affecté + champ mission) → `affecterPrestataire`.
- **Suppression** (si `canDelete`) avec modale de confirmation expliquant que les affectations seront supprimées (cascade).

### 4. Navigation — `src/components/Shell.jsx`
- Dans `NAV`, après l'entrée `projets` : `{ key: "prestataires", label: "Prestataires", icon: Handshake, roles: ["administrateur", "comptable", "commercial"] }`. Importer `Handshake` depuis lucide-react.
- Titre d'en-tête automatique (le `leaves.find` gère déjà les items simples).

### 5. Intégration page Projets — `src/components/Projets.jsx`
- `ProjetDetail` : nouvelle section « Prestataires » entre « Montant encaissé » et « Devis liés » : liste des liens du projet (nom du prestataire, type_projet en badge, mission, détacher) + sélecteur « Affecter un prestataire » (choisir prestataire non encore affecté + champ mission). Pattern `DocumentPicker` existant.
- Props supplémentaires à passer au composant `Projets` : `prestataires, liensPrestataires, affecterPrestataire, detacherPrestataire` (depuis `App.jsx`).
- Colonne « Prestataires » (nombre) optionnelle dans la table projets — à inclure si la largeur reste raisonnable (décision mineure à l'implémentation, sinon l'omettre).

### 6. `src/App.jsx`
- `import { usePrestataires } from "./lib/usePrestataires";` + `import { Prestataires } from "./components/Prestataires";`
- `const { prestataires: prestatairesList, liens: liensPrestataires, loading: loadingPrestataires, savePrestataire, deletePrestataire, affecterPrestataire, detacherPrestataire } = usePrestataires(entrepriseId, userId);`
- Ajouter `loadingPrestataires` dans `dataReady` (ligne 169).
- Rendu `{view === "prestataires" && <Prestataires projets={projets} prestataires={prestatairesList} liens={liensPrestataires} onSavePrestataire={savePrestataire} onDeletePrestataire={deletePrestataire} affecterPrestataire={affecterPrestataire} detacherPrestataire={detacherPrestataire} notify={notify} canManage={canManageProjets} canDelete={isAdmin} />}`.
- Passer à `<Projets>` les props prestataires (point 5).

## Cas limites
- Un même prestataire affecté 2× au même projet → contrainte unique renvoie une erreur, à afficher via `notify` (« Ce prestataire est déjà affecté à ce projet »).
- Suppression d'un prestataire ou d'un projet → cascade sur les liens (défini en base), pas de code de nettoyage nécessaire côté front ; reload après chaque mutation.
- Prestataire sans aucun projet : KPI « actifs » = 0, détail vide avec `EmptyState`.
- Hors ligne : pas de file offline pour ce module (cohérent avec `useProjets`/`useContracts` qui n'ont pas de queue offline, contrairement à `useClients`).

## Sécurité (CONTROLE_DE_SECURITE.md)
- §3 RLS : migration avec policies explicites CRUD isolées par `entreprise_id`.
- §4 RBAC : accès front admin/comptable/commercial + blocage RLS (zero-trust) ; `employe` exclu front ET base.
- §2 : colonnes SQL explicites, pas de console.log, pas de données sensibles dans le DOM.
- Aucune clé/secret nouveau (table sans fichier, pas de storage).
- Grille §6 complète à exécuter avant le push : `npm audit` (0 vuln), `npm run build`, relecture du diff, grep secrets, `.env` non stagé.

## Validation
1. Appliquer la migration dans Supabase (SQL Editor) puis vérifier RLS : en tant qu'`employe`, requête sur `prestataires` doit renvoyer 0 ligne ; isolation multi-tenant validée.
2. `npm audit` + `npm run build` sans erreur.
3. `npm run dev` :
   - Menu « Prestataires » visible pour admin/comptable/commercial, absent pour employe.
   - Créer un prestataire → visible après reload BDD (persistant).
   - Affecter un prestataire à un projet avec mission → visible dans le détail du prestataire ET dans le détail du projet ; double affectation refusée.
   - Détacher des deux côtés ; supprimer un prestataire → liens disparus côté projet.
   - KPI cohérents avec les données.
4. Avant `git push` : exécuter et consigner la grille d'audit §6 (AGENTS.md).
