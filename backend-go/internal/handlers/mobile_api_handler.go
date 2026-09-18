package handlers

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/jaagrmind/platform-api/internal/core/domain"
	"github.com/jaagrmind/platform-api/internal/middleware"
	"github.com/jaagrmind/platform-api/internal/repository"
	"github.com/jaagrmind/platform-api/internal/utils"
)

type MobileAPIHandler struct {
	repo        *repository.MobileRepository
	userRepo    domain.UserRepository
	authService domain.AuthService
	emailSvc    utils.EmailService
	jwtSecret   string
}

func NewMobileAPIHandler(repo *repository.MobileRepository, userRepo domain.UserRepository, authService domain.AuthService, emailSvc utils.EmailService, jwtSecret string) *MobileAPIHandler {
	return &MobileAPIHandler{
		repo:        repo,
		userRepo:    userRepo,
		authService: authService,
		emailSvc:    emailSvc,
		jwtSecret:   jwtSecret,
	}
}

// ── Student Auth ─────────────────────────────────────────────

func (h *MobileAPIHandler) ValidateStudent(c fiber.Ctx) error {
	var body struct {
		AccessID string `json:"accessId"`
	}
	if err := c.Bind().Body(&body); err != nil || body.AccessID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Access ID is required"})
	}

	prof, err := h.repo.ValidateStudentAccessID(c.Context(), body.AccessID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Student with this access ID not found or inactive"})
	}

	token, err := h.authService.GenerateToken(domain.TokenPayload{
		UserID: prof.ID,
		Roles:  []string{"student"},
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate token"})
	}

	return c.JSON(fiber.Map{
		"user": fiber.Map{
			"id":          prof.ID,
			"displayName": prof.DisplayName,
			"school":      prof.School,
			"class":       prof.Class,
			"role":        "student",
		},
		"session": fiber.Map{
			"access_token":  token,
			"refresh_token": token,
		},
	})
}

// ── Parent Auth ──────────────────────────────────────────────

func (h *MobileAPIHandler) RegisterParent(c fiber.Ctx) error {
	var body struct {
		Email       string `json:"email"`
		Password    string `json:"password"`
		DisplayName string `json:"displayName"`
	}
	if err := c.Bind().Body(&body); err != nil || body.Email == "" || body.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Email and password are required"})
	}

	name := body.DisplayName
	if name == "" {
		name = "Parent"
	}

	hash, err := h.authService.HashPassword(body.Password)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to process password"})
	}

	user, err := h.userRepo.CreateUser(c.Context(), body.Email, name, hash)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "User with this email already exists"})
	}

	_ = h.userRepo.AddRole(c.Context(), user.ID, domain.RoleParent, "")

	token, err := h.authService.GenerateToken(domain.TokenPayload{
		UserID: user.ID,
		Roles:  []string{domain.RoleParent},
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate token"})
	}

	if h.emailSvc != nil {
		go func(email, name string) {
			_ = h.emailSvc.SendParentWelcomeEmail(email, name)
		}(user.Email, user.Name)
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"user": fiber.Map{
			"id":          user.ID,
			"displayName": user.Name,
			"role":        "parent",
		},
		"session": fiber.Map{
			"access_token":  token,
			"refresh_token": token,
		},
	})
}

func (h *MobileAPIHandler) LoginParent(c fiber.Ctx) error {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.Bind().Body(&body); err != nil || body.Email == "" || body.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Email and password are required"})
	}

	loginResp, err := h.authService.Login(c.Context(), domain.LoginRequest{
		Email:    body.Email,
		Password: body.Password,
	})
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid credentials"})
	}

	return c.JSON(fiber.Map{
		"user": fiber.Map{
			"id":          loginResp.User.ID,
			"displayName": loginResp.User.Name,
			"role":        "parent",
		},
		"session": fiber.Map{
			"access_token":  loginResp.Token,
			"refresh_token": loginResp.Token,
		},
	})
}

func (h *MobileAPIHandler) LinkParentChild(c fiber.Ctx) error {
	parentID := middleware.ExtractUserID(c)
	var body struct {
		AccessID      string `json:"accessId"`
		StudentUserID string `json:"studentUserId"`
	}
	if err := c.Bind().Body(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid payload"})
	}

	targetAccessID := body.AccessID
	if targetAccessID == "" && body.StudentUserID != "" {
		targetAccessID = body.StudentUserID
	}

	if targetAccessID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "accessId is required"})
	}

	studentID, err := h.repo.LinkParentChild(c.Context(), parentID, targetAccessID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"link": fiber.Map{
			"studentId": studentID,
		},
	})
}

func (h *MobileAPIHandler) GetParentChildren(c fiber.Ctx) error {
	parentID := middleware.ExtractUserID(c)
	children, err := h.repo.GetParentChildren(c.Context(), parentID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"success":  true,
		"children": children,
	})
}

func (h *MobileAPIHandler) GetParentChildProfile(c fiber.Ctx) error {
	studentID := c.Query("studentId")
	if studentID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "studentId query param is required"})
	}

	prof, err := h.repo.GetStudentMobileProfile(c.Context(), studentID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Student not found"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"profile": prof,
	})
}

func (h *MobileAPIHandler) GetParentChildMoodHistory(c fiber.Ctx) error {
	studentID := c.Query("studentId")
	if studentID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "studentId query param is required"})
	}

	days, _ := strconv.Atoi(c.Query("days", "7"))
	entryType := c.Query("type", "")

	entries, err := h.repo.GetMoodHistory(c.Context(), studentID, days, entryType)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"entries": entries,
		"count":   len(entries),
	})
}

// ── Daily Pathway (Psychologist 16-Track Engine) ─────────────

func (h *MobileAPIHandler) GetTodaysPathway(c fiber.Ctx) error {
	studentID := middleware.ExtractUserID(c)
	todayStr := time.Now().Format("2006-01-02")

	dp, err := h.repo.GetOrCreateDailyPathway(c.Context(), studentID, todayStr)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate pathway: " + err.Error()})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"pathway": fiber.Map{
			"id":              dp.ID,
			"date":            dp.Date,
			"track_id":        dp.TrackID,
			"track_name":      dp.TrackName,
			"student_heading": dp.StudentHeading,
			"student_subtext": dp.StudentSubtext,
			"is_balance_mode": dp.IsBalanceMode,
			"isCompleted":     dp.IsCompleted,
			"completed_count": dp.CompletedCount,
			"activities":      dp.AssignedActivities,
		},
	})
}

func (h *MobileAPIHandler) CompletePathwayActivity(c fiber.Ctx) error {
	studentID := middleware.ExtractUserID(c)
	var body struct {
		ActivityType string `json:"activityType"`
	}
	if err := c.Bind().Body(&body); err != nil || body.ActivityType == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "activityType is required"})
	}

	todayStr := time.Now().Format("2006-01-02")
	completedCount, total, err := h.repo.CompletePathwayActivity(c.Context(), studentID, todayStr, body.ActivityType)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"success":        true,
		"completedCount": completedCount,
		"total":          total,
	})
}

// ── Activity Sessions ────────────────────────────────────────

func (h *MobileAPIHandler) SubmitSession(c fiber.Ctx) error {
	studentID := middleware.ExtractUserID(c)

	var req struct {
		ActivityType string                  `json:"activityType"`
		StartedAt    string                  `json:"startedAt"`
		EndedAt      *string                 `json:"endedAt"`
		DurationMs   int                     `json:"durationMs"`
		Interactions []domain.RawInteraction `json:"interactions"`
		ThemeUsed    string                  `json:"themeUsed"`
		Completed    bool                    `json:"completed"`
		MoodEntryID  *string                 `json:"moodEntryId"`
	}
	if err := c.Bind().Body(&req); err != nil || req.ActivityType == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "activityType is required"})
	}

	startedTime, err := time.Parse(time.RFC3339, req.StartedAt)
	if err != nil {
		startedTime = time.Now()
	}

	var endedTime *time.Time
	if req.EndedAt != nil {
		t, err := time.Parse(time.RFC3339, *req.EndedAt)
		if err == nil {
			endedTime = &t
		}
	}

	session := domain.ActivitySession{
		StudentID:      studentID,
		ActivityType:   req.ActivityType,
		ActivityBucket: "ATTN_STABILITY",
		ThemeUsed:      req.ThemeUsed,
		StartedAt:      startedTime,
		EndedAt:        endedTime,
		DurationMs:     req.DurationMs,
		Completed:      req.Completed,
		MoodEntryID:    req.MoodEntryID,
	}

	metrics, xpEarned, err := h.repo.RecordActivitySession(c.Context(), &session, req.Interactions)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success":       true,
		"streakAwarded": true,
		"xp": fiber.Map{
			"estimated": xpEarned,
			"final":     xpEarned,
			"delta":     xpEarned,
		},
		"metrics": metrics,
		"session": fiber.Map{
			"id":           session.ID,
			"activityType": session.ActivityType,
			"durationMs":   session.DurationMs,
		},
	})
}

func (h *MobileAPIHandler) GetSessionHistory(c fiber.Ctx) error {
	studentID := middleware.ExtractUserID(c)
	targetStudent := studentID

	queryStudent := c.Query("studentId")
	if queryStudent != "" {
		targetStudent = queryStudent
	}

	days, _ := strconv.Atoi(c.Query("days", "7"))
	bucket := c.Query("bucket", "")
	limit, _ := strconv.Atoi(c.Query("limit", "20"))

	sessions, err := h.repo.GetSessionHistory(c.Context(), targetStudent, days, bucket, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"success":  true,
		"sessions": sessions,
		"count":    len(sessions),
	})
}

// ── Mood Tracking ────────────────────────────────────────────

func (h *MobileAPIHandler) RecordMood(c fiber.Ctx) error {
	studentID := middleware.ExtractUserID(c)
	var body struct {
		MoodValue   int    `json:"moodValue"`
		EnergyLevel string `json:"energyLevel"`
		ContextTag  string `json:"contextTag"`
		EntryType   string `json:"entryType"`
	}
	if err := c.Bind().Body(&body); err != nil || body.MoodValue <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "moodValue must be between 1 and 5"})
	}

	entryType := body.EntryType
	if entryType == "" {
		entryType = "daily"
	}

	entry := domain.MoodEntry{
		StudentID:   studentID,
		MoodValue:   body.MoodValue,
		EnergyLevel: body.EnergyLevel,
		ContextTag:  body.ContextTag,
		EntryType:   entryType,
	}

	if err := h.repo.RecordMood(c.Context(), &entry); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"entry":   entry,
	})
}

func (h *MobileAPIHandler) GetMoodHistory(c fiber.Ctx) error {
	studentID := middleware.ExtractUserID(c)
	days, _ := strconv.Atoi(c.Query("days", "7"))
	entryType := c.Query("type", "")

	entries, err := h.repo.GetMoodHistory(c.Context(), studentID, days, entryType)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"entries": entries,
		"count":   len(entries),
	})
}

func (h *MobileAPIHandler) GetLatestMood(c fiber.Ctx) error {
	studentID := middleware.ExtractUserID(c)
	m, err := h.repo.GetLatestMood(c.Context(), studentID)
	if err != nil {
		return c.JSON(fiber.Map{"mood": nil})
	}
	return c.JSON(fiber.Map{"mood": m})
}

// ── Journal ──────────────────────────────────────────────────

func (h *MobileAPIHandler) CreateJournal(c fiber.Ctx) error {
	studentID := middleware.ExtractUserID(c)
	var body struct {
		Title     string   `json:"title"`
		Content   string   `json:"content"`
		MoodValue *int     `json:"moodValue"`
		Tags      []string `json:"tags"`
	}
	if err := c.Bind().Body(&body); err != nil || body.Content == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "content is required"})
	}

	entry := domain.JournalEntry{
		StudentID: studentID,
		Title:     body.Title,
		Content:   body.Content,
		MoodValue: body.MoodValue,
		Tags:      body.Tags,
	}

	if err := h.repo.CreateJournalEntry(c.Context(), &entry); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"entry":   entry,
	})
}

func (h *MobileAPIHandler) GetJournalHistory(c fiber.Ctx) error {
	studentID := middleware.ExtractUserID(c)
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))

	entries, total, err := h.repo.GetJournalHistory(c.Context(), studentID, limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"entries": entries,
		"total":   total,
		"limit":   limit,
		"offset":  offset,
	})
}

func (h *MobileAPIHandler) DeleteJournal(c fiber.Ctx) error {
	studentID := middleware.ExtractUserID(c)
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "id is required"})
	}

	if err := h.repo.DeleteJournalEntry(c.Context(), studentID, id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"success": true})
}

// ── Profile & Digital Garden ─────────────────────────────────

func (h *MobileAPIHandler) GetStudentProfile(c fiber.Ctx) error {
	studentID := middleware.ExtractUserID(c)
	prof, err := h.repo.GetStudentMobileProfile(c.Context(), studentID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Profile not found"})
	}
	return c.JSON(fiber.Map{"success": true, "profile": prof})
}

func (h *MobileAPIHandler) UpdateStudentProfile(c fiber.Ctx) error {
	studentID := middleware.ExtractUserID(c)
	var body struct {
		AvatarURL string `json:"avatarUrl"`
	}
	if err := c.Bind().Body(&body); err != nil || body.AvatarURL == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "avatarUrl is required"})
	}

	if err := h.repo.UpdateStudentAvatar(c.Context(), studentID, body.AvatarURL); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"success": true})
}

func (h *MobileAPIHandler) GetGardenState(c fiber.Ctx) error {
	studentID := middleware.ExtractUserID(c)
	target := studentID
	if q := c.Query("studentId"); q != "" {
		target = q
	}

	state, err := h.repo.GetGardenState(c.Context(), target)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(state)
}

func (h *MobileAPIHandler) WaterGarden(c fiber.Ctx) error {
	var body struct {
		StudentID string `json:"studentId"`
	}
	_ = c.Bind().Body(&body)

	target := body.StudentID
	if target == "" {
		target = middleware.ExtractUserID(c)
	}

	res, err := h.repo.WaterGarden(c.Context(), target)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(res)
}

func (h *MobileAPIHandler) GetCommunity(c fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"totalInCohort": 45,
		"cohort": fiber.Map{
			"schoolName": "Oakwood High School",
			"grade":      "10",
			"section":    "A",
		},
		"me": fiber.Map{
			"rank":     5,
			"xpPoints": 1250,
		},
		"topStudents": []fiber.Map{
			{"rank": 1, "displayName": "S***", "xpPoints": 3400, "profileImageUrl": "https://api.dicebear.com/7.x/bottts/svg?seed=Sam"},
			{"rank": 2, "displayName": "M***", "xpPoints": 2800, "profileImageUrl": "https://api.dicebear.com/7.x/bottts/svg?seed=Maya"},
			{"rank": 3, "displayName": "A***", "xpPoints": 2100, "profileImageUrl": "https://api.dicebear.com/7.x/bottts/svg?seed=Aarav"},
		},
	})
}

func (h *MobileAPIHandler) GetTraits(c fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"focus":       fiber.Map{"value": 78.5, "trend": "up"},
		"calmness":    fiber.Map{"value": 82.0, "trend": "up"},
		"clarity":     fiber.Map{"value": 71.0, "trend": "steady"},
		"consistency": fiber.Map{"value": 94.0, "trend": "up"},
	})
}

func (h *MobileAPIHandler) GetTraitHistory(c fiber.Ctx) error {
	days, _ := strconv.Atoi(c.Query("days", "7"))
	var history []fiber.Map
	for i := 0; i < days; i++ {
		d := time.Now().AddDate(0, 0, -i).Format("2006-01-02")
		history = append(history, fiber.Map{
			"date":  d,
			"value": 70.0 + float64(i*2),
		})
	}
	return c.JSON(fiber.Map{"history": history})
}

func (h *MobileAPIHandler) GetInsights(c fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"insights": []fiber.Map{
			{
				"id":          "insight-1",
				"type":        "streak",
				"title":       "Sustained Rhythm!",
				"description": "Your consistency is building strong neural pathways.",
				"icon":        "streak",
			},
			{
				"id":          "insight-2",
				"type":        "mood",
				"title":       "Calmness is Rising",
				"description": "Your nervous system regulation exercises are showing steady progress.",
				"icon":        "growth",
			},
		},
	})
}

func (h *MobileAPIHandler) CheckHealth(c fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"status":    "ok",
		"engine":    "16-track-pathway-v2",
		"timestamp": time.Now().Format(time.RFC3339),
	})
}

// SetupMobileAPIRoutes mounts all Mobile API endpoints on the Fiber application
func SetupMobileAPIRoutes(app *fiber.App, handler *MobileAPIHandler, jwtSecret string) {
	// Public Mobile Auth
	app.Post("/api/students/validate", handler.ValidateStudent)
	app.Post("/api/parents/register", handler.RegisterParent)
	app.Post("/api/parents/login", handler.LoginParent)

	// Parent Portal (Mobile)
	app.Post("/api/parents/link", middleware.RoleGuard(jwtSecret, domain.RoleParent, domain.RoleSuperAdmin), handler.LinkParentChild)
	app.Get("/api/parents/children", middleware.RoleGuard(jwtSecret, domain.RoleParent, domain.RoleSuperAdmin), handler.GetParentChildren)
	app.Get("/api/parents/child-profile", middleware.RoleGuard(jwtSecret, domain.RoleParent, domain.RoleSuperAdmin), handler.GetParentChildProfile)
	app.Get("/api/parents/child-mood-history", middleware.RoleGuard(jwtSecret, domain.RoleParent, domain.RoleSuperAdmin), handler.GetParentChildMoodHistory)

	// Pathway & Activities
	app.Get("/api/pathway/today", middleware.RoleGuard(jwtSecret, domain.RoleStudent, domain.RoleSuperAdmin), handler.GetTodaysPathway)
	app.Post("/api/pathway/complete", middleware.RoleGuard(jwtSecret, domain.RoleStudent, domain.RoleSuperAdmin), handler.CompletePathwayActivity)

	// Sessions
	app.Post("/api/sessions", middleware.RoleGuard(jwtSecret, domain.RoleStudent, domain.RoleSuperAdmin), handler.SubmitSession)
	app.Get("/api/sessions/history", middleware.RoleGuard(jwtSecret, domain.RoleStudent, domain.RoleParent, domain.RoleSuperAdmin), handler.GetSessionHistory)

	// Mood
	app.Post("/api/mood", middleware.RoleGuard(jwtSecret, domain.RoleStudent, domain.RoleSuperAdmin), handler.RecordMood)
	app.Get("/api/mood/history", middleware.RoleGuard(jwtSecret, domain.RoleStudent, domain.RoleParent, domain.RoleSuperAdmin), handler.GetMoodHistory)
	app.Get("/api/mood/latest", middleware.RoleGuard(jwtSecret, domain.RoleStudent, domain.RoleParent, domain.RoleSuperAdmin), handler.GetLatestMood)

	// Journal
	app.Post("/api/journal", middleware.RoleGuard(jwtSecret, domain.RoleStudent, domain.RoleSuperAdmin), handler.CreateJournal)
	app.Get("/api/journal/history", middleware.RoleGuard(jwtSecret, domain.RoleStudent, domain.RoleSuperAdmin), handler.GetJournalHistory)
	app.Delete("/api/journal/:id", middleware.RoleGuard(jwtSecret, domain.RoleStudent, domain.RoleSuperAdmin), handler.DeleteJournal)

	// Profile & Digital Garden
	app.Get("/api/students/profile", middleware.RoleGuard(jwtSecret, domain.RoleStudent, domain.RoleSuperAdmin), handler.GetStudentProfile)
	app.Put("/api/students/profile", middleware.RoleGuard(jwtSecret, domain.RoleStudent, domain.RoleSuperAdmin), handler.UpdateStudentProfile)
	app.Get("/api/garden", middleware.RoleGuard(jwtSecret, domain.RoleStudent, domain.RoleParent, domain.RoleSuperAdmin), handler.GetGardenState)
	app.Post("/api/garden/water", middleware.RoleGuard(jwtSecret, domain.RoleStudent, domain.RoleParent, domain.RoleSuperAdmin), handler.WaterGarden)

	// Insights, Community & Traits
	app.Get("/api/students/community", middleware.RoleGuard(jwtSecret, domain.RoleStudent, domain.RoleSuperAdmin), handler.GetCommunity)
	app.Get("/api/traits", middleware.RoleGuard(jwtSecret, domain.RoleStudent, domain.RoleParent, domain.RoleSuperAdmin), handler.GetTraits)
	app.Get("/api/traits/history", middleware.RoleGuard(jwtSecret, domain.RoleStudent, domain.RoleParent, domain.RoleSuperAdmin), handler.GetTraitHistory)
	app.Get("/api/insights", middleware.RoleGuard(jwtSecret, domain.RoleStudent, domain.RoleParent, domain.RoleSuperAdmin), handler.GetInsights)
	app.Get("/api/health", handler.CheckHealth)
}
