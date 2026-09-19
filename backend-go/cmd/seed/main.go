package main

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jaagrmind/platform-api/internal/repository"
	"golang.org/x/crypto/argon2"
)

func hashPassword(password string) string {
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		log.Fatal(err)
	}
	hash := argon2.IDKey([]byte(password), salt, 1, 64*1024, 4, 32)
	return fmt.Sprintf(
		"$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version, 64*1024, 1, 4,
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(hash),
	)
}

func main() {
	dbURL := "postgres://postgres:secret@localhost:5432/jaagrmind?sslmode=disable"
	dbPool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer dbPool.Close()

	ctx := context.Background()

	// ── Drop all 27 tables for a completely clean state ──────────────
	dropSQL := `DROP TABLE IF EXISTS 
		inquiry_messages, parent_counselor_inquiries, parent_students, 
		school_counselors, events, otp_verifications, derived_metrics, 
		raw_interactions, trait_snapshots, mood_entries, journal_entries, 
		activity_sessions, daily_pathway, activity_catalog, student_results, 
		counselor_notes, password_resets, assessments, school_invites, 
		user_roles, students, schools, users, tickets, scheduled_promotions, 
		institution_applications, platform_guides CASCADE`
	if _, err := dbPool.Exec(ctx, dropSQL); err != nil {
		log.Printf("Warning during drop: %v", err)
	}

	// ── Auto-Migrate schema (single source of truth) ─────────
	if err := repository.AutoMigrate(ctx, dbPool); err != nil {
		log.Fatalf("Failed to auto-migrate database schema: %v", err)
	}
	fmt.Println("✓ All 27 tables created and verified via AutoMigrate")

	// ── Provision Superadmin Credentials ONLY ─────────────────
	// Strictly no mock schools, students, assessments, or parent fixtures.
	adminHash := hashPassword("admin@123")
	var adminID string
	err = dbPool.QueryRow(ctx, `
		INSERT INTO users (email, name, password_hash, is_internal) 
		VALUES ('admin@jaagrmind.com', 'Platform Admin', $1, true) 
		RETURNING id
	`, adminHash).Scan(&adminID)
	if err != nil {
		log.Fatalf("Failed to insert admin user: %v", err)
	}

	_, err = dbPool.Exec(ctx, `INSERT INTO user_roles (user_id, role) VALUES ($1, 'superadmin')`, adminID)
	if err != nil {
		log.Fatalf("Failed to assign superadmin role: %v", err)
	}

	fmt.Println("✓ admin@jaagrmind.com / admin@123 → superadmin (is_internal: true)")
	fmt.Println("\nClean database initialized! Only migrations and admin credentials provisioned.")
}
