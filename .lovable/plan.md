

# Configuration des secrets API Mail et SMS + correction des emails

## Contexte

Bernard Akou a fourni les credentials pour l'API Mail (Resend avec domaine verifie `notifications.ansut.ci`) et l'API SMS (Azure). Le probleme d'invitation non recue etait cause par la cle Resend en mode test et l'adresse d'expediteur `onboarding@resend.dev`.

## Etape 1 : Mise a jour du secret RESEND_API_KEY

Remplacer la cle Resend actuelle (mode test) par la nouvelle cle de production fournie.

## Etape 2 : Ajout des secrets Azure SMS

Ajouter 4 nouveaux secrets pour l'API SMS Azure :

| Secret | Description |
|--------|-------------|
| `AZURE_SMS_URL` | URL du service SMS Azure |
| `AZURE_SMS_USERNAME` | Identifiant de connexion |
| `AZURE_SMS_PASSWORD` | Mot de passe |
| `AZURE_SMS_FROM` | Expediteur SMS (ANSUT) |

## Etape 3 : Correction des adresses d'expediteur dans les Edge Functions

Trois fonctions utilisent des adresses d'expediteur incorrectes et doivent etre mises a jour vers `no-reply@notifications.ansut.ci` :

| Fonction | Adresse actuelle (incorrecte) | Nouvelle adresse |
|----------|-------------------------------|-----------------|
| `invite-user` | `onboarding@resend.dev` | `no-reply@notifications.ansut.ci` |
| `envoyer-newsletter` | `noreply@ansut.ci` | `no-reply@notifications.ansut.ci` |
| `scheduler-newsletter` | `notifications@resend.dev` | `no-reply@notifications.ansut.ci` |

Deux fonctions utilisent deja la bonne adresse (aucune modification) :
- `generate-password-link` : `no-reply@notifications.ansut.ci`
- `send-flux-digest` : `no-reply@notifications.ansut.ci`

## Etape 4 : Renvoyer l'invitation a Bernard Akou

Une fois les secrets mis a jour et les fonctions corrigees, renvoyer l'invitation a Bernard Akou via la page Admin > Utilisateurs.

## Section technique

### Modifications dans `invite-user/index.ts`

Ligne 258 : changer l'adresse `from` :
```text
Avant : from: "ANSUT RADAR <onboarding@resend.dev>"
Apres : from: "ANSUT RADAR <no-reply@notifications.ansut.ci>"
```

### Modifications dans `envoyer-newsletter/index.ts`

Ligne 102 : changer l'adresse `from` :
```text
Avant : from: "ANSUT RADAR <noreply@ansut.ci>"
Apres : from: "ANSUT RADAR <no-reply@notifications.ansut.ci>"
```

### Modifications dans `scheduler-newsletter/index.ts`

Ligne 391 : changer l'adresse `from` :
```text
Avant : from: 'ANSUT RADAR <notifications@resend.dev>'
Apres : from: 'ANSUT RADAR <no-reply@notifications.ansut.ci>'
```

### Ordre d'execution

```text
1. Mettre a jour RESEND_API_KEY (secret existant)
2. Ajouter les 4 secrets Azure SMS
3. Modifier les 3 fichiers edge functions (from address)
4. Deployer les fonctions modifiees
5. Renvoyer l'invitation a Bernard Akou
6. Verifier la reception de l'email
```

### Fichiers a modifier

| Fichier | Type de modification |
|---------|---------------------|
| `supabase/functions/invite-user/index.ts` | Adresse from |
| `supabase/functions/envoyer-newsletter/index.ts` | Adresse from |
| `supabase/functions/scheduler-newsletter/index.ts` | Adresse from |

