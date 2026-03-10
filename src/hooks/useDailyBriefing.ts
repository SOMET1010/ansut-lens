import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const CACHE_KEY = 'daily-briefing-cache';
const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours

export interface BriefingSource {
  index: number;
  titre: string;
  source_nom: string;
  source_url: string | null;
}

interface CachedBriefing {
  briefing: string;
  generated_at: string;
  sources_count: number;
  alerts_count: number;
  sources: BriefingSource[];
  expires_at: number;
}

interface BriefingResponse {
  briefing: string;
  generated_at: string;
  sources_count: number;
  alerts_count: number;
  sources?: BriefingSource[];
}

export interface UseDailyBriefingReturn {
  briefing: string | null;
  generatedAt: Date | null;
  sourcesCount: number;
  alertsCount: number;
  sources: BriefingSource[];
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
  regenerate: () => Promise<void>;
}

function getCachedBriefing(): CachedBriefing | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    return JSON.parse(cached) as CachedBriefing;
  } catch {
    return null;
  }
}

function setCachedBriefing(data: BriefingResponse): void {
  try {
    const cached: CachedBriefing = {
      ...data,
      sources: data.sources || [],
      expires_at: Date.now() + CACHE_TTL,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch (e) {
    console.warn('Failed to cache briefing:', e);
  }
}

function isExpired(cached: CachedBriefing): boolean {
  return Date.now() > cached.expires_at;
}

export function useDailyBriefing(): UseDailyBriefingReturn {
  const [briefing, setBriefing] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const [sourcesCount, setSourcesCount] = useState<number>(0);
  const [alertsCount, setAlertsCount] = useState<number>(0);
  const [sources, setSources] = useState<BriefingSource[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const applyData = useCallback((data: { briefing: string; generated_at: string; sources_count: number; alerts_count: number; sources?: BriefingSource[] }) => {
    setBriefing(data.briefing);
    setGeneratedAt(new Date(data.generated_at));
    setSourcesCount(data.sources_count);
    setAlertsCount(data.alerts_count);
    setSources(data.sources || []);
  }, []);

  const generateBriefing = useCallback(async (forceRegenerate = false) => {
    if (!forceRegenerate) {
      const cached = getCachedBriefing();
      if (cached && !isExpired(cached)) {
        applyData(cached);
        setIsLoading(false);
        setError(null);
        return;
      }
    }

    if (forceRegenerate) {
      setIsGenerating(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke<BriefingResponse>('generer-briefing');

      if (invokeError) {
        throw new Error(invokeError.message || 'Erreur lors de la génération du briefing');
      }

      if (!data?.briefing) {
        throw new Error('Réponse invalide du service');
      }

      setCachedBriefing(data);
      applyData(data);
      setError(null);

      if (forceRegenerate) {
        toast.success('Briefing régénéré avec succès');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('Failed to generate briefing:', errorMessage);
      setError(errorMessage);

      const cached = getCachedBriefing();
      if (cached) {
        applyData(cached);
        toast.error('Impossible de régénérer le briefing. Affichage de la version précédente.');
      } else {
        toast.error('Impossible de générer le briefing');
      }
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  }, [applyData]);

  useEffect(() => {
    generateBriefing(false);
  }, [generateBriefing]);

  const regenerate = useCallback(async () => {
    await generateBriefing(true);
  }, [generateBriefing]);

  return {
    briefing,
    generatedAt,
    sourcesCount,
    alertsCount,
    sources,
    isLoading,
    isGenerating,
    error,
    regenerate,
  };
}
