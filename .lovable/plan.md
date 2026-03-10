

## Plan : Activer le canal WhatsApp dans diffuser-resume

### Etat actuel
- La ligne WhatsApp existe deja dans `diffusion_programmation` (id: `55f0471b...`, actif: false)
- Le frontend (`DiffusionPage.tsx`) affiche deja la carte WhatsApp mais avec un badge "Bientot" et les controles desactives (`isWhatsapp` flag)
- La fonction Edge `diffuser-resume` accepte uniquement `sms | telegram | email` — WhatsApp est exclu

### Changements (3 fichiers)

**1. `supabase/functions/diffuser-resume/index.ts`**
- Ajouter `"whatsapp"` au type `DiffuserPayload.canal` et a la validation
- Ajouter un bloc `else if (canal === "whatsapp")` qui envoie via la passerelle unifiee avec `channel: "WhatsApp"` et le numero du destinataire (comme SMS, sans prefixe `+`)

**2. `src/pages/admin/DiffusionPage.tsx`**
- Supprimer le flag `isWhatsapp` et la logique qui desactive la carte WhatsApp
- Activer tous les controles (switch, frequence, destinataires, envoi) pour WhatsApp comme les autres canaux
- Mettre a jour le placeholder WhatsApp: `'225XXXXXXXXXX'`

**3. `src/types/diffusion.ts`**
- Aucun changement necessaire — `whatsapp` est deja dans le type `CanalDiffusion`

### Payload WhatsApp vers la passerelle
```text
POST /api/message/send
{ to: "225XXXXXXXXXX", from: "ANSUT RADAR", content: "...", username, password, channel: "WhatsApp" }
```
Envoi sequentiel par destinataire (comme Telegram).

