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
          contenu: string | null
          created_at: string
          date_publication: string | null
          id: string
          importance: number | null
          pourquoi_important: string | null
          resume: string | null
          sentiment: number | null
          source_id: string | null
          source_nom: string | null
          source_url: string | null
          tags: string[] | null
          titre: string
        }
        Insert: {
          analyse_ia?: string | null
          categorie?: string | null
          contenu?: string | null
          created_at?: string
          date_publication?: string | null
          id?: string
          importance?: number | null
          pourquoi_important?: string | null
          resume?: string | null
          sentiment?: number | null
          source_id?: string | null
          source_nom?: string | null
          source_url?: string | null
          tags?: string[] | null
          titre: string
        }
        Update: {
          analyse_ia?: string | null
          categorie?: string | null
          contenu?: string | null
          created_at?: string
          date_publication?: string | null
          id?: string
          importance?: number | null
          pourquoi_important?: string | null
          resume?: string | null
          sentiment?: number | null
          source_id?: string | null
          source_nom?: string | null
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
      personnalites: {
        Row: {
          actif: boolean | null
          alertes_config: Json | null
          bio: string | null
          categorie: string | null
          cercle: number | null
          created_at: string
          derniere_activite: string | null
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
          sources_suivies: Json | null
          sous_categorie: string | null
          tags: string[] | null
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
          sources_suivies?: Json | null
          sous_categorie?: string | null
          tags?: string[] | null
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
          sources_suivies?: Json | null
          sous_categorie?: string | null
          tags?: string[] | null
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
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
      sources_media: {
        Row: {
          actif: boolean | null
          created_at: string
          derniere_collecte: string | null
          frequence_scan: string | null
          id: string
          nom: string
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
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
