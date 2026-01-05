-- Add template column to newsletters table
ALTER TABLE public.newsletters 
ADD COLUMN template VARCHAR DEFAULT 'innovactu';

-- Add comment for documentation
COMMENT ON COLUMN public.newsletters.template IS 'Template type: innovactu or ansut_radar';