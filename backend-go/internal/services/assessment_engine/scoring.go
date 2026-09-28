package assessment_engine

import (
	"encoding/json"
	"math"
	"sort"
	"strconv"

	"github.com/jaagrmind/platform-api/internal/core/domain"
)

// RawAnswer represents raw answer input from frontend submissions.
type RawAnswer struct {
	QuestionIndex  *int        `json:"questionIndex"`
	SelectedOption *int        `json:"selectedOption"`
	Value          *int        `json:"value"`
	Section        string      `json:"section"`
	Direction      string      `json:"direction"`
	IsPositive     *bool       `json:"isPositive"`
}

// QuestionMeta represents the metadata stored on an assessment question.
type QuestionMeta struct {
	Text        string           `json:"text"`
	Section     string           `json:"section"`
	SectionName string           `json:"sectionName"`
	IsPositive  bool             `json:"isPositive"`
	Direction   string           `json:"direction"`
	Options     []map[string]any `json:"options"`
}

// ScoringEngine handles validation, reverse adjustment, domain means, and evidence classification.
type ScoringEngine struct{}

func NewScoringEngine() *ScoringEngine {
	return &ScoringEngine{}
}

// ScoreAssessment executes the full scoring pass for a 32-item submission.
func (e *ScoringEngine) ScoreAssessment(questionsRaw interface{}, answersRaw interface{}) ScoringResult {
	questions := parseQuestions(questionsRaw)
	answers := parseAnswers(answersRaw)

	// Domain tracking
	domainNames := map[DomainKey]string{
		DomainFocusAttention:    "Focus & Attention",
		DomainInnerConfidence:   "Inner Confidence",
		DomainSocialInteraction: "Social Interaction",
		DomainDigitalHabits:     "Healthy Digital Habits",
	}

	domainBuckets := map[DomainKey]domain.BucketType{
		DomainFocusAttention:    domain.BucketAttnStability,
		DomainInnerConfidence:   domain.BucketSelfSafety,
		DomainSocialInteraction: domain.BucketSocialComfort,
		DomainDigitalHabits:     domain.BucketLoadRegulation,
	}

	validPerDomain := map[DomainKey]int{
		DomainFocusAttention:    0,
		DomainInnerConfidence:   0,
		DomainSocialInteraction: 0,
		DomainDigitalHabits:     0,
	}

	sumAdjustedPerDomain := map[DomainKey]int{
		DomainFocusAttention:    0,
		DomainInnerConfidence:   0,
		DomainSocialInteraction: 0,
		DomainDigitalHabits:     0,
	}

	legacySumPerDomain := map[DomainKey]int{
		DomainFocusAttention:    0,
		DomainInnerConfidence:   0,
		DomainSocialInteraction: 0,
		DomainDigitalHabits:     0,
	}

	var itemResponses []ItemResponse
	totalValid := 0
	legacyTotalScore := 0

	for idx, ans := range answers {
		qIdx := idx
		if ans.QuestionIndex != nil {
			qIdx = *ans.QuestionIndex
		}

		if qIdx < 0 || qIdx >= len(questions) {
			continue
		}

		q := questions[qIdx]
		sec := normalizeDomainKey(q.Section)
		if sec == "" {
			sec = normalizeDomainKey(ans.Section)
		}
		if sec == "" {
			sec = DomainFocusAttention
		}

		// Determine Direction: Positive (P) or Reverse (R)
		dir := DirectionReverse
		if q.Direction == "P" || q.IsPositive || (ans.IsPositive != nil && *ans.IsPositive) || ans.Direction == "P" {
			dir = DirectionPositive
		}

		// Determine Raw Value (1 to 4)
		rawValue := 0
		if ans.SelectedOption != nil && *ans.SelectedOption >= 0 && *ans.SelectedOption < 4 {
			// Options 0, 1, 2, 3 correspond to raw 1, 2, 3, 4
			rawValue = *ans.SelectedOption + 1
		} else if ans.Value != nil && *ans.Value >= 1 && *ans.Value <= 4 {
			rawValue = *ans.Value
		}

		if rawValue < 1 || rawValue > 4 {
			// Non-scored or skipped answer
			itemResponses = append(itemResponses, ItemResponse{
				QuestionIndex: qIdx,
				Section:       sec,
				RawValue:      0,
				AdjustedValue: 0,
				Direction:     dir,
				IsValid:       false,
			})
			continue
		}

		// Adjust score:
		// Positive items: adjusted = raw
		// Reverse items: adjusted = 5 - raw
		adjustedValue := rawValue
		if dir == DirectionReverse {
			adjustedValue = 5 - rawValue
		}

		// Legacy mark: in legacy, questions had option.Marks (negative items were 1..4, positive were 4..1)
		legacyMark := rawValue
		if q.IsPositive {
			legacyMark = 5 - rawValue
		}

		validPerDomain[sec]++
		sumAdjustedPerDomain[sec] += adjustedValue
		legacySumPerDomain[sec] += legacyMark
		totalValid++
		legacyTotalScore += legacyMark

		itemResponses = append(itemResponses, ItemResponse{
			QuestionIndex: qIdx,
			Section:       sec,
			RawValue:      rawValue,
			AdjustedValue: adjustedValue,
			Direction:     dir,
			IsValid:       true,
		})
	}

	// Calculate Domain Scores
	domains := make(map[DomainKey]DomainScore)
	domainMeans := make(map[string]float64)
	legacySectionScores := make(map[string]int)
	allDomainsSufficient := true

	for _, k := range []DomainKey{DomainFocusAttention, DomainInnerConfidence, DomainSocialInteraction, DomainDigitalHabits} {
		vCount := validPerDomain[k]
		sumAdj := sumAdjustedPerDomain[k]

		mean := 2.5
		if vCount > 0 {
			mean = math.Round((float64(sumAdj)/float64(vCount))*100.0) / 100.0
		}

		evidence := EvidenceStandard
		if vCount == 7 {
			evidence = EvidenceStandardWith1Missing
		} else if vCount == 6 {
			evidence = EvidenceLimited
		} else if vCount < 6 {
			evidence = EvidenceInsufficient
			allDomainsSufficient = false
		}

		pattern := PatternDeveloping
		if mean >= 3.0 {
			pattern = PatternMoreConsistent
		} else if mean < 2.0 {
			pattern = PatternMoreDifficult
		}

		domains[k] = DomainScore{
			Key:          k,
			Name:         domainNames[k],
			Bucket:       domainBuckets[k],
			ValidCount:   vCount,
			SumAdjusted:  sumAdj,
			Mean:         mean,
			Pattern:      pattern,
			Evidence:     evidence,
			LegacyRawSum: legacySumPerDomain[k],
		}

		domainMeans[string(k)] = mean
		legacySectionScores[string(k)] = legacySumPerDomain[k]
	}

	isInterpretable := totalValid >= 24 && allDomainsSufficient
	evidenceStatus := "Standard Evidence"
	if !isInterpretable {
		evidenceStatus = "Incomplete / Limited Evidence"
	}

	return ScoringResult{
		OverallValidCount:   totalValid,
		IsInterpretable:     isInterpretable,
		EvidenceStatus:      evidenceStatus,
		Domains:             domains,
		DomainMeans:         domainMeans,
		ItemResponses:       itemResponses,
		LegacyTotalScore:    legacyTotalScore,
		LegacySectionScores: legacySectionScores,
	}
}

func normalizeDomainKey(sec string) DomainKey {
	switch sec {
	case "A", "focus", "Focus & Attention":
		return DomainFocusAttention
	case "B", "safety", "Inner Confidence", "Self-Esteem & Inner Confidence":
		return DomainInnerConfidence
	case "C", "social", "Social Interaction", "Social Confidence & Interaction":
		return DomainSocialInteraction
	case "D", "load", "Healthy Digital Habits", "Digital Hygiene & Self-Control":
		return DomainDigitalHabits
	default:
		return DomainFocusAttention
	}
}

func parseQuestions(raw interface{}) []QuestionMeta {
	if raw == nil {
		return defaultStandardQuestions()
	}
	bytes, err := json.Marshal(raw)
	if err != nil {
		return defaultStandardQuestions()
	}
	var qList []QuestionMeta
	if err := json.Unmarshal(bytes, &qList); err != nil || len(qList) == 0 {
		return defaultStandardQuestions()
	}
	return qList
}

func parseAnswers(raw interface{}) []RawAnswer {
	if raw == nil {
		return nil
	}
	bytes, err := json.Marshal(raw)
	if err != nil {
		return nil
	}

	// 1. Try slice of RawAnswer
	var ansList []RawAnswer
	if err := json.Unmarshal(bytes, &ansList); err == nil && len(ansList) > 0 {
		return ansList
	}

	// 2. Try slice of integers: [3, 2, 4, 1, ...]
	var intList []int
	if err := json.Unmarshal(bytes, &intList); err == nil && len(intList) > 0 {
		var res []RawAnswer
		for i, val := range intList {
			v := val
			qIdx := i
			res = append(res, RawAnswer{
				QuestionIndex: &qIdx,
				Value:         &v,
			})
		}
		return res
	}

	// 3. Try map of string to int: { "0": 3, "1": 2, ... }
	var mapInt map[string]int
	if err := json.Unmarshal(bytes, &mapInt); err == nil && len(mapInt) > 0 {
		hasZero := false
		for k := range mapInt {
			if k == "0" {
				hasZero = true
				break
			}
		}

		var res []RawAnswer
		for k, val := range mapInt {
			v := val
			parsedIdx, err := strconv.Atoi(k)
			if err != nil {
				continue
			}
			// If no "0" key and index is 1-based (e.g. 1..32), adjust to 0-based
			if !hasZero && parsedIdx >= 1 {
				parsedIdx--
			}
			idxCopy := parsedIdx
			res = append(res, RawAnswer{
				QuestionIndex: &idxCopy,
				Value:         &v,
			})
		}

		sort.Slice(res, func(i, j int) bool {
			if res[i].QuestionIndex != nil && res[j].QuestionIndex != nil {
				return *res[i].QuestionIndex < *res[j].QuestionIndex
			}
			return false
		})
		return res
	}

	// 4. Try map of string to RawAnswer: { "0": { "value": 3 }, ... }
	var mapObj map[string]RawAnswer
	if err := json.Unmarshal(bytes, &mapObj); err == nil && len(mapObj) > 0 {
		hasZero := false
		for k := range mapObj {
			if k == "0" {
				hasZero = true
				break
			}
		}

		var res []RawAnswer
		for k, obj := range mapObj {
			if obj.QuestionIndex == nil {
				if parsedIdx, err := strconv.Atoi(k); err == nil {
					if !hasZero && parsedIdx >= 1 {
						parsedIdx--
					}
					obj.QuestionIndex = &parsedIdx
				}
			}
			res = append(res, obj)
		}

		sort.Slice(res, func(i, j int) bool {
			if res[i].QuestionIndex != nil && res[j].QuestionIndex != nil {
				return *res[i].QuestionIndex < *res[j].QuestionIndex
			}
			return false
		})
		return res
	}

	return nil
}

// defaultStandardQuestions provides the 32 standard assessment items with directions if not loaded from DB.
func defaultStandardQuestions() []QuestionMeta {
	// Standard mapping: 8 items per section. Items 1-6 are reverse (R), items 7-8 are positive (P).
	var q []QuestionMeta
	sections := []struct {
		Key  DomainKey
		Name string
	}{
		{DomainFocusAttention, "Focus & Attention"},
		{DomainInnerConfidence, "Inner Confidence"},
		{DomainSocialInteraction, "Social Interaction"},
		{DomainDigitalHabits, "Healthy Digital Habits"},
	}

	for _, s := range sections {
		for i := 1; i <= 8; i++ {
			isPos := i >= 7
			dir := "R"
			if isPos {
				dir = "P"
			}
			q = append(q, QuestionMeta{
				Section:     string(s.Key),
				SectionName: s.Name,
				IsPositive:  isPos,
				Direction:   dir,
			})
		}
	}
	return q
}
