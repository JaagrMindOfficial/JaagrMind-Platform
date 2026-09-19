package main

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jaagrmind/platform-api/internal/repository"
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

	// ── Drop all 27 tables for clean state ──────────────
	dropSQL := `DROP TABLE IF EXISTS 
		inquiry_messages, parent_counselor_inquiries, parent_students, 
		school_counselors, events, otp_verifications, derived_metrics, 
		raw_interactions, trait_snapshots, mood_entries, journal_entries, 
		activity_sessions, daily_pathway, activity_catalog, student_results, 
		counselor_notes, password_resets, assessments, school_invites, 
		user_roles, students, schools, users, tickets, scheduled_promotions, 
		institution_applications, platform_guides CASCADE`
	if _, err := dbPool.Exec(ctx, dropSQL); err != nil {
		log.Printf("Warning during drop: %v", err)
	}

	// ── Auto-Migrate schema (single source of truth) ─────────
	if err := repository.AutoMigrate(ctx, dbPool); err != nil {
		log.Fatalf("Failed to auto-migrate database schema: %v", err)
	}
	fmt.Println("✓ All 27 tables created and verified via AutoMigrate")

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
	adminHash := hashPassword("admin@123")
	var adminID string
	_ = dbPool.QueryRow(ctx, `
		INSERT INTO users (email, name, password_hash, is_internal) VALUES ('admin@jaagrmind.com', 'Platform Admin', $1, true) RETURNING id
	`, adminHash).Scan(&adminID)
	_, _ = dbPool.Exec(ctx, `INSERT INTO user_roles (user_id, role) VALUES ($1, 'superadmin')`, adminID)
	fmt.Println("✓ admin@jaagrmind.com / admin@123 → superadmin (is_internal: true)")

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
