package domain

import "time"

// Bucket constants (Psychologist 4-Bucket Model)
type BucketType string

const (
	BucketLoadRegulation BucketType = "LOAD_REGULATION"
	BucketSelfSafety     BucketType = "SELF_SAFETY"
	BucketAttnStability  BucketType = "ATTN_STABILITY"
	BucketSocialComfort  BucketType = "SOCIAL_COMFORT"
)

// Bucket Statuses
const (
	BucketStatusStable        = "STABLE"         // <= 14 marks
	BucketStatusEmerging      = "EMERGING"       // 15 - 22 marks
	BucketStatusSupportNeeded = "SUPPORT_NEEDED" // >= 23 marks
)

type BucketScore struct {
	Bucket BucketType `json:"bucket"`
	Score  int        `json:"score"`
	Status string     `json:"status"`
}

// PathwayTrack represents one of the 16 deterministic tracks (or Balance Mode)
type PathwayTrack struct {
	TrackID         string     `json:"track_id"`
	TrackName       string     `json:"track_name"`
	PrimaryBucket   BucketType `json:"primary_bucket"`
	SecondaryBucket BucketType `json:"secondary_bucket"`
	IsBalanceMode   bool       `json:"is_balance_mode"`
	StudentHeading  string     `json:"student_heading"`
	StudentSubtext  string     `json:"student_subtext"`
}

// ActivityCatalogItem represents an activity template in the catalog
type ActivityCatalogItem struct {
	ID              string   `json:"id"`
	Name            string   `json:"name"`
	Title           string   `json:"title"`
	Bucket          string   `json:"bucket"`
	Instruction     string   `json:"instruction"`
	Description     string   `json:"description"`
	DurationMinutes int      `json:"duration_minutes"`
	Themes          []string `json:"themes"`
	IsActive        bool     `json:"is_active"`
}

// PathwayActivityItem is an activity assigned in today's daily pathway
type PathwayActivityItem struct {
	ID              string     `json:"id"`
	Type            string     `json:"type"`
	Title           string     `json:"title"`
	Bucket          string     `json:"bucket"`
	DurationMinutes int        `json:"durationMinutes"`
	Completed       bool       `json:"completed"`
	CompletedAt     *time.Time `json:"completedAt,omitempty"`
	Instruction     string     `json:"instruction,omitempty"`
	Description     string     `json:"description,omitempty"`
}

// DailyPathway represents the 3-activity curriculum assigned for today
type DailyPathway struct {
	ID                 string                `json:"id"`
	StudentID          string                `json:"student_id"`
	Date               string                `json:"date"`
	TrackID            string                `json:"track_id"`
	TrackName          string                `json:"track_name"`
	StudentHeading     string                `json:"student_heading"`
	StudentSubtext     string                `json:"student_subtext"`
	IsBalanceMode      bool                  `json:"is_balance_mode"`
	PriorityBucket     string                `json:"priority_bucket"`
	SecondaryBucket    string                `json:"secondary_bucket"`
	AssignedActivities []PathwayActivityItem `json:"activities"`
	CompletedCount     int                   `json:"completed_count"`
	IsCompleted        bool                  `json:"isCompleted"`
	CreatedAt          time.Time             `json:"created_at"`
}

// ActivitySession represents a completed or in-progress student session
type ActivitySession struct {
	ID             string          `json:"id"`
	StudentID      string          `json:"student_id"`
	ActivityType   string          `json:"activityType"`
	ActivityBucket string          `json:"activityBucket"`
	ThemeUsed      string          `json:"themeUsed,omitempty"`
	StartedAt      time.Time       `json:"startedAt"`
	EndedAt        *time.Time      `json:"endedAt,omitempty"`
	DurationMs     int             `json:"durationMs"`
	Completed      bool            `json:"completed"`
	XPEarned       int             `json:"xpEarned"`
	MoodEntryID    *string         `json:"moodEntryId,omitempty"`
	Metrics        *DerivedMetrics `json:"metrics,omitempty"`
	CreatedAt      time.Time       `json:"created_at"`
}

type RawInteraction struct {
	EventType     string         `json:"eventType"`
	TimestampMs   int64          `json:"timestampMs"`
	Payload       map[string]any `json:"payload,omitempty"`
	SequenceIndex int            `json:"sequenceIndex"`
}

type DerivedMetrics struct {
	FocusScore       float64 `json:"focus_score"`
	StressScore      float64 `json:"stress_score"`
	ConsistencyScore float64 `json:"consistency_score"`
	ConfidenceScore  float64 `json:"confidence_score"`
	EngagementScore  float64 `json:"engagement_score"`
	RegulationScore  float64 `json:"regulation_score"`
}

type TraitSnapshot struct {
	TraitName string    `json:"trait_name"`
	Value     float64   `json:"value"`
	Trend     string    `json:"trend"` // 'improving', 'declining', 'stable'
	Date      time.Time `json:"date"`
}

type MoodEntry struct {
	ID          string    `json:"id"`
	StudentID   string    `json:"student_id"`
	MoodValue   int       `json:"moodValue"`
	EnergyLevel string    `json:"energyLevel,omitempty"`
	ContextTag  string    `json:"contextTag,omitempty"`
	EntryType   string    `json:"entryType"`
	CreatedAt   time.Time `json:"createdAt"`
}

type JournalEntry struct {
	ID        string    `json:"id"`
	StudentID string    `json:"student_id"`
	Title     string    `json:"title,omitempty"`
	Content   string    `json:"content"`
	MoodValue *int      `json:"moodValue,omitempty"`
	Tags      []string  `json:"tags,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
}

type StudentMobileProfile struct {
	ID            string `json:"id"`
	DisplayName   string `json:"displayName"`
	School        string `json:"school"`
	Class         string `json:"class"`
	Section       string `json:"section,omitempty"`
	AvatarURL     string `json:"avatarUrl"`
	Level         int    `json:"level"`
	CurrentXP     int    `json:"currentXp"`
	NextLevelXP   int    `json:"nextLevelXp"`
	StreakDays    int    `json:"streakDays"`
	LongestStreak int    `json:"longestStreak"`
	GardenLevel   int    `json:"gardenLevel"`
	TreeStage     string `json:"treeStage"`
}
