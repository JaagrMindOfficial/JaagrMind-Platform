package main

import (
	"context"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jaagrmind/platform-api/internal/services"
)

func main() {
	dbURL := "postgres://postgres:secret@localhost:5432/jaagrmind?sslmode=disable"
	dbPool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer dbPool.Close()

	authService := services.NewAuthService(nil, "secret")
	hash, err := authService.HashPassword("admin@123")
	if err != nil {
		log.Fatalf("Failed to hash password: %v", err)
	}

	fmt.Println("Generated Hash for admin@123:", hash)
	fmt.Println("Verify check:", authService.VerifyPassword(hash, "admin@123"))

	// Update admin@jaagrmind.com
	res, err := dbPool.Exec(context.Background(), `
		UPDATE users 
		SET password_hash = $1, is_internal = true
		WHERE LOWER(email) = 'admin@jaagrmind.com'
	`, hash)
	if err != nil {
		log.Fatalf("Failed to update user: %v", err)
	}

	fmt.Printf("Updated rows: %d\n", res.RowsAffected())
}
