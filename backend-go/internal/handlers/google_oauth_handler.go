package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jaagrmind/platform-api/internal/core/domain"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

type GoogleOAuthHandler struct {
	userRepo    domain.UserRepository
	authService domain.AuthService
	jwtSecret   string
	frontendURL string
	oauthConfig *oauth2.Config
}

func SetupGoogleOAuthRoutes(
	app *fiber.App,
	userRepo domain.UserRepository,
	authService domain.AuthService,
	jwtSecret string,
	frontendURL string,
) {
	clientID := os.Getenv("GOOGLE_CLIENT_ID")
	clientSecret := os.Getenv("GOOGLE_CLIENT_SECRET")
	redirectURL := os.Getenv("GOOGLE_REDIRECT_URL")
	if redirectURL == "" {
		redirectURL = "http://localhost:8080/api/auth/google/callback"
	}
	if frontendURL == "" {
		frontendURL = os.Getenv("FRONTEND_URL")
		if frontendURL == "" {
			frontendURL = "http://localhost:3000"
		}
	}

	conf := &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  redirectURL,
		Scopes: []string{
			"openid",
			"https://www.googleapis.com/auth/userinfo.email",
			"https://www.googleapis.com/auth/userinfo.profile",
		},
		Endpoint: google.Endpoint,
	}

	h := &GoogleOAuthHandler{
		userRepo:    userRepo,
		authService: authService,
		jwtSecret:   jwtSecret,
		frontendURL: strings.TrimRight(frontendURL, "/"),
		oauthConfig: conf,
	}

	api := app.Group("/api/auth/google")
	api.Get("/login", h.HandleLogin)
	api.Get("/callback", h.HandleCallback)
	api.Get("/verify-setup", h.HandleVerifySetup)
	api.Post("/complete", h.HandleComplete)
}

func (h *GoogleOAuthHandler) HandleLogin(c fiber.Ctx) error {
	// Guard: Ensure Google Client credentials are set
	if h.oauthConfig.ClientID == "" || h.oauthConfig.ClientSecret == "" {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{
			"error": "Google OAuth is not configured yet. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend .env",
		})
	}

	role := strings.ToLower(strings.TrimSpace(c.Query("role", domain.RoleStudent)))
	if role != domain.RoleStudent && role != domain.RoleParent && role != domain.RoleRelative {
		role = domain.RoleStudent
	}

	intent := strings.ToLower(strings.TrimSpace(c.Query("intent", "login")))
	redirectTarget := c.Query("redirect", "/dashboard")

	// Generate cryptographically signed state to prevent CSRF and persist role/intent
	stateClaims := jwt.MapClaims{
		"csrf":     uuid.NewString(),
		"role":     role,
		"intent":   intent,
		"redirect": redirectTarget,
		"exp":      time.Now().Add(15 * time.Minute).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, stateClaims)
	signedState, err := token.SignedString([]byte(h.jwtSecret))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate OAuth state"})
	}

	// Build consent URL with prompt=select_account for predictable multi-account choice
	authURL := h.oauthConfig.AuthCodeURL(
		signedState,
		oauth2.AccessTypeOffline,
		oauth2.SetAuthURLParam("prompt", "select_account"),
	)

	return c.Redirect().To(authURL)
}

func (h *GoogleOAuthHandler) HandleCallback(c fiber.Ctx) error {
	// 1. Check for user cancellation or Google error query parameter
	if googleErr := c.Query("error"); googleErr != "" {
		redirectErr := fmt.Sprintf("%s/login?error=%s", h.frontendURL, url.QueryEscape("Google login was cancelled or encountered an error."))
		return c.Redirect().To(redirectErr)
	}

	code := c.Query("code")
	stateStr := c.Query("state")

	if code == "" || stateStr == "" {
		redirectErr := fmt.Sprintf("%s/login?error=%s", h.frontendURL, url.QueryEscape("Missing OAuth authorization code or state."))
		return c.Redirect().To(redirectErr)
	}

	// 2. Validate state token
	parsedState, err := jwt.Parse(stateStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return []byte(h.jwtSecret), nil
	})
	if err != nil || !parsedState.Valid {
		redirectErr := fmt.Sprintf("%s/login?error=%s", h.frontendURL, url.QueryEscape("Invalid or expired OAuth state. Please try again."))
		return c.Redirect().To(redirectErr)
	}

	claims, ok := parsedState.Claims.(jwt.MapClaims)
	if !ok {
		redirectErr := fmt.Sprintf("%s/login?error=%s", h.frontendURL, url.QueryEscape("Malformed OAuth state claims."))
		return c.Redirect().To(redirectErr)
	}
	suggestedRole, _ := claims["role"].(string)
	if suggestedRole == "" {
		suggestedRole = domain.RoleStudent
	}

	// 3. Exchange code for Google Access Token
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	oauthToken, err := h.oauthConfig.Exchange(ctx, code)
	if err != nil {
		redirectErr := fmt.Sprintf("%s/login?error=%s", h.frontendURL, url.QueryEscape("Failed to exchange code with Google: "+err.Error()))
		return c.Redirect().To(redirectErr)
	}

	// 4. Fetch Google User Profile
	userInfo, err := h.fetchGoogleUserInfo(ctx, oauthToken.AccessToken)
	if err != nil {
		redirectErr := fmt.Sprintf("%s/login?error=%s", h.frontendURL, url.QueryEscape("Failed to fetch Google profile: "+err.Error()))
		return c.Redirect().To(redirectErr)
	}

	// Guard: Internal operations accounts cannot use Google Sign-in.
	normalizedEmail := strings.ToLower(strings.TrimSpace(userInfo.Email))
	if strings.HasSuffix(normalizedEmail, "@jaagrmind.com") || strings.HasSuffix(normalizedEmail, "@jaagrmind.org") {
		redirectErr := fmt.Sprintf("%s/internal-ops/signin?error=%s", h.frontendURL, url.QueryEscape("Internal operations accounts cannot sign in with Google. Please use your official email and password."))
		return c.Redirect().To(redirectErr)
	}

	// 5. Look up in Database:
	// A. By Google ID
	existingUser, _ := h.userRepo.GetUserByGoogleID(ctx, userInfo.Sub)

	// B. If not found by Google ID, look up by Email
	if existingUser == nil {
		existingByEmail, _ := h.userRepo.GetUserByEmail(ctx, userInfo.Email)
		if existingByEmail != nil {
			// Link account with Google ID
			_ = h.userRepo.LinkGoogleAccount(ctx, existingByEmail.ID, userInfo.Sub, userInfo.Picture)
			existingUser = existingByEmail
		}
	}

	// Guard: Reject internal accounts trying to login via Google
	if existingUser != nil && existingUser.IsInternal {
		redirectErr := fmt.Sprintf("%s/internal-ops/signin?error=%s", h.frontendURL, url.QueryEscape("Internal operations accounts cannot sign in with Google. Please use your official email and password."))
		return c.Redirect().To(redirectErr)
	}

	// Case 1: Returning User -> Issue platform session token directly
	if existingUser != nil {
		roleList := make([]string, 0, len(existingUser.Roles))
		for _, r := range existingUser.Roles {
			roleList = append(roleList, r.Role)
		}
		if len(roleList) == 0 {
			roleList = append(roleList, domain.RoleStudent)
		}

		sessionToken, err := h.authService.GenerateToken(domain.TokenPayload{
			UserID: existingUser.ID,
			Roles:  roleList,
		})
		if err != nil {
			redirectErr := fmt.Sprintf("%s/login?error=%s", h.frontendURL, url.QueryEscape("Failed to generate user session token."))
			return c.Redirect().To(redirectErr)
		}

		redirectSuccess := fmt.Sprintf(
			"%s/auth/callback?token=%s&status=existing&name=%s",
			h.frontendURL,
			url.QueryEscape(sessionToken),
			url.QueryEscape(existingUser.Name),
		)
		return c.Redirect().To(redirectSuccess)
	}

	// Case 2: New User -> Issue temporary 15m setup token and send to profile completion
	setupClaims := jwt.MapClaims{
		"google_id":      userInfo.Sub,
		"email":          strings.ToLower(strings.TrimSpace(userInfo.Email)),
		"name":           userInfo.Name,
		"avatar_url":     userInfo.Picture,
		"suggested_role": suggestedRole,
		"type":           "google_setup",
		"exp":            time.Now().Add(15 * time.Minute).Unix(),
	}
	setupJWT := jwt.NewWithClaims(jwt.SigningMethodHS256, setupClaims)
	signedSetupToken, err := setupJWT.SignedString([]byte(h.jwtSecret))
	if err != nil {
		redirectErr := fmt.Sprintf("%s/login?error=%s", h.frontendURL, url.QueryEscape("Failed to generate setup token."))
		return c.Redirect().To(redirectErr)
	}

	redirectNew := fmt.Sprintf("%s/auth/google/complete?setup_token=%s&is_new=true", h.frontendURL, url.QueryEscape(signedSetupToken))
	return c.Redirect().To(redirectNew)
}

func (h *GoogleOAuthHandler) HandleVerifySetup(c fiber.Ctx) error {
	setupToken := c.Query("setup_token")
	if setupToken == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Missing setup token"})
	}

	parsed, err := jwt.Parse(setupToken, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return []byte(h.jwtSecret), nil
	})
	if err != nil || !parsed.Valid {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid or expired setup token. Please sign in again with Google."})
	}

	claims, ok := parsed.Claims.(jwt.MapClaims)
	if !ok || claims["type"] != "google_setup" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid token type"})
	}

	return c.JSON(fiber.Map{
		"google_id":      claims["google_id"],
		"email":          claims["email"],
		"name":           claims["name"],
		"avatar_url":     claims["avatar_url"],
		"suggested_role": claims["suggested_role"],
	})
}

func (h *GoogleOAuthHandler) HandleComplete(c fiber.Ctx) error {
	var req domain.CompleteGoogleSignupRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.SetupToken == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Missing setup token"})
	}

	// Validate setup token
	parsed, err := jwt.Parse(req.SetupToken, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return []byte(h.jwtSecret), nil
	})
	if err != nil || !parsed.Valid {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Setup session expired. Please sign in again with Google."})
	}

	claims, ok := parsed.Claims.(jwt.MapClaims)
	if !ok || claims["type"] != "google_setup" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid token type"})
	}

	googleID, _ := claims["google_id"].(string)
	email, _ := claims["email"].(string)
	avatarURL, _ := claims["avatar_url"].(string)
	defaultName, _ := claims["name"].(string)

	name := strings.TrimSpace(req.Name)
	if name == "" {
		name = defaultName
	}
	if name == "" {
		name = "JaagrMind User"
	}

	// Corporate domain block: prevent internal @jaagrmind.com emails from registering on public consumer signup
	if strings.HasSuffix(strings.ToLower(email), "@jaagrmind.com") || strings.HasSuffix(strings.ToLower(email), "@jaagrmind.org") {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "JaagrMind corporate email addresses cannot be used for independent or family signups. Please use your personal Google account, or sign in to the internal operations console at /internal-ops/signin.",
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
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid account type. Registration is available for Parents and Guardians."})
	}

	// Check if already created (e.g. user refreshed or double submitted)
	existing, _ := h.userRepo.GetUserByEmail(c.Context(), email)
	if existing != nil {
		// Just generate session token and return
		roles := make([]string, 0, len(existing.Roles))
		for _, r := range existing.Roles {
			roles = append(roles, r.Role)
		}
		if len(roles) == 0 {
			roles = append(roles, accountType)
		}
		token, _ := h.authService.GenerateToken(domain.TokenPayload{UserID: existing.ID, Roles: roles})
		return c.JSON(fiber.Map{
			"token":   token,
			"user":    existing,
			"message": "Continuing with existing account",
		})
	}

	metadata := map[string]any{
		"account_type": accountType,
		"grade":        req.Grade,
		"child_name":   req.ChildName,
		"school_name":  req.SchoolName,
	}

	createdUser, err := h.userRepo.CreateGoogleUser(
		c.Context(),
		email,
		name,
		googleID,
		avatarURL,
		strings.TrimSpace(req.Phone),
		metadata,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create user: " + err.Error()})
	}

	if err := h.userRepo.AddRole(c.Context(), createdUser.ID, accountType, ""); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to assign role: " + err.Error()})
	}
	createdUser.Roles = []domain.UserRole{{UserID: createdUser.ID, Role: accountType}}

	sessionToken, err := h.authService.GenerateToken(domain.TokenPayload{
		UserID: createdUser.ID,
		Roles:  []string{accountType},
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate session token"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"token":   sessionToken,
		"user":    createdUser,
		"message": "Welcome to JaagrMind! Your account has been created successfully.",
	})
}

func (h *GoogleOAuthHandler) fetchGoogleUserInfo(ctx context.Context, accessToken string) (*domain.GoogleUserInfo, error) {
	req, err := http.NewRequestWithContext(ctx, "GET", "https://www.googleapis.com/oauth2/v3/userinfo", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("google userinfo returned %d: %s", resp.StatusCode, string(body))
	}

	var info domain.GoogleUserInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return nil, err
	}

	return &info, nil
}
