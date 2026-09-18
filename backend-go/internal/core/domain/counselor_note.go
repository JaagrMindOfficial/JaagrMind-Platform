package domain

import (
	"context"
	"time"
)

type CounselorNote struct {
	ID               string    `json:"id"`
	SchoolID         string    `json:"school_id"`
	StudentID        string    `json:"student_id"`
	AuthorID         string    `json:"author_id,omitempty"`
	AuthorName       string    `json:"author_name"`
	InterventionType string    `json:"intervention_type"`
	Status           string    `json:"status"` // "in_progress", "resolved", "monitoring"
	Notes            string    `json:"notes"`
	NextFollowUpDate string    `json:"next_follow_up_date,omitempty"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

type CreateCounselorNoteRequest struct {
	InterventionType string `json:"intervention_type"`
	Status           string `json:"status"`
	Notes            string `json:"notes"`
	NextFollowUpDate string `json:"next_follow_up_date,omitempty"`
}

type CounselorNoteRepository interface {
	Create(ctx context.Context, note CounselorNote) (*CounselorNote, error)
	GetByStudentID(ctx context.Context, studentID string) ([]CounselorNote, error)
}
