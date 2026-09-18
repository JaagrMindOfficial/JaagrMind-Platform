package domain

import (
	"context"
	"time"
)

type Student struct {
	ID           string    `json:"id"`
	SchoolID     string    `json:"school_id"`
	AccessID     string    `json:"access_id"` // Roll number
	Name         string    `json:"name"`
	Grade        string    `json:"grade"`
	Section      string    `json:"section"`
	MobileNumber string    `json:"mobile_number,omitempty"`
	Email        string    `json:"email,omitempty"`
	AcademicYear string    `json:"academic_year,omitempty"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
}

type CreateStudentRequest struct {
	AccessID     string `json:"access_id"`
	Name         string `json:"name"`
	Grade        string `json:"grade"`
	Section      string `json:"section"`
	MobileNumber string `json:"mobile_number,omitempty"`
	Email        string `json:"email,omitempty"`
	AcademicYear string `json:"academic_year,omitempty"`
}

type StudentLoginRequest struct {
	AccessID     string `json:"accessId"`
	SchoolID     string `json:"schoolId"` // This will map to school_code conceptually in the old frontend
	MobileNumber string `json:"mobileNumber,omitempty"`
	Email        string `json:"email,omitempty"`
}

type StudentLoginResponse struct {
	ID       string `json:"_id"` // to match old frontend
	AccessID string `json:"accessId"`
	Name     string `json:"name"`
	Class    string `json:"class"` // maps to Grade
	Section  string `json:"section"`
	School   struct {
		Name     string `json:"name"`
		Logo     string `json:"logo"`
		SchoolID string `json:"schoolId"`
	} `json:"school"`
	Role     string `json:"role"`
	Token    string `json:"token"`
}

type StudentWithSchool struct {
	ID           string    `json:"id"`
	SchoolID     string    `json:"school_id"`
	SchoolName   string    `json:"school_name"`
	SchoolCode   string    `json:"school_code"`
	AccessID     string    `json:"access_id"`
	Name         string    `json:"name"`
	Grade        string    `json:"grade"`
	Section      string    `json:"section"`
	MobileNumber string    `json:"mobile_number,omitempty"`
	Email        string    `json:"email,omitempty"`
	AcademicYear string    `json:"academic_year,omitempty"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
}

type StudentRepository interface {
	GetAll(ctx context.Context) ([]StudentWithSchool, error)
	GetByID(ctx context.Context, id string) (*Student, error)
	GetBySchool(ctx context.Context, schoolID string) ([]Student, error)
	GetByAccessID(ctx context.Context, schoolID, accessID string) (*Student, error)
	Create(ctx context.Context, schoolID string, req CreateStudentRequest) (*Student, error)
	Update(ctx context.Context, id string, req CreateStudentRequest) (*Student, error)
	UpdateContact(ctx context.Context, id, mobile, email string) error
	BulkCreate(ctx context.Context, schoolID string, students []CreateStudentRequest) error
	Delete(ctx context.Context, id string) error
	BulkDelete(ctx context.Context, schoolID string, ids []string) error
	PromoteClass(ctx context.Context, schoolID string, filterGrade, filterSection string, studentIDs []string) (updatedCount int, skippedCount int, err error)
	PromoteAllClasses(ctx context.Context, schoolID, targetAY string) (promotedCount int, graduatedCount int, err error)
}
