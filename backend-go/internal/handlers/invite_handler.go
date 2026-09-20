package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"github.com/jaagrmind/platform-api/internal/core/domain"
	"github.com/jaagrmind/platform-api/internal/utils"
)

type InviteHandler struct {
	inviteRepo domain.InviteRepository
	userRepo   domain.UserRepository
	schoolRepo domain.SchoolRepository
	authSvc    domain.AuthService
}

func SetupInviteRoutes(app *fiber.App, inviteRepo domain.InviteRepository, userRepo domain.UserRepository, schoolRepo domain.SchoolRepository, authSvc domain.AuthService, jwtSecret string) {
	handler := &InviteHandler{
		inviteRepo: inviteRepo,
		userRepo:   userRepo,
		schoolRepo: schoolRepo,
		authSvc:    authSvc,
	}

	// Public routes (token-based auth, no JWT needed)
	app.Get("/api/invite/:token", handler.ValidateInvite)
	app.Post("/api/invite/:token/accept", handler.AcceptInvite)
}

// ValidateInvite checks if an invite token is valid and not expired
func (h *InviteHandler) ValidateInvite(c fiber.Ctx) error {
	token := c.Params("token")
	invite, err := h.inviteRepo.GetByToken(c.Context(), token)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Invalid invite link"})
	}

	if invite.AcceptedAt != nil {
		return c.Status(fiber.StatusGone).JSON(fiber.Map{
			"error":       "This onboarding invitation has already been accepted and activated.",
			"code":        "ALREADY_ACCEPTED",
			"email":       invite.Email,
			"school_name": invite.SchoolName,
		})
	}

	if time.Now().After(invite.ExpiresAt) {
		return c.Status(fiber.StatusGone).JSON(fiber.Map{
			"error":       "This onboarding invitation link has expired.",
			"code":        "EXPIRED",
			"email":       invite.Email,
			"school_name": invite.SchoolName,
		})
	}

	return c.JSON(fiber.Map{
		"school_name":   invite.SchoolName,
		"email":         invite.Email,
		"phone_number":  invite.PhoneNumber,
		"temp_password": invite.TempPassword,
	})
}

// AcceptInvite handles the school onboarding: set password, fill details, create school + user
func (h *InviteHandler) AcceptInvite(c fiber.Ctx) error {
	token := c.Params("token")

	invite, err := h.inviteRepo.GetByToken(c.Context(), token)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Invalid invite link"})
	}

	if invite.AcceptedAt != nil {
		return c.Status(fiber.StatusGone).JSON(fiber.Map{
			"error":       "This invite has already been accepted",
			"code":        "ALREADY_ACCEPTED",
			"email":       invite.Email,
			"school_name": invite.SchoolName,
		})
	}

	if time.Now().After(invite.ExpiresAt) {
		return c.Status(fiber.StatusGone).JSON(fiber.Map{"error": "This invite has expired"})
	}

	var req domain.AcceptInviteRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}

	if req.Password == "" || len(req.Password) < 8 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Password must be at least 8 characters"})
	}

	// Generate a unique School Code
	codePrefix := strings.ToUpper(strings.ReplaceAll(invite.SchoolName, " ", ""))
	if len(codePrefix) > 4 {
		codePrefix = codePrefix[:4]
	}
	schoolCode := fmt.Sprintf("%s%d", codePrefix, time.Now().Unix()%10000)

	phone := strings.TrimSpace(req.Phone)
	if phone == "" {
		phone = invite.PhoneNumber
	}

	// 1. Create the school
	school, err := h.schoolRepo.Create(c.Context(), domain.CreateSchoolRequest{
		Name:        invite.SchoolName,
		SchoolCode:  schoolCode,
		City:        req.City,
		Contact:     invite.Email,
		PhoneNumber: phone,
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create school"})
	}

	// 2. Hash password and create/update user
	hash, err := h.authSvc.HashPassword(req.Password)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to process password"})
	}

	user, err := h.userRepo.GetUserByEmail(c.Context(), invite.Email)
	if err == nil && user != nil {
		_ = h.userRepo.UpdatePassword(c.Context(), user.ID, hash)
		if req.Name != "" {
			_ = h.userRepo.UpdateUser(c.Context(), user.ID, req.Name, invite.Email)
		}
	} else {
		user, err = h.userRepo.CreateUser(c.Context(), invite.Email, req.Name, hash)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create account"})
		}
	}

	// 3. Assign school_admin role scoped to this school
	_ = h.userRepo.AddRole(c.Context(), user.ID, domain.RoleSchoolAdmin, school.ID)

	// 4. Mark invite as accepted
	_ = h.inviteRepo.MarkAccepted(c.Context(), token)

	// 5. Generate JWT token for immediate seamless login
	tokenStr, _ := h.authSvc.GenerateToken(domain.TokenPayload{
		UserID: user.ID,
		Roles:  []string{domain.RoleSchoolAdmin},
	})

	freshUser, _ := h.userRepo.GetUserByID(c.Context(), user.ID)
	if freshUser == nil {
		freshUser = user
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message":   "School onboarded successfully",
		"token":     tokenStr,
		"user":      freshUser,
		"school_id": school.ID,
	})
}

// CreateInvite is called by superadmin to invite a school
func CreateInviteHandler(inviteRepo domain.InviteRepository, emailSvc utils.EmailService) fiber.Handler {
	return func(c fiber.Ctx) error {
		var req domain.InviteSchoolRequest
		if err := c.Bind().Body(&req); err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
		}

		if req.SchoolName == "" || req.Email == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "School name and email are required"})
		}

		// Generate a secure token
		tokenBytes := make([]byte, 32)
		if _, err := rand.Read(tokenBytes); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate token"})
		}
		token := hex.EncodeToString(tokenBytes)

		// Determine base URL dynamically from request Origin/Referer if available
		baseURL := utils.GetBaseFrontendURL()
		if origin := c.Get("Origin"); origin != "" {
			baseURL = strings.TrimRight(origin, "/")
		} else if referer := c.Get("Referer"); referer != "" {
			if idx := strings.Index(referer, "/internal-ops"); idx != -1 {
				baseURL = referer[:idx]
			} else if idx := strings.Index(referer, "/admin"); idx != -1 {
				baseURL = referer[:idx]
			}
		}

		invite := domain.SchoolInvite{
			ID:           uuid.New().String(),
			SchoolName:   req.SchoolName,
			Email:        req.Email,
			PhoneNumber:  req.PhoneNumber,
			TempPassword: req.TempPassword,
			Token:        token,
			ExpiresAt:    time.Now().Add(7 * 24 * time.Hour), // 7 day expiry
		}

		if err := inviteRepo.Create(c.Context(), invite); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create invite"})
		}

		// Send email using Resend
		go func() {
			_ = emailSvc.SendSchoolInviteEmail(invite.Email, invite.SchoolName, invite.Token)
		}()

		return c.Status(fiber.StatusCreated).JSON(fiber.Map{
			"message":       "Invite created and email sent",
			"token":         token,
			"invite_link":   fmt.Sprintf("%s/invite/%s", baseURL, token),
			"temp_password": req.TempPassword,
		})
	}
}

// GetSchoolInvitesHandler lists all generated school onboarding invitations
func GetSchoolInvitesHandler(inviteRepo domain.InviteRepository) fiber.Handler {
	return func(c fiber.Ctx) error {
		invites, err := inviteRepo.GetAll(c.Context())
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to retrieve school invitations: " + err.Error()})
		}
		return c.JSON(invites)
	}
}

// CancelSchoolInviteHandler revokes / deletes a pending school invitation
func CancelSchoolInviteHandler(inviteRepo domain.InviteRepository) fiber.Handler {
	return func(c fiber.Ctx) error {
		id := c.Params("id")
		if id == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invitation ID is required"})
		}
		if err := inviteRepo.Cancel(c.Context(), id); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to cancel invitation: " + err.Error()})
		}
		return c.JSON(fiber.Map{"message": "Invitation revoked successfully"})
	}
}

