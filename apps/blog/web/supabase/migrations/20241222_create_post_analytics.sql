-- Blog analytics table for tracking post views
CREATE TABLE post_analytics (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  views INTEGER DEFAULT 0,
  last_viewed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on slug for faster lookups
CREATE INDEX idx_post_analytics_slug ON post_analytics(slug);

-- Create an index on views for popular posts queries
CREATE INDEX idx_post_analytics_views ON post_analytics(views DESC);

-- Row Level Security (RLS) policies
ALTER TABLE post_analytics ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to read view counts (for displaying on blog)
CREATE POLICY "Allow anonymous read access to view counts"
  ON post_analytics
  FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous users to update view counts (for incrementing views)
CREATE POLICY "Allow anonymous update of view counts"
  ON post_analytics
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow anonymous users to insert new post analytics (for first-time posts)
CREATE POLICY "Allow anonymous insert of new post analytics"
  ON post_analytics
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Optional: Create a function to safely increment view count
CREATE OR REPLACE FUNCTION increment_post_views(post_slug TEXT)
RETURNS INTEGER AS $$
DECLARE
  current_views INTEGER;
BEGIN
  -- Try to update existing record
  UPDATE post_analytics 
  SET views = views + 1, last_viewed = NOW()
  WHERE slug = post_slug
  RETURNING views INTO current_views;
  
  -- If no record exists, create one
  IF NOT FOUND THEN
    INSERT INTO post_analytics (slug, views, last_viewed)
    VALUES (post_slug, 1, NOW())
    RETURNING views INTO current_views;
  END IF;
  
  RETURN current_views;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;