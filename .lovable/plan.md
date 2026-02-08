
# Fonction Edge "envoyer-sms" pour les alertes critiques

## Statut : ✅ Implémenté

### Ce qui a été fait

1. **Tables créées** : `sms_destinataires` et `sms_logs` avec RLS admin-only
2. **Edge function `envoyer-sms`** : déployée, supporte deux modes (alerte auto / envoi direct)
3. **Hook `useRealtimeAlerts`** : appelle automatiquement `envoyer-sms` pour les alertes critiques
4. **Config `supabase/config.toml`** : entrée ajoutée

### Prochaines étapes

- Ajouter des destinataires SMS dans la table `sms_destinataires` (via interface admin ou SQL)
- Tester avec une alerte critique
- Créer une interface d'administration des destinataires SMS (optionnel)
