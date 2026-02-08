export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      actualites: {
        Row: {
          analyse_ia: string | null
          categorie: string | null
          cluster_id: string | null
          contenu: string | null
          created_at: string
          date_publication: string | null
          entites_entreprises: string[] | null
          entites_personnes: string[] | null
          id: string
          importance: number | null
          pourquoi_important: string | null
          resume: string | null
          score_pertinence: number | null
          sentiment: number | null
          source_id: string | null
          source_nom: string | null
          source_type: string | null
          source_url: string | null
          tags: string[] | null
          titre: string
        }
        Insert: {
          analyse_ia?: string | null
          categorie?: string | null
          cluster_id?: string | null
          contenu?: string | null
          created_at?: string
          date_publication?: string | null
          entites_entreprises?: string[] | null
          entites_personnes?: string[] | null
          id?: string
          importance?: number | null
          pourquoi_important?: string | null
          resume?: string | null
          score_pertinence?: number | null
          sentiment?: number | null
          source_id?: string | null
          source_nom?: string | null
          source_type?: string | null
          source_url?: string | null
          tags?: string[] | null
          titre: string
        }
        Update: {
          analyse_ia?: string | null
          categorie?: string | null
          cluster_id?: string | null
          contenu?: string | null
          created_at?: string
          date_publication?: string | null
          entites_entreprises?: string[] | null
          entites_personnes?: string[] | null
          id?: string
          importance?: number | null
          pourquoi_important?: string | null
          resume?: string | null
          score_pertinence?: number | null
          sentiment?: number | null
          source_id?: string | null
          source_nom?: string | null
          source_type?: string | null
          source_url?: string | null
          tags?: string[] | null
          titre?: string
        }
        Relationships: [
          {
            foreignKeyName: "actualites_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources_media"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      alertes: {
        Row: {
          created_at: string
          id: string
          lue: boolean | null
          message: string | null
          niveau: string
          reference_id: string | null
          reference_type: string | null
          titre: string
          traitee: boolean | null
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          lue?: boolean | null
          message?: string | null
          niveau: string
          reference_id?: string | null
          reference_type?: string | null
          titre: string
          traitee?: boolean | null
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          lue?: boolean | null
          message?: string | null
          niveau?: string
          reference_id?: string | null
          reference_type?: string | null
          titre?: string
          traitee?: boolean | null
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      audit_consultations: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          resource_id: string | null
          resource_type: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      categories_veille: {
        Row: {
          actif: boolean | null
          code: string
          couleur: string | null
          created_at: string
          description: string | null
          id: string
          nom: string
          priorite: number | null
          quadrant_default: string | null
        }
        Insert: {
          actif?: boolean | null
          code: string
          couleur?: string | null
          created_at?: string
          description?: string | null
          id?: string
          nom: string
          priorite?: number | null
          quadrant_default?: string | null
        }
        Update: {
          actif?: boolean | null
          code?: string
          couleur?: string | null
          created_at?: string
          description?: string | null
          id?: string
          nom?: string
          priorite?: number | null
          quadrant_default?: string | null
        }
        Relationships: []
      }
      collectes_log: {
        Row: {
          created_at: string
          duree_ms: number | null
          erreur: string | null
          id: string
          mots_cles_utilises: string[] | null
          nb_resultats: number | null
          sources_utilisees: string[] | null
          statut: string
          type: string
        }
        Insert: {
          created_at?: string
          duree_ms?: number | null
          erreur?: string | null
          id?: string
          mots_cles_utilises?: string[] | null
          nb_resultats?: number | null
          sources_utilisees?: string[] | null
          statut: string
          type: string
        }
        Update: {
          created_at?: string
          duree_ms?: number | null
          erreur?: string | null
          id?: string
          mots_cles_utilises?: string[] | null
          nb_resultats?: number | null
          sources_utilisees?: string[] | null
          statut?: string
          type?: string
        }
        Relationships: []
      }
      config_seuils: {
        Row: {
          cle: string
          description: string | null
          id: string
          updated_at: string
          updated_by: string | null
          valeur: Json
        }
        Insert: {
          cle: string
          description?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
          valeur: Json
        }
        Update: {
          cle?: string
          description?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
          valeur?: Json
        }
        Relationships: []
      }
      conversations_ia: {
        Row: {
          created_at: string
          id: string
          messages: Json | null
          titre: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json | null
          titre?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json | null
          titre?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dossiers: {
        Row: {
          auteur_id: string | null
          categorie: string
          contenu: string | null
          created_at: string
          id: string
          resume: string | null
          statut: string
          titre: string
          updated_at: string
        }
        Insert: {
          auteur_id?: string | null
          categorie?: string
          contenu?: string | null
          created_at?: string
          id?: string
          resume?: string | null
          statut?: string
          titre: string
          updated_at?: string
        }
        Update: {
          auteur_id?: string | null
          categorie?: string
          contenu?: string | null
          created_at?: string
          id?: string
          resume?: string | null
          statut?: string
          titre?: string
          updated_at?: string
        }
        Relationships: []
      }
      flux_actualites: {
        Row: {
          actualite_id: string
          created_at: string
          flux_id: string
          id: string
          notifie: boolean | null
          score_match: number | null
        }
        Insert: {
          actualite_id: string
          created_at?: string
          flux_id: string
          id?: string
          notifie?: boolean | null
          score_match?: number | null
        }
        Update: {
          actualite_id?: string
          created_at?: string
          flux_id?: string
          id?: string
          notifie?: boolean | null
          score_match?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "flux_actualites_actualite_id_fkey"
            columns: ["actualite_id"]
            isOneToOne: false
            referencedRelation: "actualites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flux_actualites_flux_id_fkey"
            columns: ["flux_id"]
            isOneToOne: false
            referencedRelation: "flux_veille"
            referencedColumns: ["id"]
          },
        ]
      }
      flux_veille: {
        Row: {
          actif: boolean | null
          alerte_email: boolean | null
          alerte_push: boolean | null
          categories_ids: string[] | null
          created_at: string
          description: string | null
          frequence_digest: string | null
          id: string
          importance_min: number | null
          mots_cles: string[] | null
          nom: string
          quadrants: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          actif?: boolean | null
          alerte_email?: boolean | null
          alerte_push?: boolean | null
          categories_ids?: string[] | null
          created_at?: string
          description?: string | null
          frequence_digest?: string | null
          id?: string
          importance_min?: number | null
          mots_cles?: string[] | null
          nom: string
          quadrants?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          actif?: boolean | null
          alerte_email?: boolean | null
          alerte_push?: boolean | null
          categories_ids?: string[] | null
          created_at?: string
          description?: string | null
          frequence_digest?: string | null
          id?: string
          importance_min?: number | null
          mots_cles?: string[] | null
          nom?: string
          quadrants?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mentions: {
        Row: {
          auteur: string | null
          contenu: string
          created_at: string
          date_mention: string | null
          est_critique: boolean | null
          id: string
          score_influence: number | null
          sentiment: number | null
          source: string | null
          source_url: string | null
          suggestion_reaction: string | null
          traite: boolean | null
        }
        Insert: {
          auteur?: string | null
          contenu: string
          created_at?: string
          date_mention?: string | null
          est_critique?: boolean | null
          id?: string
          score_influence?: number | null
          sentiment?: number | null
          source?: string | null
          source_url?: string | null
          suggestion_reaction?: string | null
          traite?: boolean | null
        }
        Update: {
          auteur?: string | null
          contenu?: string
          created_at?: string
          date_mention?: string | null
          est_critique?: boolean | null
          id?: string
          score_influence?: number | null
          sentiment?: number | null
          source?: string | null
          source_url?: string | null
          suggestion_reaction?: string | null
          traite?: boolean | null
        }
        Relationships: []
      }
      mots_cles_veille: {
        Row: {
          actif: boolean | null
          alerte_auto: boolean | null
          categorie_id: string | null
          created_at: string
          id: string
          mot_cle: string
          quadrant: string | null
          score_criticite: number | null
          updated_at: string
          variantes: string[] | null
        }
        Insert: {
          actif?: boolean | null
          alerte_auto?: boolean | null
          categorie_id?: string | null
          created_at?: string
          id?: string
          mot_cle: string
          quadrant?: string | null
          score_criticite?: number | null
          updated_at?: string
          variantes?: string[] | null
        }
        Update: {
          actif?: boolean | null
          alerte_auto?: boolean | null
          categorie_id?: string | null
          created_at?: string
          id?: string
          mot_cle?: string
          quadrant?: string | null
          score_criticite?: number | null
          updated_at?: string
          variantes?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "mots_cles_veille_categorie_id_fkey"
            columns: ["categorie_id"]
            isOneToOne: false
            referencedRelation: "categories_veille"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_destinataires: {
        Row: {
          actif: boolean | null
          created_at: string | null
          derniere_reception: string | null
          email: string
          frequence: string | null
          id: string
          nb_receptions: number | null
          nom: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          actif?: boolean | null
          created_at?: string | null
          derniere_reception?: string | null
          email: string
          frequence?: string | null
          id?: string
          nb_receptions?: number | null
          nom?: string | null
          type?: string
          updated_at?: string | null
        }
        Update: {
          actif?: boolean | null
          created_at?: string | null
          derniere_reception?: string | null
          email?: string
          frequence?: string | null
          id?: string
          nb_receptions?: number | null
          nom?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      newsletter_programmation: {
        Row: {
          actif: boolean | null
          cible_defaut: string | null
          created_at: string | null
          delai_rappel_heures: number | null
          derniere_generation: string | null
          emails_rappel: string[] | null
          frequence: string
          heure_envoi: string | null
          id: string
          jour_envoi: number | null
          prochain_envoi: string | null
          ton_defaut: string | null
          updated_at: string | null
        }
        Insert: {
          actif?: boolean | null
          cible_defaut?: string | null
          created_at?: string | null
          delai_rappel_heures?: number | null
          derniere_generation?: string | null
          emails_rappel?: string[] | null
          frequence?: string
          heure_envoi?: string | null
          id?: string
          jour_envoi?: number | null
          prochain_envoi?: string | null
          ton_defaut?: string | null
          updated_at?: string | null
        }
        Update: {
          actif?: boolean | null
          cible_defaut?: string | null
          created_at?: string | null
          delai_rappel_heures?: number | null
          derniere_generation?: string | null
          emails_rappel?: string[] | null
          frequence?: string
          heure_envoi?: string | null
          id?: string
          jour_envoi?: number | null
          prochain_envoi?: string | null
          ton_defaut?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      newsletters: {
        Row: {
          cible: string
          contenu: Json
          created_at: string | null
          date_debut: string
          date_envoi: string | null
          date_envoi_programme: string | null
          date_fin: string
          date_rappel: string | null
          date_validation: string | null
          genere_par: string | null
          html_complet: string | null
          html_court: string | null
          html_social: string | null
          id: string
          nb_destinataires: number | null
          numero: number
          periode: string
          programmation_active: boolean | null
          rappel_envoye: boolean | null
          statut: string
          template: string | null
          ton: string
          updated_at: string | null
          valide_par: string | null
        }
        Insert: {
          cible?: string
          contenu?: Json
          created_at?: string | null
          date_debut: string
          date_envoi?: string | null
          date_envoi_programme?: string | null
          date_fin: string
          date_rappel?: string | null
          date_validation?: string | null
          genere_par?: string | null
          html_complet?: string | null
          html_court?: string | null
          html_social?: string | null
          id?: string
          nb_destinataires?: number | null
          numero: number
          periode?: string
          programmation_active?: boolean | null
          rappel_envoye?: boolean | null
          statut?: string
          template?: string | null
          ton?: string
          updated_at?: string | null
          valide_par?: string | null
        }
        Update: {
          cible?: string
          contenu?: Json
          created_at?: string | null
          date_debut?: string
          date_envoi?: string | null
          date_envoi_programme?: string | null
          date_fin?: string
          date_rappel?: string | null
          date_validation?: string | null
          genere_par?: string | null
          html_complet?: string | null
          html_court?: string | null
          html_social?: string | null
          id?: string
          nb_destinataires?: number | null
          numero?: number
          periode?: string
          programmation_active?: boolean | null
          rappel_envoye?: boolean | null
          statut?: string
          template?: string | null
          ton?: string
          updated_at?: string | null
          valide_par?: string | null
        }
        Relationships: []
      }
      permissions_registry: {
        Row: {
          category: string
          code: string
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          label_fr: string
        }
        Insert: {
          category: string
          code: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          label_fr: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          label_fr?: string
        }
        Relationships: []
      }
      personnalites: {
        Row: {
          actif: boolean | null
          alertes_config: Json | null
          bio: string | null
          categorie: string | null
          cercle: number | null
          created_at: string
          derniere_activite: string | null
          derniere_mesure_spdi: string | null
          fonction: string | null
          id: string
          niveau_alerte: string | null
          nom: string
          notes: string | null
          organisation: string | null
          pays: string | null
          photo_url: string | null
          prenom: string | null
          reseaux: Json | null
          score_influence: number | null
          score_spdi_actuel: number | null
          sources_suivies: Json | null
          sous_categorie: string | null
          suivi_spdi_actif: boolean | null
          tags: string[] | null
          tendance_spdi: string | null
          thematiques: string[] | null
          zone: string | null
        }
        Insert: {
          actif?: boolean | null
          alertes_config?: Json | null
          bio?: string | null
          categorie?: string | null
          cercle?: number | null
          created_at?: string
          derniere_activite?: string | null
          derniere_mesure_spdi?: string | null
          fonction?: string | null
          id?: string
          niveau_alerte?: string | null
          nom: string
          notes?: string | null
          organisation?: string | null
          pays?: string | null
          photo_url?: string | null
          prenom?: string | null
          reseaux?: Json | null
          score_influence?: number | null
          score_spdi_actuel?: number | null
          sources_suivies?: Json | null
          sous_categorie?: string | null
          suivi_spdi_actif?: boolean | null
          tags?: string[] | null
          tendance_spdi?: string | null
          thematiques?: string[] | null
          zone?: string | null
        }
        Update: {
          actif?: boolean | null
          alertes_config?: Json | null
          bio?: string | null
          categorie?: string | null
          cercle?: number | null
          created_at?: string
          derniere_activite?: string | null
          derniere_mesure_spdi?: string | null
          fonction?: string | null
          id?: string
          niveau_alerte?: string | null
          nom?: string
          notes?: string | null
          organisation?: string | null
          pays?: string | null
          photo_url?: string | null
          prenom?: string | null
          reseaux?: Json | null
          score_influence?: number | null
          score_spdi_actuel?: number | null
          sources_suivies?: Json | null
          sous_categorie?: string | null
          suivi_spdi_actif?: boolean | null
          tags?: string[] | null
          tendance_spdi?: string | null
          thematiques?: string[] | null
          zone?: string | null
        }
        Relationships: []
      }
      personnalites_mentions: {
        Row: {
          created_at: string | null
          id: string
          mention_id: string
          personnalite_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          mention_id: string
          personnalite_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          mention_id?: string
          personnalite_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personnalites_mentions_mention_id_fkey"
            columns: ["mention_id"]
            isOneToOne: false
            referencedRelation: "mentions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personnalites_mentions_personnalite_id_fkey"
            columns: ["personnalite_id"]
            isOneToOne: false
            referencedRelation: "personnalites"
            referencedColumns: ["id"]
          },
        ]
      }
      presence_digitale_metrics: {
        Row: {
          activite_linkedin: number | null
          coherence_message: number | null
          created_at: string | null
          date_mesure: string
          engagement_linkedin: number | null
          id: string
          interpretation: string | null
          nb_citations_directes: number | null
          nb_controverses: number | null
          nb_invitations_panels: number | null
          nb_mentions: number | null
          nb_references_croisees: number | null
          nb_sources_distinctes: number | null
          pct_themes_strategiques: number | null
          personnalite_id: string
          regularite_mentions: number | null
          score_autorite: number | null
          score_presence: number | null
          score_qualite: number | null
          score_spdi: number | null
          score_visibilite: number | null
          sentiment_moyen: number | null
        }
        Insert: {
          activite_linkedin?: number | null
          coherence_message?: number | null
          created_at?: string | null
          date_mesure?: string
          engagement_linkedin?: number | null
          id?: string
          interpretation?: string | null
          nb_citations_directes?: number | null
          nb_controverses?: number | null
          nb_invitations_panels?: number | null
          nb_mentions?: number | null
          nb_references_croisees?: number | null
          nb_sources_distinctes?: number | null
          pct_themes_strategiques?: number | null
          personnalite_id: string
          regularite_mentions?: number | null
          score_autorite?: number | null
          score_presence?: number | null
          score_qualite?: number | null
          score_spdi?: number | null
          score_visibilite?: number | null
          sentiment_moyen?: number | null
        }
        Update: {
          activite_linkedin?: number | null
          coherence_message?: number | null
          created_at?: string | null
          date_mesure?: string
          engagement_linkedin?: number | null
          id?: string
          interpretation?: string | null
          nb_citations_directes?: number | null
          nb_controverses?: number | null
          nb_invitations_panels?: number | null
          nb_mentions?: number | null
          nb_references_croisees?: number | null
          nb_sources_distinctes?: number | null
          pct_themes_strategiques?: number | null
          personnalite_id?: string
          regularite_mentions?: number | null
          score_autorite?: number | null
          score_presence?: number | null
          score_qualite?: number | null
          score_spdi?: number | null
          score_visibilite?: number | null
          sentiment_moyen?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "presence_digitale_metrics_personnalite_id_fkey"
            columns: ["personnalite_id"]
            isOneToOne: false
            referencedRelation: "personnalites"
            referencedColumns: ["id"]
          },
        ]
      }
      presence_digitale_recommandations: {
        Row: {
          actif: boolean | null
          canal: string | null
          created_at: string | null
          expire_at: string | null
          id: string
          message: string
          personnalite_id: string
          priorite: string | null
          thematique: string | null
          titre: string
          type: string
          vue: boolean | null
        }
        Insert: {
          actif?: boolean | null
          canal?: string | null
          created_at?: string | null
          expire_at?: string | null
          id?: string
          message: string
          personnalite_id: string
          priorite?: string | null
          thematique?: string | null
          titre: string
          type: string
          vue?: boolean | null
        }
        Update: {
          actif?: boolean | null
          canal?: string | null
          created_at?: string | null
          expire_at?: string | null
          id?: string
          message?: string
          personnalite_id?: string
          priorite?: string | null
          thematique?: string | null
          titre?: string
          type?: string
          vue?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "presence_digitale_recommandations_personnalite_id_fkey"
            columns: ["personnalite_id"]
            isOneToOne: false
            referencedRelation: "personnalites"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          disabled: boolean
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          disabled?: boolean
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          disabled?: boolean
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string | null
          enabled: boolean | null
          id: string
          permission_code: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          permission_code: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          permission_code?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_code_fkey"
            columns: ["permission_code"]
            isOneToOne: false
            referencedRelation: "permissions_registry"
            referencedColumns: ["code"]
          },
        ]
      }
      signaux: {
        Row: {
          actif: boolean | null
          created_at: string
          date_detection: string | null
          description: string | null
          id: string
          niveau: string
          quadrant: string
          score_impact: number | null
          source_id: string | null
          source_type: string | null
          tendance: string | null
          titre: string
        }
        Insert: {
          actif?: boolean | null
          created_at?: string
          date_detection?: string | null
          description?: string | null
          id?: string
          niveau: string
          quadrant: string
          score_impact?: number | null
          source_id?: string | null
          source_type?: string | null
          tendance?: string | null
          titre: string
        }
        Update: {
          actif?: boolean | null
          created_at?: string
          date_detection?: string | null
          description?: string | null
          id?: string
          niveau?: string
          quadrant?: string
          score_impact?: number | null
          source_id?: string | null
          source_type?: string | null
          tendance?: string | null
          titre?: string
        }
        Relationships: []
      }
      sms_destinataires: {
        Row: {
          actif: boolean | null
          created_at: string | null
          id: string
          nom: string
          numero: string
          role_filtre: string | null
        }
        Insert: {
          actif?: boolean | null
          created_at?: string | null
          id?: string
          nom: string
          numero: string
          role_filtre?: string | null
        }
        Update: {
          actif?: boolean | null
          created_at?: string | null
          id?: string
          nom?: string
          numero?: string
          role_filtre?: string | null
        }
        Relationships: []
      }
      sms_logs: {
        Row: {
          alerte_id: string | null
          created_at: string | null
          destinataire: string
          erreur: string | null
          id: string
          message: string
          statut: string | null
        }
        Insert: {
          alerte_id?: string | null
          created_at?: string | null
          destinataire: string
          erreur?: string | null
          id?: string
          message: string
          statut?: string | null
        }
        Update: {
          alerte_id?: string | null
          created_at?: string | null
          destinataire?: string
          erreur?: string | null
          id?: string
          message?: string
          statut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_logs_alerte_id_fkey"
            columns: ["alerte_id"]
            isOneToOne: false
            referencedRelation: "alertes"
            referencedColumns: ["id"]
          },
        ]
      }
      social_api_config: {
        Row: {
          config: Json | null
          created_at: string | null
          enabled: boolean | null
          id: string
          last_sync: string | null
          plateforme: string
          quota_limit: number | null
          quota_used: number | null
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          last_sync?: string | null
          plateforme: string
          quota_limit?: number | null
          quota_used?: number | null
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          last_sync?: string | null
          plateforme?: string
          quota_limit?: number | null
          quota_used?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      social_insights: {
        Row: {
          alerte_generee: boolean | null
          auteur: string | null
          auteur_url: string | null
          comments_count: number | null
          contenu: string | null
          created_at: string
          date_publication: string | null
          engagement_score: number | null
          entites_detectees: string[] | null
          est_critique: boolean | null
          hashtags: string[] | null
          id: string
          is_manual_entry: boolean | null
          is_official_api: boolean | null
          likes_count: number | null
          plateforme: string
          platform_post_id: string | null
          sentiment: number | null
          shares_count: number | null
          source_id: string | null
          traite: boolean | null
          type_contenu: string
          url_original: string | null
        }
        Insert: {
          alerte_generee?: boolean | null
          auteur?: string | null
          auteur_url?: string | null
          comments_count?: number | null
          contenu?: string | null
          created_at?: string
          date_publication?: string | null
          engagement_score?: number | null
          entites_detectees?: string[] | null
          est_critique?: boolean | null
          hashtags?: string[] | null
          id?: string
          is_manual_entry?: boolean | null
          is_official_api?: boolean | null
          likes_count?: number | null
          plateforme: string
          platform_post_id?: string | null
          sentiment?: number | null
          shares_count?: number | null
          source_id?: string | null
          traite?: boolean | null
          type_contenu?: string
          url_original?: string | null
        }
        Update: {
          alerte_generee?: boolean | null
          auteur?: string | null
          auteur_url?: string | null
          comments_count?: number | null
          contenu?: string | null
          created_at?: string
          date_publication?: string | null
          engagement_score?: number | null
          entites_detectees?: string[] | null
          est_critique?: boolean | null
          hashtags?: string[] | null
          id?: string
          is_manual_entry?: boolean | null
          is_official_api?: boolean | null
          likes_count?: number | null
          plateforme?: string
          platform_post_id?: string | null
          sentiment?: number | null
          shares_count?: number | null
          source_id?: string | null
          traite?: boolean | null
          type_contenu?: string
          url_original?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_insights_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources_media"
            referencedColumns: ["id"]
          },
        ]
      }
      sources_media: {
        Row: {
          actif: boolean | null
          created_at: string
          derniere_collecte: string | null
          frequence_scan: string | null
          id: string
          nom: string
          platform_config: Json | null
          platform_id: string | null
          type: string
          url: string | null
        }
        Insert: {
          actif?: boolean | null
          created_at?: string
          derniere_collecte?: string | null
          frequence_scan?: string | null
          id?: string
          nom: string
          platform_config?: Json | null
          platform_id?: string | null
          type: string
          url?: string | null
        }
        Update: {
          actif?: boolean | null
          created_at?: string
          derniere_collecte?: string | null
          frequence_scan?: string | null
          id?: string
          nom?: string
          platform_config?: Json | null
          platform_id?: string | null
          type?: string
          url?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_cron_history: {
        Args: { limit_count?: number }
        Returns: {
          end_time: string
          job_name: string
          jobid: number
          return_message: string
          runid: number
          start_time: string
          status: string
        }[]
      }
      get_cron_jobs: {
        Args: never
        Returns: {
          active: boolean
          command: string
          jobid: number
          jobname: string
          schedule: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      toggle_cron_job: { Args: { job_id: number }; Returns: undefined }
      update_cron_schedule: {
        Args: { job_id: number; new_schedule: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user" | "council_user" | "guest"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "council_user", "guest"],
    },
  },
} as const
