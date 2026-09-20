package domain

import (
	"context"
	"time"
)

type Student struct {
	ID           string    `json:"id"`
	SchoolID     string    `json:"school_id"`
	AccessID     string    `json:"access_id"` // Unique login access ID (e.g. 10A-01)
	RollNumber   string    `json:"roll_number,omitempty"` // Roll number within class/section (e.g. 01)
	Stream       string    `json:"stream,omitempty"`      // Stream if applicable (e.g. Science, Commerce, Arts)
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
	RollNumber   string `json:"roll_number,omitempty"`
	Stream       string `json:"stream,omitempty"`
	Name         string `json:"name"`
	Grade        string `json:"grade"`
	Section      string `json:"section"`
	MobileNumber string `json:"mobile_number,omitempty"`
	Email        string `json:"email,omitempty"`
	AcademicYear string `json:"academic_year,omitempty"`
}

type StudentLoginRequest struct {
	AccessID     string `json:"accessId"`
	SchoolID     string `json:"schoolId"` // This will map to school_code or UUID
	MobileNumber string `json:"mobileNumber,omitempty"`
	Email        string `json:"email,omitempty"`
	Class        string `json:"class,omitempty"`
	Grade        string `json:"grade,omitempty"`
	Section      string `json:"section,omitempty"`
	RollNumber   string `json:"rollNumber,omitempty"`
	Stream       string `json:"stream,omitempty"`
}

type StudentLoginResponse struct {
	ID         string `json:"_id"` // to match old frontend
	AccessID   string `json:"accessId"`
	RollNumber string `json:"rollNumber,omitempty"`
	Stream     string `json:"stream,omitempty"`
	Name       string `json:"name"`
	Class      string `json:"class"` // maps to Grade
	Section    string `json:"section"`
	School     struct {
		Name     string `json:"name"`
		Logo     string `json:"logo"`
		SchoolID string `json:"schoolId"`
	} `json:"school"`
	Role  string `json:"role"`
	Token string `json:"token"`
}

type StudentWithSchool struct {
	ID           string    `json:"id"`
	SchoolID     string    `json:"school_id"`
	SchoolName   string    `json:"school_name"`
	SchoolCode   string    `json:"school_code"`
	AccessID     string    `json:"access_id"`
	RollNumber   string    `json:"roll_number,omitempty"`
	Stream       string    `json:"stream,omitempty"`
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
	GetByClassAndRoll(ctx context.Context, schoolID, grade, section, rollNumber, stream string) (*Student, error)
	Create(ctx context.Context, schoolID string, req CreateStudentRequest) (*Student, error)
	Update(ctx context.Context, id string, req CreateStudentRequest) (*Student, error)
	UpdateContact(ctx context.Context, id, mobile, email string) error
	BulkCreate(ctx context.Context, schoolID string, students []CreateStudentRequest) error
	Delete(ctx context.Context, id string) error
	BulkDelete(ctx context.Context, schoolID string, ids []string) error
	PromoteClass(ctx context.Context, schoolID string, filterGrade, filterSection string, studentIDs []string) (updatedCount int, skippedCount int, err error)
	PromoteAllClasses(ctx context.Context, schoolID, targetAY string) (promotedCount int, graduatedCount int, err error)
}
