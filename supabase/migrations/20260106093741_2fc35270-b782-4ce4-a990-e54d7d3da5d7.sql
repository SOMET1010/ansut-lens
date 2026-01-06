UPDATE auth.users 
SET email_confirmed_at = now() 
WHERE id = 'ed5dfc69-9d7f-4c21-b5a1-95a911408808' AND email_confirmed_at IS NULL;