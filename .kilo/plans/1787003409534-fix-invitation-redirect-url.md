# Fix: Prestataires cannot log in after account creation

## Problem
Prestataires invited via magic link (`signInWithOtp` with `shouldCreateUser: true`) get an auth account **without a password**. The `Login` component only supports `signInWithPassword`, so they get "Invalid login credentials" when trying to log in after their initial session expires.

## Root Cause
- `src/lib/usePrestataires.js:152-154` — invitation uses `signInWithOtp({ shouldCreateUser: true })`
- `src/lib/useAuth.js:41-44` — login only supports `signInWithPassword`
- `src/components/Login.jsx:31-35` — login form calls `onSignIn` (password only)
- Result: OTP-created users have no password and no OTP login path

## Fix Plan

### 1. Add `onSignInWithOtp` callback to `useAuth.js`
Add a new function:
```js
const signInWithOtp = async (email) => {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: SITE_URL },
  });
  return { error };
};
```
Import `SITE_URL` from `./siteUrl`.

### 2. Expose `signInWithOtp` in the hook return
Add `signInWithOtp` to the returned object from `useAuth`.

### 3. Pass `onSignInWithOtp` to `Login` in `App.jsx`
Update:
```jsx
<Login onSignIn={signIn} onSignUp={signUp} onSignInWithOtp={signInWithOtp} />
```

### 4. Add magic-link login option to `Login.jsx`
In the "connexion" mode, add a small link below the password field:
- Label: "Se connecter par lien magique"
- On click: call `onSignInWithOtp(email)` with the email entered in the form
- Show success message: "Un lien de connexion a été envoyé à [email]. Ouvrez-le pour vous connecter."
- Show error message if the call fails

### 5. Ensure `SITE_URL` is available in `useAuth.js`
Import `SITE_URL` from `./siteUrl` and use it as `emailRedirectTo`.

## Files to modify
- `src/lib/useAuth.js`
- `src/App.jsx`
- `src/components/Login.jsx`

## Validation
- In dev: verify that clicking "Se connecter par lien magique" sends an OTP email
- In production: verify the magic link redirects to the production domain (not localhost)
- Verify that existing password login still works for regular users
