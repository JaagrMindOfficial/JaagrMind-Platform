package domain

import (
	"context"
	"time"
)

type Event struct {
	ID          string                 `json:"id"`
	SchoolID    *string                `json:"school_id,omitempty"`
	SchoolName  string                 `json:"school_name,omitempty"`
	ActorID     *string                `json:"actor_id,omitempty"`
	ActorName   string                 `json:"actor_name"`
	ActorRole   string                 `json:"actor_role"`
	EventType   string                 `json:"event_type"` // 'security', 'academic', 'governance', 'counseling', 'system'
	Action      string                 `json:"action"`
	Title       string                 `json:"title"`
	Description string                 `json:"description"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
	CreatedAt   time.Time              `json:"created_at"`
}

type CreateEventRequest struct {
	SchoolID    *string                `json:"school_id,omitempty"`
	ActorID     *string                `json:"actor_id,omitempty"`
	ActorName   string                 `json:"actor_name"`
	ActorRole   string                 `json:"actor_role"`
	EventType   string                 `json:"event_type"`
	Action      string                 `json:"action"`
	Title       string                 `json:"title"`
	Description string                 `json:"description"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

type EventRepository interface {
	Create(ctx context.Context, req CreateEventRequest) (*Event, error)
	GetBySchool(ctx context.Context, schoolID string, limit int) ([]Event, error)
	GetAll(ctx context.Context, schoolIDFilter string, limit int) ([]Event, error)
}
