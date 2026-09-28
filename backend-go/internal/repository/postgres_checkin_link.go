package repository

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jaagrmind/platform-api/internal/core/domain"
)

type postgresCheckinLink struct {
	db *pgxpool.Pool
}

func NewPostgresCheckinLink(db *pgxpool.Pool) domain.CheckinLinkRepository {
	return &postgresCheckinLink{db: db}
}

func (r *postgresCheckinLink) Create(ctx context.Context, link domain.CheckinLink) (*domain.CheckinLink, error) {
	query := `
		INSERT INTO checkin_links (
			code, assessment_id, label, candidate_name, candidate_email,
			created_by, expires_at, max_uses, use_count, status
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10
		)
		RETURNING id, code, assessment_id, label, candidate_name, candidate_email,
		          created_by, expires_at, max_uses, use_count, status, last_used_at, created_at, updated_at
	`

	var created domain.CheckinLink
	var assessID *string
	if link.AssessmentID != nil && *link.AssessmentID != "" {
		assessID = link.AssessmentID
	}

	err := r.db.QueryRow(ctx, query,
		link.Code,
		assessID,
		link.Label,
		link.CandidateName,
		link.CandidateEmail,
		link.CreatedBy,
		link.ExpiresAt,
		link.MaxUses,
		link.UseCount,
		link.Status,
	).Scan(
		&created.ID,
		&created.Code,
		&created.AssessmentID,
		&created.Label,
		&created.CandidateName,
		&created.CandidateEmail,
		&created.CreatedBy,
		&created.ExpiresAt,
		&created.MaxUses,
		&created.UseCount,
		&created.Status,
		&created.LastUsedAt,
		&created.CreatedAt,
		&created.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create checkin link: %w", err)
	}

	return &created, nil
}

func (r *postgresCheckinLink) GetByCode(ctx context.Context, code string) (*domain.CheckinLink, error) {
	query := `
		SELECT l.id, l.code, l.assessment_id, COALESCE(a.title, 'Default Reflection Check-in'),
		       l.label, l.candidate_name, l.candidate_email, l.created_by,
		       l.expires_at, l.max_uses, l.use_count, l.status, l.last_used_at,
		       l.created_at, l.updated_at
		FROM checkin_links l
		LEFT JOIN assessments a ON l.assessment_id = a.id
		WHERE l.code = $1
		LIMIT 1
	`

	var link domain.CheckinLink
	err := r.db.QueryRow(ctx, query, code).Scan(
		&link.ID,
		&link.Code,
		&link.AssessmentID,
		&link.AssessmentTitle,
		&link.Label,
		&link.CandidateName,
		&link.CandidateEmail,
		&link.CreatedBy,
		&link.ExpiresAt,
		&link.MaxUses,
		&link.UseCount,
		&link.Status,
		&link.LastUsedAt,
		&link.CreatedAt,
		&link.UpdatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return &link, nil
}

func (r *postgresCheckinLink) GetAll(ctx context.Context) ([]domain.CheckinLink, error) {
	query := `
		SELECT l.id, l.code, l.assessment_id, COALESCE(a.title, 'Default Reflection Check-in'),
		       l.label, l.candidate_name, l.candidate_email, l.created_by,
		       l.expires_at, l.max_uses, l.use_count, l.status, l.last_used_at,
		       l.created_at, l.updated_at
		FROM checkin_links l
		LEFT JOIN assessments a ON l.assessment_id = a.id
		ORDER BY l.created_at DESC
	`

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var links []domain.CheckinLink
	for rows.Next() {
		var l domain.CheckinLink
		err := rows.Scan(
			&l.ID,
			&l.Code,
			&l.AssessmentID,
			&l.AssessmentTitle,
			&l.Label,
			&l.CandidateName,
			&l.CandidateEmail,
			&l.CreatedBy,
			&l.ExpiresAt,
			&l.MaxUses,
			&l.UseCount,
			&l.Status,
			&l.LastUsedAt,
			&l.CreatedAt,
			&l.UpdatedAt,
		)
		if err == nil {
			links = append(links, l)
		}
	}

	if links == nil {
		links = []domain.CheckinLink{}
	}

	return links, nil
}

func (r *postgresCheckinLink) RecordUsage(ctx context.Context, code string) error {
	query := `
		UPDATE checkin_links
		SET use_count = use_count + 1,
		    last_used_at = NOW(),
		    status = CASE WHEN use_count + 1 >= max_uses THEN 'completed' ELSE status END,
		    updated_at = NOW()
		WHERE code = $1
	`
	_, err := r.db.Exec(ctx, query, code)
	return err
}

func (r *postgresCheckinLink) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM checkin_links WHERE id = $1`
	_, err := r.db.Exec(ctx, query, id)
	return err
}
