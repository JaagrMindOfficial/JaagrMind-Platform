package domain

import (
	"context"
	"time"
)

type School struct {
	ID             string    `json:"id"`
	SchoolCode     string    `json:"school_code"`
	Name           string    `json:"name"`
	City           string    `json:"city"`
	Contact        string    `json:"contact"`
	PhoneNumber    string    `json:"phone_number"`
	Logo           string    `json:"logo"`
	ParentSchoolID *string   `json:"parent_school_id,omitempty"` // For super/sub-school hierarchy
	IsActive       bool      `json:"is_active"`
	IsBlocked      bool      `json:"is_blocked"`
	CreatedAt      time.Time `json:"created_at"`
}

type CreateSchoolRequest struct {
	Name           string  `json:"name"`
	SchoolCode     string  `json:"school_code"`
	City           string  `json:"city"`
	Contact        string  `json:"contact"`
	PhoneNumber    string  `json:"phone_number"`
	ParentSchoolID *string `json:"parent_school_id,omitempty"`
}

type SchoolRepository interface {
	Create(ctx context.Context, req CreateSchoolRequest) (*School, error)
	GetByID(ctx context.Context, id string) (*School, error)
	GetByCode(ctx context.Context, code string) (*School, error)
	GetAll(ctx context.Context) ([]School, error)
	GetBranches(ctx context.Context, parentSchoolID string) ([]School, error)
	Update(ctx context.Context, id string, req CreateSchoolRequest) (*School, error)
	UpdateLogo(ctx context.Context, id string, logoURL string) error
	ToggleBlock(ctx context.Context, id string, isBlocked bool) error
	Delete(ctx context.Context, id string) error
}

