

## Plan : Migration de tous les emails de Resend vers la passerelle ANSUT

### Contexte

L'utilisateur souhaite abandonner Resend et utiliser exclusivement la passerelle unifiee ANSUT (`https://ansuthub.westeurope.cloudapp.azure.com/gateway`) pour **tous** les envois : SMS, Email, Telegram, WhatsApp.

D'apres la collection Postman, l'endpoint unifie est :
```text
POST {{baseUrl}}/api/message/send

Email:    { to, cc, bcc, subject, content, ishtml: true, username, password, channel: "Email" }
SMS:      { to, from, content, username, password }
Telegram: { to, from, content, username, password, channel: "Telegram" }
```

### Fonctions Edge a migrer (10 fichiers)

| Fonction | Usage actuel | Changement |
|---|---|---|
| `send-magic-link` | Resend API | → Gateway Email |
| `envoyer-newsletter` | Resend API | → Gateway Email |
| `generer-matinale` | Resend API | → Gateway Email |
| `reset-user-password` | Resend API | → Gateway Email |
| `generate-password-link` | Resend API | → Gateway Email |
| `invite-user` | Resend API (fallback) | → Gateway Email |
| `send-flux-digest` | Resend SDK | → Gateway Email |
| `weekly-digest` | Resend SDK | → Gateway Email |
| `scheduler-newsletter` | Resend API | → Gateway Email |
| `envoyer-sms` | Legacy `/api/SendSMS` + champ `text` | → Unifie `/api/message/send` + champ `content` |

`diffuser-resume` utilise deja l'endpoint unifie — verification et nettoyage mineur.

### Implementation

**1. Creer une fonction utilitaire partagee dans chaque fichier**

Chaque fonction recevra un helper inline `sendViaGateway()` qui :
- Construit l'URL unifiee a partir de `AZURE_SMS_URL` : `baseUrl.replace(/\/api\/SendSMS\/?$/i, "") + "/api/message/send"`
- Accepte `channel: "Email" | "Telegram" | "SMS"`
- Utilise les credentials `AZURE_SMS_USERNAME` / `AZURE_SMS_PASSWORD`
- Pour Email : envoie `{ to, subject, content, ishtml: true, username, password, channel: "Email" }`

**2. Pour chaque fonction email (8 fichiers)**

Remplacer tous les blocs `fetch("https://api.resend.com/emails", ...)` par un appel a la passerelle ANSUT avec le payload Email. Supprimer les references a `RESEND_API_KEY`. Conserver le HTML existant comme `content`.

**3. Pour `envoyer-sms`**

Remplacer l'appel legacy (`{ to, from, text, ... }` vers `/api/SendSMS`) par l'endpoint unifie (`{ to, from, content, ... }` vers `/api/message/send`).

**4. Nettoyage `diffuser-resume`**

Verification que le format est correct — deja fait. Nettoyage mineur si necessaire.

### Expediteur Email

L'adresse `from` pour les emails sera `ANSUT RADAR` (via `AZURE_SMS_FROM`). Le sujet sera preserve tel quel pour chaque fonction.

### Risques et precautions

- La passerelle ANSUT doit supporter les emails HTML volumineux (newsletters). Si limite, on tronquera le contenu.
- Les envois en masse (newsletters avec 50+ destinataires) seront envoyes sequentiellement pour eviter la surcharge du gateway.
- Aucune modification cote frontend — seul le backend change.

