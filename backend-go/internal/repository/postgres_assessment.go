package repository

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jaagrmind/platform-api/internal/core/domain"
)

type postgresAssessment struct {
	db *pgxpool.Pool
}

func NewPostgresAssessment(db *pgxpool.Pool) domain.AssessmentRepository {
	return &postgresAssessment{db: db}
}

func (r *postgresAssessment) scanAssessment(row pgx.Row) (domain.Assessment, error) {
	var a domain.Assessment
	var questionsRaw, bucketsRaw, customSectionsRaw, sectionsRaw []byte

	err := row.Scan(
		&a.ID,
		&a.Title,
		&a.Description,
		&a.IsDefault,
		&a.TimePerQuestion,
		&a.TotalTime,
		&a.InactivityAlertTime,
		&a.InactivityEndTime,
		&questionsRaw,
		&bucketsRaw,
		&a.SectionBuckets,
		&customSectionsRaw,
		&sectionsRaw,
		&a.IsActive,
		&a.Tier,
		&a.MinGrade,
		&a.MaxGrade,
		&a.TargetGrades,
		&a.CreatedAt,
	)
	if err != nil {
		return a, err
	}

	a.AltID = a.ID

	if len(questionsRaw) > 0 {
		_ = json.Unmarshal(questionsRaw, &a.Questions)
		var qArr []interface{}
		if err := json.Unmarshal(questionsRaw, &qArr); err == nil {
			a.QuestionCount = len(qArr)
		}
	} else {
		a.Questions = []interface{}{}
	}

	if len(bucketsRaw) > 0 {
		_ = json.Unmarshal(bucketsRaw, &a.Buckets)
	} else {
		a.Buckets = []interface{}{}
	}

	if len(customSectionsRaw) > 0 {
		_ = json.Unmarshal(customSectionsRaw, &a.CustomSections)
	} else {
		a.CustomSections = []interface{}{}
	}

	if len(sectionsRaw) > 0 {
		_ = json.Unmarshal(sectionsRaw, &a.Sections)
	} else {
		a.Sections = []interface{}{}
	}

	return a, nil
}

func (r *postgresAssessment) GetActiveAssessments(ctx context.Context) ([]domain.Assessment, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, title, coalesce(description, ''), coalesce(is_default, false), 
		       coalesce(time_per_question, 30), coalesce(total_time, 15), 
		       coalesce(inactivity_alert_time, 40), coalesce(inactivity_end_time, 120),
		       questions, buckets, coalesce(section_buckets, true), custom_sections, sections,
		       coalesce(is_active, true),
		       coalesce(tier, 'all'), coalesce(min_grade, 1), coalesce(max_grade, 12),
		       coalesce(target_grades, ARRAY['6','7','8','9','10','11','12']),
		       created_at
		FROM assessments WHERE coalesce(is_active, true) = true
		ORDER BY coalesce(is_default, false) DESC, created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var assessments []domain.Assessment
	for rows.Next() {
		a, err := r.scanAssessment(rows)
		if err != nil {
			return nil, err
		}
		assessments = append(assessments, a)
	}
	return assessments, nil
}

func (r *postgresAssessment) GetAll(ctx context.Context) ([]domain.Assessment, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, title, coalesce(description, ''), coalesce(is_default, false), 
		       coalesce(time_per_question, 30), coalesce(total_time, 15), 
		       coalesce(inactivity_alert_time, 40), coalesce(inactivity_end_time, 120),
		       questions, buckets, coalesce(section_buckets, true), custom_sections, sections,
		       coalesce(is_active, true),
		       coalesce(tier, 'all'), coalesce(min_grade, 1), coalesce(max_grade, 12),
		       coalesce(target_grades, ARRAY['6','7','8','9','10','11','12']),
		       created_at
		FROM assessments 
		ORDER BY coalesce(is_default, false) DESC, created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var assessments []domain.Assessment
	for rows.Next() {
		a, err := r.scanAssessment(rows)
		if err != nil {
			return nil, err
		}
		assessments = append(assessments, a)
	}
	return assessments, nil
}

func (r *postgresAssessment) GetByID(ctx context.Context, id string) (*domain.Assessment, error) {
	row := r.db.QueryRow(ctx, `
		SELECT id, title, coalesce(description, ''), coalesce(is_default, false), 
		       coalesce(time_per_question, 30), coalesce(total_time, 15), 
		       coalesce(inactivity_alert_time, 40), coalesce(inactivity_end_time, 120),
		       questions, buckets, coalesce(section_buckets, true), custom_sections, sections,
		       coalesce(is_active, true),
		       coalesce(tier, 'all'), coalesce(min_grade, 1), coalesce(max_grade, 12),
		       coalesce(target_grades, ARRAY['6','7','8','9','10','11','12']),
		       created_at
		FROM assessments 
		WHERE id = $1
	`, id)

	a, err := r.scanAssessment(row)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *postgresAssessment) GetDefault(ctx context.Context) (*domain.Assessment, error) {
	row := r.db.QueryRow(ctx, `
		SELECT id, title, coalesce(description, ''), coalesce(is_default, false), 
		       coalesce(time_per_question, 30), coalesce(total_time, 15), 
		       coalesce(inactivity_alert_time, 40), coalesce(inactivity_end_time, 120),
		       questions, buckets, coalesce(section_buckets, true), custom_sections, sections,
		       coalesce(is_active, true),
		       coalesce(tier, 'all'), coalesce(min_grade, 1), coalesce(max_grade, 12),
		       coalesce(target_grades, ARRAY['6','7','8','9','10','11','12']),
		       created_at
		FROM assessments 
		WHERE is_default = true AND coalesce(is_active, true) = true
		LIMIT 1
	`)

	a, err := r.scanAssessment(row)
	if err != nil {
		return nil, err
	}
	return &a, nil
}

func (r *postgresAssessment) Create(ctx context.Context, req domain.Assessment) (*domain.Assessment, error) {
	questionsJSON, _ := json.Marshal(req.Questions)
	if req.Questions == nil {
		questionsJSON = []byte("[]")
	}
	bucketsJSON, _ := json.Marshal(req.Buckets)
	if req.Buckets == nil {
		bucketsJSON = []byte("[]")
	}
	customSectionsJSON, _ := json.Marshal(req.CustomSections)
	if req.CustomSections == nil {
		customSectionsJSON = []byte("[]")
	}
	sectionsJSON, _ := json.Marshal(req.Sections)
	if req.Sections == nil {
		sectionsJSON = []byte("[]")
	}

	inactivityAlert := req.InactivityAlertTime
	if inactivityAlert <= 0 {
		inactivityAlert = 40
	}
	inactivityEnd := req.InactivityEndTime
	if inactivityEnd <= 0 {
		inactivityEnd = 120
	}

	tier := req.Tier
	if tier == "" {
		tier = "all"
	}
	minGrade := req.MinGrade
	if minGrade <= 0 {
		minGrade = 1
	}
	maxGrade := req.MaxGrade
	if maxGrade <= 0 {
		maxGrade = 12
	}
	targetGrades := req.TargetGrades
	if len(targetGrades) == 0 {
		targetGrades = []string{"6", "7", "8", "9", "10", "11", "12"}
	}

	var newID string
	err := r.db.QueryRow(ctx, `
		INSERT INTO assessments (
			title, description, is_default, time_per_question, total_time,
			inactivity_alert_time, inactivity_end_time, questions, buckets,
			section_buckets, custom_sections, sections, is_active,
			tier, min_grade, max_grade, target_grades
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
		RETURNING id
	`, req.Title, req.Description, req.IsDefault, req.TimePerQuestion, req.TotalTime,
		inactivityAlert, inactivityEnd, questionsJSON, bucketsJSON,
		req.SectionBuckets, customSectionsJSON, sectionsJSON, req.IsActive,
		tier, minGrade, maxGrade, targetGrades,
	).Scan(&newID)

	if err != nil {
		return nil, err
	}

	return r.GetByID(ctx, newID)
}

func (r *postgresAssessment) Update(ctx context.Context, id string, req domain.Assessment) (*domain.Assessment, error) {
	questionsJSON, _ := json.Marshal(req.Questions)
	if req.Questions == nil {
		questionsJSON = []byte("[]")
	}
	bucketsJSON, _ := json.Marshal(req.Buckets)
	if req.Buckets == nil {
		bucketsJSON = []byte("[]")
	}
	customSectionsJSON, _ := json.Marshal(req.CustomSections)
	if req.CustomSections == nil {
		customSectionsJSON = []byte("[]")
	}
	sectionsJSON, _ := json.Marshal(req.Sections)
	if req.Sections == nil {
		sectionsJSON = []byte("[]")
	}

	inactivityAlert := req.InactivityAlertTime
	if inactivityAlert <= 0 {
		inactivityAlert = 40
	}
	inactivityEnd := req.InactivityEndTime
	if inactivityEnd <= 0 {
		inactivityEnd = 120
	}
	timePerQuestion := req.TimePerQuestion
	if timePerQuestion <= 0 {
		timePerQuestion = 30
	}
	totalTime := req.TotalTime
	if totalTime <= 0 {
		totalTime = 600
	}

	tier := req.Tier
	if tier == "" {
		tier = "all"
	}
	minGrade := req.MinGrade
	if minGrade <= 0 {
		minGrade = 1
	}
	maxGrade := req.MaxGrade
	if maxGrade <= 0 {
		maxGrade = 12
	}
	targetGrades := req.TargetGrades
	if len(targetGrades) == 0 {
		targetGrades = []string{"6", "7", "8", "9", "10", "11", "12"}
	}

	_, err := r.db.Exec(ctx, `
		UPDATE assessments
		SET title = $1, description = $2, questions = $3, buckets = $4,
		    custom_sections = $5, sections = $6, is_active = $7,
		    inactivity_alert_time = $8, inactivity_end_time = $9,
		    time_per_question = $10, total_time = $11, section_buckets = $12,
		    tier = $13, min_grade = $14, max_grade = $15, target_grades = $16
		WHERE id = $17
	`, req.Title, req.Description, questionsJSON, bucketsJSON,
		customSectionsJSON, sectionsJSON, req.IsActive,
		inactivityAlert, inactivityEnd, timePerQuestion, totalTime, req.SectionBuckets,
		tier, minGrade, maxGrade, targetGrades, id,
	)
	if err != nil {
		return nil, err
	}

	return r.GetByID(ctx, id)
}

func (r *postgresAssessment) Delete(ctx context.Context, id string) error {
	// Check if there are any submissions for this assessment
	var count int
	_ = r.db.QueryRow(ctx, "SELECT count(*) FROM student_results WHERE assessment_id = $1", id).Scan(&count)
	if count > 0 {
		// Soft delete if submissions exist
		_, err := r.db.Exec(ctx, "UPDATE assessments SET is_active = false WHERE id = $1", id)
		return err
	}

	// Hard delete
	_, err := r.db.Exec(ctx, "DELETE FROM assessments WHERE id = $1", id)
	return err
}

func (r *postgresAssessment) SetDefault(ctx context.Context, id string) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(ctx, "UPDATE assessments SET is_default = false WHERE is_default = true")
	if err != nil {
		return err
	}

	_, err = tx.Exec(ctx, "UPDATE assessments SET is_default = true, is_active = true WHERE id = $1", id)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (r *postgresAssessment) SubmitResult(ctx context.Context, result domain.StudentResult) error {
	answersJSON, _ := json.Marshal(result.Answers)
	moodJSON, _ := json.Marshal(result.Mood)
	sectionScoresJSON, _ := json.Marshal(result.SectionScores)
	sectionBucketsJSON, _ := json.Marshal(result.SectionBuckets)
	diagJSON, _ := json.Marshal(result.BehavioralDiagnostics)
	if len(diagJSON) == 0 {
		diagJSON = []byte("{}")
	}

	origin := result.Origin
	if origin == "" {
		origin = "school"
	}

	_, err := r.db.Exec(ctx, `
		INSERT INTO student_results (
			student_id, school_id, assessment_id, status, total_score,
			section_scores, section_buckets, primary_skill_area, secondary_skill_area,
			assigned_bucket, answers, mood, time_taken, behavioral_diagnostics,
			pathway_track_id, pathway_track_name, primary_bucket, secondary_bucket, is_balance_mode, origin
		)
		VALUES ($1, NULLIF($2, '')::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
	`, result.StudentID, result.SchoolID, result.AssessmentID, result.Status, result.TotalScore,
		sectionScoresJSON, sectionBucketsJSON, result.PrimarySkillArea, result.SecondarySkillArea,
		result.AssignedBucket, answersJSON, moodJSON, result.TimeTaken, diagJSON,
		result.PathwayTrackID, result.PathwayTrackName, result.PrimaryBucket, result.SecondaryBucket, result.IsBalanceMode, origin)
	return err
}

func (r *postgresAssessment) GetResultsBySchool(ctx context.Context, schoolID string) ([]domain.StudentResult, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, student_id, school_id, assessment_id, coalesce(status, 'complete'),
		       coalesce(total_score, 0), section_scores, section_buckets,
		       coalesce(primary_skill_area, ''), coalesce(secondary_skill_area, ''),
		       coalesce(assigned_bucket, ''), answers, mood, coalesce(time_taken, 0),
		       coalesce(behavioral_diagnostics, '{}'::jsonb), completed_at
		FROM student_results
		WHERE school_id = $1
		ORDER BY completed_at DESC
	`, schoolID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []domain.StudentResult
	for rows.Next() {
		var sr domain.StudentResult
		var sectionScoresRaw, sectionBucketsRaw, answersRaw, moodRaw, diagRaw []byte

		err := rows.Scan(
			&sr.ID, &sr.StudentID, &sr.SchoolID, &sr.AssessmentID, &sr.Status,
			&sr.TotalScore, &sectionScoresRaw, &sectionBucketsRaw,
			&sr.PrimarySkillArea, &sr.SecondarySkillArea, &sr.AssignedBucket,
			&answersRaw, &moodRaw, &sr.TimeTaken, &diagRaw, &sr.CompletedAt,
		)
		if err != nil {
			return nil, err
		}

		_ = json.Unmarshal(sectionScoresRaw, &sr.SectionScores)
		_ = json.Unmarshal(sectionBucketsRaw, &sr.SectionBuckets)
		_ = json.Unmarshal(answersRaw, &sr.Answers)
		_ = json.Unmarshal(moodRaw, &sr.Mood)
		_ = json.Unmarshal(diagRaw, &sr.BehavioralDiagnostics)

		results = append(results, sr)
	}
	return results, nil
}

func (r *postgresAssessment) GetResultsByStudent(ctx context.Context, studentID, assessmentID string) ([]domain.StudentResult, error) {
	var query string
	var args []interface{}
	if assessmentID == "" || assessmentID == "all" {
		query = `
			SELECT sr.id, sr.student_id, COALESCE(sr.school_id::text, ''), sr.assessment_id, COALESCE(sr.status, 'complete'),
			       COALESCE(sr.total_score, 0), sr.section_scores, sr.section_buckets,
			       COALESCE(sr.primary_skill_area, ''), COALESCE(sr.secondary_skill_area, ''),
			       COALESCE(sr.assigned_bucket, ''), sr.answers, sr.mood, COALESCE(sr.time_taken, 0),
			       COALESCE(sr.behavioral_diagnostics, '{}'::jsonb), COALESCE(sr.origin, 'school'),
			       COALESCE(sc.name, ''), sr.completed_at
			FROM student_results sr
			LEFT JOIN schools sc ON sc.id = sr.school_id
			WHERE sr.student_id = $1
			ORDER BY sr.completed_at DESC
		`
		args = []interface{}{studentID}
	} else {
		query = `
			SELECT sr.id, sr.student_id, COALESCE(sr.school_id::text, ''), sr.assessment_id, COALESCE(sr.status, 'complete'),
			       COALESCE(sr.total_score, 0), sr.section_scores, sr.section_buckets,
			       COALESCE(sr.primary_skill_area, ''), COALESCE(sr.secondary_skill_area, ''),
			       COALESCE(sr.assigned_bucket, ''), sr.answers, sr.mood, COALESCE(sr.time_taken, 0),
			       COALESCE(sr.behavioral_diagnostics, '{}'::jsonb), COALESCE(sr.origin, 'school'),
			       COALESCE(sc.name, ''), sr.completed_at
			FROM student_results sr
			LEFT JOIN schools sc ON sc.id = sr.school_id
			WHERE sr.student_id = $1 AND sr.assessment_id = $2::uuid
			ORDER BY sr.completed_at DESC
		`
		args = []interface{}{studentID, assessmentID}
	}

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []domain.StudentResult
	for rows.Next() {
		var sr domain.StudentResult
		var sectionScoresRaw, sectionBucketsRaw, answersRaw, moodRaw, diagRaw []byte

		err := rows.Scan(
			&sr.ID, &sr.StudentID, &sr.SchoolID, &sr.AssessmentID, &sr.Status,
			&sr.TotalScore, &sectionScoresRaw, &sectionBucketsRaw,
			&sr.PrimarySkillArea, &sr.SecondarySkillArea, &sr.AssignedBucket,
			&answersRaw, &moodRaw, &sr.TimeTaken, &diagRaw, &sr.Origin, &sr.SchoolName, &sr.CompletedAt,
		)
		if err != nil {
			return nil, err
		}

		_ = json.Unmarshal(sectionScoresRaw, &sr.SectionScores)
		_ = json.Unmarshal(sectionBucketsRaw, &sr.SectionBuckets)
		_ = json.Unmarshal(answersRaw, &sr.Answers)
		_ = json.Unmarshal(moodRaw, &sr.Mood)
		_ = json.Unmarshal(diagRaw, &sr.BehavioralDiagnostics)

		results = append(results, sr)
	}
	return results, nil
}

func (r *postgresAssessment) ResetStudentAttempt(ctx context.Context, studentID, assessmentID string) error {
	_, err := r.db.Exec(ctx, `
		DELETE FROM student_results
		WHERE student_id = $1 AND assessment_id = $2::uuid
	`, studentID, assessmentID)
	return err
}

func (r *postgresAssessment) AssignTest(ctx context.Context, schoolID, assessmentID string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE schools
		SET assigned_tests = array_append(coalesce(assigned_tests, '{}'), $1::uuid)
		WHERE id = $2 AND NOT ($1::uuid = ANY(coalesce(assigned_tests, '{}')))
	`, assessmentID, schoolID)
	return err
}

func (r *postgresAssessment) GetAssignedTests(ctx context.Context, schoolID string) ([]domain.Assessment, error) {
	// First get assigned_tests array from schools
	var assignedUUIDs []string
	err := r.db.QueryRow(ctx, "SELECT assigned_tests FROM schools WHERE id = $1", schoolID).Scan(&assignedUUIDs)
	if err != nil || len(assignedUUIDs) == 0 {
		// Fallback to all active assessments or default assessment
		return r.GetActiveAssessments(ctx)
	}

	rows, err := r.db.Query(ctx, `
		SELECT id, title, coalesce(description, ''), coalesce(is_default, false), 
		       coalesce(time_per_question, 30), coalesce(total_time, 15), 
		       coalesce(inactivity_alert_time, 40), coalesce(inactivity_end_time, 120),
		       questions, buckets, coalesce(section_buckets, true), custom_sections, sections,
		       coalesce(is_active, true),
		       coalesce(tier, 'all'), coalesce(min_grade, 1), coalesce(max_grade, 12),
		       coalesce(target_grades, ARRAY['6','7','8','9','10','11','12']),
		       created_at
		FROM assessments
		WHERE id = ANY($1::uuid[]) AND coalesce(is_active, true) = true
		ORDER BY coalesce(is_default, false) DESC, created_at DESC
	`, assignedUUIDs)
	if err != nil {
		return r.GetActiveAssessments(ctx)
	}
	defer rows.Close()

	var assessments []domain.Assessment
	for rows.Next() {
		a, err := r.scanAssessment(rows)
		if err != nil {
			return nil, err
		}
		assessments = append(assessments, a)
	}

	if len(assessments) == 0 {
		return r.GetActiveAssessments(ctx)
	}

	return assessments, nil
}

func (r *postgresAssessment) GetSchoolAssignments(ctx context.Context, assessmentID string) ([]domain.SchoolAssessmentAssignment, error) {
	rows, err := r.db.Query(ctx, `
		SELECT s.id, s.name, s.school_code, coalesce(s.city, ''),
		       ($1::uuid = ANY(coalesce(s.assigned_tests, '{}'))) as is_assigned,
		       coalesce(sr.recent_count, 0) as recent_attempts,
		       sr.last_date as last_attempt_date
		FROM schools s
		LEFT JOIN (
			SELECT school_id, count(*) as recent_count, max(completed_at) as last_date
			FROM student_results
			WHERE assessment_id = $1::uuid AND completed_at >= NOW() - INTERVAL '30 days'
			GROUP BY school_id
		) sr ON s.id = sr.school_id
		WHERE coalesce(s.is_active, true) = true
		ORDER BY s.name ASC
	`, assessmentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []domain.SchoolAssessmentAssignment
	for rows.Next() {
		var item domain.SchoolAssessmentAssignment
		if err := rows.Scan(&item.SchoolID, &item.SchoolName, &item.SchoolCode, &item.City, &item.IsAssigned, &item.RecentAttempts, &item.LastAttemptDate); err != nil {
			return nil, err
		}
		list = append(list, item)
	}
	if list == nil {
		list = []domain.SchoolAssessmentAssignment{}
	}
	return list, nil
}

func (r *postgresAssessment) AssignAssessmentToSchools(ctx context.Context, assessmentID string, schoolIDs []string, reassign bool) error {
	if len(schoolIDs) == 0 {
		return nil
	}
	_, err := r.db.Exec(ctx, `
		UPDATE schools
		SET assigned_tests = array_append(coalesce(assigned_tests, '{}'), $1::uuid)
		WHERE id = ANY($2::uuid[]) AND NOT ($1::uuid = ANY(coalesce(assigned_tests, '{}')))
	`, assessmentID, schoolIDs)
	if err != nil {
		return err
	}

	if reassign {
		_, err = r.db.Exec(ctx, `
			UPDATE student_results
			SET status = 'archived'
			WHERE assessment_id = $1::uuid AND school_id = ANY($2::uuid[]) AND coalesce(status, 'complete') = 'complete'
		`, assessmentID, schoolIDs)
		return err
	}
	return nil
}

func (r *postgresAssessment) CheckRecentCompletions(ctx context.Context, schoolID, assessmentID string, targetType string, targetClass string, targetSection string, studentIDs []string) ([]domain.StudentRecentAttempt, error) {
	var query string
	var args []interface{}

	query = `
		SELECT st.id, st.name, st.access_id, coalesce(st.grade, ''), coalesce(st.section, ''),
		       sr.completed_at, coalesce(sr.total_score, 0), coalesce(sr.assigned_bucket, '')
		FROM student_results sr
		JOIN students st ON sr.student_id = st.id
		WHERE sr.school_id = $1::uuid AND sr.assessment_id = $2::uuid
		  AND coalesce(sr.status, 'complete') = 'complete'
		  AND sr.completed_at >= NOW() - INTERVAL '30 days'
	`
	args = []interface{}{schoolID, assessmentID}

	if targetType == "class" && targetClass != "" && targetClass != "all" {
		query += " AND (st.grade = $3 OR st.grade = 'Class ' || $3)"
		args = append(args, targetClass)
		if targetSection != "" && targetSection != "all" {
			query += " AND st.section = $4"
			args = append(args, targetSection)
		}
	} else if targetType == "students" && len(studentIDs) > 0 {
		query += " AND st.id = ANY($3::uuid[])"
		args = append(args, studentIDs)
	}

	query += " ORDER BY sr.completed_at DESC"

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var attempts []domain.StudentRecentAttempt
	for rows.Next() {
		var a domain.StudentRecentAttempt
		if err := rows.Scan(&a.StudentID, &a.StudentName, &a.AccessID, &a.Grade, &a.Section, &a.CompletedAt, &a.TotalScore, &a.AssignedBucket); err != nil {
			return nil, err
		}
		attempts = append(attempts, a)
	}
	if attempts == nil {
		attempts = []domain.StudentRecentAttempt{}
	}
	return attempts, nil
}

func (r *postgresAssessment) ArchiveAttemptsForReassignment(ctx context.Context, schoolID, assessmentID string, studentIDs []string) error {
	if len(studentIDs) == 0 {
		_, err := r.db.Exec(ctx, `
			UPDATE student_results
			SET status = 'archived'
			WHERE school_id = $1::uuid AND assessment_id = $2::uuid AND coalesce(status, 'complete') = 'complete'
		`, schoolID, assessmentID)
		return err
	}
	_, err := r.db.Exec(ctx, `
		UPDATE student_results
		SET status = 'archived'
		WHERE school_id = $1::uuid AND assessment_id = $2::uuid AND student_id = ANY($3::uuid[]) AND coalesce(status, 'complete') = 'complete'
	`, schoolID, assessmentID, studentIDs)
	return err
}

