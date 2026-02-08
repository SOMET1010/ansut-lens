
# Fix: Robust Password Reset Page with Error State

## Root Cause

Two problems combined:

1. **Token invalidation**: Two invitations were sent to the same user (`psomet@gmail.com`) within 3 minutes. The second call to `generateLink` invalidated the first token. The user clicked the link from the first email, which contained a dead token.

2. **Fragile error handling**: When `verifyOtp` fails for ANY reason (expired, already used, network error), the page silently redirects to `/auth` (login page) with only a brief toast. The user never understands what happened.

## Solution

Instead of redirecting to the login page on failure, show an **error state directly on the ResetPasswordPage** with:
- A clear error message ("Lien expiré ou invalide")
- A button to request a new link by entering their email
- The same visual style (ANSUT logo, card layout)

This way the user stays in context and can self-recover.

## File Changes

### 1. `src/pages/ResetPasswordPage.tsx`

Add a new state `tokenError` that shows an error UI instead of redirecting to `/auth`:

- Replace `navigate('/auth')` calls in the useEffect with `setTokenError(true)`
- Add a new UI state that renders when `tokenError` is true:
  - ANSUT logo
  - Error icon and message: "Ce lien de reinitialisation est invalide ou a expire"
  - A small form with just an email input and a "Renvoyer un lien" button
  - This form calls the `reset-user-password` Edge Function to send a fresh link
  - A "Retour a la connexion" link at the bottom

### 2. No backend changes needed

The `reset-user-password` Edge Function already supports sending password reset emails by email address. The ResetPasswordPage just needs to call it.

## Flow After Fix

```text
User clicks link --> ResetPasswordPage loads
  |
  +--> verifyOtp succeeds --> Show password creation form
  |
  +--> verifyOtp fails --> Show error state:
         "Ce lien est expire ou invalide"
         [Email input] [Renvoyer un lien]
         --> Sends new email with fresh token
         --> User clicks new link --> Password form
```

## Technical Details

New state variable and error UI in `ResetPasswordPage.tsx`:

```text
// New state
const [tokenError, setTokenError] = useState(false);

// Replace navigate('/auth') with:
setTokenError(true);

// New error UI (rendered when tokenError is true)
- Card with ANSUT logo
- AlertTriangle icon
- "Lien expire ou invalide" title
- "Ce lien a peut-etre deja ete utilise ou est expire" description
- Email input + "Renvoyer un lien" button (calls reset-user-password function)
- "Retour a la connexion" link to /auth
```

The email input will call `supabase.functions.invoke('reset-user-password', { body: { email } })` to send a fresh link, same as the "Mot de passe oublie" flow on AuthPage.

## Important

After implementing, the user should:
1. Click **Publish** to deploy the frontend changes
2. Then resend the invitation to `psomet@gmail.com` (only once, not twice)
