# Facturo

Application web de gestion commerciale et de facturation (devis, factures, clients,
produits, rapports) pensée pour le marché ivoirien / UEMOA — connectée à une vraie
base de données Supabase avec authentification, rôles et sécurité au niveau des lignes
(Row Level Security).

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

## 4. Build & déploiement

```bash
npm run build
```

Le dossier `dist/` produit est un site statique déployable sur n'importe quel
hébergeur (Netlify, Vercel, ou un VPS avec Nginx/Apache pointant vers `dist/`).
Pensez à configurer les variables d'environnement `VITE_SUPABASE_URL` et
`VITE_SUPABASE_ANON_KEY` sur la plateforme de déploiement (elles sont injectées au
moment du build, pas à l'exécution).

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
