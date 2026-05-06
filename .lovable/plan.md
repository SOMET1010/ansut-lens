# Plan de correction — Audit RADAR (MTND)

Ce plan couvre l'ensemble des points listés dans le rapport ministériel et produit un rapport PDF de synthèse à la fin.

---

## A. Page d'accueil (`/` → RadarPage)

**Header (`AppHeader.tsx`)**
- Déplacer le logo ANSUT à droite (déjà à droite — vérifier ordre exact : Notifications → Profil → Logo).
- Renommer "Centre de Veille" → **"Accueil"** dans le titre de page et la sidebar.
- Supprimer la mention "Connecté" si présente dans header/sidebar.

**RadarPage — Synthèse**
- Supprimer le bloc supérieur "DG → notification" (bandeau mode/bandeau briefing redondant).
- Supprimer **ShareOfVoiceWidget** ("Écho et résonance") de l'onglet Synthèse.
- Supprimer le widget **"Influenceur métier"** (`RadarProximiteWidget` ou équivalent).
- Supprimer le bloc "Mentions…" KPI dupliqué (déjà présent en haut → ne le rendre qu'une fois).
- Supprimer **CompactRadar** "Détection et alertes critiques".
- Supprimer **"Alertes temps réel"** (le rebrancher uniquement via `NotificationCenter` du header).
- Remonter le bloc **"Veille web"** (IntelligenceFeed / Aperçu du flux) tout en haut de l'accueil.
- Bloc profil reste en haut à droite après notifications (déjà OK — vérifier).

## B. Actualités veille (`/actualites`)
- Supprimer le bloc **"Tonalité du jour"**.
- Ajouter une **source cliquable** sur chaque indice de sentiment (badge avec lien vers article source / méthode de calcul).

## C. Mes flux (`/flux`)
- Supprimer l'onglet **"Query"** dans le détail flux.
- Supprimer la mention **"Quadrants"**.
- Remplacer "Voir flux" → **"Voir le résultat"**.
- Remplacer "Paramètres" → **"Modifier"**.
- Supprimer la mention **"Quotidien"** (fréquence affichée).
- Supprimer affichage du **score** et du **pourcentage** sur les cartes flux.

## D. Fusion Acteurs & Influence + Espace Com (`/communication` + `/acteurs`)
- Créer une page unifiée **"Communication & Influence"** avec onglets :
  - Campagnes Com
  - Acteurs & Influence
  - Réactions / Corrélation
- Mettre à jour la sidebar (un seul item au lieu de deux).
- Dans l'ancien Espace Com : **supprimer du bloc "Mon impact média du jour" jusqu'à "Part de voix"** (widget MediaImpact + ShareOfVoice).
- Conserver les autres widgets (réactions, valorisation, comptes ANSUT).

## E. Studio publication (`/dossiers`)
- Supprimer le hero **"Bienvenue dans le studio de publication"**.
- Supprimer la section **"Derniers documents validés"**.
- Renommer l'onglet/vue **"DG"** → **"Statistiques"**.
- Sourcer les compteurs "Notes publiées", "En préparation", "Newsletters envoyées" (lien vers liste filtrée correspondante).
- Supprimer la **vue "Crise"** (mode crisis du ViewModeContext sur cette page uniquement).

**Vue Analyste**
- Supprimer le bloc **"Dernier envoi au conseil"**.
- Ajouter une **info-bulle / aide** expliquant comment définir les destinataires d'une note et l'usage (ciblage, traçabilité).
- Fusionner **"Nouvelle note"** et **"Brouillon & en cours"** en un seul point d'entrée (CTA unique + onglet Brouillons).
- Permettre la **création de groupes de destinataires** (UI + table `destinataires_groupes`).
- Configurer l'**email de notification** dans le bloc "Programmation".
- Une programmation exécutée doit s'enregistrer dans **"Prochaines échéances"** (historique + prochaine occurrence calculée).

## F. Assistant IA (`/assistant`)
- Ajouter export **PDF** et **DOCX** des fichiers/conversations téléchargeables (en plus du format actuel).

## G. Global
- Ajouter une **fenêtre de confirmation de déconnexion** partout (déjà présente dans `AppHeader` — vérifier qu'aucun autre point de logout ne la contourne, notamment sidebar/profile page).

---

## Détails techniques

### Fichiers principaux à modifier
- `src/components/layout/AppHeader.tsx` — ordre header, label
- `src/components/layout/AppSidebar.tsx` — renommages, fusion Com/Acteurs
- `src/pages/RadarPage.tsx` — suppressions widgets, réordonnancement
- `src/pages/ActualitesPage.tsx` — suppr. tonalité, sources sentiment
- `src/pages/FluxPage.tsx`, `src/pages/FluxDetailPage.tsx`, `src/components/flux/FluxCard.tsx`
- `src/pages/CommunicationPage.tsx` + `src/pages/ActeursInfluencePage.tsx` → nouvelle page unifiée
- `src/pages/DossiersPage.tsx` + `src/components/dossiers/*` — refonte vues
- `src/pages/AssistantPage.tsx` + `src/components/assistant/DocumentWorkspace.tsx` — exports PDF/DOCX (jsPDF + docx)
- `src/pages/ProfilePage.tsx` — vérifier dialog déconnexion

### Backend
- Nouvelle table `destinataires_groupes (id, nom, user_id, destinataires jsonb, created_at)` avec RLS owner-based.
- Ajouter colonne `email_notification` à `diffusion_programmations` si manquante.
- Job de mise à jour `prochain_envoi` après exécution (déjà partiellement présent dans `scheduler-newsletter`).

### Dépendances
- `jspdf` + `html2canvas` (export PDF assistant) ou réutiliser pattern `TechDocPDFLayout`.
- `docx` npm pour génération DOCX côté client.

### Ordre d'exécution
1. Renommages & suppressions UI rapides (A, B, C, E hors fusion).
2. Fusion Com/Acteurs (D) — refacto navigation.
3. Studio publication — groupes destinataires + programmations (E backend).
4. Exports PDF/DOCX Assistant (F).
5. Vérification logout global (G).
6. Génération du **rapport PDF de correction** dans `/mnt/documents/rapport-corrections-radar.pdf` listant chaque point audit / statut / fichiers touchés.

---

## Livrables
- Codebase mis à jour selon les 7 sections.
- Migration SQL pour `destinataires_groupes` + ajustements diffusion.
- Rapport PDF récapitulatif des corrections (`rapport-corrections-radar.pdf`).

Ampleur : ~25 fichiers modifiés, 1 migration, 1 rapport. Durée estimée : conséquente — à exécuter en une passe build après approbation.
