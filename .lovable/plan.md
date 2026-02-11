

# Contournement SSL pour la fonction envoyer-sms

## Contexte

La passerelle SMS `smsgateway.ablele.net` utilise un certificat SSL auto-signe ou emis par une autorite non reconnue. La fonction `envoyer-sms` echoue avec l'erreur `UnknownIssuer` lors de l'appel HTTPS.

## Solution proposee

Remplacer l'appel `fetch()` standard par un appel utilisant le module Node.js `node:https` disponible dans Deno, qui permet de desactiver la verification du certificat SSL avec l'option `rejectUnauthorized: false`.

## Modifications

**Fichier** : `supabase/functions/envoyer-sms/index.ts`

1. Ajouter un import du module `node:https` et `node:http` en haut du fichier
2. Creer une fonction utilitaire `fetchWithoutSSL(url, options)` qui effectue la requete HTTPS sans verification de certificat
3. Remplacer l'appel `fetch(smsApiUrl, ...)` (environ ligne 96) par un appel a cette fonction utilitaire

### Implementation technique

```typescript
import https from "node:https";

function fetchWithoutSSL(url: string, body: string): Promise<{ ok: boolean; status: number; text: () => Promise<string> }> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      rejectUnauthorized: false, // Ignore le certificat SSL
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          text: () => Promise.resolve(data),
        });
      });
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}
```

Le reste du code de la fonction reste inchange. Seul l'appel reseau est modifie pour utiliser cette nouvelle fonction.

## Risque

Desactiver la verification SSL reduit la securite de la connexion (vulnerable aux attaques man-in-the-middle). Cette solution est acceptable dans un contexte de reseau interne ou de confiance avec le fournisseur SMS, mais il est recommande a terme de demander au fournisseur un certificat valide.

