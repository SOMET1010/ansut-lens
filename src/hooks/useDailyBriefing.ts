import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const CACHE_KEY = 'daily-briefing-cache';
const CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

interface CachedBriefing {
  briefing: string;
  generated_at: string;
  sources_count: number;
  alerts_count: number;
  expires_at: number;
}

interface BriefingResponse {
  briefing: string;
  generated_at: string;
  sources_count: number;
  alerts_count: number;
}

interface UseDailyBriefingReturn {
  briefing: string | null;
  generatedAt: Date | null;
  sourcesCount: number;
  alertsCount: number;
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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const generateBriefing = useCallback(async (forceRegenerate = false) => {
    // Check cache first (unless forcing regeneration)
    if (!forceRegenerate) {
      const cached = getCachedBriefing();
      if (cached && !isExpired(cached)) {
        setBriefing(cached.briefing);
        setGeneratedAt(new Date(cached.generated_at));
        setSourcesCount(cached.sources_count);
        setAlertsCount(cached.alerts_count);
        setIsLoading(false);
        setError(null);
        return;
      }
    }

    // Set appropriate loading state
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

      // Cache the result
      setCachedBriefing(data);

      // Update state
      setBriefing(data.briefing);
      setGeneratedAt(new Date(data.generated_at));
      setSourcesCount(data.sources_count);
      setAlertsCount(data.alerts_count);
      setError(null);

      if (forceRegenerate) {
        toast.success('Briefing régénéré avec succès');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
      console.error('Failed to generate briefing:', errorMessage);
      setError(errorMessage);

      // Try to use cached data as fallback
      const cached = getCachedBriefing();
      if (cached) {
        setBriefing(cached.briefing);
        setGeneratedAt(new Date(cached.generated_at));
        setSourcesCount(cached.sources_count);
        setAlertsCount(cached.alerts_count);
        toast.error('Impossible de régénérer le briefing. Affichage de la version précédente.');
      } else {
        toast.error('Impossible de générer le briefing');
      }
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  }, []);

  // Generate briefing on mount
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
    isLoading,
    isGenerating,
    error,
    regenerate,
  };
}
