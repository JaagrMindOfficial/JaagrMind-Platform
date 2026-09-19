package domain

import (
	"context"
)

// AnalyticsResult is the multidimensional radar output for a student
type AnalyticsResult struct {
	StudentID           string             `json:"student_id"`
	RadarDimensions     map[string]float64 `json:"radar_dimensions"` // e.g., {"Focus": 85, "Social": 60}
	Momentum            MomentumMetrics    `json:"momentum"`
	ActionableInsights  []string           `json:"actionable_insights"`
}

// MomentumMetrics tracks whether the student is improving or declining in key areas
type MomentumMetrics struct {
	OverallTrend string             `json:"overall_trend"` // "Improving", "Stable", "Declining"
	Deltas       map[string]float64 `json:"deltas"`        // Difference from last assessment (e.g., {"Focus": +5.0})
}

// AnalyticsService defines the business logic interface
type AnalyticsService interface {
	CalculateStudentAnalytics(ctx context.Context, studentID string, assessmentID string) (*AnalyticsResult, error)
}

// ── Dashboard Aggregation Models ───────────────────────────────────────

type CitySchoolItem struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	SchoolCode string `json:"code"`
	Status     string `json:"status"`
}

type CityDistribution struct {
	City    string           `json:"city"`
	State   string           `json:"state"`
	Count   int              `json:"count"`
	Schools []CitySchoolItem `json:"schools,omitempty"`
}

type AdminAnalytics struct {
	TotalSchools     int                `json:"total_schools"`
	ActiveSchools    int                `json:"active_schools"`
	BlockedSchools   int                `json:"blocked_schools"`
	TotalStudents    int                `json:"total_students"`
	TotalBranches    int                `json:"total_branches"`
	TotalTickets     int                `json:"total_tickets"`
	OpenTickets      int                `json:"open_tickets"`
	TotalAssessments int                `json:"total_assessments"`
	CityDistribution []CityDistribution `json:"city_distribution"`
}

type SchoolAnalytics struct {
	TotalStudents   int `json:"total_students"`
	TotalTeachers   int `json:"total_teachers"`
	TotalResults    int `json:"total_results"`
	OpenTickets     int `json:"open_tickets"`
}

// ── Hierarchical Analytics Models ───────────────────────────────────────

type SchoolComparativeMetric struct {
	ID                string `json:"id"`
	Name              string `json:"name"`
	SchoolCode        string `json:"school_code"`
	City              string `json:"city"`
	State             string `json:"state"`
	BranchCount       int    `json:"branch_count"`
	TotalStudents     int    `json:"total_students"`
	CompletedCheckins int    `json:"completed_checkins"`
	CompletionRate    int    `json:"completion_rate"`
	AvgFocus          int    `json:"avg_focus"`
	AvgResilience     int    `json:"avg_resilience"`
	DominantFriction  string `json:"dominant_friction"`
	DominantArchetype string `json:"dominant_archetype"`
	Status            string `json:"status"`
}

type BranchMetric struct {
	ID                string `json:"id"`
	Name              string `json:"name"`
	City              string `json:"city"`
	TotalStudents     int    `json:"total_students"`
	CompletedCheckins int    `json:"completed_checkins"`
	AvgFocus          int    `json:"avg_focus"`
	AvgResilience     int    `json:"avg_resilience"`
	PrimaryFriction   string `json:"primary_friction"`
	DominantArchetype string `json:"dominant_archetype"`
}

type PathwayDistributionItem struct {
	TrackID   string `json:"track_id"`
	TrackName string `json:"track_name"`
	Count     int    `json:"count"`
	Percent   int    `json:"percent"`
	FocusArea string `json:"focus_area"`
}

type RegulationProfileItem struct {
	ID                string `json:"id"`
	Name              string `json:"name"`
	Percentage        int    `json:"percentage"`
	Tag               string `json:"tag"`
	Color             string `json:"color"`
	Description       string `json:"description"`
	CounselorStrategy string `json:"counselor_strategy"`
}

type ClassMetric struct {
	Grade                 string         `json:"grade"`
	Section               string         `json:"section"`
	Tier                  string         `json:"tier"`
	TotalStudents         int            `json:"total_students"`
	CompletedCheckins     int            `json:"completed_checkins"`
	// 4 Core Regulation Buckets (normalized 0-100 or 0-32 raw)
	AttnStabilityScore    int            `json:"attn_stability_score"`
	LoadRegulationScore   int            `json:"load_regulation_score"`
	SelfSafetyScore       int            `json:"self_safety_score"`
	SocialComfortScore    int            `json:"social_comfort_score"`
	OverallStatus         string         `json:"overall_status"`     // "Stable", "Emerging", "Support Needed"
	PrimaryFocusArea      string         `json:"primary_focus_area"` // e.g. "Attention & Focus Flow"
	DominantProfile       string         `json:"dominant_profile"`
	ProfileSplit          map[string]int `json:"profile_split"`
	TeacherActionPlaybook string         `json:"teacher_action_playbook"`
	// Legacy / Compatibility fields
	FocusScore            int            `json:"focus_score"`
	ResilienceScore       int            `json:"resilience_score"`
	PeerDynamicsScore     int            `json:"peer_dynamics_score"`
	RecoveryScore         int            `json:"recovery_score"`
	PrimaryFriction       string         `json:"primary_friction"`
	ActionPriority        string         `json:"action_priority"`
	DominantArchetype     string         `json:"dominant_archetype"`
	ArchetypeSplit        map[string]int `json:"archetype_split"`
}

type StudentAnalyticsProfile struct {
	ID                 string             `json:"id"`
	AccessID           string             `json:"access_id"`
	Name               string             `json:"name"`
	Grade              string             `json:"grade"`
	Section            string             `json:"section"`
	SchoolID           string             `json:"school_id"`
	SchoolName         string             `json:"school_name,omitempty"`
	// 4 Core Regulation Buckets (raw scores 8-32)
	AttnStabilityScore int                `json:"attn_stability_score"`
	LoadRegulationScore int               `json:"load_regulation_score"`
	SelfSafetyScore    int                `json:"self_safety_score"`
	SocialComfortScore int                `json:"social_comfort_score"`
	// Tiers ("Stable", "Emerging", "Support Needed")
	AttnTier           string             `json:"attn_tier"`
	LoadTier           string             `json:"load_tier"`
	SelfSafetyTier     string             `json:"self_safety_tier"`
	SocialTier         string             `json:"social_tier"`
	OverallStatus      string             `json:"overall_status"`
	// Assigned 16-Track Pathway
	PathwayTrackID     string             `json:"pathway_track_id"`
	PathwayTrackName   string             `json:"pathway_track_name"`
	PrimaryBucket      string             `json:"primary_bucket"`
	SecondaryBucket    string             `json:"secondary_bucket"`
	IsBalanceMode      bool               `json:"is_balance_mode"`
	// Dynamic Regulation Profile (replaces exaggerated archetypes)
	RegulationProfile  string             `json:"regulation_profile"`
	MomentumTrend      string             `json:"momentum_trend"` // "improving", "stable", "declining"
	LastCheckInDate    string             `json:"last_check_in_date"`
	CheckInCount       int                `json:"check_in_count"`
	RadarDimensions    map[string]float64 `json:"radar_dimensions,omitempty"`
	// Legacy / Compatibility fields
	Archetype          string             `json:"archetype"`
	FocusScore         int                `json:"focus_score"`
	ResilienceScore    int                `json:"resilience_score"`
	AcademicTenacity   int                `json:"academic_tenacity"`
	StressAdaptability int                `json:"stress_adaptability"`
	PrimaryFriction    string             `json:"primary_friction"`
}

type DetailedSchoolAnalytics struct {
	SchoolID            string                     `json:"school_id"`
	SchoolName          string                     `json:"school_name"`
	SchoolCode          string                     `json:"school_code"`
	City                string                     `json:"city"`
	TotalStudents       int                        `json:"total_students"`
	TotalTeachers       int                        `json:"total_teachers"`
	TotalResults        int                        `json:"total_results"`
	OpenTickets         int                        `json:"open_tickets"`
	Branches            []BranchMetric             `json:"branches"`
	Classes             []ClassMetric              `json:"classes"`
	Students            []StudentAnalyticsProfile  `json:"students"`
	RadarDimensions     map[string]float64         `json:"radar_dimensions"`
	CohortDistribution  map[string]map[string]int  `json:"cohort_distribution"`
	PathwayDistribution []PathwayDistributionItem  `json:"pathway_distribution"`
	RegulationProfiles  []RegulationProfileItem    `json:"regulation_profiles"`
	ExecutiveBanner     map[string]string          `json:"executive_banner"`
	FrictionDiagnostics map[string]interface{}     `json:"friction_diagnostics"`
	Archetypes          []map[string]interface{}   `json:"archetypes"`
}

type AnalyticsRepository interface {
	GetAdminAnalytics(ctx context.Context) (*AdminAnalytics, error)
	GetSchoolsOverview(ctx context.Context) ([]SchoolComparativeMetric, error)
	GetSchoolAnalytics(ctx context.Context, schoolID string) (*SchoolAnalytics, error)
	GetDetailedSchoolAnalytics(ctx context.Context, schoolID, branchID, grade, section string) (*DetailedSchoolAnalytics, error)
	GetStudentProfiles(ctx context.Context, schoolID, grade, section, search string) ([]StudentAnalyticsProfile, error)
}
