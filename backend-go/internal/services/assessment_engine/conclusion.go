package assessment_engine

import (
	"sort"

	"github.com/jaagrmind/platform-api/internal/services"
)

// ConclusionEngine decides the primary skill to explore, links activities, and maps to the pathway.
type ConclusionEngine struct {
	scorer      *ScoringEngine
	interpreter *InterpretationEngine
}

func NewConclusionEngine(scorer *ScoringEngine, interpreter *InterpretationEngine) *ConclusionEngine {
	if scorer == nil {
		scorer = NewScoringEngine()
	}
	if interpreter == nil {
		interpreter = NewInterpretationEngine()
	}
	return &ConclusionEngine{
		scorer:      scorer,
		interpreter: interpreter,
	}
}

// Evaluate performs the complete pipeline: scoring -> conclusion -> interpretation.
func (e *ConclusionEngine) Evaluate(questionsRaw, answersRaw interface{}, pastHistory []HistoryPoint) ConclusionResult {
	scoring := e.scorer.ScoreAssessment(questionsRaw, answersRaw)

	// Determine Focus Domain:
	// Lowest mean indicates greatest area for exploration / support.
	// Tie-breaking priority: Digital Habits (Load) > Inner Confidence (Safety) > Focus (Attn) > Social (Social)
	tiePriority := map[DomainKey]int{
		DomainDigitalHabits:     0,
		DomainInnerConfidence:   1,
		DomainFocusAttention:    2,
		DomainSocialInteraction: 3,
	}

	keys := []DomainKey{DomainDigitalHabits, DomainInnerConfidence, DomainFocusAttention, DomainSocialInteraction}
	sort.Slice(keys, func(i, j int) bool {
		mI := scoring.Domains[keys[i]].Mean
		mJ := scoring.Domains[keys[j]].Mean
		if mI != mJ {
			return mI < mJ // Lower mean first (area that would benefit most from skill exploration)
		}
		return tiePriority[keys[i]] < tiePriority[keys[j]]
	})

	primaryDomain := keys[0]
	secondaryDomain := keys[1]

	primaryBucket := scoring.Domains[primaryDomain].Bucket
	secondaryBucket := scoring.Domains[secondaryDomain].Bucket

	// Check if all domains are in the "More Consistent" range (Balance Mode)
	allConsistent := true
	for _, k := range keys {
		if scoring.Domains[k].Mean < 3.0 {
			allConsistent = false
			break
		}
	}

	// 16-Track Pathway Mapping
	track := services.GetPathwayTrack(primaryBucket, secondaryBucket, allConsistent)

	// Jaagr Mind Micro-Practice Linking (from activity_catalog)
	activity := resolveRecommendedActivity(primaryDomain)

	// Run Interpretation Engine with chosen primary domain
	interpretation := e.interpreter.Interpret(scoring, pastHistory, primaryDomain)

	return ConclusionResult{
		PrimaryDomain:       primaryDomain,
		PrimarySkill:        interpretation.Reflection.SelectedSkill,
		PrimaryBucket:       primaryBucket,
		SecondaryBucket:     secondaryBucket,
		RecommendedActivity: activity,
		PathwayTrack:        track,
		Reflection:          interpretation.Reflection,
		Scoring:             scoring,
		Interpretation:      interpretation,
	}
}

func resolveRecommendedActivity(domainKey DomainKey) ActivityRecommendation {
	switch domainKey {
	case DomainFocusAttention:
		return ActivityRecommendation{
			ActivityName:    "trace_arc",
			Title:           "Trace Arc",
			Bucket:          "ATTN_STABILITY",
			DurationMinutes: 2,
			Instruction:     "Trace the gentle curve with your finger at a steady, calm pace.",
			Description:     "Visual focus and continuous line motor alignment to ground task initiation.",
		}
	case DomainInnerConfidence:
		return ActivityRecommendation{
			ActivityName:    "build_stack",
			Title:           "Build Stack",
			Bucket:          "SELF_SAFETY",
			DurationMinutes: 2,
			Instruction:     "Stack stable geometric blocks to create a grounded tower.",
			Description:     "Constructive stability and low-pressure self-trust cultivation.",
		}
	case DomainSocialInteraction:
		return ActivityRecommendation{
			ActivityName:    "side_walk",
			Title:           "Side by Side",
			Bucket:          "SOCIAL_COMFORT",
			DurationMinutes: 2,
			Instruction:     "Walk your avatar peacefully beside another down the trail.",
			Description:     "Parallel social presence without social friction or performance pressure.",
		}
	case DomainDigitalHabits:
		return ActivityRecommendation{
			ActivityName:    "box_breathing",
			Title:           "Box Breathing",
			Bucket:          "LOAD_REGULATION",
			DurationMinutes: 2,
			Instruction:     "Breathe in for 4, hold for 4, breathe out for 4, hold for 4.",
			Description:     "Autonomic nervous system reset and intentional cognitive down-regulation.",
		}
	default:
		return ActivityRecommendation{
			ActivityName:    "box_breathing",
			Title:           "Box Breathing",
			Bucket:          "LOAD_REGULATION",
			DurationMinutes: 2,
			Instruction:     "Breathe in for 4, hold for 4, breathe out for 4, hold for 4.",
			Description:     "Calm reset for everyday focus.",
		}
	}
}
