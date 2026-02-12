

## Suppression du "+" dans les numéros SMS

### Probleme
La passerelle SMS ANSUT rejette les numéros au format international avec le prefixe `+` (ex: `+2250709753232`). Il faut envoyer les numeros sans ce prefixe (ex: `2250709753232`).

### Modification

**Fichier** : `supabase/functions/envoyer-sms/index.ts`

Ajouter un nettoyage des numeros juste avant la construction du champ `to`, en supprimant le caractere `+` en debut de numero :

```typescript
// Nettoyer les numéros : retirer le '+' en début
const cleanedDestinataires = destinataires.map(n => n.replace(/^\+/, ""));
const toField = cleanedDestinataires.join(";");
```

### Test

Apres deploiement, un SMS de test sera envoye au numero `2250709753232` (sans le `+`) pour verifier la reception effective.

