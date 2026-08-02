-- =============================================================================
-- Référentiel = 4 piliers du Plan Stratégique ANSUT 2026-2030
--
-- Jusqu'ici la table `piliers_strategiques` portait les 7 piliers de la Feuille
-- de route du Ministère (MTNIT). Or l'ANSUT a son PROPRE plan stratégique,
-- structuré en 4 piliers — c'est lui le référentiel de pilotage. On remplace
-- donc les 7 piliers MTNIT par les 4 piliers ANSUT (P1 Connectivité universelle,
-- P2 Services & Inclusion, P3 Usages & Compétences, P4 Excellence
-- opérationnelle). Les identifiants correspondent à `src/config/missions.ts`.
--
-- La Feuille de route MTNIT reste un cadre d'alignement national (contexte),
-- mais elle ne structure plus le rattachement des actualités.
-- Idempotent : on retire ce qui n'est pas dans le nouveau référentiel puis on
-- réinsère/actualise les 4 piliers.
-- =============================================================================

DELETE FROM public.piliers_strategiques
WHERE id NOT IN (
  'connectivite-universelle', 'services-inclusion', 'usages-competences', 'excellence-operationnelle'
);

INSERT INTO public.piliers_strategiques (id, code, nom, objectif, ansut_porteur, projets_ansut, mots_cles, ordre)
VALUES
  ('connectivite-universelle', 'P1', 'Connectivité Numérique Universelle',
   'Renforcer la connectivité sur l''ensemble du territoire : backbone, dernier kilomètre, centres de données et couverture des zones non desservies.',
   true,
   ARRAY['BUS — Backbone Universel de Services (RNHD, RIA, last mile, allumage national)','PU Rurale — Programme Universel de connectivité des zones isolées','ConnectMyZone — connectivité ciblée des zones blanches'],
   ARRAY['connectivité','connectivité rurale','connectivité universelle','couverture réseau','couverture mobile','zone blanche','zones blanches','zone non couverte','rnhd','réseau national haut débit','ria','backbone','dorsale','haut débit','très haut débit','fibre optique','fibre','last mile','dernier kilomètre','allumage','infrastructures numériques','infrastructures critiques','centre de données','datacenter','data center','couverture 4g','couverture 5g','4g','5g','connectivité satellitaire','satellite','starlink','ast spacemobile','direct-to-cell','orbite basse','télécommunications','télécoms','opérateurs','spectre','localités connectées','bus','connectmyzone','programme universel','connectivity','rural connectivity','network coverage','mobile coverage','broadband','backbone','fiber','fibre','last mile','data center','data centre','satellite internet','unconnected','telecom operators','spectrum','digital infrastructure'],
   1),
  ('services-inclusion', 'P2', 'Services Numériques & Inclusion',
   'Déployer des e-services publics et un écosystème numérique inclusif : dématérialisation, identité numérique, points d''accès et inclusion sociale et financière.',
   true,
   ARRAY['E-Conseil — dématérialisation des conseils des ministres et processus gouvernementaux','N''Zassa Girl — inclusion numérique des femmes et des jeunes filles','Abris BUS — espaces numériques connectés de proximité'],
   ARRAY['e-service','e-services','services numériques','services publics numériques','e-gouvernement','e-gouvernance','administration numérique','dématérialisation','démarches en ligne','guichet unique','identité numérique','identifiant numérique','interopérabilité','e-conseil','conseil des ministres','e-santé','e-éducation','e-administration','e-agriculture','point d''accès universel','points d''accès universels','inclusion numérique','inclusion sociale','inclusion financière','fracture numérique','entrepreneuriat','entrepreneuriat digital','start-up','startup','contenus locaux','innovation','nzassa','abris bus','femmes','jeunes filles','e-services','digital services','digital public services','e-government','digital government','digitalization','one-stop shop','digital identity','digital inclusion','financial inclusion','digital divide','startups','entrepreneurship','e-health','e-education'],
   2),
  ('usages-competences', 'P3', 'Usages Digitaux & Compétences',
   'Développer la maîtrise et l''usage du numérique : culture numérique, formation, sensibilisation et accès aux terminaux.',
   true,
   ARRAY['Devices — programme d''accès aux smartphones et équipements (crédit, subvention)','CICN — Centres d''Innovation et de Culture Numérique'],
   ARRAY['compétences numériques','culture numérique','usages numériques','usages digitaux','formation numérique','formation en ligne','digital literacy','alphabétisation numérique','littératie numérique','illectronisme','sensibilisation numérique','reconversion','montée en compétences','talents numériques','métiers du numérique','esatic','accès aux terminaux','terminaux','smartphone','smartphones','tablette','tablettes','équipements numériques','devices','cicn','inclusion des jeunes','digital skills','digital literacy','digital culture','e-learning','upskilling','reskilling','training','devices','smartphones','tablets','digital talents'],
   3),
  ('excellence-operationnelle', 'P4', 'Excellence Opérationnelle',
   'Assurer une gouvernance efficace de l''ANSUT, un financement diversifié et un rayonnement régional : pilotage, audit, mobilisation des ressources et communication.',
   true,
   ARRAY['e-CA — gestion digitale et sécurisée du Conseil d''Administration','Cockpit — tableau de bord stratégique de pilotage en temps réel'],
   ARRAY['gouvernance','gouvernance numérique','pilotage stratégique','suivi-évaluation','audit','maîtrise des risques','tableau de bord','cockpit','salle de supervision','noc','reddition de comptes','redevabilité','performance','financement','tdntic','redevance','fonds verts','partenariat public-privé','ppp','bailleurs','partenaires techniques et financiers','bad','banque mondiale','afd','kfw','uit','mobilisation des ressources','rse','communication institutionnelle','notoriété','rayonnement','rayonnement régional','e-ca','conseil d''administration','governance','monitoring','evaluation','audit','risk management','dashboard','funding','financing','public-private partnership','green funds','world bank','african development bank','resource mobilization','institutional communication'],
   4)
ON CONFLICT (id) DO UPDATE
  SET code = EXCLUDED.code,
      nom = EXCLUDED.nom,
      objectif = EXCLUDED.objectif,
      ansut_porteur = EXCLUDED.ansut_porteur,
      projets_ansut = EXCLUDED.projets_ansut,
      mots_cles = EXCLUDED.mots_cles,
      ordre = EXCLUDED.ordre,
      actif = true,
      updated_at = now();
