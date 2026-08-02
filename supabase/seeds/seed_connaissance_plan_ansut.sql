-- =============================================================================
-- SEED (séparé) — Connaissance institutionnelle : Plan Stratégique ANSUT 2026-2030
--
-- NE PAS EXÉCUTER avant revue de docs/REVUE-CONNAISSANCE-PLAN-ANSUT.md.
-- Tous les éléments sont en statut 'a_valider' (🟡) : aucune validation
-- automatique. La validation humaine se fait ensuite en base (validation =
-- 'valide', validated_by, derniere_validation).
-- Généré par scripts/extraction/generer_seed.py — ne pas éditer à la main.
-- Garde-fou : n'insère rien si la source est déjà présente.
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.institutional_sources WHERE reference = 'ansut_strategic_plan_2026_2030.pptx') THEN
    RAISE NOTICE 'Seed déjà appliqué (source présente) — abandon.';
    RETURN;
  END IF;

  CREATE TEMP TABLE _kmap(key text PRIMARY KEY, id uuid) ON COMMIT DROP;

  -- Source documentaire
  WITH s AS (
    INSERT INTO public.institutional_sources (titre, type, reference, date_document)
    VALUES ('Plan Stratégique ANSUT 2026-2030', 'plan_strategique', 'ansut_strategic_plan_2026_2030.pptx', '2026-04-01')
    RETURNING id)
  INSERT INTO _kmap SELECT 'src-plan', id FROM s;

  -- Entités stratégiques
  WITH e AS (
    INSERT INTO public.strategic_entities (type, code, libelle, description, direction_responsable, validation, note_maturite, ordre)
    VALUES ('mission', NULL, 'Mise en œuvre du Service Universel des Télécommunications', 'Mandat de l''ANSUT (Loi n°2024-352 du 6 juin 2024) : exécution des programmes de service universel pour le compte de l''État.', NULL, 'a_valider', NULL, 0)
    RETURNING id)
  INSERT INTO _kmap SELECT 'mission-su', id FROM e;
  WITH e AS (
    INSERT INTO public.strategic_entities (type, code, libelle, description, direction_responsable, validation, note_maturite, ordre)
    VALUES ('axe', 'P1', 'Connectivité Numérique Universelle', 'RNHD, RIA, centres de données ; infrastructures critiques ; couverture nationale.', NULL, 'a_valider', NULL, 1)
    RETURNING id)
  INSERT INTO _kmap SELECT 'axe-p1', id FROM e;
  WITH e AS (
    INSERT INTO public.strategic_entities (type, code, libelle, description, direction_responsable, validation, note_maturite, ordre)
    VALUES ('axe', 'P2', 'Services Numériques & Inclusion', 'e-Services publics ; entrepreneuriat digital ; inclusion sociale & financière.', NULL, 'a_valider', NULL, 2)
    RETURNING id)
  INSERT INTO _kmap SELECT 'axe-p2', id FROM e;
  WITH e AS (
    INSERT INTO public.strategic_entities (type, code, libelle, description, direction_responsable, validation, note_maturite, ordre)
    VALUES ('axe', 'P3', 'Usages Digitaux & Compétences', 'Compétences & formation ; culture numérique ; accès aux terminaux.', NULL, 'a_valider', NULL, 3)
    RETURNING id)
  INSERT INTO _kmap SELECT 'axe-p3', id FROM e;
  WITH e AS (
    INSERT INTO public.strategic_entities (type, code, libelle, description, direction_responsable, validation, note_maturite, ordre)
    VALUES ('axe', 'P4', 'Excellence Opérationnelle', 'Gouvernance efficace ; communication stratégique ; mobilisation des ressources.', NULL, 'a_valider', NULL, 4)
    RETURNING id)
  INSERT INTO _kmap SELECT 'axe-p4', id FROM e;
  WITH e AS (
    INSERT INTO public.strategic_entities (type, code, libelle, description, direction_responsable, validation, note_maturite, ordre)
    VALUES ('objectif', NULL, 'Connectivité renforcée sur l''ensemble du territoire national', NULL, NULL, 'a_valider', NULL, 5)
    RETURNING id)
  INSERT INTO _kmap SELECT 'obj-p1', id FROM e;
  WITH e AS (
    INSERT INTO public.strategic_entities (type, code, libelle, description, direction_responsable, validation, note_maturite, ordre)
    VALUES ('objectif', NULL, 'Écosystème numérique renforcé et services innovants pour tous', NULL, NULL, 'a_valider', NULL, 6)
    RETURNING id)
  INSERT INTO _kmap SELECT 'obj-p2', id FROM e;
  WITH e AS (
    INSERT INTO public.strategic_entities (type, code, libelle, description, direction_responsable, validation, note_maturite, ordre)
    VALUES ('objectif', NULL, 'Les populations maîtrisent et utilisent le numérique', NULL, NULL, 'a_valider', NULL, 7)
    RETURNING id)
  INSERT INTO _kmap SELECT 'obj-p3', id FROM e;
  WITH e AS (
    INSERT INTO public.strategic_entities (type, code, libelle, description, direction_responsable, validation, note_maturite, ordre)
    VALUES ('objectif', NULL, 'Gouvernance de l''ANSUT améliorée et rayonnement régional', NULL, NULL, 'a_valider', NULL, 8)
    RETURNING id)
  INSERT INTO _kmap SELECT 'obj-p4', id FROM e;
  WITH e AS (
    INSERT INTO public.strategic_entities (type, code, libelle, description, direction_responsable, validation, note_maturite, ordre)
    VALUES ('projet', NULL, 'BUS — Backbone Universel de Services', 'RNHD, RIA, last miles & allumage national.', NULL, 'a_valider', NULL, 9)
    RETURNING id)
  INSERT INTO _kmap SELECT 'proj-bus', id FROM e;
  WITH e AS (
    INSERT INTO public.strategic_entities (type, code, libelle, description, direction_responsable, validation, note_maturite, ordre)
    VALUES ('projet', NULL, 'PU Rurale — Programme Universel de connectivité', 'Zones isolées et rurales.', NULL, 'a_valider', NULL, 10)
    RETURNING id)
  INSERT INTO _kmap SELECT 'proj-pu-rurale', id FROM e;
  WITH e AS (
    INSERT INTO public.strategic_entities (type, code, libelle, description, direction_responsable, validation, note_maturite, ordre)
    VALUES ('projet', NULL, 'ConnectMyZone', 'Connectivité ciblée des zones blanches non couvertes par les opérateurs.', NULL, 'a_valider', NULL, 11)
    RETURNING id)
  INSERT INTO _kmap SELECT 'proj-connectmyzone', id FROM e;
  WITH e AS (
    INSERT INTO public.strategic_entities (type, code, libelle, description, direction_responsable, validation, note_maturite, ordre)
    VALUES ('projet', NULL, 'E-Conseil', 'Dématérialisation complète des conseils des ministres et processus gouvernementaux.', NULL, 'a_valider', NULL, 12)
    RETURNING id)
  INSERT INTO _kmap SELECT 'proj-econseil', id FROM e;
  WITH e AS (
    INSERT INTO public.strategic_entities (type, code, libelle, description, direction_responsable, validation, note_maturite, ordre)
    VALUES ('projet', NULL, 'N''Zassa Girl', 'Programme phare d''inclusion numérique dédié aux femmes et jeunes filles.', NULL, 'a_valider', NULL, 13)
    RETURNING id)
  INSERT INTO _kmap SELECT 'proj-nzassa-girl', id FROM e;
  WITH e AS (
    INSERT INTO public.strategic_entities (type, code, libelle, description, direction_responsable, validation, note_maturite, ordre)
    VALUES ('projet', NULL, 'Abris BUS', 'Espaces numériques connectés de proximité pour les populations.', NULL, 'a_valider', NULL, 14)
    RETURNING id)
  INSERT INTO _kmap SELECT 'proj-abris-bus', id FROM e;
  WITH e AS (
    INSERT INTO public.strategic_entities (type, code, libelle, description, direction_responsable, validation, note_maturite, ordre)
    VALUES ('projet', NULL, 'Devices', 'Programme d''accès aux smartphones et équipements (crédit, subvention).', NULL, 'a_valider', NULL, 15)
    RETURNING id)
  INSERT INTO _kmap SELECT 'proj-devices', id FROM e;
  WITH e AS (
    INSERT INTO public.strategic_entities (type, code, libelle, description, direction_responsable, validation, note_maturite, ordre)
    VALUES ('projet', NULL, 'CICN — Centres d''Innovation et de Culture Numérique', 'Hubs locaux de formation.', NULL, 'a_valider', NULL, 16)
    RETURNING id)
  INSERT INTO _kmap SELECT 'proj-cicn', id FROM e;
  WITH e AS (
    INSERT INTO public.strategic_entities (type, code, libelle, description, direction_responsable, validation, note_maturite, ordre)
    VALUES ('projet', NULL, 'e-CA', 'Plateforme de gestion sécurisée et digitale du Conseil d''Administration.', NULL, 'a_valider', NULL, 17)
    RETURNING id)
  INSERT INTO _kmap SELECT 'proj-eca', id FROM e;
  WITH e AS (
    INSERT INTO public.strategic_entities (type, code, libelle, description, direction_responsable, validation, note_maturite, ordre)
    VALUES ('projet', NULL, 'Cockpit', 'Tableau de bord stratégique de pilotage de l''ANSUT en temps réel.', NULL, 'a_valider', NULL, 18)
    RETURNING id)
  INSERT INTO _kmap SELECT 'proj-cockpit', id FROM e;
  WITH e AS (
    INSERT INTO public.strategic_entities (type, code, libelle, description, direction_responsable, validation, note_maturite, ordre)
    VALUES ('partenaire', NULL, 'BAD', NULL, NULL, 'a_valider', 'partenaire financier cité globalement — rattachement à un projet non précisé', 19)
    RETURNING id)
  INSERT INTO _kmap SELECT 'part-bad', id FROM e;
  WITH e AS (
    INSERT INTO public.strategic_entities (type, code, libelle, description, direction_responsable, validation, note_maturite, ordre)
    VALUES ('partenaire', NULL, 'Banque mondiale', NULL, NULL, 'a_valider', 'partenaire financier cité globalement — à confirmer', 20)
    RETURNING id)
  INSERT INTO _kmap SELECT 'part-banque-mondiale', id FROM e;
  WITH e AS (
    INSERT INTO public.strategic_entities (type, code, libelle, description, direction_responsable, validation, note_maturite, ordre)
    VALUES ('partenaire', NULL, 'AFD', NULL, NULL, 'a_valider', 'partenaire financier cité globalement — à confirmer', 21)
    RETURNING id)
  INSERT INTO _kmap SELECT 'part-afd', id FROM e;
  WITH e AS (
    INSERT INTO public.strategic_entities (type, code, libelle, description, direction_responsable, validation, note_maturite, ordre)
    VALUES ('partenaire', NULL, 'KfW', NULL, NULL, 'a_valider', 'partenaire financier cité globalement — à confirmer', 22)
    RETURNING id)
  INSERT INTO _kmap SELECT 'part-kfw', id FROM e;
  WITH e AS (
    INSERT INTO public.strategic_entities (type, code, libelle, description, direction_responsable, validation, note_maturite, ordre)
    VALUES ('partenaire', NULL, 'UIT', NULL, NULL, 'a_valider', 'partenaire cité globalement — à confirmer', 23)
    RETURNING id)
  INSERT INTO _kmap SELECT 'part-uit', id FROM e;
  WITH e AS (
    INSERT INTO public.strategic_entities (type, code, libelle, description, direction_responsable, validation, note_maturite, ordre)
    VALUES ('partenaire', NULL, 'ARTCI', NULL, NULL, 'a_valider', 'partenaire institutionnel (régulation) — à confirmer', 24)
    RETURNING id)
  INSERT INTO _kmap SELECT 'part-artci', id FROM e;
  WITH e AS (
    INSERT INTO public.strategic_entities (type, code, libelle, description, direction_responsable, validation, note_maturite, ordre)
    VALUES ('partenaire', NULL, 'Ministère de la Santé', NULL, NULL, 'a_valider', 'partenaire institutionnel (usages) — à confirmer', 25)
    RETURNING id)
  INSERT INTO _kmap SELECT 'part-min-sante', id FROM e;
  WITH e AS (
    INSERT INTO public.strategic_entities (type, code, libelle, description, direction_responsable, validation, note_maturite, ordre)
    VALUES ('partenaire', NULL, 'Ministère de l''Éducation', NULL, NULL, 'a_valider', 'partenaire institutionnel (usages) — à confirmer', 26)
    RETURNING id)
  INSERT INTO _kmap SELECT 'part-min-education', id FROM e;
  WITH e AS (
    INSERT INTO public.strategic_entities (type, code, libelle, description, direction_responsable, validation, note_maturite, ordre)
    VALUES ('partenaire', NULL, 'Ministère de l''Agriculture', NULL, NULL, 'a_valider', 'partenaire institutionnel (usages) — à confirmer', 27)
    RETURNING id)
  INSERT INTO _kmap SELECT 'part-min-agriculture', id FROM e;

  -- Indicateurs
  WITH i AS (
    INSERT INTO public.strategic_indicators (entity_id, libelle, valeur_cible, unite, echeance, validation, note)
    VALUES ((SELECT id FROM _kmap WHERE key = 'obj-p1'), 'Fibre optique allumée (total)', '34 821 km', NULL, '2030-12-31', 'a_valider', NULL)
    RETURNING id)
  INSERT INTO _kmap SELECT 'ind-0', id FROM i;
  WITH i AS (
    INSERT INTO public.strategic_indicators (entity_id, libelle, valeur_cible, unite, echeance, validation, note)
    VALUES ((SELECT id FROM _kmap WHERE key = 'obj-p1'), 'Backbone supplémentaire', '3 562 km', NULL, '2030-12-31', 'a_valider', NULL)
    RETURNING id)
  INSERT INTO _kmap SELECT 'ind-1', id FROM i;
  WITH i AS (
    INSERT INTO public.strategic_indicators (entity_id, libelle, valeur_cible, unite, echeance, validation, note)
    VALUES ((SELECT id FROM _kmap WHERE key = 'obj-p1'), 'Fibre métropolitaine', '2 080 km', NULL, '2030-12-31', 'a_valider', NULL)
    RETURNING id)
  INSERT INTO _kmap SELECT 'ind-2', id FROM i;
  WITH i AS (
    INSERT INTO public.strategic_indicators (entity_id, libelle, valeur_cible, unite, echeance, validation, note)
    VALUES ((SELECT id FROM _kmap WHERE key = 'obj-p1'), 'Fibre last mile', '7 452 km', NULL, '2030-12-31', 'a_valider', NULL)
    RETURNING id)
  INSERT INTO _kmap SELECT 'ind-3', id FROM i;
  WITH i AS (
    INSERT INTO public.strategic_indicators (entity_id, libelle, valeur_cible, unite, echeance, validation, note)
    VALUES ((SELECT id FROM _kmap WHERE key = 'obj-p1'), 'Établissements scolaires et universitaires connectés', '356', NULL, '2030-12-31', 'a_valider', NULL)
    RETURNING id)
  INSERT INTO _kmap SELECT 'ind-4', id FROM i;
  WITH i AS (
    INSERT INTO public.strategic_indicators (entity_id, libelle, valeur_cible, unite, echeance, validation, note)
    VALUES ((SELECT id FROM _kmap WHERE key = 'obj-p1'), 'Administrations connectées au haut débit', '480', NULL, '2030-12-31', 'a_valider', NULL)
    RETURNING id)
  INSERT INTO _kmap SELECT 'ind-5', id FROM i;
  WITH i AS (
    INSERT INTO public.strategic_indicators (entity_id, libelle, valeur_cible, unite, echeance, validation, note)
    VALUES ((SELECT id FROM _kmap WHERE key = 'obj-p1'), 'Établissements sanitaires connectés', '65 %', NULL, '2030-12-31', 'a_valider', NULL)
    RETURNING id)
  INSERT INTO _kmap SELECT 'ind-6', id FROM i;
  WITH i AS (
    INSERT INTO public.strategic_indicators (entity_id, libelle, valeur_cible, unite, echeance, validation, note)
    VALUES ((SELECT id FROM _kmap WHERE key = 'obj-p1'), 'Frontières connectées au backbone national', '5', NULL, '2030-12-31', 'a_valider', NULL)
    RETURNING id)
  INSERT INTO _kmap SELECT 'ind-7', id FROM i;
  WITH i AS (
    INSERT INTO public.strategic_indicators (entity_id, libelle, valeur_cible, unite, echeance, validation, note)
    VALUES ((SELECT id FROM _kmap WHERE key = 'obj-p1'), 'Utilisation minimale du backbone par les opérateurs', '40 %', NULL, '2030-12-31', 'a_valider', NULL)
    RETURNING id)
  INSERT INTO _kmap SELECT 'ind-8', id FROM i;
  WITH i AS (
    INSERT INTO public.strategic_indicators (entity_id, libelle, valeur_cible, unite, echeance, validation, note)
    VALUES ((SELECT id FROM _kmap WHERE key = 'obj-p2'), 'e-Services et plateformes sectorielles déployés', '24', NULL, '2030-12-31', 'a_valider', NULL)
    RETURNING id)
  INSERT INTO _kmap SELECT 'ind-9', id FROM i;
  WITH i AS (
    INSERT INTO public.strategic_indicators (entity_id, libelle, valeur_cible, unite, echeance, validation, note)
    VALUES ((SELECT id FROM _kmap WHERE key = 'obj-p2'), 'Services prioritaires de l''État entièrement dématérialisés', '5', NULL, '2030-12-31', 'a_valider', NULL)
    RETURNING id)
  INSERT INTO _kmap SELECT 'ind-10', id FROM i;
  WITH i AS (
    INSERT INTO public.strategic_indicators (entity_id, libelle, valeur_cible, unite, echeance, validation, note)
    VALUES ((SELECT id FROM _kmap WHERE key = 'obj-p2'), 'Points d''accès universels dans les zones isolées', '125', NULL, '2030-12-31', 'a_valider', NULL)
    RETURNING id)
  INSERT INTO _kmap SELECT 'ind-11', id FROM i;
  WITH i AS (
    INSERT INTO public.strategic_indicators (entity_id, libelle, valeur_cible, unite, echeance, validation, note)
    VALUES ((SELECT id FROM _kmap WHERE key = 'obj-p2'), 'Personnes accompagnées en zone rurale', '10 000', NULL, '2030-12-31', 'a_valider', NULL)
    RETURNING id)
  INSERT INTO _kmap SELECT 'ind-12', id FROM i;
  WITH i AS (
    INSERT INTO public.strategic_indicators (entity_id, libelle, valeur_cible, unite, echeance, validation, note)
    VALUES ((SELECT id FROM _kmap WHERE key = 'obj-p2'), 'Jeunes formés aux métiers du numérique', '6 500', NULL, '2030-12-31', 'a_valider', NULL)
    RETURNING id)
  INSERT INTO _kmap SELECT 'ind-13', id FROM i;
  WITH i AS (
    INSERT INTO public.strategic_indicators (entity_id, libelle, valeur_cible, unite, echeance, validation, note)
    VALUES ((SELECT id FROM _kmap WHERE key = 'obj-p2'), 'Femmes bénéficiaires de programmes dédiés', '2 500', NULL, '2030-12-31', 'a_valider', NULL)
    RETURNING id)
  INSERT INTO _kmap SELECT 'ind-14', id FROM i;
  WITH i AS (
    INSERT INTO public.strategic_indicators (entity_id, libelle, valeur_cible, unite, echeance, validation, note)
    VALUES ((SELECT id FROM _kmap WHERE key = 'obj-p2'), 'Start-ups numériques accompagnées', '10', NULL, '2030-12-31', 'a_valider', NULL)
    RETURNING id)
  INSERT INTO _kmap SELECT 'ind-15', id FROM i;
  WITH i AS (
    INSERT INTO public.strategic_indicators (entity_id, libelle, valeur_cible, unite, echeance, validation, note)
    VALUES ((SELECT id FROM _kmap WHERE key = 'obj-p3'), 'Personnes sensibilisées chaque année', '20 000', NULL, '2030-12-31', 'a_valider', NULL)
    RETURNING id)
  INSERT INTO _kmap SELECT 'ind-16', id FROM i;
  WITH i AS (
    INSERT INTO public.strategic_indicators (entity_id, libelle, valeur_cible, unite, echeance, validation, note)
    VALUES ((SELECT id FROM _kmap WHERE key = 'obj-p3'), 'Personnes formées au numérique', '112 000', NULL, '2030-12-31', 'a_valider', NULL)
    RETURNING id)
  INSERT INTO _kmap SELECT 'ind-17', id FROM i;
  WITH i AS (
    INSERT INTO public.strategic_indicators (entity_id, libelle, valeur_cible, unite, echeance, validation, note)
    VALUES ((SELECT id FROM _kmap WHERE key = 'obj-p3'), 'Taux d''accès visé aux smartphones', '80 %', NULL, '2030-12-31', 'a_valider', NULL)
    RETURNING id)
  INSERT INTO _kmap SELECT 'ind-18', id FROM i;
  WITH i AS (
    INSERT INTO public.strategic_indicators (entity_id, libelle, valeur_cible, unite, echeance, validation, note)
    VALUES ((SELECT id FROM _kmap WHERE key = 'obj-p4'), 'Taux d''exécution du plan d''audit annuel', '100 %', NULL, '2030-12-31', 'a_valider', NULL)
    RETURNING id)
  INSERT INTO _kmap SELECT 'ind-19', id FROM i;
  WITH i AS (
    INSERT INTO public.strategic_indicators (entity_id, libelle, valeur_cible, unite, echeance, validation, note)
    VALUES ((SELECT id FROM _kmap WHERE key = 'obj-p4'), 'Score de notoriété auprès du public cible', '80 %', NULL, '2030-12-31', 'a_valider', NULL)
    RETURNING id)
  INSERT INTO _kmap SELECT 'ind-20', id FROM i;
  WITH i AS (
    INSERT INTO public.strategic_indicators (entity_id, libelle, valeur_cible, unite, echeance, validation, note)
    VALUES ((SELECT id FROM _kmap WHERE key = 'obj-p4'), 'Taux de couverture des besoins financiers', '80 %', NULL, '2030-12-31', 'a_valider', NULL)
    RETURNING id)
  INSERT INTO _kmap SELECT 'ind-21', id FROM i;
  WITH i AS (
    INSERT INTO public.strategic_indicators (entity_id, libelle, valeur_cible, unite, echeance, validation, note)
    VALUES ((SELECT id FROM _kmap WHERE key = 'obj-p4'), 'Organes de gouvernance fonctionnels', '100 %', NULL, '2030-12-31', 'a_valider', NULL)
    RETURNING id)
  INSERT INTO _kmap SELECT 'ind-22', id FROM i;

  -- Relations
  INSERT INTO public.strategic_relations (parent_id, enfant_id, type_relation, validation)
  VALUES ((SELECT id FROM _kmap WHERE key = 'mission-su'), (SELECT id FROM _kmap WHERE key = 'axe-p1'), 'contient', 'a_valider');
  INSERT INTO public.strategic_relations (parent_id, enfant_id, type_relation, validation)
  VALUES ((SELECT id FROM _kmap WHERE key = 'mission-su'), (SELECT id FROM _kmap WHERE key = 'axe-p2'), 'contient', 'a_valider');
  INSERT INTO public.strategic_relations (parent_id, enfant_id, type_relation, validation)
  VALUES ((SELECT id FROM _kmap WHERE key = 'mission-su'), (SELECT id FROM _kmap WHERE key = 'axe-p3'), 'contient', 'a_valider');
  INSERT INTO public.strategic_relations (parent_id, enfant_id, type_relation, validation)
  VALUES ((SELECT id FROM _kmap WHERE key = 'mission-su'), (SELECT id FROM _kmap WHERE key = 'axe-p4'), 'contient', 'a_valider');
  INSERT INTO public.strategic_relations (parent_id, enfant_id, type_relation, validation)
  VALUES ((SELECT id FROM _kmap WHERE key = 'axe-p1'), (SELECT id FROM _kmap WHERE key = 'obj-p1'), 'contient', 'a_valider');
  INSERT INTO public.strategic_relations (parent_id, enfant_id, type_relation, validation)
  VALUES ((SELECT id FROM _kmap WHERE key = 'axe-p2'), (SELECT id FROM _kmap WHERE key = 'obj-p2'), 'contient', 'a_valider');
  INSERT INTO public.strategic_relations (parent_id, enfant_id, type_relation, validation)
  VALUES ((SELECT id FROM _kmap WHERE key = 'axe-p3'), (SELECT id FROM _kmap WHERE key = 'obj-p3'), 'contient', 'a_valider');
  INSERT INTO public.strategic_relations (parent_id, enfant_id, type_relation, validation)
  VALUES ((SELECT id FROM _kmap WHERE key = 'axe-p4'), (SELECT id FROM _kmap WHERE key = 'obj-p4'), 'contient', 'a_valider');
  INSERT INTO public.strategic_relations (parent_id, enfant_id, type_relation, validation)
  VALUES ((SELECT id FROM _kmap WHERE key = 'axe-p1'), (SELECT id FROM _kmap WHERE key = 'proj-bus'), 'contient', 'a_valider');
  INSERT INTO public.strategic_relations (parent_id, enfant_id, type_relation, validation)
  VALUES ((SELECT id FROM _kmap WHERE key = 'axe-p1'), (SELECT id FROM _kmap WHERE key = 'proj-pu-rurale'), 'contient', 'a_valider');
  INSERT INTO public.strategic_relations (parent_id, enfant_id, type_relation, validation)
  VALUES ((SELECT id FROM _kmap WHERE key = 'axe-p1'), (SELECT id FROM _kmap WHERE key = 'proj-connectmyzone'), 'contient', 'a_valider');
  INSERT INTO public.strategic_relations (parent_id, enfant_id, type_relation, validation)
  VALUES ((SELECT id FROM _kmap WHERE key = 'axe-p2'), (SELECT id FROM _kmap WHERE key = 'proj-econseil'), 'contient', 'a_valider');
  INSERT INTO public.strategic_relations (parent_id, enfant_id, type_relation, validation)
  VALUES ((SELECT id FROM _kmap WHERE key = 'axe-p2'), (SELECT id FROM _kmap WHERE key = 'proj-nzassa-girl'), 'contient', 'a_valider');
  INSERT INTO public.strategic_relations (parent_id, enfant_id, type_relation, validation)
  VALUES ((SELECT id FROM _kmap WHERE key = 'axe-p2'), (SELECT id FROM _kmap WHERE key = 'proj-abris-bus'), 'contient', 'a_valider');
  INSERT INTO public.strategic_relations (parent_id, enfant_id, type_relation, validation)
  VALUES ((SELECT id FROM _kmap WHERE key = 'axe-p3'), (SELECT id FROM _kmap WHERE key = 'proj-devices'), 'contient', 'a_valider');
  INSERT INTO public.strategic_relations (parent_id, enfant_id, type_relation, validation)
  VALUES ((SELECT id FROM _kmap WHERE key = 'axe-p3'), (SELECT id FROM _kmap WHERE key = 'proj-cicn'), 'contient', 'a_valider');
  INSERT INTO public.strategic_relations (parent_id, enfant_id, type_relation, validation)
  VALUES ((SELECT id FROM _kmap WHERE key = 'axe-p4'), (SELECT id FROM _kmap WHERE key = 'proj-eca'), 'contient', 'a_valider');
  INSERT INTO public.strategic_relations (parent_id, enfant_id, type_relation, validation)
  VALUES ((SELECT id FROM _kmap WHERE key = 'axe-p4'), (SELECT id FROM _kmap WHERE key = 'proj-cockpit'), 'contient', 'a_valider');
  INSERT INTO public.strategic_relations (parent_id, enfant_id, type_relation, validation)
  VALUES ((SELECT id FROM _kmap WHERE key = 'axe-p4'), (SELECT id FROM _kmap WHERE key = 'part-bad'), 'partenaire_de', 'suppose');
  INSERT INTO public.strategic_relations (parent_id, enfant_id, type_relation, validation)
  VALUES ((SELECT id FROM _kmap WHERE key = 'axe-p4'), (SELECT id FROM _kmap WHERE key = 'part-banque-mondiale'), 'partenaire_de', 'suppose');
  INSERT INTO public.strategic_relations (parent_id, enfant_id, type_relation, validation)
  VALUES ((SELECT id FROM _kmap WHERE key = 'axe-p4'), (SELECT id FROM _kmap WHERE key = 'part-afd'), 'partenaire_de', 'suppose');
  INSERT INTO public.strategic_relations (parent_id, enfant_id, type_relation, validation)
  VALUES ((SELECT id FROM _kmap WHERE key = 'axe-p4'), (SELECT id FROM _kmap WHERE key = 'part-kfw'), 'partenaire_de', 'suppose');
  INSERT INTO public.strategic_relations (parent_id, enfant_id, type_relation, validation)
  VALUES ((SELECT id FROM _kmap WHERE key = 'axe-p4'), (SELECT id FROM _kmap WHERE key = 'part-uit'), 'partenaire_de', 'suppose');
  INSERT INTO public.strategic_relations (parent_id, enfant_id, type_relation, validation)
  VALUES ((SELECT id FROM _kmap WHERE key = 'mission-su'), (SELECT id FROM _kmap WHERE key = 'part-artci'), 'partenaire_de', 'suppose');
  INSERT INTO public.strategic_relations (parent_id, enfant_id, type_relation, validation)
  VALUES ((SELECT id FROM _kmap WHERE key = 'axe-p2'), (SELECT id FROM _kmap WHERE key = 'part-min-sante'), 'partenaire_de', 'suppose');
  INSERT INTO public.strategic_relations (parent_id, enfant_id, type_relation, validation)
  VALUES ((SELECT id FROM _kmap WHERE key = 'axe-p2'), (SELECT id FROM _kmap WHERE key = 'part-min-education'), 'partenaire_de', 'suppose');
  INSERT INTO public.strategic_relations (parent_id, enfant_id, type_relation, validation)
  VALUES ((SELECT id FROM _kmap WHERE key = 'axe-p2'), (SELECT id FROM _kmap WHERE key = 'part-min-agriculture'), 'partenaire_de', 'suppose');

  -- Preuves documentaires (entités)
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'entity', (SELECT id FROM _kmap WHERE key = 'mission-su'), 'Diapositive 5', 'Mise en œuvre : Exécution des programmes de service universel pour le compte de l''État.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'entity', (SELECT id FROM _kmap WHERE key = 'axe-p1'), 'Diapositive 11', 'P1 Connectivité Numérique Universelle — RNHD, RIA, Centres de données ; Infrastructures critiques ; Couverture nationale.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'entity', (SELECT id FROM _kmap WHERE key = 'axe-p2'), 'Diapositive 11', 'P2 Services Numériques & Inclusion — e-Services publics ; Entrepreneuriat digital ; Inclusion sociale & financière.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'entity', (SELECT id FROM _kmap WHERE key = 'axe-p3'), 'Diapositive 11', 'P3 Usages Digitaux — Compétences & Formation ; Culture numérique ; Accès aux terminaux.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'entity', (SELECT id FROM _kmap WHERE key = 'axe-p4'), 'Diapositive 11', 'P4 Excellence Opérationnelle — Gouvernance efficace ; Communication stratégique ; Mobilisation des ressources.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'entity', (SELECT id FROM _kmap WHERE key = 'obj-p1'), 'Diapositive 12', 'PILIER 1 — Impact visé : Connectivité renforcée sur l''ensemble du territoire national.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'entity', (SELECT id FROM _kmap WHERE key = 'obj-p2'), 'Diapositive 13', 'PILIER 2 — Impact visé : Écosystème numérique renforcé et services innovants pour tous.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'entity', (SELECT id FROM _kmap WHERE key = 'obj-p3'), 'Diapositive 14', 'PILIER 3 — Impact visé : Les populations maîtrisent et utilisent le numérique.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'entity', (SELECT id FROM _kmap WHERE key = 'obj-p4'), 'Diapositive 15', 'PILIER 4 — Impact visé : Gouvernance de l''ANSUT améliorée · Rayonnement régional.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'entity', (SELECT id FROM _kmap WHERE key = 'proj-bus'), 'Diapositive 17', 'BUS — Backbone Universel de Services : RNHD, RIA, Last miles & Allumage national.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'entity', (SELECT id FROM _kmap WHERE key = 'proj-pu-rurale'), 'Diapositive 17', 'PU Rurale — Programme Universel de connectivité pour les zones isolées et rurales.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'entity', (SELECT id FROM _kmap WHERE key = 'proj-connectmyzone'), 'Diapositive 17', 'ConnectMyZone — Connectivité ciblée des zones blanches non couvertes par les opérateurs.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'entity', (SELECT id FROM _kmap WHERE key = 'proj-econseil'), 'Diapositive 17', 'E-Conseil — Dématérialisation complète des conseils de ministres et processus gouvernementaux.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'entity', (SELECT id FROM _kmap WHERE key = 'proj-nzassa-girl'), 'Diapositive 17', 'N''Zassa Girl — Programme phare d''inclusion numérique dédié aux femmes et jeunes filles.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'entity', (SELECT id FROM _kmap WHERE key = 'proj-abris-bus'), 'Diapositive 17', 'Abris BUS — Espaces numériques connectés de proximité pour les populations.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'entity', (SELECT id FROM _kmap WHERE key = 'proj-devices'), 'Diapositive 17', 'Devices — Programme massif d''accès aux smartphones et équipements (crédit, subvention).', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'entity', (SELECT id FROM _kmap WHERE key = 'proj-cicn'), 'Diapositive 17', 'CICN — Centres d''Innovation et de Culture Numérique : hubs locaux de formation.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'entity', (SELECT id FROM _kmap WHERE key = 'proj-eca'), 'Diapositive 17', 'e-CA — Plateforme de gestion sécurisée et digitale du Conseil d''Administration.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'entity', (SELECT id FROM _kmap WHERE key = 'proj-cockpit'), 'Diapositive 17', 'Cockpit — Tableau de bord stratégique de pilotage de l''ANSUT en temps réel.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'entity', (SELECT id FROM _kmap WHERE key = 'part-bad'), 'Diapositive 19', 'Diversification : Mobilisation active des bailleurs internationaux (PTF) : BAD, Banque Mondiale, AFD, KfW, UIT.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'entity', (SELECT id FROM _kmap WHERE key = 'part-banque-mondiale'), 'Diapositive 19', 'Mobilisation active des bailleurs internationaux (PTF) : BAD, Banque Mondiale, AFD, KfW, UIT.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'entity', (SELECT id FROM _kmap WHERE key = 'part-afd'), 'Diapositive 19', 'Mobilisation active des bailleurs internationaux (PTF) : BAD, Banque Mondiale, AFD, KfW, UIT.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'entity', (SELECT id FROM _kmap WHERE key = 'part-kfw'), 'Diapositive 19', 'Mobilisation active des bailleurs internationaux (PTF) : BAD, Banque Mondiale, AFD, KfW, UIT.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'entity', (SELECT id FROM _kmap WHERE key = 'part-uit'), 'Diapositive 19', 'Mobilisation active des bailleurs internationaux (PTF) : BAD, Banque Mondiale, AFD, KfW, UIT.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'entity', (SELECT id FROM _kmap WHERE key = 'part-artci'), 'Diapositive 19', 'Institutionnels : Ministères sectoriels (Santé, Éducation, Agriculture) pour les usages, ARTCI pour la régulation.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'entity', (SELECT id FROM _kmap WHERE key = 'part-min-sante'), 'Diapositive 19', 'Ministères sectoriels (Santé, Éducation, Agriculture) pour les usages.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'entity', (SELECT id FROM _kmap WHERE key = 'part-min-education'), 'Diapositive 19', 'Ministères sectoriels (Santé, Éducation, Agriculture) pour les usages.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'entity', (SELECT id FROM _kmap WHERE key = 'part-min-agriculture'), 'Diapositive 19', 'Ministères sectoriels (Santé, Éducation, Agriculture) pour les usages.', 'extraction_assistee', '2026-04-01');

  -- Preuves documentaires (indicateurs)
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'indicator', (SELECT id FROM _kmap WHERE key = 'ind-0'), 'Diapositive 12', '34 821 km de fibre optique allumée au total.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'indicator', (SELECT id FROM _kmap WHERE key = 'ind-1'), 'Diapositive 12', '3 562 km de fibre optique backbone supplémentaires.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'indicator', (SELECT id FROM _kmap WHERE key = 'ind-2'), 'Diapositive 12', '2 080 km de fibre optique métropolitaine.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'indicator', (SELECT id FROM _kmap WHERE key = 'ind-3'), 'Diapositive 12', '7 452 km de fibre optique last mile.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'indicator', (SELECT id FROM _kmap WHERE key = 'ind-4'), 'Diapositive 12', '356 établissements scolaires et universitaires connectés.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'indicator', (SELECT id FROM _kmap WHERE key = 'ind-5'), 'Diapositive 12', '480 Administrations connectées au haut débit.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'indicator', (SELECT id FROM _kmap WHERE key = 'ind-6'), 'Diapositive 12', '65% Établissements sanitaires connectés.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'indicator', (SELECT id FROM _kmap WHERE key = 'ind-7'), 'Diapositive 12', '5 Frontières connectées au backbone national.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'indicator', (SELECT id FROM _kmap WHERE key = 'ind-8'), 'Diapositive 12', '40% Utilisation minimale backbone par les opérateurs.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'indicator', (SELECT id FROM _kmap WHERE key = 'ind-9'), 'Diapositive 13', '24 e-Services et plateformes sectorielles déployés.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'indicator', (SELECT id FROM _kmap WHERE key = 'ind-10'), 'Diapositive 13', '5 Services prioritaires de l''État entièrement dématérialisés.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'indicator', (SELECT id FROM _kmap WHERE key = 'ind-11'), 'Diapositive 13', '125 Points d''accès universels dans les zones isolées.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'indicator', (SELECT id FROM _kmap WHERE key = 'ind-12'), 'Diapositive 13', '10 000 Personnes accompagnées en zone rurale.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'indicator', (SELECT id FROM _kmap WHERE key = 'ind-13'), 'Diapositive 13', '6 500 Jeunes formés aux métiers du numérique.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'indicator', (SELECT id FROM _kmap WHERE key = 'ind-14'), 'Diapositive 13', '2 500 Femmes bénéficiaires de programmes dédiés.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'indicator', (SELECT id FROM _kmap WHERE key = 'ind-15'), 'Diapositive 13', '10 Start-ups numériques accompagnées.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'indicator', (SELECT id FROM _kmap WHERE key = 'ind-16'), 'Diapositive 14', '20 000 Personnes sensibilisées chaque année.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'indicator', (SELECT id FROM _kmap WHERE key = 'ind-17'), 'Diapositive 14', '112 000 Personnes formées au numérique (2030).', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'indicator', (SELECT id FROM _kmap WHERE key = 'ind-18'), 'Diapositive 14', '80% Taux d''accès visé aux smartphones.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'indicator', (SELECT id FROM _kmap WHERE key = 'ind-19'), 'Diapositive 15', '100% Taux d''exécution du plan d''audit annuel.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'indicator', (SELECT id FROM _kmap WHERE key = 'ind-20'), 'Diapositive 15', '80% Score de notoriété auprès du public cible.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'indicator', (SELECT id FROM _kmap WHERE key = 'ind-21'), 'Diapositive 15', '80% Taux de couverture des besoins financiers.', 'extraction_assistee', '2026-04-01');
  INSERT INTO public.knowledge_evidence (source_id, cible_type, cible_id, localisation, texte_origine, methode_extraction, date_document)
  VALUES ((SELECT id FROM _kmap WHERE key = 'src-plan'), 'indicator', (SELECT id FROM _kmap WHERE key = 'ind-22'), 'Diapositive 15', '100% Organes de gouvernance fonctionnels.', 'extraction_assistee', '2026-04-01');

  RAISE NOTICE 'Seed connaissance appliqué (statut a_valider). Passez à la revue/validation.';
END $$;
