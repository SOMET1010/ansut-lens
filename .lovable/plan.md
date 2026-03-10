

## Plan : Ajouter le numéro de téléphone au profil utilisateur

### Changements

**1. Migration SQL** — Ajouter la colonne `phone` à la table `profiles`
```sql
ALTER TABLE public.profiles ADD COLUMN phone text;
```

**2. `src/hooks/useUserProfile.ts`**
- Ajouter `phone` à l'interface `Profile` et `UpdateProfileData`

**3. `src/components/profile/ProfileForm.tsx`**
- Ajouter `phone` au schéma zod (optionnel, format `225XXXXXXXXXX`)
- Ajouter le champ téléphone dans le formulaire entre le nom et l'email
- Passer `phone` dans les props et le `onSubmit`

**4. `src/pages/ProfilePage.tsx`**
- Passer `profile?.phone` au composant `ProfileForm`

