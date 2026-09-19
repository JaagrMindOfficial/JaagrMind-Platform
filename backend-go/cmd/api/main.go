package main

import (
	"bufio"
	"context"
	"log"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"
	"github.com/gofiber/fiber/v3/middleware/logger"
	"github.com/gofiber/fiber/v3/middleware/recover"
	"github.com/gofiber/fiber/v3/middleware/static"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/jaagrmind/platform-api/internal/core/domain"
	"github.com/jaagrmind/platform-api/internal/handlers"
	"github.com/jaagrmind/platform-api/internal/middleware"
	"github.com/jaagrmind/platform-api/internal/repository"
	"github.com/jaagrmind/platform-api/internal/services"
	"github.com/jaagrmind/platform-api/internal/utils"
)

func loadEnv(filepath string) {
	file, err := os.Open(filepath)
	if err != nil {
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			key := strings.TrimSpace(parts[0])
			val := strings.TrimSpace(parts[1])
			val = strings.Trim(val, "\"'")
			if os.Getenv(key) == "" {
				os.Setenv(key, val)
			}
		}
	}
}

// seedInitialAdmin ensures admin@jaagrmind.com exists with superadmin privileges.
// If the user already exists, their current password is preserved unless FORCE_SEED_ADMIN=true.
func seedInitialAdmin(ctx context.Context, dbPool *pgxpool.Pool, authService domain.AuthService) {
	forceSeed := os.Getenv("FORCE_SEED_ADMIN") == "true" || os.Getenv("RESET_ADMIN_PASSWORD") == "true"

	var userID string
	err := dbPool.QueryRow(ctx, `SELECT id FROM users WHERE LOWER(email) = 'admin@jaagrmind.com'`).Scan(&userID)
	if err == nil && userID != "" {
		// Admin exists
		if forceSeed {
			hash, err := authService.HashPassword("admin@123")
			if err == nil {
				_, _ = dbPool.Exec(ctx, `UPDATE users SET password_hash = $1, is_internal = true WHERE id = $2`, hash, userID)
				log.Println("[Seeder] FORCE_SEED_ADMIN enabled: admin@jaagrmind.com password reset to admin@123")
			}
		} else {
			log.Println("[Seeder] Admin user admin@jaagrmind.com already exists (preserving existing password)")
		}

		// Ensure superadmin role is present
		var roleCount int
		_ = dbPool.QueryRow(ctx, `SELECT COUNT(*) FROM user_roles WHERE user_id = $1 AND role = 'superadmin'`, userID).Scan(&roleCount)
		if roleCount == 0 {
			_, err = dbPool.Exec(ctx, `
				INSERT INTO user_roles (user_id, role, entity_id)
				VALUES ($1, 'superadmin', NULL)
			`, userID)
			if err != nil {
				log.Printf("[Seeder] Error attaching superadmin role: %v\n", err)
			}
		}
		return
	}

	// Admin does not exist: create initial admin user with admin@123
	hash, err := authService.HashPassword("admin@123")
	if err != nil {
		log.Printf("[Seeder] Failed to hash admin credentials: %v\n", err)
		return
	}

	adminID := uuid.New().String()
	now := time.Now().UTC()
	_, err = dbPool.Exec(ctx, `
		INSERT INTO users (id, email, password_hash, name, is_internal, auth_provider, created_at)
		VALUES ($1, 'admin@jaagrmind.com', $2, 'System Administrator', true, 'local', $3)
	`, adminID, hash, now)
	if err != nil {
		log.Printf("[Seeder] Failed to insert initial superadmin user: %v\n", err)
		return
	}

	_, err = dbPool.Exec(ctx, `
		INSERT INTO user_roles (user_id, role, entity_id)
		VALUES ($1, 'superadmin', NULL)
		ON CONFLICT DO NOTHING
	`, adminID)
	if err != nil {
		log.Printf("[Seeder] Failed to assign superadmin role: %v\n", err)
		return
	}

	log.Println("[Seeder] Initial production superadmin successfully provisioned: admin@jaagrmind.com / admin@123")
}

func main() {
	loadEnv(".env")

	app := fiber.New(fiber.Config{
		AppName: "JaagrMind Platform API",
	})

	// Dynamic CORS configuration
	corsOrigins := []string{
		"http://localhost:3000",
		"http://localhost:5173",
		"https://app.jaagrmind.com",
		"https://jaagrmind.com",
		"https://www.jaagrmind.com",
	}
	if envFrontends := os.Getenv("FRONTEND_URL"); envFrontends != "" {
		for _, o := range strings.Split(envFrontends, ",") {
			o = strings.TrimSpace(o)
			if o != "" {
				corsOrigins = append(corsOrigins, o)
			}
		}
	}
	if feBase := os.Getenv("FRONTEND_BASE_URL"); feBase != "" {
		feBase = strings.TrimSpace(feBase)
		if feBase != "" {
			corsOrigins = append(corsOrigins, feBase)
		}
	}

	app.Use(cors.New(cors.Config{
		AllowOrigins: corsOrigins,
		AllowHeaders: []string{"Origin", "Content-Type", "Accept", "Authorization", "X-School-ID"},
	}))
	app.Use(logger.New())
	app.Use(recover.New())

	// Health check
	app.Get("/health", func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "service": "JaagrMind Go API"})
	})

	// Serve fallback local object storage
	app.Get("/object/*", static.New("./object"))

	// Dynamic Database Connection
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:secret@localhost:5432/jaagrmind?sslmode=disable"
	}
	dbPool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer dbPool.Close()

	// ── Auto Migrate Database Schema ──────────────────────────
	if err := repository.AutoMigrate(context.Background(), dbPool); err != nil {
		log.Printf("AutoMigrate warning: %v\n", err)
	}
	userRepo := repository.NewPostgresUser(dbPool)
	schoolRepo := repository.NewPostgresSchool(dbPool)
	studentRepo := repository.NewPostgresStudent(dbPool)
	assessmentRepo := repository.NewPostgresAssessment(dbPool)
	inviteRepo := repository.NewPostgresInvite(dbPool)
	ticketRepo := repository.NewPostgresTicket(dbPool)
	schedPromoRepo := repository.NewPostgresScheduledPromotion(dbPool)
	analyticsRepo := repository.NewPostgresAnalytics(dbPool)
	counselorRepo := repository.NewPostgresCounselorNote(dbPool)
	guideRepo := repository.NewPostgresGuide(dbPool)
	eventRepo := repository.NewPostgresEvent(dbPool)
	parentRepo := repository.NewPostgresParent(dbPool)
	mobileRepo := repository.NewMobileRepository(dbPool)

	// ── Services ──────────────────────────────────────────────
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "super-secret-key-replace-in-prod"
	}
	frontendURL := os.Getenv("FRONTEND_BASE_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:3000"
	}
	authService := services.NewAuthService(userRepo, jwtSecret)
	emailService := utils.NewEmailService()
	storageService, err := utils.NewStorageService()
	if err != nil {
		log.Fatalf("Failed to initialize storage service: %v", err)
	}

	// ── Initial Superadmin Seeder ─────────────────────────────
	seedInitialAdmin(context.Background(), dbPool, authService)

	// ── Handlers ──────────────────────────────────────────────
	mobileHandler := handlers.NewMobileAPIHandler(mobileRepo, userRepo, authService, emailService, jwtSecret)

	// ── Public Routes ─────────────────────────────────────────
	handlers.SetupAuthRoutes(app, authService, userRepo, emailService, jwtSecret)
	handlers.SetupGoogleOAuthRoutes(app, userRepo, authService, jwtSecret, frontendURL)
	handlers.SetupInviteRoutes(app, inviteRepo, userRepo, schoolRepo, authService, jwtSecret)
	app.Get("/api/guides", func(c fiber.Ctx) error {
		guides, err := guideRepo.GetAll(c.Context())
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		if guides == nil {
			guides = []domain.PlatformGuide{}
		}
		return c.JSON(guides)
	})

	// ── School Admin API (school_admin / teacher) ─────────────
	handlers.SetupSchoolAPIRoutes(app, userRepo, schoolRepo, studentRepo, assessmentRepo, ticketRepo, schedPromoRepo, analyticsRepo, counselorRepo, eventRepo, parentRepo, authService, storageService, emailService, jwtSecret)

	// ── Student Assessment API ────────────────────────────────
	handlers.SetupStudentAPIRoutes(app, schoolRepo, studentRepo, assessmentRepo, authService, jwtSecret)

	// ── Parent & Guardian API ─────────────────────────────────
	handlers.SetupParentAPIRoutes(app, parentRepo, userRepo, authService, jwtSecret)

	// ── Mobile API (Student & Parent Flutter App) ─────────────
	handlers.SetupMobileAPIRoutes(app, mobileHandler, jwtSecret)

	// ── Superadmin API ────────────────────────────────────────
	adminAPI := app.Group("/api/admin", middleware.RoleGuard(jwtSecret, domain.RoleSuperAdmin))
	adminAPI.Post("/invite-school", handlers.CreateInviteHandler(inviteRepo, emailService))
	adminAPI.Get("/school-invites", handlers.GetSchoolInvitesHandler(inviteRepo))
	adminAPI.Delete("/school-invites/:id", handlers.CancelSchoolInviteHandler(inviteRepo))
	adminAPI.Get("/admins", func(c fiber.Ctx) error {
		admins, err := userRepo.GetUsersByRole(c.Context(), domain.RoleSuperAdmin)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		if admins == nil {
			admins = []domain.User{}
		}
		return c.JSON(admins)
	})
	
	// Delegate the rest to the AdminAPIHandler
	handlers.SetupAdminAPIRoutes(adminAPI, schoolRepo, studentRepo, assessmentRepo, ticketRepo, analyticsRepo, userRepo, guideRepo, eventRepo, parentRepo, authService, emailService)

	// ── Care Desk API (superadmin & central counselor) ────────
	careDeskAPI := app.Group("/api/care-desk", middleware.RoleGuard(jwtSecret, domain.RoleSuperAdmin, domain.RoleCounselor))
	handlers.SetupCareDeskAPIRoutes(careDeskAPI, parentRepo, userRepo, authService, assessmentRepo, counselorRepo)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Starting server on :%s\n", port)
	if err := app.Listen(":" + port); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
