package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jaagrmind/platform-api/internal/core/domain"
	"github.com/jaagrmind/platform-api/internal/services"
)

type postgresAnalytics struct {
	db *pgxpool.Pool
}

func NewPostgresAnalytics(db *pgxpool.Pool) domain.AnalyticsRepository {
	return &postgresAnalytics{db: db}
}

// Helper: Normalize raw score (8-32) to 0-100 Regulation Stability percentage
// 8 (least friction) -> 100% stability, 32 (most friction) -> 10% stability
func rawScoreToStability(raw int) float64 {
	if raw <= 8 {
		return 100.0
	}
	if raw >= 32 {
		return 10.0
	}
	val := float64(32-raw) / 24.0 * 100.0
	return math.Round(val)
}

func getBucketTier(score int) string {
	if score <= 14 {
		return "Stable"
	}
	if score <= 22 {
		return "Emerging"
	}
	return "Support Needed"
}

func toInt(v interface{}) (int, bool) {
	switch n := v.(type) {
	case float64:
		return int(n), true
	case int:
		return n, true
	case int64:
		return int(n), true
	case string:
		var parsed int
		if _, err := fmt.Sscanf(n, "%d", &parsed); err == nil {
			return parsed, true
		}
	}
	return 0, false
}

func toIntOr(v interface{}, fallback int) int {
	if num, ok := toInt(v); ok && num > 0 {
		return num
	}
	return fallback
}

func parseBucketScores(secScoresJSON []byte, focus, resil, tenacity, stress int) (int, int, int, int) {
	// Base fallback values derived from 0-100 metrics if raw section scores are absent
	// Higher score in bucket = higher friction / support needed (8-32)
	attn := 8 + int(float64(100-focus)*24.0/100.0)
	if attn < 8 {
		attn = 8
	} else if attn > 32 {
		attn = 32
	}

	load := 8 + int(float64(100-stress)*24.0/100.0)
	if load < 8 {
		load = 8
	} else if load > 32 {
		load = 32
	}

	safety := 8 + int(float64(100-resil)*24.0/100.0)
	if safety < 8 {
		safety = 8
	} else if safety > 32 {
		safety = 32
	}

	social := 8 + int(float64(100-tenacity)*24.0/100.0)
	if social < 8 {
		social = 8
	} else if social > 32 {
		social = 32
	}

	if len(secScoresJSON) > 0 {
		var rawMap map[string]interface{}
		if err := json.Unmarshal(secScoresJSON, &rawMap); err == nil {
			if val, ok := rawMap["A"]; ok {
				if num, ok := toInt(val); ok && num > 0 {
					attn = num
				}
			}
			if val, ok := rawMap["B"]; ok {
				if num, ok := toInt(val); ok && num > 0 {
					safety = num
				}
			}
			if val, ok := rawMap["C"]; ok {
				if num, ok := toInt(val); ok && num > 0 {
					social = num
				}
			}
			if val, ok := rawMap["D"]; ok {
				if num, ok := toInt(val); ok && num > 0 {
					load = num
				}
			}
		}
	}
	return attn, load, safety, social
}

func (r *postgresAnalytics) GetAdminAnalytics(ctx context.Context) (*domain.AdminAnalytics, error) {
	var a domain.AdminAnalytics

	// Aggregate schools
	err := r.db.QueryRow(ctx, `
		SELECT 
			COUNT(*),
			COUNT(CASE WHEN is_active = true AND is_blocked = false THEN 1 END),
			COUNT(CASE WHEN is_blocked = true THEN 1 END)
		FROM schools
	`).Scan(&a.TotalSchools, &a.ActiveSchools, &a.BlockedSchools)
	if err != nil {
		return nil, err
	}

	// Aggregate tickets
	err = r.db.QueryRow(ctx, `
		SELECT 
			COUNT(*),
			COUNT(CASE WHEN status = 'open' THEN 1 END)
		FROM tickets
	`).Scan(&a.TotalTickets, &a.OpenTickets)
	if err != nil {
		return nil, err
	}

	// Aggregate students
	_ = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM students`).Scan(&a.TotalStudents)

	// Aggregate branches
	_ = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM schools WHERE parent_school_id IS NOT NULL`).Scan(&a.TotalBranches)

	// Aggregate completed evaluations
	_ = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM student_results WHERE status = 'complete'`).Scan(&a.TotalAssessments)

	// City distribution with proper normalization of cities and states
	cityStateMap := map[string]string{
		"Hyderabad": "Telangana",
		"Bangalore": "Karnataka",
		"Bengaluru": "Karnataka",
		"Pune":      "Maharashtra",
		"Mumbai":    "Maharashtra",
		"Delhi":     "Delhi NCR",
		"New Delhi": "Delhi NCR",
		"Chennai":   "Tamil Nadu",
		"Kolkata":   "West Bengal",
		"Jaipur":    "Rajasthan",
		"Ahmedabad": "Gujarat",
		"Kochi":     "Kerala",
	}

	cRows, cErr := r.db.Query(ctx, `SELECT id, name, school_code, COALESCE(city, ''), is_active, is_blocked FROM schools`)
	if cErr == nil {
		defer cRows.Close()
		cityAggMap := make(map[string]*domain.CityDistribution)

		for cRows.Next() {
			var id, name, code, rawCity string
			var isActive, isBlocked bool
			if err := cRows.Scan(&id, &name, &code, &rawCity, &isActive, &isBlocked); err == nil {
				rawCity = strings.TrimSpace(rawCity)
				if rawCity == "" {
					rawCity = "Other"
				}

				var normCity, normState string
				if strings.Contains(rawCity, ",") {
					parts := strings.Split(rawCity, ",")
					normCity = strings.TrimSpace(parts[0])
					if len(parts) > 1 {
						normState = strings.TrimSpace(parts[1])
					}
				} else {
					normCity = rawCity
					if st, ok := cityStateMap[normCity]; ok {
						normState = st
					} else {
						normState = normCity
					}
				}

				// Canonical normalization for prominent Indian cities
				lowerCity := strings.ToLower(normCity)
				if lowerCity == "bengaluru" || lowerCity == "bangalore" {
					normCity = "Bengaluru"
					normState = "Karnataka"
				} else if lowerCity == "delhi" || lowerCity == "new delhi" || lowerCity == "delhi ncr" {
					normCity = "Delhi NCR"
					normState = "Delhi NCR"
				}

				status := "Active"
				if isBlocked {
					status = "Blocked"
				} else if !isActive {
					status = "Inactive"
				}

				schoolItem := domain.CitySchoolItem{
					ID:         id,
					Name:       name,
					SchoolCode: code,
					Status:     status,
				}

				if existing, exists := cityAggMap[normCity]; exists {
					existing.Count++
					existing.Schools = append(existing.Schools, schoolItem)
				} else {
					cityAggMap[normCity] = &domain.CityDistribution{
						City:    normCity,
						State:   normState,
						Count:   1,
						Schools: []domain.CitySchoolItem{schoolItem},
					}
				}
			}
		}

		for _, cd := range cityAggMap {
			a.CityDistribution = append(a.CityDistribution, *cd)
		}
	}

	return &a, nil
}

func (r *postgresAnalytics) GetSchoolAnalytics(ctx context.Context, schoolID string) (*domain.SchoolAnalytics, error) {
	var a domain.SchoolAnalytics

	err := r.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM students WHERE school_id = $1
	`, schoolID).Scan(&a.TotalStudents)
	if err != nil {
		return nil, err
	}

	err = r.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM user_roles 
		WHERE role = $1 AND entity_id = $2
	`, domain.RoleTeacher, schoolID).Scan(&a.TotalTeachers)
	if err != nil {
		return nil, err
	}

	err = r.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM student_results sr
		JOIN students s ON sr.student_id = s.id
		WHERE s.school_id = $1
	`, schoolID).Scan(&a.TotalResults)
	if err != nil {
		return nil, err
	}

	err = r.db.QueryRow(ctx, `
		SELECT COUNT(*) FROM tickets 
		WHERE school_id = $1 AND status = 'open'
	`, schoolID).Scan(&a.OpenTickets)
	if err != nil {
		return nil, err
	}

	return &a, nil
}

func (r *postgresAnalytics) GetSchoolsOverview(ctx context.Context) ([]domain.SchoolComparativeMetric, error) {
	query := `
		SELECT 
			s.id, s.name, s.school_code, s.city,
			COALESCE((SELECT COUNT(*) FROM schools b WHERE b.parent_school_id = s.id), 0) AS branch_count,
			COALESCE((SELECT COUNT(*) FROM students st WHERE st.school_id = s.id OR st.school_id IN (SELECT b.id FROM schools b WHERE b.parent_school_id = s.id)), 0) AS total_students,
			COALESCE((SELECT COUNT(*) FROM student_results sr WHERE sr.school_id = s.id OR sr.school_id IN (SELECT b.id FROM schools b WHERE b.parent_school_id = s.id)), 0) AS completed_checkins,
			CASE WHEN s.is_blocked THEN 'Blocked' WHEN s.is_active THEN 'Active' ELSE 'Inactive' END AS status
		FROM schools s
		WHERE s.parent_school_id IS NULL
		ORDER BY s.created_at DESC
	`

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []domain.SchoolComparativeMetric
	cityStateMap := map[string]string{
		"Bangalore": "Karnataka", "Bengaluru": "Karnataka", "Hyderabad": "Telangana",
		"Pune": "Maharashtra", "Mumbai": "Maharashtra", "Delhi": "Delhi NCR",
	}

	for rows.Next() {
		var m domain.SchoolComparativeMetric
		if err := rows.Scan(&m.ID, &m.Name, &m.SchoolCode, &m.City, &m.BranchCount, &m.TotalStudents, &m.CompletedCheckins, &m.Status); err != nil {
			return nil, err
		}
		if st, ok := cityStateMap[m.City]; ok {
			m.State = st
		} else {
			m.State = m.City
		}

		if m.TotalStudents > 0 {
			m.CompletionRate = (m.CompletedCheckins * 100) / m.TotalStudents
			if m.CompletionRate > 100 {
				m.CompletionRate = 100
			}
		} else {
			m.CompletionRate = 0
		}

		if m.CompletedCheckins > 0 {
			var avgFocus, avgResil *float64
			_ = r.db.QueryRow(ctx, `
				SELECT 
					AVG((behavioral_diagnostics->>'focusScore')::numeric),
					AVG((behavioral_diagnostics->>'resilienceScore')::numeric)
				FROM student_results 
				WHERE (school_id = $1 OR school_id IN (SELECT id FROM schools WHERE parent_school_id = $1))
				  AND behavioral_diagnostics->>'focusScore' IS NOT NULL
			`, m.ID).Scan(&avgFocus, &avgResil)

			if avgFocus != nil {
				m.AvgFocus = int(math.Round(*avgFocus))
			}
			if avgResil != nil {
				m.AvgResilience = int(math.Round(*avgResil))
			}

			// Dynamic Clinical Regulation Focus
			switch {
			case m.AvgFocus < 75:
				m.DominantFriction = "Attention & Focus Initiation"
				m.DominantArchetype = "Attention & Focus Flow"
			case m.AvgResilience < 70:
				m.DominantFriction = "Calm & Stress Regulation"
				m.DominantArchetype = "Calm & Stress Reset"
			default:
				m.DominantFriction = "Steady Classroom Engagement"
				m.DominantArchetype = "All-Round Balance Mode"
			}
		} else {
			m.AvgFocus = 0
			m.AvgResilience = 0
			m.DominantFriction = "Pending Assessment"
			m.DominantArchetype = "Pending Assessment"
		}

		list = append(list, m)
	}

	return list, nil
}

func (r *postgresAnalytics) GetDetailedSchoolAnalytics(ctx context.Context, schoolID, branchID, grade, section string) (*domain.DetailedSchoolAnalytics, error) {
	var d domain.DetailedSchoolAnalytics
	d.SchoolID = schoolID

	err := r.db.QueryRow(ctx, `
		SELECT name, school_code, city FROM schools WHERE id = $1
	`, schoolID).Scan(&d.SchoolName, &d.SchoolCode, &d.City)
	if err != nil {
		return nil, err
	}

	targetSchoolIDs := []string{schoolID}
	if branchID != "" && branchID != "all" {
		targetSchoolIDs = []string{branchID}
	} else {
		bRows, bErr := r.db.Query(ctx, `SELECT id, name, city FROM schools WHERE parent_school_id = $1`, schoolID)
		if bErr == nil {
			defer bRows.Close()
			for bRows.Next() {
				var bm domain.BranchMetric
				if err := bRows.Scan(&bm.ID, &bm.Name, &bm.City); err == nil {
					targetSchoolIDs = append(targetSchoolIDs, bm.ID)
					_ = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM students WHERE school_id = $1`, bm.ID).Scan(&bm.TotalStudents)
					_ = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM student_results WHERE school_id = $1`, bm.ID).Scan(&bm.CompletedCheckins)
					if bm.CompletedCheckins > 0 {
						var avgF, avgR *float64
						_ = r.db.QueryRow(ctx, `
							SELECT AVG((behavioral_diagnostics->>'focusScore')::numeric),
							       AVG((behavioral_diagnostics->>'resilienceScore')::numeric)
							FROM student_results
							WHERE school_id = $1
						`, bm.ID).Scan(&avgF, &avgR)
						if avgF != nil {
							bm.AvgFocus = int(math.Round(*avgF))
						}
						if avgR != nil {
							bm.AvgResilience = int(math.Round(*avgR))
						}
						var domArch, domFric *string
						_ = r.db.QueryRow(ctx, `
							SELECT behavioral_diagnostics->>'archetype', behavioral_diagnostics->>'primaryFriction'
							FROM student_results
							WHERE school_id = $1 AND behavioral_diagnostics->>'archetype' IS NOT NULL
							GROUP BY behavioral_diagnostics->>'archetype', behavioral_diagnostics->>'primaryFriction'
							ORDER BY COUNT(*) DESC
							LIMIT 1
						`, bm.ID).Scan(&domArch, &domFric)
						if domArch != nil && *domArch != "" {
							bm.DominantArchetype = *domArch
						} else {
							bm.DominantArchetype = "Steady Regulation"
						}
						if domFric != nil && *domFric != "" {
							bm.PrimaryFriction = *domFric
						} else {
							bm.PrimaryFriction = "General Regulation"
						}
					} else {
						bm.AvgFocus = 0
						bm.AvgResilience = 0
						bm.PrimaryFriction = "Pending Assessment"
						bm.DominantArchetype = "Pending Assessment"
					}
					d.Branches = append(d.Branches, bm)
				}
			}
		}
	}

	_ = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM students WHERE school_id = ANY($1)`, targetSchoolIDs).Scan(&d.TotalStudents)
	_ = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM user_roles WHERE role = $1 AND entity_id = ANY($2)`, domain.RoleTeacher, targetSchoolIDs).Scan(&d.TotalTeachers)
	_ = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM student_results WHERE school_id = ANY($1)`, targetSchoolIDs).Scan(&d.TotalResults)
	_ = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM tickets WHERE school_id = ANY($1) AND status = 'open'`, targetSchoolIDs).Scan(&d.OpenTickets)

	// Fetch dynamic student profiles
	students, err := r.GetStudentProfiles(ctx, schoolID, grade, section, "")
	if err != nil {
		students = []domain.StudentAnalyticsProfile{}
	}
	d.Students = students

	// Aggregate school-wide regulation stats from live students
	var sumAttn, sumLoad, sumSafety, sumSocial float64
	var assessedCount int

	attnCounts := map[string]int{"stable": 0, "emerging": 0, "support_needed": 0}
	loadCounts := map[string]int{"stable": 0, "emerging": 0, "support_needed": 0}
	safetyCounts := map[string]int{"stable": 0, "emerging": 0, "support_needed": 0}
	socialCounts := map[string]int{"stable": 0, "emerging": 0, "support_needed": 0}

	trackCounts := make(map[string]domain.PathwayDistributionItem)
	profileCounts := make(map[string]int)

	// Class grouping
	type classAgg struct {
		grade     string
		section   string
		total     int
		checkins  int
		attnSum   int
		loadSum   int
		safetySum int
		socialSum int
		focusSum  int
		resilSum  int
	}
	classMap := make(map[string]*classAgg)

	for _, s := range students {
		if s.CheckInCount > 0 {
			assessedCount++
			sumAttn += float64(s.AttnStabilityScore)
			sumLoad += float64(s.LoadRegulationScore)
			sumSafety += float64(s.SelfSafetyScore)
			sumSocial += float64(s.SocialComfortScore)

			// Cohort tiers
			switch s.AttnTier {
			case "Stable":
				attnCounts["stable"]++
			case "Emerging":
				attnCounts["emerging"]++
			case "Support Needed":
				attnCounts["support_needed"]++
			}

			switch s.LoadTier {
			case "Stable":
				loadCounts["stable"]++
			case "Emerging":
				loadCounts["emerging"]++
			case "Support Needed":
				loadCounts["support_needed"]++
			}

			switch s.SelfSafetyTier {
			case "Stable":
				safetyCounts["stable"]++
			case "Emerging":
				safetyCounts["emerging"]++
			case "Support Needed":
				safetyCounts["support_needed"]++
			}

			switch s.SocialTier {
			case "Stable":
				socialCounts["stable"]++
			case "Emerging":
				socialCounts["emerging"]++
			case "Support Needed":
				socialCounts["support_needed"]++
			}

			// Track counts
			if s.PathwayTrackID != "" {
				item := trackCounts[s.PathwayTrackID]
				item.TrackID = s.PathwayTrackID
				item.TrackName = s.PathwayTrackName
				item.FocusArea = s.PrimaryBucket
				item.Count++
				trackCounts[s.PathwayTrackID] = item
			}

			// Profile counts
			profKey := s.RegulationProfile
			if profKey == "" {
				profKey = "Calm & Stress Reset"
			}
			profileCounts[profKey]++
		}

		// Class aggregation
		ckey := fmt.Sprintf("%s-%s", s.Grade, s.Section)
		if c, exists := classMap[ckey]; exists {
			c.total++
			if s.CheckInCount > 0 {
				c.checkins++
				c.attnSum += s.AttnStabilityScore
				c.loadSum += s.LoadRegulationScore
				c.safetySum += s.SelfSafetyScore
				c.socialSum += s.SocialComfortScore
				c.focusSum += s.FocusScore
				c.resilSum += s.ResilienceScore
			}
		} else {
			ch := 0
			aSum, lSum, sfSum, scSum, fSum, rSum := 0, 0, 0, 0, 0, 0
			if s.CheckInCount > 0 {
				ch = 1
				aSum = s.AttnStabilityScore
				lSum = s.LoadRegulationScore
				sfSum = s.SelfSafetyScore
				scSum = s.SocialComfortScore
				fSum = s.FocusScore
				rSum = s.ResilienceScore
			}
			classMap[ckey] = &classAgg{
				grade:     s.Grade,
				section:   s.Section,
				total:     1,
				checkins:  ch,
				attnSum:   aSum,
				loadSum:   lSum,
				safetySum: sfSum,
				socialSum: scSum,
				focusSum:  fSum,
				resilSum:  rSum,
			}
		}
	}

	// Calculate School Baseline 4-Bucket Radar Averages
	var avgAttnStab, avgSocialStab, avgLoadStab, avgSafetyStab float64
	if assessedCount > 0 {
		avgAttnStab = rawScoreToStability(int(math.Round(sumAttn / float64(assessedCount))))
		avgSocialStab = rawScoreToStability(int(math.Round(sumSocial / float64(assessedCount))))
		avgLoadStab = rawScoreToStability(int(math.Round(sumLoad / float64(assessedCount))))
		avgSafetyStab = rawScoreToStability(int(math.Round(sumSafety / float64(assessedCount))))
	} else {
		avgAttnStab, avgSocialStab, avgLoadStab, avgSafetyStab = 0, 0, 0, 0
	}

	// Unified 4-Pole Diamond Radar (Top, Right, Bottom, Left)
	d.RadarDimensions = map[string]float64{
		"Attention & Focus Flow":       avgAttnStab,
		"Social Comfort & Belonging":   avgSocialStab,
		"Calm & Stress Reset":          avgLoadStab,
		"Inner Grounding & Confidence": avgSafetyStab,
		// Backwards-compatible aliases
		"Focus & Cognitive":   avgAttnStab,
		"Emotional Awareness": avgSafetyStab,
		"Peer Engagement":     avgSocialStab,
		"Academic Tenacity":   avgAttnStab,
		"Stress Adaptability": avgLoadStab,
		"Self-Regulation":     avgSafetyStab,
	}

	// Build Cohort Distribution (% in Stable, Emerging, Support Needed)
	calcPct := func(c, total int) int {
		if total <= 0 {
			return 0
		}
		return int(math.Round(float64(c) * 100.0 / float64(total)))
	}
	tStud := assessedCount
	d.CohortDistribution = map[string]map[string]int{
		"ATTN_STABILITY": {
			"stable":         calcPct(attnCounts["stable"], tStud),
			"emerging":       calcPct(attnCounts["emerging"], tStud),
			"support_needed": calcPct(attnCounts["support_needed"], tStud),
		},
		"LOAD_REGULATION": {
			"stable":         calcPct(loadCounts["stable"], tStud),
			"emerging":       calcPct(loadCounts["emerging"], tStud),
			"support_needed": calcPct(loadCounts["support_needed"], tStud),
		},
		"SELF_SAFETY": {
			"stable":         calcPct(safetyCounts["stable"], tStud),
			"emerging":       calcPct(safetyCounts["emerging"], tStud),
			"support_needed": calcPct(safetyCounts["support_needed"], tStud),
		},
		"SOCIAL_COMFORT": {
			"stable":         calcPct(socialCounts["stable"], tStud),
			"emerging":       calcPct(socialCounts["emerging"], tStud),
			"support_needed": calcPct(socialCounts["support_needed"], tStud),
		},
	}

	// Build Pathway Distribution
	for _, item := range trackCounts {
		item.Percent = calcPct(item.Count, tStud)
		d.PathwayDistribution = append(d.PathwayDistribution, item)
	}
	sort.Slice(d.PathwayDistribution, func(i, j int) bool {
		return d.PathwayDistribution[i].Count > d.PathwayDistribution[j].Count
	})

	// Build Clean Grounded Regulation Profiles (replaces old archetypes)
	d.RegulationProfiles = []domain.RegulationProfileItem{
		{
			ID:                "attn",
			Name:              "Attention & Focus Flow",
			Percentage:        calcPct(profileCounts["Attention & Focus Flow"], tStud),
			Tag:               "Focus & Routine Rhythm",
			Color:             "sky",
			Description:       "Learners strengthening task initiation and sustained concentration rhythms.",
			CounselorStrategy: "Implement 15-minute visual focus intervals and clear step-by-step checklist cues.",
		},
		{
			ID:                "load",
			Name:              "Calm & Stress Reset",
			Percentage:        calcPct(profileCounts["Calm & Stress Reset"], tStud),
			Tag:               "Stress & Workload Reset",
			Color:             "amber",
			Description:       "Learners working through daily cognitive fatigue, exam tension, or late-night screen drag.",
			CounselorStrategy: "Introduce 2-minute physiological calm resets and encourage an 8:00 PM digital homework boundary.",
		},
		{
			ID:                "safety",
			Name:              "Inner Grounding & Confidence",
			Percentage:        calcPct(profileCounts["Inner Grounding & Confidence"], tStud),
			Tag:               "Self-Trust & Grounding",
			Color:             "rose",
			Description:       "Learners experiencing evaluative doubt or hesitancy asking questions in large classrooms.",
			CounselorStrategy: "Replace public cold-calling with 2-minute paired turn-and-talk check-ins and anonymous inquiry.",
		},
		{
			ID:                "social",
			Name:              "Social Comfort & Belonging",
			Percentage:        calcPct(profileCounts["Social Comfort & Belonging"], tStud),
			Tag:               "Peer Ease & Connectedness",
			Color:             "emerald",
			Description:       "Learners navigating collaborative dynamics, peer sharing, and healthy personal boundaries.",
			CounselorStrategy: "Assign structured collaborative roles and facilitate small-group connection activities.",
		},
		{
			ID:                "balance",
			Name:              "All-Round Balance Mode",
			Percentage:        calcPct(profileCounts["All-Round Balance Mode"], tStud),
			Tag:               "Steady Regulation",
			Color:             "emerald",
			Description:       "Learners demonstrating stable, balanced self-regulation across all core skill areas.",
			CounselorStrategy: "Provide self-directed inquiry challenges and open leadership/peer-mentoring roles.",
		},
	}

	// Backwards-compatible archetypes field mapping to the clean profiles
	for _, rp := range d.RegulationProfiles {
		d.Archetypes = append(d.Archetypes, map[string]interface{}{
			"id":                rp.ID,
			"name":              rp.Name,
			"percentage":        rp.Percentage,
			"tag":               rp.Tag,
			"color":             rp.Color,
			"description":       rp.Description,
			"counselorStrategy": rp.CounselorStrategy,
		})
	}

	// Build Class Metrics
	for _, c := range classMap {
		var cm domain.ClassMetric
		cm.Grade = c.grade
		cm.Section = c.section
		cm.TotalStudents = c.total
		cm.CompletedCheckins = c.checkins

		cleanGrade := strings.TrimPrefix(strings.ToLower(cm.Grade), "class ")
		switch {
		case strings.HasPrefix(cleanGrade, "6") || strings.HasPrefix(cleanGrade, "7") || strings.HasPrefix(cleanGrade, "8"):
			cm.Tier = "Middle School"
		case strings.HasPrefix(cleanGrade, "9") || strings.HasPrefix(cleanGrade, "10"):
			cm.Tier = "Secondary"
		default:
			cm.Tier = "Senior Secondary"
		}

		if c.checkins > 0 {
			cm.AttnStabilityScore = c.attnSum / c.checkins
			cm.LoadRegulationScore = c.loadSum / c.checkins
			cm.SelfSafetyScore = c.safetySum / c.checkins
			cm.SocialComfortScore = c.socialSum / c.checkins
			cm.FocusScore = c.focusSum / c.checkins
			cm.ResilienceScore = c.resilSum / c.checkins
			cm.PeerDynamicsScore = int(rawScoreToStability(cm.SocialComfortScore))
			cm.RecoveryScore = int(rawScoreToStability(cm.LoadRegulationScore))

			// Find highest friction bucket to set primary focus
			maxFriction := cm.AttnStabilityScore
			focusArea := "Attention & Focus Flow"
			playbook := "Utilize 15-minute visual focus intervals and structured task checklists."
			dominantProf := "Attention & Focus Flow"

			if cm.LoadRegulationScore > maxFriction {
				maxFriction = cm.LoadRegulationScore
				focusArea = "Calm & Stress Reset"
				playbook = "Schedule 2-minute physiological calm resets and set an 8:00 PM digital homework wind-down."
				dominantProf = "Calm & Stress Reset"
			}
			if cm.SelfSafetyScore > maxFriction {
				maxFriction = cm.SelfSafetyScore
				focusArea = "Inner Grounding & Confidence"
				playbook = "Replace cold-calling with 2-minute paired turn-and-talk check-ins before classroom sharing."
				dominantProf = "Inner Grounding & Confidence"
			}
			if cm.SocialComfortScore > maxFriction {
				maxFriction = cm.SocialComfortScore
				focusArea = "Social Comfort & Belonging"
				playbook = "Establish clear partner roles and support healthy peer boundaries during group work."
				dominantProf = "Social Comfort & Belonging"
			}

			cm.PrimaryFocusArea = focusArea
			cm.DominantProfile = dominantProf
			cm.DominantArchetype = dominantProf
			cm.TeacherActionPlaybook = playbook
			cm.OverallStatus = getBucketTier(maxFriction)
			cm.ActionPriority = "Standard"
			if cm.OverallStatus == "Support Needed" {
				cm.ActionPriority = "High Alert"
			} else if cm.OverallStatus == "Emerging" {
				cm.ActionPriority = "Elevated"
			}
		} else {
			cm.AttnStabilityScore = 0
			cm.LoadRegulationScore = 0
			cm.SelfSafetyScore = 0
			cm.SocialComfortScore = 0
			cm.FocusScore = 0
			cm.ResilienceScore = 0
			cm.PeerDynamicsScore = 0
			cm.RecoveryScore = 0
			cm.PrimaryFocusArea = "Assessment Pending"
			cm.DominantProfile = "Pending Assessment"
			cm.DominantArchetype = "Pending Assessment"
			cm.TeacherActionPlaybook = "Awaiting student check-ins to generate class insights."
			cm.OverallStatus = "Pending Assessment"
			cm.ActionPriority = "Pending Check-in"
		}

		d.Classes = append(d.Classes, cm)
	}

	sort.Slice(d.Classes, func(i, j int) bool {
		if d.Classes[i].Grade == d.Classes[j].Grade {
			return d.Classes[i].Section < d.Classes[j].Section
		}
		return d.Classes[i].Grade < d.Classes[j].Grade
	})

	if assessedCount == 0 {
		d.ExecutiveBanner = map[string]string{
			"primary_insight": fmt.Sprintf("%s Cohort Telemetry: Awaiting student check-ins to generate school-wide regulation telemetry.", d.SchoolName),
			"recommendation":  "Begin onboarding and guide students to complete their baseline check-in.",
			"impact_score":    "Pending First Assessment Cycle",
		}
		d.FrictionDiagnostics = map[string]interface{}{
			"task_initiation": map[string]interface{}{
				"high_barrier":     0,
				"moderate_latency": 0,
				"fluid_flow":       0,
				"diagnostic":       "Awaiting baseline check-in data.",
			},
			"classroom_voice": map[string]interface{}{
				"evaluative_silence": 0,
				"selective_asking":   0,
				"active_inquiry":     0,
				"diagnostic":         "Awaiting baseline check-in data.",
			},
			"peer_boundary_strain": map[string]interface{}{
				"acute_mediation":        0,
				"moderate_crosscurrents": 0,
				"grounded":               0,
				"diagnostic":             "Awaiting baseline check-in data.",
			},
			"screen_drag": map[string]interface{}{
				"severe_sleep_debt": 0,
				"mild_evening_drag": 0,
				"restorative":        0,
				"diagnostic":         "Awaiting baseline check-in data.",
			},
		}
	} else {
		// Executive Diagnostic Banner
		primaryNeed := "Calm & Stress Reset"
		recommendation := "Incorporate 2-minute physiological calm pauses before key subjects and support an 8:00 PM evening digital study cutoff."
		if avgAttnStab < avgLoadStab && avgAttnStab < avgSafetyStab {
			primaryNeed = "Attention & Focus Flow"
			recommendation = "Structure class periods into 15-minute focused intervals followed by 1-minute mental resets to optimize sustained attention."
		} else if avgSafetyStab < avgLoadStab {
			primaryNeed = "Inner Grounding & Confidence"
			recommendation = "Use paired turn-and-talk discussions and low-stakes question boxes to eliminate hesitance under evaluative pressure."
		}

		d.ExecutiveBanner = map[string]string{
			"primary_insight": fmt.Sprintf("%s Cohort Telemetry: Primary focus area is %s, reflecting students building regulation capacity across study periods.", d.SchoolName, primaryNeed),
			"recommendation":  recommendation,
			"impact_score":    "Primary Institutional Priority",
		}

		// Behavioral Friction Diagnostics (Clean, grounded framing)
		d.FrictionDiagnostics = map[string]interface{}{
			"task_initiation": map[string]interface{}{
				"high_barrier":     calcPct(attnCounts["support_needed"], tStud),
				"moderate_latency": calcPct(attnCounts["emerging"], tStud),
				"fluid_flow":       calcPct(attnCounts["stable"], tStud),
				"diagnostic":       fmt.Sprintf("%d%% of students transition into deep focus once clear 15-minute visual intervals are established.", calcPct(attnCounts["stable"], tStud)),
			},
			"classroom_voice": map[string]interface{}{
				"evaluative_silence": calcPct(safetyCounts["support_needed"], tStud),
				"selective_asking":   calcPct(safetyCounts["emerging"], tStud),
				"active_inquiry":     calcPct(safetyCounts["stable"], tStud),
				"diagnostic":         fmt.Sprintf("%d%% benefit from paired discussions before volunteering answers in large classrooms.", calcPct(safetyCounts["support_needed"]+safetyCounts["emerging"], tStud)),
			},
			"peer_boundary_strain": map[string]interface{}{
				"acute_mediation":        calcPct(socialCounts["support_needed"], tStud),
				"moderate_crosscurrents": calcPct(socialCounts["emerging"], tStud),
				"grounded":               calcPct(socialCounts["stable"], tStud),
				"diagnostic":             fmt.Sprintf("%d%% maintain healthy personal boundaries during collaborative group activities.", calcPct(socialCounts["stable"], tStud)),
			},
			"screen_drag": map[string]interface{}{
				"severe_sleep_debt":  calcPct(loadCounts["support_needed"], tStud),
				"mild_evening_drag": calcPct(loadCounts["emerging"], tStud),
				"restorative":        calcPct(loadCounts["stable"], tStud),
				"diagnostic":         fmt.Sprintf("Evening screen boundaries post-8:00 PM directly support restorative recovery in %d%% of learners.", calcPct(loadCounts["support_needed"]+loadCounts["emerging"], tStud)),
			},
		}
	}

	return &d, nil
}

func (r *postgresAnalytics) GetStudentProfiles(ctx context.Context, schoolID, grade, section, search string) ([]domain.StudentAnalyticsProfile, error) {
	query := `
		SELECT 
			st.id, st.access_id, st.name, st.grade, st.section, st.school_id, sc.name AS school_name,
			COALESCE(sr.behavioral_diagnostics->>'archetype', '') AS archetype,
			COALESCE((sr.behavioral_diagnostics->>'focusScore')::int, 0) AS focus_score,
			COALESCE((sr.behavioral_diagnostics->>'resilienceScore')::int, 0) AS resilience_score,
			COALESCE((sr.behavioral_diagnostics->>'academicTenacity')::int, 0) AS tenacity_score,
			COALESCE((sr.behavioral_diagnostics->>'stressAdaptability')::int, 0) AS stress_score,
			COALESCE(sr.behavioral_diagnostics->>'primaryFriction', '') AS primary_friction,
			COALESCE(sr.behavioral_diagnostics->>'momentumTrend', 'stable') AS momentum_trend,
			COALESCE(sr.completed_at::text, '') AS last_check_in_date,
			(SELECT COUNT(*) FROM student_results WHERE student_id = st.id) AS check_in_count,
			COALESCE(sr.pathway_track_id, '') AS pathway_track_id,
			COALESCE(sr.pathway_track_name, '') AS pathway_track_name,
			COALESCE(sr.primary_bucket, '') AS primary_bucket,
			COALESCE(sr.secondary_bucket, '') AS secondary_bucket,
			COALESCE(sr.is_balance_mode, false) AS is_balance_mode,
			COALESCE(sr.section_scores, '{}'::jsonb) AS section_scores
		FROM students st
		JOIN schools sc ON st.school_id = sc.id
		LEFT JOIN LATERAL (
			SELECT behavioral_diagnostics, completed_at, pathway_track_id, pathway_track_name, primary_bucket, secondary_bucket, is_balance_mode, section_scores
			FROM student_results
			WHERE student_id = st.id
			ORDER BY completed_at DESC
			LIMIT 1
		) sr ON true
		WHERE (st.school_id = $1 OR st.school_id IN (SELECT id FROM schools WHERE parent_school_id = $1))
	`
	args := []interface{}{schoolID}

	if grade != "" && grade != "all" {
		args = append(args, grade)
		query += fmt.Sprintf(" AND st.grade = $%d", len(args))
	}
	if section != "" && section != "all" {
		args = append(args, section)
		query += fmt.Sprintf(" AND st.section = $%d", len(args))
	}
	if search != "" {
		args = append(args, "%"+strings.ToLower(search)+"%")
		query += fmt.Sprintf(" AND (LOWER(st.name) LIKE $%d OR LOWER(st.access_id) LIKE $%d)", len(args), len(args))
	}

	query += ` ORDER BY st.grade, st.section, st.name`

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var profiles []domain.StudentAnalyticsProfile
	for rows.Next() {
		var p domain.StudentAnalyticsProfile
		var secScoresJSON []byte
		if err := rows.Scan(
			&p.ID, &p.AccessID, &p.Name, &p.Grade, &p.Section, &p.SchoolID, &p.SchoolName,
			&p.Archetype, &p.FocusScore, &p.ResilienceScore, &p.AcademicTenacity, &p.StressAdaptability,
			&p.PrimaryFriction, &p.MomentumTrend, &p.LastCheckInDate, &p.CheckInCount,
			&p.PathwayTrackID, &p.PathwayTrackName, &p.PrimaryBucket, &p.SecondaryBucket, &p.IsBalanceMode,
			&secScoresJSON,
		); err != nil {
			return nil, err
		}

		if p.CheckInCount == 0 {
			p.Archetype = "Unassessed"
			p.OverallStatus = "Pending Assessment"
			p.AttnTier = "Pending Assessment"
			p.LoadTier = "Pending Assessment"
			p.SelfSafetyTier = "Pending Assessment"
			p.SocialTier = "Pending Assessment"
			p.RegulationProfile = "Pending Assessment"
			p.PrimaryFriction = "Awaiting Assessment"
			p.RadarDimensions = map[string]float64{
				"Attention & Focus Flow":       0,
				"Social Comfort & Belonging":   0,
				"Calm & Stress Reset":          0,
				"Inner Grounding & Confidence": 0,
				"Focus & Cognitive":            0,
				"Emotional Awareness":          0,
				"Peer Engagement":              0,
				"Academic Tenacity":            0,
				"Stress Adaptability":          0,
				"Self-Regulation":              0,
			}
			profiles = append(profiles, p)
			continue
		}

		// Calculate 4 Bucket Raw Scores (each 8 to 32)
		attn, load, safety, social := parseBucketScores(secScoresJSON, p.FocusScore, p.ResilienceScore, p.AcademicTenacity, p.StressAdaptability)
		p.AttnStabilityScore = attn
		p.LoadRegulationScore = load
		p.SelfSafetyScore = safety
		p.SocialComfortScore = social

		// Calculate Bucket Tiers (<15 Stable, 15-22 Emerging, >=23 Support Needed)
		p.AttnTier = getBucketTier(attn)
		p.LoadTier = getBucketTier(load)
		p.SelfSafetyTier = getBucketTier(safety)
		p.SocialTier = getBucketTier(social)

		// Overall Status
		if p.AttnTier == "Support Needed" || p.LoadTier == "Support Needed" || p.SelfSafetyTier == "Support Needed" || p.SocialTier == "Support Needed" {
			p.OverallStatus = "Support Needed"
		} else if p.AttnTier == "Emerging" || p.LoadTier == "Emerging" || p.SelfSafetyTier == "Emerging" || p.SocialTier == "Emerging" {
			p.OverallStatus = "Emerging"
		} else {
			p.OverallStatus = "Stable"
		}

		// Evaluate pathway track if not already populated in DB
		if p.PathwayTrackID == "" {
			bMap := map[domain.BucketType]int{
				domain.BucketAttnStability:  attn,
				domain.BucketLoadRegulation: load,
				domain.BucketSelfSafety:     safety,
				domain.BucketSocialComfort:  social,
			}
			track, _ := services.EvaluatePathwayBuckets(bMap)
			p.PathwayTrackID = track.TrackID
			p.PathwayTrackName = track.TrackName
			p.PrimaryBucket = string(track.PrimaryBucket)
			p.SecondaryBucket = string(track.SecondaryBucket)
			p.IsBalanceMode = track.IsBalanceMode
		}

		// Determine Regulation Profile
		if p.IsBalanceMode {
			p.RegulationProfile = "All-Round Balance Mode"
		} else {
			switch p.PrimaryBucket {
			case string(domain.BucketAttnStability):
				p.RegulationProfile = "Attention & Focus Flow"
			case string(domain.BucketLoadRegulation):
				p.RegulationProfile = "Calm & Stress Reset"
			case string(domain.BucketSelfSafety):
				p.RegulationProfile = "Inner Grounding & Confidence"
			case string(domain.BucketSocialComfort):
				p.RegulationProfile = "Social Comfort & Belonging"
			default:
				p.RegulationProfile = "Calm & Stress Reset"
			}
		}

		// 4-Pole Diamond Radar (Top, Right, Bottom, Left)
		attnStab := rawScoreToStability(attn)
		loadStab := rawScoreToStability(load)
		safetyStab := rawScoreToStability(safety)
		socialStab := rawScoreToStability(social)

		p.RadarDimensions = map[string]float64{
			"Attention & Focus Flow":       attnStab,
			"Social Comfort & Belonging":   socialStab,
			"Calm & Stress Reset":          loadStab,
			"Inner Grounding & Confidence": safetyStab,
			// Aliases for compatibility
			"Focus & Cognitive":   attnStab,
			"Emotional Awareness": safetyStab,
			"Peer Engagement":     socialStab,
			"Academic Tenacity":   attnStab,
			"Stress Adaptability": loadStab,
			"Self-Regulation":     safetyStab,
		}

		profiles = append(profiles, p)
	}

	return profiles, nil
}

func (r *postgresAnalytics) GetNationalOverview(ctx context.Context) (*domain.NationalOverview, error) {
	// 1. Fast path: check cached_analytics table (computed & saved)
	var cachedPayload []byte
	var updatedAt time.Time
	cErr := r.db.QueryRow(ctx, `SELECT payload, updated_at FROM cached_analytics WHERE key = 'national_overview'`).Scan(&cachedPayload, &updatedAt)
	if cErr == nil && len(cachedPayload) > 0 && time.Since(updatedAt) < 15*time.Minute {
		var cached domain.NationalOverview
		if json.Unmarshal(cachedPayload, &cached) == nil && len(cached.NationalRadar) > 0 {
			return &cached, nil
		}
	}

	var totalCompleted int
	_ = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM student_results WHERE status = 'complete'`).Scan(&totalCompleted)

	if totalCompleted == 0 {
		emptyRes := &domain.NationalOverview{
			NationalRadar: []map[string]interface{}{
				{"subject": "Attention & Focus Flow", "score": 0, "benchmark": 70},
				{"subject": "Social Comfort & Belonging", "score": 0, "benchmark": 72},
				{"subject": "Calm & Stress Reset", "score": 0, "benchmark": 68},
				{"subject": "Inner Grounding & Confidence", "score": 0, "benchmark": 70},
				// Aliases for backwards compatibility
				{"subject": "Emotional Awareness", "score": 0, "benchmark": 70},
				{"subject": "Peer Engagement", "score": 0, "benchmark": 72},
				{"subject": "Academic Tenacity", "score": 0, "benchmark": 72},
				{"subject": "Stress Adaptability", "score": 0, "benchmark": 68},
				{"subject": "Focus & Cognitive", "score": 0, "benchmark": 70},
				{"subject": "Self-Regulation", "score": 0, "benchmark": 70},
			},
			ExecutiveBanner: map[string]string{
				"impact_score":    "Calibration Mode",
				"primary_insight": "Awaiting baseline diagnostic assessments from affiliated institutions or student check-ins.",
				"recommendation":  "Institutional onboarding active. Pan-campus diagnostic signals will synthesize dynamically once evaluations are recorded.",
			},
			FrictionDiagnostics: map[string]interface{}{
				"task_initiation": map[string]interface{}{
					"high_barrier":     0,
					"moderate_latency": 0,
					"fluid_flow":       0,
					"diagnostic":       "Awaiting initial assessment telemetry to calculate task initiation friction.",
				},
				"classroom_voice": map[string]interface{}{
					"evaluative_silence": 0,
					"selective_asking":   0,
					"active_inquiry":     0,
					"diagnostic":         "Awaiting assessment telemetry to calibrate classroom query hesitations.",
				},
				"peer_boundary_strain": map[string]interface{}{
					"acute_mediation":        0,
					"moderate_crosscurrents": 0,
					"grounded":               0,
					"diagnostic":             "Awaiting peer dynamic responses to evaluate social boundary strain.",
				},
				"screen_drag": map[string]interface{}{
					"severe_sleep_debt": 0,
					"mild_evening_drag": 0,
					"restorative":       0,
					"diagnostic":        "Awaiting evening recovery and sleep hygiene diagnostic data.",
				},
			},
			Archetypes: []map[string]interface{}{
				{"id": "attn", "name": "Attention & Focus Flow", "percentage": 25, "tag": "Focus & Routine Rhythm", "color": "sky", "description": "Learners strengthening task initiation and sustained concentration rhythms.", "counselorStrategy": "Implement 15-minute visual focus intervals and clear step-by-step checklist cues."},
				{"id": "load", "name": "Calm & Stress Reset", "percentage": 25, "tag": "Stress & Workload Reset", "color": "amber", "description": "Learners navigating daily cognitive fatigue and evening screen drag.", "counselorStrategy": "Introduce 2-minute physiological calm resets and encourage an 8:00 PM digital curfew."},
				{"id": "safety", "name": "Inner Grounding & Confidence", "percentage": 25, "tag": "Self-Trust & Grounding", "color": "rose", "description": "Learners experiencing evaluative hesitation when speaking in group settings.", "counselorStrategy": "Replace public cold-calling with paired turn-and-talk check-ins."},
				{"id": "social", "name": "Social Comfort & Belonging", "percentage": 25, "tag": "Peer Ease & Connectedness", "color": "emerald", "description": "Learners navigating collaborative dynamics and healthy boundaries.", "counselorStrategy": "Assign structured collaborative roles in classroom work."},
			},
			GradeHeatmaps: []map[string]interface{}{},
		}
		return emptyRes, nil
	}

	// Dynamic calculation from real student_results
	rows, err := r.db.Query(ctx, `
		SELECT 
			COALESCE(section_scores, '{}'::jsonb),
			COALESCE(total_score, 0),
			COALESCE(behavioral_diagnostics, '{}'::jsonb),
			LOWER(COALESCE(primary_bucket, assigned_bucket, ''))
		FROM student_results
		WHERE status = 'complete'
	`)

	var sumAttnStab, sumLoadStab, sumSafetyStab, sumSocialStab float64
	var countAttnHigh, countLoadHigh, countSafetyHigh, countSocialHigh int
	var countAttnEmerging, countLoadEmerging, countSafetyEmerging, countSocialEmerging int
	var attnCount, loadCount, safetyCount, socialCount int
	var assessedRows int

	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var secScores []byte
			var totalScore int
			var diagJSON []byte
			var bucketStr string
			if err := rows.Scan(&secScores, &totalScore, &diagJSON, &bucketStr); err == nil {
				assessedRows++
				var diag map[string]interface{}
				_ = json.Unmarshal(diagJSON, &diag)

				focus := toIntOr(diag["focusScore"], totalScore)
				resil := toIntOr(diag["resilienceScore"], totalScore)
				tenacity := toIntOr(diag["academicTenacity"], totalScore)
				stress := toIntOr(diag["stressAdaptability"], totalScore)

				attnRaw, loadRaw, safetyRaw, socialRaw := parseBucketScores(secScores, focus, resil, tenacity, stress)

				attnStab := rawScoreToStability(attnRaw)
				loadStab := rawScoreToStability(loadRaw)
				safetyStab := rawScoreToStability(safetyRaw)
				socialStab := rawScoreToStability(socialRaw)

				sumAttnStab += attnStab
				sumLoadStab += loadStab
				sumSafetyStab += safetyStab
				sumSocialStab += socialStab

				// Bucket tier counts
				if attnRaw >= 23 {
					countAttnHigh++
				} else if attnRaw >= 15 {
					countAttnEmerging++
				}

				if loadRaw >= 23 {
					countLoadHigh++
				} else if loadRaw >= 15 {
					countLoadEmerging++
				}

				if safetyRaw >= 23 {
					countSafetyHigh++
				} else if safetyRaw >= 15 {
					countSafetyEmerging++
				}

				if socialRaw >= 23 {
					countSocialHigh++
				} else if socialRaw >= 15 {
					countSocialEmerging++
				}

				// Archetype primary counts
				if strings.Contains(bucketStr, "attn") || strings.Contains(bucketStr, "focus") || strings.Contains(bucketStr, "sprinter") {
					attnCount++
				} else if strings.Contains(bucketStr, "load") || strings.Contains(bucketStr, "stress") || strings.Contains(bucketStr, "pacer") {
					loadCount++
				} else if strings.Contains(bucketStr, "safety") || strings.Contains(bucketStr, "ground") || strings.Contains(bucketStr, "observer") {
					safetyCount++
				} else if strings.Contains(bucketStr, "social") || strings.Contains(bucketStr, "connect") {
					socialCount++
				} else {
					// Fallback to highest friction raw score
					if attnRaw >= loadRaw && attnRaw >= safetyRaw && attnRaw >= socialRaw {
						attnCount++
					} else if loadRaw >= safetyRaw && loadRaw >= socialRaw {
						loadCount++
					} else if safetyRaw >= socialRaw {
						safetyCount++
					} else {
						socialCount++
					}
				}
			}
		}
	}

	if assessedRows == 0 {
		assessedRows = 1
	}

	avgAttn := int(math.Round(sumAttnStab / float64(assessedRows)))
	avgLoad := int(math.Round(sumLoadStab / float64(assessedRows)))
	avgSafety := int(math.Round(sumSafetyStab / float64(assessedRows)))
	avgSocial := int(math.Round(sumSocialStab / float64(assessedRows)))

	// Friction diagnostics calculations
	taskHigh := int(math.Round(float64(countAttnHigh) * 100.0 / float64(assessedRows)))
	taskEmerging := int(math.Round(float64(countAttnEmerging) * 100.0 / float64(assessedRows)))
	taskFluid := 100 - taskHigh - taskEmerging
	if taskFluid < 0 {
		taskFluid = 0
	}
	taskDiag := fmt.Sprintf("%d%% of learners show elevated task initiation inertia during study transitions.", taskHigh)
	if taskHigh == 0 && taskEmerging > 0 {
		taskDiag = fmt.Sprintf("%d%% of learners show moderate startup hesitation, responding well to structured checklists.", taskEmerging)
	} else if taskHigh == 0 && taskEmerging == 0 {
		taskDiag = "Learners demonstrate steady task initiation rhythms and fluid study transitions."
	}

	voiceHigh := int(math.Round(float64(countSafetyHigh) * 100.0 / float64(assessedRows)))
	voiceEmerging := int(math.Round(float64(countSafetyEmerging) * 100.0 / float64(assessedRows)))
	voiceFluid := 100 - voiceHigh - voiceEmerging
	if voiceFluid < 0 {
		voiceFluid = 0
	}
	voiceDiag := fmt.Sprintf("%d%% of students indicate evaluative hesitation when asking questions.", voiceHigh)
	if voiceHigh == 0 && voiceEmerging > 0 {
		voiceDiag = fmt.Sprintf("%d%% of students ask questions selectively in small-group settings.", voiceEmerging)
	} else if voiceHigh == 0 && voiceEmerging == 0 {
		voiceDiag = "Strong classroom psychological safety with active inquiry participation."
	}

	peerHigh := int(math.Round(float64(countSocialHigh) * 100.0 / float64(assessedRows)))
	peerEmerging := int(math.Round(float64(countSocialEmerging) * 100.0 / float64(assessedRows)))
	peerFluid := 100 - peerHigh - peerEmerging
	if peerFluid < 0 {
		peerFluid = 0
	}
	peerDiag := fmt.Sprintf("%d%% experience peer boundary or group chat mediation strain.", peerHigh)
	if peerHigh == 0 && peerEmerging > 0 {
		peerDiag = fmt.Sprintf("%d%% balance collaborative peer dynamics with occasional boundary fatigue.", peerEmerging)
	} else if peerHigh == 0 && peerEmerging == 0 {
		peerDiag = "High peer connectedness with grounded social boundaries."
	}

	screenHigh := int(math.Round(float64(countLoadHigh) * 100.0 / float64(assessedRows)))
	screenEmerging := int(math.Round(float64(countLoadEmerging) * 100.0 / float64(assessedRows)))
	screenFluid := 100 - screenHigh - screenEmerging
	if screenFluid < 0 {
		screenFluid = 0
	}
	screenDiag := fmt.Sprintf("%d%% report late-night screen drag impacting morning focus.", screenHigh)
	if screenHigh == 0 && screenEmerging > 0 {
		screenDiag = fmt.Sprintf("%d%% report mild evening screen carry-over into bedtime routines.", screenEmerging)
	} else if screenHigh == 0 && screenEmerging == 0 {
		screenDiag = "Healthy sleep hygiene and restorative evening wind-down cycles."
	}

	totalBuckets := attnCount + loadCount + safetyCount + socialCount
	calcArchetypePct := func(c int) int {
		if totalBuckets == 0 {
			return 25
		}
		return int(math.Round(float64(c) * 100.0 / float64(totalBuckets)))
	}

	// Grade heatmaps
	gradeRows, gErr := r.db.Query(ctx, `
		SELECT 
			s.grade,
			COUNT(sr.id),
			AVG(sr.total_score)
		FROM student_results sr
		JOIN students s ON s.id = sr.student_id
		WHERE sr.status = 'complete'
		GROUP BY s.grade
		ORDER BY s.grade ASC
	`)
	var gradeHeatmaps []map[string]interface{}
	if gErr == nil {
		defer gradeRows.Close()
		for gradeRows.Next() {
			var gr string
			var count int
			var avgScore float64
			if err := gradeRows.Scan(&gr, &count, &avgScore); err == nil {
				tier := "Secondary"
				if strings.Contains(gr, "6") || strings.Contains(gr, "7") || strings.Contains(gr, "8") {
					tier = "Middle School"
				} else if strings.Contains(gr, "11") || strings.Contains(gr, "12") {
					tier = "Senior Secondary"
				}
				sc := int(math.Round(avgScore))
				priority := "Standard"
				if sc < 60 {
					priority = "High Alert"
				} else if sc < 75 {
					priority = "Moderate"
				}
				gradeHeatmaps = append(gradeHeatmaps, map[string]interface{}{
					"grade":             fmt.Sprintf("Grade %s", gr),
					"tier":              tier,
					"focusScore":        sc,
					"resilienceScore":   sc,
					"peerDynamicsScore": sc,
					"recoveryScore":     sc,
					"primaryFriction":   "Routine transition friction",
					"actionPriority":    priority,
					"actionGuide":       "Conduct 15-minute routine transition workshops.",
				})
			}
		}
	}
	if gradeHeatmaps == nil {
		gradeHeatmaps = []map[string]interface{}{}
	}

	overview := &domain.NationalOverview{
		NationalRadar: []map[string]interface{}{
			{"subject": "Attention & Focus Flow", "score": avgAttn, "benchmark": 70},
			{"subject": "Social Comfort & Belonging", "score": avgSocial, "benchmark": 72},
			{"subject": "Calm & Stress Reset", "score": avgLoad, "benchmark": 68},
			{"subject": "Inner Grounding & Confidence", "score": avgSafety, "benchmark": 70},
			// Backwards-compatible aliases
			{"subject": "Emotional Awareness", "score": avgSafety, "benchmark": 70},
			{"subject": "Peer Engagement", "score": avgSocial, "benchmark": 72},
			{"subject": "Academic Tenacity", "score": avgAttn, "benchmark": 72},
			{"subject": "Stress Adaptability", "score": avgLoad, "benchmark": 68},
			{"subject": "Focus & Cognitive", "score": avgAttn, "benchmark": 70},
			{"subject": "Self-Regulation", "score": avgSafety, "benchmark": 70},
		},
		ExecutiveBanner: map[string]string{
			"impact_score":    "Pan-Campus Behavioral Priority",
			"primary_insight": fmt.Sprintf("National Cohort Telemetry: Synthesizing diagnostic patterns across %d completed student evaluations.", totalCompleted),
			"recommendation":  "Support school counselors with targeted interventions in primary friction vectors identified by this cohort's assessment results.",
		},
		FrictionDiagnostics: map[string]interface{}{
			"task_initiation": map[string]interface{}{
				"high_barrier":     taskHigh,
				"moderate_latency": taskEmerging,
				"fluid_flow":       taskFluid,
				"diagnostic":       taskDiag,
			},
			"classroom_voice": map[string]interface{}{
				"evaluative_silence": voiceHigh,
				"selective_asking":   voiceEmerging,
				"active_inquiry":     voiceFluid,
				"diagnostic":         voiceDiag,
			},
			"peer_boundary_strain": map[string]interface{}{
				"acute_mediation":        peerHigh,
				"moderate_crosscurrents": peerEmerging,
				"grounded":               peerFluid,
				"diagnostic":             peerDiag,
			},
			"screen_drag": map[string]interface{}{
				"severe_sleep_debt": screenHigh,
				"mild_evening_drag": screenEmerging,
				"restorative":       screenFluid,
				"diagnostic":        screenDiag,
			},
		},
		Archetypes: []map[string]interface{}{
			{
				"id":                "attn",
				"name":              "Attention & Focus Flow",
				"percentage":        calcArchetypePct(attnCount),
				"tag":               "Focus & Routine Rhythm",
				"color":             "sky",
				"description":       "Learners strengthening task initiation and sustained concentration rhythms across academic periods.",
				"counselorStrategy": "Implement 15-minute visual focus intervals and clear step-by-step checklist cues.",
			},
			{
				"id":                "load",
				"name":              "Calm & Stress Reset",
				"percentage":        calcArchetypePct(loadCount),
				"tag":               "Stress & Workload Reset",
				"color":             "amber",
				"description":       "Learners working through daily cognitive fatigue, exam tension, or late-night screen drag.",
				"counselorStrategy": "Introduce 2-minute physiological calm resets and encourage an 8:00 PM digital homework boundary.",
			},
			{
				"id":                "safety",
				"name":              "Inner Grounding & Confidence",
				"percentage":        calcArchetypePct(safetyCount),
				"tag":               "Self-Trust & Grounding",
				"color":             "rose",
				"description":       "Learners experiencing evaluative doubt or hesitancy asking questions in large classrooms.",
				"counselorStrategy": "Replace public cold-calling with 2-minute paired turn-and-talk check-ins and anonymous inquiry.",
			},
			{
				"id":                "social",
				"name":              "Social Comfort & Belonging",
				"percentage":        calcArchetypePct(socialCount),
				"tag":               "Peer Ease & Connectedness",
				"color":             "emerald",
				"description":       "Learners navigating collaborative dynamics, peer sharing, and healthy personal boundaries.",
				"counselorStrategy": "Assign structured collaborative roles and facilitate small-group connection activities.",
			},
		},
		GradeHeatmaps: gradeHeatmaps,
	}

	// Pre-compute & save into cached_analytics (avoids heavy DB calculation on subsequent calls)
	if dataBytes, mErr := json.Marshal(overview); mErr == nil {
		_, _ = r.db.Exec(ctx, `
			INSERT INTO cached_analytics (key, payload, updated_at)
			VALUES ('national_overview', $1, NOW())
			ON CONFLICT (key) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()
		`, dataBytes)
	}

	return overview, nil
}

