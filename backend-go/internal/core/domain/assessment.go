package domain

import (
	"context"
	"time"
)

type Assessment struct {
	ID                  string      `json:"id"`
	AltID               string      `json:"_id,omitempty"` // For compatibility with old frontend
	Title               string      `json:"title"`
	Description         string      `json:"description"`
	IsDefault           bool        `json:"is_default"`
	TimePerQuestion     int         `json:"time_per_question"`
	TotalTime           int         `json:"total_time"`
	InactivityAlertTime int         `json:"inactivity_alert_time"`
	InactivityEndTime   int         `json:"inactivity_end_time"`
	Questions           interface{} `json:"questions"`
	Buckets             interface{} `json:"buckets"`
	SectionBuckets      bool        `json:"section_buckets"`
	CustomSections      interface{} `json:"custom_sections"`
	Sections            interface{} `json:"sections"`
	Tier                string      `json:"tier"`
	MinGrade            int         `json:"min_grade"`
	MaxGrade            int         `json:"max_grade"`
	TargetGrades        []string    `json:"target_grades"`
	QuestionCount       int         `json:"question_count"`
	IsActive            bool        `json:"is_active"`
	PublishToSchools    bool        `json:"publish_to_schools"`
	PublishToParents    bool        `json:"publish_to_parents"`
	AutoAssignSchools   bool        `json:"auto_assign_schools"`
	CreatedAt           time.Time   `json:"created_at"`
}

type StudentResult struct {
	ID                    string      `json:"id"`
	StudentID             string      `json:"student_id"`
	SchoolID              string      `json:"school_id"`
	AssessmentID          string      `json:"assessment_id"`
	Status                string      `json:"status"`
	TotalScore            int         `json:"total_score"`
	SectionScores         interface{} `json:"section_scores"`
	SectionBuckets        interface{} `json:"section_buckets"`
	PrimarySkillArea      string      `json:"primary_skill_area"`
	SecondarySkillArea    string      `json:"secondary_skill_area"`
	AssignedBucket        string      `json:"assigned_bucket"`
	Answers               interface{} `json:"answers"`
	Mood                  interface{} `json:"mood"`
	TimeTaken             int         `json:"time_taken"`
	BehavioralDiagnostics interface{} `json:"behavioral_diagnostics,omitempty"`
	Origin                string      `json:"origin"` // "school", "parent", "student"
	OriginLabel           string      `json:"origin_label,omitempty"`
	SchoolName            string      `json:"school_name,omitempty"`
	IsPriorSchool         bool        `json:"is_prior_school,omitempty"`
	PathwayTrackID        string      `json:"pathway_track_id,omitempty"`
	PathwayTrackName      string      `json:"pathway_track_name,omitempty"`
	PrimaryBucket         string      `json:"primary_bucket,omitempty"`
	SecondaryBucket       string      `json:"secondary_bucket,omitempty"`
	IsBalanceMode         bool        `json:"is_balance_mode,omitempty"`
	CompletedAt           time.Time   `json:"completed_at"`
}

type AssessmentSubmitRequest struct {
	AssessmentID string      `json:"assessmentId"`
	Mood         interface{} `json:"mood"`
	MoodCheck    interface{} `json:"moodCheck"`
	Answers      interface{} `json:"answers"`
	TimeTaken    int         `json:"timeTaken"`
	MobileNumber string      `json:"mobileNumber"`
	Email        string      `json:"email"`
	ConsentGiven bool        `json:"consentGiven"`
}

type SchoolAssessmentAssignment struct {
	SchoolID        string     `json:"school_id"`
	SchoolName      string     `json:"school_name"`
	SchoolCode      string     `json:"school_code"`
	City            string     `json:"city"`
	IsAssigned      bool       `json:"is_assigned"`
	RecentAttempts  int        `json:"recent_attempts"`
	LastAttemptDate *time.Time `json:"last_attempt_date,omitempty"`
}

type StudentRecentAttempt struct {
	StudentID      string    `json:"student_id"`
	StudentName    string    `json:"student_name"`
	AccessID       string    `json:"access_id"`
	Grade          string    `json:"grade"`
	Section        string    `json:"section"`
	CompletedAt    time.Time `json:"completed_at"`
	TotalScore     int       `json:"total_score"`
	AssignedBucket string    `json:"assigned_bucket"`
}

type AssessmentRepository interface {
	GetActiveAssessments(ctx context.Context) ([]Assessment, error)
	GetAll(ctx context.Context) ([]Assessment, error)
	GetByID(ctx context.Context, id string) (*Assessment, error)
	GetDefault(ctx context.Context) (*Assessment, error)
	Create(ctx context.Context, req Assessment) (*Assessment, error)
	Update(ctx context.Context, id string, req Assessment) (*Assessment, error)
	Delete(ctx context.Context, id string) error
	SetDefault(ctx context.Context, id string) error
	SubmitResult(ctx context.Context, result StudentResult) error
	GetResultsBySchool(ctx context.Context, schoolID string) ([]StudentResult, error)
	GetResultsByStudent(ctx context.Context, studentID, assessmentID string) ([]StudentResult, error)
	ResetStudentAttempt(ctx context.Context, studentID, assessmentID string) error
	AssignTest(ctx context.Context, schoolID, assessmentID string) error
	GetAssignedTests(ctx context.Context, schoolID string) ([]Assessment, error)
	GetSchoolAssignments(ctx context.Context, assessmentID string) ([]SchoolAssessmentAssignment, error)
	AssignAssessmentToSchools(ctx context.Context, assessmentID string, schoolIDs []string, reassign bool) error
	CheckRecentCompletions(ctx context.Context, schoolID, assessmentID string, targetType string, targetClass string, targetSection string, studentIDs []string) ([]StudentRecentAttempt, error)
	ArchiveAttemptsForReassignment(ctx context.Context, schoolID, assessmentID string, studentIDs []string) error
}

