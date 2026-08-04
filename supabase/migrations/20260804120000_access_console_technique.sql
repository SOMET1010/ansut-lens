-- Console technique — permission dédiée (docs/ARCHITECTURE_NAVIGATION.md)
--
-- RADAR est fait de trois espaces : le PRODUIT éditorial (DIRCOM au quotidien),
-- l'ADMINISTRATION (configuration, pour quelques admins) et la CONSOLE TECHNIQUE
-- (exploitation : pipeline, collectes, tâches programmées, diagnostics, journaux).
-- Cette dernière ne doit jamais encombrer l'expérience quotidienne : elle est
-- réservée aux profils techniques.
--
-- Plutôt que d'introduire un nouveau rôle `super_admin` — ce qui imposerait de
-- réécrire une trentaine de politiques RLS et deux contrôles `role = 'admin'` en
-- dur dans les edge functions (risque réel de verrouillage) — on s'appuie sur le
-- système de permissions déjà en place : un code `access_console_technique`,
-- activable/désactivable par rôle depuis l'éditeur d'habilitations (RolesPage).
--
-- Par défaut, seul le rôle `admin` reçoit ce droit ; il conserve donc l'accès
-- exact qu'il avait. Le levier sert à créer un palier « admin de configuration »
-- (habilité à l'Administration mais pas à la Console) en retirant ce seul code.
--
-- Migration idempotente et NON destructive (aucune donnée supprimée).

-- 1. Enregistrer le code dans le catalogue des permissions.
INSERT INTO public.permissions_registry (code, category, label_fr, description, display_order)
VALUES (
  'access_console_technique',
  'admin',
  'Accès à la Console technique',
  'Ouvre l’espace d’exploitation technique : pipeline éditorial, collectes, tâches programmées, diagnostics, fraîcheur des données et journal des actions. Réservé aux profils techniques, hors du produit éditorial.',
  100
)
ON CONFLICT (code) DO NOTHING;

-- 2. Accorder ce droit au rôle admin (préserve l'accès existant).
INSERT INTO public.role_permissions (role, permission_code, enabled)
VALUES ('admin', 'access_console_technique', true)
ON CONFLICT (role, permission_code) DO NOTHING;
