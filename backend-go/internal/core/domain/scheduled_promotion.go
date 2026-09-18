package domain

import (
	"context"
	"time"
)

type ScheduledPromotion struct {
	ID            string    `json:"id"`
	SchoolID      string    `json:"school_id"`
	FromGrade     string    `json:"from_grade"`
	ToGrade       string    `json:"to_grade"`
	ScheduledDate time.Time `json:"scheduled_date"`
	Status           string    `json:"status"` // "pending", "completed", "cancelled"
	StudentCount     int       `json:"student_count"`
	AcademicYear     string    `json:"academic_year"`
	IsAnnualRollover bool      `json:"is_annual_rollover"`
	CreatedAt        time.Time `json:"created_at"`
}

type CreateScheduledPromotionRequest struct {
	FromGrade        string    `json:"from_grade"`
	ToGrade          string    `json:"to_grade"`
	ScheduledDate    time.Time `json:"scheduled_date"`
	AcademicYear     string    `json:"academic_year,omitempty"`
	IsAnnualRollover bool      `json:"is_annual_rollover,omitempty"`
}

type ScheduledPromotionRepository interface {
	Create(ctx context.Context, schoolID string, req CreateScheduledPromotionRequest, count int) (*ScheduledPromotion, error)
	GetBySchool(ctx context.Context, schoolID string) ([]ScheduledPromotion, error)
	Delete(ctx context.Context, schoolID, id string) error
	Execute(ctx context.Context, schoolID, id string) error
}
