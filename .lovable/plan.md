

# Corriger l'URL de la passerelle SMS

## Probleme identifie

L'URL actuelle dans le secret `AZURE_SMS_URL` pointe vers `https://ansuthub.westeurope.cloudapp.azure.com/client/`, qui retourne une erreur **503 Service Unavailable**.

D'apres la collection Postman "WebGateway" analysee precedemment, la bonne URL de la passerelle SMS ANSUT est :

**`https://smsgateway.ablele.net`**

## Actions a realiser

### 1. Mettre a jour le secret AZURE_SMS_URL

Remplacer la valeur actuelle par `https://smsgateway.ablele.net` (sans slash final, le code ajoute deja `/api/SendSMS`).

Les autres secrets sont corrects et n'ont pas besoin de modification :
- `AZURE_SMS_USERNAME` : demo@ansut.local
- `AZURE_SMS_PASSWORD` : AasKVgVvUnJeM_4c55X2
- `AZURE_SMS_FROM` : ANSUT

### 2. Tester l'envoi SMS

Appeler la fonction `envoyer-sms` pour verifier que la passerelle repond correctement avec la nouvelle URL.

## Aucune modification de code

Le code de la fonction `envoyer-sms` est deja correct. Seul le secret `AZURE_SMS_URL` doit etre mis a jour.

