# Facturo

Application web de gestion commerciale et de facturation (devis, factures, clients,
produits, rapports) pensée pour le freelance.

## Stack

- **React 18 + Vite**
- **Supabase** (PostgreSQL, Auth, RLS)
- Recharts (graphiques), Lucide (icônes)

## 1. Installation

```bash
npm install
cp .env.example .env
# renseignez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans .env
npm run dev
```

## 2. Base de données

Dans Supabase → **SQL Editor**, exécutez les migrations **dans l'ordre** :

1. `supabase/migrations/0001_init_schema_roles_rls.sql` — schéma complet, rôles, RLS
2. `supabase/migrations/0002_preferences.sql` — préférences de notifications
3. `supabase/migrations/0003_invitations.sql` — invitations d'équipe par rôle
4. `supabase/migrations/0004_compteurs_separes.sql` — compteurs de numérotation devis/factures séparés
5. `supabase/migrations/0005_rattrapage_preferences_et_compteurs.sql` — rattrapage si 0002/0004 n'ont pas été exécutées
6. `supabase/migrations/0006_projet_termine.sql` — indicateur "projet terminé" par facture
7. `supabase/migrations/0007_projets.sql` — entité Projets (regroupement de devis/factures)
8. `supabase/migrations/0008_finance.sql` — module Finance (dépenses / sorties de trésorerie)
9. `supabase/migrations/0009_clients_statut.sql` — statut Prospect / Client sur les clients

## 3. Rôles

| Rôle | Devis | Factures & paiements | Clients / Produits | Utilisateurs |
|---|---|---|---|---|
| Super Admin | Tout, toutes entreprises | Tout | Tout | Tout |
| Administrateur | Créer / modifier / supprimer | Créer / modifier / supprimer | Créer / modifier / supprimer | Gérer + inviter |
| Comptable | Voir | Créer / modifier | Voir / modifier | — |
| Commercial | Créer / modifier | — | Créer / modifier | — |
| Employé | Voir ses propres devis/factures | Voir les siennes | Voir | — |

Le premier compte créé sur une entreprise devient automatiquement **Administrateur**.
Pour ajouter un collègue : **Utilisateurs → Inviter**, puis demandez-lui de créer un
compte Facturo avec exactement cette adresse e-mail — il rejoint automatiquement
l'entreprise avec le rôle choisi (voir migration 0003).

## 3bis. E-mail de bienvenue (confirmation d'inscription)

Supabase envoie automatiquement un e-mail de confirmation à chaque inscription.
Pour qu'il reprenne l'identité Facturo et rappelle les informations de connexion
(sans jamais inclure le mot de passe, qui n'est récupérable par personne) :

1. Supabase → **Authentication → Email Templates → Confirm signup**
2. Collez le contenu de `supabase/email-templates/confirm-signup.html` dans le champ HTML
3. Enregistrez

## 4. Build & déploiement

```bash
npm run build
```

Le dossier `dist/` produit est un site statique déployable sur n'importe quel
hébergeur (Netlify, Vercel, ou un VPS avec Nginx/Apache pointant vers `dist/`).
Pensez à configurer les variables d'environnement `VITE_SUPABASE_URL` et
`VITE_SUPABASE_ANON_KEY` sur la plateforme de déploiement (elles sont injectées au
moment du build, pas à l'exécution).

## 4bis. Application installable (PWA)

Facturo est une Progressive Web App : sur Android/Desktop (Chrome, Edge, Brave),
un bouton **"Installer l'application"** apparaît directement dans le menu latéral
et sur l'écran de connexion dès que le navigateur le permet — un clic suffit,
aucune boutique d'applications n'est nécessaire. Sur iPhone/iPad (Safari), un
bouton affiche les 3 étapes manuelles (Partager → Sur l'écran d'accueil → Ajouter),
car iOS ne propose pas d'installation automatique.

Ce que ça donne une fois installé : icône sur l'écran d'accueil, ouverture en
plein écran sans barre d'adresse, et l'app shell (JS/CSS/icônes) reste disponible
même hors-ligne — seules les données Supabase nécessitent une connexion.

Géré par `vite-plugin-pwa` (config dans `vite.config.js`) ; les icônes sources
sont dans `public/icons/`. Pour changer l'icône, remplacez les fichiers dans ce
dossier (192, 512, versions "maskable" avec fond plein pour Android, favicon,
apple-touch-icon) en gardant les mêmes noms.

## 5. Pousser sur GitHub

```bash
git init
git add .
git commit -m "Initial commit — Facturo"
git branch -M main
git remote add origin <URL_DE_VOTRE_DEPOT_GITHUB>
git push -u origin main
```

`.env` est exclu du dépôt via `.gitignore` — utilisez `.env.example` comme modèle
sur chaque nouvelle machine ou dans les secrets CI/CD de votre hébergeur.

## Structure du projet

```
src/
  lib/            # thème, helpers métier, client Supabase, hooks de données
  components/
    ui/           # primitives (Btn, Card, Modal, Select, TableShell…)
    ...           # pages (Dashboard, Clients, Devis, Factures, Users…)
  App.jsx         # assemblage : auth, navigation, permissions par rôle
  main.jsx        # point d'entrée React
supabase/
  migrations/     # schéma SQL à exécuter dans Supabase
```

## Limites connues (prochaines étapes)

- L'envoi d'e-mail d'invitation n'est pas automatisé — l'administrateur doit
  communiquer l'adresse à utiliser à la personne invitée.
- Les exports Rapports (PDF/Excel/CSV) sont encore simulés.
- Le téléchargement de PDF utilise la boîte de dialogue d'impression du
  navigateur ("Enregistrer au format PDF").
