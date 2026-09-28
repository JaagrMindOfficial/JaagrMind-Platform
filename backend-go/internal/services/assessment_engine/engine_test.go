package assessment_engine_test

import (
	"testing"
	"time"

	"github.com/jaagrmind/platform-api/internal/core/domain"
	"github.com/jaagrmind/platform-api/internal/services/assessment_engine"
)

func TestScoringEngine_DirectionAdjustmentAndMeans(t *testing.T) {
	scorer := assessment_engine.NewScoringEngine()

	// 8 questions in Section A (Focus & Attention)
	// Q0-Q5 are Reverse (R), Q6-Q7 are Positive (P)
	var answers []assessment_engine.RawAnswer
	for i := 0; i < 32; i++ {
		sec := "A"
		if i >= 8 && i < 16 {
			sec = "B"
		} else if i >= 16 && i < 24 {
			sec = "C"
		} else if i >= 24 {
			sec = "D"
		}

		opt := 0 // Raw = 1
		answers = append(answers, assessment_engine.RawAnswer{
			QuestionIndex:  &i,
			SelectedOption: &opt,
			Section:        sec,
		})
	}

	result := scorer.ScoreAssessment(nil, answers)

	if !result.IsInterpretable {
		t.Errorf("Expected result to be interpretable with 32 answered questions")
	}
	if result.OverallValidCount != 32 {
		t.Errorf("Expected 32 valid responses, got %d", result.OverallValidCount)
	}

	// For Section A:
	// 6 reverse items with raw 1 -> adjusted = 5 - 1 = 4 (each)
	// 2 positive items with raw 1 -> adjusted = 1 (each)
	// Sum = 6*4 + 2*1 = 26
	// Mean = 26 / 8 = 3.25
	domA := result.Domains[assessment_engine.DomainFocusAttention]
	if domA.SumAdjusted != 26 {
		t.Errorf("Expected Domain A sum adjusted to be 26, got %d", domA.SumAdjusted)
	}
	if domA.Mean != 3.25 {
		t.Errorf("Expected Domain A mean to be 3.25, got %.2f", domA.Mean)
	}
	if domA.Pattern != assessment_engine.PatternMoreConsistent {
		t.Errorf("Expected PatternMoreConsistent, got %s", domA.Pattern)
	}
}

func TestScoringEngine_EvidenceThresholds(t *testing.T) {
	scorer := assessment_engine.NewScoringEngine()

	// Provide only 5 valid answers in Section A (less than 7 required)
	var answers []assessment_engine.RawAnswer
	for i := 0; i < 5; i++ {
		opt := 2
		answers = append(answers, assessment_engine.RawAnswer{
			QuestionIndex:  &i,
			SelectedOption: &opt,
			Section:        "A",
		})
	}

	result := scorer.ScoreAssessment(nil, answers)

	if result.IsInterpretable {
		t.Errorf("Expected IsInterpretable to be false when Section A has only 5 valid responses")
	}
	if result.EvidenceStatus != "Incomplete / Limited Evidence" {
		t.Errorf("Expected Incomplete / Limited Evidence status, got %s", result.EvidenceStatus)
	}
}

func TestConclusionEngine_TieBreakerAndActivity(t *testing.T) {
	engine := assessment_engine.NewConclusionEngine(nil, nil)

	// All items answer raw 3
	var answers []assessment_engine.RawAnswer
	for i := 0; i < 32; i++ {
		opt := 2 // raw = 3
		answers = append(answers, assessment_engine.RawAnswer{
			QuestionIndex:  &i,
			SelectedOption: &opt,
		})
	}

	// If all domains have identical mean, Digital Habits (Load) wins tie-breaker
	conclusion := engine.Evaluate(nil, answers, nil)

	if conclusion.PrimaryDomain != assessment_engine.DomainDigitalHabits {
		t.Errorf("Expected tie-breaker to favor Digital Habits (Load), got %s", conclusion.PrimaryDomain)
	}
	if conclusion.PrimaryBucket != domain.BucketLoadRegulation {
		t.Errorf("Expected PrimaryBucket to be LOAD_REGULATION, got %s", conclusion.PrimaryBucket)
	}
	if conclusion.RecommendedActivity.ActivityName != "box_breathing" {
		t.Errorf("Expected recommended activity 'box_breathing', got '%s'", conclusion.RecommendedActivity.ActivityName)
	}
}

func TestInterpretationEngine_LongitudinalHistory(t *testing.T) {
	interpreter := assessment_engine.NewInterpretationEngine()
	scorer := assessment_engine.NewScoringEngine()

	var answers []assessment_engine.RawAnswer
	for i := 0; i < 32; i++ {
		opt := 3 // raw = 4
		answers = append(answers, assessment_engine.RawAnswer{
			QuestionIndex:  &i,
			SelectedOption: &opt,
		})
	}
	scoring := scorer.ScoreAssessment(nil, answers)

	// Prior attempt had lower means
	priorHistory := []assessment_engine.HistoryPoint{
		{
			CompletedAt: time.Now().Add(-7 * 24 * time.Hour),
			DomainMeans: map[assessment_engine.DomainKey]float64{
				assessment_engine.DomainFocusAttention: 1.2,
			},
		},
	}

	interp := interpreter.Interpret(scoring, priorHistory, assessment_engine.DomainFocusAttention)

	if !interp.HasPriorHistory {
		t.Errorf("Expected HasPriorHistory to be true")
	}
	if interp.Reflection.Opening != "Here’s something you might notice about yourself." {
		t.Errorf("Expected standard opening copy, got %s", interp.Reflection.Opening)
	}
}
