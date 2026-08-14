# 🛡️ Procédure de Contrôle de Sécurité & Minimisation des Données — Ma Bouate

Ce document sert de **Checklist de Sécurité Obligatoire** à exécuter avant chaque déploiement en production d'une nouvelle fonctionnalité. Il garantit que **Ma Bouate** applique le principe du moindre privilège, protège l'isolation multi-tenant Supabase, et empêche toute fuite de données côté front-end.

---

## 📋 Table des Matières
1. [Principe de Sécurité Zero-Trust & Isolation](#1-principe-de-sécurité-zero-trust--isolation)
2. [Checklist Front-End : Minimisation & Anti-Fuite de Données](#2-checklist-front-end--minimisation--anti-fuite-de-données)
3. [Checklist Back-End & Supabase RLS (Row Level Security)](#3-checklist-back-end--supabase-rls-row-level-security)
4. [Gestion des Rôles & Autorisations (RBAC)](#4-gestion-des-rôles--autorisations-rbac)
5. [Protection des Secrets & Variables d'Environnement](#5-protection-des-secrets--variables-denvironnement)
6. [Grille d'Audit Pré-Déploiement (Step-by-Step)](#6-grille-daudit-pré-déploiement-step-by-step)

---

## 1. Principe de Sécurité Zero-Trust & Isolation

> ⚠️ **Règle absolue :** Ne jamais faire confiance à l'interface client (Front-End). Tout contrôle d'accès désactivé ou masqué côté React doit impérativement être **bloqué et rejeté au niveau de la base de données Supabase (RLS)**. Un utilisateur malveillant ouvrant la console navigateur ou modifiant le code JavaScript local ne doit pas pouvoir lire ou modifier les données d'un autre rôle ou d'une autre entreprise.

---

## 2. Checklist Front-End : Minimisation & Anti-Fuite de Données

- [ ] **Minimisation des colonnes SQL (`select`)**
  - Ne jamais faire de `select('*')` sauvage sur des tables contenant des colonnes sensibles ou inutilisées.
  - Expliciter les colonnes nécessaires (ex: `select('id, nom, email, statut')`).

- [ ] **Masquage des données sensibles dans le DOM**
  - Vérifier que les informations confidentielles (soldes, bénéfices, mots de passe, tokens) ne sont pas injectées inutilement dans des attributs HTML visibles (`data-id`, `title`, etc.).
  - Le mode *Masquage des montants* (`amountsHidden`) doit masquer les valeurs monétaires avant leur rendu visuel.

- [ ] **Nettoyage des Logs de Debugging**
  - Vérifier l'absence de `console.log(data)`, `console.log(session)`, ou `console.log(user)` exposant des tokens JWT ou des structures d'entreprise dans le code de production.

- [ ] **Sanitization des saisies utilisateur (Prévention XSS & Injection)**
  - Assurer l'échappement correct des textes dynamiques injectés dans le générateur de PDF (`documentPdf.js`) et dans les tableaux React.

---

## 3. Checklist Back-End & Supabase RLS (Row Level Security)

Pour chaque table créée ou modifiée dans Supabase :

- [ ] **Activation RLS Obligatoire**
  ```sql
  ALTER TABLE nom_de_la_table ENABLE ROW LEVEL SECURITY;
  ```

- [ ] **Isolation Multi-Tenant par Entreprise**
  Chaque requête SELECT, INSERT, UPDATE, DELETE doit vérifier l'étanchéité de l'entreprise :
  ```sql
  CREATE POLICY "Tenant Isolation SELECT" ON nom_de_la_table
  FOR SELECT USING (
    entreprise_id = (SELECT entreprise_id FROM profiles WHERE id = auth.uid())
  );
  ```

- [ ] **Vérification des Politiques par Action (CRUD)**
  - **SELECT** : L'utilisateur ne voit que les lignes appartenant à son `entreprise_id` et autorisées pour son `role`.
  - **INSERT** : L'utilisateur ne peut insérer une ligne qu'avec son propre `entreprise_id`.
  - **UPDATE** : Empêcher la modification de champs critiques (ex: interdire à un non-admin de changer son propre `role` ou son `entreprise_id`).
  - **DELETE** : Réserver la suppression aux profils autorisés (`administrateur` / `super_admin`).

---

## 4. Gestion des Rôles & Autorisations (RBAC)

Vérifier les barrières d'accès pour les 4 rôles de l'application :

| Rôle | Devis | Factures | Clients | Produits | Finance & Trésorerie | Utilisateurs |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Administrateur** | ✅ Lecture / Écriture | ✅ Lecture / Écriture | ✅ Full | ✅ Full | ✅ Full | ✅ Admin |
| **Comptable** | 👁️ Lecture seule | ✅ Factures & Paiements | ✅ Full | ✅ Full | ✅ Full | ❌ Aucun accès |
| **Commercial** | ✅ Création & Suivi | ❌ Aucun accès | ✅ Prospects & Clients | 👁️ Lecture seule | ❌ Aucun accès | ❌ Aucun accès |
| **Employé** | 👁️ Mes devis uniquement | 👁️ Mes factures uniquement | ❌ Aucun accès | 👁️ Lecture seule | ❌ Aucun accès | ❌ Aucun accès |

---

## 5. Protection des Secrets & Variables d'Environnement

- [ ] **Fuite de la Service Role Key**
  - La clé `SUPABASE_SERVICE_ROLE_KEY` (qui outrepasserait le RLS) ne doit **JAMAIS** être incluse dans le code React ni dans les variables `VITE_*`.
  - Seule la clé publique `VITE_SUPABASE_ANON_KEY` est autorisée côté Front-End.

- [ ] **Sécurité du fichier `.env`**
  - Vérifier que `.env` et `.env.local` sont inscrits dans le `.gitignore`.
  - Utiliser `.env.example` sans vraies clés pour la documentation.

---

## 6. Grille d'Audit Pré-Déploiement (Step-by-Step)

À remplir systématiquement avant chaque commande `git push origin main` :

| Étape | Action de Contrôle | Statut | Responsable |
| :---: | :--- | :---: | :---: |
| **1** | Audit `npm audit` & aucune vulnérabilité critique dans les packages npm | `[ ]` | Dev / Sec |
| **2** | Compilation de production sans avertissement `npm run build` | `[ ]` | Dev |
| **3** | RLS activé sur toute nouvelle table Supabase créée/modifiée | `[ ]` | Lead Dev |
| **4** | Test de tentative d'accès API avec un compte rôle restreint (ex. Commercial tentant d'accéder aux dépenses) → Bloqué 403 / 0 lignes | `[ ]` | QA / Sec |
| **5** | Aucun secret / clé privée dans les fichiers poussés sur Git | `[ ]` | Lead Dev |
| **6** | Validation visuelle du masquage des données sensibles | `[ ]` | Design / QA |

---
*Document maintenu par l'équipe produit Ma Bouate — Dernière mise à jour : Août 2026.*
