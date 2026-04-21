import { useRef, useState } from 'react';
import { usePDF } from 'react-to-pdf';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Shield, User, BookOpen, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GuideViewer, GuidePDFLayout } from '@/components/formation';

// Contenu des guides
const ADMIN_GUIDE = `# Guide de Formation Administrateur

## 🔧 Rôle et Responsabilités

En tant qu'administrateur ANSUT RADAR, vous êtes responsable de :

- **Gestion des utilisateurs** : invitations, rôles, désactivations
- **Configuration de la veille** : mots-clés, catégories, sources
- **Supervision technique** : tâches CRON, logs, performances
- **Support utilisateurs** : assistance et résolution de problèmes

---

## 🚀 Première Connexion

1. Acceptez l'invitation reçue par email
2. Définissez votre mot de passe (min. 8 caractères)
3. Vous accédez automatiquement à l'interface

---

## 📍 Navigation Administrateur

Le menu latéral affiche les entrées suivantes :

| Icône | Menu | Description |
|-------|------|-------------|
| 📊 | Tableau de bord | Vue d'ensemble et KPIs |
| 📰 | Actualités | Fil d'actualités enrichies |
| 📡 | Mes Flux | Flux de veille personnalisés |
| 👥 | Acteurs clés | Personnalités surveillées |
| 📁 | Dossiers | Notes stratégiques |
| 🤖 | Assistant IA | Chatbot intelligent |
| 🔔 | Alertes | Centre de notifications |
| ⚙️ | **Administration** | Gestion de la plateforme |

---

## ⚙️ Interface d'Administration

Accessible via le menu "Administration" (visible uniquement pour les admins).

### Sous-menus disponibles

| Section | Route | Description |
|---------|-------|-------------|
| Utilisateurs | \`/admin/users\` | Gérer les comptes |
| Rôles & Permissions | \`/admin/roles\` | Configurer les droits d'accès |
| Mots-clés | \`/admin/mots-cles\` | Configurer la veille |
| Sources | \`/admin/sources\` | Gérer les sources média |
| Newsletters | \`/admin/newsletters\` | Gestion des newsletters |
| Import Acteurs | \`/admin/import-acteurs\` | Import CSV |
| Tâches CRON | \`/admin/cron\` | Planification automatique |
| Logs d'audit | \`/admin/audit\` | Historique des actions |

---

## 👤 Gestion des Utilisateurs

### Accès
Menu Administration → **Utilisateurs** (\`/admin/users\`)

### Inviter un nouvel utilisateur

1. Cliquez sur **"Inviter un utilisateur"**
2. Remplissez le formulaire :
   - Email (obligatoire)
   - Nom complet
   - Département
   - Rôle (admin, user, council_user, guest)
3. Cliquez sur **"Envoyer l'invitation"**

L'utilisateur reçoit un email personnalisé avec le logo ANSUT.

### Modifier un utilisateur

| Action | Description |
|--------|-------------|
| Changer le rôle | Sélectionnez un nouveau rôle dans le menu déroulant |
| Désactiver | Empêche la connexion sans supprimer le compte |
| Réactiver | Restaure l'accès d'un compte désactivé |
| Supprimer | Suppression définitive (irréversible) |

### Les 4 rôles

| Rôle | Accès |
|------|-------|
| \`admin\` | Accès complet + Administration |
| \`user\` | Toutes les fonctionnalités sauf admin |
| \`council_user\` | Lecture + Flux personnels + Assistant IA |
| \`guest\` | Tableau de bord + Actualités uniquement |

---

## 🔐 Système de Permissions Granulaires

### Fonctionnement

ANSUT RADAR utilise un système de permissions granulaires permettant de contrôler précisément les accès de chaque rôle.

### Accès
Menu Administration → **Rôles & Permissions** (\`/admin/roles\`)

### Permissions de Consultation

| Code | Libellé | Description |
|------|---------|-------------|
| \`view_radar\` | Voir le radar | Accès au tableau de bord |
| \`view_actualites\` | Voir les actualités | Accès au fil d'actualités |
| \`view_personnalites\` | Voir les personnalités | Accès aux fiches acteurs |
| \`view_dossiers\` | Voir les dossiers | Accès aux notes stratégiques |

### Permissions d'Actions

| Code | Libellé | Description |
|------|---------|-------------|
| \`create_flux\` | Créer des flux | Créer ses propres flux de veille |
| \`edit_dossiers\` | Modifier les dossiers | Créer et modifier des notes |
| \`use_assistant\` | Utiliser l'assistant IA | Interagir avec le chatbot |
| \`receive_alerts\` | Recevoir des alertes | Notifications et emails |

### Permissions d'Administration

| Code | Libellé | Description |
|------|---------|-------------|
| \`access_admin\` | Accès administration | Accéder à la section admin |
| \`manage_users\` | Gérer les utilisateurs | Inviter, désactiver, supprimer |
| \`manage_roles\` | Gérer les rôles | Modifier les permissions |
| \`manage_keywords\` | Gérer les mots-clés | Configurer la veille |
| \`manage_sources\` | Gérer les sources | Configurer sources média |
| \`manage_newsletters\` | Gérer les newsletters | Créer et envoyer newsletters |

---

## 🔤 Configuration des Mots-clés

### Accès
Menu Administration → **Mots-clés de veille** (\`/admin/mots-cles\`)

### Ajouter un mot-clé

1. Cliquez sur **"Ajouter un mot-clé"**
2. Remplissez :
   - Mot-clé principal (ex: "fibre optique")
   - Variantes (ex: "FTTH", "fiber")
   - Catégorie de veille
   - Quadrant du radar
   - Score de criticité (1-10)
   - Alerte automatique (oui/non)
3. Sauvegardez

---

## ⏰ Tâches CRON

### Accès
Menu Administration → **Tâches CRON** (\`/admin/cron\`)

### Tâches configurées

| Tâche | Planification | Description |
|-------|---------------|-------------|
| \`collecte-veille-critique\` | Toutes les 6h | Collecte actualités prioritaires |
| \`collecte-veille-quotidienne\` | Chaque jour 8h | Collecte complète |
| \`send-flux-digest\` | Configurable | Envoi des digests email |

---

## 📋 Logs d'Audit

### Accès
Menu Administration → **Logs d'audit** (\`/admin/audit\`)

### Informations enregistrées

Chaque action admin est tracée avec :
- Date et heure
- Administrateur concerné
- Type d'action
- Utilisateur cible
- Détails de l'action

---

## ✅ Checklist Administrateur

### Configuration initiale

- [ ] Configurer les mots-clés de veille
- [ ] Importer les acteurs clés initiaux
- [ ] Vérifier les tâches CRON
- [ ] Inviter les premiers utilisateurs

### Maintenance régulière

- [ ] Consulter les logs d'audit hebdomadaires
- [ ] Vérifier les exécutions CRON
- [ ] Mettre à jour les mots-clés si nécessaire
- [ ] Gérer les demandes d'accès

---

**Bonne administration ! 🔧**`;

const USER_GUIDE = `# Guide de Formation Utilisateur

## 👤 Votre Rôle

En tant qu'utilisateur ANSUT RADAR, vous pouvez :

- **Consulter** les actualités enrichies par l'IA
- **Surveiller** les acteurs clés et leur présence digitale
- **Créer** des flux de veille personnalisés
- **Rédiger** des dossiers stratégiques
- **Interagir** avec l'assistant IA
- **Recevoir** des alertes en temps réel

---

## 🚀 Première Connexion

### Accepter l'invitation

1. Ouvrez l'email "Invitation à rejoindre ANSUT RADAR"
2. Cliquez sur **"Accepter l'invitation"**
3. Définissez votre mot de passe (min. 8 caractères)
4. Vous êtes automatiquement connecté

### Connexions suivantes

1. Rendez-vous sur l'URL de l'application
2. Entrez votre email et mot de passe
3. Cliquez sur **"Se connecter"**

---

## 📍 Navigation

Le menu latéral vous donne accès à toutes les fonctionnalités :

| Icône | Menu | Description |
|-------|------|-------------|
| 📊 | Tableau de bord | Vue d'ensemble et indicateurs |
| 📰 | Actualités | Fil d'actualités enrichies |
| 📡 | Mes Flux | Vos flux de veille personnalisés |
| 👥 | Acteurs clés | Personnalités surveillées |
| 📁 | Dossiers | Notes et analyses stratégiques |
| 🤖 | Assistant IA | Chatbot intelligent |
| 🔔 | Alertes | Notifications |

---

## 📊 Tableau de Bord

### Vue d'ensemble

Le tableau de bord présente :

- **Score SPDI global** : indicateur de présence digitale de l'ANSUT
- **Alertes actives** : nombre de notifications non traitées
- **Dernières actualités** : fil des informations récentes
- **Tendances** : évolution des indicateurs clés

---

## 📰 Actualités

### Accès
Menu → **Actualités**

### Interface

L'écran affiche une liste d'actualités avec :
- **Titre** cliquable pour voir le détail
- **Source** et date de publication
- **Indicateur de fraîcheur**
- **Score d'importance** (1-10)
- **Tags** thématiques

### Filtres disponibles

| Filtre | Options |
|--------|---------|
| Période | Aujourd'hui, 7 jours, 30 jours |
| Catégorie | Technologie, Régulation, Économie |
| Importance | Minimum 1 à 10 |
| Source | Par type de média |

---

## 📡 Mes Flux

### Qu'est-ce qu'un flux ?

Un flux est une veille personnalisée basée sur vos critères :
- Mots-clés spécifiques
- Catégories thématiques
- Niveau d'importance minimum

### Créer un nouveau flux

1. Cliquez sur **"Créer un flux"**
2. Donnez un nom à votre flux
3. Ajoutez des mots-clés
4. Sélectionnez les catégories
5. Définissez l'importance minimum
6. Configurez les alertes
7. Sauvegardez

---

## 👥 Acteurs Clés

### Vue d'ensemble

L'écran affiche les personnalités surveillées organisées par :
- **Cercle** (1 = prioritaire, 2 = important, 3 = à surveiller)
- **Catégorie** (opérateurs, régulateurs, gouvernement)

### Comprendre le Score SPDI

Le Score de Présence Digitale et d'Influence (0-100) mesure :

| Axe | Poids | Description |
|-----|-------|-------------|
| Visibilité | 25% | Nombre de mentions |
| Qualité | 25% | Sentiment et pertinence |
| Autorité | 25% | Citations et références |
| Présence | 25% | Activité et régularité |

**Interprétation :**
- 80-100 : Très influent
- 60-79 : Influent
- 40-59 : Modéré
- 20-39 : Faible
- 0-19 : Très faible

---

## 📁 Dossiers

### Notes Stratégiques

Une note est un document interne permettant de :
- Documenter une analyse
- Synthétiser des informations
- Partager avec l'équipe

### Créer une note

1. Cliquez sur **"Nouvelle note"**
2. Donnez un titre
3. Sélectionnez une catégorie
4. Rédigez le contenu en **Markdown**
5. Sauvegardez

---

## 🤖 Assistant IA

### Fonctionnalités

L'assistant IA peut :
- Répondre à vos questions sur les données de veille
- Résumer des actualités ou tendances
- Analyser le contexte d'un sujet
- Suggérer des pistes d'investigation

### Exemples de questions

| Question | Type de réponse |
|----------|-----------------|
| "Quelles sont les dernières actualités sur la 5G ?" | Liste d'articles |
| "Résume l'activité de Orange CI cette semaine" | Synthèse |
| "Quel est le sentiment autour de la régulation télécom ?" | Analyse |

### Bonnes pratiques

- ✅ Soyez précis dans vos questions
- ✅ Mentionnez la période si pertinent
- ✅ Demandez des sources si besoin
- ❌ Ne partagez pas de données sensibles

---

## 🔔 Alertes

### Types d'alertes

| Type | Description |
|------|-------------|
| 🔴 Critique | Action immédiate requise |
| 🟠 Avertissement | À traiter rapidement |
| 🔵 Information | Pour information |

### Gérer les alertes

| Action | Description |
|--------|-------------|
| Marquer comme lue | Retirer du compteur |
| Marquer comme traitée | Archiver l'alerte |
| Voir la source | Accéder à l'actualité liée |

---

## 👤 Mon Profil

### Modifier vos informations

- **Nom complet** : votre nom affiché
- **Département** : votre service
- **Avatar** : photo de profil

### Changer votre mot de passe

1. Allez dans Mon profil
2. Section "Changer le mot de passe"
3. Entrez l'ancien mot de passe
4. Entrez le nouveau mot de passe (2 fois)
5. Sauvegardez

---

## ⌨️ Raccourcis Clavier

| Raccourci | Action |
|-----------|--------|
| \`/\` | Ouvrir la recherche |
| \`Echap\` | Fermer un dialogue |
| \`Ctrl + K\` | Recherche rapide |

---

## 🆘 Besoin d'Aide ?

1. Utilisez l'Assistant IA pour vos questions
2. Contactez votre administrateur

---

**Bonne veille ! 📊**`;

export default function FormationPage() {
  const [activeTab, setActiveTab] = useState<'admin' | 'user'>('admin');
  
  const adminRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  
  const { toPDF: toPDFAdmin, targetRef: targetRefAdmin } = usePDF({
    filename: 'ANSUT-RADAR-Guide-Admin.pdf',
    page: {
      format: 'A4',
      orientation: 'portrait',
      margin: 0
    }
  });
  
  const { toPDF: toPDFUser, targetRef: targetRefUser } = usePDF({
    filename: 'ANSUT-RADAR-Guide-User.pdf',
    page: {
      format: 'A4',
      orientation: 'portrait',
      margin: 0
    }
  });

  return (
    <div className="w-full space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BookOpen className="h-8 w-8 text-primary" />
              Guides de Formation
            </h1>
            <p className="text-muted-foreground">
              Documentation PDF téléchargeable pour les utilisateurs
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={() => toPDFAdmin()}
            className="gap-2"
            variant="outline"
          >
            <Download className="h-4 w-4" />
            <Shield className="h-4 w-4" />
            PDF Admin
          </Button>
          <Button 
            onClick={() => toPDFUser()}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            <User className="h-4 w-4" />
            PDF Utilisateur
          </Button>
        </div>
      </div>

      {/* Tabs pour sélection du guide */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'admin' | 'user')}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="admin" className="gap-2">
            <Shield className="h-4 w-4" />
            Administrateur
          </TabsTrigger>
          <TabsTrigger value="user" className="gap-2">
            <User className="h-4 w-4" />
            Utilisateur
          </TabsTrigger>
        </TabsList>

        <TabsContent value="admin" className="mt-4">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-muted/30 p-4 border-b">
                <p className="text-sm text-muted-foreground">
                  📄 Prévisualisation du guide Administrateur • Format A4 optimisé pour impression
                </p>
              </div>
              <div className="overflow-auto max-h-[70vh] p-6 bg-white">
                <GuidePDFLayout ref={targetRefAdmin} title="Guide de Formation Administrateur">
                  <GuideViewer content={ADMIN_GUIDE} />
                </GuidePDFLayout>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="user" className="mt-4">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="bg-muted/30 p-4 border-b">
                <p className="text-sm text-muted-foreground">
                  📄 Prévisualisation du guide Utilisateur • Format A4 optimisé pour impression
                </p>
              </div>
              <div className="overflow-auto max-h-[70vh] p-6 bg-white">
                <GuidePDFLayout ref={targetRefUser} title="Guide de Formation Utilisateur">
                  <GuideViewer content={USER_GUIDE} />
                </GuidePDFLayout>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
