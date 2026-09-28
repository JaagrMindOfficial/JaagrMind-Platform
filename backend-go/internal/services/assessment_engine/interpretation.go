package assessment_engine

import (
	"fmt"
	"math"
)

// InterpretationEngine interprets domain patterns and compares against past student attempts.
type InterpretationEngine struct{}

func NewInterpretationEngine() *InterpretationEngine {
	return &InterpretationEngine{}
}

// Interpret executes pattern interpretation, historical trend comparison, and exact copy generation.
func (e *InterpretationEngine) Interpret(scoring ScoringResult, pastHistory []HistoryPoint, focusDomain DomainKey) InterpretationResult {
	// Domain skill metadata for exact copy generation
	domainMeta := map[DomainKey]struct {
		SkillName          string
		PrimaryContext     string
		AlternativeContext string
	}{
		DomainFocusAttention: {
			SkillName:          "Attention Stability",
			PrimaryContext:     "switching between multiple tasks or studying with notifications nearby",
			AlternativeContext: "you have a single clear activity in front of you",
		},
		DomainInnerConfidence: {
			SkillName:          "Self-Trust & Steady Trying",
			PrimaryContext:     "trying something unfamiliar or receiving constructive feedback",
			AlternativeContext: "working on something you have practiced before",
		},
		DomainSocialInteraction: {
			SkillName:          "Social Steadiness & Boundaries",
			PrimaryContext:     "conversations get awkward or friends ask you to do things you are unsure about",
			AlternativeContext: "you are with one or two close companions",
		},
		DomainDigitalHabits: {
			SkillName:          "Intentional Digital Switching",
			PrimaryContext:     "relaxing after a long day and notifications keep popping up",
			AlternativeContext: "engaged in offline hands-on activities",
		},
	}

	selectedMeta, exists := domainMeta[focusDomain]
	if !exists {
		selectedMeta = domainMeta[DomainFocusAttention]
		focusDomain = DomainFocusAttention
	}

	// 1. Generate Exact Approved Non-Clinical Copy (PDF 1, Section 5)
	reflection := ReflectionCopy{
		Opening:             "Here’s something you might notice about yourself.",
		Pattern:             fmt.Sprintf("Your answers suggest that %s may be easier for you in some situations than others.", selectedMeta.SkillName),
		Context:             fmt.Sprintf("You may notice this more when %s, while it may feel different when %s.", selectedMeta.PrimaryContext, selectedMeta.AlternativeContext),
		SkillInvitation:     "This could be a useful skill to explore. You don’t need to be good at it already.",
		ActivityCTA:         "Want to try a 2-minute Jaagr Mind activity?",
		Choice:              "You can try it now, explore another activity, or come back later.",
		Closing:             "There’s nothing to fix here. This is simply a chance to notice what works for you and try something new.",
		SelectedSkill:       selectedMeta.SkillName,
		SkillContext:        selectedMeta.PrimaryContext,
		AlternativeContext:  selectedMeta.AlternativeContext,
	}

	// 2. Longitudinal History Trend Evaluation
	trajectories := make(map[DomainKey]DomainTrajectory)
	hasPriorHistory := len(pastHistory) > 0
	historySummary := "First assessment baseline recorded."

	if hasPriorHistory {
		latestPrior := pastHistory[0] // Assume ordered newest first
		improvedCount := 0
		variedCount := 0

		for _, k := range []DomainKey{DomainFocusAttention, DomainInnerConfidence, DomainSocialInteraction, DomainDigitalHabits} {
			currMean := scoring.Domains[k].Mean
			priorMean, hasPrior := latestPrior.DomainMeans[k]

			if !hasPrior {
				trajectories[k] = DomainTrajectory{
					Domain:      k,
					Trend:       TrendBaseline,
					Description: "No prior comparison available for this area.",
					Delta:       0,
				}
				continue
			}

			delta := math.Round((currMean-priorMean)*100.0) / 100.0
			var trend TrajectoryTrend
			var desc string

			if delta >= 0.3 {
				trend = TrendStabilizing
				desc = fmt.Sprintf("Showing steady stabilization compared to earlier check-in (+%.2f)", delta)
				improvedCount++
			} else if delta <= -0.3 {
				trend = TrendNewlyChallenging
				desc = fmt.Sprintf("Experiencing situational variation or temporary friction compared to previous check-in (%.2f)", delta)
				variedCount++
			} else {
				trend = TrendConsistent
				desc = "Consistent response pattern maintained across sessions."
			}

			trajectories[k] = DomainTrajectory{
				Domain:      k,
				Trend:       trend,
				Description: desc,
				Delta:       delta,
			}
		}

		if improvedCount > 0 {
			historySummary = fmt.Sprintf("Shows healthy skill consolidation across %d area(s) relative to previous check-in.", improvedCount)
		} else if variedCount > 0 {
			historySummary = "Reflects natural situational variation across recent weeks."
		} else {
			historySummary = "Consistent self-reflection rhythm maintained across check-ins."
		}
	} else {
		for _, k := range []DomainKey{DomainFocusAttention, DomainInnerConfidence, DomainSocialInteraction, DomainDigitalHabits} {
			trajectories[k] = DomainTrajectory{
				Domain:      k,
				Trend:       TrendBaseline,
				Description: "Initial baseline recorded.",
				Delta:       0,
			}
		}
	}

	return InterpretationResult{
		Reflection:         reflection,
		DomainTrajectories: trajectories,
		HasPriorHistory:    hasPriorHistory,
		HistorySummary:     historySummary,
	}
}
