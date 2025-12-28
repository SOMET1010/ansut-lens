import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Personnalite, CercleStrategique, CategorieActeur, NiveauAlerte, SousCategorieActeur } from '@/types';

export interface PersonnalitesFilters {
  cercle?: CercleStrategique;
  categorie?: CategorieActeur;
  sous_categorie?: SousCategorieActeur;
  niveau_alerte?: NiveauAlerte;
  actif?: boolean;
  search?: string;
}

export interface PersonnalitesStats {
  total: number;
  parCercle: Record<CercleStrategique, number>;
  parCategorie: Record<string, number>;
  alertesElevees: number;
}

// Mapper les données DB vers le type Personnalite
const mapDbToPersonnalite = (row: any): Personnalite => ({
  id: row.id,
  nom: row.nom,
  prenom: row.prenom,
  fonction: row.fonction,
  organisation: row.organisation,
  categorie: row.categorie as CategorieActeur,
  sous_categorie: row.sous_categorie as SousCategorieActeur,
  cercle: (row.cercle || 2) as CercleStrategique,
  pays: row.pays,
  zone: row.zone,
  photo_url: row.photo_url,
  bio: row.bio,
  score_influence: row.score_influence || 50,
  reseaux: row.reseaux as Record<string, string>,
  thematiques: row.thematiques,
  sources_suivies: row.sources_suivies,
  alertes_config: row.alertes_config,
  niveau_alerte: row.niveau_alerte as NiveauAlerte,
  tags: row.tags,
  derniere_activite: row.derniere_activite,
  actif: row.actif ?? true,
  notes: row.notes,
  created_at: row.created_at,
});

// Hook principal pour récupérer les personnalités avec filtres
export function usePersonnalites(filters: PersonnalitesFilters = {}) {
  return useQuery({
    queryKey: ['personnalites', filters],
    queryFn: async () => {
      let query = supabase
        .from('personnalites')
        .select('*')
        .order('cercle', { ascending: true })
        .order('score_influence', { ascending: false });

      if (filters.cercle) {
        query = query.eq('cercle', filters.cercle);
      }
      if (filters.categorie) {
        query = query.eq('categorie', filters.categorie);
      }
      if (filters.sous_categorie) {
        query = query.eq('sous_categorie', filters.sous_categorie);
      }
      if (filters.niveau_alerte) {
        query = query.eq('niveau_alerte', filters.niveau_alerte);
      }
      if (filters.actif !== undefined) {
        query = query.eq('actif', filters.actif);
      }
      if (filters.search) {
        query = query.or(`nom.ilike.%${filters.search}%,fonction.ilike.%${filters.search}%,organisation.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(mapDbToPersonnalite);
    },
  });
}

// Hook pour récupérer une personnalité par ID
export function usePersonnalite(id: string | undefined) {
  return useQuery({
    queryKey: ['personnalite', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('personnalites')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data ? mapDbToPersonnalite(data) : null;
    },
    enabled: !!id,
  });
}

// Hook pour les statistiques
export function usePersonnalitesStats() {
  return useQuery({
    queryKey: ['personnalites-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('personnalites')
        .select('cercle, categorie, niveau_alerte, actif');
      
      if (error) throw error;

      const activeData = (data || []).filter(p => p.actif !== false);
      
      const stats: PersonnalitesStats = {
        total: activeData.length,
        parCercle: { 1: 0, 2: 0, 3: 0, 4: 0 },
        parCategorie: {},
        alertesElevees: 0,
      };

      activeData.forEach(p => {
        const cercle = (p.cercle || 2) as CercleStrategique;
        stats.parCercle[cercle]++;
        
        const cat = p.categorie || 'autre';
        stats.parCategorie[cat] = (stats.parCategorie[cat] || 0) + 1;
        
        if (p.niveau_alerte === 'eleve' || p.niveau_alerte === 'critique') {
          stats.alertesElevees++;
        }
      });

      return stats;
    },
  });
}

// Mutation pour créer une personnalité
export function useCreatePersonnalite() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (personnalite: Omit<Personnalite, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('personnalites')
        .insert({
          nom: personnalite.nom,
          prenom: personnalite.prenom,
          fonction: personnalite.fonction,
          organisation: personnalite.organisation,
          categorie: personnalite.categorie,
          sous_categorie: personnalite.sous_categorie,
          cercle: personnalite.cercle,
          pays: personnalite.pays,
          zone: personnalite.zone,
          photo_url: personnalite.photo_url,
          bio: personnalite.bio,
          score_influence: personnalite.score_influence,
          reseaux: personnalite.reseaux as any,
          thematiques: personnalite.thematiques,
          sources_suivies: personnalite.sources_suivies as any,
          alertes_config: personnalite.alertes_config as any,
          niveau_alerte: personnalite.niveau_alerte,
          tags: personnalite.tags,
          actif: personnalite.actif,
          notes: personnalite.notes,
        })
        .select()
        .single();
      
      if (error) throw error;
      return mapDbToPersonnalite(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personnalites'] });
      queryClient.invalidateQueries({ queryKey: ['personnalites-stats'] });
    },
  });
}

// Mutation pour mettre à jour une personnalité
export function useUpdatePersonnalite() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Personnalite> & { id: string }) => {
      const updateData: any = { ...updates };
      if (updates.alertes_config) updateData.alertes_config = updates.alertes_config as any;
      if (updates.sources_suivies) updateData.sources_suivies = updates.sources_suivies as any;
      if (updates.reseaux) updateData.reseaux = updates.reseaux as any;
      
      const { data, error } = await supabase
        .from('personnalites')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return mapDbToPersonnalite(data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['personnalites'] });
      queryClient.invalidateQueries({ queryKey: ['personnalite', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['personnalites-stats'] });
    },
  });
}

// Mutation pour supprimer une personnalité
export function useDeletePersonnalite() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('personnalites')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personnalites'] });
      queryClient.invalidateQueries({ queryKey: ['personnalites-stats'] });
    },
  });
}

// Constantes pour les labels
export const CERCLE_LABELS: Record<CercleStrategique, { label: string; color: string; description: string }> = {
  1: { 
    label: 'Institutionnels Nationaux', 
    color: 'bg-blue-500', 
    description: 'Tutelle MTND, Régulation ARTCI, Gouvernance ANSUT' 
  },
  2: { 
    label: 'Opérateurs & Connectivité', 
    color: 'bg-orange-500', 
    description: 'Télécoms, FAI, Fintech, Équipementiers' 
  },
  3: { 
    label: 'Bailleurs & Internationaux', 
    color: 'bg-green-500', 
    description: 'Banque Mondiale, BAD, UE, Smart Africa' 
  },
  4: { 
    label: 'Experts & Médias', 
    color: 'bg-purple-500', 
    description: 'Médias tech, Académiques, Consultants' 
  },
};

export const SOUS_CATEGORIE_LABELS: Record<SousCategorieActeur, string> = {
  tutelle_mtnd: 'Tutelle MTND',
  regulation_artci: 'Régulation ARTCI',
  gouvernance_ansut: 'Gouvernance ANSUT',
  operateurs_mobiles: 'Opérateurs Mobiles',
  fai_internet: 'FAI / Internet',
  fintech_mobile_money: 'Fintech / Mobile Money',
  equipementiers: 'Équipementiers',
  associations_sectorielles: 'Associations Sectorielles',
  bailleurs_financeurs: 'Bailleurs & Financeurs',
  organisations_africaines: 'Organisations Africaines',
  normalisation_standards: 'Normalisation & Standards',
  medias_analystes: 'Médias & Analystes',
  academique_formation: 'Académique & Formation',
  consultants_influenceurs: 'Consultants & Influenceurs',
};
