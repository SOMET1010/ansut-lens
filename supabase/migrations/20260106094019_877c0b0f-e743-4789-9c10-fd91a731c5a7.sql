UPDATE auth.users 
SET email_confirmed_at = now() 
WHERE id = 'aadd61ef-982e-44d7-9f7e-1146060a8938' 
  AND email_confirmed_at IS NULL;