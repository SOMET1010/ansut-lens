import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// VIP Comptes
export function useVipComptes() {
  return useQuery({
    queryKey: ["vip-comptes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vip_comptes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateVipCompte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (compte: {
      nom: string;
      fonction?: string;
      plateforme: string;
      identifiant: string;
      url_profil?: string;
      personnalite_id?: string;
    }) => {
      const { data, error } = await supabase.from("vip_comptes").insert(compte).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vip-comptes"] });
      toast.success("Compte VIP ajouté");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteVipCompte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vip_comptes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vip-comptes"] });
      toast.success("Compte VIP supprimé");
    },
  });
}

// VIP Alertes
export function useVipAlertes() {
  return useQuery({
    queryKey: ["vip-alertes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vip_alertes")
        .select("*, vip_comptes(nom, fonction, plateforme)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
}

export function useTraiterVipAlerte() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vip_alertes").update({ traitee: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vip-alertes"] });
      toast.success("Alerte traitée");
    },
  });
}

// Analyze post
export function useAnalyserPostVip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      vip_compte_id: string;
      contenu: string;
      url_post?: string;
      plateforme: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("analyser-post-vip", {
        body: { action: "scan_post", ...params },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vip-alertes"] });
      toast.success("Analyse de conformité terminée");
    },
    onError: (e: Error) => toast.error(`Erreur analyse: ${e.message}`),
  });
}

// Crisis checklist
export function useGenererChecklistCrise() {
  return useMutation({
    mutationFn: async (params: { contenu: string; plateforme: string }) => {
      const { data, error } = await supabase.functions.invoke("analyser-post-vip", {
        body: { action: "crisis_checklist", ...params },
      });
      if (error) throw error;
      return data;
    },
    onError: (e: Error) => toast.error(`Erreur checklist: ${e.message}`),
  });
}

// Contenus Validés
export function useContenusValides() {
  return useQuery({
    queryKey: ["contenus-valides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contenus_valides")
        .select("*")
        .eq("actif", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateContenuValide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (contenu: {
      titre: string;
      contenu: string;
      type?: string;
      categorie?: string;
      hashtags?: string[];
    }) => {
      const { data, error } = await supabase.from("contenus_valides").insert(contenu).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contenus-valides"] });
      toast.success("Contenu ajouté à la bibliothèque");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteContenuValide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contenus_valides").update({ actif: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contenus-valides"] });
      toast.success("Contenu archivé");
    },
  });
}
