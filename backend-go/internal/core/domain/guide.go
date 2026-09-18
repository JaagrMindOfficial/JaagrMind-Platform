package domain

import (
	"context"
	"time"
)

type PlatformGuide struct {
	ID             string    `json:"id"`
	Slug           string    `json:"slug"`
	Title          string    `json:"title"`
	Category       string    `json:"category"`
	Content        string    `json:"content"`
	TargetAudience string    `json:"target_audience"` // "all", "school", "admin"
	OrderIndex     int       `json:"order_index"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type CreateGuideRequest struct {
	Slug           string `json:"slug"`
	Title          string `json:"title"`
	Category       string `json:"category"`
	Content        string `json:"content"`
	TargetAudience string `json:"target_audience,omitempty"`
	OrderIndex     int    `json:"order_index,omitempty"`
}

type GuideRepository interface {
	GetAll(ctx context.Context) ([]PlatformGuide, error)
	GetBySlug(ctx context.Context, slug string) (*PlatformGuide, error)
	Create(ctx context.Context, req CreateGuideRequest) (*PlatformGuide, error)
	Update(ctx context.Context, id string, req CreateGuideRequest) (*PlatformGuide, error)
	Delete(ctx context.Context, id string) error
}
