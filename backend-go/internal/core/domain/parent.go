package domain

import "context"

type DailyPulseWell struct {
	Day   string `json:"day"`   // "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"
	Date  string `json:"date"`  // "Sep 14"
	State string `json:"state"` // "optimal", "calm", "mild_tension", "neutral"
	Score int    `json:"score"` // 0-100
}

type EmotionalAtmosphere struct {
	EquilibriumScore int              `json:"equilibrium_score"` // 0-100
	WeatherState     string           `json:"weather_state"`     // "sunny_calm", "focused_breeze", "passing_cloud", "rising_pressure"
	WeatherLabel     string           `json:"weather_label"`     // "Sunny & Clear", "Focused Breeze", etc.
	Summary          string           `json:"summary"`           // Plain language empathetic summary
	DailyPulse       []DailyPulseWell `json:"daily_pulse"`       // 7-day indicator wells
	LastCheckinDate  string           `json:"last_checkin_date"` // e.g. "Yesterday, 4:15 PM"
}

type PillarScores struct {
	FocusEndurance     int      `json:"focus_endurance"`     // 0-100
	EmotionalResilience int     `json:"emotional_resilience"` // 0-100
	SocialEase         int      `json:"social_ease"`         // 0-100
	SelfExpression     int      `json:"self_expression"`     // 0-100
	RestAndEnergy      int      `json:"rest_and_energy"`      // 0-100
	Superpowers        []string `json:"superpowers"`         // Affirmative strength callouts
	GrowthObservation  string   `json:"growth_observation"`  // Psychologist summary for parents
}

type ConversationPrompt struct {
	ID               string `json:"id"`
	Theme            string `json:"theme"`
	Context          string `json:"context"`
	AvoidSaying      string `json:"avoid_saying"`
	TrySaying        string `json:"try_saying"`
	PsychologistNote string `json:"psychologist_note"`
}

type ParentMilestoneCheckin struct {
	ID             string `json:"id"`
	Title          string `json:"title"`
	Date           string `json:"date"`
	Status         string `json:"status"` // "completed", "pending", "scheduled"
	Score          int    `json:"score"`
	AssignedBucket string `json:"assigned_bucket"`
	ParentTakeaway string `json:"parent_takeaway"`
	HomeAction     string `json:"home_action"`
}

type CounselorContact struct {
	ID             string `json:"id"`
	Type           string `json:"type"` // "school_counselor" or "jaagrmind_counselor"
	Name           string `json:"name"`
	Role           string `json:"role"`
	SchoolName     string `json:"school_name"`
	BranchName     string `json:"branch_name"`
	Email          string `json:"email"`
	AvailableHours string `json:"available_hours"`
	IsPlatform     bool   `json:"is_platform"`
}

type SchoolCounselor struct {
	ID             string `json:"id"`
	SchoolID       string `json:"school_id"`
	BranchID       string `json:"branch_id,omitempty"`
	SchoolName     string `json:"school_name,omitempty"`
	Name           string `json:"name"`
	Email          string `json:"email"`
	Phone          string `json:"phone"`
	Role           string `json:"role"`
	BranchName     string `json:"branch_name"`
	AvailableHours string `json:"available_hours"`
	IsActive       bool   `json:"is_active"`
	CreatedAt      string `json:"created_at"`
}

type ParentInquiry struct {
	ID              string `json:"id"`
	ParentID        string `json:"parent_id"`
	StudentID       string `json:"student_id"`
	StudentName     string `json:"student_name"`
	SchoolID        string `json:"school_id,omitempty"`
	SchoolName      string `json:"school_name,omitempty"`
	CounselorID     string `json:"counselor_id,omitempty"`
	CounselorName   string `json:"counselor_name,omitempty"`
	CounselorType   string `json:"counselor_type"`
	TargetRecipient string `json:"target_recipient"` // "superadmin" or "school_counselor"
	ParentName      string `json:"parent_name"`
	ParentEmail     string `json:"parent_email"`
	Subject         string `json:"subject"`
	Message         string `json:"message"`
	Status          string `json:"status"` // "pending", "in_progress", "resolved"
	ResolutionNotes string `json:"resolution_notes,omitempty"`
	MeetingDate     string `json:"meeting_date,omitempty"`
	MeetingTime     string `json:"meeting_time,omitempty"`
	MeetingLink     string `json:"meeting_link,omitempty"`
	CreatedAt       string `json:"created_at"`
}

type InquiryMessage struct {
	ID         string `json:"id"`
	InquiryID  string `json:"inquiry_id"`
	SenderID   string `json:"sender_id,omitempty"`
	SenderName string `json:"sender_name"`
	SenderRole string `json:"sender_role"` // "parent", "counselor", "jaagrmind_counselor"
	Message    string `json:"message"`
	CreatedAt  string `json:"created_at"`
}

type ChildSummary struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Nickname     string `json:"nickname,omitempty"`
	Grade        string `json:"grade"`
	Section      string `json:"section"`
	RollNumber   string `json:"roll_number,omitempty"`
	Stream       string `json:"stream,omitempty"`
	AccessID     string `json:"access_id"`
	SchoolID     string `json:"school_id"`
	SchoolName   string `json:"school_name"`
	SchoolCode   string `json:"school_code"`
	Relationship string `json:"relationship"`
	IsLinked     bool   `json:"is_linked"`
}

type CheckinAttempt struct {
	Score          int    `json:"score"`
	AssignedBucket string `json:"assigned_bucket"`
	CompletedAt    string `json:"completed_at"`
	Origin         string `json:"origin,omitempty"`
	OriginLabel    string `json:"origin_label,omitempty"`
	IsPriorSchool  bool   `json:"is_prior_school,omitempty"`
}

type StudentGradeCheckin struct {
	ID             string           `json:"id"`
	Title          string           `json:"title"`
	Description    string           `json:"description"`
	MinGrade       int              `json:"min_grade"`
	MaxGrade       int              `json:"max_grade"`
	TargetGrades   []string         `json:"target_grades"`
	TotalTime      int              `json:"total_time"`
	QuestionCount  int              `json:"question_count"`
	Status         string           `json:"status"` // "completed", "pending"
	Score          int              `json:"score,omitempty"`
	AssignedBucket string           `json:"assigned_bucket,omitempty"`
	CompletedAt    string           `json:"completed_at,omitempty"`
	AttemptsCount  int              `json:"attempts_count,omitempty"`
	History        []CheckinAttempt `json:"history,omitempty"`
}

type ParentAddChildRequest struct {
	Name         string `json:"name"`
	Nickname     string `json:"nickname,omitempty"`
	Grade        string `json:"grade"`
	Section      string `json:"section,omitempty"`
	RollNumber   string `json:"roll_number,omitempty"`
	Stream       string `json:"stream,omitempty"`
	SchoolName   string `json:"school_name,omitempty"`
	SchoolCode   string `json:"school_code,omitempty"`
	AccessID     string `json:"access_id,omitempty"`
	Relationship string `json:"relationship,omitempty"`
}

type ParentUpdateChildRequest struct {
	StudentID  string `json:"student_id"`
	Name       string `json:"name"`
	Nickname   string `json:"nickname,omitempty"`
	Grade      string `json:"grade"`
	Section    string `json:"section,omitempty"`
	RollNumber string `json:"roll_number,omitempty"`
	Stream     string `json:"stream,omitempty"`
	SchoolCode string `json:"school_code,omitempty"`
	AccessID   string `json:"access_id,omitempty"`
}

type ParentOverviewResponse struct {
	ParentName           string                   `json:"parent_name"`
	ActiveChild          ChildSummary             `json:"active_child"`
	AllChildren          []ChildSummary           `json:"all_children"`
	Atmosphere           EmotionalAtmosphere      `json:"atmosphere"`
	Pillars              PillarScores             `json:"pillars"`
	Dossier              *StudentAnalyticsProfile `json:"dossier,omitempty"`
	StandardCheckins     []StudentGradeCheckin    `json:"standard_checkins"`
	ConversationStarters []ConversationPrompt     `json:"conversation_starters,omitempty"`
	RecentCheckins       []ParentMilestoneCheckin `json:"recent_checkins,omitempty"`
	Counselor            CounselorContact         `json:"counselor"`
}

type ParentLinkStudentRequest struct {
	SchoolCode   string `json:"school_code"`
	AccessID     string `json:"access_id"`
	Relationship string `json:"relationship"`
	Grade        string `json:"grade,omitempty"`
	Section      string `json:"section,omitempty"`
	RollNumber   string `json:"roll_number,omitempty"`
	Stream       string `json:"stream,omitempty"`
}

type ParentCounselorNoteRequest struct {
	StudentID      string `json:"student_id"`
	Subject        string `json:"subject"`
	Note           string `json:"note"`
	IsConfidential bool   `json:"is_confidential"`
}

type ParentCheckinAnswer struct {
	QuestionIndex  *int `json:"questionIndex"`
	SelectedOption *int `json:"selectedOption"`
	Value          *int `json:"value"`
}

type ParentSubmitCheckinRequest struct {
	StudentID    string                `json:"student_id"`
	AssessmentID string                `json:"assessment_id"`
	Answers      []ParentCheckinAnswer `json:"answers"`
	TimeTaken    int                   `json:"time_taken,omitempty"`
}

type ParentSubmitCheckinResponse struct {
	Success        bool   `json:"success"`
	Score          int    `json:"score"`
	AssignedBucket string `json:"assigned_bucket"`
	Message        string `json:"message"`
}

type ParentRepository interface {
	GetParentOverview(ctx context.Context, parentID string, selectedStudentID string) (*ParentOverviewResponse, error)
	GetChildren(ctx context.Context, parentID string) ([]ChildSummary, error)
	LinkStudent(ctx context.Context, parentID string, req ParentLinkStudentRequest) (*ChildSummary, error)
	AddChild(ctx context.Context, parentID string, req ParentAddChildRequest) (*ChildSummary, error)
	UpdateChild(ctx context.Context, parentID string, req ParentUpdateChildRequest) (*ChildSummary, error)
	CreateNoteToCounselor(ctx context.Context, parentID, studentID, subject, note string, isConfidential bool) error
	SubmitStudentCheckin(ctx context.Context, parentID string, req ParentSubmitCheckinRequest) (*ParentSubmitCheckinResponse, error)
	GetStudentAttempts(ctx context.Context, parentID, studentID string) ([]StudentResult, error)
	GetStudentDossier(ctx context.Context, parentID, studentID string) (*StudentAnalyticsProfile, error)

	// Counselor management for School Admin & Super Admin
	GetAllCounselors(ctx context.Context) ([]SchoolCounselor, error)
	GetCounselorsBySchool(ctx context.Context, schoolID string) ([]SchoolCounselor, error)
	AddSchoolCounselor(ctx context.Context, counselor SchoolCounselor) (*SchoolCounselor, error)
	UpdateSchoolCounselor(ctx context.Context, counselorID, schoolID string, counselor SchoolCounselor) (*SchoolCounselor, error)
	DeleteSchoolCounselor(ctx context.Context, counselorID, schoolID string) error

	// Parent Inquiries for Super Admin & School Counselors
	GetParentInquiriesForSuperAdmin(ctx context.Context) ([]ParentInquiry, error)
	GetParentInquiriesForSchool(ctx context.Context, schoolID string) ([]ParentInquiry, error)
	GetParentInquiriesForParent(ctx context.Context, parentID string) ([]ParentInquiry, error)
	UpdateInquiryStatus(ctx context.Context, inquiryID, status, resolutionNotes string) error
	UpdateSchoolInquiryStatus(ctx context.Context, schoolID, inquiryID, status, resolutionNotes string) error
	UpdateSuperAdminInquiryStatus(ctx context.Context, inquiryID, status, resolutionNotes string) error
	UpdateInquiryMeeting(ctx context.Context, inquiryID, meetingDate, meetingTime, meetingLink string) error

	// Two-Way Messaging Thread
	GetInquiryMessages(ctx context.Context, inquiryID string) ([]InquiryMessage, error)
	AddInquiryMessage(ctx context.Context, inquiryID, senderID, senderName, senderRole, message string) (*InquiryMessage, error)

	// Counselor checks and Claim concurrency
	GetCounselorByEmail(ctx context.Context, email string) (*SchoolCounselor, string, error)
	ClaimInquiry(ctx context.Context, inquiryID, counselorID string) (claimedByName string, alreadyClaimed bool, err error)
}

