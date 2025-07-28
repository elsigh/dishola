-- Migration: Add taste preferences functionality
-- Created: 2025-01-28

-- Table to store dictionary of dishes/ingredients for autocomplete
CREATE TABLE taste_dictionary (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('dish', 'ingredient')),
    image_url TEXT,
    image_source TEXT, -- 'google' or 'unsplash'
    search_count INTEGER DEFAULT 0, -- track popularity
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table to store user taste preferences with ordering
CREATE TABLE user_tastes (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    taste_dictionary_id BIGINT NOT NULL REFERENCES taste_dictionary(id) ON DELETE CASCADE,
    order_position INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, taste_dictionary_id),
    UNIQUE(user_id, order_position)
);

-- Indexes for performance
CREATE INDEX idx_taste_dictionary_name ON taste_dictionary(name);
CREATE INDEX idx_taste_dictionary_type ON taste_dictionary(type);
CREATE INDEX idx_user_tastes_user_id ON user_tastes(user_id);
CREATE INDEX idx_user_tastes_order ON user_tastes(user_id, order_position);

-- Row Level Security policies
ALTER TABLE taste_dictionary ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tastes ENABLE ROW LEVEL SECURITY;

-- Anyone can read the taste dictionary for autocomplete
CREATE POLICY "taste_dictionary_read" ON taste_dictionary FOR SELECT USING (true);

-- Only authenticated users can read their own tastes
CREATE POLICY "user_tastes_read" ON user_tastes FOR SELECT USING (auth.uid() = user_id);

-- Only authenticated users can insert their own tastes
CREATE POLICY "user_tastes_insert" ON user_tastes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Only authenticated users can update their own tastes
CREATE POLICY "user_tastes_update" ON user_tastes FOR UPDATE USING (auth.uid() = user_id);

-- Only authenticated users can delete their own tastes
CREATE POLICY "user_tastes_delete" ON user_tastes FOR DELETE USING (auth.uid() = user_id);

-- Only admin users can modify taste dictionary (we'll handle this in app logic)
CREATE POLICY "taste_dictionary_admin_only" ON taste_dictionary FOR ALL USING (false);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_taste_dictionary_updated_at 
    BEFORE UPDATE ON taste_dictionary 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_tastes_updated_at 
    BEFORE UPDATE ON user_tastes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();