-- Ajouter la permission access_admin au registre
INSERT INTO permissions_registry (code, category, label_fr, description, display_order)
VALUES ('access_admin', 'admin', 'Accès administration', 'Permet d''accéder à la section administration', 100)
ON CONFLICT (code) DO NOTHING;

-- Activer cette permission pour le rôle admin
INSERT INTO role_permissions (role, permission_code, enabled)
VALUES ('admin', 'access_admin', true)
ON CONFLICT (role, permission_code) DO NOTHING;