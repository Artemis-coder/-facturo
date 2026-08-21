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
7. [Automatisation du Contrôle de Sécurité](#7-automatisation-du-contrôle-de-sécurité)
8. [Changelog de Sécurité](#8-changelog-de-sécurité)

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

- [ ] **Validation des URLs d'Images Utilisateur**
  - Valider que `logoUrl` et autres URLs d'images proviennent uniquement de Supabase Storage (domaine autorisé).
  - Rejeter les data URIs (`data:`, `blob:`, `javascript:`) pour éviter XSS et SSRF.
  - Implémenter une fonction de validation côté client ET serveur :
  ```javascript
  const isValidImageUrl = (url) => {
    if (!url) return false;
    const allowedDomains = [process.env.VITE_SUPABASE_URL];
    try {
      const parsed = new URL(url);
      return allowedDomains.some(domain => parsed.origin.includes(domain));
    } catch {
      return false;
    }
  };
  ```
  - Ajouter un attribut `referrerpolicy="no-referrer"` sur les balises `<img>` chargeant des ressources externes.

- [ ] **Sécurité du LocalStorage & SessionStorage**
  - Ne jamais stocker de tokens JWT, mots de passe, ou données sensibles dans le localStorage.
  - Valider et typer strictement les valeurs lues (ex: `collapsed` doit être "0" ou "1" uniquement).
  - Implémenter une fonction sanitizer pour les données localStorage :
  ```javascript
  const getSecureLocalStorage = (key, allowedValues) => {
    try {
      const value = localStorage.getItem(key);
      return allowedValues.includes(value) ? value : null;
    } catch {
      return null;
    }
  };
  ```
  - **Préférer sessionStorage** pour les données temporaires de session.

- [ ] **Protection Contre le Clickjacking & UI Redressing**
  - Ajouter dans la configuration Vercel/serveur les headers HTTP anti-clickjacking :
  ```
  X-Frame-Options: DENY
  Content-Security-Policy: frame-ancestors 'none'
  ```
  - Vérifier que l'app ne peut pas être embarquée dans une iframe malveillante.
  - Les actions comme "Déconnexion", "Suppression", "Modification de rôle" doivent toujours être validées côté serveur.

- [ ] **Patterns React Sécurisés (Best Practices)**
  - ❌ Interdiction stricte de `dangerouslySetInnerHTML` (sauf exception validée avec sanitization DOMPurify).
  - ❌ Interdiction de `eval()`, `Function()`, `setTimeout(string)` avec du code dynamique.
  - ❌ Interdiction de `<a href={userInput}>` sans validation (risque `javascript:` protocol).
  - Toujours valider les props provenant d'API/utilisateurs avant le rendu.
  - Utiliser TypeScript ou PropTypes pour typer strictement les composants.
  - Implémenter une Content Security Policy (CSP) stricte :
  ```
  Content-Security-Policy: 
    default-src 'self'; 
    script-src 'self'; 
    style-src 'self' 'unsafe-inline'; 
    img-src 'self' https://*.supabase.co data:; 
    connect-src 'self' https://*.supabase.co;
  ```

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

Les **modèles de contrats**, les **contrats**, leur historique et les PDF source privés sont réservés à l’Administrateur. Toute suggestion OpenAI doit transiter par une Edge Function Supabase avec une clé serveur, jamais par le navigateur.

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

| Étape | Action de Contrôle | Statut | Résultat d'Audit | Responsable |
| :---: | :--- | :---: | :--- | :---: |
| **1** | Audit `npm audit` & vulnérabilités packages npm | `[x]` | **0 vulnérabilité détectée** (0 vulnerabilities found) | Dev / Sec |
| **2** | Compilation de production sans avertissement `npm run build` | `[x]` | **Build réussi sans erreur** (2361 modules transformés en 584ms) | Dev |
| **3** | RLS activé sur toutes les tables Supabase, y compris les contrats | `[x]` | **RLS actif** sur `entreprises`, `profiles`, `clients`, `devis`, `factures`, `depenses`, `paiements`, `projets`, `contract_templates`, `contracts`, `contract_history`... | Lead Dev |
| **4** | Protection RBAC & Isolation API Multi-Tenant | `[x]` | **Conforme** : RLS isole par `entreprise_id` et bloque les accès non autorisés | QA / Sec |
| **5** | Absence de secrets / clés privées exposés (`SERVICE_ROLE_KEY`) | `[x]` | **Vérifié** : Aucun `console.log` sensible, `.env` exclu dans `.gitignore` | Lead Dev |
| **6** | Validation du masquage des données sensibles (`amountsHidden`) | `[x]` | **Validé** : Masquage visuel et chiffrement des états locaux | Design / QA |

---

## 7. Automatisation du Contrôle de Sécurité

- [ ] **Pre-commit Hooks de Sécurité**
  - Installer `husky` et `lint-staged` pour exécuter des checks automatiques avant chaque commit.
  - Vérifier l'absence de `console.log` avec secrets ou données sensibles.
  - Scanner les patterns dangereux : `eval()`, `dangerouslySetInnerHTML`, `innerHTML`.

- [ ] **CI/CD Security Checks**
  - Intégrer GitHub Actions pour :
    - `npm audit` automatique sur chaque Pull Request.
    - Scan de secrets avec `trufflehog` ou `gitleaks`.
    - Vérification RLS Supabase (script custom).

- [ ] **Monitoring des Dépendances**
  - Activer Dependabot sur GitHub pour les mises à jour de sécurité automatiques.
  - Définir une politique de mise à jour des dépendances (max 30 jours pour les vulnérabilités critiques).

- [ ] **Changelog de Sécurité**
  - Maintenir un journal des vulnérabilités identifiées et corrigées.
  - Documenter chaque amélioration de sécurité avec date, contexte et solution appliquée.

---

## 8. Changelog de Sécurité

| Date | Vulnérabilité/Amélioration | Sévérité | Action Prise | Statut |
| :--- | :--- | :---: | :--- | :---: |
| 2026-08-21 | Ajout validation URLs images (logoUrl) | Moyenne | Contrainte ajoutée section 2.5 | ✅ Documenté |
| 2026-08-21 | Sécurisation localStorage/sessionStorage | Faible | Contrainte ajoutée section 2.6 | ✅ Documenté |
| 2026-08-21 | Protection clickjacking & CSP | Moyenne | Contraintes ajoutées section 2.7 | ✅ Documenté |
| 2026-08-21 | Patterns React sécurisés | Faible | Best practices ajoutées section 2.8 | ✅ Documenté |
| 2026-08-21 | Automatisation contrôles sécurité | - | Section 7 créée | ✅ Documenté |

---
*Rapport d'audit validé pour le déploiement courant de **Ma Bouate** — Août 2026.*
*Dernière mise à jour du contrôle de sécurité : 21 août 2026*
