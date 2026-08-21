# Plan — Protection du dernier administrateur + Menu profil du portail prestataire

## Objectif
1. **Dernier admin** : impossible de supprimer OU rétrograder le dernier administrateur actif d'une entreprise tant qu'aucun autre administrateur n'existe — côté front ET côté SQL/RLS (zero-trust).
2. **Profil prestataire** : ajouter au header de `PortalPrestataire.jsx` le même menu profil (déroulant) que celui du `Shell` (avatar + nom, dropdown : email, société, entreprise, déconnexion).

## Décisions confirmées
- Périmètre dernier admin : **suppression + rétrogradation** (Select de rôle).
- Menu prestataire : **mêmes pattern/contenu que le Shell** (pas de téléphone ni de raccourci fiche).
- Le rôle `prestataire` existe déjà (enum 0015, portail, RLS…) — aucun ajout de rôle nécessaire.

## Définitions
- **Admin actif** = ligne `profiles` avec `role = 'administrateur'` et `deleted_at IS NULL`, dans l'entreprise concernée. `super_admin` n'est pas compté comme admin d'entreprise.
- La garde s'applique aussi aux actions de `super_admin` (empêcher qu'une entreprise se retrouve sans admin).

---

## Tâche A — Garde « dernier administrateur »

### A1. Migration `supabase/migrations/0027_last_admin_guard.sql` (nouvelle)

1. **Helper** :
   ```sql
   create or replace function public.has_other_admin(p_entreprise_id uuid, p_excluded_id uuid)
   returns boolean language sql stable security definer set search_path = public as $$
     select exists (
       select 1 from public.profiles
       where entreprise_id = p_entreprise_id
         and role = 'administrateur'
         and deleted_at is null
         and id is distinct from p_excluded_id
     )
   $$;
   ```

2. **Nouvelle RPC `change_profile_role`** (remplace l'update direct du rôle) :
   ```
   public.change_profile_role(p_profile_id uuid, p_new_role public.user_role, p_by uuid)
   ```
   `language plpgsql security definer set search_path = public` :
   - Charger la cible (`id, entreprise_id, role, deleted_at`) ; `raise 'Utilisateur introuvable'` si absente ou `deleted_at is not null`.
   - Droits : `public.is_super_admin()` OU `p_by` admin actif de la même entreprise (même forme que `hard_delete_user` 0026), sinon `raise 'Accès refusé…'`.
   - Interdire de toucher un `super_admin` (`raise 'Impossible de modifier un super_admin'`).
   - **Garde** : si `role = 'administrateur'` et `p_new_role <> 'administrateur'` et `not public.has_other_admin(entreprise_id, p_profile_id)` → `raise exception 'Impossible de retirer son rôle au dernier administrateur de l''entreprise'`.
   - `update public.profiles set role = p_new_role where id = p_profile_id`.

3. **Garde dans `hard_delete_user`** (recréer la fonction 0026) : après les checks existants, ajouter :
   ```
   if target.role = 'administrateur' and target.deleted_at is null
      and not public.has_other_admin(v_entreprise_id, p_profile_id)
   → raise exception 'Impossible de supprimer le dernier administrateur de l''entreprise'
   ```
   (charger `role`/`deleted_at` en plus de `id, entreprise_id`).

4. **Garde dans `soft_delete_user`** (recréer la fonction 0025) : même garde avant l'`update` (uniquement si cible active : `role='administrateur'` et `deleted_at is null`).

5. **Renforcement RLS UPDATE sur `profiles`** (défense ceinture-suspenders ; `with check` ne voit que la nouvelle ligne, donc approximation conservative) :
   ```sql
   drop policy if exists "admin gere les profils de son entreprise" on public.profiles;
   create policy "admin gere les profils de son entreprise" on public.profiles
     for update using (
       entreprise_id = public.current_entreprise_id()
       and public.current_role() = 'administrateur'
       and deleted_at is null
     ) with check (
       entreprise_id = public.current_entreprise_id()
       and deleted_at is null
       and (role = 'administrateur' or public.has_other_admin(entreprise_id, id))
     );

   drop policy if exists "utilisateur modifie son propre profil" on public.profiles;
   create policy "utilisateur modifie son propre profil" on public.profiles
     for update using (id = auth.uid())
     with check (id = auth.uid() and (role = 'administrateur' or public.has_other_admin(entreprise_id, id)));
   ```
   Effet : toute mise à jour directe d'une ligne dont le nouveau rôle n'est pas `administrateur` exige qu'un autre admin existe → impossible d'éliminer le dernier admin par n'importe quel client.
   **Contrepartie documentée** : dans une entreprise à 1 seul admin, un update direct (hors RPC) d'un membre non-admin échouera — acceptable car les seuls updates directs de profils dans le code sont `changeRole` (migré en RPC, étape A2) et, à vérifier par l'implémenteure : `grep -rn 'from("profiles")' src/` — tout UPDATE direct non couvert doit être migré en RPC ou jugé compatible.

### A2. `src/lib/useUsers.js`
- `changeRole` → RPC :
  ```js
  const changeRole = async (profileId, role) => {
    const { error } = await supabase.rpc("change_profile_role", { p_profile_id: profileId, p_new_role: role, p_by: userId });
    await load();
    return { error };
  };
  ```
- Signature existante appelée depuis `Users.jsx` (`onChange={(e) => changeRole(m.id, e.target.value)}`) : gérer l'erreur dans le composant (voir A3).

### A3. `src/components/Users.jsx`
- **Calculs** :
  ```js
  const adminsActifs = profiles.filter((p) => p.role === "administrateur" && !p.deleted_at);
  const dernierAdmin = adminsActifs.length === 1 ? adminsActifs[0] : null;
  ```
  Utilitaires par membre : `estDernierAdmin = dernierAdmin?.id === m.id && m.type === "user"`.
- **canDelete** (ligne ~98) : ajouter `&& !estDernierAdmin` au calcul existant ; si dernier admin, afficher un bouton « Supprimer » désactivé OU un clic qui ouvre une modale informative (choix : modale informative, plus explicite) :
  - Modale `blockedDelete` : titre « Suppression impossible », texte : *« {nom} est le dernier administrateur de l'entreprise. Sans au moins deux administrateurs, cette suppression (ou rétrogradation) laisserait l'équipe sans gestionnaire. Nommez d'abord un autre membre « Administrateur » via la colonne Rôle. »*, bouton « Compris ».
- **canChangeRole** (ligne ~97) : ajouter `&& !estDernierAdmin` ; sur le Select du dernier admin, ajouter `title="Dernier administrateur — rôle verrouillé"` (ou remplacer par un texte statique « Administrateur »).
- **Gestion des erreurs RPC** : l'`onChange` du Select doit vérifier `{ error }` retourné par `changeRole` → `notify("Erreur : " + error.message)` (la `load()` du hook rafraîchit l'état, annulant visuellement le changement rejeté). Idem pour la modale de suppression existante (`catch err` déjà présent → le message serveur s'affichera).
- `notify` local : garder le style d'appel existant du fichier.

---

## Tâche B — Menu profil du portail prestataire

### B1. `src/components/PortalPrestataire.jsx`
- Imports : ajouter `ChevronDown` (lucide-react). `LogOut` déjà importé.
- État : `const [profileOpen, setProfileOpen] = useState(false);`
- **Bouton déclencheur** : dans le header, après le bouton alertes (`CalendarClock`) — wrapper `<div style={{ position: "relative" }}>` contenant :
  - Bouton (mêmes styles que le Shell) : avatar or 30px avec initiale `{prestataire.nom?.[0]?.toUpperCase() || "P"}` (même fallback que le pied de sidebar ligne 181), `<span className="user-profile-name">{prestataire.nom}</span>` (ellipsis, maxWidth 140), `<ChevronDown size={14} className="user-profile-name" />` rotation si ouvert.
  - La classe `user-profile-name` est déjà masquée ≤880px par `GLOBAL_STYLE` (`App.jsx`) — rien à ajouter.
- **Dropdown** (pattern `NotifsBell` : overlay `fixed inset 0 z-index 200` + panneau `absolute top 44 right 0 width 260 z-index 201`) :
  - En-tête : avatar 34px or (initiale) + nom (`prestataire.nom`) + email (`prestataire.email || authUser?.email`).
  - Corps : lignes **Société** (`prestataire.societe || "—"`) et **Entreprise** (`entreprise?.nom`).
  - Pied : bouton « Se déconnecter » (`LogOut size={14}`, couleur `T.brick`) → `{ setProfileOpen(false); setConfirmingLogout(true); }` (réutilise la modale de confirmation existante du portail).

---

## Tâches ordonnées
1. Écrire `supabase/migrations/0027_last_admin_guard.sql` (A1).
2. Modifier `src/lib/useUsers.js` (A2).
3. Modifier `src/components/Users.jsx` (A3).
4. Modifier `src/components/PortalPrestataire.jsx` (B1).
5. Grep de contrôle : `grep -rn 'from("profiles")' src/` → confirmer qu'aucun UPDATE direct de profil ne contourne la RPC.
6. Validation + audit pré-push si déploiement demandé.

## Hors périmètre
- Pas de renommage de `softDeleteUser` (qui appelle déjà `hard_delete_user`).
- Pas de changement de `PortalPrestataire` côté RLS/nav/sidebar.
- Pas de restauration d'admins supprimés, pas de gestion multi-comptes super_admin.

## Risques / edge cases
- **Faux positif RLS** : entreprise à 1 admin, update direct d'un membre non-admin → rejeté par le `with check` ; couvert par la migration des updates vers la RPC (voir A1.5 et étape 5).
- `is_super_admin()` bypass : les gardes des fonctions RPC s'appliquent aussi aux super_admins (voulues) ; les policies implicites ne concernent que les admins d'entreprise.
- RPC enum : PostgREST convertit la chaîne JS en `public.user_role` automatiquement (params nommés) — tests existants d'RPC uuid valident le pattern.
- Cas limite : le seul admin tente de se supprimer → déjà bloqué (`p_profile_id = p_deleted_by`) ; la nouvelle garde ajoute un message plus explicite quand la cible active est le dernier admin.
- `has_other_admin` est `security definer` + `stable` + exclut l'ID concerné (`is distinct from` gère NULL).

## Validation
1. `npm run build` — compilation sans erreur.
2. Manuel (`npm run dev`) :
   - **A** : entreprise 1 admin → clic « Supprimer » → modale informative ; Select de rôle du dernier admin verrouillé ; promouvoir un membre en admin → suppression/rétrogradation redeviennent possibles ; échec RPC côté serveur = toast d'erreur.
   - **SQL** : `select public.hard_delete_user(...)` sur le dernier admin → exception ; `change_profile_role` rétrogradant le dernier admin → exception ; idem pour update direct via client `.update({ role })`.
   - **B** : connexion prestataire → menu avatar à droite des alertes ; dropdown email/société/entreprise ; « Se déconnecter » → modale existante ; clic hors menu → fermeture ; ≤880px → avatar seul.
3. Si push : appliquer la migration 0027 sur Supabase, puis grille d'audit `CONTROLE_DE_SECURITE.md` §6 (npm audit, build, RLS/gardes vérifiées, scan secrets, pas de console.log).

## Questions ouvertes
Aucune — toutes tranchées avec l'utilisateur.
