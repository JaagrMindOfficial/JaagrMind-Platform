package repository

import (
	"context"
	"fmt"
	"regexp"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jaagrmind/platform-api/internal/core/domain"
)

type postgresStudent struct {
	db *pgxpool.Pool
}

func NewPostgresStudent(db *pgxpool.Pool) domain.StudentRepository {
	return &postgresStudent{db: db}
}

func (r *postgresStudent) GetAll(ctx context.Context) ([]domain.StudentWithSchool, error) {
	rows, err := r.db.Query(ctx, `
		SELECT s.id, COALESCE(s.school_id::text, ''), COALESCE(sc.name, 'Independent / Direct'), COALESCE(sc.school_code, 'HOME'),
		       s.access_id, COALESCE(s.roll_number, ''), COALESCE(s.stream, ''), s.name, s.grade, COALESCE(s.section, ''),
		       COALESCE(s.mobile_number, ''), COALESCE(s.email, ''), COALESCE(s.academic_year, '2025-2026'), s.is_active, s.created_at
		FROM students s
		LEFT JOIN schools sc ON sc.id = s.school_id
		ORDER BY sc.name ASC, s.grade ASC, s.section ASC, s.name ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var students []domain.StudentWithSchool
	for rows.Next() {
		var s domain.StudentWithSchool
		if err := rows.Scan(
			&s.ID, &s.SchoolID, &s.SchoolName, &s.SchoolCode,
			&s.AccessID, &s.RollNumber, &s.Stream, &s.Name, &s.Grade, &s.Section,
			&s.MobileNumber, &s.Email, &s.AcademicYear, &s.IsActive, &s.CreatedAt,
		); err != nil {
			return nil, err
		}
		students = append(students, s)
	}
	return students, nil
}

func (r *postgresStudent) GetBySchool(ctx context.Context, schoolID string) ([]domain.Student, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, COALESCE(school_id::text, ''), access_id, COALESCE(roll_number, ''), COALESCE(stream, ''), name, grade, COALESCE(section, ''), COALESCE(mobile_number, ''), COALESCE(email, ''), COALESCE(academic_year, '2025-2026'), is_active, created_at
		FROM students WHERE school_id = $1 ORDER BY grade ASC, section ASC, name ASC
	`, schoolID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var students []domain.Student
	for rows.Next() {
		var s domain.Student
		if err := rows.Scan(&s.ID, &s.SchoolID, &s.AccessID, &s.RollNumber, &s.Stream, &s.Name, &s.Grade, &s.Section, &s.MobileNumber, &s.Email, &s.AcademicYear, &s.IsActive, &s.CreatedAt); err != nil {
			return nil, err
		}
		students = append(students, s)
	}
	return students, nil
}

func (r *postgresStudent) GetByID(ctx context.Context, id string) (*domain.Student, error) {
	var s domain.Student
	err := r.db.QueryRow(ctx, `
		SELECT id, COALESCE(school_id::text, ''), access_id, COALESCE(roll_number, ''), COALESCE(stream, ''), name, grade, COALESCE(section, ''), COALESCE(mobile_number, ''), COALESCE(email, ''), COALESCE(academic_year, '2025-2026'), is_active, created_at
		FROM students WHERE id = $1
	`, id).Scan(
		&s.ID, &s.SchoolID, &s.AccessID, &s.RollNumber, &s.Stream, &s.Name, &s.Grade, &s.Section, &s.MobileNumber, &s.Email, &s.AcademicYear, &s.IsActive, &s.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *postgresStudent) GetByAccessID(ctx context.Context, schoolID, accessID string) (*domain.Student, error) {
	var s domain.Student
	err := r.db.QueryRow(ctx, `
		SELECT id, COALESCE(school_id::text, ''), access_id, COALESCE(roll_number, ''), COALESCE(stream, ''), name, grade, COALESCE(section, ''), COALESCE(mobile_number, ''), COALESCE(email, ''), COALESCE(academic_year, '2025-2026'), is_active, created_at
		FROM students WHERE school_id = $1 AND (access_id = $2 OR access_id ILIKE $2)
	`, schoolID, accessID).Scan(
		&s.ID, &s.SchoolID, &s.AccessID, &s.RollNumber, &s.Stream, &s.Name, &s.Grade, &s.Section, &s.MobileNumber, &s.Email, &s.AcademicYear, &s.IsActive, &s.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *postgresStudent) GetByClassAndRoll(ctx context.Context, schoolID, grade, section, rollNumber, stream string) (*domain.Student, error) {
	cleanGrade := strings.TrimSpace(grade)
	cleanSection := strings.ToUpper(strings.TrimSpace(section))
	cleanRoll := strings.TrimSpace(rollNumber)
	cleanStream := strings.TrimSpace(stream)

	var s domain.Student
	err := r.db.QueryRow(ctx, `
		SELECT id, COALESCE(school_id::text, ''), access_id, COALESCE(roll_number, ''), COALESCE(stream, ''), name, grade, COALESCE(section, ''), COALESCE(mobile_number, ''), COALESCE(email, ''), COALESCE(academic_year, '2025-2026'), is_active, created_at
		FROM students
		WHERE school_id = $1::uuid
		  AND (grade = $2 OR grade ILIKE $2 || '%' OR grade = REPLACE($2, 'th', ''))
		  AND ($3 = '' OR section = '' OR section ILIKE $3)
		  AND (roll_number = $4 OR access_id = $4 OR access_id ILIKE '%' || $4)
		  AND ($5 = '' OR stream ILIKE $5)
		LIMIT 1
	`, schoolID, cleanGrade, cleanSection, cleanRoll, cleanStream).Scan(
		&s.ID, &s.SchoolID, &s.AccessID, &s.RollNumber, &s.Stream, &s.Name, &s.Grade, &s.Section, &s.MobileNumber, &s.Email, &s.AcademicYear, &s.IsActive, &s.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *postgresStudent) Create(ctx context.Context, schoolID string, req domain.CreateStudentRequest) (*domain.Student, error) {
	grade := strings.TrimSpace(req.Grade)
	section := strings.ToUpper(strings.TrimSpace(req.Section))
	rollNumber := strings.TrimSpace(req.RollNumber)
	stream := strings.TrimSpace(req.Stream)
	accessID := strings.TrimSpace(req.AccessID)

	// If rollNumber is blank but accessID is provided, extract or use it
	if rollNumber == "" && accessID != "" {
		if strings.Contains(accessID, "-") {
			parts := strings.Split(accessID, "-")
			rollNumber = parts[len(parts)-1]
		} else {
			rollNumber = accessID
		}
	}

	// Auto-generate composite accessID if empty or if equal to bare roll number
	if accessID == "" || accessID == rollNumber {
		if rollNumber != "" {
			cleanGrade := strings.TrimSuffix(strings.ToLower(grade), "th")
			cleanRoll := rollNumber
			var rollInt int
			if _, err := fmt.Sscanf(rollNumber, "%d", &rollInt); err == nil && rollInt > 0 && rollInt < 10 && len(rollNumber) == 1 {
				cleanRoll = fmt.Sprintf("%02d", rollInt)
			}
			if stream != "" {
				streamCode := strings.ToUpper(stream)
				if len(streamCode) > 4 {
					streamCode = streamCode[:4]
				}
				accessID = fmt.Sprintf("%s%s-%s-%s", cleanGrade, section, streamCode, cleanRoll)
			} else {
				accessID = fmt.Sprintf("%s%s-%s", cleanGrade, section, cleanRoll)
			}
		} else {
			var count int
			_ = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM students WHERE school_id = $1`, schoolID).Scan(&count)
			accessID = fmt.Sprintf("R%04d", count+1)
		}
	}

	// Class duplicate roll number check
	if rollNumber != "" && grade != "" && section != "" {
		var existingID string
		err := r.db.QueryRow(ctx, `
			SELECT id::text FROM students
			WHERE school_id = $1 AND grade = $2 AND section = $3 AND roll_number = $4 AND ($5 = '' OR stream = $5)
			LIMIT 1
		`, schoolID, grade, section, rollNumber, stream).Scan(&existingID)
		if err == nil && existingID != "" {
			return nil, fmt.Errorf("student with roll number '%s' already exists in Class %s %s", rollNumber, grade, section)
		}
	}

	ay := req.AcademicYear
	if ay == "" {
		ay = "2025-2026"
	}
	var s domain.Student
	err := r.db.QueryRow(ctx, `
		INSERT INTO students (school_id, access_id, roll_number, stream, name, grade, section, mobile_number, email, academic_year)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, COALESCE(school_id::text, ''), access_id, COALESCE(roll_number, ''), COALESCE(stream, ''), name, grade, COALESCE(section, ''), COALESCE(mobile_number, ''), COALESCE(email, ''), COALESCE(academic_year, '2025-2026'), is_active, created_at
	`, schoolID, accessID, rollNumber, stream, req.Name, grade, section, req.MobileNumber, req.Email, ay).Scan(
		&s.ID, &s.SchoolID, &s.AccessID, &s.RollNumber, &s.Stream, &s.Name, &s.Grade, &s.Section, &s.MobileNumber, &s.Email, &s.AcademicYear, &s.IsActive, &s.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *postgresStudent) Update(ctx context.Context, id string, req domain.CreateStudentRequest) (*domain.Student, error) {
	ay := req.AcademicYear
	if ay == "" {
		ay = "2025-2026"
	}
	grade := strings.TrimSpace(req.Grade)
	section := strings.ToUpper(strings.TrimSpace(req.Section))
	rollNumber := strings.TrimSpace(req.RollNumber)
	stream := strings.TrimSpace(req.Stream)
	accessID := strings.TrimSpace(req.AccessID)

	if rollNumber == "" && accessID != "" {
		if strings.Contains(accessID, "-") {
			parts := strings.Split(accessID, "-")
			rollNumber = parts[len(parts)-1]
		} else {
			rollNumber = accessID
		}
	}

	if accessID == "" || accessID == rollNumber {
		if rollNumber != "" {
			cleanGrade := strings.TrimSuffix(strings.ToLower(grade), "th")
			cleanRoll := rollNumber
			var rollInt int
			if _, err := fmt.Sscanf(rollNumber, "%d", &rollInt); err == nil && rollInt > 0 && rollInt < 10 && len(rollNumber) == 1 {
				cleanRoll = fmt.Sprintf("%02d", rollInt)
			}
			if stream != "" {
				streamCode := strings.ToUpper(stream)
				if len(streamCode) > 4 {
					streamCode = streamCode[:4]
				}
				accessID = fmt.Sprintf("%s%s-%s-%s", cleanGrade, section, streamCode, cleanRoll)
			} else {
				accessID = fmt.Sprintf("%s%s-%s", cleanGrade, section, cleanRoll)
			}
		}
	}

	var s domain.Student
	err := r.db.QueryRow(ctx, `
		UPDATE students
		SET access_id = $1, roll_number = $2, stream = $3, name = $4, grade = $5, section = $6, mobile_number = $7, email = $8, academic_year = $9
		WHERE id = $10
		RETURNING id, COALESCE(school_id::text, ''), access_id, COALESCE(roll_number, ''), COALESCE(stream, ''), name, grade, COALESCE(section, ''), COALESCE(mobile_number, ''), COALESCE(email, ''), COALESCE(academic_year, '2025-2026'), is_active, created_at
	`, accessID, rollNumber, stream, req.Name, grade, section, req.MobileNumber, req.Email, ay, id).Scan(
		&s.ID, &s.SchoolID, &s.AccessID, &s.RollNumber, &s.Stream, &s.Name, &s.Grade, &s.Section, &s.MobileNumber, &s.Email, &s.AcademicYear, &s.IsActive, &s.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *postgresStudent) UpdateScoped(ctx context.Context, id, schoolID string, req domain.CreateStudentRequest) (*domain.Student, error) {
	if schoolID == "" {
		return r.Update(ctx, id, req)
	}
	ay := req.AcademicYear
	if ay == "" {
		ay = "2025-2026"
	}
	grade := strings.TrimSpace(req.Grade)
	section := strings.ToUpper(strings.TrimSpace(req.Section))
	rollNumber := strings.TrimSpace(req.RollNumber)
	stream := strings.TrimSpace(req.Stream)
	accessID := strings.TrimSpace(req.AccessID)

	if rollNumber == "" && accessID != "" {
		if strings.Contains(accessID, "-") {
			parts := strings.Split(accessID, "-")
			rollNumber = parts[len(parts)-1]
		} else {
			rollNumber = accessID
		}
	}

	if accessID == "" || accessID == rollNumber {
		if rollNumber != "" {
			cleanGrade := strings.TrimSuffix(strings.ToLower(grade), "th")
			cleanRoll := rollNumber
			var rollInt int
			if _, err := fmt.Sscanf(rollNumber, "%d", &rollInt); err == nil && rollInt > 0 && rollInt < 10 && len(rollNumber) == 1 {
				cleanRoll = fmt.Sprintf("%02d", rollInt)
			}
			if stream != "" {
				streamCode := strings.ToUpper(stream)
				if len(streamCode) > 4 {
					streamCode = streamCode[:4]
				}
				accessID = fmt.Sprintf("%s%s-%s-%s", cleanGrade, section, streamCode, cleanRoll)
			} else {
				accessID = fmt.Sprintf("%s%s-%s", cleanGrade, section, cleanRoll)
			}
		}
	}

	var s domain.Student
	err := r.db.QueryRow(ctx, `
		UPDATE students
		SET access_id = $1, roll_number = $2, stream = $3, name = $4, grade = $5, section = $6, mobile_number = $7, email = $8, academic_year = $9
		WHERE id = $10 AND school_id = $11
		RETURNING id, COALESCE(school_id::text, ''), access_id, COALESCE(roll_number, ''), COALESCE(stream, ''), name, grade, COALESCE(section, ''), COALESCE(mobile_number, ''), COALESCE(email, ''), COALESCE(academic_year, '2025-2026'), is_active, created_at
	`, accessID, rollNumber, stream, req.Name, grade, section, req.MobileNumber, req.Email, ay, id, schoolID).Scan(
		&s.ID, &s.SchoolID, &s.AccessID, &s.RollNumber, &s.Stream, &s.Name, &s.Grade, &s.Section, &s.MobileNumber, &s.Email, &s.AcademicYear, &s.IsActive, &s.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *postgresStudent) UpdateContact(ctx context.Context, id, mobile, email string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE students SET mobile_number = $1, email = $2 WHERE id = $3
	`, mobile, email, id)
	return err
}

func (r *postgresStudent) BulkCreate(ctx context.Context, schoolID string, students []domain.CreateStudentRequest) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	// Use pgx Batch for efficient bulk insert
	batch := &pgx.Batch{}
	seenAccessIDs := make(map[string]int)
	for _, s := range students {
		grade := strings.TrimSpace(s.Grade)
		section := strings.ToUpper(strings.TrimSpace(s.Section))
		rollNumber := strings.TrimSpace(s.RollNumber)
		stream := strings.TrimSpace(s.Stream)
		accessID := strings.TrimSpace(s.AccessID)

		if rollNumber == "" && accessID != "" {
			if strings.Contains(accessID, "-") {
				parts := strings.Split(accessID, "-")
				rollNumber = parts[len(parts)-1]
			} else {
				rollNumber = accessID
			}
		}

		if accessID == "" || accessID == rollNumber {
			if rollNumber != "" {
				cleanGrade := strings.TrimSuffix(strings.ToLower(grade), "th")
				cleanRoll := rollNumber
				var rollInt int
				if _, err := fmt.Sscanf(rollNumber, "%d", &rollInt); err == nil && rollInt > 0 && rollInt < 10 && len(rollNumber) == 1 {
					cleanRoll = fmt.Sprintf("%02d", rollInt)
				}
				if stream != "" {
					streamCode := strings.ToUpper(stream)
					if len(streamCode) > 4 {
						streamCode = streamCode[:4]
					}
					accessID = fmt.Sprintf("%s%s-%s-%s", cleanGrade, section, streamCode, cleanRoll)
				} else {
					accessID = fmt.Sprintf("%s%s-%s", cleanGrade, section, cleanRoll)
				}
			} else {
				cleanName := strings.ReplaceAll(strings.TrimSpace(s.Name), " ", "")
				accessID = fmt.Sprintf("%s%s-%s", grade, section, cleanName)
			}
		}

		baseAccessID := accessID
		count := seenAccessIDs[baseAccessID]
		if count > 0 {
			accessID = fmt.Sprintf("%s-%d", baseAccessID, count+1)
		}
		seenAccessIDs[baseAccessID]++

		batch.Queue(`
			INSERT INTO students (school_id, access_id, roll_number, stream, name, grade, section, mobile_number, email)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			ON CONFLICT (school_id, access_id) DO UPDATE 
			SET name = EXCLUDED.name, roll_number = EXCLUDED.roll_number, stream = EXCLUDED.stream,
			    grade = EXCLUDED.grade, section = EXCLUDED.section, 
			    mobile_number = EXCLUDED.mobile_number, email = EXCLUDED.email
		`, schoolID, accessID, rollNumber, stream, s.Name, grade, section, s.MobileNumber, s.Email)
	}

	br := tx.SendBatch(ctx, batch)
	for i := 0; i < len(students); i++ {
		_, err := br.Exec()
		if err != nil {
			br.Close()
			return err
		}
	}
	if err := br.Close(); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (r *postgresStudent) Delete(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM students WHERE id = $1`, id)
	return err
}

func (r *postgresStudent) DeleteScoped(ctx context.Context, id, schoolID string) error {
	if schoolID == "" {
		return r.Delete(ctx, id)
	}
	res, err := r.db.Exec(ctx, `DELETE FROM students WHERE id = $1 AND school_id = $2`, id, schoolID)
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return fmt.Errorf("student not found or does not belong to this school")
	}
	return nil
}

func (r *postgresStudent) BulkDelete(ctx context.Context, schoolID string, ids []string) error {
	if len(ids) == 0 {
		return nil
	}
	_, err := r.db.Exec(ctx, `DELETE FROM students WHERE school_id = $1 AND id::text = ANY($2)`, schoolID, ids)
	return err
}

func (r *postgresStudent) PromoteClass(ctx context.Context, schoolID string, filterGrade, filterSection string, studentIDs []string) (int, int, error) {
	query := `SELECT id, grade FROM students WHERE school_id = $1 AND is_active = true`
	args := []interface{}{schoolID}
	argIdx := 2

	if len(studentIDs) > 0 {
		query += fmt.Sprintf(` AND id::text = ANY($%d)`, argIdx)
		args = append(args, studentIDs)
		argIdx++
	} else {
		if filterGrade != "" && filterGrade != "all" {
			query += fmt.Sprintf(` AND (grade = $%d OR grade ILIKE '%%' || $%d || '%%')`, argIdx, argIdx)
			args = append(args, filterGrade)
			argIdx++
		}
		if filterSection != "" && filterSection != "all" {
			query += fmt.Sprintf(` AND section = $%d`, argIdx)
			args = append(args, filterSection)
			argIdx++
		}
	}

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return 0, 0, err
	}
	defer rows.Close()

	type studentGrade struct {
		id    string
		grade string
	}
	var targets []studentGrade
	for rows.Next() {
		var sg studentGrade
		if err := rows.Scan(&sg.id, &sg.grade); err == nil {
			targets = append(targets, sg)
		}
	}

	reDigits := regexp.MustCompile(`\d+`)
	updatedCount := 0
	skippedCount := 0
	for _, target := range targets {
		digitStr := reDigits.FindString(target.grade)
		if digitStr == "" {
			skippedCount++
			continue
		}

		var currentGrade int
		_, err := fmt.Sscanf(digitStr, "%d", &currentGrade)
		if err == nil && currentGrade > 0 && currentGrade < 12 {
			newGradeNum := currentGrade + 1
			var newGrade string
			if strings.Contains(strings.ToLower(target.grade), "th") {
				newGrade = fmt.Sprintf("%dth", newGradeNum)
			} else {
				newGrade = fmt.Sprintf("%d", newGradeNum)
			}
			_, _ = r.db.Exec(ctx, `UPDATE students SET grade = $1 WHERE id = $2`, newGrade, target.id)
			updatedCount++
		} else {
			skippedCount++
		}
	}

	return updatedCount, skippedCount, nil
}

func (r *postgresStudent) PromoteAllClasses(ctx context.Context, schoolID, targetAY string) (int, int, error) {
	if targetAY == "" {
		targetAY = "2026-2027"
	}

	rows, err := r.db.Query(ctx, `SELECT id, grade FROM students WHERE school_id = $1 AND is_active = true`, schoolID)
	if err != nil {
		return 0, 0, err
	}
	defer rows.Close()

	type studentGrade struct {
		id    string
		grade string
	}
	var targets []studentGrade
	for rows.Next() {
		var sg studentGrade
		if err := rows.Scan(&sg.id, &sg.grade); err == nil {
			targets = append(targets, sg)
		}
	}

	reDigits := regexp.MustCompile(`\d+`)
	promotedCount := 0
	graduatedCount := 0

	for _, target := range targets {
		digitStr := reDigits.FindString(target.grade)
		if digitStr == "" {
			_, _ = r.db.Exec(ctx, `UPDATE students SET academic_year = $1 WHERE id = $2`, targetAY, target.id)
			continue
		}

		var currentGrade int
		_, err := fmt.Sscanf(digitStr, "%d", &currentGrade)
		if err == nil {
			if currentGrade >= 12 {
				_, _ = r.db.Exec(ctx, `UPDATE students SET grade = 'Alumni', academic_year = $1 WHERE id = $2`, targetAY, target.id)
				graduatedCount++
			} else {
				newGradeNum := currentGrade + 1
				var newGrade string
				if strings.Contains(strings.ToLower(target.grade), "th") {
					newGrade = fmt.Sprintf("%dth", newGradeNum)
				} else {
					newGrade = fmt.Sprintf("%d", newGradeNum)
				}
				_, _ = r.db.Exec(ctx, `UPDATE students SET grade = $1, academic_year = $2 WHERE id = $3`, newGrade, targetAY, target.id)
				promotedCount++
			}
		}
	}

	return promotedCount, graduatedCount, nil
}

