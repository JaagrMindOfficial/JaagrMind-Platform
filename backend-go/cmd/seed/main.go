package main

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/argon2"
)

func hashPassword(password string) string {
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		log.Fatal(err)
	}
	hash := argon2.IDKey([]byte(password), salt, 1, 64*1024, 4, 32)
	return fmt.Sprintf(
		"$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version, 64*1024, 1, 4,
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(hash),
	)
}

func main() {
	dbURL := "postgres://postgres:secret@localhost:5432/jaagrmind?sslmode=disable"
	dbPool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer dbPool.Close()

	ctx := context.Background()

	// ── Drop and recreate tables for clean state ──────────────
	_, _ = dbPool.Exec(ctx, `DROP TABLE IF EXISTS inquiry_messages, parent_counselor_inquiries, parent_students, school_counselors, events, otp_verifications, student_results, counselor_notes, password_resets, assessments, school_invites, user_roles, students, schools, users, tickets, scheduled_promotions, institution_applications CASCADE`)

	_, err = dbPool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS users (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			email TEXT UNIQUE NOT NULL,
			name TEXT NOT NULL,
			password_hash TEXT NOT NULL,
			phone TEXT,
			metadata JSONB,
			is_internal BOOLEAN DEFAULT false,
			created_at TIMESTAMPTZ DEFAULT NOW()
		);
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
		CREATE TABLE IF NOT EXISTS students (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
			access_id TEXT NOT NULL,
			name TEXT NOT NULL,
			grade TEXT NOT NULL,
			section TEXT NOT NULL,
			mobile_number TEXT,
			email TEXT,
			academic_year TEXT,
			is_active BOOLEAN DEFAULT true,
			created_at TIMESTAMPTZ DEFAULT NOW(),
			UNIQUE(school_id, access_id)
		);
		CREATE TABLE IF NOT EXISTS user_roles (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id UUID REFERENCES users(id) ON DELETE CASCADE,
			role TEXT NOT NULL,
			entity_id UUID,
			created_at TIMESTAMPTZ DEFAULT NOW()
		);
		CREATE TABLE IF NOT EXISTS school_invites (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			school_name TEXT NOT NULL,
			email TEXT NOT NULL,
			token TEXT UNIQUE NOT NULL,
			expires_at TIMESTAMPTZ NOT NULL,
			accepted_at TIMESTAMPTZ,
			created_at TIMESTAMPTZ DEFAULT NOW()
		);
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
			completed_at TIMESTAMPTZ DEFAULT NOW()
		);
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
		CREATE TABLE IF NOT EXISTS scheduled_promotions (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
			from_grade TEXT NOT NULL,
			to_grade TEXT NOT NULL,
			scheduled_date TIMESTAMPTZ NOT NULL,
			status TEXT NOT NULL DEFAULT 'pending',
			student_count INT NOT NULL DEFAULT 0,
			created_at TIMESTAMPTZ DEFAULT NOW()
		);
		CREATE TABLE IF NOT EXISTS institution_applications (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			institute_name TEXT NOT NULL,
			institute_type TEXT NOT NULL,
			city TEXT NOT NULL,
			state TEXT NOT NULL,
			contact_name TEXT NOT NULL,
			designation TEXT NOT NULL,
			email TEXT NOT NULL,
			phone TEXT NOT NULL,
			estimated_students INT DEFAULT 500,
			message TEXT,
			status TEXT DEFAULT 'pending',
			created_at TIMESTAMPTZ DEFAULT NOW()
		);
		CREATE TABLE IF NOT EXISTS counselor_notes (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
			student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
			author_id UUID REFERENCES users(id),
			author_name VARCHAR(255) NOT NULL,
			intervention_type VARCHAR(100) NOT NULL,
			status VARCHAR(50) NOT NULL DEFAULT 'in_progress',
			notes TEXT NOT NULL,
			next_follow_up_date VARCHAR(50),
			created_at TIMESTAMPTZ DEFAULT NOW(),
			updated_at TIMESTAMPTZ DEFAULT NOW()
		);
		CREATE TABLE IF NOT EXISTS password_resets (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			email TEXT NOT NULL,
			phone TEXT NOT NULL,
			token TEXT NOT NULL UNIQUE,
			expires_at TIMESTAMPTZ NOT NULL,
			used BOOLEAN NOT NULL DEFAULT false,
			created_at TIMESTAMPTZ DEFAULT NOW()
		);
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
		CREATE TABLE IF NOT EXISTS parent_students (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
			relationship TEXT DEFAULT 'parent',
			nickname TEXT,
			created_at TIMESTAMPTZ DEFAULT NOW(),
			UNIQUE(parent_id, student_id)
		);
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
		CREATE TABLE IF NOT EXISTS inquiry_messages (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			inquiry_id UUID NOT NULL REFERENCES parent_counselor_inquiries(id) ON DELETE CASCADE,
			sender_id UUID,
			sender_name TEXT NOT NULL,
			sender_role TEXT NOT NULL,
			message TEXT NOT NULL,
			created_at TIMESTAMPTZ DEFAULT NOW()
		);
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
		ALTER TABLE students ADD COLUMN IF NOT EXISTS nickname TEXT;
	`)
	if err != nil {
		log.Fatalf("Failed to create tables: %v", err)
	}
	fmt.Println("✓ All tables created")

	// ── Schools ───────────────────────────────────────────────
	schools := []struct {
		Code        string
		Name        string
		City        string
		Contact     string
		PhoneNumber string
	}{
		{"OAKWOOD", "Oakwood High School", "Bangalore", "principal@oakwood.edu", "+91 98765 43210"},
		{"MAPLE", "Maple Valley Academy", "Pune", "admin@maple.edu", "+91 98765 43211"},
		{"RIVERSIDE", "Riverside Tech Institute", "Hyderabad", "hello@riverside.edu", "+91 98765 43212"},
	}

	schoolIDs := make([]string, 0, len(schools))
	for _, s := range schools {
		var id string
		err := dbPool.QueryRow(ctx, `
			INSERT INTO schools (school_code, name, city, contact, phone_number) VALUES ($1, $2, $3, $4, $5) RETURNING id
		`, s.Code, s.Name, s.City, s.Contact, s.PhoneNumber).Scan(&id)
		if err != nil {
			log.Printf("  Skipping school %s: %v", s.Name, err)
			continue
		}
		schoolIDs = append(schoolIDs, id)
	}

	// Seed Branch for Oakwood (Indiranagar Campus)
	var oakwoodBranchID string
	if len(schoolIDs) > 0 {
		oakwoodMainID := schoolIDs[0]
		_ = dbPool.QueryRow(ctx, `
			INSERT INTO schools (school_code, name, city, contact, phone_number, parent_school_id)
			VALUES ('OAKWOOD-INDIRA', 'Oakwood High School - Indiranagar Branch', 'Bangalore', 'indiranagar@oakwood.edu', '+91 98765 43299', $1)
			RETURNING id
		`, oakwoodMainID).Scan(&oakwoodBranchID)
	}
	fmt.Printf("✓ %d primary schools + branch seeded\n", len(schoolIDs))

	// ── Assessments ───────────────────────────────────────────
	var assessmentID string
	err = dbPool.QueryRow(ctx, `
		INSERT INTO assessments (title, description, tier, min_grade, max_grade, target_grades, sections) VALUES (
			'Mind Weather & Cognitive Focus Check-in',
			'Quarterly check-in measuring focus activation, classroom voice, emotional balance, and sleep recovery.',
			'all', 6, 12, ARRAY['6','7','8','9','10','11','12'],
			'[{"title": "Focus & Flow", "questions": [{"id": "q1", "text": "How easily do you start study tasks?", "type": "scale"}]}]'
		) RETURNING id
	`).Scan(&assessmentID)
	if err != nil {
		log.Printf("Assessment insert error: %v", err)
	}
	fmt.Println("✓ Default assessment seeded")

	// ── Students & Behavioral Results ─────────────────────────
	type SeedStudent struct {
		Name     string
		Grade    string
		Section  string
		SchoolID string
		Arch     string
		Focus    int
		Resil    int
		Tenacity int
		Stress   int
		Friction string
		Trend    string
	}

	oakwoodID := schoolIDs[0]
	mapleID := schoolIDs[1]
	riverID := schoolIDs[2]

	studentsToSeed := []SeedStudent{
		// Oakwood Main - Grade 10-A
		{"Aarav Sharma", "10th", "A", oakwoodID, "sprinter", 84, 62, 88, 54, "Evening Screen Drag & Sleep Debt", "stable"},
		{"Priya Mehta", "10th", "A", oakwoodID, "pacer", 92, 86, 85, 82, "Mild Routine Transition Friction", "improving"},
		{"Rohan Gupta", "10th", "A", oakwoodID, "observer", 74, 66, 78, 60, "Classroom Voice Hesitancy Under Doubt", "declining"},
		{"Ananya Iyer", "10th", "A", oakwoodID, "loyalist", 68, 58, 72, 52, "Peer Boundary & Secret-Keeping Fatigue", "declining"},
		// Oakwood Main - Grade 10-B
		{"Kabir Verma", "10th", "B", oakwoodID, "sprinter", 80, 60, 86, 56, "Late Night Cramming & Screen Drag", "stable"},
		{"Diya Sen", "10th", "B", oakwoodID, "pacer", 88, 82, 84, 80, "Low Initiation Friction", "improving"},
		{"Aditya Nair", "10th", "B", oakwoodID, "observer", 72, 64, 76, 58, "Evaluative Silence in Math/Science", "stable"},
		// Oakwood Main - Grade 9-A & 11-A
		{"Kavya Reddy", "9th", "A", oakwoodID, "pacer", 85, 78, 80, 76, "Grounded Peer Boundaries", "improving"},
		{"Ishaan Joshi", "9th", "A", oakwoodID, "loyalist", 65, 55, 70, 50, "Group Chat Mediation Strain", "declining"},
		{"Siddharth Malhotra", "11th", "A", oakwoodID, "sprinter", 90, 56, 92, 52, "Competitive High-Stakes Burnout", "declining"},
		{"Tanvi Rao", "11th", "A", oakwoodID, "pacer", 86, 80, 84, 78, "Steady Recovery Cycles", "improving"},
		// Oakwood Indiranagar Branch
		{"Varun Chawla", "10th", "A", oakwoodBranchID, "pacer", 88, 84, 86, 82, "Fluid Cognitive Flow", "improving"},
		{"Meera Nambiar", "10th", "A", oakwoodBranchID, "sprinter", 82, 64, 88, 58, "Evening Screen Drag", "stable"},
		{"Nikhil Kulkarni", "9th", "A", oakwoodBranchID, "observer", 70, 62, 74, 58, "Hesitant in Large Class Calls", "improving"},
		// Maple Valley Academy
		{"Sneha Patel", "10th", "A", mapleID, "pacer", 84, 79, 82, 76, "Balanced Study Cadence", "improving"},
		{"Arjun Kapoor", "10th", "A", mapleID, "sprinter", 86, 61, 89, 55, "Pre-Exam Adrenaline Cycles", "stable"},
		// Riverside Tech
		{"Vikram Das", "11th", "A", riverID, "sprinter", 88, 58, 91, 54, "Board Exam Anxiety", "declining"},
		{"Rhea Mukherjee", "11th", "A", riverID, "loyalist", 70, 60, 75, 56, "Peer Mediation Burnout", "stable"},
	}

	for idx, s := range studentsToSeed {
		if s.SchoolID == "" {
			continue
		}
		accessID := fmt.Sprintf("%03d", idx+101)
		var studentID string
		err := dbPool.QueryRow(ctx, `
			INSERT INTO students (school_id, access_id, name, grade, section)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING id
		`, s.SchoolID, accessID, s.Name, s.Grade, s.Section).Scan(&studentID)
		if err != nil {
			log.Printf("Error inserting student %s: %v", s.Name, err)
			continue
		}

		if assessmentID != "" {
			diagJSON, _ := json.Marshal(map[string]interface{}{
				"archetype":            s.Arch,
				"focusScore":           s.Focus,
				"resilienceScore":      s.Resil,
				"academicTenacity":     s.Tenacity,
				"stressAdaptability":   s.Stress,
				"primaryFriction":      s.Friction,
				"momentumTrend":        s.Trend,
				"taskInitiationFriction": 35,
				"evaluativeSilence":    42,
				"peerMediationStrain":  28,
				"eveningScreenDrag":    45,
			})
			sectionScoresJSON, _ := json.Marshal(map[string]float64{
				"Focus & Cognitive":   float64(s.Focus),
				"Stress Adaptability": float64(s.Stress),
				"Academic Tenacity":   float64(s.Tenacity),
				"Peer Engagement":     78.0,
				"Emotional Awareness": 74.0,
				"Self-Regulation":     float64(s.Resil),
			})

			totalScore := (s.Focus + s.Resil + s.Tenacity + s.Stress) / 4

			_, _ = dbPool.Exec(ctx, `
				INSERT INTO student_results (
					student_id, school_id, assessment_id, status, total_score,
					section_scores, primary_skill_area, secondary_skill_area,
					assigned_bucket, answers, mood, time_taken, behavioral_diagnostics
				) VALUES (
					$1, $2, $3, 'complete', $4,
					$5, 'Focus & Flow', 'Emotional Awareness',
					$6, '{"q1": 4}'::jsonb, '{"energy": "balanced"}'::jsonb, 720, $7
				)
			`, studentID, s.SchoolID, assessmentID, totalScore, sectionScoresJSON, s.Arch, diagJSON)
		}
	}
	fmt.Printf("✓ %d students and assessment results seeded across 4 campuses\n", len(studentsToSeed))

	// ── Users ─────────────────────────────────────────────────
	adminHash := hashPassword("admin123")
	var adminID string
	_ = dbPool.QueryRow(ctx, `
		INSERT INTO users (email, name, password_hash, is_internal) VALUES ('admin@jaagrmind.com', 'Platform Admin', $1, true) RETURNING id
	`, adminHash).Scan(&adminID)
	_, _ = dbPool.Exec(ctx, `INSERT INTO user_roles (user_id, role) VALUES ($1, 'superadmin')`, adminID)
	fmt.Println("✓ admin@jaagrmind.com / admin123 → superadmin (is_internal: true)")

	// Central counselor by JaagrMind
	centralCounselorHash := hashPassword("counsel123")
	var centralCounselorID string
	_ = dbPool.QueryRow(ctx, `
		INSERT INTO users (email, name, password_hash, is_internal) VALUES ('counselor@jaagrmind.com', 'JaagrMind Central Counselor', $1, true) RETURNING id
	`, centralCounselorHash).Scan(&centralCounselorID)
	_, _ = dbPool.Exec(ctx, `INSERT INTO user_roles (user_id, role) VALUES ($1, 'counselor')`, centralCounselorID)
	fmt.Println("✓ counselor@jaagrmind.com / counsel123 → central counselor (is_internal: true)")

	// School admin for Oakwood
	if len(schoolIDs) > 0 {
		schoolAdminHash := hashPassword("school123")
		var schoolAdminID string
		_ = dbPool.QueryRow(ctx, `
			INSERT INTO users (email, name, password_hash, is_internal) VALUES ('oakwood@jaagrmind.com', 'Oakwood Admin', $1, false) RETURNING id
		`, schoolAdminHash).Scan(&schoolAdminID)
		_, _ = dbPool.Exec(ctx, `INSERT INTO user_roles (user_id, role, entity_id) VALUES ($1, 'school_admin', $2)`, schoolAdminID, schoolIDs[0])
		fmt.Printf("✓ oakwood@jaagrmind.com / school123 → school_admin (OAKWOOD)\n")

		// School counselor for Oakwood
		counselorHash := hashPassword("counsel123")
		var counselorID string
		_ = dbPool.QueryRow(ctx, `
			INSERT INTO users (email, name, password_hash, is_internal) VALUES ('counselor@oakwood.edu', 'Oakwood Counselor', $1, false) RETURNING id
		`, counselorHash).Scan(&counselorID)
		fmt.Printf("✓ counselor@oakwood.edu / counsel123 → counselor (OAKWOOD)\n")

		// Insert into school_counselors table for campus directory and parent desk
		_, _ = dbPool.Exec(ctx, `
			INSERT INTO school_counselors (school_id, name, email, phone, role, branch_name, available_hours, is_active)
			VALUES ($1, 'Dr. Sunita Rao', 'counselor@oakwood.edu', '+91 98765 88990', 'Senior Wellness Counselor', 'Main Campus', 'Mon-Fri, 9:00 AM - 3:30 PM', true)
		`, schoolIDs[0])
		fmt.Printf("✓ Dr. Sunita Rao registered in school_counselors (OAKWOOD)\n")

		// Teacher for Oakwood (Class Teacher 9-A)
		teachHash := hashPassword("teach123")
		teachMeta, _ := json.Marshal(map[string]any{
			"assigned_grade":   "9",
			"assigned_section": "A",
			"designation":      "Class Teacher",
			"phone":            "+91 98765 12345",
		})
		var teacherID string
		_ = dbPool.QueryRow(ctx, `
			INSERT INTO users (email, name, password_hash, phone, metadata, is_internal) 
			VALUES ('teacher@oakwood.edu', 'Ananya Sharma', $1, '+91 98765 12345', $2, false) RETURNING id
		`, teachHash, teachMeta).Scan(&teacherID)
		_, _ = dbPool.Exec(ctx, `INSERT INTO user_roles (user_id, role, entity_id) VALUES ($1, 'teacher', $2)`, teacherID, schoolIDs[0])
		fmt.Printf("✓ teacher@oakwood.edu / teach123 → teacher (OAKWOOD 9-A)\n")
	}

	// Demo Parent
	parentHash := hashPassword("parent123")
	var parentID string
	_ = dbPool.QueryRow(ctx, `
		INSERT INTO users (email, name, password_hash, phone, is_internal) 
		VALUES ('parent@example.com', 'Rajesh Sharma', $1, '+91 99887 76655', false) RETURNING id
	`, parentHash).Scan(&parentID)
	_, _ = dbPool.Exec(ctx, `INSERT INTO user_roles (user_id, role) VALUES ($1, 'parent')`, parentID)
	fmt.Println("✓ parent@example.com / parent123 → parent")

	// Link parent to Aarav Sharma in parent_students
	var aaravStudentID string
	_ = dbPool.QueryRow(ctx, `SELECT id FROM students WHERE name = 'Aarav Sharma' LIMIT 1`).Scan(&aaravStudentID)
	if aaravStudentID != "" {
		_, _ = dbPool.Exec(ctx, `
			INSERT INTO parent_students (parent_id, student_id, relationship)
			VALUES ($1, $2, 'father')
			ON CONFLICT DO NOTHING
		`, parentID, aaravStudentID)
		fmt.Printf("✓ Linked parent (Rajesh Sharma) → student (Aarav Sharma) in parent_students\n")
	}

	fmt.Println("\nFull hierarchical seed complete!")
}
