import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Diagnostic QUALITÉ DE COLLECTE.
 *
 * Rend visible ce que le filtre d'entrée (`_shared/qualiteContenu.ts`) écarte :
 * vidéos et posts sociaux, pages de menu, titres non informatifs, sujets déjà
 * couverts. Sans cet écran, le client ne peut pas vérifier que RADAR arrête
 * bien de réafficher les mêmes contenus.
 *
 * Charte crédibilité : aucune valeur simulée. Ce qui n'est pas journalisé
 * s'affiche « non mesuré », jamais estimé.
 */

/** Motif de rejet, tel qu'écrit par les fonctions de collecte. */
export type MotifRejet =
  | 'url_video_ou_social'
  | 'url_non_article'
  | 'url_absente'
  | 'titre_non_informatif'
  | 'titre_absent'
  | 'sujet_deja_couvert'
  | string;

/** Famille lisible regroupant plusieurs motifs techniques. */
export type FamilleRejet = 'youtube_social' | 'menu' | 'placeholder' | 'doublon' | 'autre';

export const LIBELLES_MOTIFS: Record<string, string> = {
  url_video_ou_social: 'Vidéo ou réseau social',
  url_non_article: 'Page de menu ou rubrique',
  url_absente: 'Lien source absent',
  titre_non_informatif: 'Titre non informatif',
  titre_absent: 'Titre absent',
  sujet_deja_couvert: 'Sujet déjà couvert (doublon évité)',
};

export function familleDuMotif(motif: string): FamilleRejet {
  if (motif === 'url_video_ou_social') return 'youtube_social';
  if (motif === 'url_non_article' || motif === 'url_absente') return 'menu';
  if (motif === 'titre_non_informatif' || motif === 'titre_absent') return 'placeholder';
  if (motif === 'sujet_deja_couvert') return 'doublon';
  return 'autre';
}

export interface ExecutionCollecte {
  id: string;
  type: string;
  statut: string;
  nbResultats: number;
  dureeMs: number | null;
  erreur: string | null;
  sources: string[];
  createdAt: string;
  /** Détail brut motif → nombre. Vide si l'exécution date d'avant la journalisation. */
  rejets: Record<string, number>;
  /** Somme de tous les motifs. */
  totalRejets: number;
  /** L'exécution a-t-elle journalisé la qualité ? (sinon : « non mesuré ») */
  qualiteMesuree: boolean;
}

export interface DiagnosticQualite {
  executions: ExecutionCollecte[];
  /** Cumul par famille sur les exécutions journalisées. */
  parFamille: Record<FamilleRejet, number>;
  /** Cumul par motif exact. */
  parMotif: Record<string, number>;
  totalRetenus: number;
  totalRejets: number;
  nbExecutionsMesurees: number;
  /** Remplissage de `cluster_id` sur les contenus récents. */
  clusters: { total: number; avecCluster: number; taux: number | null };
}

const FAMILLES_VIDES: Record<FamilleRejet, number> = {
  youtube_social: 0,
  menu: 0,
  placeholder: 0,
  doublon: 0,
  autre: 0,
};

export function useDiagnosticQualite(nbExecutions = 20, fenetreJours = 7) {
  return useQuery({
    queryKey: ['diagnostic-qualite', nbExecutions, fenetreJours],
    queryFn: async (): Promise<DiagnosticQualite> => {
      const depuis = new Date(Date.now() - fenetreJours * 24 * 3600 * 1000).toISOString();

      const [logs, contenus] = await Promise.all([
        supabase
          .from('collectes_log')
          .select('id, type, statut, nb_resultats, duree_ms, erreur, sources_utilisees, created_at, rejets_qualite')
          .order('created_at', { ascending: false })
          .limit(nbExecutions),
        supabase
          .from('actualites')
          .select('id, cluster_id')
          .gte('created_at', depuis)
          .limit(2000),
      ]);

      if (logs.error) throw logs.error;
      if (contenus.error) throw contenus.error;

      const parFamille = { ...FAMILLES_VIDES };
      const parMotif: Record<string, number> = {};
      let totalRetenus = 0;
      let totalRejets = 0;
      let nbExecutionsMesurees = 0;

      const executions: ExecutionCollecte[] = (logs.data ?? []).map((l) => {
        const brut = (l.rejets_qualite ?? {}) as Record<string, unknown>;
        const rejets: Record<string, number> = {};
        for (const [motif, valeur] of Object.entries(brut)) {
          const n = Number(valeur);
          if (Number.isFinite(n) && n > 0) rejets[motif] = n;
        }
        const total = Object.values(rejets).reduce((s, n) => s + n, 0);
        const mesuree = Object.keys(rejets).length > 0;

        if (mesuree) {
          nbExecutionsMesurees += 1;
          totalRejets += total;
          for (const [motif, n] of Object.entries(rejets)) {
            parMotif[motif] = (parMotif[motif] ?? 0) + n;
            parFamille[familleDuMotif(motif)] += n;
          }
        }
        totalRetenus += l.nb_resultats ?? 0;

        return {
          id: l.id,
          type: l.type,
          statut: l.statut,
          nbResultats: l.nb_resultats ?? 0,
          dureeMs: l.duree_ms,
          erreur: l.erreur,
          sources: (l.sources_utilisees ?? []) as string[],
          createdAt: l.created_at,
          rejets,
          totalRejets: total,
          qualiteMesuree: mesuree,
        };
      });

      const total = contenus.data?.length ?? 0;
      const avecCluster = (contenus.data ?? []).filter((c) => c.cluster_id).length;

      return {
        executions,
        parFamille,
        parMotif,
        totalRetenus,
        totalRejets,
        nbExecutionsMesurees,
        clusters: {
          total,
          avecCluster,
          taux: total > 0 ? Math.round((avecCluster / total) * 100) : null,
        },
      };
    },
    staleTime: 30_000,
  });
}
