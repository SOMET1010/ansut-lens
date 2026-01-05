-- Ajouter les champs de programmation à la table newsletters
ALTER TABLE public.newsletters 
ADD COLUMN IF NOT EXISTS programmation_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS date_envoi_programme TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rappel_envoye BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS date_rappel TIMESTAMPTZ;

-- Créer la table de configuration de programmation
CREATE TABLE public.newsletter_programmation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Configuration
  frequence VARCHAR(20) NOT NULL DEFAULT 'mensuel', -- 'hebdo' | 'mensuel' | 'desactive'
  jour_envoi INTEGER DEFAULT 1, -- 1-31 pour mensuel, 1-7 pour hebdo (1=lundi)
  heure_envoi TIME DEFAULT '09:00:00',
  
  -- Paramètres par défaut
  ton_defaut VARCHAR(20) DEFAULT 'pedagogique',
  cible_defaut VARCHAR(20) DEFAULT 'general',
  
  -- Rappel
  delai_rappel_heures INTEGER DEFAULT 48,
  emails_rappel TEXT[] DEFAULT '{}',
  
  -- État
  actif BOOLEAN DEFAULT true,
  derniere_generation TIMESTAMPTZ,
  prochain_envoi TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insérer une configuration par défaut
INSERT INTO public.newsletter_programmation (frequence, jour_envoi, ton_defaut, cible_defaut)
VALUES ('mensuel', 1, 'pedagogique', 'general');

-- Activer RLS
ALTER TABLE public.newsletter_programmation ENABLE ROW LEVEL SECURITY;

-- Policies pour admins uniquement
CREATE POLICY "Admins can view programmation" ON public.newsletter_programmation
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update programmation" ON public.newsletter_programmation
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert programmation" ON public.newsletter_programmation
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger updated_at
CREATE TRIGGER update_newsletter_programmation_updated_at
  BEFORE UPDATE ON public.newsletter_programmation
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();