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
		       s.access_id, s.name, s.grade, COALESCE(s.section, ''),
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
			&s.AccessID, &s.Name, &s.Grade, &s.Section,
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
		SELECT id, COALESCE(school_id::text, ''), access_id, name, grade, COALESCE(section, ''), COALESCE(mobile_number, ''), COALESCE(email, ''), COALESCE(academic_year, '2025-2026'), is_active, created_at
		FROM students WHERE school_id = $1 ORDER BY grade ASC, section ASC, name ASC
	`, schoolID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var students []domain.Student
	for rows.Next() {
		var s domain.Student
		if err := rows.Scan(&s.ID, &s.SchoolID, &s.AccessID, &s.Name, &s.Grade, &s.Section, &s.MobileNumber, &s.Email, &s.AcademicYear, &s.IsActive, &s.CreatedAt); err != nil {
			return nil, err
		}
		students = append(students, s)
	}
	return students, nil
}

func (r *postgresStudent) GetByID(ctx context.Context, id string) (*domain.Student, error) {
	var s domain.Student
	err := r.db.QueryRow(ctx, `
		SELECT id, COALESCE(school_id::text, ''), access_id, name, grade, COALESCE(section, ''), COALESCE(mobile_number, ''), COALESCE(email, ''), COALESCE(academic_year, '2025-2026'), is_active, created_at
		FROM students WHERE id = $1
	`, id).Scan(
		&s.ID, &s.SchoolID, &s.AccessID, &s.Name, &s.Grade, &s.Section, &s.MobileNumber, &s.Email, &s.AcademicYear, &s.IsActive, &s.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *postgresStudent) GetByAccessID(ctx context.Context, schoolID, accessID string) (*domain.Student, error) {
	var s domain.Student
	err := r.db.QueryRow(ctx, `
		SELECT id, COALESCE(school_id::text, ''), access_id, name, grade, COALESCE(section, ''), COALESCE(mobile_number, ''), COALESCE(email, ''), COALESCE(academic_year, '2025-2026'), is_active, created_at
		FROM students WHERE school_id = $1 AND access_id = $2
	`, schoolID, accessID).Scan(
		&s.ID, &s.SchoolID, &s.AccessID, &s.Name, &s.Grade, &s.Section, &s.MobileNumber, &s.Email, &s.AcademicYear, &s.IsActive, &s.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *postgresStudent) Create(ctx context.Context, schoolID string, req domain.CreateStudentRequest) (*domain.Student, error) {
	accessID := req.AccessID
	if accessID == "" {
		var count int
		_ = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM students WHERE school_id = $1`, schoolID).Scan(&count)
		accessID = fmt.Sprintf("R%04d", count+1)
	}
	ay := req.AcademicYear
	if ay == "" {
		ay = "2025-2026"
	}
	var s domain.Student
	err := r.db.QueryRow(ctx, `
		INSERT INTO students (school_id, access_id, name, grade, section, mobile_number, email, academic_year)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, COALESCE(school_id::text, ''), access_id, name, grade, COALESCE(section, ''), COALESCE(mobile_number, ''), COALESCE(email, ''), COALESCE(academic_year, '2025-2026'), is_active, created_at
	`, schoolID, accessID, req.Name, req.Grade, req.Section, req.MobileNumber, req.Email, ay).Scan(
		&s.ID, &s.SchoolID, &s.AccessID, &s.Name, &s.Grade, &s.Section, &s.MobileNumber, &s.Email, &s.AcademicYear, &s.IsActive, &s.CreatedAt,
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
	var s domain.Student
	err := r.db.QueryRow(ctx, `
		UPDATE students
		SET access_id = $1, name = $2, grade = $3, section = $4, mobile_number = $5, email = $6, academic_year = $7
		WHERE id = $8
		RETURNING id, COALESCE(school_id::text, ''), access_id, name, grade, COALESCE(section, ''), COALESCE(mobile_number, ''), COALESCE(email, ''), COALESCE(academic_year, '2025-2026'), is_active, created_at
	`, req.AccessID, req.Name, req.Grade, req.Section, req.MobileNumber, req.Email, ay, id).Scan(
		&s.ID, &s.SchoolID, &s.AccessID, &s.Name, &s.Grade, &s.Section, &s.MobileNumber, &s.Email, &s.AcademicYear, &s.IsActive, &s.CreatedAt,
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
	for _, s := range students {
		batch.Queue(`
			INSERT INTO students (school_id, access_id, name, grade, section, mobile_number, email)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			ON CONFLICT (school_id, access_id) DO UPDATE 
			SET name = EXCLUDED.name, grade = EXCLUDED.grade, section = EXCLUDED.section, 
			    mobile_number = EXCLUDED.mobile_number, email = EXCLUDED.email
		`, schoolID, s.AccessID, s.Name, s.Grade, s.Section, s.MobileNumber, s.Email)
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

