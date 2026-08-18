CREATE TABLE public.fils_sociaux (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  plateforme text NOT NULL DEFAULT 'facebook',
  titre text,
  auteur_publication text,
  contexte text,
  signale_par uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  statut text NOT NULL DEFAULT 'a_suivre',
  tonalite_globale numeric,
  alerte_generee boolean NOT NULL DEFAULT false,
  derniere_evaluation timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fils_sociaux_url_unique UNIQUE (url)
);

CREATE TABLE public.commentaires_fil (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fil_id uuid NOT NULL REFERENCES public.fils_sociaux(id) ON DELETE CASCADE,
  auteur text,
  contenu text NOT NULL,
  auteur_influent boolean NOT NULL DEFAULT false,
  sentiment numeric,
  date_commentaire timestamptz NOT NULL DEFAULT now(),
  saisi_par uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_commentaires_fil_fil ON public.commentaires_fil(fil_id, date_commentaire DESC);
CREATE INDEX idx_fils_sociaux_created ON public.fils_sociaux(created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fils_sociaux TO authenticated;
GRANT ALL ON public.fils_sociaux TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commentaires_fil TO authenticated;
GRANT ALL ON public.commentaires_fil TO service_role;

ALTER TABLE public.fils_sociaux ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commentaires_fil ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fils_sociaux_select_auth" ON public.fils_sociaux
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "fils_sociaux_insert_auth" ON public.fils_sociaux
  FOR INSERT TO authenticated WITH CHECK (signale_par = auth.uid());
CREATE POLICY "fils_sociaux_update_owner_admin" ON public.fils_sociaux
  FOR UPDATE TO authenticated
  USING (signale_par = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (signale_par = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "fils_sociaux_delete_owner_admin" ON public.fils_sociaux
  FOR DELETE TO authenticated
  USING (signale_par = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "commentaires_fil_select_auth" ON public.commentaires_fil
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "commentaires_fil_insert_auth" ON public.commentaires_fil
  FOR INSERT TO authenticated WITH CHECK (saisi_par = auth.uid());
CREATE POLICY "commentaires_fil_update_owner_admin" ON public.commentaires_fil
  FOR UPDATE TO authenticated
  USING (saisi_par = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (saisi_par = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "commentaires_fil_delete_owner_admin" ON public.commentaires_fil
  FOR DELETE TO authenticated
  USING (saisi_par = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER fils_sociaux_updated_at
  BEFORE UPDATE ON public.fils_sociaux
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();