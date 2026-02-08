-- Ajouter le champ password_set_at pour traquer la complétion du mot de passe
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_set_at timestamptz;