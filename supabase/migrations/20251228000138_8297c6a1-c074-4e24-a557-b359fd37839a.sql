-- ANSUT RADAR Database Schema

-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'council_user', 'guest');

-- 2. User roles table (secure RBAC)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Security definer function for role checking (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. Function to get user's highest role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role 
      WHEN 'admin' THEN 1 
      WHEN 'user' THEN 2 
      WHEN 'council_user' THEN 3 
      WHEN 'guest' THEN 4 
    END
  LIMIT 1
$$;

-- 5. Profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    department TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 6. Sources media (admin only for write)
CREATE TABLE public.sources_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('web', 'rss', 'twitter', 'linkedin', 'autre')),
    url TEXT,
    frequence_scan TEXT DEFAULT '1h',
    actif BOOLEAN DEFAULT true,
    derniere_collecte TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sources_media ENABLE ROW LEVEL SECURITY;

-- 7. Actualités du jour
CREATE TABLE public.actualites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titre TEXT NOT NULL,
    resume TEXT,
    contenu TEXT,
    source_id UUID REFERENCES public.sources_media(id),
    source_nom TEXT,
    source_url TEXT,
    date_publication TIMESTAMP WITH TIME ZONE,
    importance INTEGER DEFAULT 50 CHECK (importance >= 0 AND importance <= 100),
    tags TEXT[],
    categorie TEXT,
    analyse_ia TEXT,
    pourquoi_important TEXT,
    sentiment DECIMAL(3,2) CHECK (sentiment >= -1 AND sentiment <= 1),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.actualites ENABLE ROW LEVEL SECURITY;

-- 8. Mentions ANSUT (e-réputation)
CREATE TABLE public.mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contenu TEXT NOT NULL,
    source TEXT,
    source_url TEXT,
    auteur TEXT,
    date_mention TIMESTAMP WITH TIME ZONE,
    sentiment DECIMAL(3,2) CHECK (sentiment >= -1 AND sentiment <= 1),
    score_influence INTEGER DEFAULT 0,
    est_critique BOOLEAN DEFAULT false,
    traite BOOLEAN DEFAULT false,
    suggestion_reaction TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.mentions ENABLE ROW LEVEL SECURITY;

-- 9. Personnalités suivies
CREATE TABLE public.personnalites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom TEXT NOT NULL,
    prenom TEXT,
    fonction TEXT,
    organisation TEXT,
    categorie TEXT CHECK (categorie IN ('operateur', 'regulateur', 'expert', 'politique', 'media', 'autre')),
    photo_url TEXT,
    bio TEXT,
    score_influence INTEGER DEFAULT 50 CHECK (score_influence >= 0 AND score_influence <= 100),
    reseaux JSONB DEFAULT '{}',
    tags TEXT[],
    derniere_activite TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.personnalites ENABLE ROW LEVEL SECURITY;

-- 10. Signaux radar
CREATE TABLE public.signaux (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titre TEXT NOT NULL,
    description TEXT,
    quadrant TEXT NOT NULL CHECK (quadrant IN ('tech', 'regulation', 'market', 'reputation')),
    niveau TEXT NOT NULL CHECK (niveau IN ('info', 'warning', 'critical')),
    score_impact INTEGER DEFAULT 50 CHECK (score_impact >= 0 AND score_impact <= 100),
    tendance TEXT CHECK (tendance IN ('up', 'down', 'stable')),
    source_type TEXT,
    source_id UUID,
    actif BOOLEAN DEFAULT true,
    date_detection TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.signaux ENABLE ROW LEVEL SECURITY;

-- 11. Alertes
CREATE TABLE public.alertes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('mention', 'actualite', 'personnalite', 'signal', 'systeme')),
    niveau TEXT NOT NULL CHECK (niveau IN ('info', 'warning', 'critical')),
    titre TEXT NOT NULL,
    message TEXT,
    reference_type TEXT,
    reference_id UUID,
    lue BOOLEAN DEFAULT false,
    traitee BOOLEAN DEFAULT false,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.alertes ENABLE ROW LEVEL SECURITY;

-- 12. Conversations IA
CREATE TABLE public.conversations_ia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    titre TEXT,
    messages JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.conversations_ia ENABLE ROW LEVEL SECURITY;

-- 13. Audit consultations (for council tracking)
CREATE TABLE public.audit_consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    action TEXT NOT NULL CHECK (action IN ('view', 'download', 'export', 'share')),
    metadata JSONB DEFAULT '{}',
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_consultations ENABLE ROW LEVEL SECURITY;

-- 14. Configuration seuils (admin only)
CREATE TABLE public.config_seuils (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cle TEXT UNIQUE NOT NULL,
    valeur JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.config_seuils ENABLE ROW LEVEL SECURITY;

-- ==================== RLS POLICIES ====================

-- User roles policies
CREATE POLICY "Users can view own role" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Sources media policies (read: all authenticated, write: admin only)
CREATE POLICY "Authenticated users can view sources" ON public.sources_media
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage sources" ON public.sources_media
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Actualités policies (read: all authenticated)
CREATE POLICY "Authenticated users can view actualites" ON public.actualites
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage actualites" ON public.actualites
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Mentions policies
CREATE POLICY "Authenticated users can view mentions" ON public.mentions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage mentions" ON public.mentions
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Personnalités policies
CREATE POLICY "Authenticated users can view personnalites" ON public.personnalites
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage personnalites" ON public.personnalites
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Signaux policies
CREATE POLICY "Authenticated users can view signaux" ON public.signaux
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage signaux" ON public.signaux
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Alertes policies
CREATE POLICY "Users can view own alertes" ON public.alertes
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own alertes" ON public.alertes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can create alertes" ON public.alertes
    FOR INSERT TO authenticated WITH CHECK (true);

-- Conversations IA policies
CREATE POLICY "Users can manage own conversations" ON public.conversations_ia
    FOR ALL USING (auth.uid() = user_id);

-- Audit consultations policies
CREATE POLICY "Users can view own audits" ON public.audit_consultations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create audits" ON public.audit_consultations
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins can view all audits" ON public.audit_consultations
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Config seuils policies
CREATE POLICY "Authenticated users can view config" ON public.config_seuils
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage config" ON public.config_seuils
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ==================== TRIGGERS ====================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'full_name');
  
  -- Default role: user
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'user');
  
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversations_ia_updated_at
  BEFORE UPDATE ON public.conversations_ia
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();