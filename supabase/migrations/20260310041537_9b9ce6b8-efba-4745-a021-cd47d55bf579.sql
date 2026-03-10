
-- Interactions utilisateur (tracking comportemental)
CREATE TABLE public.user_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  resource_type TEXT NOT NULL DEFAULT 'actualite',
  resource_id UUID,
  action TEXT NOT NULL DEFAULT 'view',
  duration_seconds INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_user_interactions_user ON public.user_interactions(user_id);
CREATE INDEX idx_user_interactions_resource ON public.user_interactions(resource_type, resource_id);

ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own interactions"
  ON public.user_interactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own interactions"
  ON public.user_interactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all interactions"
  ON public.user_interactions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Profil de veille IA (portrait robot)
CREATE TABLE public.user_preferences_ia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  sujets_favoris TEXT[] DEFAULT '{}',
  sujets_ignores TEXT[] DEFAULT '{}',
  categories_preferees TEXT[] DEFAULT '{}',
  quadrants_preferes TEXT[] DEFAULT '{}',
  pays_interet TEXT[] DEFAULT '{}',
  score_profil JSONB DEFAULT '{}',
  portrait_ia TEXT,
  derniere_analyse TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.user_preferences_ia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own preferences"
  ON public.user_preferences_ia FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Feedback sur les actualités
CREATE TABLE public.actualites_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  actualite_id UUID NOT NULL REFERENCES public.actualites(id) ON DELETE CASCADE,
  feedback TEXT NOT NULL CHECK (feedback IN ('pertinent', 'non_pertinent', 'important', 'archive')),
  raison TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, actualite_id)
);

CREATE INDEX idx_feedback_user ON public.actualites_feedback(user_id);

ALTER TABLE public.actualites_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own feedback"
  ON public.actualites_feedback FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime for interactions (for live tracking)
ALTER PUBLICATION supabase_realtime ADD TABLE public.actualites_feedback;
