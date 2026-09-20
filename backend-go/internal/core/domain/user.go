package domain

import "time"

// Role constants
const (
	RoleSuperAdmin  = "superadmin"
	RoleSchoolAdmin = "school_admin"
	RoleCounselor   = "counselor"
	RoleTeacher     = "teacher"
	RoleParent      = "parent"
	RoleStudent     = "student"
	RoleRelative    = "relative"
)

type User struct {
	ID           string         `json:"id"`
	Email        string         `json:"email"`
	Name         string         `json:"name,omitempty"`
	PasswordHash string         `json:"-"`
	Phone        string         `json:"phone,omitempty"`
	GoogleID     string         `json:"google_id,omitempty"`
	Username     string         `json:"username,omitempty"`
	AuthProvider string         `json:"auth_provider,omitempty"`
	AvatarURL    string         `json:"avatar_url,omitempty"`
	Metadata     map[string]any `json:"metadata,omitempty"`
	Roles        []UserRole     `json:"roles"`
	IsInternal   bool           `json:"is_internal"`
	CreatedAt    time.Time      `json:"created_at"`
}

func (u *User) HasRole(roleName string) bool {
	if u == nil {
		return false
	}
	for _, r := range u.Roles {
		if r.Role == roleName {
			return true
		}
	}
	return false
}

type UserRole struct {
	UserID   string `json:"user_id"`
	Role     string `json:"role"`
	EntityID string `json:"entity_id,omitempty"` // school UUID for school_admin/teacher, student UUID for parent
}

// SchoolInvite represents a pending school onboarding invitation
type SchoolInvite struct {
	ID           string     `json:"id"`
	SchoolName   string     `json:"school_name"`
	Email        string     `json:"email"`
	PhoneNumber  string     `json:"phone_number,omitempty"`
	TempPassword string     `json:"temp_password,omitempty"`
	Token        string     `json:"token"`
	ExpiresAt    time.Time  `json:"expires_at"`
	AcceptedAt   *time.Time `json:"accepted_at,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
}

type InviteSchoolRequest struct {
	SchoolName   string `json:"school_name"`
	Email        string `json:"email"`
	PhoneNumber  string `json:"phone_number,omitempty"`
	TempPassword string `json:"temp_password,omitempty"`
}

type AcceptInviteRequest struct {
	Password string `json:"password"`
	Name     string `json:"name"` // admin's name
	// School details filled during onboarding
	City    string `json:"city"`
	Phone   string `json:"phone"`
	Address string `json:"address"`
}

type CreateTeacherRequest struct {
	Name            string `json:"name"`
	Email           string `json:"email"`
	Phone           string `json:"phone,omitempty"`
	Designation     string `json:"designation,omitempty"`
	AssignedGrade   string `json:"assigned_grade,omitempty"`
	AssignedSection string `json:"assigned_section,omitempty"`
}

