import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Territoires d'expression
export function useTerritoires() {
  return useQuery({
    queryKey: ["territoires-expression"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("territoires_expression")
        .select("*")
        .order("priorite", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateTerritoire() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: { nom: string; description?: string; concepts?: string[]; mots_cles_associes?: string[]; hashtags?: string[]; pays_cibles?: string[]; priorite?: number }) => {
      const { data, error } = await supabase.from("territoires_expression").insert(t).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["territoires-expression"] }); toast.success("Territoire créé"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteTerritoire() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("territoires_expression").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["territoires-expression"] }); toast.success("Territoire supprimé"); },
  });
}

// Influenceurs métier
export function useInfluenceurs() {
  return useQuery({
    queryKey: ["influenceurs-metier"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("influenceurs_metier")
        .select("*")
        .order("score_pertinence", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateInfluenceur() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (i: { nom: string; fonction?: string; organisation?: string; pays?: string; plateforme: string; identifiant: string; url_profil?: string; categorie?: string; score_pertinence?: number }) => {
      const { data, error } = await supabase.from("influenceurs_metier").insert(i).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["influenceurs-metier"] }); toast.success("Influenceur ajouté"); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteInfluenceur() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("influenceurs_metier").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["influenceurs-metier"] }); toast.success("Influenceur supprimé"); },
  });
}

// Analyses visuelles
export function useAnalysesVisuelles() {
  return useQuery({
    queryKey: ["analyses-visuelles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analyses_visuelles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });
}

export function useAnalyserImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { image_url: string; source_url?: string; plateforme?: string; auteur?: string }) => {
      const { data, error } = await supabase.functions.invoke("veille-semantique", {
        body: { action: "analyse_image", ...params },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["analyses-visuelles"] }); toast.success("Analyse visuelle terminée"); },
    onError: (e: Error) => toast.error(`Erreur: ${e.message}`),
  });
}

// Radar de proximité
export function useRadarProximite() {
  return useQuery({
    queryKey: ["radar-proximite"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("radar_proximite")
        .select("*")
        .order("similitude_score", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useLancerRadarProximite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("veille-semantique", {
        body: { action: "radar_proximite" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["radar-proximite"] });
      toast.success(`${data.count || 0} projets voisins détectés`);
    },
    onError: (e: Error) => toast.error(`Erreur: ${e.message}`),
  });
}
