# Plan — Profil utilisateur (menu déroulant) en haut à droite du header

## Objectif
Afficher le profil de l'utilisateur connecté dans le header du `<Shell>`, **juste après** le bouton œil (`onToggleAmounts`), sous forme de menu déroulant : avatar (initiales) + nom complet ; au clic → dropdown avec email, rôle, entreprise et bouton « Se déconnecter ».

## Décision confirmée avec l'utilisateur
- **Contenu** : menu déroulant (avatar + nom, clic → email, rôle, entreprise, déconnexion).

## Contexte vérifié
- `useAuth()` (`src/lib/useAuth.js:22`) charge déjà `profile` avec les colonnes `id, entreprise_id, nom_complet, email, role, entreprises(*)` — tout ce qu'il faut, aucune nouvelle requête Supabase.
- `App.jsx:102` dispose déjà de `profile` ; `Shell` (`src/App.jsx:198`) ne le reçoit **pas** encore → il faut ajouter la prop.
- Pattern dropdown existant : `NotifsBell.jsx:27-30` (overlay `position: fixed; inset: 0; z-index: 200` + panneau absolu `top: 42/44, right: 0, z-index: 201`) → reproduire à l'identique.
- `Shell` possède déjà la modale de confirmation de déconnexion (`confirmingLogout`, `src/components/Shell.jsx:269`) → la réutiliser.
- Exemple de style header : boutons 36×36, border `T.line`, borderRadius 8 (`src/components/Shell.jsx:260-263`).

## Fichiers à modifier
1. `src/App.jsx` — passer `profile` à `<Shell>`.
2. `src/components/Shell.jsx` — bouton profil + dropdown dans le header.

## Implémentation

### 1. `src/App.jsx`
- Ligne 198 : ajouter `profile={profile}` aux props de `<Shell>`.

### 2. `src/components/Shell.jsx`

**Signature** : ajouter `profile` aux props destructurées.

**État** : `const [profileOpen, setProfileOpen] = useState(false);`

**Bouton déclencheur** — insérer immédiatement après le bouton œil, dans le `div` flex du header :
```jsx
<button onClick={() => setProfileOpen((o) => !o)} title="Mon profil"
  style={{ background: "none", border: "none", borderRadius: 8, padding: "4px 6px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flexShrink: 0 }}>
  <span style={{ width: 30, height: 30, borderRadius: 8, background: T.gold, color: "#fff", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
    {initiales}
  </span>
  <span className="user-profile-name" style={{ fontSize: 12.5, fontWeight: 600, color: T.ink, maxWidth: 140, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{profile?.nom_complet}</span>
  <ChevronDown size={14} className="user-profile-name" style={{ color: T.inkSoft, transition: "transform .2s ease", transform: profileOpen ? "rotate(180deg)" : "none" }} />
</button>
```
- `initiales` : dérivées de `profile?.nom_complet` (1re lettre de chaque mot, max 2, uppercase) ; fallback `profile?.email?.[0]?.toUpperCase()` puis `"U"`.

**Dropdown** — quand `profileOpen`, après le bouton (conteneur parent `{ position: "relative" }`, wrapper englobant bouton + panneau) :
```jsx
{profileOpen && (
  <>
    <div style={{ position: "fixed", inset: 0, zIndex: 200 }} onClick={() => setProfileOpen(false)} />
    <div style={{ position: "absolute", top: 44, right: 0, width: 260, maxWidth: "calc(100vw - 32px)", background: "#fff", border: `1px solid ${T.line}`, borderRadius: 12, boxShadow: "0 12px 32px rgba(22,33,58,.16)", zIndex: 201, overflow: "hidden", fontFamily: "'IBM Plex Sans', sans-serif" }}>
      ...
    </div>
  </>
)}
```
Contenu du panneau :
- En-tête (padding `14px`, borderBottom `T.line`, background `T.bg`) : avatar 34px or + `nom_complet` (13.5 bold) + `email` (11.5, `T.inkSoft`, ellipsis).
- Corps (lignes padding `10px 14px`, fontSize 12.5) :
  - **Rôle** : valeur `profile?.role` avec `.replace("_", " ")` en capitalize (même logique que le pied de sidebar `src/components/Shell.jsx:220`).
  - **Entreprise** : `entreprise?.nom` (prop déjà disponible).
- Pied (padding `10px 14px`, borderTop `T.line`) : bouton `LogOut size={14}` + « Se déconnecter » (couleur `T.brick`, border `T.line`, borderRadius 8, width 100%) → `onClick={() => { setProfileOpen(false); setConfirmingLogout(true); }}`.

### 3. Mobile (≤880px)
Dans `GLOBAL_STYLE` de `App.jsx` (media query existante `@media (max-width: 880px)`) :
```css
.user-profile-name { display: none !important; }
```
→ seul l'avatar reste cliquable sur mobile, le dropdown fonctionne toujours.

## Notes style
- Aucun commentaire ajouté (convention repo).
- Styles inline uniquement, palette `T` existante, pas de nouvelle dépendance.
- Le wrapper du bouton+dropdown doit être `{ position: "relative" }` pour l'ancrage absolu du panneau.

## Edge cases
- `profile?.nom_complet` vide → fallback email/initiales (géré).
- Dropdown ouvert + clic ailleurs → fermeture via overlay fixe (pattern NotifsBell).
- Déconnexion → la modale de confirmation existante s'ouvre ; le dropdown est fermé avant.
- `PortalPrestataire.jsx` ne rend pas ce header : non concerné.
- Sécurité : aucune donnée sensible exposée (email/nom déjà visibles dans l'app ; pas de token/session loggé).

## Validation
1. `npm run build` — compilation sans erreur.
2. Vérification manuelle (`npm run dev`) :
   - Avatar + nom visibles à droite du bouton œil ; clic → dropdown (email, rôle, entreprise).
   - « Se déconnecter » → modale de confirmation existante.
   - Clic hors du menu → fermeture.
   - Fenêtre < 880px → seul l'avatar visible, menu toujours fonctionnel.
3. Si push demandé : grille d'audit pré-déploiement `CONTROLE_DE_SECURITE.md` §6.

## Hors périmètre
- Pas de page/édition de profil (champs existants : voir `Users.jsx` / `Entreprise.jsx`).
- Pas de changement dans `PortalPrestataire.jsx`.
- Pas de modification de `useAuth`.
