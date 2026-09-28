package assessment_engine

import (
	"time"

	"github.com/jaagrmind/platform-api/internal/core/domain"
)

// Direction indicates whether higher raw marks indicate higher skill (Positive)
// or higher friction (Reverse), requiring adjusted score = 5 - raw.
type Direction string

const (
	DirectionPositive Direction = "P"
	DirectionReverse  Direction = "R"
)

// DomainKey represents the 4 canonical assessment sections.
type DomainKey string

const (
	DomainFocusAttention    DomainKey = "A" // Focus & Attention -> ATTN_STABILITY
	DomainInnerConfidence   DomainKey = "B" // Inner Confidence -> SELF_SAFETY
	DomainSocialInteraction DomainKey = "C" // Social Interaction -> SOCIAL_COMFORT
	DomainDigitalHabits     DomainKey = "D" // Healthy Digital Habits -> LOAD_REGULATION
)

// EvidenceLevel defines reliability based on number of answered items.
type EvidenceLevel string

const (
	EvidenceStandard             EvidenceLevel = "standard"
	EvidenceStandardWith1Missing EvidenceLevel = "standard_with_missing"
	EvidenceLimited              EvidenceLevel = "limited"
	EvidenceInsufficient         EvidenceLevel = "insufficient"
)

// PatternLabel represents the non-clinical 3-tier categorization of domain means.
type PatternLabel string

const (
	PatternMoreConsistent  PatternLabel = "More Consistent"         // 3.0 - 4.0
	PatternDeveloping      PatternLabel = "Developing / Variable"    // 2.0 - 2.9
	PatternMoreDifficult   PatternLabel = "More Difficult Right Now" // 1.0 - 1.9
)

// ItemResponse records the evaluation of a single assessment answer.
type ItemResponse struct {
	QuestionIndex int       `json:"question_index"`
	Section       DomainKey `json:"section"`
	RawValue      int       `json:"raw_value"`      // 1 to 4
	AdjustedValue int       `json:"adjusted_value"` // 1 to 4 (higher = more evidence of skill)
	Direction     Direction `json:"direction"`
	IsValid       bool      `json:"is_valid"`
}

// DomainScore represents the scored metrics for one of the four reflection domains.
type DomainScore struct {
	Key           DomainKey     `json:"key"`
	Name          string        `json:"name"`
	Bucket        domain.BucketType `json:"bucket"`
	ValidCount    int           `json:"valid_count"`
	SumAdjusted   int           `json:"sum_adjusted"`
	Mean          float64       `json:"mean"` // 1.0 to 4.0
	Pattern       PatternLabel  `json:"pattern"`
	Evidence      EvidenceLevel `json:"evidence"`
	LegacyRawSum  int           `json:"legacy_raw_sum"` // 8 to 32
}

// ScoringResult is the output of the Scoring Engine.
type ScoringResult struct {
	OverallValidCount   int                    `json:"overall_valid_count"`
	IsInterpretable     bool                   `json:"is_interpretable"` // requires >= 24 valid and >= 7 per domain
	EvidenceStatus      string                 `json:"evidence_status"`
	Domains             map[DomainKey]DomainScore `json:"domains"`
	DomainMeans         map[string]float64     `json:"domain_means"`
	ItemResponses       []ItemResponse         `json:"item_responses"`
	LegacyTotalScore    int                    `json:"legacy_total_score"`
	LegacySectionScores map[string]int         `json:"legacy_section_scores"`
}

// HistoryPoint captures a past assessment attempt for longitudinal trend detection.
type HistoryPoint struct {
	CompletedAt   time.Time              `json:"completed_at"`
	DomainMeans   map[DomainKey]float64  `json:"domain_means"`
	Patterns      map[DomainKey]PatternLabel `json:"patterns"`
	PrimaryBucket string                 `json:"primary_bucket"`
}

// TrajectoryTrend categorizes the longitudinal movement of a domain.
type TrajectoryTrend string

const (
	TrendStabilizing       TrajectoryTrend = "stabilizing"
	TrendVariable          TrajectoryTrend = "variable"
	TrendNewlyChallenging  TrajectoryTrend = "newly_challenging"
	TrendConsistent        TrajectoryTrend = "consistent"
	TrendBaseline          TrajectoryTrend = "baseline"
)

// DomainTrajectory summarizes the change over time for one domain.
type DomainTrajectory struct {
	Domain      DomainKey       `json:"domain"`
	Trend       TrajectoryTrend `json:"trend"`
	Description string          `json:"description"`
	Delta       float64         `json:"delta"`
}

// ReflectionCopy contains the exact non-clinical wording for student and stakeholder views.
type ReflectionCopy struct {
	Opening             string `json:"opening"`
	Pattern             string `json:"pattern"`
	Context             string `json:"context"`
	SkillInvitation     string `json:"skill_invitation"`
	ActivityCTA         string `json:"activity_cta"`
	Choice              string `json:"choice"`
	Closing             string `json:"closing"`
	SelectedSkill       string `json:"selected_skill"`
	SkillContext        string `json:"skill_context"`
	AlternativeContext  string `json:"alternative_context"`
}

// InterpretationResult is the output of the Interpretation Engine.
type InterpretationResult struct {
	Reflection         ReflectionCopy              `json:"reflection"`
	DomainTrajectories map[DomainKey]DomainTrajectory `json:"domain_trajectories"`
	HasPriorHistory    bool                        `json:"has_prior_history"`
	HistorySummary     string                      `json:"history_summary"`
}

// ConclusionResult is the final output of the Conclusion Engine.
type ConclusionResult struct {
	PrimaryDomain       DomainKey              `json:"primary_domain"`
	PrimarySkill        string                 `json:"primary_skill"`
	PrimaryBucket       domain.BucketType      `json:"primary_bucket"`
	SecondaryBucket     domain.BucketType      `json:"secondary_bucket"`
	RecommendedActivity ActivityRecommendation `json:"recommended_activity"`
	PathwayTrack        domain.PathwayTrack    `json:"pathway_track"`
	Reflection          ReflectionCopy         `json:"reflection"`
	Scoring             ScoringResult          `json:"scoring"`
	Interpretation      InterpretationResult   `json:"interpretation"`
}

// ActivityRecommendation details the Jaagr Mind micro-practice linked to the selected skill.
type ActivityRecommendation struct {
	ActivityName    string `json:"activity_name"`
	Title           string `json:"title"`
	Bucket          string `json:"bucket"`
	DurationMinutes int    `json:"duration_minutes"`
	Instruction     string `json:"instruction"`
	Description     string `json:"description"`
}
