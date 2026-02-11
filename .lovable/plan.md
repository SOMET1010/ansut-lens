

# Mise a jour du secret AZURE_SMS_URL

## Probleme

Le secret `AZURE_SMS_URL` contient actuellement une valeur incorrecte (probablement un bloc de texte avec plusieurs variables au lieu d'une simple URL). Cela empeche la fonction `envoyer-sms` de fonctionner car elle construit une URL invalide.

## Action

1. **Mettre a jour le secret** `AZURE_SMS_URL` avec la valeur exacte : `https://smsgateway.ablele.net`
2. **Tester la fonction** `envoyer-sms` pour confirmer que la passerelle SMS repond correctement

## Details techniques

- La fonction `envoyer-sms` concatene la valeur du secret avec `/api/SendSMS` pour former l'URL finale
- L'URL correcte doit etre `https://smsgateway.ablele.net/api/SendSMS`
- Aucune modification de code n'est necessaire, seul le secret doit etre corrige

