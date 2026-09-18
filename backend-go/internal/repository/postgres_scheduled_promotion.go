package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jaagrmind/platform-api/internal/core/domain"
)

type postgresScheduledPromotion struct {
	db *pgxpool.Pool
}

func NewPostgresScheduledPromotion(db *pgxpool.Pool) domain.ScheduledPromotionRepository {
	return &postgresScheduledPromotion{db: db}
}

func (r *postgresScheduledPromotion) Create(ctx context.Context, schoolID string, req domain.CreateScheduledPromotionRequest, count int) (*domain.ScheduledPromotion, error) {
	ay := req.AcademicYear
	if ay == "" {
		ay = "2025-2026"
	}
	var sp domain.ScheduledPromotion
	err := r.db.QueryRow(ctx, `
		INSERT INTO scheduled_promotions (school_id, from_grade, to_grade, scheduled_date, student_count, status, academic_year, is_annual_rollover)
		VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)
		RETURNING id, school_id, from_grade, to_grade, scheduled_date, status, student_count, COALESCE(academic_year, '2025-2026'), COALESCE(is_annual_rollover, false), created_at
	`, schoolID, req.FromGrade, req.ToGrade, req.ScheduledDate, count, ay, req.IsAnnualRollover).Scan(
		&sp.ID, &sp.SchoolID, &sp.FromGrade, &sp.ToGrade, &sp.ScheduledDate, &sp.Status, &sp.StudentCount, &sp.AcademicYear, &sp.IsAnnualRollover, &sp.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &sp, nil
}

func (r *postgresScheduledPromotion) GetBySchool(ctx context.Context, schoolID string) ([]domain.ScheduledPromotion, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, school_id, from_grade, to_grade, scheduled_date, status, student_count, COALESCE(academic_year, '2025-2026'), COALESCE(is_annual_rollover, false), created_at
		FROM scheduled_promotions
		WHERE school_id = $1
		ORDER BY scheduled_date ASC
	`, schoolID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []domain.ScheduledPromotion
	for rows.Next() {
		var sp domain.ScheduledPromotion
		if err := rows.Scan(&sp.ID, &sp.SchoolID, &sp.FromGrade, &sp.ToGrade, &sp.ScheduledDate, &sp.Status, &sp.StudentCount, &sp.AcademicYear, &sp.IsAnnualRollover, &sp.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, sp)
	}
	return list, nil
}

func (r *postgresScheduledPromotion) Delete(ctx context.Context, schoolID, id string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM scheduled_promotions WHERE id = $1 AND school_id = $2`, id, schoolID)
	return err
}

func (r *postgresScheduledPromotion) Execute(ctx context.Context, schoolID, id string) error {
	_, err := r.db.Exec(ctx, `UPDATE scheduled_promotions SET status = 'completed' WHERE id = $1 AND school_id = $2`, id, schoolID)
	return err
}
