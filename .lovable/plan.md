

## Plan : Mettre à jour les destinataires de la Matinale

### Actions sur la table `newsletter_destinataires`

1. **Supprimer** l'entrée de `arnold.touan@ansut.ci` (type `matinale`)
2. **Ajouter** `patrick.somet@ansut.ci` comme destinataire permanent de la Matinale quotidienne
3. **Ajouter** `grace.zeliroud@ansut.ci` comme destinataire permanent (si pas encore fait)

### Méthode
- Utiliser l'outil d'insertion/suppression SQL directement sur `newsletter_destinataires`
- Aucune modification de code nécessaire

