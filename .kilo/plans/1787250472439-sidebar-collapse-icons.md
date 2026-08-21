# Plan — Sidebar collapsible en mode icônes (Shell principal)

## Objectif
Au clic sur un bouton toggle, la sidebar de `src/components/Shell.jsx` se replie en un rail étroit ne gardant que les icônes. Re-clic pour ré-ouvrir. État persisté en `localStorage`.

## Périmètre confirmé avec l'utilisateur
- **Composant concerné** : `src/components/Shell.jsx` uniquement. `PortalPrestataire.jsx` (même pattern de sidebar) n'est PAS modifié.
- **Groupe « Commercial »** (seul item avec `children`) : en mode replié, le clic sur son icône **ré-ouvre la sidebar complète ET déplie le groupe** (`setCollapsed(false)` + `setGroupOverride(true)`).
- **Persistance** : état replié/déplié dans `localStorage`.
- **Mobile (≤880px)** : le mode replié est désactivé (la sidebar reste un drawer pleine hauteur), toggle masqué.

## Conception technique

### Constantes
- Largeur dépliée : `232` (déjà en place), largeur repliée : `64`.
- Clé localStorage : `"mabouate:sidebar:collapsed"`.

### Fichiers à modifier
1. `src/components/Shell.jsx` — logique + rendu conditionnel.
2. `src/App.jsx` — ajouter dans la constante `GLOBAL_STYLE` (bloc `GLOBAL_STYLE`, media query `@media (max-width: 880px)`) : `.nav-collapse-btn { display: none !important; }` pour masquer le toggle sur mobile.

### Étapes d'implémentation dans `Shell.jsx`

1. **Imports** : ajouter `PanelLeftClose, PanelLeftOpen` depuis `lucide-react` (disponibles dans lucide-react ^0.383).

2. **État `collapsed`** :
   ```jsx
   const [collapsed, setCollapsed] = useState(() => {
     try { return localStorage.getItem("mabouate:sidebar:collapsed") === "1"; } catch { return false; }
   });
   useEffect(() => {
     try { localStorage.setItem("mabouate:sidebar:collapsed", collapsed ? "1" : "0"); } catch {}
   }, [collapsed]);
   ```

3. **Détection mobile** (`useEffect` + `matchMedia("(max-width: 880px)")` ou listener `resize`) stockant un booléen `isMobile`.
   - `const rail = collapsed && !isMobile;` — toutes les conditions de rendu utilisent `rail`.
   - Si la fenêtre passe en mobile avec `collapsed === true`, le rendu redevient automatiquement déplié (le drawer mobile conserve son comportement actuel via `navOpen`).

4. **`<aside>`** :
   - `width: rail ? 64 : 232`, ajouter `transition: "width .2s ease"` au style inline (le media query mobile définit déjà `transition: transform .25s`, sans conflit car `rail` est forcé faux sur mobile).

5. **En-tête de la sidebar** (`div` padding `22px 20px`) :
   - Ajouter un bouton toggle (avant le bouton X mobile) :
     ```jsx
     <button className="nav-collapse-btn" onClick={() => setCollapsed(!collapsed)}
       title={collapsed ? "Ouvrir le menu" : "Réduire le menu"}
       style={{ background: "none", border: "none", color: "#B9BFCF", cursor: "pointer", display: "flex", alignItems: "center" }}>
       {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
     </button>
     ```
   - En mode `rail` : masquer le texte « Ma Bouate », ne garder que le carré doré (le petit `span` 5×5 gold) centré, avec `title="Ma Bouate"`. Padding réduit (ex. `padding: "22px 0"` + `justifyContent: "center"`).

6. **Items de nav (`items.map`)** — quand `rail` est vrai :
   - Container de chaque item : `justifyContent: "center"`, `padding: "10px 0"`, supprimer le gap de texte, `title={n.label}` pour tooltip natif.
   - Rendre uniquement `<Icon size={16} />` (rendu conditionnel `!rail && n.label`).
   - Conserver le style actif existant (`background #ffffff14`, `borderLeft` gold) — ces styles fonctionnent aussi en mode centré.
   - **Cas du groupe `commercial`** :
     - `onClick` du header : `rail ? (() => { setCollapsed(false); setGroupOverride(true); })() : setGroupOverride(!groupOpen)`.
     - Masquer le `ChevronDown` et le bloc enfants (`maxHeight: 0`) quand `rail`.
   - Items enfants et simples : comportement existant (`go(key)`), navigation directe même en mode replié.

7. **Carte « Installer l'application »** (`!installed && …`) : masquer entièrement quand `rail` (`!rail && !installed && …`).

8. **Pied de sidebar** (avatar entreprise + Déconnexion) :
   - Avatar : conservé, centré quand `rail`.
   - Nom d'entreprise + rôle : rendus seulement si `!rail`.
   - Déconnexion : icône seule avec `title="Déconnexion"`, centrée, `margin: 0` si `rail`.

9. **Note style de code** : ne pas ajouter de commentaires (convention du repo), suivre le style inline styles existant.

## Edge cases / risques
- `localStorage` indisponible → `try/catch` partout (déjà couvert ci-dessus).
- Le CSS mobile existant (`transform: translateX(-100%)`, `.open`, drawer) reste inchangé et fonctionnel.
- `PortalPrestataire.jsx` utilise aussi la classe `.app-sidebar` : le seul CSS ajouté est `.nav-collapse-btn { display: none !important }`, qui n'affecte rien dans ce composant (le bouton n'y existe pas).
- Le `NAV` exporté de `Shell.jsx` est peut-être importé ailleurs (`export const NAV`) : ne pas modifier sa structure.

## Validation
1. `npm run build` — compilation sans erreur.
2. `npm run dev` et vérification manuelle :
   - Clic toggle → sidebar passe à 64px, icônes centrées, tooltips au survol.
   - Clic sur une icône simple (ex. Finance) → navigation, la sidebar reste repliée.
   - Clic sur l'icône Commercial → sidebar se ré-ouvre avec le groupe déplié.
   - Rechargement de page → l'état replié persiste.
   - Fenêtre < 880px → drawer mobile identique à avant, toggle invisible.
3. `git diff` relu avant tout push ; grille d'audit `CONTROLE_DE_SECURITE.md` §6 si un push est demandé.

## Hors périmètre
- Pas de tooltip custom (on utilise l'attribut `title` natif).
- Pas de changement dans `PortalPrestataire.jsx`.
- Pas de refactor du système de styles inline.
