package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

// AutoMigrate ensures all required relational tables and columns exist
func AutoMigrate(ctx context.Context, db *pgxpool.Pool) error {
	migrationSQL := `
		-- ── 1. Core Users Table ────────────────────────────────────────────────
		CREATE TABLE IF NOT EXISTS users (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			email TEXT UNIQUE NOT NULL,
			name TEXT NOT NULL,
			password_hash TEXT NOT NULL,
			phone TEXT,
			google_id TEXT,
			username TEXT,
			auth_provider TEXT DEFAULT 'local',
			avatar_url TEXT,
			metadata JSONB DEFAULT '{}',
			is_internal BOOLEAN DEFAULT false,
			created_at TIMESTAMPTZ DEFAULT NOW()
		);

		-- ── 2. Schools Table ───────────────────────────────────────────────────
		CREATE TABLE IF NOT EXISTS schools (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			school_code TEXT UNIQUE NOT NULL,
			name TEXT NOT NULL,
			city TEXT NOT NULL,
			contact TEXT,
			phone_number TEXT,
			logo TEXT,
			parent_school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
			is_active BOOLEAN DEFAULT true,
			is_blocked BOOLEAN DEFAULT false,
			created_at TIMESTAMPTZ DEFAULT NOW()
		);

		-- ── 3. Students Table ──────────────────────────────────────────────────
		CREATE TABLE IF NOT EXISTS students (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
			access_id TEXT NOT NULL,
			name TEXT NOT NULL,
			nickname TEXT,
			grade TEXT NOT NULL,
			section TEXT NOT NULL,
			mobile_number TEXT,
			email TEXT,
			academic_year TEXT DEFAULT '2025-2026',
			is_active BOOLEAN DEFAULT true,
			avatar_url TEXT,
			level INTEGER DEFAULT 1,
			current_xp INTEGER DEFAULT 0,
			next_level_xp INTEGER DEFAULT 1000,
			streak_days INTEGER DEFAULT 0,
			longest_streak INTEGER DEFAULT 0,
			last_active_date DATE,
			garden_level INTEGER DEFAULT 1,
			tree_stage TEXT DEFAULT 'sprout',
			waterings_today INTEGER DEFAULT 0,
			last_watered_at TIMESTAMPTZ,
			created_at TIMESTAMPTZ DEFAULT NOW(),
			UNIQUE(school_id, access_id)
		);

		-- ── 4. User Roles Table ────────────────────────────────────────────────
		CREATE TABLE IF NOT EXISTS user_roles (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id UUID REFERENCES users(id) ON DELETE CASCADE,
			role TEXT NOT NULL,
			entity_id UUID,
			created_at TIMESTAMPTZ DEFAULT NOW()
		);

		-- ── 5. School Invites Table ────────────────────────────────────────────
		CREATE TABLE IF NOT EXISTS school_invites (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			school_name TEXT NOT NULL,
			email TEXT NOT NULL,
			token TEXT UNIQUE NOT NULL,
			expires_at TIMESTAMPTZ NOT NULL,
			accepted_at TIMESTAMPTZ,
			created_at TIMESTAMPTZ DEFAULT NOW()
		);

		-- ── 6. Assessments Table ───────────────────────────────────────────────
		CREATE TABLE IF NOT EXISTS assessments (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			title TEXT NOT NULL,
			description TEXT,
			is_default BOOLEAN DEFAULT false,
			time_per_question INT DEFAULT 30,
			total_time INT DEFAULT 15,
			inactivity_alert_time INT DEFAULT 40,
			inactivity_end_time INT DEFAULT 120,
			questions JSONB DEFAULT '[]',
			buckets JSONB DEFAULT '[]',
			section_buckets BOOLEAN DEFAULT true,
			custom_sections JSONB DEFAULT '[]',
			sections JSONB NOT NULL DEFAULT '[]',
			is_active BOOLEAN DEFAULT true,
			tier TEXT DEFAULT 'all',
			min_grade INT DEFAULT 1,
			max_grade INT DEFAULT 12,
			target_grades TEXT[] DEFAULT ARRAY['6','7','8','9','10','11','12'],
			created_at TIMESTAMPTZ DEFAULT NOW()
		);

		-- ── 7. Student Results Table ───────────────────────────────────────────
		CREATE TABLE IF NOT EXISTS student_results (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			student_id UUID REFERENCES students(id) ON DELETE CASCADE,
			school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
			assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE,
			status TEXT DEFAULT 'complete',
			total_score INT DEFAULT 0,
			section_scores JSONB DEFAULT '{}',
			section_buckets JSONB DEFAULT '{}',
			primary_skill_area TEXT,
			secondary_skill_area TEXT,
			assigned_bucket TEXT,
			answers JSONB NOT NULL DEFAULT '{}',
			mood JSONB DEFAULT '{}',
			time_taken INT DEFAULT 0,
			behavioral_diagnostics JSONB DEFAULT '{}',
			origin TEXT DEFAULT 'school',
			pathway_track_id TEXT,
			pathway_track_name TEXT,
			primary_bucket TEXT,
			secondary_bucket TEXT,
			is_balance_mode BOOLEAN DEFAULT false,
			completed_at TIMESTAMPTZ DEFAULT NOW()
		);

		-- ── 8. Tickets Table ───────────────────────────────────────────────────
		CREATE TABLE IF NOT EXISTS tickets (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
			reported_by UUID REFERENCES users(id) ON DELETE CASCADE,
			subject TEXT NOT NULL,
			description TEXT NOT NULL,
			priority TEXT DEFAULT 'medium',
			category TEXT DEFAULT 'General',
			status TEXT DEFAULT 'open',
			admin_reply TEXT,
			created_at TIMESTAMPTZ DEFAULT NOW(),
			updated_at TIMESTAMPTZ DEFAULT NOW()
		);

		-- ── 9. Scheduled Promotions Table ──────────────────────────────────────
		CREATE TABLE IF NOT EXISTS scheduled_promotions (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
			scheduled_at TIMESTAMPTZ NOT NULL,
			status TEXT DEFAULT 'pending',
			academic_year TEXT DEFAULT '2025-2026',
			is_annual_rollover BOOLEAN DEFAULT false,
			created_at TIMESTAMPTZ DEFAULT NOW()
		);

		-- ── 10. Counselor Notes Table ──────────────────────────────────────────
		CREATE TABLE IF NOT EXISTS counselor_notes (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			student_id UUID REFERENCES students(id) ON DELETE CASCADE,
			counselor_id UUID REFERENCES users(id) ON DELETE CASCADE,
			counselor_name TEXT NOT NULL,
			note TEXT NOT NULL,
			created_at TIMESTAMPTZ DEFAULT NOW(),
			updated_at TIMESTAMPTZ DEFAULT NOW()
		);

		-- ── 11. Institution Applications Table ─────────────────────────────────
		CREATE TABLE IF NOT EXISTS institution_applications (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			institute_name TEXT NOT NULL,
			institute_type TEXT NOT NULL,
			city TEXT NOT NULL,
			state TEXT DEFAULT '',
			contact_name TEXT NOT NULL,
			designation TEXT DEFAULT '',
			email TEXT NOT NULL,
			phone TEXT NOT NULL,
			estimated_students INTEGER DEFAULT 0,
			student_count TEXT,
			message TEXT DEFAULT '',
			remarks TEXT,
			status TEXT DEFAULT 'pending',
			created_at TIMESTAMPTZ DEFAULT NOW(),
			updated_at TIMESTAMPTZ DEFAULT NOW()
		);

		-- ── 12. Platform Guides Table ──────────────────────────────────────────
		CREATE TABLE IF NOT EXISTS platform_guides (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			title TEXT NOT NULL,
			category TEXT NOT NULL,
			content TEXT NOT NULL,
			role_visibility TEXT[] DEFAULT ARRAY['all'],
			created_at TIMESTAMPTZ DEFAULT NOW(),
			updated_at TIMESTAMPTZ DEFAULT NOW()
		);

		-- ── 13. Password Resets Table ──────────────────────────────────────────
		CREATE TABLE IF NOT EXISTS password_resets (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			email TEXT NOT NULL,
			token TEXT UNIQUE NOT NULL,
			expires_at TIMESTAMPTZ NOT NULL,
			used BOOLEAN DEFAULT false,
			created_at TIMESTAMPTZ DEFAULT NOW()
		);

		-- ── 14. School Counselors Table ────────────────────────────────────────
		CREATE TABLE IF NOT EXISTS school_counselors (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
			branch_id UUID REFERENCES schools(id) ON DELETE SET NULL,
			name TEXT NOT NULL,
			email TEXT NOT NULL,
			phone TEXT,
			role TEXT NOT NULL DEFAULT 'School Wellness Counselor',
			branch_name TEXT,
			available_hours TEXT DEFAULT 'Mon-Fri, 9:00 AM - 3:30 PM',
			is_active BOOLEAN DEFAULT true,
			created_at TIMESTAMPTZ DEFAULT NOW(),
			updated_at TIMESTAMPTZ DEFAULT NOW()
		);

		-- ── 15. Audit Events Table ─────────────────────────────────────────────
		CREATE TABLE IF NOT EXISTS events (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
			actor_id UUID,
			actor_name TEXT,
			actor_role TEXT,
			event_type TEXT,
			action TEXT,
			title TEXT,
			description TEXT,
			metadata JSONB DEFAULT '{}',
			created_at TIMESTAMPTZ DEFAULT NOW()
		);

		-- ── 16. Parent-Student Relationship Table ──────────────────────────────
		CREATE TABLE IF NOT EXISTS parent_students (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
			relationship TEXT DEFAULT 'parent',
			nickname TEXT,
			created_at TIMESTAMPTZ DEFAULT NOW(),
			UNIQUE(parent_id, student_id)
		);

		-- ── 17. Parent-Counselor Inquiries Table ────────────────────────────────
		CREATE TABLE IF NOT EXISTS parent_counselor_inquiries (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			parent_id UUID REFERENCES users(id) ON DELETE CASCADE,
			student_id UUID REFERENCES students(id) ON DELETE CASCADE,
			student_name TEXT,
			school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
			counselor_id UUID REFERENCES school_counselors(id) ON DELETE SET NULL,
			counselor_type TEXT DEFAULT 'school',
			target_recipient TEXT DEFAULT 'school_counselor',
			parent_name TEXT,
			parent_email TEXT,
			subject TEXT,
			message TEXT,
			status TEXT DEFAULT 'open',
			resolution_notes TEXT,
			meeting_date TEXT,
			meeting_time TEXT,
			meeting_link TEXT,
			created_at TIMESTAMPTZ DEFAULT NOW(),
			updated_at TIMESTAMPTZ DEFAULT NOW()
		);

		-- ── 18. Inquiry Messages Thread Table ──────────────────────────────────
		CREATE TABLE IF NOT EXISTS inquiry_messages (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			inquiry_id UUID NOT NULL REFERENCES parent_counselor_inquiries(id) ON DELETE CASCADE,
			sender_id UUID,
			sender_name TEXT NOT NULL,
			sender_role TEXT NOT NULL,
			message TEXT NOT NULL,
			created_at TIMESTAMPTZ DEFAULT NOW()
		);

		-- ── 19. OTP Verifications Table ────────────────────────────────────────
		CREATE TABLE IF NOT EXISTS otp_verifications (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			email TEXT NOT NULL,
			phone TEXT,
			otp_code TEXT NOT NULL,
			token TEXT NOT NULL,
			expires_at TIMESTAMPTZ NOT NULL,
			verified BOOLEAN DEFAULT false,
			used BOOLEAN DEFAULT false,
			created_at TIMESTAMPTZ DEFAULT NOW()
		);

		-- ── 20. Activity Catalog Table ─────────────────────────────────────────
		CREATE TABLE IF NOT EXISTS activity_catalog (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			name TEXT NOT NULL UNIQUE,
			title TEXT NOT NULL,
			bucket TEXT NOT NULL,
			instruction TEXT NOT NULL,
			description TEXT,
			duration_minutes INTEGER DEFAULT 2,
			themes JSONB DEFAULT '[]',
			is_active BOOLEAN DEFAULT true
		);

		-- ── 21. Daily Pathway Table ────────────────────────────────────────────
		CREATE TABLE IF NOT EXISTS daily_pathway (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
			date DATE NOT NULL,
			track_id TEXT NOT NULL,
			track_name TEXT NOT NULL,
			student_heading TEXT NOT NULL,
			student_subtext TEXT NOT NULL,
			is_balance_mode BOOLEAN DEFAULT false,
			priority_bucket TEXT,
			secondary_bucket TEXT,
			assigned_activities JSONB NOT NULL DEFAULT '[]',
			completed_count INTEGER DEFAULT 0,
			created_at TIMESTAMPTZ DEFAULT NOW(),
			UNIQUE(student_id, date)
		);

		-- ── 22. Activity Sessions Table ────────────────────────────────────────
		CREATE TABLE IF NOT EXISTS activity_sessions (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
			activity_type TEXT NOT NULL,
			activity_bucket TEXT,
			theme_used TEXT,
			started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			ended_at TIMESTAMPTZ,
			duration_ms INTEGER DEFAULT 0,
			completed BOOLEAN DEFAULT false,
			xp_earned INTEGER DEFAULT 0,
			mood_entry_id UUID,
			created_at TIMESTAMPTZ DEFAULT NOW()
		);

		-- ── 23. Raw Interactions Table ─────────────────────────────────────────
		CREATE TABLE IF NOT EXISTS raw_interactions (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			session_id UUID NOT NULL REFERENCES activity_sessions(id) ON DELETE CASCADE,
			event_type TEXT NOT NULL,
			timestamp_ms BIGINT NOT NULL,
			payload JSONB DEFAULT '{}',
			sequence_index INTEGER DEFAULT 0
		);

		-- ── 24. Derived Metrics Table ──────────────────────────────────────────
		CREATE TABLE IF NOT EXISTS derived_metrics (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			session_id UUID NOT NULL REFERENCES activity_sessions(id) ON DELETE CASCADE,
			student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
			focus_score NUMERIC DEFAULT 0,
			stress_score NUMERIC DEFAULT 0,
			consistency_score NUMERIC DEFAULT 0,
			confidence_score NUMERIC DEFAULT 0,
			engagement_score NUMERIC DEFAULT 0,
			regulation_score NUMERIC DEFAULT 0,
			computed_at TIMESTAMPTZ DEFAULT NOW()
		);

		-- ── 25. Trait Snapshots Table ──────────────────────────────────────────
		CREATE TABLE IF NOT EXISTS trait_snapshots (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
			trait_name TEXT NOT NULL,
			value NUMERIC NOT NULL,
			trend TEXT NOT NULL DEFAULT 'stable',
			computed_at TIMESTAMPTZ DEFAULT NOW()
		);

		-- ── 26. Mood Entries Table ─────────────────────────────────────────────
		CREATE TABLE IF NOT EXISTS mood_entries (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
			mood_value INTEGER NOT NULL,
			energy_level TEXT DEFAULT 'medium',
			context_tag TEXT,
			entry_type TEXT DEFAULT 'daily',
			recorded_at TIMESTAMPTZ DEFAULT NOW()
		);

		-- ── 27. Journal Entries Table ──────────────────────────────────────────
		CREATE TABLE IF NOT EXISTS journal_entries (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
			title TEXT,
			content TEXT NOT NULL,
			mood_value INTEGER,
			tags TEXT[] DEFAULT '{}',
			created_at TIMESTAMPTZ DEFAULT NOW()
		);

		-- ── Incremental Column Migrations ──────────────────────────────────────
		ALTER TABLE students ADD COLUMN IF NOT EXISTS nickname TEXT;
		ALTER TABLE students ADD COLUMN IF NOT EXISTS avatar_url TEXT;
		ALTER TABLE students ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
		ALTER TABLE students ADD COLUMN IF NOT EXISTS current_xp INTEGER DEFAULT 0;
		ALTER TABLE students ADD COLUMN IF NOT EXISTS next_level_xp INTEGER DEFAULT 1000;
		ALTER TABLE students ADD COLUMN IF NOT EXISTS streak_days INTEGER DEFAULT 0;
		ALTER TABLE students ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;
		ALTER TABLE students ADD COLUMN IF NOT EXISTS last_active_date DATE;
		ALTER TABLE students ADD COLUMN IF NOT EXISTS garden_level INTEGER DEFAULT 1;
		ALTER TABLE students ADD COLUMN IF NOT EXISTS tree_stage TEXT DEFAULT 'sprout';
		ALTER TABLE students ADD COLUMN IF NOT EXISTS waterings_today INTEGER DEFAULT 0;
		ALTER TABLE students ADD COLUMN IF NOT EXISTS last_watered_at TIMESTAMPTZ;

		ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT;
		ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;
		ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'local';
		ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
		ALTER TABLE users ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT false;

		ALTER TABLE scheduled_promotions ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '2025-2026';
		ALTER TABLE scheduled_promotions ADD COLUMN IF NOT EXISTS is_annual_rollover BOOLEAN DEFAULT false;

		ALTER TABLE student_results ADD COLUMN IF NOT EXISTS pathway_track_id TEXT;
		ALTER TABLE student_results ADD COLUMN IF NOT EXISTS pathway_track_name TEXT;
		ALTER TABLE student_results ADD COLUMN IF NOT EXISTS primary_bucket TEXT;
		ALTER TABLE student_results ADD COLUMN IF NOT EXISTS secondary_bucket TEXT;
		ALTER TABLE student_results ADD COLUMN IF NOT EXISTS is_balance_mode BOOLEAN DEFAULT false;

		ALTER TABLE institution_applications ADD COLUMN IF NOT EXISTS state TEXT DEFAULT '';
		ALTER TABLE institution_applications ADD COLUMN IF NOT EXISTS designation TEXT DEFAULT '';
		ALTER TABLE institution_applications ADD COLUMN IF NOT EXISTS estimated_students INTEGER DEFAULT 0;
		ALTER TABLE institution_applications ADD COLUMN IF NOT EXISTS message TEXT DEFAULT '';

		-- Platform Guides schema parity (deployed DBs may have old schema)
		ALTER TABLE platform_guides ADD COLUMN IF NOT EXISTS slug TEXT;
		ALTER TABLE platform_guides ADD COLUMN IF NOT EXISTS target_audience TEXT NOT NULL DEFAULT 'all';
		ALTER TABLE platform_guides ADD COLUMN IF NOT EXISTS order_index INTEGER NOT NULL DEFAULT 0;
		-- Backfill slug from id for any rows created before the slug column existed
		UPDATE platform_guides SET slug = id::text WHERE slug IS NULL OR slug = '';
		-- Add unique constraint on slug if not present
		DO $$
		BEGIN
			IF NOT EXISTS (
				SELECT 1 FROM pg_constraint WHERE conname = 'platform_guides_slug_key'
			) THEN
				ALTER TABLE platform_guides ADD CONSTRAINT platform_guides_slug_key UNIQUE (slug);
			END IF;
		END $$;

		-- Sync historical columns if present from earlier migrations
		DO $$ 
		BEGIN
			IF EXISTS (
				SELECT 1 FROM information_schema.columns 
				WHERE table_name = 'institution_applications' AND column_name = 'student_count'
			) THEN
				UPDATE institution_applications 
				SET estimated_students = COALESCE(NULLIF(regexp_replace(student_count, '\D', '', 'g'), '')::integer, 0)
				WHERE estimated_students IS NULL OR estimated_students = 0;
			END IF;
			IF EXISTS (
				SELECT 1 FROM information_schema.columns 
				WHERE table_name = 'institution_applications' AND column_name = 'remarks'
			) THEN
				UPDATE institution_applications 
				SET message = remarks
				WHERE (message IS NULL OR message = '') AND remarks IS NOT NULL;
			END IF;
		END $$;

		-- ── Seed Activity Catalog (24 activities across 4 buckets) ─────────────
		INSERT INTO activity_catalog (name, title, bucket, instruction, description, duration_minutes)
		VALUES
			-- ATTN_STABILITY (Focus & Attention)
			('trace_arc', 'Trace Arc', 'ATTN_STABILITY', 'Trace the gentle curve with your finger at a steady, calm pace.', 'Visual focus and continuous line motor alignment.', 2),
			('stack_stone', 'Stack Stone', 'ATTN_STABILITY', 'Carefully balance each virtual stone upon the previous one.', 'Balance, micro-patience, and steady placement.', 2),
			('guide_dot', 'Guide Dot', 'ATTN_STABILITY', 'Keep your finger smoothly within the moving circle.', 'Smooth motor tracking and sustained focus flow.', 2),
			('align_drift', 'Align Drift', 'ATTN_STABILITY', 'Gently steer the drifting light back into alignment.', 'Fine motor control against cognitive drift.', 2),
			('balance_shift', 'Balance Shift', 'ATTN_STABILITY', 'Tilt slightly to balance the floating orb in the center.', 'Vestibular and postural sensory awareness.', 2),
			('white_noise', 'Sound Sanctuary', 'ATTN_STABILITY', 'Listen to ambient calming soundscapes to clear mental noise.', 'Auditory isolation for deep cognitive focus.', 3),

			-- LOAD_REGULATION (Overload & Stress Reset)
			('scatter_settle', 'Scatter & Settle', 'LOAD_REGULATION', 'Watch the particles drift outward and slowly settle.', 'Visual decluttering and cognitive load release.', 2),
			('press_wave', 'Press Wave', 'LOAD_REGULATION', 'Press firmly on the wave, then slowly release your grip.', 'Somatic muscle contraction and rhythmic tension release.', 2),
			('pour_light', 'Pour Light', 'LOAD_REGULATION', 'Tilt to gently pour the warm light from vessel to vessel.', 'Slow-pacing visual relaxation.', 2),
			('tap_ripples', 'Tap Ripples', 'LOAD_REGULATION', 'Tap gently and watch the calming water ripples expand.', 'Rhythmic sensory grounding.', 2),
			('shift_load', 'Shift Load', 'LOAD_REGULATION', 'Transfer heavy weights into resting trays one by one.', 'Intentional cognitive offloading.', 2),
			('box_breathing', 'Box Breathing', 'LOAD_REGULATION', 'Breathe in for 4, hold for 4, breathe out for 4, hold for 4.', 'Autonomic nervous system down-regulation.', 2),

			-- SELF_SAFETY (Inner Grounding & Safety)
			('place_field', 'Place in Field', 'LOAD_REGULATION', 'Arrange the peaceful elements in your personal sanctuary.', 'Spatial safety and containment boundary.', 2),
			('color_switch', 'Color Switch', 'SELF_SAFETY', 'Gently match the calming pastel colors as they shift.', 'Gentle attention anchoring in safe state.', 2),
			('build_stack', 'Build Stack', 'SELF_SAFETY', 'Stack stable geometric blocks to create a grounded tower.', 'Constructive stability and internal confidence.', 2),
			('grow_tap', 'Grow Tap', 'SELF_SAFETY', 'Tap gently to nurture a small plant as it uncurls leaves.', 'Slow nurturing sensory pacing.', 2),
			('draw_fade', 'Draw & Fade', 'SELF_SAFETY', 'Draw any thoughts on screen and watch them gently dissolve away.', 'Safe expression and emotional letting go.', 2),
			('mindful_stretching', 'Mindful Stretching', 'SELF_SAFETY', 'Follow along with slow, seated gentle stretches.', 'Gentle somatic body grounding and reassurance.', 3),

			-- SOCIAL_COMFORT (Peer Connection & Social Ease)
			('move_pair', 'Move in Pair', 'SOCIAL_COMFORT', 'Guide your marker alongside a companion marker in harmony.', 'Synchronous relational coordination.', 2),
			('match_pulse', 'Match Pulse', 'SOCIAL_COMFORT', 'Tap in rhythm with the gentle ambient heartbeat.', 'Co-regulation and heartbeat rhythm matching.', 2),
			('side_walk', 'Side by Side', 'SOCIAL_COMFORT', 'Walk your avatar peacefully beside another down the trail.', 'Parallel social presence without social friction.', 2),
			('take_turns', 'Take Turns', 'SOCIAL_COMFORT', 'Alternate placing elements in a calm shared pattern.', 'Reciprocal rhythm and relational pacing.', 2),
			('hold_same', 'Hold Same', 'SOCIAL_COMFORT', 'Press and hold together on the screen in quiet stillness.', 'Shared anchor and quiet coexistence.', 2),
			('sleep_story', 'Calm Sleep Story', 'SOCIAL_COMFORT', 'Listen to a quiet, soothing bedtime ambient story.', 'Auditory relational soothing and evening wind-down.', 3)
		ON CONFLICT (name) DO NOTHING;
	`

	_, err := db.Exec(ctx, migrationSQL)
	if err != nil {
		return fmt.Errorf("AutoMigrate error: %w", err)
	}

	// Auto-seed default 32-question wellness assessment if no assessments exist
	seedDefaultAssessment(ctx, db)

	log.Println("Database AutoMigrate verified successfully")
	return nil
}

func seedDefaultAssessment(ctx context.Context, db *pgxpool.Pool) {
	var count int
	_ = db.QueryRow(ctx, "SELECT COUNT(*) FROM assessments").Scan(&count)
	if count > 0 {
		return
	}

	standardNegativeOptions := []map[string]any{
		{"label": "Not true for me", "marks": 1},
		{"label": "Sometimes true", "marks": 2},
		{"label": "Often true", "marks": 3},
		{"label": "Almost always true", "marks": 4},
	}
	standardPositiveOptions := []map[string]any{
		{"label": "Not true for me", "marks": 4},
		{"label": "Sometimes true", "marks": 3},
		{"label": "Often true", "marks": 2},
		{"label": "Almost always true", "marks": 1},
	}

	type qDef struct {
		Text        string           `json:"text"`
		Section     string           `json:"section"`
		SectionName string           `json:"sectionName"`
		IsPositive  bool             `json:"isPositive"`
		Options     []map[string]any `json:"options"`
	}

	questions := []qDef{
		{Text: "I feel mentally tired before I begin my work", Section: "A", SectionName: "Focus & Attention", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I delay starting tasks that feel big or difficult.", Section: "A", SectionName: "Focus & Attention", IsPositive: false, Options: standardNegativeOptions},
		{Text: "My mind keeps jumping between thoughts when I try to study.", Section: "A", SectionName: "Focus & Attention", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I feel pressure or stress when I need to concentrate.", Section: "A", SectionName: "Focus & Attention", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I feel overwhelmed when I have many things to do.", Section: "A", SectionName: "Focus & Attention", IsPositive: false, Options: standardNegativeOptions},
		{Text: "Even simple work feels exhausting sometimes.", Section: "A", SectionName: "Focus & Attention", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I can stay focused once I begin a task.", Section: "A", SectionName: "Focus & Attention", IsPositive: true, Options: standardPositiveOptions},
		{Text: "I feel calm and steady while working on something.", Section: "A", SectionName: "Focus & Attention", IsPositive: true, Options: standardPositiveOptions},

		{Text: "I am very hard on myself when I make mistakes.", Section: "B", SectionName: "Self-Esteem & Inner Confidence", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I compare myself to others and feel less capable.", Section: "B", SectionName: "Self-Esteem & Inner Confidence", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I doubt my abilities even when I try sincerely.", Section: "B", SectionName: "Self-Esteem & Inner Confidence", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I feel disappointed in myself easily.", Section: "B", SectionName: "Self-Esteem & Inner Confidence", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I replay my mistakes in my mind for a long time.", Section: "B", SectionName: "Self-Esteem & Inner Confidence", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I judge myself more harshly than others judge me.", Section: "B", SectionName: "Self-Esteem & Inner Confidence", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I feel okay about myself even when I don't do well.", Section: "B", SectionName: "Self-Esteem & Inner Confidence", IsPositive: true, Options: standardPositiveOptions},
		{Text: "I can encourage myself after making a mistake.", Section: "B", SectionName: "Self-Esteem & Inner Confidence", IsPositive: true, Options: standardPositiveOptions},

		{Text: "I hesitate to speak up even when I know the answer.", Section: "C", SectionName: "Social Confidence & Interaction", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I worry about what others think of me.", Section: "C", SectionName: "Social Confidence & Interaction", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I feel awkward or uncomfortable in group situations.", Section: "C", SectionName: "Social Confidence & Interaction", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I avoid participating in class discussions.", Section: "C", SectionName: "Social Confidence & Interaction", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I stay quiet to avoid saying the wrong thing.", Section: "C", SectionName: "Social Confidence & Interaction", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I feel left out or invisible at school.", Section: "C", SectionName: "Social Confidence & Interaction", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I feel comfortable sharing my thoughts in groups.", Section: "C", SectionName: "Social Confidence & Interaction", IsPositive: true, Options: standardPositiveOptions},
		{Text: "I feel confident interacting with classmates.", Section: "C", SectionName: "Social Confidence & Interaction", IsPositive: true, Options: standardPositiveOptions},

		{Text: "I use my phone or screen when I feel bored or restless.", Section: "D", SectionName: "Digital Hygiene & Self-Control", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I lose track of time while scrolling or gaming.", Section: "D", SectionName: "Digital Hygiene & Self-Control", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I feel irritated when my screen time is limited.", Section: "D", SectionName: "Digital Hygiene & Self-Control", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I check my phone even when I know I should not.", Section: "D", SectionName: "Digital Hygiene & Self-Control", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I use screens to avoid uncomfortable feelings or tasks.", Section: "D", SectionName: "Digital Hygiene & Self-Control", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I find it hard to stop using screens once I start.", Section: "D", SectionName: "Digital Hygiene & Self-Control", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I can put my phone away when I decide to.", Section: "D", SectionName: "Digital Hygiene & Self-Control", IsPositive: true, Options: standardPositiveOptions},
		{Text: "I feel comfortable being offline for some time.", Section: "D", SectionName: "Digital Hygiene & Self-Control", IsPositive: true, Options: standardPositiveOptions},
	}

	buckets := []map[string]any{
		{"label": "Skill Stable", "minScore": 8, "maxScore": 14, "color": "#4CAF50"},
		{"label": "Skill Emerging", "minScore": 15, "maxScore": 22, "color": "#FF9800"},
		{"label": "Skill Support Needed", "minScore": 23, "maxScore": 32, "color": "#F44336"},
	}

	customSections := []map[string]any{
		{"key": "A", "name": "Focus & Attention"},
		{"key": "B", "name": "Self-Esteem & Inner Confidence"},
		{"key": "C", "name": "Social Confidence & Interaction"},
		{"key": "D", "name": "Digital Hygiene & Self-Control"},
	}

	type SectionObj struct {
		Title     string `json:"title"`
		Questions []qDef `json:"questions"`
	}
	var sections []SectionObj
	sectionMap := make(map[string][]qDef)
	for _, q := range questions {
		sectionMap[q.SectionName] = append(sectionMap[q.SectionName], q)
	}
	for _, s := range customSections {
		name := s["name"].(string)
		sections = append(sections, SectionObj{
			Title:     name,
			Questions: sectionMap[name],
		})
	}

	qJSON, _ := json.Marshal(questions)
	bJSON, _ := json.Marshal(buckets)
	csJSON, _ := json.Marshal(customSections)
	sJSON, _ := json.Marshal(sections)

	_, err := db.Exec(ctx, `
		INSERT INTO assessments (title, description, is_default, time_per_question, total_time, inactivity_alert_time, inactivity_end_time, questions, buckets, section_buckets, custom_sections, sections, is_active)
		VALUES ($1, $2, true, 30, 15, 40, 120, $3, $4, true, $5, $6, true)
	`, "Student Wellness Assessment", "A comprehensive 32-question assessment to understand student mental wellness, emotional resilience, focus, and digital habits.", qJSON, bJSON, csJSON, sJSON)
	if err != nil {
		log.Printf("[Seeder] Failed to auto-seed default assessment: %v\n", err)
	} else {
		log.Println("[Seeder] Default 32-question wellness assessment auto-seeded successfully")
	}
}
