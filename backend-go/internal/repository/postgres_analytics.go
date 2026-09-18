package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"sort"
	"strings"

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

	// Aggregate assessments
	err = r.db.QueryRow(ctx, `SELECT COUNT(*) FROM assessments`).Scan(&a.TotalAssessments)
	if err != nil {
		return nil, err
	}

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

	cRows, cErr := r.db.Query(ctx, `SELECT COALESCE(city, '') FROM schools`)
	if cErr == nil {
		defer cRows.Close()
		cityAggMap := make(map[string]*domain.CityDistribution)

		for cRows.Next() {
			var rawCity string
			if err := cRows.Scan(&rawCity); err == nil {
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

				if existing, exists := cityAggMap[normCity]; exists {
					existing.Count++
				} else {
					cityAggMap[normCity] = &domain.CityDistribution{
						City:  normCity,
						State: normState,
						Count: 1,
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

		var avgFocus, avgResil float64
		_ = r.db.QueryRow(ctx, `
			SELECT 
				COALESCE(AVG((behavioral_diagnostics->>'focusScore')::numeric), 82),
				COALESCE(AVG((behavioral_diagnostics->>'resilienceScore')::numeric), 68)
			FROM student_results 
			WHERE (school_id = $1 OR school_id IN (SELECT id FROM schools WHERE parent_school_id = $1))
			  AND behavioral_diagnostics->>'focusScore' IS NOT NULL
		`, m.ID).Scan(&avgFocus, &avgResil)

		m.AvgFocus = int(avgFocus)
		m.AvgResilience = int(avgResil)

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
					bm.AvgFocus = 84
					bm.AvgResilience = 72
					bm.PrimaryFriction = "Daily Calm & Evening Rest"
					bm.DominantArchetype = "Calm & Stress Reset"
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
	var countStudents = float64(len(students))

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
		default:
			attnCounts["support_needed"]++
		}

		switch s.LoadTier {
		case "Stable":
			loadCounts["stable"]++
		case "Emerging":
			loadCounts["emerging"]++
		default:
			loadCounts["support_needed"]++
		}

		switch s.SelfSafetyTier {
		case "Stable":
			safetyCounts["stable"]++
		case "Emerging":
			safetyCounts["emerging"]++
		default:
			safetyCounts["support_needed"]++
		}

		switch s.SocialTier {
		case "Stable":
			socialCounts["stable"]++
		case "Emerging":
			socialCounts["emerging"]++
		default:
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

		// Class aggregation
		ckey := fmt.Sprintf("%s-%s", s.Grade, s.Section)
		if c, exists := classMap[ckey]; exists {
			c.total++
			if s.CheckInCount > 0 {
				c.checkins++
			}
			c.attnSum += s.AttnStabilityScore
			c.loadSum += s.LoadRegulationScore
			c.safetySum += s.SelfSafetyScore
			c.socialSum += s.SocialComfortScore
			c.focusSum += s.FocusScore
			c.resilSum += s.ResilienceScore
		} else {
			ch := 0
			if s.CheckInCount > 0 {
				ch = 1
			}
			classMap[ckey] = &classAgg{
				grade:     s.Grade,
				section:   s.Section,
				total:     1,
				checkins:  ch,
				attnSum:   s.AttnStabilityScore,
				loadSum:   s.LoadRegulationScore,
				safetySum: s.SelfSafetyScore,
				socialSum: s.SocialComfortScore,
				focusSum:  s.FocusScore,
				resilSum:  s.ResilienceScore,
			}
		}
	}

	// Calculate School Baseline 4-Bucket Radar Averages
	var avgAttnStab, avgSocialStab, avgLoadStab, avgSafetyStab float64
	if countStudents > 0 {
		avgAttnStab = rawScoreToStability(int(math.Round(sumAttn / countStudents)))
		avgSocialStab = rawScoreToStability(int(math.Round(sumSocial / countStudents)))
		avgLoadStab = rawScoreToStability(int(math.Round(sumLoad / countStudents)))
		avgSafetyStab = rawScoreToStability(int(math.Round(sumSafety / countStudents)))
	} else {
		avgAttnStab, avgSocialStab, avgLoadStab, avgSafetyStab = 75, 78, 70, 76
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
	tStud := len(students)
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

		if c.total > 0 {
			cm.AttnStabilityScore = c.attnSum / c.total
			cm.LoadRegulationScore = c.loadSum / c.total
			cm.SelfSafetyScore = c.safetySum / c.total
			cm.SocialComfortScore = c.socialSum / c.total
			cm.FocusScore = c.focusSum / c.total
			cm.ResilienceScore = c.resilSum / c.total
		} else {
			cm.AttnStabilityScore = 14
			cm.LoadRegulationScore = 14
			cm.SelfSafetyScore = 14
			cm.SocialComfortScore = 14
			cm.FocusScore = 80
			cm.ResilienceScore = 70
		}
		cm.PeerDynamicsScore = 78
		cm.RecoveryScore = int(rawScoreToStability(cm.LoadRegulationScore))

		// Tier classification
		cleanGrade := strings.TrimPrefix(strings.ToLower(cm.Grade), "class ")
		switch {
		case strings.HasPrefix(cleanGrade, "6") || strings.HasPrefix(cleanGrade, "7") || strings.HasPrefix(cleanGrade, "8"):
			cm.Tier = "Middle School"
		case strings.HasPrefix(cleanGrade, "9") || strings.HasPrefix(cleanGrade, "10"):
			cm.Tier = "Secondary"
		default:
			cm.Tier = "Senior Secondary"
		}

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

		d.Classes = append(d.Classes, cm)
	}

	sort.Slice(d.Classes, func(i, j int) bool {
		if d.Classes[i].Grade == d.Classes[j].Grade {
			return d.Classes[i].Section < d.Classes[j].Section
		}
		return d.Classes[i].Grade < d.Classes[j].Grade
	})

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

	return &d, nil
}

func (r *postgresAnalytics) GetStudentProfiles(ctx context.Context, schoolID, grade, section, search string) ([]domain.StudentAnalyticsProfile, error) {
	query := `
		SELECT 
			st.id, st.access_id, st.name, st.grade, st.section, st.school_id, sc.name AS school_name,
			COALESCE(sr.behavioral_diagnostics->>'archetype', 'pacer') AS archetype,
			COALESCE((sr.behavioral_diagnostics->>'focusScore')::int, 80) AS focus_score,
			COALESCE((sr.behavioral_diagnostics->>'resilienceScore')::int, 70) AS resilience_score,
			COALESCE((sr.behavioral_diagnostics->>'academicTenacity')::int, 82) AS tenacity_score,
			COALESCE((sr.behavioral_diagnostics->>'stressAdaptability')::int, 64) AS stress_score,
			COALESCE(sr.behavioral_diagnostics->>'primaryFriction', 'Daily Calm & Focus Rhythm') AS primary_friction,
			COALESCE(sr.behavioral_diagnostics->>'momentumTrend', 'stable') AS momentum_trend,
			COALESCE(sr.completed_at::text, st.created_at::text) AS last_check_in_date,
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
