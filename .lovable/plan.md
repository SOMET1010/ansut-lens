
# Fonction Edge "envoyer-sms" pour les alertes critiques

## Objectif

Creer une fonction backend pour envoyer des SMS via l'API Azure configuree (secrets deja en place). Les SMS seront envoyes automatiquement lorsqu'une alerte de niveau "critical" est inseree dans la table `alertes`, et pourront aussi etre appeles manuellement.

## Architecture

Le systeme fonctionnera en deux parties :
1. **Fonction backend `envoyer-sms`** : recoit une liste de numeros + un message, appelle l'API Azure SMS
2. **Table `sms_destinataires`** : stocke les numeros de telephone des personnes a notifier par SMS pour les alertes critiques
3. **Trigger base de donnees** : appelle automatiquement la fonction via `pg_net` quand une alerte critique est inseree (optionnel, peut etre fait cote client aussi)

## Etape 1 : Table `sms_destinataires`

Creer une table pour gerer les numeros de telephone des destinataires SMS :

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid | Cle primaire |
| `nom` | text | Nom du destinataire |
| `numero` | text | Numero de telephone (+225...) |
| `actif` | boolean | Actif/inactif |
| `role_filtre` | text | Role minimum (admin, user, etc.) |
| `created_at` | timestamptz | Date de creation |

Avec RLS pour que seuls les admins puissent gerer les destinataires.

## Etape 2 : Table `sms_logs`

Creer une table de suivi des envois SMS :

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | uuid | Cle primaire |
| `alerte_id` | uuid | Reference a l'alerte (nullable) |
| `destinataire` | text | Numero envoye |
| `message` | text | Contenu du SMS |
| `statut` | text | sent / failed / pending |
| `erreur` | text | Message d'erreur si echec |
| `created_at` | timestamptz | Date d'envoi |

## Etape 3 : Edge Function `envoyer-sms`

La fonction :
1. Recoit un payload avec `alerteId` ou un `message` + `destinataires` en direct
2. Si `alerteId` fourni : recupere l'alerte et les destinataires actifs dans `sms_destinataires`
3. Appelle l'API Azure SMS pour chaque destinataire :
   - URL : `AZURE_SMS_URL` + endpoint d'envoi
   - Authentification : `AZURE_SMS_USERNAME` / `AZURE_SMS_PASSWORD`
   - Expediteur : `AZURE_SMS_FROM` (ANSUT)
4. Enregistre les resultats dans `sms_logs`
5. Retourne un recapitulatif (envoyes / echecs)

Payloads supportes :

```text
// Mode alerte automatique
{ "alerteId": "uuid-alerte" }

// Mode envoi direct
{ "message": "Texte du SMS", "destinataires": ["+2250700000000"] }
```

## Etape 4 : Integration cote client

Modifier le hook `useRealtimeAlerts` pour qu'il appelle automatiquement `envoyer-sms` quand une alerte de niveau `critical` est detectee. Cela permet d'envoyer les SMS sans dependance a un trigger SQL complexe.

## Etape 5 : Interface d'administration des destinataires SMS

Pas de nouvelle page -- on ajoutera une section dans la page Admin existante ou dans les parametres, pour gerer les numeros de telephone (ajout, suppression, activation/desactivation).

---

## Section technique

### API Azure SMS

L'API Azure est accessible a :
- **URL** : `https://ansuthub.westeurope.cloudapp.azure.com/client/`
- **Auth** : Basic (username/password)
- **From** : ANSUT

La fonction devra d'abord tester l'endpoint exact de l'API pour l'envoi de SMS. Le format suppose est un POST avec les champs `from`, `to`, `message`.

### Fichiers a creer

| Fichier | Description |
|---------|-------------|
| `supabase/functions/envoyer-sms/index.ts` | Edge function d'envoi SMS |

### Fichiers a modifier

| Fichier | Modification |
|---------|-------------|
| `supabase/config.toml` | Ajouter `[functions.envoyer-sms]` |
| `src/hooks/useRealtimeAlerts.ts` | Appel auto pour alertes critiques |

### Migration SQL

```text
-- Table sms_destinataires
CREATE TABLE sms_destinataires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  numero text NOT NULL,
  actif boolean DEFAULT true,
  role_filtre text DEFAULT 'admin',
  created_at timestamptz DEFAULT now()
);

-- Table sms_logs
CREATE TABLE sms_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alerte_id uuid REFERENCES alertes(id),
  destinataire text NOT NULL,
  message text NOT NULL,
  statut text DEFAULT 'pending',
  erreur text,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE sms_destinataires ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

-- Admins uniquement
CREATE POLICY "admin_manage_sms_dest" ON sms_destinataires
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_view_sms_logs" ON sms_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "service_insert_sms_logs" ON sms_logs
  FOR INSERT WITH CHECK (true);
```

### Secrets utilises (deja configures)

- `AZURE_SMS_URL`
- `AZURE_SMS_USERNAME`
- `AZURE_SMS_PASSWORD`
- `AZURE_SMS_FROM`

### Ordre d'execution

```text
1. Creer les tables sms_destinataires et sms_logs (migration SQL)
2. Creer la fonction edge envoyer-sms/index.ts
3. Ajouter la config dans supabase/config.toml
4. Deployer la fonction
5. Modifier useRealtimeAlerts pour l'appel automatique
6. Tester avec une alerte critique de test
```
