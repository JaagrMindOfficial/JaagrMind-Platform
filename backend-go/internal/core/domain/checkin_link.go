package domain

import (
	"context"
	"time"
)

type CheckinLink struct {
	ID              string     `json:"id"`
	Code            string     `json:"code"`
	AssessmentID    *string    `json:"assessment_id,omitempty"`
	AssessmentTitle string     `json:"assessment_title,omitempty"`
	Label           string     `json:"label"`
	CandidateName   string     `json:"candidate_name"`
	CandidateEmail  string     `json:"candidate_email"`
	CreatedBy       *string    `json:"created_by,omitempty"`
	ExpiresAt       *time.Time `json:"expires_at,omitempty"`
	MaxUses         int        `json:"max_uses"`
	UseCount        int        `json:"use_count"`
	Status          string     `json:"status"` // "active", "completed", "expired", "revoked"
	LastUsedAt      *time.Time `json:"last_used_at,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
	FullURL         string     `json:"full_url,omitempty"`
}

type CreateCheckinLinkRequest struct {
	AssessmentID   string `json:"assessmentId"`
	Label          string `json:"label"`
	CandidateName  string `json:"candidateName"`
	CandidateEmail string `json:"candidateEmail"`
	ExpiresInDays  int    `json:"expiresInDays"` // 0 = no expiry
	MaxUses        int    `json:"maxUses"`       // 1 = single use, >1 = multiple
}

type CheckinLinkRepository interface {
	Create(ctx context.Context, link CheckinLink) (*CheckinLink, error)
	GetByCode(ctx context.Context, code string) (*CheckinLink, error)
	GetAll(ctx context.Context) ([]CheckinLink, error)
	RecordUsage(ctx context.Context, code string) error
	Delete(ctx context.Context, id string) error
}
