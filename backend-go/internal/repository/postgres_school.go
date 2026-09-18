package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jaagrmind/platform-api/internal/core/domain"
)

type postgresSchool struct {
	db *pgxpool.Pool
}

func NewPostgresSchool(db *pgxpool.Pool) domain.SchoolRepository {
	return &postgresSchool{db: db}
}

func (r *postgresSchool) Create(ctx context.Context, req domain.CreateSchoolRequest) (*domain.School, error) {
	var school domain.School
	err := r.db.QueryRow(ctx, `
		INSERT INTO schools (name, school_code, city, contact, phone_number, parent_school_id)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, name, school_code, city, contact, COALESCE(phone_number, ''), COALESCE(logo, ''), parent_school_id, is_active, is_blocked, created_at
	`, req.Name, req.SchoolCode, req.City, req.Contact, req.PhoneNumber, req.ParentSchoolID).Scan(
		&school.ID, &school.Name, &school.SchoolCode, &school.City, &school.Contact, &school.PhoneNumber, &school.Logo, &school.ParentSchoolID, &school.IsActive, &school.IsBlocked, &school.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &school, nil
}

func (r *postgresSchool) GetByID(ctx context.Context, id string) (*domain.School, error) {
	var school domain.School
	err := r.db.QueryRow(ctx, `
		SELECT id, name, school_code, city, contact, COALESCE(phone_number, ''), COALESCE(logo, ''), parent_school_id, is_active, is_blocked, created_at
		FROM schools WHERE id = $1
	`, id).Scan(
		&school.ID, &school.Name, &school.SchoolCode, &school.City, &school.Contact, &school.PhoneNumber, &school.Logo, &school.ParentSchoolID, &school.IsActive, &school.IsBlocked, &school.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &school, nil
}

func (r *postgresSchool) GetByCode(ctx context.Context, code string) (*domain.School, error) {
	var school domain.School
	err := r.db.QueryRow(ctx, `
		SELECT id, name, school_code, city, contact, COALESCE(phone_number, ''), COALESCE(logo, ''), parent_school_id, is_active, is_blocked, created_at
		FROM schools WHERE school_code = $1
	`, code).Scan(
		&school.ID, &school.Name, &school.SchoolCode, &school.City, &school.Contact, &school.PhoneNumber, &school.Logo, &school.ParentSchoolID, &school.IsActive, &school.IsBlocked, &school.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &school, nil
}

func (r *postgresSchool) GetAll(ctx context.Context) ([]domain.School, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, name, school_code, city, contact, COALESCE(phone_number, ''), COALESCE(logo, ''), parent_school_id, is_active, is_blocked, created_at
		FROM schools
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var schools []domain.School
	for rows.Next() {
		var s domain.School
		if err := rows.Scan(
			&s.ID, &s.Name, &s.SchoolCode, &s.City, &s.Contact, &s.PhoneNumber, &s.Logo, &s.ParentSchoolID, &s.IsActive, &s.IsBlocked, &s.CreatedAt,
		); err != nil {
			return nil, err
		}
		schools = append(schools, s)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return schools, nil
}

func (r *postgresSchool) GetBranches(ctx context.Context, parentSchoolID string) ([]domain.School, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, name, school_code, city, contact, COALESCE(phone_number, ''), COALESCE(logo, ''), parent_school_id, is_active, is_blocked, created_at
		FROM schools
		WHERE parent_school_id = $1
		ORDER BY created_at DESC
	`, parentSchoolID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var schools []domain.School
	for rows.Next() {
		var s domain.School
		if err := rows.Scan(
			&s.ID, &s.Name, &s.SchoolCode, &s.City, &s.Contact, &s.PhoneNumber, &s.Logo, &s.ParentSchoolID, &s.IsActive, &s.IsBlocked, &s.CreatedAt,
		); err != nil {
			return nil, err
		}
		schools = append(schools, s)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return schools, nil
}

func (r *postgresSchool) Update(ctx context.Context, id string, req domain.CreateSchoolRequest) (*domain.School, error) {
	var school domain.School
	err := r.db.QueryRow(ctx, `
		UPDATE schools
		SET name = $1, school_code = $2, city = $3, contact = $4, phone_number = $5, parent_school_id = $6
		WHERE id = $7
		RETURNING id, name, school_code, city, contact, COALESCE(phone_number, ''), COALESCE(logo, ''), parent_school_id, is_active, is_blocked, created_at
	`, req.Name, req.SchoolCode, req.City, req.Contact, req.PhoneNumber, req.ParentSchoolID, id).Scan(
		&school.ID, &school.Name, &school.SchoolCode, &school.City, &school.Contact, &school.PhoneNumber, &school.Logo, &school.ParentSchoolID, &school.IsActive, &school.IsBlocked, &school.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &school, nil
}

func (r *postgresSchool) ToggleBlock(ctx context.Context, id string, isBlocked bool) error {
	_, err := r.db.Exec(ctx, `UPDATE schools SET is_blocked = $1 WHERE id = $2`, isBlocked, id)
	return err
}

func (r *postgresSchool) UpdateLogo(ctx context.Context, id string, logoURL string) error {
	_, err := r.db.Exec(ctx, `UPDATE schools SET logo = $1 WHERE id = $2`, logoURL, id)
	return err
}

func (r *postgresSchool) Delete(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM schools WHERE id = $1`, id)
	return err
}

