# AGENTS.md — Règles du projet Ma Bouate

## Contrôle de sécurité obligatoire avant push

Avant tout `git push` (quelle que soit la branche), exécuter la **Grille d'Audit Pré-Déploiement (§6)** du fichier `CONTROLE_DE_SECURITE.md` à la racine du dépôt et consigner le résultat de chaque contrôle.

### Commandes à exécuter (quand applicables)

1. `npm audit` — doit renvoyer **0 vulnérabilité** (étape 1).
2. `npm run build` — compilation de production sans erreur (étape 2).
3. Vérifier le diff poussé : `git diff origin/main..HEAD` (ou `git diff` si non commité) relu intégralement.
4. Recherche de secrets dans le diff et dans `src/` (étape 5) :
   - `grep -riE "SERVICE_ROLE|SUPABASE_JWT_SECRET|service_role" src/`
   - `grep -rE "eyJ[A-Za-z0-9_-]{20,}" . --include="*.{js,jsx,ts,json,md}"` (tokens JWT accidentels)
   - Aucun fichier `.env` ne doit être stagé ; seul `.env.example` sans valeurs réelles est autorisé.
5. Nettoyage des logs (checklist §2) : `grep -r "console.log" src/` ne doit rien exposer de sensible (sessions, tokens, structures entreprise).
6. Si le changement touche des tables Supabase : vérifier RLS activé + policies CRUD isolées par `entreprise_id` (§3) dans `supabase/migrations/`.
7. Si le changement touche l'UI : les restrictions d'accès par rôle (RBAC §4) doivent être conservées côté front **et** bloquées au niveau RLS (zero-trust §1).

### Règles de blocage

- **Si un contrôle échoue : ne pas pousser.** Corriger d'abord, puis ré-auditer.
- Ne jamais committer de clé privée ou de secret. Ne jamais inclure `SUPABASE_SERVICE_ROLE_KEY` dans le code React ni dans des variables `VITE_*`.
- `CONTROLE_DE_SECURITE.md` est le document de référence ; ne pas le modifier sans demande explicite.
