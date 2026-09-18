package handlers

import (
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"github.com/jaagrmind/platform-api/internal/core/domain"
	"github.com/jaagrmind/platform-api/internal/middleware"
	"github.com/jaagrmind/platform-api/internal/utils"
)

type AuthHandler struct {
	service      domain.AuthService
	userRepo     domain.UserRepository
	emailService utils.EmailService
}

func SetupAuthRoutes(app *fiber.App, service domain.AuthService, userRepo domain.UserRepository, emailService utils.EmailService, jwtSecret string) {
	handler := &AuthHandler{service: service, userRepo: userRepo, emailService: emailService}
	
	api := app.Group("/api/auth")
	api.Post("/login", handler.Login)
	api.Post("/internal/login", handler.InternalOpsLogin)
	api.Post("/signup", handler.RegisterIndependent)
	api.Post("/register-independent", handler.RegisterIndependent)
	api.Post("/apply-institution", handler.ApplyInstitution)
	api.Post("/reset-password", handler.ResetPassword)
	api.Post("/forgot-password/request-otp", handler.RequestForgotPasswordOTP)
	api.Post("/forgot-password/verify-otp", handler.VerifyForgotPasswordOTP)
	api.Post("/change-password", middleware.Protected(jwtSecret), handler.ChangePassword)
	api.Post("/enable-parent", middleware.Protected(jwtSecret), handler.EnableParentRole)
	api.Get("/me", middleware.Protected(jwtSecret), handler.GetMe)
}

func (h *AuthHandler) Login(c fiber.Ctx) error {
	var req domain.LoginRequest
	
	// Try parsing body
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if req.Email == "" || req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Email and password are required",
		})
	}

	res, err := h.service.Login(c.Context(), req)
	if err != nil {
		// Generic error for invalid creds
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid credentials",
		})
	}

	// Reject internal operations users attempting to log in via public login
	// Conceal internal accounts and routes completely by returning a generic 401 Unauthorized
	if res.User.IsInternal {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid credentials",
		})
	}

	return c.JSON(res)
}

func (h *AuthHandler) InternalOpsLogin(c fiber.Ctx) error {
	var req domain.LoginRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if req.Email == "" || req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Email and password are required",
		})
	}

	res, err := h.service.Login(c.Context(), req)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid credentials",
		})
	}

	// Reject non-internal users
	if !res.User.IsInternal {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Access restricted to JaagrMind internal operations personnel.",
		})
	}

	return c.JSON(res)
}

func (h *AuthHandler) EnableParentRole(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	if err := h.userRepo.AddRole(c.Context(), userID, domain.RoleParent, ""); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to activate parent role: " + err.Error()})
	}

	user, err := h.userRepo.GetUserByID(c.Context(), userID)
	if err != nil || user == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}

	var roleStrings []string
	for _, r := range user.Roles {
		roleStrings = append(roleStrings, r.Role)
	}

	token, err := h.service.GenerateToken(domain.TokenPayload{
		UserID: user.ID,
		Roles:  roleStrings,
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update session token"})
	}

	if h.emailService != nil {
		go func(email, name string) {
			_ = h.emailService.SendParentWelcomeEmail(email, name)
		}(user.Email, user.Name)
	}

	return c.JSON(fiber.Map{
		"message": "Parent dashboard successfully enabled",
		"token":   token,
		"user":    user,
	})
}

func (h *AuthHandler) RegisterIndependent(c fiber.Ctx) error {
	var req domain.IndependentSignupRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.Name = strings.TrimSpace(req.Name)
	if req.Email == "" || req.Password == "" || req.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Name, email, and password are required"})
	}

	if len(req.Password) < 6 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Password must be at least 6 characters"})
	}

	// Corporate domain block: prevent internal @jaagrmind.com emails from registering on public consumer signup
	if strings.HasSuffix(req.Email, "@jaagrmind.com") {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "JaagrMind corporate email addresses cannot be used for independent or family signups. Please use your personal email address, or sign in to the internal operations console at /internal-ops/signin.",
		})
	}

	accountType := strings.ToLower(strings.TrimSpace(req.AccountType))
	if accountType == "" {
		accountType = domain.RoleParent
	}
	if accountType == domain.RoleStudent {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Direct student registration is managed through your institution. Please use your School Access ID to sign in at /student/login.",
		})
	}
	if accountType != domain.RoleParent && accountType != domain.RoleRelative {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid account type. Independent registration is available for Parents and Guardians."})
	}

	// Check if user already exists
	existing, _ := h.userRepo.GetUserByEmail(c.Context(), req.Email)
	if existing != nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "An account with this email already exists"})
	}

	hash, err := h.service.HashPassword(req.Password)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to process password"})
	}

	metadata := map[string]any{
		"account_type": accountType,
		"grade":        req.Grade,
		"child_name":   req.ChildName,
		"school_name":  req.SchoolName,
	}

	user, err := h.userRepo.CreateIndependentUser(c.Context(), req.Email, req.Name, hash, req.Phone, metadata)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create user: " + err.Error()})
	}

	if err := h.userRepo.AddRole(c.Context(), user.ID, accountType, ""); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to assign user role: " + err.Error()})
	}
	user.Roles = []domain.UserRole{{UserID: user.ID, Role: accountType}}

	token, err := h.service.GenerateToken(domain.TokenPayload{
		UserID: user.ID,
		Roles:  []string{accountType},
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate session token"})
	}

	if h.emailService != nil && (accountType == domain.RoleParent || accountType == domain.RoleRelative) {
		go func(email, name string) {
			_ = h.emailService.SendParentWelcomeEmail(email, name)
		}(user.Email, user.Name)
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"token": token,
		"user":  user,
		"message": "Independent account created successfully",
	})
}

func (h *AuthHandler) ApplyInstitution(c fiber.Ctx) error {
	var req domain.ApplyInstitutionRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	req.InstituteName = strings.TrimSpace(req.InstituteName)
	req.ContactName = strings.TrimSpace(req.ContactName)
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.Phone = strings.TrimSpace(req.Phone)

	if req.InstituteName == "" || req.ContactName == "" || req.Email == "" || req.Phone == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Institute name, contact name, email, and phone are required"})
	}

	app := domain.InstitutionApplication{
		InstituteName:     req.InstituteName,
		InstituteType:     req.InstituteType,
		City:              req.City,
		State:             req.State,
		ContactName:       req.ContactName,
		Designation:       req.Designation,
		Email:             req.Email,
		Phone:             req.Phone,
		EstimatedStudents: req.EstimatedStudents,
		Message:           req.Message,
		Status:            "pending",
	}
	validSchoolTypes := map[string]bool{
		"K-12 School":                                true,
		"Senior Secondary High School (Grades 9-12)": true,
		"Secondary School (Grades 6-10)":             true,
		"Primary & Middle School (Grades 1-8)":       true,
	}
	if !validSchoolTypes[app.InstituteType] {
		app.InstituteType = "K-12 School"
	}

	created, err := h.userRepo.CreateInstitutionApplication(c.Context(), app)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to submit application: " + err.Error()})
	}

	if h.emailService != nil {
		go func(email, instituteName, contactName string) {
			_ = h.emailService.SendInstitutionWelcomeEmail(email, instituteName, contactName)
		}(created.Email, created.InstituteName, created.ContactName)
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"application": created,
		"message":     "Institution application submitted successfully. Our onboarding team will contact you within 24 hours.",
	})
}

func (h *AuthHandler) ChangePassword(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req domain.ChangePasswordRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.CurrentPassword == "" || req.NewPassword == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Current and new passwords are required"})
	}

	if len(req.NewPassword) < 8 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "New password must be at least 8 characters"})
	}

	user, err := h.userRepo.GetUserByID(c.Context(), userID)
	if err != nil || user == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}

	if !h.service.VerifyPassword(user.PasswordHash, req.CurrentPassword) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Incorrect current password"})
	}

	newHash, err := h.service.HashPassword(req.NewPassword)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to process password"})
	}

	if err := h.userRepo.UpdatePassword(c.Context(), userID, newHash); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update password"})
	}

	return c.JSON(fiber.Map{"success": true, "message": "Password changed successfully"})
}

func (h *AuthHandler) ResetPassword(c fiber.Ctx) error {
	var req domain.PasswordResetRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	req.Token = strings.TrimSpace(req.Token)
	req.Email = strings.TrimSpace(req.Email)
	req.Phone = strings.TrimSpace(req.Phone)
	req.NewPassword = strings.TrimSpace(req.NewPassword)

	if req.Token == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Reset token is required"})
	}
	if req.Email == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Registered email address is required for identity verification"})
	}
	if req.Phone == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Registered mobile number is required for identity verification"})
	}
	if len(req.NewPassword) < 8 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Password must be at least 8 characters long"})
	}

	newHash, err := h.service.HashPassword(req.NewPassword)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to process password"})
	}

	user, err := h.userRepo.VerifyAndResetPassword(c.Context(), req.Token, req.Email, req.Phone, newHash)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	var roles []string
	for _, r := range user.Roles {
		roles = append(roles, r.Role)
	}

	token, err := h.service.GenerateToken(domain.TokenPayload{
		UserID: user.ID,
		Roles:  roles,
	})
	if err != nil {
		return c.JSON(fiber.Map{
			"success": true,
			"message": "Password updated successfully. Please log in with your new credentials.",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"token":   token,
		"user":    user,
		"message": "Password verified and updated successfully.",
	})
}

func (h *AuthHandler) RequestForgotPasswordOTP(c fiber.Ctx) error {
	var req domain.RequestOTPRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request payload"})
	}

	cleanEmail := strings.ToLower(strings.TrimSpace(req.Email))
	cleanPhone := strings.TrimSpace(req.Phone)

	if cleanEmail == "" || cleanPhone == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Both registered email address and mobile number are required for verification.",
		})
	}

	user, err := h.userRepo.GetUserByEmail(c.Context(), cleanEmail)
	if err != nil || user == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "No enrolled or provisioned institutional account matches this email address.",
		})
	}

	// Generate 6-digit OTP and reset token
	// Cryptographically or pseudo-random 6-digit code
	nano := time.Now().UnixNano()
	codeInt := (nano % 900000) + 100000
	if codeInt < 0 {
		codeInt = -codeInt
	}
	otpCode := fmt.Sprintf("%06d", codeInt)
	token := uuid.NewString()
	expiresAt := time.Now().Add(15 * time.Minute)

	if err := h.userRepo.CreateOTPVerification(c.Context(), cleanEmail, cleanPhone, otpCode, token, expiresAt); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate verification request: " + err.Error(),
		})
	}

	// In server logs
	fmt.Printf("[AUTH-OTP] Security Code for %s (%s): %s (Valid for 15 mins)\n", cleanEmail, cleanPhone, otpCode)

	// Send OTP email via Resend
	if h.emailService != nil {
		go func(targetEmail, code string) {
			_ = h.emailService.SendPasswordResetOTPEmail(targetEmail, code)
		}(cleanEmail, otpCode)
	}

	return c.JSON(fiber.Map{
		"success":  true,
		"message":  "A 6-digit verification code has been dispatched to your registered email address.",
		"email":    cleanEmail,
		"demo_otp": otpCode, // Provided so UI can assist developer/demo testing
		"expires_in_minutes": 15,
	})
}

func (h *AuthHandler) VerifyForgotPasswordOTP(c fiber.Ctx) error {
	var req domain.VerifyOTPRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request payload"})
	}

	cleanEmail := strings.ToLower(strings.TrimSpace(req.Email))
	cleanOTP := strings.TrimSpace(req.OTP)

	if cleanEmail == "" || cleanOTP == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Email and 6-digit OTP code are required"})
	}

	token, err := h.userRepo.VerifyOTP(c.Context(), cleanEmail, cleanOTP)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"token":   token,
		"message": "Identity verified successfully. You may now set your new password.",
	})
}

func (h *AuthHandler) GetMe(c fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(string)
	if !ok || userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	user, err := h.userRepo.GetUserByID(c.Context(), userID)
	if err != nil || user == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}
	return c.JSON(user)
}



