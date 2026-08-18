# Ma Bouate

Application web de gestion commerciale pour PME et indépendants en Côte
d'Ivoire / UEMOA : devis, factures, clients, projets, contrats, prestataires,
trésorerie, rapports et notifications temps réel — avec rôles d'équipe (dont un
espace prestataire dédié) et sécurité au niveau des données (Row Level Security
Supabase).

## Fonctionnalités

- **Devis & factures** : éditeur split-screen avec aperçu en temps réel, lignes
  avec description libre et remises, historique de traçabilité complet, export
  PDF téléchargeable directement (design de marque), modèles de relance
- **Contrats** : modèles de contrats, génération assistée par IA (edge function
  `suggest-contract-template`), brouillons modifiables avant envoi, statuts
  Brouillon / Envoyé / Signé / Résilié, lien avec client, facture, devis, projet
  et prestataire, export PDF, historique de vie du contrat, KPI (envoyés,
  signés, résiliés…)
- **Projets** : regroupement de devis/factures liés à un même client ou une même
  mission, suivi de statut (En cours / Terminé / Annulé), avancement des tâches,
  affectation de prestataires avec mission
- **Prestataires** : fiches prestataires (expertise, type de contrat, contact),
  affectation aux projets, invitation par e-mail (lien magique) avec définition
  du mot de passe à la première connexion, tâches et sous-tâches attribuées,
  timeline « Suivi des tâches » dans la fiche avec statuts et échéances
- **Portail prestataire** : espace connecté dédié (hors espace d'administration)
  - Vue projets, contrats (consultation + téléchargement PDF) et tâches avec KPI
  - Kanban des tâches : À faire / En cours / Terminée / Bloquée
  - Sous-tâches avec statut propre et historique des modifications
  - Alerte des administrateurs quand une tâche est bloquée ou terminée
  - Alertes d'échéance, indicateur en ligne / hors ligne, notifications
- **Notifications temps réel** : cloche de notifications (admin et portail
  prestataire), mise à jour instantanée via Supabase Realtime, son +
  notification navigateur à la réception, marquage lu/non lu. Événements :
  mission ou tâche attribuée (admin → prestataire), tâche/sous-tâche bloquée ou
  terminée (prestataire → admins), contrat signé ou résilié (admins +
  prestataire concerné)
- **Finance** : journal de trésorerie (entrées de paiements + dépenses),
  rapports exportables en PDF/Excel/CSV
- **Équipe & rôles** : Administrateur, Comptable, Commercial, Employé et
  Prestataire — chacun avec un tableau de bord et des permissions dédiés ;
  invitation par e-mail (lien magique, sans mot de passe)
- **Confidentialité à l'écran** : bouton pour masquer tous les montants
  affichés d'un coup (utile en réunion ou en public)
- **PWA installable** sur mobile et desktop, avec fonctionnement hors ligne

## Stack

- **React 18 + Vite**
- **Supabase** (PostgreSQL, Auth, Row Level Security, Realtime, Storage)
- Recharts, Lucide, jsPDF, SheetJS
- Edge function Supabase `suggest-contract-template` (assistant IA des contrats)

## 1. Installation

```bash
npm install
cp .env.example .env
# renseignez VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY et VITE_SITE_URL dans .env
npm run dev
```

- `VITE_SUPABASE_ANON_KEY` est la clé publique ("anon") de votre projet — elle
  est conçue pour être utilisée côté client, la sécurité réelle vient des
  policies RLS définies en base. **Ne jamais utiliser la clé `service_role`
  (secrète) dans ce fichier ni dans une variable `VITE_*`.**
- `VITE_SITE_URL` est l'URL publique de l'application, utilisée pour les liens
  d'invitation et les redirections d'authentification (votre domaine en
  production).

## 2. Base de données

Dans Supabase → **SQL Editor**, exécutez les migrations de `supabase/migrations/`
**dans l'ordre numérique**. En cas de doute sur l'état de votre base (colonne ou
table manquante), rejouez `0010_verification_complete_idempotente.sql` : elle
reconstruit tout l'état attendu et est sûre à exécuter plusieurs fois.

Migrations notables :

| Migration | Contenu |
|---|---|
| `0001` | Schéma initial, rôles (`user_role`), profils et politiques RLS multi-tenant |
| `0007` | Projets |
| `0008` | Finance (dépenses, paiements) |
| `0013` | Contrats (modèles, contrats, historique) |
| `0014` → `0017` | Prestataires, rôle `prestataire`, espace prestataire (projets liés, tâches, contrats), invitations en cascade |
| `0019` → `0021` | Tâches & sous-tâches, historique des modifications, RLS des sous-tâches |
| `0022` | Statuts `Bloquée` (tâches) et `Résilié` (contrats), table `notifications` + RLS, fonctions `notify_evenement` et `get_admin_user_ids`, publication realtime |

Notes sur la migration `0022` :

- Les statuts sont appliqués via des contraintes `CHECK` recréées proprement
  (`drop constraint if exists` + `add constraint`).
- La table `notifications` n'expose **aucune politique d'insert côté client** :
  les notifications sont insérées uniquement par la fonction
  `notify_evenement` (`security definer`), appelée depuis les hooks métier.
  Lecture et mise à jour (marquer lu) sont restreintes au destinataire.
- Si le CLI Supabase échoue avec « Load failed (api.supabase.com) », le SQL est
  valide : appliquez la migration via l'éditeur SQL du dashboard, section par
  section si nécessaire.

## 3. Rôles

| Rôle | Devis | Factures & paiements | Clients / Produits | Utilisateurs |
|---|---|---|---|---|
| Administrateur | Créer / modifier / supprimer | Créer / modifier / supprimer | Créer / modifier / supprimer | Gérer + inviter |
| Comptable | Voir | Créer / modifier | Voir / modifier | — |
| Commercial | Créer / modifier | — | Créer / modifier | — |
| Employé | Voir ses propres devis/factures | Voir les siennes | Voir | — |

L'Administrateur gère en plus : projets, contrats, prestataires, tâches et
notifications.

| Rôle | Accès |
|---|---|
| Prestataire | Portail dédié uniquement : ses projets, contrats, tâches et sous-tâches. Aucun accès à l'espace d'administration. Peut marquer une tâche « Bloquée » pour alerter les administrateurs. |

Le premier compte créé sur une entreprise devient automatiquement
**Administrateur**. Pour ajouter un collègue : **Utilisateurs → Inviter** — un
e-mail avec un lien de connexion (sans mot de passe) est envoyé automatiquement
via le SMTP configuré côté Supabase. En cliquant dessus, la personne rejoint
l'entreprise avec le rôle choisi. Les prestataires, eux, sont invités depuis
leur fiche (**Prestataires → Inviter (connexion)**) : à la première connexion,
ils définissent un mot de passe.

### Configuration requise pour l'envoi d'e-mails
1. Supabase → **Project Settings → Auth → SMTP Settings** : identifiants SMTP actifs
2. Supabase → **Authentication → URL Configuration** : le **Site URL** doit
   correspondre à votre domaine de déploiement (le même que `VITE_SITE_URL`),
   sinon les liens pointeront au mauvais endroit
3. Supabase → **Authentication → Email Templates** : collez le contenu de
   `supabase/email-templates/confirm-signup.html` (inscription),
   `magic-link-invitation.html` (lien magique) et `users-inviite.html`
   (invitation d'équipe) pour reprendre l'identité visuelle de Ma Bouate
4. Si l'envoi automatique échoue, l'invitation reste créée — un bouton
   "Renvoyer l'e-mail" est disponible, ou le message peut être partagé
   manuellement (copié ou via WhatsApp)

## 4. Build & déploiement

```bash
npm run build
```

Le dossier `dist/` est un site statique déployable sur n'importe quel hébergeur
(Netlify, Vercel, VPS avec Nginx/Apache). Configurez `VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY` et `VITE_SITE_URL` comme variables d'environnement de
build sur votre plateforme d'hébergement (elles sont injectées au moment du
build).

## 5. Pousser sur GitHub

```bash
git init
git add .
git commit -m "Initial commit — Ma Bouate"
git branch -M main
git remote add origin <URL_DE_VOTRE_DEPOT_GITHUB>
git push -u origin main
```

`.env` est exclu du dépôt via `.gitignore` — utilisez `.env.example` comme
modèle sur chaque nouvelle machine ou dans les secrets CI/CD de votre hébergeur.
Ne committez jamais de clé réelle, même l'anon key : gardez-la dans `.env` local
ou dans les variables d'environnement de votre plateforme de déploiement.

## Structure du projet

```
src/
  lib/            # thème, helpers métier, client Supabase, hooks de données
                  # (useDevis, useFactures, useClients, useProjets, useContracts,
                  #  usePrestataires, usePrestatairePortal, useNotifications…)
  components/
    ui/           # primitives (Btn, Card, Modal, Select, Badge, TableShell,
                  #   KpiBar, Timeline, EmptyState, Toast…)
    Dashboard*.jsx        # tableaux de bord par rôle
    Devis.jsx, Factures.jsx, Clients.jsx, Produits.jsx, Contracts.jsx…
    Projets.jsx, Finance.jsx, Rapports.jsx, Entreprise.jsx, Users.jsx
    Prestataires.jsx      # gestion admin des prestataires + fiche enrichie
    PortalPrestataire.jsx # portail prestataire connecté (kanban, contrats…)
    NotifsBell.jsx        # cloche de notifications temps réel
  App.jsx         # assemblage : auth, navigation, permissions par rôle,
                  # branchement du portail prestataire
  main.jsx        # point d'entrée React
supabase/
  migrations/         # schéma SQL à exécuter dans Supabase, dans l'ordre
  email-templates/    # modèles HTML pour les e-mails Supabase Auth
```

## 🛡️ Contrôle de Sécurité & Pré-Déploiement

Avant chaque `git push`, vous devez impérativement exécuter la **Grille d'Audit
Pré-Déploiement (§6)** décrite dans [CONTROLE_DE_SECURITE.md](CONTROLE_DE_SECURITE.md)
pour garantir l'isolation multi-tenant, la minimisation des données transmises
au front-end et l'étanchéité des politiques RLS Supabase.

Points de vigilance (rappel) :

- `npm audit` doit renvoyer 0 vulnérabilité et `npm run build` passer sans erreur
- Aucun secret dans le code ni dans le diff (`SERVICE_ROLE`,
  `SUPABASE_JWT_SECRET`, tokens JWT), aucun `.env` stagé
- Les restrictions d'accès par rôle sont conservées côté front **et** bloquées
  au niveau RLS (zero-trust) ; la table `notifications` est lisible/modifiable
  uniquement par son destinataire
