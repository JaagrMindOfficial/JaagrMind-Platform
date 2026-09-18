package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jaagrmind/platform-api/internal/core/domain"
)

type postgresCounselorNote struct {
	db *pgxpool.Pool
}

func NewPostgresCounselorNote(db *pgxpool.Pool) domain.CounselorNoteRepository {
	return &postgresCounselorNote{db: db}
}

func (r *postgresCounselorNote) Create(ctx context.Context, note domain.CounselorNote) (*domain.CounselorNote, error) {
	if note.ID == "" {
		note.ID = uuid.New().String()
	}
	now := time.Now()
	note.CreatedAt = now
	note.UpdatedAt = now

	query := `
		INSERT INTO counselor_notes (
			id, school_id, student_id, author_id, author_name,
			intervention_type, status, notes, next_follow_up_date,
			created_at, updated_at
		) VALUES ($1, $2, $3, NULLIF($4, '')::uuid, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id, school_id, student_id, COALESCE(author_id::text, ''), author_name,
		          intervention_type, status, notes, COALESCE(next_follow_up_date, ''),
		          created_at, updated_at
	`

	var created domain.CounselorNote
	err := r.db.QueryRow(ctx, query,
		note.ID, note.SchoolID, note.StudentID, note.AuthorID, note.AuthorName,
		note.InterventionType, note.Status, note.Notes, note.NextFollowUpDate,
		note.CreatedAt, note.UpdatedAt,
	).Scan(
		&created.ID, &created.SchoolID, &created.StudentID, &created.AuthorID,
		&created.AuthorName, &created.InterventionType, &created.Status,
		&created.Notes, &created.NextFollowUpDate, &created.CreatedAt, &created.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &created, nil
}

func (r *postgresCounselorNote) GetByStudentID(ctx context.Context, studentID string) ([]domain.CounselorNote, error) {
	query := `
		SELECT id, school_id, student_id, COALESCE(author_id::text, ''), author_name,
		       intervention_type, status, notes, COALESCE(next_follow_up_date, ''),
		       created_at, updated_at
		FROM counselor_notes
		WHERE student_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(ctx, query, studentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []domain.CounselorNote
	for rows.Next() {
		var n domain.CounselorNote
		if err := rows.Scan(
			&n.ID, &n.SchoolID, &n.StudentID, &n.AuthorID,
			&n.AuthorName, &n.InterventionType, &n.Status,
			&n.Notes, &n.NextFollowUpDate, &n.CreatedAt, &n.UpdatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, n)
	}

	if list == nil {
		list = []domain.CounselorNote{}
	}
	return list, nil
}
