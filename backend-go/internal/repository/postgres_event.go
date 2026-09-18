package repository

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jaagrmind/platform-api/internal/core/domain"
)

type postgresEvent struct {
	db *pgxpool.Pool
}

func NewPostgresEvent(db *pgxpool.Pool) domain.EventRepository {
	return &postgresEvent{db: db}
}

func (r *postgresEvent) Create(ctx context.Context, req domain.CreateEventRequest) (*domain.Event, error) {
	metaJSON, _ := json.Marshal(req.Metadata)
	if req.Metadata == nil {
		metaJSON = []byte("{}")
	}

	var ev domain.Event
	var metaBytes []byte

	err := r.db.QueryRow(ctx, `
		INSERT INTO events (school_id, actor_id, actor_name, actor_role, event_type, action, title, description, metadata)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, school_id, actor_id, actor_name, actor_role, event_type, action, title, description, metadata, created_at
	`, req.SchoolID, req.ActorID, req.ActorName, req.ActorRole, req.EventType, req.Action, req.Title, req.Description, metaJSON).Scan(
		&ev.ID, &ev.SchoolID, &ev.ActorID, &ev.ActorName, &ev.ActorRole, &ev.EventType, &ev.Action, &ev.Title, &ev.Description, &metaBytes, &ev.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	if len(metaBytes) > 0 {
		_ = json.Unmarshal(metaBytes, &ev.Metadata)
	}
	return &ev, nil
}

func (r *postgresEvent) GetBySchool(ctx context.Context, schoolID string, limit int) ([]domain.Event, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	rows, err := r.db.Query(ctx, `
		SELECT e.id, e.school_id, COALESCE(s.name, ''), e.actor_id, e.actor_name, e.actor_role, e.event_type, e.action, e.title, e.description, e.metadata, e.created_at
		FROM events e
		LEFT JOIN schools s ON e.school_id = s.id
		WHERE e.school_id = $1 AND e.actor_role NOT IN ('superadmin', 'admin')
		ORDER BY e.created_at DESC
		LIMIT $2
	`, schoolID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []domain.Event
	for rows.Next() {
		var ev domain.Event
		var metaBytes []byte
		if err := rows.Scan(&ev.ID, &ev.SchoolID, &ev.SchoolName, &ev.ActorID, &ev.ActorName, &ev.ActorRole, &ev.EventType, &ev.Action, &ev.Title, &ev.Description, &metaBytes, &ev.CreatedAt); err != nil {
			return nil, err
		}
		if len(metaBytes) > 0 {
			_ = json.Unmarshal(metaBytes, &ev.Metadata)
		}
		list = append(list, ev)
	}
	return list, nil
}

func (r *postgresEvent) GetAll(ctx context.Context, schoolIDFilter string, limit int) ([]domain.Event, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	query := `
		SELECT e.id, e.school_id, COALESCE(s.name, 'System-Wide'), e.actor_id, e.actor_name, e.actor_role, e.event_type, e.action, e.title, e.description, e.metadata, e.created_at
		FROM events e
		LEFT JOIN schools s ON e.school_id = s.id
	`
	var rowsArgs []interface{}
	if schoolIDFilter != "" {
		query += " WHERE e.school_id = $1 ORDER BY e.created_at DESC LIMIT $2"
		rowsArgs = append(rowsArgs, schoolIDFilter, limit)
	} else {
		query += " ORDER BY e.created_at DESC LIMIT $1"
		rowsArgs = append(rowsArgs, limit)
	}

	rows, err := r.db.Query(ctx, query, rowsArgs...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []domain.Event
	for rows.Next() {
		var ev domain.Event
		var metaBytes []byte
		if err := rows.Scan(&ev.ID, &ev.SchoolID, &ev.SchoolName, &ev.ActorID, &ev.ActorName, &ev.ActorRole, &ev.EventType, &ev.Action, &ev.Title, &ev.Description, &metaBytes, &ev.CreatedAt); err != nil {
			return nil, err
		}
		if len(metaBytes) > 0 {
			_ = json.Unmarshal(metaBytes, &ev.Metadata)
		}
		list = append(list, ev)
	}
	return list, nil
}
