

## Interface de programmation des envois de resumes multicanaux

### Objectif
Creer une interface d'administration permettant de programmer l'envoi automatique des resumes (briefings quotidiens) via plusieurs canaux de communication : **SMS**, **Telegram**, **Email** -- avec **WhatsApp** prevu comme canal futur.

### Architecture

**Nouvelle table `diffusion_programmation`** pour stocker la configuration de chaque canal :

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Cle primaire |
| canal | varchar | `sms`, `telegram`, `email`, `whatsapp` |
| actif | boolean | Canal actif/desactive |
| frequence | varchar | `quotidien`, `hebdo`, `mensuel` |
| heure_envoi | time | Heure d'envoi programmee |
| jours_envoi | int[] | Jours d'envoi (1-7 pour hebdo, 1-28 pour mensuel) |
| destinataires | jsonb | Liste des destinataires par canal |
| contenu_type | varchar | `briefing`, `newsletter`, `alerte` |
| dernier_envoi | timestamptz | Date du dernier envoi |
| prochain_envoi | timestamptz | Prochain envoi calcule |
| created_at | timestamptz | Date de creation |
| updated_at | timestamptz | Date de mise a jour |

### Composants a creer

1. **`DiffusionSchedulerPage.tsx`** -- Nouvelle page admin `/admin/diffusion`
   - En-tete avec bouton retour vers admin
   - Vue d'ensemble des canaux avec statut

2. **`ChannelCard.tsx`** -- Carte par canal
   - Icone et nom du canal (SMS, Telegram, Email, WhatsApp)
   - Badge statut (actif/inactif/a venir)
   - Toggle activation
   - Configuration frequence et heure
   - Gestion des destinataires specifiques au canal
   - Bouton "Envoyer maintenant" pour test

3. **`DiffusionHistory.tsx`** -- Historique des envois
   - Tableau avec canal, date, statut, nombre de destinataires
   - Filtres par canal et periode

4. **`ChannelDestinataires.tsx`** -- Gestion des destinataires par canal
   - SMS : numeros de telephone (existant dans `sms_destinataires`)
   - Telegram : chat IDs
   - Email : adresses email
   - WhatsApp : numeros (desactive pour l'instant)

### Integration avec l'existant

- Le canal **SMS** reutilise la fonction `envoyer-sms` existante
- Le canal **Email** reutilise la fonction `envoyer-newsletter` / Resend
- Le canal **Telegram** utilise l'endpoint unifie de la passerelle ANSUT (`/api/message/send` avec `channel: "telegram"`)
- Le canal **WhatsApp** sera affiche avec un badge "Bientot disponible" et son toggle desactive

### Nouvelle edge function `diffuser-resume`

Une fonction backend unifiee qui :
1. Recoit le canal et le type de contenu
2. Genere le briefing via `generer-briefing` (ou recup le dernier)
3. Dispatche vers le bon canal (SMS, Telegram, Email)
4. Enregistre le resultat dans une table `diffusion_logs`

### Table `diffusion_logs`

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid | Cle primaire |
| canal | varchar | Canal utilise |
| contenu_type | varchar | Type de contenu envoye |
| message | text | Contenu envoye |
| destinataires_count | int | Nombre de destinataires |
| succes_count | int | Nombre de succes |
| echec_count | int | Nombre d'echecs |
| details | jsonb | Details par destinataire |
| created_at | timestamptz | Date d'envoi |

### Navigation

- Ajout d'une carte dans la page Admin principale
- Route : `/admin/diffusion`
- Permission : `manage_newsletters` (reutilisation)

### Design de l'interface

L'interface sera organisee en grille de cartes, une par canal :

```text
+------------------+  +------------------+
|  SMS             |  |  Telegram        |
|  [actif]  toggle |  |  [actif]  toggle |
|  Freq: Quotidien |  |  Freq: Hebdo     |
|  08:00           |  |  09:00           |
|  3 destinataires |  |  2 destinataires |
|  [Configurer]    |  |  [Configurer]    |
+------------------+  +------------------+
+------------------+  +------------------+
|  Email           |  |  WhatsApp        |
|  [actif]  toggle |  |  [bientot] ---   |
|  Freq: Hebdo     |  |  Non disponible  |
|  10:00           |  |                  |
|  15 destinataires|  |                  |
|  [Configurer]    |  |                  |
+------------------+  +------------------+
```

En dessous, un historique des derniers envois avec filtres.

### Etapes d'implementation

1. Creer les tables `diffusion_programmation` et `diffusion_logs` avec RLS
2. Creer la fonction backend `diffuser-resume`
3. Creer les composants UI (page, cartes canal, historique)
4. Ajouter la route et la navigation depuis la page Admin
5. Connecter les hooks et tester chaque canal

### Section technique

- **RLS** : Les deux tables seront protegees avec des politiques limitant l'acces aux utilisateurs ayant la permission `manage_newsletters`
- **Hook** : `useDiffusionScheduler.ts` pour CRUD sur `diffusion_programmation` et lecture de `diffusion_logs`
- La passerelle ANSUT supporte deja Telegram via le meme endpoint avec le champ `channel` -- les memes secrets (`AZURE_SMS_URL`, `AZURE_SMS_USERNAME`, `AZURE_SMS_PASSWORD`) seront reutilises
