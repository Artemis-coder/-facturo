# Suppression prestataire → compte utilisateur + KPI page Utilisateurs

## Problèmes
1. **Utilisateurs fantômes** : supprimer une fiche prestataire ne supprime que la
   ligne `public.prestataires`. Le compte auth (`auth.users`) et la ligne
   `profiles` (role = 'prestataire') créés par le trigger `handle_new_user`
   restent → le prestataire supprimé apparaît toujours dans
   Utilisateurs → « Membres de l'équipe » (`Users.jsx:79`).
2. **KPI manquants** sur la page Utilisateurs : nombre total d'utilisateurs +
   nombre d'invitations acceptées (demande explicite de l'utilisateur,
   « c'est tout » → exactement ces 2 KPI).

## Décisions
- Supprimer une fiche prestataire **supprime automatiquement le compte auth
  complet** (auth.users → cascade profiles, notifications). Mécanisme choisi :
  **trigger DB `AFTER DELETE` sur `public.prestataires`** (couvre tous les
  chemins de suppression : app, dashboard, SQL), pas un appel RPC côté front.
- **Garde de sécurité** : le compte n'est supprimé que si le profil lié a
  `role = 'prestataire'` (protège un compte reconverti en employé/admin).
- **Nettoyage ponctuel** des fantômes existants dans la migration
  (suppression scope : profils role='prestataire' sans fiche liée).
- La suppression admin de `profiles` côté client reste impossible (pas de
  policy DELETE) — ce comportement n'est pas modifié, tout passe par le trigger.

## Tâches ordonnées

### 1. Migration `supabase/migrations/0023_prestataire_suppression_compte.sql`
```sql
-- 1) Nettoyage des fantômes existants : comptes prestataires dont la fiche
--    a déjà été supprimée (le profil reste sinon affiché dans Utilisateurs).
delete from auth.users
where id in (
  select p.id from public.profiles p
  where p.role = 'prestataire'
    and not exists (select 1 from public.prestataires pr where pr.user_id = p.id)
);
-- (profiles cascade depuis auth.users — FK 0001 ; pas de fiche liée donc
--  aucune FK prestataires.user_id en travers)

-- 2) Trigger : suppression automatique du compte à la suppression de la fiche
create or replace function public.handle_prestataire_deleted()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.user_id is not null
     and exists (select 1 from public.profiles where id = old.user_id and role = 'prestataire') then
    delete from auth.users where id = old.user_id;
  end if;
  return old;
end; $$;

drop trigger if exists on_prestataire_deleted on public.prestataires;
create trigger on_prestataire_deleted
  after delete on public.prestataires
  for each row execute function public.handle_prestataire_deleted();
```
Notes d'implémentation :
- `security definer` requis : le delete client s'exécute en rôle `authenticated`,
  seul le propriétaire postgres peut toucher `auth.users`.
- Si le `delete from auth.users` échoue pour raison de droits au runtime,
  fallback documenté : exécuter le nettoyage via l'éditeur SQL du dashboard
  (rôle postgres) ; le reste de la migration reste valide.
- La migration doit être idempotente-friendly (`drop trigger if exists`,
  `create or replace`).

### 2. Texte du modal de suppression — `src/components/Prestataires.jsx:192-196`
Remplacer « Si un compte de connexion était lié, il restera actif mais sans
fiche prestataire (portail vide). » par un texte indiquant que le compte de
connexion est **supprimé** en même temps que la fiche (le prestataire ne pourra
plus se connecter ; une nouvelle invitation pourra être envoyée plus tard).

### 3. Hook `src/lib/useUsers.js` — comptage invitations acceptées
- Ajouter `const [invitationsAcceptees, setInvitationsAcceptees] = useState(0);`
- Dans `load()`, en parallèle des 2 requêtes existantes :
  `supabase.from("invitations").select("id", { count: "exact", head: true }).eq("entreprise_id", entrepriseId).eq("accepted", true)`
  → stocker `count || 0`. (RLS OK : policy select « invitations : lecture
  entreprise » couvre admin/comptable/commercial.)
- Retourner `invitationsAcceptees`.

### 4. Composant `src/components/Users.jsx` — KpiBar
- Importer `KpiBar` depuis `./ui`, icônes `Users`, `UserCheck` (lucide).
- En tête de page, avant la Card « Membres de l'équipe » :
  - `{ label: "Utilisateurs au total", value: profiles.length, sub: "Comptes de l'entreprise", tone: T.ink, icon: Users }`
  - `{ label: "Invitations acceptées", value: invitationsAcceptees, sub: "Ont rejoint l'équipe", tone: T.teal, icon: UserCheck }`
- Nouvelle prop `invitationsAcceptees`.

### 5. Branchement `src/App.jsx`
- L. 136 : déstructurer `invitationsAcceptees` depuis `useUsers`.
- L. 243 : passer `invitationsAcceptees={invitationsAcceptees}` à `<Users />`.

## Hors périmètre
- Pas de modification des politiques RLS de `profiles` (pas de DELETE client).
- Pas de suppression manuelle d'un membre de l'équipe depuis la page
  Utilisateurs (non demandé).
- KPI limités aux 2 demandés (l'utilisateur a dit « c'est tout »).

## Risques & parades
- **Trigger + auth.users** : pattern Supabase standard (fonction definer
  propriétaire postgres). Vérifier à l'application de la migration puis par le
  test E2E ci-dessous ; sinon fallback dashboard.
- **Nettoyage destructif** : strictement scopé (role='prestataire' ET aucune
  fiche liée via `user_id`) ; aucun admin/employé/comptable/super_admin touché.
- **Compte reconverti** : la garde `role = 'prestataire'` empêche la
  suppression d'un compte dont le rôle a été changé entre-temps.
- **Ré-invitation ultérieure** : le compte étant réellement supprimé,
  `signInWithOtp({ shouldCreateUser: true })` recréera proprement compte +
  profil + liaison (trigger `handle_new_user`) — contrairement à une
  suppression du seul profil qui aurait cassé la ré-invitation.

## Validation
1. `bun run build` — succès.
2. Appliquer 0023 sur Supabase ; vérifier dans le dashboard :
   - les profils fantômes (role prestataire sans fiche) ont disparu de `auth.users` et `profiles` ;
   - le trigger `on_prestataire_deleted` existe.
3. Test E2E : inviter un prestataire test → accepter → vérifier présence dans
   Utilisateurs → supprimer la fiche → vérifier disparition de Utilisateurs et
   de `auth.users` ; puis le ré-inviter avec le même e-mail → ça fonctionne.
4. Test KPI : les 2 compteurs affichent des valeurs cohérentes (créer/accepter
   une invitation invitée pour voir le compteur bouger).
5. Pré-push : Grille d'Audit §6 (AGENTS.md) — audit 0, build, relecture diff,
   scans secrets, RLS inchangées.
