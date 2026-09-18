package domain

import (
	"context"
	"time"
)

type Ticket struct {
	ID          string    `json:"id"`
	SchoolID    string    `json:"school_id"`
	ReportedBy  string    `json:"reported_by"`
	Subject     string    `json:"subject"`
	Description string    `json:"description"`
	Priority    string    `json:"priority"`
	Category    string    `json:"category"`
	Status      string    `json:"status"` // "open", "in_progress", "resolved"
	AdminReply  string    `json:"admin_reply,omitempty"`
	SchoolName  string    `json:"school_name,omitempty"`
	SchoolCode  string    `json:"school_code,omitempty"`
	SchoolCity  string    `json:"school_city,omitempty"`
	SchoolPhone string    `json:"school_phone,omitempty"`
	SchoolEmail string    `json:"school_email,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type CreateTicketRequest struct {
	Subject     string `json:"subject"`
	Description string `json:"description"`
	Priority    string `json:"priority,omitempty"`
	Category    string `json:"category,omitempty"`
}

type ReplyTicketRequest struct {
	Reply  string `json:"reply"`
	Status string `json:"status"`
}

type TicketRepository interface {
	Create(ctx context.Context, schoolID, reportedBy string, req CreateTicketRequest) (*Ticket, error)
	GetBySchool(ctx context.Context, schoolID string) ([]Ticket, error)
	GetAll(ctx context.Context) ([]Ticket, error)
	ReplyAndStatus(ctx context.Context, id string, req ReplyTicketRequest) (*Ticket, error)
}
