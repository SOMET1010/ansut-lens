ALTER TABLE public.radar_proximite REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.radar_proximite;