-- Pathway, skill buckets, games (run once on existing Supabase DB)

CREATE TABLE IF NOT EXISTS skill_buckets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS games (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug VARCHAR(128) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    short_description TEXT,
    full_description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS skill_bucket_games (
    skill_bucket_id UUID NOT NULL REFERENCES skill_buckets(id) ON DELETE CASCADE,
    game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    PRIMARY KEY (skill_bucket_id, game_id)
);

CREATE INDEX IF NOT EXISTS idx_skill_bucket_games_bucket ON skill_bucket_games(skill_bucket_id);

CREATE TABLE IF NOT EXISTS student_pathways (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
    assessment_id UUID REFERENCES assessments(id) ON DELETE SET NULL,
    access_id VARCHAR(100),
    pathway JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_student_pathways_student UNIQUE (student_id)
);

CREATE INDEX IF NOT EXISTS idx_student_pathways_access ON student_pathways(access_id);

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS pathway JSONB DEFAULT '{}'::jsonb;
