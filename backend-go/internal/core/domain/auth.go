package domain

import (
	"context"
	"time"
)

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type TokenPayload struct {
	UserID string   `json:"user_id"`
	Roles  []string `json:"roles"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

type IndependentSignupRequest struct {
	Name        string `json:"name"`
	Email       string `json:"email"`
	Password    string `json:"password"`
	Phone       string `json:"phone,omitempty"`
	AccountType string `json:"account_type"` // "student", "parent", "relative"
	Grade       string `json:"grade,omitempty"`
	ChildName   string `json:"child_name,omitempty"`
	SchoolName  string `json:"school_name,omitempty"`
}

type InstitutionApplication struct {
	ID                string `json:"id"`
	InstituteName     string `json:"institute_name"`
	InstituteType     string `json:"institute_type"`
	City              string `json:"city"`
	State             string `json:"state"`
	ContactName       string `json:"contact_name"`
	Designation       string `json:"designation,omitempty"`
	Email             string `json:"email"`
	Phone             string `json:"phone"`
	EstimatedStudents int    `json:"estimated_students"`
	Message           string `json:"message,omitempty"`
	Status            string `json:"status"`
	CreatedAt         string `json:"created_at"`
}

type ApplyInstitutionRequest struct {
	InstituteName     string `json:"institute_name"`
	InstituteType     string `json:"institute_type"`
	City              string `json:"city"`
	State             string `json:"state"`
	ContactName       string `json:"contact_name"`
	Designation       string `json:"designation,omitempty"`
	Email             string `json:"email"`
	Phone             string `json:"phone"`
	EstimatedStudents int    `json:"estimated_students"`
	Message           string `json:"message,omitempty"`
}

type PasswordResetRequest struct {
	Token       string `json:"token"`
	Email       string `json:"email"`
	Phone       string `json:"phone"`
	NewPassword string `json:"new_password"`
}

type SendResetLinkResponse struct {
	Success  bool   `json:"success"`
	Email    string `json:"email"`
	Phone    string `json:"phone"`
	ResetURL string `json:"reset_url"`
	Message  string `json:"message"`
}

type RequestOTPRequest struct {
	Email string `json:"email"`
	Phone string `json:"phone"`
}

type VerifyOTPRequest struct {
	Email string `json:"email"`
	OTP   string `json:"otp"`
}

type UserRepository interface {
	GetUserByEmail(ctx context.Context, email string) (*User, error)
	GetUserByID(ctx context.Context, id string) (*User, error)
	CreateUser(ctx context.Context, email, name, passwordHash string) (*User, error)
	CreateIndependentUser(ctx context.Context, email, name, passwordHash, phone string, metadata map[string]any) (*User, error)
	AddRole(ctx context.Context, userID, role, entityID string) error
	GetUsersByRole(ctx context.Context, role string) ([]User, error)
	GetUsersByRoleAndEntity(ctx context.Context, role, entityID string) ([]User, error)
	UpdatePassword(ctx context.Context, userID, passwordHash string) error
	UpdateUser(ctx context.Context, userID, name, email string) error
	CreateInstitutionApplication(ctx context.Context, app InstitutionApplication) (*InstitutionApplication, error)
	GetInstitutionApplications(ctx context.Context) ([]InstitutionApplication, error)
	GetInstitutionApplicationByID(ctx context.Context, id string) (*InstitutionApplication, error)
	UpdateApplicationStatus(ctx context.Context, id, status string) error
	CreatePasswordResetToken(ctx context.Context, email, phone, token string, expiresAt time.Time) error
	VerifyAndResetPassword(ctx context.Context, token, email, phone, newPasswordHash string) (*User, error)
	CreateOTPVerification(ctx context.Context, email, phone, otpCode, token string, expiresAt time.Time) error
	VerifyOTP(ctx context.Context, email, otpCode string) (string, error)
	GetUserByGoogleID(ctx context.Context, googleID string) (*User, error)
	CreateGoogleUser(ctx context.Context, email, name, googleID, avatarURL, phone string, metadata map[string]any) (*User, error)
	LinkGoogleAccount(ctx context.Context, userID, googleID, avatarURL string) error
	SetUserInternal(ctx context.Context, userID string, isInternal bool) error
}

type GoogleUserInfo struct {
	Sub           string `json:"sub"`
	Email         string `json:"email"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
	EmailVerified bool   `json:"email_verified"`
}

type GoogleSetupClaims struct {
	GoogleID      string `json:"google_id"`
	Email         string `json:"email"`
	Name          string `json:"name"`
	AvatarURL     string `json:"avatar_url"`
	SuggestedRole string `json:"suggested_role"`
}

type CompleteGoogleSignupRequest struct {
	SetupToken  string `json:"setup_token"`
	Name        string `json:"name"`
	AccountType string `json:"account_type"` // "student", "parent", "relative"
	Grade       string `json:"grade,omitempty"`
	ChildName   string `json:"child_name,omitempty"`
	SchoolName  string `json:"school_name,omitempty"`
	Phone       string `json:"phone,omitempty"`
}


type InviteRepository interface {
	Create(ctx context.Context, invite SchoolInvite) error
	GetByToken(ctx context.Context, token string) (*SchoolInvite, error)
	MarkAccepted(ctx context.Context, token string) error
	GetAll(ctx context.Context) ([]SchoolInvite, error)
	Cancel(ctx context.Context, id string) error
}

type AuthService interface {
	Login(ctx context.Context, req LoginRequest) (*LoginResponse, error)
	VerifyPassword(hash, password string) bool
	GenerateToken(payload TokenPayload) (string, error)
	HashPassword(password string) (string, error)
}

