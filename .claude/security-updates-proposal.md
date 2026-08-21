# 📝 Proposition de Mise à Jour - CONTROLE_DE_SECURITE.md
**Date :** 2026-08-21  
**Contexte :** Analyse de sécurité suite aux modifications du composant Shell.jsx (mode rail sidebar)

---

## 🔍 Nouvelles Contraintes Identifiées

### 1. **Sécurité des URLs d'Images Externes**

**Observation :**
Dans `Shell.jsx:219`, nous rendons `entreprise?.logoUrl` directement dans une balise `<img>` sans validation :
```jsx
<img src={entreprise.logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
```

**Risque :**
- **XSS via data URIs malveillants** : Un attacker pourrait injecter `data:text/html,<script>alert('XSS')</script>` comme logoUrl
- **SSRF potentiel** : URLs pointant vers des ressources internes (`file://`, `http://localhost`)

**Contrainte Proposée à Ajouter :**

```markdown
## 2.5 Validation des URLs d'Images Utilisateur

- [ ] **Validation stricte des URLs d'images**
  - Valider que `logoUrl` provient uniquement de Supabase Storage (domaine autorisé)
  - Rejeter les data URIs (`data:`, `blob:`, `javascript:`)
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
  - Ajouter un attribut `referrerpolicy="no-referrer"` sur les balises `<img>` chargeant des ressources externes
```

---

### 2. **Gestion du State Local Storage (Persistance Sidebar)**

**Observation :**
Dans `Shell.jsx:42-46`, l'état du sidebar est persisté dans `localStorage` :
```jsx
const [collapsed, setCollapsed] = useState(() => {
  try { return localStorage.getItem("mabouate:sidebar:collapsed") === "1"; } catch { return false; }
});
```

**Risque :**
- **Manipulation locale** : Un utilisateur peut modifier le localStorage, mais cela n'affecte que son UI (pas de risque de sécurité critique)
- **XSS Storage Poisoning** : Si l'app est victime de XSS, un attacker pourrait polluer le localStorage

**Contrainte Proposée à Ajouter :**

```markdown
## 2.6 Sécurité du LocalStorage & SessionStorage

- [ ] **Validation des données lues depuis le localStorage**
  - Ne jamais stocker de tokens JWT, mots de passe, ou données sensibles dans le localStorage
  - Valider et typer strictement les valeurs lues (ex: `collapsed` doit être "0" ou "1" uniquement)
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
  - **Préférer sessionStorage** pour les données temporaires de session
```

---

### 3. **Gestion des Événements onClick Côté Client**

**Observation :**
Le composant utilise de nombreux handlers `onClick` pour la navigation et les actions utilisateur (déconnexion, installation PWA, etc.)

**Risque Actuel :** Faible (React gère bien les événements)

**Contrainte Proposée (Prévention) :**

```markdown
## 2.7 Protection Contre le Clickjacking & UI Redressing

- [ ] **Headers HTTP Anti-Clickjacking**
  - Ajouter dans la configuration Vercel/serveur :
  ```
  X-Frame-Options: DENY
  Content-Security-Policy: frame-ancestors 'none'
  ```
  - Vérifier que l'app ne peut pas être embarquée dans une iframe malveillante

- [ ] **Validation des Actions Critiques Côté Serveur**
  - Les actions comme "Déconnexion", "Suppression", "Modification de rôle" doivent toujours être validées côté serveur
  - Implémenter un système de confirmation pour les actions destructives (déjà en place avec `confirmingLogout`)
```

---

### 4. **Contrôle de Sécurité Automatisé**

**Observation :**
Actuellement, le contrôle de sécurité est manuel. Nous devrions l'automatiser.

**Contrainte Proposée à Ajouter :**

```markdown
## 7. Automatisation du Contrôle de Sécurité (Nouveau)

- [ ] **Pre-commit Hooks de Sécurité**
  - Installer `husky` et `lint-staged` pour exécuter des checks automatiques
  - Vérifier l'absence de `console.log` avec secrets
  - Scanner les patterns dangereux : `eval()`, `dangerouslySetInnerHTML`, `innerHTML`

- [ ] **CI/CD Security Checks**
  - Intégrer GitHub Actions pour :
    - `npm audit` automatique sur chaque PR
    - Scan de secrets avec `trufflehog` ou `gitleaks`
    - Vérification RLS Supabase (script custom)

- [ ] **Monitoring des Dépendances**
  - Activer Dependabot sur GitHub pour les mises à jour de sécurité
  - Définir une politique de mise à jour des dépendances (max 30 jours pour les vulnérabilités critiques)
```

---

### 5. **React Component Security Patterns**

**Observation :**
Le code utilise bien React (pas de `dangerouslySetInnerHTML`), mais nous devrions documenter les patterns sécurisés.

**Contrainte Proposée à Ajouter :**

```markdown
## 2.8 Patterns React Sécurisés (Best Practices)

- [ ] **Interdiction stricte de patterns dangereux**
  - ❌ `dangerouslySetInnerHTML` (sauf exception validée avec sanitization DOMPurify)
  - ❌ `eval()`, `Function()`, `setTimeout(string)` avec du code dynamique
  - ❌ `<a href={userInput}>` sans validation (risque `javascript:` protocol)

- [ ] **Validation des Props Dynamiques**
  - Toujours valider les props provenant d'API/utilisateurs avant le rendu
  - Utiliser TypeScript ou PropTypes pour typer strictement les composants

- [ ] **Content Security Policy (CSP)**
  - Implémenter une CSP stricte interdisant :
    - `unsafe-inline` scripts
    - `unsafe-eval`
    - Domaines externes non autorisés
  ```
  Content-Security-Policy: 
    default-src 'self'; 
    script-src 'self'; 
    style-src 'self' 'unsafe-inline'; 
    img-src 'self' https://*.supabase.co data:; 
    connect-src 'self' https://*.supabase.co;
  ```
```

---

## ✅ Actions à Valider

**Avant d'appliquer ces mises à jour, je demande validation pour :**

1. ✅ **Ajouter la section 2.5** - Validation des URLs d'images ?
2. ✅ **Ajouter la section 2.6** - Sécurité du LocalStorage ?
3. ✅ **Ajouter la section 2.7** - Protection Clickjacking ?
4. ✅ **Ajouter la section 7** - Automatisation du contrôle de sécurité ?
5. ✅ **Ajouter la section 2.8** - Patterns React sécurisés ?

**Modifications supplémentaires proposées :**
- Ajouter une section sur la **gestion des fichiers uploadés** (pour les logos, PDFs, etc.)
- Documenter le **rate limiting** des API Supabase
- Créer un **changelog de sécurité** pour tracer les vulnérabilités corrigées

---

**Attente de validation avant mise à jour du fichier `CONTROLE_DE_SECURITE.md`**
