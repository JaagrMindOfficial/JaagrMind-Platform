package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jaagrmind/platform-api/internal/core/domain"
)

type postgresTicket struct {
	db *pgxpool.Pool
}

func NewPostgresTicket(db *pgxpool.Pool) domain.TicketRepository {
	return &postgresTicket{db: db}
}

func (r *postgresTicket) Create(ctx context.Context, schoolID, reportedBy string, req domain.CreateTicketRequest) (*domain.Ticket, error) {
	priority := req.Priority
	if priority == "" {
		priority = "medium"
	}
	category := req.Category
	if category == "" {
		category = "General"
	}
	var t domain.Ticket
	err := r.db.QueryRow(ctx, `
		INSERT INTO tickets (school_id, reported_by, subject, description, priority, category, status)
		VALUES ($1, $2, $3, $4, $5, $6, 'open')
		RETURNING id, school_id, reported_by, subject, description, COALESCE(priority, 'medium'), COALESCE(category, 'General'), status, COALESCE(admin_reply, ''), created_at, updated_at
	`, schoolID, reportedBy, req.Subject, req.Description, priority, category).Scan(
		&t.ID, &t.SchoolID, &t.ReportedBy, &t.Subject, &t.Description, &t.Priority, &t.Category, &t.Status, &t.AdminReply, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (r *postgresTicket) GetBySchool(ctx context.Context, schoolID string) ([]domain.Ticket, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, school_id, reported_by, subject, description, COALESCE(priority, 'medium'), COALESCE(category, 'General'), status, COALESCE(admin_reply, ''), created_at, updated_at
		FROM tickets WHERE school_id = $1 ORDER BY created_at DESC
	`, schoolID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tickets []domain.Ticket
	for rows.Next() {
		var t domain.Ticket
		if err := rows.Scan(&t.ID, &t.SchoolID, &t.ReportedBy, &t.Subject, &t.Description, &t.Priority, &t.Category, &t.Status, &t.AdminReply, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, err
		}
		tickets = append(tickets, t)
	}
	return tickets, nil
}

func (r *postgresTicket) GetAll(ctx context.Context) ([]domain.Ticket, error) {
	rows, err := r.db.Query(ctx, `
		SELECT 
			t.id, t.school_id, t.reported_by, t.subject, t.description, 
			COALESCE(t.priority, 'medium'), COALESCE(t.category, 'General'), 
			t.status, COALESCE(t.admin_reply, ''), t.created_at, t.updated_at,
			COALESCE(s.name, ''), COALESCE(s.school_code, ''), COALESCE(s.city, ''), 
			COALESCE(s.phone_number, ''), COALESCE(s.contact, '')
		FROM tickets t
		LEFT JOIN schools s ON t.school_id = s.id
		ORDER BY t.created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tickets []domain.Ticket
	for rows.Next() {
		var t domain.Ticket
		if err := rows.Scan(
			&t.ID, &t.SchoolID, &t.ReportedBy, &t.Subject, &t.Description, 
			&t.Priority, &t.Category, &t.Status, &t.AdminReply, &t.CreatedAt, &t.UpdatedAt,
			&t.SchoolName, &t.SchoolCode, &t.SchoolCity, &t.SchoolPhone, &t.SchoolEmail,
		); err != nil {
			return nil, err
		}
		tickets = append(tickets, t)
	}
	return tickets, nil
}

func (r *postgresTicket) ReplyAndStatus(ctx context.Context, id string, req domain.ReplyTicketRequest) (*domain.Ticket, error) {
	var t domain.Ticket
	err := r.db.QueryRow(ctx, `
		UPDATE tickets
		SET admin_reply = $1, status = $2, updated_at = NOW()
		WHERE id = $3
		RETURNING id, school_id, reported_by, subject, description, COALESCE(priority, 'medium'), COALESCE(category, 'General'), status, COALESCE(admin_reply, ''), created_at, updated_at
	`, req.Reply, req.Status, id).Scan(
		&t.ID, &t.SchoolID, &t.ReportedBy, &t.Subject, &t.Description, &t.Priority, &t.Category, &t.Status, &t.AdminReply, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &t, nil
}
