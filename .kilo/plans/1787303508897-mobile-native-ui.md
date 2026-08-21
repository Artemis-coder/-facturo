# Optimisation UI mobile native (PWA) — Ma Bouate

## Contexte
PWA React 18 + Vite (manifest OK, `display: standalone`, safe-area viewport déjà déclaré dans `index.html`). Shell actuel : sidebar desktop transformée en drawer via CSS `@media (max-width: 880px)` (`src/App.jsx:62-82`), header dense, modales en drawer latéral (`src/components/ui/Modal.jsx`), listes en tableaux `min-width: 620px` scroll horizontal (`src/components/ui/TableShell.jsx:17`).

## Décisions validées avec l'utilisateur
1. **Navigation mobile** : barre d'onglets en bas d'écran, **4 tabs + bouton central « + » + tab Menu**.
2. **Onglets par rôle** (Menu = drawer contenant le reste de la navigation) :
   - `administrateur` / `super_admin` : Tableau de bord · Clients · Factures · Menu
   - `comptable` : Tableau de bord · Clients · Finance · Menu
   - `commercial` : Tableau de bord · Clients · Devis · Projets · Menu
   - `employe` : Tableau de bord · Devis · Factures · Menu (pas de « + », aucun droit de création via `App.jsx:189-194`)
3. **Bouton « + »** : création rapide contextuelle selon rôle → bottom-sheet d'actions (Nouveau client / Nouveau devis / Nouvelle facture), navigue vers la vue et ouvre son modal de création.
4. **Modales** : transformées en **bottom sheets** (coins arrondis en haut, glisser pour fermer / tap hors zone) sur ≤880px ; drawer latéral conservé sur desktop.
5. **Périmètre** : Shell + layout global, avec mode cartes des tableaux limité à l'**infrastructure `TableShell` + 2 listes clés (Clients, Factures)**. Les autres listes gardent le scroll horizontal (chantier séparé).
6. Portail prestataire (`PortalPrestataire.jsx`) et page Login : **hors périmètre**, mais voir Risques (le portail réutilise les classes `.app-sidebar`/`.nav-*` : ne pas casser son drawer existant).

## Breakpoint et conventions
- Breakpoint unique : **880px** (existant), détecté côté React via un hook `useIsMobile` (matchMedia, même approche que `Shell.jsx:44-53`).
- Hauteur : préférer `100dvh` (fallback `100vh`) pour le shell mobile ; safe-areas via `env(safe-area-inset-*)` (viewport-fit=cover déjà présent).
- Cibles tactiles ≥ 44px dans les menus/tabs.
- Aucun commentaire ajouté dans le code (règle projet).

## Tâches ordonnées

### 1. Hook partagé `src/lib/useIsMobile.js` (nouveau)
Exporter `useIsMobile()` (matchMedia `(max-width: 880px)`, listener + cleanup) et `DESKTOP_BP = 880`. Réutilisé par Shell, Modal, TableShell, NotifsBell.

### 2. Barre d'onglets mobile (nouveau composant `src/components/MobileTabBar.jsx`)
- Rendu par `Shell.jsx` uniquement si `useIsMobile()` ; barre `position: fixed; bottom: 0`, fond `T.paper`, border-top `T.line`, padding-bottom `env(safe-area-inset-bottom)`, hauteur ~60px + safe area, `z-index` ≥ 90 (sous les sheets/modales `z-index ≥ 200`).
- 4 slots + bouton central surélevé « + » (cercle gradient or, style existant du card d'installation) si le rôle a des droits de création, sinon 4 tabs normales.
- Tabs issus du mapping par rôle (constante `TABS_BY_ROLE` dans Shell) ; icônes lucide existantes de `NAV` ; état actif = or (`T.gold`) + label ; tab « Menu » active si la vue courante n'est pas un tab.
- Le tab Menu ouvre le drawer existant (`navOpen`).
- Bouton « + » → bottom-sheet d'actions (`onQuickCreate(kind)` fourni par App) : `client` (admin/comptable/commercial), `devis` (admin/commercial), `facture` (admin/comptable).

### 3. Plomberie création rapide (`src/App.jsx` + vues)
- Ajouter `[quickCreate, setQuickCreate] = useState(null)` ; `Shell` reçoit `onQuickCreate(kind) => { setView(vueCorrespondante); setQuickCreate(kind); }`.
- Passer `createRequest` (objet `{kind, ts}`) et `onCreateHandled` à `Clients`, `Devis`, `Factures` ; chaque vue ouvre son modal de création via `useEffect` quand `createRequest` correspond à son type, puis appelle `onCreateHandled()`.
- Cartographie : `client → Clients (setEditing({...}))`, `devis → Devis (setBuilder({}))`, `facture → Factures (setCreating(true))`.

### 4. Shell mobile (`src/components/Shell.jsx`)
- Afficher `MobileTabBar` en mobile ; masquer le bouton hamburger du header (remplacé par l'onglet Menu) — conserver la logique drawer existante pour le tab Menu.
- Header mobile compact : padding réduit (existant), texte du statut en ligne/hors ligne masqué (icône+point seul, texte via `title`), nom de profil déjà masqué (existant), titre de page 17px (existant).
- Padding bas du contenu : `.app-content { padding-bottom: calc(16px + 60px + env(safe-area-inset-bottom)) !important; }` en mobile (voir étape 6) pour ne pas cacher le contenu sous la barre.
- Drawer menu mobile : items à hauteur ≥44px (`.app-sidebar nav` padding augmenté via classe CSS), boutons de fermeture visibles, overlay existant.
- Installer la PWA / bloc entreprise / déconnexion : inchangés dans le drawer.
- Le menu profil du header : en mobile, affiché en popover quasi pleine largeur (`fixed; left: 12px; right: 12px`) plutôt que `position: absolute` risquant le débordement.

### 5. Modales → bottom sheets (`src/components/ui/Modal.jsx`)
- Si `useIsMobile()` : conteneur `position: fixed; left: 0; right: 0; bottom: 0; maxHeight: 92dvh; border-radius: 18px 18px 0 0; padding-bottom: env(safe-area-inset-bottom)` ; poignée de drag visuelle ; animation `sheetIn` (translateY) ajoutée au `GLOBAL_STYLE` ; fermeture par overlay + X.
- Desktop : comportement actuel inchangé (drawer droit).
- Ignorer les largeurs `wide/extraWide` en mobile (pleine largeur).
- Menu contextuel de `NotifsBell.jsx` : même traitement en mobile (bottom sheet, idem z-index ≥ 200).

### 6. Styles globaux (`src/App.jsx` — constante `GLOBAL_STYLE`)
- Ajouter keyframes `sheetIn` ; variables/utilitaires safe-area.
- `@media (max-width: 880px)` : 
  - `.app-content` padding-bottom (voir étape 4) ; `.app-shell { min-height: 100dvh; }`.
  - `.grid-kpi` : `grid-auto-flow: column; grid-auto-columns: 78%; overflow-x: auto; scroll-snap-type: x mandatory;` + `scroll-snap-align` sur les cartes (remplace le passage en 2 colonnes/1 colonne pour un défilement natif — conserver le fallback 1 colonne à ≤480px seulement si restitution trop étrange ; tester).
  - Toast et bandeau hors-ligne de `App.jsx:260` : `bottom: calc(20px + 60px + env(safe-area-inset-bottom))` pour rester au-dessus de la barre d'onglets.
  - Classes pour TableShell mobile (`.table-cards` affiché / `.table-desktop` masqué, inverse au-dessus du breakpoint).
- Vérifier que les règles existantes `.app-sidebar/.nav-*` restent compatibles avec le portail prestataire (il réutilise ces classes) : ne pas renommer, seulement compléter.

### 7. Mode cartes de `TableShell` (`src/components/ui/TableShell.jsx`)
- Nouvelle prop `renderCard(item)` ; quand fournie, rendre en mobile (`useIsMobile`) une liste verticale de cartes (composant interne `CardList`) au lieu du `<table>` ; la toolbar (recherche/action) reste, `action` passe en pleine largeur si besoin.
- Backward compatible : sans `renderCard`, comportement identique.

### 8. Cartes Clients (`src/components/Clients.jsx`)
- `renderCard` : nom (lien vers détail `setDetail`), société, `Badge statut`, ville/tél en secondaire, bouton Modifier (si `canEdit`) ; tap sur la carte = `setDetail(c)` ; mention projet en cours si présente.
- Conserver la table desktop telle quelle.

### 9. Cartes Factures (`src/components/Factures.jsx`)
- `renderCard` : `f.id` (tap = `setPreviewing`), client, échéance, montant TTC (`fmt`), `Badge statut`, indicateur projet terminé ; actions secondaires en rangée de petits boutons wrap : Aperçu, Enregistrer paiement, Relancer, PDF, Terminé, Supprimer (mêmes conditions que `Factures.jsx:110-123`).
- Le `td` en `display:flex` actuel (`Factures.jsx:109`) est invalide dans un `<tr>` ; le corriger en passant par une cellule normale à contenu flex (impact desktop mineur, positif).

## Hors périmètre (explicite)
- Cartes mobile pour Devis, Projets, Finance, Prestataires, Users, Contracts (scroll horizontal conservé).
- Refonte mobile du `PortalPrestataire` et de `Login`.
- Gestes avancés (swipe actions sur cartes), routage URL.

## Risques et mitigations
- **Régression desktop** : tout changement visuel mobile doit être derrière media query ou `useIsMobile()` ; re-vérifier le rendu ≥881px (drawer droit, sidebar, tables).
- **Casser le portail prestataire** : il partage les classes CSS du drawer ; modifications CSS uniquement additives ou couvertes par test visuel sur le portail.
- **Clavier iOS dans les bottom sheets de formulaire** : `overflow-y: auto` interne au sheet (déjà le cas dans Modal), pas de hauteur fixe bloquante ; `maxHeight: 92dvh`.
- **Z-index** : barre d'onglets < overlay drawer (55/60 existant) < sheets (200+) ; le bandeau hors-ligne/toast repositionnés au-dessus de la barre.
- **Employé sans actions** : bouton « + » masqué (sinon sheet vide).
- `KpiBar` en scroll horizontal : vérifier `overflow` et `minWidth: 0` dans la mise en page parente (`main` l'a déjà).

## Validation
1. `npm run build` — compilation sans erreur (obligatoire AGENTS.md).
2. `npm run dev` puis vérification manuelle à 390px et 768px (DevTools, mode tactile) :
   - Barre d'onglets : états actifs par rôle simulés (changer `view`/rôle via composants ou comptes de test), bouton « + » → ouverture du bon modal, safe-area respectée (simulateur iPhone avec encoche).
   - Drawer menu depuis l'onglet Menu ; fermeture overlay ; cibles tactiles.
   - Bottom sheet : Modal Clients/Factures (formulaires, aperçu `wide`), scroll interne, fermeture tap hors zone.
   - Cartes Clients/Factures : tap → détail/apercu, actions secondaires, filtres + recherche actifs.
   - Toast et bandeau hors ligne au-dessus de la barre d'onglets.
   - Vue Login et portail prestataire non régressés (drawer mobile existant du portail).
3. Vérification ≥881px : sidebar, drawer droit des modales, tables, KPI en grille — aucun changement visuel.
4. `npm audit` (0 vulnérabilité) si un push suit, conformément à `CONTROLE_DE_SECURITE.md`.

## Questions ouvertes
Aucune — toutes les décisions majeures ont été tranchées (navigation, onglets par rôle, « + », bottom sheets, périmètre cartes).
