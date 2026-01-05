-- Table: Registre des permissions disponibles
CREATE TABLE public.permissions_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  category text NOT NULL,
  label_fr text NOT NULL,
  description text,
  display_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Table: Permissions par rôle
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission_code text NOT NULL REFERENCES permissions_registry(code) ON DELETE CASCADE,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(role, permission_code)
);

-- Activer RLS
ALTER TABLE permissions_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- Policies pour permissions_registry
CREATE POLICY "Anyone can view permissions" ON permissions_registry FOR SELECT USING (true);
CREATE POLICY "Admins can manage permissions_registry" ON permissions_registry FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Policies pour role_permissions
CREATE POLICY "Authenticated can view role_permissions" ON role_permissions FOR SELECT USING (true);
CREATE POLICY "Admins can manage role_permissions" ON role_permissions FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Fonction pour vérifier si un utilisateur a une permission spécifique
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role = rp.role
    WHERE ur.user_id = _user_id
      AND rp.permission_code = _permission
      AND rp.enabled = true
  )
$$;

-- Insérer les permissions disponibles
INSERT INTO permissions_registry (code, category, label_fr, description, display_order) VALUES
  -- Consultation
  ('view_radar', 'consultation', 'Voir le radar', 'Accès au tableau de bord radar', 10),
  ('view_actualites', 'consultation', 'Voir les actualités', 'Accès à la liste des actualités', 20),
  ('view_personnalites', 'consultation', 'Voir les personnalités', 'Accès aux fiches acteurs clés', 30),
  ('view_dossiers', 'consultation', 'Voir les dossiers', 'Accès aux dossiers stratégiques', 40),
  -- Actions utilisateur
  ('create_flux', 'actions', 'Créer des flux', 'Créer ses propres flux de veille', 50),
  ('edit_dossiers', 'actions', 'Modifier les dossiers', 'Créer et modifier des dossiers', 60),
  ('use_assistant', 'actions', 'Utiliser l''assistant IA', 'Poser des questions à l''IA', 70),
  ('receive_alerts', 'actions', 'Recevoir des alertes', 'Notifications et emails d''alerte', 80),
  -- Administration
  ('manage_users', 'admin', 'Gérer les utilisateurs', 'Inviter, désactiver, supprimer des utilisateurs', 100),
  ('manage_roles', 'admin', 'Gérer les rôles', 'Modifier les permissions des rôles', 110),
  ('view_audit_logs', 'admin', 'Voir les logs d''audit', 'Consulter l''historique des actions admin', 120),
  ('manage_cron_jobs', 'admin', 'Gérer les tâches CRON', 'Activer/désactiver les collectes automatiques', 130),
  ('manage_keywords', 'admin', 'Gérer les mots-clés', 'Configurer les mots-clés de veille', 140),
  ('manage_sources', 'admin', 'Gérer les sources', 'Configurer les sources média', 150),
  ('import_actors', 'admin', 'Importer des acteurs', 'Import en masse depuis fichier', 160),
  ('manage_newsletters', 'admin', 'Gérer les newsletters', 'Créer et envoyer des newsletters', 170);

-- Initialiser les permissions par défaut pour chaque rôle
-- Admin : toutes les permissions
INSERT INTO role_permissions (role, permission_code, enabled)
SELECT 'admin', code, true FROM permissions_registry;

-- User : consultation + actions
INSERT INTO role_permissions (role, permission_code, enabled)
SELECT 'user', code, true FROM permissions_registry 
WHERE category IN ('consultation', 'actions');

-- Council_user : consultation + certaines actions
INSERT INTO role_permissions (role, permission_code, enabled) VALUES
  ('council_user', 'view_radar', true),
  ('council_user', 'view_actualites', true),
  ('council_user', 'view_personnalites', true),
  ('council_user', 'view_dossiers', false),
  ('council_user', 'create_flux', true),
  ('council_user', 'edit_dossiers', false),
  ('council_user', 'use_assistant', true),
  ('council_user', 'receive_alerts', true);

-- Guest : consultation limitée
INSERT INTO role_permissions (role, permission_code, enabled) VALUES
  ('guest', 'view_radar', true),
  ('guest', 'view_actualites', true),
  ('guest', 'view_personnalites', false),
  ('guest', 'view_dossiers', false),
  ('guest', 'create_flux', false),
  ('guest', 'edit_dossiers', false),
  ('guest', 'use_assistant', false),
  ('guest', 'receive_alerts', false);

-- Trigger pour updated_at
CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();