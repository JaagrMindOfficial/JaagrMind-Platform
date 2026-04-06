-- JaagrMind PostgreSQL Schema (Supabase)
-- Migrated from MongoDB/Mongoose

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ADMINS
-- ============================================================
CREATE TABLE IF NOT EXISTS admins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) DEFAULT 'Company Admin',
    role VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login TIMESTAMPTZ
);

-- ============================================================
-- ASSESSMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS assessments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    time_per_question INTEGER,
    total_time INTEGER,
    inactivity_alert_time INTEGER DEFAULT 40,
    inactivity_end_time INTEGER DEFAULT 120,
    questions JSONB DEFAULT '[]'::jsonb,
    buckets JSONB DEFAULT '[]'::jsonb,
    section_buckets BOOLEAN DEFAULT TRUE,
    custom_sections JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- ============================================================
-- SCHOOLS
-- ============================================================
CREATE TABLE IF NOT EXISTS schools (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(500) NOT NULL,
    email VARCHAR(255) UNIQUE,
    logo TEXT DEFAULT '',
    address JSONB DEFAULT '{}'::jsonb,
    type VARCHAR(10) DEFAULT 'super' CHECK (type IN ('super', 'sub')),
    parent_id UUID REFERENCES schools(id) ON DELETE SET NULL,
    contact JSONB DEFAULT '{}'::jsonb,
    password VARCHAR(255) NOT NULL,
    is_data_visible_to_school BOOLEAN DEFAULT FALSE,
    assigned_tests UUID[] DEFAULT '{}',
    plain_password VARCHAR(255) DEFAULT '',
    is_blocked BOOLEAN DEFAULT FALSE,
    must_change_password BOOLEAN DEFAULT TRUE,
    credentials_email_sent BOOLEAN DEFAULT FALSE,
    last_credentials_email_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_schools_parent_id ON schools(parent_id);
CREATE INDEX IF NOT EXISTS idx_schools_email ON schools(email);
CREATE INDEX IF NOT EXISTS idx_schools_is_active ON schools(is_active);

-- ============================================================
-- SCHOOL CREDENTIALS
-- ============================================================
CREATE TABLE IF NOT EXISTS school_credentials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID NOT NULL UNIQUE REFERENCES schools(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    school_name VARCHAR(500) NOT NULL,
    plain_password VARCHAR(255) NOT NULL,
    password_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- STUDENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS students (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    access_id VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    roll_no VARCHAR(50) DEFAULT '',
    class VARCHAR(50) NOT NULL,
    section VARCHAR(50) DEFAULT '',
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES schools(id) ON DELETE SET NULL,
    mobile_number VARCHAR(20),
    email VARCHAR(255),
    test_status JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_students_school_class_section ON students(school_id, class, section);
CREATE INDEX IF NOT EXISTS idx_students_access_id ON students(access_id);
CREATE INDEX IF NOT EXISTS idx_students_parent_id ON students(parent_id);
CREATE INDEX IF NOT EXISTS idx_students_is_active ON students(is_active);

-- ============================================================
-- SUBMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'incomplete', 'complete')),
    last_question_index INTEGER DEFAULT 0,
    total_score INTEGER DEFAULT 0,
    section_scores JSONB DEFAULT '{"A": 0, "B": 0, "C": 0, "D": 0}'::jsonb,
    section_buckets JSONB DEFAULT '{"A": "", "B": "", "C": "", "D": ""}'::jsonb,
    primary_skill_area VARCHAR(255) DEFAULT '',
    secondary_skill_area VARCHAR(255) DEFAULT '',
    assigned_bucket VARCHAR(255) DEFAULT '',
    answers JSONB DEFAULT '[]'::jsonb,
    time_taken INTEGER DEFAULT 0,
    total_inactivity_time INTEGER DEFAULT 0,
    mobile_number VARCHAR(20),
    email VARCHAR(255),
    consent_given BOOLEAN DEFAULT FALSE,
    mood_check JSONB,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submissions_school_submitted ON submissions(school_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_assessment ON submissions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_submissions_bucket ON submissions(assigned_bucket);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);

-- ============================================================
-- TICKETS
-- ============================================================
CREATE TABLE IF NOT EXISTS tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    subject VARCHAR(500) NOT NULL,
    category VARCHAR(20) DEFAULT 'general' CHECK (category IN ('general', 'technical', 'billing', 'feature')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'resolved')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    responses JSONB DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_tickets_school ON tickets(school_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

-- ============================================================
-- ARCHIVED DATA
-- ============================================================
CREATE TABLE IF NOT EXISTS archived_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR(20) NOT NULL CHECK (type IN ('student', 'school')),
    archived_at TIMESTAMPTZ DEFAULT NOW(),
    archived_by VARCHAR(50) NOT NULL,
    reason VARCHAR(255) DEFAULT 'manual_deletion',
    student_data JSONB,
    student_submissions JSONB DEFAULT '[]'::jsonb,
    school_data JSONB,
    school_students JSONB DEFAULT '[]'::jsonb,
    school_submissions JSONB DEFAULT '[]'::jsonb,
    stats JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_archived_type_date ON archived_data(type, archived_at DESC);
