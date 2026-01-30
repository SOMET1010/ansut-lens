-- Add columns for entity extraction and clustering in actualites table
ALTER TABLE actualites 
ADD COLUMN IF NOT EXISTS entites_personnes TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS entites_entreprises TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS cluster_id UUID,
ADD COLUMN IF NOT EXISTS score_pertinence INTEGER DEFAULT 50;

-- Create index for faster clustering queries
CREATE INDEX IF NOT EXISTS idx_actualites_cluster_id ON actualites(cluster_id);
CREATE INDEX IF NOT EXISTS idx_actualites_score_pertinence ON actualites(score_pertinence DESC);