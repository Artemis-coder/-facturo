# Ma Bouate

Une application web de gestion pour les freelance et autres / devis, factures, clients, projets, trésorerie et rapports — avec rôles
d'équipe et sécurité au niveau des données (Row Level Security).

## Fonctionnalités

- **Devis & factures** : lignes avec description libre, remises, historique de
  traçabilité complet, export PDF téléchargeable directement (design de marque)
- **Projets** : regroupement de devis/factures liés à un même client ou une même
  mission, suivi de statut
- **Finance** : journal de trésorerie (entrées de paiements + dépenses), rapports
  exportables en PDF/Excel/CSV
- **Équipe & rôles** : Administrateur, Comptable, Commercial, Employé — chacun
  avec un tableau de bord et des permissions dédiées ; invitation par e-mail
  (lien magique, sans mot de passe)
- **Confidentialité à l'écran** : bouton pour masquer tous les montants
  affichés d'un coup (utile en réunion ou en public)
- **PWA installable** sur mobile et desktop
- Suivie des prestataires via l'attribution des projets

## Stack

- **React 18 + Vite**
- **Supabase** (PostgreSQL, Auth, Row Level Security)
- Recharts, Lucide, jsPDF, SheetJS

## 1. Installation

```bash
npm install
cp .env.example .env
# renseignez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env
npm run dev
```

`VITE_SUPABASE_ANON_KEY` est la clé publique ("anon") de votre projet — elle
est conçue pour être utilisée côté client ; la sécurité réelle vient des
policies RLS définies en base. Ne jamais utiliser la clé `service_role`
(secrète) dans ce fichier.

## 2. Base de données

Dans Supabase → **SQL Editor**, exécutez les migrations de `supabase/migrations/`
**dans l'ordre numérique**. En cas de doute sur l'état de votre base (colonne ou
table manquante), rejouez `0010_verification_complete_idempotente.sql` : elle
reconstruit tout l'état attendu et est sûre à exécuter plusieurs fois.

## 3. Rôles

| Rôle | Devis | Factures & paiements | Clients / Produits | Utilisateurs |
|---|---|---|---|---|
| Administrateur | Créer / modifier / supprimer | Créer / modifier / supprimer | Créer / modifier / supprimer | Gérer + inviter |
| Comptable | Voir | Créer / modifier | Voir / modifier | — |
| Commercial | Créer / modifier | — | Créer / modifier | — |
| Employé | Voir ses propres devis/factures | Voir les siennes | Voir | — |

Le premier compte créé sur une entreprise devient automatiquement **Administrateur**.
Pour ajouter un collègue : **Utilisateurs → Inviter** — un e-mail avec un lien
de connexion (sans mot de passe) est envoyé automatiquement via le SMTP
configuré côté Supabase. En cliquant dessus, la personne rejoint l'entreprise
avec le rôle choisi.

### Configuration requise pour l'envoi d'e-mails
1. Supabase → **Project Settings → Auth → SMTP Settings** : identifiants SMTP actifs
2. Supabase → **Authentication → URL Configuration** : le **Site URL** doit
   correspondre à votre domaine de déploiement, sinon les liens pointeront
   au mauvais endroit
3. Supabase → **Authentication → Email Templates** : collez le contenu de
   `supabase/email-templates/confirm-signup.html` (inscription) et
   `magic-link-invitation.html` (invitation d'équipe) pour reprendre
   l'identité visuelle de Facturo
4. Si l'envoi automatique échoue, l'invitation reste créée — un bouton
   "Renvoyer l'e-mail" est disponible, ou le message peut être partagé
   manuellement (copié ou via WhatsApp)

## 4. Build & déploiement

```bash
npm run build
```

Le dossier `dist/` est un site statique déployable sur n'importe quel hébergeur
(Netlify, Vercel, VPS avec Nginx/Apache). Configurez `VITE_SUPABASE_URL` et
`VITE_SUPABASE_ANON_KEY` comme variable d'environnement de build sur votre
plateforme d'hébergement (elle est injectée au moment du build).

## 5. Pousser sur GitHub

```bash
git init
git add .
git commit -m "Initial commit — Facturo"
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
  components/
    ui/           # primitives (Btn, Card, Modal, Select, TableShell, EmptyState…)
    ...           # pages (Dashboard, Clients, Devis, Factures, Finance, Projets…)
  App.jsx         # assemblage : auth, navigation, permissions par rôle
  main.jsx        # point d'entrée React
supabase/
  migrations/         # schéma SQL à exécuter dans Supabase, dans l'ordre
  email-templates/    # modèles HTML pour les e-mails Supabase Auth
```

## 🛡️ Contrôle de Sécurité & Pré-Déploiement

Avant chaque déploiement en production, vous devez impérativement exécuter les vérifications du guide [CONTROLE_DE_SECURITE.md](file:///Users/kedakeyaoboris/Downloads/facturo-main/CONTROLE_DE_SECURITE.md) pour garantir l'isolation multi-tenant, la minimisation des données transmises au front-end et l'étanchéité des politiques RLS Supabase.

