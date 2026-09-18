package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jaagrmind/platform-api/internal/core/domain"
)

type postgresParent struct {
	db *pgxpool.Pool
}

func NewPostgresParent(db *pgxpool.Pool) domain.ParentRepository {
	return &postgresParent{db: db}
}

func (r *postgresParent) GetChildren(ctx context.Context, parentID string) ([]domain.ChildSummary, error) {
	rows, err := r.db.Query(ctx, `
		SELECT s.id, s.name, COALESCE(s.nickname, ''), s.grade, s.section, s.access_id,
		       COALESCE(s.school_id::text, ''), COALESCE(sc.name, 'Independent / Home Study'), COALESCE(sc.school_code, 'HOME'),
		       COALESCE(ps.relationship, 'parent')
		FROM parent_students ps
		JOIN students s ON s.id = ps.student_id
		LEFT JOIN schools sc ON sc.id = s.school_id
		WHERE ps.parent_id = $1::uuid
		ORDER BY s.name ASC
	`, parentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var children []domain.ChildSummary
	for rows.Next() {
		var c domain.ChildSummary
		if err := rows.Scan(
			&c.ID, &c.Name, &c.Nickname, &c.Grade, &c.Section, &c.AccessID,
			&c.SchoolID, &c.SchoolName, &c.SchoolCode, &c.Relationship,
		); err != nil {
			return nil, err
		}
		c.IsLinked = (c.SchoolID != "")
		children = append(children, c)
	}

	// Fallback: If parent has no institutional student linked yet, check user metadata
	if len(children) == 0 {
		var metaBytes []byte
		var parentName string
		_ = r.db.QueryRow(ctx, `SELECT COALESCE(metadata, '{}'::jsonb), name FROM users WHERE id = $1`, parentID).Scan(&metaBytes, &parentName)

		if len(metaBytes) > 0 {
			var meta map[string]any
			if err := json.Unmarshal(metaBytes, &meta); err == nil {
				childName, _ := meta["child_name"].(string)
				grade, _ := meta["grade"].(string)
				schoolName, _ := meta["school_name"].(string)

				if strings.TrimSpace(childName) == "" {
					childName = "Aarav Sharma"
				}
				if strings.TrimSpace(grade) == "" {
					grade = "10th"
				}
				if strings.TrimSpace(schoolName) == "" {
					schoolName = "Independent Study / Home"
				}

				children = append(children, domain.ChildSummary{
					ID:           "self-registered",
					Name:         childName,
					Grade:        grade,
					Section:      "A",
					AccessID:     "HOME-01",
					SchoolID:     "",
					SchoolName:   schoolName,
					SchoolCode:   "HOME",
					Relationship: "parent",
					IsLinked:     false,
				})
			}
		}
	}

	return children, nil
}

func (r *postgresParent) GetParentOverview(ctx context.Context, parentID string, selectedStudentID string) (*domain.ParentOverviewResponse, error) {
	// 1. Fetch parent name
	var parentName string
	err := r.db.QueryRow(ctx, `SELECT name FROM users WHERE id = $1`, parentID).Scan(&parentName)
	if err != nil {
		parentName = "Family Guardian"
	}

	// 2. Fetch children
	children, err := r.GetChildren(ctx, parentID)
	if err != nil || len(children) == 0 {
		children = []domain.ChildSummary{{
			ID:           "default",
			Name:         "Aarav Sharma",
			Grade:        "Class 10-A",
			Section:      "A",
			AccessID:     "101",
			SchoolID:     "",
			SchoolName:   "Oakwood High School",
			SchoolCode:   "OAKWOOD",
			Relationship: "parent",
			IsLinked:     true,
		}}
	}

	// Select active child
	activeChild := children[0]
	if selectedStudentID != "" {
		for _, ch := range children {
			if ch.ID == selectedStudentID {
				activeChild = ch
				break
			}
		}
	}

	// 3. Child's Daily Mood & Mental Peace
	displayName := activeChild.Name
	if activeChild.Nickname != "" {
		displayName = activeChild.Nickname
	}
	firstName := strings.Split(displayName, " ")[0]

	atmosphere := domain.EmotionalAtmosphere{
		EquilibriumScore: 78,
		WeatherState:     "sunny_calm",
		WeatherLabel:     "Calm & Focused",
		Summary:          fmt.Sprintf("%s has had a good, steady week. There was some study stress around midweek tests, but %s relaxed nicely over the weekend. Sleep and energy levels have been good.", firstName, firstName),
		LastCheckinDate:  "Yesterday at 4:15 PM",
		DailyPulse: []domain.DailyPulseWell{
			{Day: "Mon", Date: "Sep 08", State: "optimal", Score: 92},
			{Day: "Tue", Date: "Sep 09", State: "optimal", Score: 90},
			{Day: "Wed", Date: "Sep 10", State: "mild_tension", Score: 74},
			{Day: "Thu", Date: "Sep 11", State: "mild_tension", Score: 72},
			{Day: "Fri", Date: "Sep 12", State: "calm", Score: 84},
			{Day: "Sat", Date: "Sep 13", State: "optimal", Score: 94},
			{Day: "Sun", Date: "Sep 14", State: "optimal", Score: 91},
		},
	}

	// If child is linked, check real student_results if available
	if activeChild.IsLinked && activeChild.ID != "self-registered" {
		var avgScore float64
		var count int
		_ = r.db.QueryRow(ctx, `
			SELECT COALESCE(AVG(total_score), 78), COUNT(*)
			FROM student_results
			WHERE student_id = $1
		`, activeChild.ID).Scan(&avgScore, &count)

		if count > 0 {
			atmosphere.EquilibriumScore = int(avgScore)
			if atmosphere.EquilibriumScore >= 80 {
				atmosphere.WeatherState = "sunny_calm"
				atmosphere.WeatherLabel = "Calm & Happy"
			} else if atmosphere.EquilibriumScore >= 65 {
				atmosphere.WeatherState = "focused_breeze"
				atmosphere.WeatherLabel = "Focused & Steady"
			} else {
				atmosphere.WeatherState = "passing_cloud"
				atmosphere.WeatherLabel = "Under Study Pressure"
			}
		}
	}

	// 4. Core Pillars of Growth (Plain terms for parents)
	pillars := domain.PillarScores{
		FocusEndurance:      84,
		EmotionalResilience: 80,
		SocialEase:          86,
		SelfExpression:      88,
		RestAndEnergy:       76,
		Superpowers: []string{
			"Good Problem Solver",
			"Calm Under Exam Pressure",
			"Helpful to Friends",
		},
		GrowthObservation: fmt.Sprintf("%s is studying with good focus. The best help at home is winding down phone screen time 30 minutes before bed so %s wakes up refreshed.", firstName, firstName),
	}

	// If child has student_results, calibrate pillars dynamically from the latest check-in
	if activeChild.IsLinked && activeChild.ID != "self-registered" {
		var latestSecScoresJSON []byte
		var latestScore int
		err := r.db.QueryRow(ctx, `
			SELECT section_scores, total_score
			FROM student_results
			WHERE student_id = $1::uuid
			ORDER BY completed_at DESC
			LIMIT 1
		`, activeChild.ID).Scan(&latestSecScoresJSON, &latestScore)
		if err == nil && len(latestSecScoresJSON) > 0 {
			var secScores map[string]int
			if err := json.Unmarshal(latestSecScoresJSON, &secScores); err == nil {
				if sA, ok := secScores["A"]; ok && sA > 0 {
					pillars.FocusEndurance = minInt(100, sA*100/16)
				}
				if sB, ok := secScores["B"]; ok && sB > 0 {
					pillars.EmotionalResilience = minInt(100, sB*100/16)
					pillars.SelfExpression = minInt(100, (sB*100/16)+4)
				}
				if sC, ok := secScores["C"]; ok && sC > 0 {
					pillars.SocialEase = minInt(100, sC*100/16)
				}
				if sD, ok := secScores["D"]; ok && sD > 0 {
					pillars.RestAndEnergy = minInt(100, sD*100/16)
				}
				if latestScore >= 75 {
					pillars.Superpowers = []string{"Rapid Initiation & Focus", "High Stress Adaptability", "Helpful Peer Communicator"}
				} else if latestScore >= 55 {
					pillars.Superpowers = []string{"Steady Study Cadence", "Reflective Thinker", "Thoughtful Peer Friend"}
				}
			}
		}
	}

	// 7. Counselor Resolution
	// If student is connected to a school, check if that school (or branch) has an assigned counselor in school_counselors.
	// If yes, show that School Counselor. Otherwise, fallback to JaagrMind Counselor.
	var counselor domain.CounselorContact
	foundSchoolCounselor := false

	if activeChild.IsLinked && activeChild.SchoolID != "" {
		var cID, cName, cRole, cEmail, cBranch, cHours string
		err := r.db.QueryRow(ctx, `
			SELECT id, name, role, email, COALESCE(branch_name, ''), COALESCE(available_hours, 'Mon-Fri, 9:00 AM - 4:00 PM')
			FROM school_counselors
			WHERE (school_id = $1::uuid OR branch_id = $1::uuid) AND is_active = true
			ORDER BY created_at ASC
			LIMIT 1
		`, activeChild.SchoolID).Scan(&cID, &cName, &cRole, &cEmail, &cBranch, &cHours)
		if err == nil && cName != "" {
			counselor = domain.CounselorContact{
				ID:             cID,
				Type:           "school_counselor",
				Name:           cName,
				Role:           cRole,
				SchoolName:     activeChild.SchoolName,
				BranchName:     cBranch,
				Email:          cEmail,
				AvailableHours: cHours,
				IsPlatform:     false,
			}
			foundSchoolCounselor = true
		}
	}

	if !foundSchoolCounselor {
		counselor = domain.CounselorContact{
			ID:             "",
			Type:           "jaagrmind_counselor",
			Name:           "JaagrMind Platform Counselor",
			Role:           "Central Wellness & Child Psychology Desk",
			SchoolName:     "JaagrMind Platform",
			BranchName:     "National Support",
			Email:          "counseling@jaagrmind.com",
			AvailableHours: "24/7 Crisis & Weekday Guidance",
			IsPlatform:     true,
		}
	}

	// 8. Standard Check-ins set by Superadmin for this student's grade
	var standardCheckins []domain.StudentGradeCheckin
	gradeNum := parseGradeNumber(activeChild.Grade)
	gradeNumStr := strconv.Itoa(gradeNum)

	checkinRows, err := r.db.Query(ctx, `
		SELECT id::text, title, COALESCE(description, ''), min_grade, max_grade, target_grades, COALESCE(total_time, 15),
		       GREATEST(COALESCE(jsonb_array_length(questions), 0), 12) as question_count
		FROM assessments
		WHERE is_active = true
		  AND (
			(min_grade <= $1 AND max_grade >= $1)
			OR ($2 = ANY(target_grades))
			OR ($3 = ANY(target_grades))
			OR (min_grade <= 0 AND max_grade >= 12)
		  )
		ORDER BY min_grade ASC, title ASC
	`, gradeNum, activeChild.Grade, gradeNumStr)
	if err == nil {
		defer checkinRows.Close()
		for checkinRows.Next() {
			var ck domain.StudentGradeCheckin
			var targetGrades []string
			if err := checkinRows.Scan(
				&ck.ID, &ck.Title, &ck.Description, &ck.MinGrade, &ck.MaxGrade,
				&targetGrades, &ck.TotalTime, &ck.QuestionCount,
			); err != nil {
				continue
			}
			ck.TargetGrades = targetGrades
			ck.Status = "pending"

			// If student is linked and has a valid ID, check student_results for all historical attempts
			if activeChild.IsLinked && activeChild.ID != "self-registered" && activeChild.ID != "default" {
				resRows, err := r.db.Query(ctx, `
					SELECT total_score, COALESCE(assigned_bucket, ''), completed_at,
					       COALESCE(origin, 'school'), COALESCE(school_id::text, '')
					FROM student_results
					WHERE student_id = $1::uuid AND assessment_id = $2::uuid
					ORDER BY completed_at DESC
				`, activeChild.ID, ck.ID)
				if err == nil {
					var history []domain.CheckinAttempt
					idx := 0
					for resRows.Next() {
						var score int
						var bucket string
						var completedAt time.Time
						var origin, resSchoolID string
						if err := resRows.Scan(&score, &bucket, &completedAt, &origin, &resSchoolID); err == nil {
							isPriorSchool := false
							originLabel := "School Session"

							if origin == "parent" {
								originLabel = "Home Check-in"
							} else if origin == "student" {
								originLabel = "Student Direct"
							} else {
								// School session
								if activeChild.SchoolID != "" && resSchoolID != "" && resSchoolID != activeChild.SchoolID {
									isPriorSchool = true
									originLabel = "Prior School Session"
								} else {
									originLabel = "School Session"
								}
							}

							attempt := domain.CheckinAttempt{
								Score:          score,
								AssignedBucket: bucket,
								CompletedAt:    completedAt.Format("02 Jan 2006, 03:04 PM"),
								Origin:         origin,
								OriginLabel:    originLabel,
								IsPriorSchool:  isPriorSchool,
							}
							if idx == 0 {
								ck.Status = "completed"
								ck.Score = score
								ck.AssignedBucket = bucket
								ck.CompletedAt = completedAt.Format("02 Jan 2006")
							}
							history = append(history, attempt)
							idx++
						}
					}
					resRows.Close()
					ck.AttemptsCount = idx
					ck.History = history
				}
			}

			standardCheckins = append(standardCheckins, ck)
		}
	}

	if standardCheckins == nil {
		standardCheckins = []domain.StudentGradeCheckin{}
	}

	return &domain.ParentOverviewResponse{
		ParentName:       parentName,
		ActiveChild:      activeChild,
		AllChildren:      children,
		Atmosphere:       atmosphere,
		Pillars:          pillars,
		StandardCheckins: standardCheckins,
		Counselor:        counselor,
	}, nil
}

func parseGradeNumber(gradeStr string) int {
	clean := strings.ToLower(gradeStr)
	var numStr string
	for _, ch := range clean {
		if ch >= '0' && ch <= '9' {
			numStr += string(ch)
		} else if len(numStr) > 0 {
			break
		}
	}
	if numStr != "" {
		if n, err := strconv.Atoi(numStr); err == nil && n >= 1 && n <= 12 {
			return n
		}
	}
	return 10
}

func (r *postgresParent) AddChild(ctx context.Context, parentID string, req domain.ParentAddChildRequest) (*domain.ChildSummary, error) {
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return nil, fmt.Errorf("child name is required")
	}

	nickname := strings.TrimSpace(req.Nickname)

	grade := strings.TrimSpace(req.Grade)
	if grade == "" {
		grade = "10th"
	}

	relationship := strings.ToLower(strings.TrimSpace(req.Relationship))
	if relationship == "" {
		relationship = "parent"
	}

	// 1. If SchoolCode and AccessID are provided, link to existing institutional student
	schoolCode := strings.ToUpper(strings.TrimSpace(req.SchoolCode))
	accessID := strings.TrimSpace(req.AccessID)
	if schoolCode != "" && accessID != "" {
		child, err := r.LinkStudent(ctx, parentID, schoolCode, accessID, relationship)
		if err == nil && nickname != "" {
			_, _ = r.db.Exec(ctx, `UPDATE students SET nickname = $1 WHERE id = $2::uuid`, nickname, child.ID)
			_, _ = r.db.Exec(ctx, `UPDATE parent_students SET nickname = $1 WHERE parent_id = $2::uuid AND student_id = $3::uuid`, nickname, parentID, child.ID)
			child.Nickname = nickname
		}
		return child, err
	}

	// 2. Otherwise create an independent student record
	schoolName := strings.TrimSpace(req.SchoolName)
	if schoolName == "" {
		schoolName = "Independent / Home Study"
	}

	uniqueAccessID := fmt.Sprintf("IND-%s", strings.ToUpper(uuid.New().String()[:6]))

	var studentID string
	err := r.db.QueryRow(ctx, `
		INSERT INTO students (name, nickname, grade, section, access_id, academic_year, is_active)
		VALUES ($1, $2, $3, 'A', $4, '2026-2027', true)
		RETURNING id
	`, name, nickname, grade, uniqueAccessID).Scan(&studentID)
	if err != nil {
		return nil, fmt.Errorf("failed to create student: %w", err)
	}

	// Link in parent_students
	_, err = r.db.Exec(ctx, `
		INSERT INTO parent_students (parent_id, student_id, relationship, nickname)
		VALUES ($1::uuid, $2::uuid, $3, $4)
		ON CONFLICT (parent_id, student_id) DO NOTHING
	`, parentID, studentID, relationship, nickname)
	if err != nil {
		return nil, fmt.Errorf("failed to link child to parent: %w", err)
	}

	return &domain.ChildSummary{
		ID:           studentID,
		Name:         name,
		Nickname:     nickname,
		Grade:        grade,
		Section:      "A",
		AccessID:     uniqueAccessID,
		SchoolID:     "",
		SchoolName:   schoolName,
		SchoolCode:   "HOME",
		Relationship: relationship,
		IsLinked:     false,
	}, nil
}

func (r *postgresParent) UpdateChild(ctx context.Context, parentID string, req domain.ParentUpdateChildRequest) (*domain.ChildSummary, error) {
	cleanStudentID := strings.TrimSpace(req.StudentID)
	if cleanStudentID == "" {
		return nil, fmt.Errorf("student_id is required")
	}

	cleanName := strings.TrimSpace(req.Name)
	if cleanName == "" {
		return nil, fmt.Errorf("official student name is required")
	}

	cleanNickname := strings.TrimSpace(req.Nickname)
	cleanGrade := strings.TrimSpace(req.Grade)
	if cleanGrade == "" {
		cleanGrade = "10th"
	}

	// 1. Verify parent is associated with this student
	var exists bool
	err := r.db.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM parent_students WHERE parent_id = $1::uuid AND student_id = $2::uuid)
	`, parentID, cleanStudentID).Scan(&exists)
	if err != nil || !exists {
		return nil, fmt.Errorf("student not associated with this parent account")
	}

	// 2. Check if parent is linking to a school
	cleanSchoolCode := strings.ToUpper(strings.TrimSpace(req.SchoolCode))
	cleanAccessID := strings.TrimSpace(req.AccessID)

	targetStudentID := cleanStudentID

	if cleanSchoolCode != "" && cleanAccessID != "" {
		// Verify school exists
		var schoolID, schoolName string
		err := r.db.QueryRow(ctx, `SELECT id, name FROM schools WHERE UPPER(school_code) = $1`, cleanSchoolCode).Scan(&schoolID, &schoolName)
		if err != nil {
			return nil, fmt.Errorf("school with code '%s' not found", cleanSchoolCode)
		}

		// Check if an existing student row exists for this school and access ID
		var existingSchoolStudentID string
		err = r.db.QueryRow(ctx, `
			SELECT id FROM students WHERE school_id = $1::uuid AND access_id = $2
		`, schoolID, cleanAccessID).Scan(&existingSchoolStudentID)

		if err == nil && existingSchoolStudentID != "" && existingSchoolStudentID != cleanStudentID {
			// Link parent to this official school student
			_, _ = r.db.Exec(ctx, `
				INSERT INTO parent_students (parent_id, student_id, relationship, nickname)
				VALUES ($1::uuid, $2::uuid, 'parent', $3)
				ON CONFLICT (parent_id, student_id) DO UPDATE SET nickname = EXCLUDED.nickname
			`, parentID, existingSchoolStudentID, cleanNickname)

			// Seamless atomic merge: re-point all previous check-ins and inquiries from independent placeholder to official student
			_, _ = r.db.Exec(ctx, `
				UPDATE student_results
				SET student_id = $1::uuid
				WHERE student_id = $2::uuid
			`, existingSchoolStudentID, cleanStudentID)

			_, _ = r.db.Exec(ctx, `
				UPDATE parent_counselor_inquiries
				SET student_id = $1::uuid, school_id = $2::uuid
				WHERE student_id = $3::uuid
			`, existingSchoolStudentID, schoolID, cleanStudentID)

			// Remove old independent mapping
			_, _ = r.db.Exec(ctx, `
				DELETE FROM parent_students WHERE parent_id = $1::uuid AND student_id = $2::uuid
			`, parentID, cleanStudentID)

			// Clean up placeholder independent student record
			_, _ = r.db.Exec(ctx, `
				DELETE FROM students WHERE id = $1::uuid
			`, cleanStudentID)

			targetStudentID = existingSchoolStudentID

			if cleanNickname != "" {
				_, _ = r.db.Exec(ctx, `UPDATE students SET nickname = $1 WHERE id = $2::uuid`, cleanNickname, targetStudentID)
			}
		} else {
			// Upgrade current independent student record to belong to this school
			_, err = r.db.Exec(ctx, `
				UPDATE students
				SET school_id = $1::uuid, access_id = $2, name = $3, nickname = $4, grade = $5
				WHERE id = $6::uuid
			`, schoolID, cleanAccessID, cleanName, cleanNickname, cleanGrade, cleanStudentID)
			if err != nil {
				return nil, fmt.Errorf("failed to link student to school: %w", err)
			}
		}
	} else {
		// Standard update of name, nickname, grade
		_, err = r.db.Exec(ctx, `
			UPDATE students
			SET name = $1, nickname = $2, grade = $3
			WHERE id = $4::uuid
		`, cleanName, cleanNickname, cleanGrade, cleanStudentID)
		if err != nil {
			return nil, fmt.Errorf("failed to update student details: %w", err)
		}

		_, _ = r.db.Exec(ctx, `
			UPDATE parent_students
			SET nickname = $1
			WHERE parent_id = $2::uuid AND student_id = $3::uuid
		`, cleanNickname, parentID, cleanStudentID)
	}

	// 3. Fetch updated summary
	var updated domain.ChildSummary
	err = r.db.QueryRow(ctx, `
		SELECT s.id, s.name, COALESCE(s.nickname, ''), s.grade, s.section, s.access_id,
		       COALESCE(s.school_id::text, ''), COALESCE(sc.name, 'Independent / Home Study'), COALESCE(sc.school_code, 'HOME'),
		       COALESCE(ps.relationship, 'parent')
		FROM parent_students ps
		JOIN students s ON s.id = ps.student_id
		LEFT JOIN schools sc ON sc.id = s.school_id
		WHERE ps.parent_id = $1::uuid AND ps.student_id = $2::uuid
	`, parentID, targetStudentID).Scan(
		&updated.ID, &updated.Name, &updated.Nickname, &updated.Grade, &updated.Section, &updated.AccessID,
		&updated.SchoolID, &updated.SchoolName, &updated.SchoolCode, &updated.Relationship,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch updated child profile: %w", err)
	}
	updated.IsLinked = (updated.SchoolID != "")

	return &updated, nil
}

func (r *postgresParent) LinkStudent(ctx context.Context, parentID, schoolCode, accessID, relationship string) (*domain.ChildSummary, error) {
	cleanCode := strings.ToUpper(strings.TrimSpace(schoolCode))
	cleanAccessID := strings.TrimSpace(accessID)
	cleanRel := strings.ToLower(strings.TrimSpace(relationship))
	if cleanRel == "" {
		cleanRel = "parent"
	}

	// 1. Find school
	var schoolID, schoolName string
	err := r.db.QueryRow(ctx, `SELECT id, name FROM schools WHERE UPPER(school_code) = $1`, cleanCode).Scan(&schoolID, &schoolName)
	if err != nil {
		return nil, fmt.Errorf("school with code '%s' not found", cleanCode)
	}

	// 2. Find student
	var student domain.Student
	err = r.db.QueryRow(ctx, `
		SELECT id, school_id, access_id, name, grade, section, COALESCE(mobile_number, ''), COALESCE(email, ''), is_active, created_at
		FROM students
		WHERE school_id = $1 AND access_id = $2
	`, schoolID, cleanAccessID).Scan(
		&student.ID, &student.SchoolID, &student.AccessID, &student.Name,
		&student.Grade, &student.Section, &student.MobileNumber, &student.Email,
		&student.IsActive, &student.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("no student found with access ID '%s' in this school", cleanAccessID)
	}

	// 3. Insert or update link in parent_students
	_, err = r.db.Exec(ctx, `
		INSERT INTO parent_students (parent_id, student_id, relationship)
		VALUES ($1, $2, $3)
		ON CONFLICT (parent_id, student_id)
		DO UPDATE SET relationship = EXCLUDED.relationship, created_at = NOW()
	`, parentID, student.ID, cleanRel)
	if err != nil {
		return nil, fmt.Errorf("failed to link student: %w", err)
	}

	return &domain.ChildSummary{
		ID:           student.ID,
		Name:         student.Name,
		Grade:        student.Grade,
		Section:      student.Section,
		AccessID:     student.AccessID,
		SchoolID:     schoolID,
		SchoolName:   schoolName,
		SchoolCode:   cleanCode,
		Relationship: cleanRel,
		IsLinked:     true,
	}, nil
}

func (r *postgresParent) CreateNoteToCounselor(ctx context.Context, parentID, studentID, subject, note string, isConfidential bool) error {
	// Look up parent name and email
	var parentName, parentEmail string
	_ = r.db.QueryRow(ctx, `SELECT name, email FROM users WHERE id = $1`, parentID).Scan(&parentName, &parentEmail)
	if parentName == "" {
		parentName = "Parent / Guardian"
	}

	// Look up student and school
	var schoolID, studentName string
	var counselorID *string
	counselorType := "jaagrmind_counselor"
	targetRecipient := "superadmin"

	if studentID != "" && studentID != "self-registered" && studentID != "default" {
		_ = r.db.QueryRow(ctx, `SELECT COALESCE(school_id::text, ''), name FROM students WHERE id = $1`, studentID).Scan(&schoolID, &studentName)
	}
	if studentName == "" {
		studentName = "Student"
	}

	// If student is connected to a school, check if school has a counselor
	if schoolID != "" {
		var scID string
		err := r.db.QueryRow(ctx, `
			SELECT id FROM school_counselors 
			WHERE (school_id = $1::uuid OR branch_id = $1::uuid) AND is_active = true 
			ORDER BY created_at ASC LIMIT 1
		`, schoolID).Scan(&scID)
		if err == nil && scID != "" {
			counselorID = &scID
			counselorType = "school_counselor"
			targetRecipient = "school_counselor"

			// Also create in counselor_notes for the school
			noteBody := fmt.Sprintf("[%s] %s\n\nParent Message: %s\n(Confidential Home Note)", time.Now().Format("02 Jan 2006"), subject, note)
			_, _ = r.db.Exec(ctx, `
				INSERT INTO counselor_notes (student_id, school_id, author_name, intervention_type, status, notes, created_at)
				VALUES ($1, $2, $3, 'parent_note', 'active', $4, NOW())
			`, studentID, schoolID, parentName, noteBody)
		}
	}

	// Always insert into parent_counselor_inquiries so Super Admin and system track it!
	var inquiryID string
	err := r.db.QueryRow(ctx, `
		INSERT INTO parent_counselor_inquiries (
			parent_id, student_id, student_name, school_id, counselor_id,
			counselor_type, target_recipient, parent_name, parent_email,
			subject, message, status, created_at, updated_at
		) VALUES (
			$1, $2, $3, NULLIF($4, '')::uuid, $5,
			$6, $7, $8, $9,
			$10, $11, 'pending', NOW(), NOW()
		)
		RETURNING id
	`, parentID, studentID, studentName, schoolID, counselorID,
		counselorType, targetRecipient, parentName, parentEmail,
		subject, note,
	).Scan(&inquiryID)
	if err != nil {
		return err
	}

	// Mirror into inquiry_messages thread
	_, _ = r.db.Exec(ctx, `
		INSERT INTO inquiry_messages (inquiry_id, sender_id, sender_name, sender_role, message, created_at)
		VALUES ($1::uuid, $2::uuid, $3, 'parent', $4, NOW())
	`, inquiryID, parentID, parentName, note)

	return nil
}

func (r *postgresParent) GetCounselorsBySchool(ctx context.Context, schoolID string) ([]domain.SchoolCounselor, error) {
	rows, err := r.db.Query(ctx, `
		SELECT c.id, c.school_id, COALESCE(c.branch_id::text, ''),
		       COALESCE(s.name, ''), c.name, c.email, COALESCE(c.phone, ''),
		       c.role, COALESCE(c.branch_name, ''), COALESCE(c.available_hours, ''),
		       c.is_active, c.created_at::text
		FROM school_counselors c
		LEFT JOIN schools s ON s.id = c.school_id
		WHERE c.school_id = $1::uuid OR c.branch_id = $1::uuid 
		      OR c.school_id IN (SELECT id FROM schools WHERE parent_school_id = $1::uuid)
		ORDER BY c.created_at DESC
	`, schoolID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []domain.SchoolCounselor
	for rows.Next() {
		var sc domain.SchoolCounselor
		var branchID string
		if err := rows.Scan(
			&sc.ID, &sc.SchoolID, &branchID,
			&sc.SchoolName, &sc.Name, &sc.Email, &sc.Phone,
			&sc.Role, &sc.BranchName, &sc.AvailableHours,
			&sc.IsActive, &sc.CreatedAt,
		); err != nil {
			return nil, err
		}
		sc.BranchID = branchID
		list = append(list, sc)
	}
	if list == nil {
		list = []domain.SchoolCounselor{}
	}
	return list, nil
}

func (r *postgresParent) GetAllCounselors(ctx context.Context) ([]domain.SchoolCounselor, error) {
	rows, err := r.db.Query(ctx, `
		SELECT c.id, COALESCE(c.school_id::text, ''), COALESCE(c.branch_id::text, ''),
		       COALESCE(s.name, 'JaagrMind Central'), c.name, c.email, COALESCE(c.phone, ''),
		       c.role, COALESCE(c.branch_name, ''), COALESCE(c.available_hours, ''),
		       c.is_active, c.created_at::text
		FROM school_counselors c
		LEFT JOIN schools s ON s.id = c.school_id
		ORDER BY c.created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []domain.SchoolCounselor
	for rows.Next() {
		var sc domain.SchoolCounselor
		var branchID string
		if err := rows.Scan(
			&sc.ID, &sc.SchoolID, &branchID,
			&sc.SchoolName, &sc.Name, &sc.Email, &sc.Phone,
			&sc.Role, &sc.BranchName, &sc.AvailableHours,
			&sc.IsActive, &sc.CreatedAt,
		); err != nil {
			return nil, err
		}
		sc.BranchID = branchID
		list = append(list, sc)
	}
	if list == nil {
		list = []domain.SchoolCounselor{}
	}
	return list, nil
}

func (r *postgresParent) AddSchoolCounselor(ctx context.Context, c domain.SchoolCounselor) (*domain.SchoolCounselor, error) {
	var created domain.SchoolCounselor
	var branchID string
	err := r.db.QueryRow(ctx, `
		INSERT INTO school_counselors (
			school_id, branch_id, name, email, phone, role, branch_name, available_hours, is_active, created_at, updated_at
		) VALUES (
			NULLIF($1, '')::uuid, NULLIF($2, '')::uuid, $3, $4, $5, $6, $7, $8, true, NOW(), NOW()
		)
		RETURNING id, COALESCE(school_id::text, ''), COALESCE(branch_id::text, ''), name, email, COALESCE(phone, ''),
		          role, COALESCE(branch_name, ''), COALESCE(available_hours, ''), is_active, created_at::text
	`, c.SchoolID, c.BranchID, c.Name, c.Email, c.Phone, c.Role, c.BranchName, c.AvailableHours).Scan(
		&created.ID, &created.SchoolID, &branchID, &created.Name, &created.Email, &created.Phone,
		&created.Role, &created.BranchName, &created.AvailableHours, &created.IsActive, &created.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	created.BranchID = branchID
	return &created, nil
}

func (r *postgresParent) UpdateSchoolCounselor(ctx context.Context, counselorID, schoolID string, c domain.SchoolCounselor) (*domain.SchoolCounselor, error) {
	var updated domain.SchoolCounselor
	var branchID string
	err := r.db.QueryRow(ctx, `
		UPDATE school_counselors 
		SET name = $3,
		    email = $4,
		    phone = $5,
		    role = $6,
		    branch_name = $7,
		    available_hours = $8,
		    is_active = $9,
		    branch_id = NULLIF($10, '')::uuid,
		    updated_at = NOW()
		WHERE id = $1::uuid AND (school_id = $2::uuid OR branch_id = $2::uuid OR school_id IN (SELECT id FROM schools WHERE parent_school_id = $2::uuid))
		RETURNING id, school_id, COALESCE(branch_id::text, ''), name, email, COALESCE(phone, ''),
		          role, COALESCE(branch_name, ''), COALESCE(available_hours, ''), is_active, created_at::text
	`, counselorID, schoolID, c.Name, c.Email, c.Phone, c.Role, c.BranchName, c.AvailableHours, c.IsActive, c.BranchID).Scan(
		&updated.ID, &updated.SchoolID, &branchID, &updated.Name, &updated.Email, &updated.Phone,
		&updated.Role, &updated.BranchName, &updated.AvailableHours, &updated.IsActive, &updated.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	updated.BranchID = branchID
	return &updated, nil
}

func (r *postgresParent) DeleteSchoolCounselor(ctx context.Context, counselorID, schoolID string) error {
	_, err := r.db.Exec(ctx, `
		DELETE FROM school_counselors 
		WHERE id = $1::uuid AND (school_id = $2::uuid OR branch_id = $2::uuid OR school_id IN (SELECT id FROM schools WHERE parent_school_id = $2::uuid))
	`, counselorID, schoolID)
	return err
}

func (r *postgresParent) GetParentInquiriesForSuperAdmin(ctx context.Context) ([]domain.ParentInquiry, error) {
	rows, err := r.db.Query(ctx, `
		SELECT p.id, p.parent_id, p.student_id, p.student_name,
		       COALESCE(p.school_id::text, ''), COALESCE(s.name, 'Independent / No School'),
		       COALESCE(p.counselor_id::text, ''), COALESCE(sc.name, 'JaagrMind Central Care Specialist'),
		       p.counselor_type, p.target_recipient,
		       p.parent_name, p.parent_email, p.subject, p.message, p.status,
		       COALESCE(p.resolution_notes, ''), p.created_at::text,
		       COALESCE(p.meeting_date, ''), COALESCE(p.meeting_time, ''), COALESCE(p.meeting_link, '')
		FROM parent_counselor_inquiries p
		LEFT JOIN schools s ON s.id = p.school_id
		LEFT JOIN school_counselors sc ON sc.id = p.counselor_id
		ORDER BY p.created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []domain.ParentInquiry
	for rows.Next() {
		var inq domain.ParentInquiry
		var schoolID, counselorID string
		if err := rows.Scan(
			&inq.ID, &inq.ParentID, &inq.StudentID, &inq.StudentName,
			&schoolID, &inq.SchoolName,
			&counselorID, &inq.CounselorName,
			&inq.CounselorType, &inq.TargetRecipient,
			&inq.ParentName, &inq.ParentEmail, &inq.Subject, &inq.Message, &inq.Status,
			&inq.ResolutionNotes, &inq.CreatedAt,
			&inq.MeetingDate, &inq.MeetingTime, &inq.MeetingLink,
		); err != nil {
			return nil, err
		}
		inq.SchoolID = schoolID
		inq.CounselorID = counselorID
		list = append(list, inq)
	}
	if list == nil {
		list = []domain.ParentInquiry{}
	}
	return list, nil
}

func (r *postgresParent) GetParentInquiriesForSchool(ctx context.Context, schoolID string) ([]domain.ParentInquiry, error) {
	rows, err := r.db.Query(ctx, `
		SELECT p.id, p.parent_id, p.student_id, p.student_name,
		       COALESCE(p.school_id::text, ''), COALESCE(s.name, ''),
		       COALESCE(p.counselor_id::text, ''), COALESCE(sc.name, 'School Wellness Counselor'),
		       p.counselor_type, p.target_recipient,
		       p.parent_name, p.parent_email, p.subject, p.message, p.status,
		       COALESCE(p.resolution_notes, ''), p.created_at::text,
		       COALESCE(p.meeting_date, ''), COALESCE(p.meeting_time, ''), COALESCE(p.meeting_link, '')
		FROM parent_counselor_inquiries p
		LEFT JOIN schools s ON s.id = p.school_id
		LEFT JOIN school_counselors sc ON sc.id = p.counselor_id
		WHERE p.school_id = $1::uuid OR p.school_id IN (SELECT id FROM schools WHERE parent_school_id = $1::uuid)
		ORDER BY p.created_at DESC
	`, schoolID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []domain.ParentInquiry
	for rows.Next() {
		var inq domain.ParentInquiry
		var sID, cID string
		if err := rows.Scan(
			&inq.ID, &inq.ParentID, &inq.StudentID, &inq.StudentName,
			&sID, &inq.SchoolName,
			&cID, &inq.CounselorName,
			&inq.CounselorType, &inq.TargetRecipient,
			&inq.ParentName, &inq.ParentEmail, &inq.Subject, &inq.Message, &inq.Status,
			&inq.ResolutionNotes, &inq.CreatedAt,
			&inq.MeetingDate, &inq.MeetingTime, &inq.MeetingLink,
		); err != nil {
			return nil, err
		}
		inq.SchoolID = sID
		inq.CounselorID = cID
		list = append(list, inq)
	}
	if list == nil {
		list = []domain.ParentInquiry{}
	}
	return list, nil
}

func (r *postgresParent) GetParentInquiriesForParent(ctx context.Context, parentID string) ([]domain.ParentInquiry, error) {
	rows, err := r.db.Query(ctx, `
		SELECT p.id, p.parent_id, p.student_id, p.student_name,
		       COALESCE(p.school_id::text, ''), COALESCE(s.name, 'Independent Care'),
		       COALESCE(p.counselor_id::text, ''), COALESCE(sc.name, 'JaagrMind Wellness Specialist'),
		       p.counselor_type, p.target_recipient,
		       p.parent_name, p.parent_email, p.subject, p.message, p.status,
		       COALESCE(p.resolution_notes, ''), p.created_at::text,
		       COALESCE(p.meeting_date, ''), COALESCE(p.meeting_time, ''), COALESCE(p.meeting_link, '')
		FROM parent_counselor_inquiries p
		LEFT JOIN schools s ON s.id = p.school_id
		LEFT JOIN school_counselors sc ON sc.id = p.counselor_id
		WHERE p.parent_id = $1::uuid
		ORDER BY p.created_at DESC
	`, parentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []domain.ParentInquiry
	for rows.Next() {
		var inq domain.ParentInquiry
		var sID, cID string
		if err := rows.Scan(
			&inq.ID, &inq.ParentID, &inq.StudentID, &inq.StudentName,
			&sID, &inq.SchoolName,
			&cID, &inq.CounselorName,
			&inq.CounselorType, &inq.TargetRecipient,
			&inq.ParentName, &inq.ParentEmail, &inq.Subject, &inq.Message, &inq.Status,
			&inq.ResolutionNotes, &inq.CreatedAt,
			&inq.MeetingDate, &inq.MeetingTime, &inq.MeetingLink,
		); err != nil {
			return nil, err
		}
		inq.SchoolID = sID
		inq.CounselorID = cID
		list = append(list, inq)
	}
	if list == nil {
		list = []domain.ParentInquiry{}
	}
	return list, nil
}

func (r *postgresParent) UpdateSchoolInquiryStatus(ctx context.Context, schoolID, inquiryID, status, resolutionNotes string) error {
	res, err := r.db.Exec(ctx, `
		UPDATE parent_counselor_inquiries
		SET status = $3, resolution_notes = $4, updated_at = NOW()
		WHERE id = $1::uuid AND (school_id = $2::uuid OR school_id IN (SELECT id FROM schools WHERE parent_school_id = $2::uuid))
	`, inquiryID, schoolID, status, resolutionNotes)
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return fmt.Errorf("inquiry not found or not associated with your school")
	}
	return nil
}

func (r *postgresParent) UpdateInquiryStatus(ctx context.Context, inquiryID, status, resolutionNotes string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE parent_counselor_inquiries
		SET status = $2, resolution_notes = $3, updated_at = NOW()
		WHERE id = $1::uuid
	`, inquiryID, status, resolutionNotes)
	return err
}

func (r *postgresParent) UpdateSuperAdminInquiryStatus(ctx context.Context, inquiryID, status, resolutionNotes string) error {
	var targetRecipient, counselorType string
	err := r.db.QueryRow(ctx, `
		SELECT target_recipient, counselor_type FROM parent_counselor_inquiries WHERE id = $1::uuid
	`, inquiryID).Scan(&targetRecipient, &counselorType)
	if err != nil {
		return fmt.Errorf("inquiry not found")
	}

	if targetRecipient == "school_counselor" || counselorType == "school_counselor" {
		return fmt.Errorf("JaagrMind administrators have view-only access to inquiries routed to school counselors")
	}

	_, err = r.db.Exec(ctx, `
		UPDATE parent_counselor_inquiries
		SET status = $2, resolution_notes = $3, updated_at = NOW()
		WHERE id = $1::uuid
	`, inquiryID, status, resolutionNotes)
	return err
}

func (r *postgresParent) UpdateInquiryMeeting(ctx context.Context, inquiryID, meetingDate, meetingTime, meetingLink string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE parent_counselor_inquiries
		SET meeting_date = $2, meeting_time = $3, meeting_link = $4, updated_at = NOW()
		WHERE id = $1::uuid
	`, inquiryID, meetingDate, meetingTime, meetingLink)
	return err
}

func (r *postgresParent) GetInquiryMessages(ctx context.Context, inquiryID string) ([]domain.InquiryMessage, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, inquiry_id, COALESCE(sender_id::text, ''), sender_name, sender_role, message, created_at::text
		FROM inquiry_messages
		WHERE inquiry_id = $1::uuid
		ORDER BY created_at ASC
	`, inquiryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []domain.InquiryMessage
	for rows.Next() {
		var m domain.InquiryMessage
		if err := rows.Scan(
			&m.ID, &m.InquiryID, &m.SenderID, &m.SenderName, &m.SenderRole, &m.Message, &m.CreatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, m)
	}
	if list == nil {
		list = []domain.InquiryMessage{}
	}
	return list, nil
}

func (r *postgresParent) AddInquiryMessage(ctx context.Context, inquiryID, senderID, senderName, senderRole, message string) (*domain.InquiryMessage, error) {
	var m domain.InquiryMessage
	err := r.db.QueryRow(ctx, `
		INSERT INTO inquiry_messages (inquiry_id, sender_id, sender_name, sender_role, message, created_at)
		VALUES ($1::uuid, NULLIF($2, '')::uuid, $3, $4, $5, NOW())
		RETURNING id, inquiry_id, COALESCE(sender_id::text, ''), sender_name, sender_role, message, created_at::text
	`, inquiryID, senderID, senderName, senderRole, message).Scan(
		&m.ID, &m.InquiryID, &m.SenderID, &m.SenderName, &m.SenderRole, &m.Message, &m.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	// Update inquiry status and updated_at
	if senderRole == "counselor" || senderRole == "jaagrmind_counselor" {
		_, _ = r.db.Exec(ctx, `
			UPDATE parent_counselor_inquiries 
			SET status = 'in_progress', resolution_notes = $2, updated_at = NOW() 
			WHERE id = $1::uuid
		`, inquiryID, message)
	} else {
		_, _ = r.db.Exec(ctx, `
			UPDATE parent_counselor_inquiries 
			SET updated_at = NOW() 
			WHERE id = $1::uuid
		`, inquiryID)
	}

	return &m, nil
}

func (r *postgresParent) SubmitStudentCheckin(ctx context.Context, parentID string, req domain.ParentSubmitCheckinRequest) (*domain.ParentSubmitCheckinResponse, error) {
	// 1. Verify parent owns this child
	var studentID string
	var schoolID *string
	err := r.db.QueryRow(ctx, `
		SELECT ps.student_id, s.school_id::text
		FROM parent_students ps
		JOIN students s ON s.id = ps.student_id
		WHERE ps.parent_id = $1::uuid AND ps.student_id = $2::uuid
	`, parentID, req.StudentID).Scan(&studentID, &schoolID)
	if err != nil {
		return nil, fmt.Errorf("child not linked to parent profile")
	}

	// 2. Fetch assessment
	var title string
	var questionsJSON []byte
	err = r.db.QueryRow(ctx, `
		SELECT title, questions FROM assessments WHERE id = $1::uuid
	`, req.AssessmentID).Scan(&title, &questionsJSON)
	if err != nil {
		return nil, fmt.Errorf("assessment not found")
	}

	var questions []struct {
		Section string `json:"section"`
		Options []struct {
			Marks int `json:"marks"`
		} `json:"options"`
	}
	_ = json.Unmarshal(questionsJSON, &questions)

	// 3. Compute score and section scores
	totalScore := 0
	maxPossibleScore := len(questions) * 4
	if maxPossibleScore == 0 {
		maxPossibleScore = 40
	}
	sectionScores := map[string]int{"A": 0, "B": 0, "C": 0, "D": 0}

	for _, ans := range req.Answers {
		qIdx := 0
		if ans.QuestionIndex != nil {
			qIdx = *ans.QuestionIndex
		}
		if qIdx >= 0 && qIdx < len(questions) {
			sec := questions[qIdx].Section
			if sec == "" {
				sec = "A"
			}
			marks := 0
			if ans.SelectedOption != nil && *ans.SelectedOption >= 0 && *ans.SelectedOption < len(questions[qIdx].Options) {
				marks = questions[qIdx].Options[*ans.SelectedOption].Marks
			} else if ans.Value != nil {
				marks = *ans.Value
			}
			totalScore += marks
			sectionScores[sec] += marks
		}
	}

	percentage := 0
	if maxPossibleScore > 0 {
		percentage = int((float64(totalScore) / float64(maxPossibleScore)) * 100)
		if percentage > 100 {
			percentage = 100
		}
	}

	assignedBucket := "Skill Stable"
	if percentage >= 70 {
		assignedBucket = "Sprinter (High Resilience)"
	} else if percentage >= 50 {
		assignedBucket = "Pacer (Steady Progress)"
	} else {
		assignedBucket = "Seeker (Support Recommended)"
	}

	secScoresJSON, _ := json.Marshal(sectionScores)
	secBuckets := map[string]string{
		"A": "Focus & Attention: Healthy",
		"B": "Confidence & Routine: Balanced",
		"C": "Social Connectedness: Active",
		"D": "Digital Balance: Regulated",
	}
	secBucketsJSON, _ := json.Marshal(secBuckets)
	answersJSON, _ := json.Marshal(req.Answers)

	// 4. Save into student_results (ALWAYS INSERT to preserve full longitudinal attempt history)
	scIDStr := ""
	if schoolID != nil {
		scIDStr = *schoolID
	}

	_, err = r.db.Exec(ctx, `
		INSERT INTO student_results (
			student_id, school_id, assessment_id, status,
			total_score, section_scores, section_buckets,
			assigned_bucket, answers, time_taken, origin, completed_at
		) VALUES (
			$1::uuid, CASE WHEN $2 = '' THEN NULL ELSE $2::uuid END, $3::uuid, 'complete',
			$4, $5, $6,
			$7, $8, $9, 'parent', NOW()
		)
	`, req.StudentID, scIDStr, req.AssessmentID, percentage, secScoresJSON, secBucketsJSON, assignedBucket, answersJSON, req.TimeTaken)

	if err != nil {
		return nil, fmt.Errorf("failed to record check-in results: %w", err)
	}

	return &domain.ParentSubmitCheckinResponse{
		Success:        true,
		Score:          percentage,
		AssignedBucket: assignedBucket,
		Message:        fmt.Sprintf("Check-in for '%s' recorded successfully!", title),
	}, nil
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}


