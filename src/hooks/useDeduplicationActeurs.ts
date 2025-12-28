import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ActeurExistant {
  id: string;
  nom: string;
  prenom: string | null;
  organisation: string | null;
  fonction: string | null;
}

export function useDeduplicationActeurs() {
  const [acteursExistants, setActeursExistants] = useState<ActeurExistant[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const chargerActeursExistants = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('personnalites')
        .select('id, nom, prenom, organisation, fonction');

      if (error) throw error;
      setActeursExistants(data || []);
    } catch (error) {
      console.error('Erreur chargement acteurs existants:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifierDoublon = useCallback((nomComplet: string, organisation: string | null): ActeurExistant | null => {
    const normaliser = (str: string) => str.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    for (const acteur of acteursExistants) {
      const nomExistant = normaliser(`${acteur.prenom || ''} ${acteur.nom}`.trim());
      const nomRecherche = normaliser(nomComplet);
      
      // Correspondance exacte du nom
      if (nomExistant === nomRecherche) {
        return acteur;
      }
      
      // Correspondance partielle (nom inversé)
      const partsRecherche = nomRecherche.split(' ').filter(Boolean);
      const partsExistant = nomExistant.split(' ').filter(Boolean);
      
      if (partsRecherche.length >= 2 && partsExistant.length >= 2) {
        const allPartsMatch = partsRecherche.every(part => 
          partsExistant.some(existant => existant.includes(part) || part.includes(existant))
        );
        
        if (allPartsMatch && organisation) {
          const orgExistante = normaliser(acteur.organisation || '');
          const orgRecherche = normaliser(organisation);
          if (orgExistante.includes(orgRecherche) || orgRecherche.includes(orgExistante)) {
            return acteur;
          }
        }
      }
    }
    
    return null;
  }, [acteursExistants]);

  return {
    acteursExistants,
    isLoading,
    chargerActeursExistants,
    verifierDoublon,
    nombreActeursExistants: acteursExistants.length
  };
}
