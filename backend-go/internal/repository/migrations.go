package repository

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

// AutoMigrate ensures all required relational tables and columns exist
func AutoMigrate(ctx context.Context, db *pgxpool.Pool) error {
	migrationSQL := `
		-- Ensure nickname column exists on students
		ALTER TABLE students ADD COLUMN IF NOT EXISTS nickname TEXT;

		-- Ensure is_internal exists on users
		ALTER TABLE users ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT false;

		-- Ensure scheduled_promotions has required columns
		ALTER TABLE scheduled_promotions ADD COLUMN IF NOT EXISTS academic_year TEXT DEFAULT '2025-2026';
		ALTER TABLE scheduled_promotions ADD COLUMN IF NOT EXISTS is_annual_rollover BOOLEAN DEFAULT false;

		-- 1. School Counselors table
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

		-- 2. Audit Trail Events table
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

		-- 3. Parent-Student Relationship table
		CREATE TABLE IF NOT EXISTS parent_students (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
			relationship TEXT DEFAULT 'parent',
			nickname TEXT,
			created_at TIMESTAMPTZ DEFAULT NOW(),
			UNIQUE(parent_id, student_id)
		);

		-- 4. Parent-Counselor Inquiries table
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

		-- 5. Inquiry Messages thread table
		CREATE TABLE IF NOT EXISTS inquiry_messages (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			inquiry_id UUID NOT NULL REFERENCES parent_counselor_inquiries(id) ON DELETE CASCADE,
			sender_id UUID,
			sender_name TEXT NOT NULL,
			sender_role TEXT NOT NULL,
			message TEXT NOT NULL,
			created_at TIMESTAMPTZ DEFAULT NOW()
		);

		-- 6. OTP Verifications table
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

		-- 7. Mobile Gamification & Profile fields on Students
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

		-- 8. 16-Track Pathway fields on Student Results
		ALTER TABLE student_results ADD COLUMN IF NOT EXISTS pathway_track_id TEXT;
		ALTER TABLE student_results ADD COLUMN IF NOT EXISTS pathway_track_name TEXT;
		ALTER TABLE student_results ADD COLUMN IF NOT EXISTS primary_bucket TEXT;
		ALTER TABLE student_results ADD COLUMN IF NOT EXISTS secondary_bucket TEXT;
		ALTER TABLE student_results ADD COLUMN IF NOT EXISTS is_balance_mode BOOLEAN DEFAULT false;

		-- 9. Activity Catalog
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

		-- 10. Daily Pathway
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

		-- 11. Activity Sessions
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

		-- 12. Raw Interactions
		CREATE TABLE IF NOT EXISTS raw_interactions (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			session_id UUID NOT NULL REFERENCES activity_sessions(id) ON DELETE CASCADE,
			event_type TEXT NOT NULL,
			timestamp_ms BIGINT NOT NULL,
			payload JSONB DEFAULT '{}',
			sequence_index INTEGER DEFAULT 0
		);

		-- 13. Derived Metrics
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

		-- 14. Trait Snapshots (EMA)
		CREATE TABLE IF NOT EXISTS trait_snapshots (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
			trait_name TEXT NOT NULL,
			value NUMERIC NOT NULL,
			trend TEXT NOT NULL DEFAULT 'stable',
			computed_at TIMESTAMPTZ DEFAULT NOW()
		);

		-- 15. Mood Entries
		CREATE TABLE IF NOT EXISTS mood_entries (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
			mood_value INTEGER NOT NULL,
			energy_level TEXT DEFAULT 'medium',
			context_tag TEXT,
			entry_type TEXT DEFAULT 'daily',
			recorded_at TIMESTAMPTZ DEFAULT NOW()
		);

		-- 16. Journal Entries
		CREATE TABLE IF NOT EXISTS journal_entries (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
			title TEXT,
			content TEXT NOT NULL,
			mood_value INTEGER,
			tags TEXT[] DEFAULT '{}',
			created_at TIMESTAMPTZ DEFAULT NOW()
		);

		-- Seed Activity Catalog (24 activities across 4 buckets)
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

	log.Println("Database AutoMigrate verified successfully")
	return nil
}
