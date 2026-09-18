package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jaagrmind/platform-api/internal/core/domain"
)

type postgresGuide struct {
	db *pgxpool.Pool
}

func NewPostgresGuide(db *pgxpool.Pool) domain.GuideRepository {
	return &postgresGuide{db: db}
}

func (r *postgresGuide) GetAll(ctx context.Context) ([]domain.PlatformGuide, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, slug, title, category, content, target_audience, order_index, created_at, updated_at
		FROM platform_guides
		ORDER BY order_index ASC, created_at ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []domain.PlatformGuide
	for rows.Next() {
		var g domain.PlatformGuide
		if err := rows.Scan(&g.ID, &g.Slug, &g.Title, &g.Category, &g.Content, &g.TargetAudience, &g.OrderIndex, &g.CreatedAt, &g.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, g)
	}
	return list, nil
}

func (r *postgresGuide) GetBySlug(ctx context.Context, slug string) (*domain.PlatformGuide, error) {
	var g domain.PlatformGuide
	err := r.db.QueryRow(ctx, `
		SELECT id, slug, title, category, content, target_audience, order_index, created_at, updated_at
		FROM platform_guides
		WHERE slug = $1
	`, slug).Scan(&g.ID, &g.Slug, &g.Title, &g.Category, &g.Content, &g.TargetAudience, &g.OrderIndex, &g.CreatedAt, &g.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &g, nil
}

func (r *postgresGuide) Create(ctx context.Context, req domain.CreateGuideRequest) (*domain.PlatformGuide, error) {
	audience := req.TargetAudience
	if audience == "" {
		audience = "all"
	}
	var g domain.PlatformGuide
	err := r.db.QueryRow(ctx, `
		INSERT INTO platform_guides (slug, title, category, content, target_audience, order_index)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, slug, title, category, content, target_audience, order_index, created_at, updated_at
	`, req.Slug, req.Title, req.Category, req.Content, audience, req.OrderIndex).Scan(
		&g.ID, &g.Slug, &g.Title, &g.Category, &g.Content, &g.TargetAudience, &g.OrderIndex, &g.CreatedAt, &g.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &g, nil
}

func (r *postgresGuide) Update(ctx context.Context, id string, req domain.CreateGuideRequest) (*domain.PlatformGuide, error) {
	audience := req.TargetAudience
	if audience == "" {
		audience = "all"
	}
	var g domain.PlatformGuide
	err := r.db.QueryRow(ctx, `
		UPDATE platform_guides
		SET slug = $1, title = $2, category = $3, content = $4, target_audience = $5, order_index = $6, updated_at = NOW()
		WHERE id = $7
		RETURNING id, slug, title, category, content, target_audience, order_index, created_at, updated_at
	`, req.Slug, req.Title, req.Category, req.Content, audience, req.OrderIndex, id).Scan(
		&g.ID, &g.Slug, &g.Title, &g.Category, &g.Content, &g.TargetAudience, &g.OrderIndex, &g.CreatedAt, &g.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &g, nil
}

func (r *postgresGuide) Delete(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `DELETE FROM platform_guides WHERE id = $1`, id)
	return err
}
