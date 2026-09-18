package main

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	dbURL := "postgres://postgres:secret@localhost:5432/jaagrmind?sslmode=disable"
	dbPool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer dbPool.Close()

	var userID string
	err = dbPool.QueryRow(context.Background(), `SELECT id FROM users WHERE email = 'teacher@jaagrmind.com'`).Scan(&userID)
	if err != nil {
		log.Fatalf("Could not find test user: %v", err)
	}

	_, err = dbPool.Exec(context.Background(), `
		INSERT INTO user_roles (user_id, role, entity_id) 
		VALUES ($1, 'superadmin', NULL)
		ON CONFLICT DO NOTHING
	`, userID)
	if err != nil {
		log.Fatalf("Failed to add superadmin role: %v", err)
	}

	fmt.Println("Successfully granted superadmin role to teacher@jaagrmind.com")
}
