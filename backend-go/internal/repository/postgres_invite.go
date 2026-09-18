package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jaagrmind/platform-api/internal/core/domain"
)

type postgresInvite struct {
	db *pgxpool.Pool
}

func NewPostgresInvite(db *pgxpool.Pool) domain.InviteRepository {
	return &postgresInvite{db: db}
}

func (r *postgresInvite) Create(ctx context.Context, invite domain.SchoolInvite) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO school_invites (id, school_name, email, token, expires_at)
		VALUES ($1, $2, $3, $4, $5)
	`, invite.ID, invite.SchoolName, invite.Email, invite.Token, invite.ExpiresAt)
	return err
}

func (r *postgresInvite) GetByToken(ctx context.Context, token string) (*domain.SchoolInvite, error) {
	var inv domain.SchoolInvite
	err := r.db.QueryRow(ctx, `
		SELECT id, school_name, email, token, expires_at, accepted_at, created_at
		FROM school_invites WHERE token = $1
	`, token).Scan(&inv.ID, &inv.SchoolName, &inv.Email, &inv.Token, &inv.ExpiresAt, &inv.AcceptedAt, &inv.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &inv, nil
}

func (r *postgresInvite) MarkAccepted(ctx context.Context, token string) error {
	now := time.Now()
	_, err := r.db.Exec(ctx, `
		UPDATE school_invites SET accepted_at = $1 WHERE token = $2
	`, now, token)
	return err
}
