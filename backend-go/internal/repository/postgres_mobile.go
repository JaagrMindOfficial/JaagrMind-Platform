package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"math/rand"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jaagrmind/platform-api/internal/core/domain"
	"github.com/jaagrmind/platform-api/internal/services"
)

type MobileRepository struct {
	db *pgxpool.Pool
}

func NewMobileRepository(db *pgxpool.Pool) *MobileRepository {
	return &MobileRepository{db: db}
}

// ValidateStudentAccessID validates student by access ID for Mobile login
func (r *MobileRepository) ValidateStudentAccessID(ctx context.Context, accessID string) (*domain.StudentMobileProfile, error) {
	query := `
		SELECT s.id, s.name, sc.name, s.grade, s.section,
		       COALESCE(s.avatar_url, ''), COALESCE(s.level, 1), COALESCE(s.current_xp, 0),
		       COALESCE(s.next_level_xp, 1000), COALESCE(s.streak_days, 0), COALESCE(s.longest_streak, 0),
		       COALESCE(s.garden_level, 1), COALESCE(s.tree_stage, 'sprout')
		FROM students s
		LEFT JOIN schools sc ON s.school_id = sc.id
		WHERE UPPER(s.access_id) = UPPER($1) AND s.is_active = true
		LIMIT 1
	`
	var prof domain.StudentMobileProfile
	var schoolName *string
	err := r.db.QueryRow(ctx, query, accessID).Scan(
		&prof.ID, &prof.DisplayName, &schoolName, &prof.Class, &prof.Section,
		&prof.AvatarURL, &prof.Level, &prof.CurrentXP, &prof.NextLevelXP,
		&prof.StreakDays, &prof.LongestStreak, &prof.GardenLevel, &prof.TreeStage,
	)
	if err != nil {
		return nil, err
	}
	if schoolName != nil {
		prof.School = *schoolName
	} else {
		prof.School = "JaagrMind Campus"
	}
	if prof.AvatarURL == "" {
		prof.AvatarURL = fmt.Sprintf("https://api.dicebear.com/7.x/bottts/svg?seed=%s", prof.DisplayName)
	}
	return &prof, nil
}

// GetStudentMobileProfile fetches student profile by UUID
func (r *MobileRepository) GetStudentMobileProfile(ctx context.Context, studentID string) (*domain.StudentMobileProfile, error) {
	query := `
		SELECT s.id, s.name, sc.name, s.grade, s.section,
		       COALESCE(s.avatar_url, ''), COALESCE(s.level, 1), COALESCE(s.current_xp, 0),
		       COALESCE(s.next_level_xp, 1000), COALESCE(s.streak_days, 0), COALESCE(s.longest_streak, 0),
		       COALESCE(s.garden_level, 1), COALESCE(s.tree_stage, 'sprout')
		FROM students s
		LEFT JOIN schools sc ON s.school_id = sc.id
		WHERE s.id = $1
		LIMIT 1
	`
	var prof domain.StudentMobileProfile
	var schoolName *string
	err := r.db.QueryRow(ctx, query, studentID).Scan(
		&prof.ID, &prof.DisplayName, &schoolName, &prof.Class, &prof.Section,
		&prof.AvatarURL, &prof.Level, &prof.CurrentXP, &prof.NextLevelXP,
		&prof.StreakDays, &prof.LongestStreak, &prof.GardenLevel, &prof.TreeStage,
	)
	if err != nil {
		return nil, err
	}
	if schoolName != nil {
		prof.School = *schoolName
	} else {
		prof.School = "JaagrMind Campus"
	}
	if prof.AvatarURL == "" {
		prof.AvatarURL = fmt.Sprintf("https://api.dicebear.com/7.x/bottts/svg?seed=%s", prof.DisplayName)
	}
	return &prof, nil
}

// UpdateStudentAvatar updates the profile picture URL
func (r *MobileRepository) UpdateStudentAvatar(ctx context.Context, studentID string, avatarURL string) error {
	_, err := r.db.Exec(ctx, "UPDATE students SET avatar_url = $1 WHERE id = $2", avatarURL, studentID)
	return err
}

// GetOrCreateDailyPathway generates or fetches today's pathway according to psychologist rules
func (r *MobileRepository) GetOrCreateDailyPathway(ctx context.Context, studentID string, dateStr string) (*domain.DailyPathway, error) {
	// 1. Check if already generated for today
	existingQuery := `
		SELECT id, student_id, to_char(date, 'YYYY-MM-DD'), track_id, track_name,
		       student_heading, student_subtext, is_balance_mode,
		       COALESCE(priority_bucket, ''), COALESCE(secondary_bucket, ''),
		       assigned_activities, completed_count, created_at
		FROM daily_pathway
		WHERE student_id = $1 AND date = $2::date
		LIMIT 1
	`
	var dp domain.DailyPathway
	var activitiesRaw []byte
	err := r.db.QueryRow(ctx, existingQuery, studentID, dateStr).Scan(
		&dp.ID, &dp.StudentID, &dp.Date, &dp.TrackID, &dp.TrackName,
		&dp.StudentHeading, &dp.StudentSubtext, &dp.IsBalanceMode,
		&dp.PriorityBucket, &dp.SecondaryBucket, &activitiesRaw,
		&dp.CompletedCount, &dp.CreatedAt,
	)
	if err == nil {
		_ = json.Unmarshal(activitiesRaw, &dp.AssignedActivities)
		dp.IsCompleted = len(dp.AssignedActivities) > 0 && dp.CompletedCount >= len(dp.AssignedActivities)
		return &dp, nil
	}
	if err != pgx.ErrNoRows {
		return nil, err
	}

	// 2. Fetch student's latest assessment track from student_results
	var trackID, trackName, primaryBucket, secondaryBucket string
	var isBalanceMode bool

	resQuery := `
		SELECT COALESCE(pathway_track_id, 'TRACK_CR_FOCUS'),
		       COALESCE(pathway_track_name, 'Calm Reset – with Focus Support'),
		       COALESCE(primary_bucket, 'LOAD_REGULATION'),
		       COALESCE(secondary_bucket, 'ATTN_STABILITY'),
		       COALESCE(is_balance_mode, false)
		FROM student_results
		WHERE student_id = $1
		ORDER BY completed_at DESC
		LIMIT 1
	`
	err = r.db.QueryRow(ctx, resQuery, studentID).Scan(
		&trackID, &trackName, &primaryBucket, &secondaryBucket, &isBalanceMode,
	)
	if err != nil {
		// Default to Calm Reset - Focus Support
		trackID = "TRACK_CR_FOCUS"
		trackName = "Calm Reset – with Focus Support"
		primaryBucket = "LOAD_REGULATION"
		secondaryBucket = "ATTN_STABILITY"
		isBalanceMode = false
	}

	track := services.GetPathwayTrack(domain.BucketType(primaryBucket), domain.BucketType(secondaryBucket), isBalanceMode)

	// 3. Fetch active catalog activities
	rows, err := r.db.Query(ctx, `
		SELECT name, title, bucket, instruction, description, duration_minutes
		FROM activity_catalog
		WHERE is_active = true
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	catalogByBucket := make(map[string][]domain.PathwayActivityItem)
	for rows.Next() {
		var act domain.PathwayActivityItem
		if err := rows.Scan(&act.Type, &act.Title, &act.Bucket, &act.Instruction, &act.Description, &act.DurationMinutes); err == nil {
			act.ID = act.Type
			catalogByBucket[act.Bucket] = append(catalogByBucket[act.Bucket], act)
		}
	}

	// 4. Assemble 3 activities: [Primary, Primary, Secondary] or 3 distinct if Balance Mode
	var assigned []domain.PathwayActivityItem
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))

	if isBalanceMode {
		buckets := []string{"ATTN_STABILITY", "LOAD_REGULATION", "SELF_SAFETY", "SOCIAL_COMFORT"}
		rng.Shuffle(len(buckets), func(i, j int) { buckets[i], buckets[j] = buckets[j], buckets[i] })
		for i := 0; i < 3 && i < len(buckets); i++ {
			bList := catalogByBucket[buckets[i]]
			if len(bList) > 0 {
				picked := bList[rng.Intn(len(bList))]
				assigned = append(assigned, picked)
			}
		}
	} else {
		// 1 & 2 from Primary
		pList := catalogByBucket[primaryBucket]
		if len(pList) >= 2 {
			idx1 := rng.Intn(len(pList))
			idx2 := (idx1 + 1 + rng.Intn(len(pList)-1)) % len(pList)
			assigned = append(assigned, pList[idx1], pList[idx2])
		} else if len(pList) == 1 {
			assigned = append(assigned, pList[0], pList[0])
		}

		// 3 from Secondary
		sList := catalogByBucket[secondaryBucket]
		if len(sList) > 0 {
			assigned = append(assigned, sList[rng.Intn(len(sList))])
		}
	}

	// Fallback guarantee 3 activities
	if len(assigned) < 3 {
		for _, bList := range catalogByBucket {
			for _, act := range bList {
				if len(assigned) >= 3 {
					break
				}
				assigned = append(assigned, act)
			}
		}
	}

	// 5. Insert daily pathway
	assignedJSON, _ := json.Marshal(assigned)
	insertQuery := `
		INSERT INTO daily_pathway (
			student_id, date, track_id, track_name,
			student_heading, student_subtext, is_balance_mode,
			priority_bucket, secondary_bucket, assigned_activities, completed_count
		)
		VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8, $9, $10, 0)
		RETURNING id, to_char(date, 'YYYY-MM-DD'), created_at
	`
	err = r.db.QueryRow(ctx, insertQuery,
		studentID, dateStr, track.TrackID, track.TrackName,
		track.StudentHeading, track.StudentSubtext, track.IsBalanceMode,
		primaryBucket, secondaryBucket, assignedJSON,
	).Scan(&dp.ID, &dp.Date, &dp.CreatedAt)
	if err != nil {
		return nil, err
	}

	dp.StudentID = studentID
	dp.TrackID = track.TrackID
	dp.TrackName = track.TrackName
	dp.StudentHeading = track.StudentHeading
	dp.StudentSubtext = track.StudentSubtext
	dp.IsBalanceMode = track.IsBalanceMode
	dp.PriorityBucket = primaryBucket
	dp.SecondaryBucket = secondaryBucket
	dp.AssignedActivities = assigned
	dp.CompletedCount = 0
	dp.IsCompleted = false

	return &dp, nil
}

// CompletePathwayActivity marks an assigned activity complete for today
func (r *MobileRepository) CompletePathwayActivity(ctx context.Context, studentID string, dateStr string, activityType string) (int, int, error) {
	var dpID string
	var activitiesRaw []byte
	query := `
		SELECT id, assigned_activities
		FROM daily_pathway
		WHERE student_id = $1 AND date = $2::date
		LIMIT 1
	`
	err := r.db.QueryRow(ctx, query, studentID, dateStr).Scan(&dpID, &activitiesRaw)
	if err != nil {
		return 0, 0, err
	}

	var activities []domain.PathwayActivityItem
	_ = json.Unmarshal(activitiesRaw, &activities)

	now := time.Now()
	completedCount := 0
	for i := range activities {
		if activities[i].Type == activityType || activities[i].ID == activityType {
			activities[i].Completed = true
			activities[i].CompletedAt = &now
		}
		if activities[i].Completed {
			completedCount++
		}
	}

	updatedJSON, _ := json.Marshal(activities)
	updateQuery := `
		UPDATE daily_pathway
		SET assigned_activities = $1, completed_count = $2
		WHERE id = $3
	`
	_, err = r.db.Exec(ctx, updateQuery, updatedJSON, completedCount, dpID)
	return completedCount, len(activities), err
}

// RecordActivitySession logs session telemetry, computes metrics, and updates XP/streaks
func (r *MobileRepository) RecordActivitySession(ctx context.Context, session *domain.ActivitySession, interactions []domain.RawInteraction) (*domain.DerivedMetrics, int, error) {
	// Base XP: 50 points + up to 50 duration bonus
	baseXP := 50
	durationBonus := int(math.Min(50, float64(session.DurationMs/2000)))
	totalXP := baseXP + durationBonus
	session.XPEarned = totalXP

	// 1. Insert session
	var sessionID string
	insertSession := `
		INSERT INTO activity_sessions (
			student_id, activity_type, activity_bucket, theme_used,
			started_at, ended_at, duration_ms, completed, xp_earned, mood_entry_id
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id
	`
	err := r.db.QueryRow(ctx, insertSession,
		session.StudentID, session.ActivityType, session.ActivityBucket, session.ThemeUsed,
		session.StartedAt, session.EndedAt, session.DurationMs, session.Completed, session.XPEarned, session.MoodEntryID,
	).Scan(&sessionID)
	if err != nil {
		return nil, 0, err
	}
	session.ID = sessionID

	// 2. Insert raw interactions batch
	if len(interactions) > 0 {
		for _, inter := range interactions {
			payloadJSON, _ := json.Marshal(inter.Payload)
			_, _ = r.db.Exec(ctx, `
				INSERT INTO raw_interactions (session_id, event_type, timestamp_ms, payload, sequence_index)
				VALUES ($1, $2, $3, $4, $5)
			`, sessionID, inter.EventType, inter.TimestampMs, payloadJSON, inter.SequenceIndex)
		}
	}

	// 3. Compute derived metrics
	interCount := float64(len(interactions))
	focusScore := math.Min(100, 65.0+interCount*1.5)
	stressScore := math.Max(15, 50.0-float64(session.DurationMs/5000))
	consistencyScore := 85.0
	confidenceScore := 78.0
	engagementScore := math.Min(100, 70.0+interCount*2.0)
	regulationScore := 82.0

	metrics := &domain.DerivedMetrics{
		FocusScore:       focusScore,
		StressScore:      stressScore,
		ConsistencyScore: consistencyScore,
		ConfidenceScore:  confidenceScore,
		EngagementScore:  engagementScore,
		RegulationScore:  regulationScore,
	}

	_, _ = r.db.Exec(ctx, `
		INSERT INTO derived_metrics (
			session_id, student_id, focus_score, stress_score,
			consistency_score, confidence_score, engagement_score, regulation_score
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`, sessionID, session.StudentID, focusScore, stressScore, consistencyScore, confidenceScore, engagementScore, regulationScore)

	// 4. Update student XP, level, and streak
	updateStudent := `
		UPDATE students
		SET current_xp = current_xp + $1,
		    streak_days = CASE
		        WHEN last_active_date IS NULL OR last_active_date < CURRENT_DATE - INTERVAL '1 day' THEN 1
		        WHEN last_active_date = CURRENT_DATE - INTERVAL '1 day' THEN streak_days + 1
		        ELSE streak_days
		    END,
		    longest_streak = GREATEST(longest_streak, CASE
		        WHEN last_active_date = CURRENT_DATE - INTERVAL '1 day' THEN streak_days + 1
		        ELSE streak_days
		    END),
		    level = 1 + ((current_xp + $1) / 1000),
		    last_active_date = CURRENT_DATE
		WHERE id = $2
	`
	_, _ = r.db.Exec(ctx, updateStudent, totalXP, session.StudentID)

	return metrics, totalXP, nil
}

// GetSessionHistory returns student session history
func (r *MobileRepository) GetSessionHistory(ctx context.Context, studentID string, days int, bucket string, limit int) ([]domain.ActivitySession, error) {
	if limit <= 0 {
		limit = 20
	}
	query := `
		SELECT id, student_id, activity_type, COALESCE(activity_bucket, ''),
		       started_at, duration_ms, completed, xp_earned, created_at
		FROM activity_sessions
		WHERE student_id = $1 AND started_at >= NOW() - ($2 || ' days')::interval
	`
	args := []any{studentID, days}
	if bucket != "" {
		query += " AND activity_bucket = $3"
		args = append(args, bucket)
	}
	query += " ORDER BY started_at DESC LIMIT " + fmt.Sprintf("%d", limit)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []domain.ActivitySession
	for rows.Next() {
		var s domain.ActivitySession
		if err := rows.Scan(&s.ID, &s.StudentID, &s.ActivityType, &s.ActivityBucket, &s.StartedAt, &s.DurationMs, &s.Completed, &s.XPEarned, &s.CreatedAt); err == nil {
			sessions = append(sessions, s)
		}
	}
	return sessions, nil
}

// RecordMood logs a student mood entry
func (r *MobileRepository) RecordMood(ctx context.Context, entry *domain.MoodEntry) error {
	query := `
		INSERT INTO mood_entries (student_id, mood_value, energy_level, context_tag, entry_type)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, recorded_at
	`
	return r.db.QueryRow(ctx, query,
		entry.StudentID, entry.MoodValue, entry.EnergyLevel, entry.ContextTag, entry.EntryType,
	).Scan(&entry.ID, &entry.CreatedAt)
}

// GetMoodHistory returns mood history
func (r *MobileRepository) GetMoodHistory(ctx context.Context, studentID string, days int, entryType string) ([]domain.MoodEntry, error) {
	query := `
		SELECT id, student_id, mood_value, COALESCE(energy_level, 'medium'),
		       COALESCE(context_tag, ''), entry_type, recorded_at
		FROM mood_entries
		WHERE student_id = $1 AND recorded_at >= NOW() - ($2 || ' days')::interval
	`
	args := []any{studentID, days}
	if entryType != "" {
		query += " AND entry_type = $3"
		args = append(args, entryType)
	}
	query += " ORDER BY recorded_at DESC"

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var entries []domain.MoodEntry
	for rows.Next() {
		var m domain.MoodEntry
		if err := rows.Scan(&m.ID, &m.StudentID, &m.MoodValue, &m.EnergyLevel, &m.ContextTag, &m.EntryType, &m.CreatedAt); err == nil {
			entries = append(entries, m)
		}
	}
	return entries, nil
}

// GetLatestMood returns the most recent mood entry
func (r *MobileRepository) GetLatestMood(ctx context.Context, studentID string) (*domain.MoodEntry, error) {
	query := `
		SELECT id, student_id, mood_value, COALESCE(energy_level, 'medium'),
		       COALESCE(context_tag, ''), entry_type, recorded_at
		FROM mood_entries
		WHERE student_id = $1
		ORDER BY recorded_at DESC
		LIMIT 1
	`
	var m domain.MoodEntry
	err := r.db.QueryRow(ctx, query, studentID).Scan(
		&m.ID, &m.StudentID, &m.MoodValue, &m.EnergyLevel, &m.ContextTag, &m.EntryType, &m.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &m, nil
}

// CreateJournalEntry saves a reflective micro-journal entry
func (r *MobileRepository) CreateJournalEntry(ctx context.Context, entry *domain.JournalEntry) error {
	query := `
		INSERT INTO journal_entries (student_id, title, content, mood_value, tags)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at
	`
	return r.db.QueryRow(ctx, query,
		entry.StudentID, entry.Title, entry.Content, entry.MoodValue, entry.Tags,
	).Scan(&entry.ID, &entry.CreatedAt)
}

// GetJournalHistory fetches journal entries
func (r *MobileRepository) GetJournalHistory(ctx context.Context, studentID string, limit, offset int) ([]domain.JournalEntry, int, error) {
	if limit <= 0 {
		limit = 20
	}
	var total int
	_ = r.db.QueryRow(ctx, "SELECT COUNT(*) FROM journal_entries WHERE student_id = $1", studentID).Scan(&total)

	query := `
		SELECT id, student_id, COALESCE(title, ''), content, mood_value, tags, created_at
		FROM journal_entries
		WHERE student_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.db.Query(ctx, query, studentID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var entries []domain.JournalEntry
	for rows.Next() {
		var j domain.JournalEntry
		if err := rows.Scan(&j.ID, &j.StudentID, &j.Title, &j.Content, &j.MoodValue, &j.Tags, &j.CreatedAt); err == nil {
			entries = append(entries, j)
		}
	}
	return entries, total, nil
}

// DeleteJournalEntry deletes a journal entry
func (r *MobileRepository) DeleteJournalEntry(ctx context.Context, studentID, id string) error {
	_, err := r.db.Exec(ctx, "DELETE FROM journal_entries WHERE id = $1 AND student_id = $2", id, studentID)
	return err
}

// Digital Garden
func (r *MobileRepository) GetGardenState(ctx context.Context, studentID string) (map[string]any, error) {
	query := `
		SELECT COALESCE(garden_level, 1), COALESCE(tree_stage, 'sprout'),
		       COALESCE(waterings_today, 0), last_watered_at
		FROM students
		WHERE id = $1
	`
	var level int
	var stage string
	var waterings int
	var lastWatered *time.Time

	err := r.db.QueryRow(ctx, query, studentID).Scan(&level, &stage, &waterings, &lastWatered)
	if err != nil {
		return nil, err
	}

	lastWateredStr := ""
	if lastWatered != nil {
		lastWateredStr = lastWatered.Format(time.RFC3339)
	}

	return map[string]any{
		"studentId":      studentID,
		"gardenLevel":    level,
		"treeStage":      stage,
		"wateringsToday": waterings,
		"lastWatered":    lastWateredStr,
	}, nil
}

func (r *MobileRepository) WaterGarden(ctx context.Context, studentID string) (map[string]any, error) {
	update := `
		UPDATE students
		SET waterings_today = waterings_today + 1,
		    last_watered_at = NOW(),
		    garden_level = CASE WHEN waterings_today + 1 >= 5 THEN garden_level + 1 ELSE garden_level END,
		    tree_stage = CASE
		        WHEN garden_level >= 5 THEN 'tree'
		        WHEN garden_level >= 3 THEN 'sapling'
		        WHEN garden_level >= 2 THEN 'sprout'
		        ELSE 'seed'
		    END
		WHERE id = $1
		RETURNING garden_level, tree_stage
	`
	var level int
	var stage string
	err := r.db.QueryRow(ctx, update, studentID).Scan(&level, &stage)
	if err != nil {
		return nil, err
	}

	return map[string]any{
		"success":     true,
		"message":     "Garden watered successfully",
		"gardenLevel": level,
		"treeStage":   stage,
	}, nil
}

// Parent link child by Access ID
func (r *MobileRepository) LinkParentChild(ctx context.Context, parentID string, accessID string) (string, error) {
	var studentID string
	err := r.db.QueryRow(ctx, "SELECT id FROM students WHERE UPPER(access_id) = UPPER($1)", accessID).Scan(&studentID)
	if err != nil {
		return "", fmt.Errorf("student with access ID %s not found", accessID)
	}

	_, err = r.db.Exec(ctx, `
		INSERT INTO parent_students (parent_id, student_id, relationship)
		VALUES ($1, $2, 'parent')
		ON CONFLICT (parent_id, student_id) DO NOTHING
	`, parentID, studentID)
	if err != nil {
		return "", err
	}

	return studentID, nil
}

// GetParentChildren returns list of linked children with their qualitative skillset
func (r *MobileRepository) GetParentChildren(ctx context.Context, parentID string) ([]map[string]any, error) {
	query := `
		SELECT s.id, s.name, sc.name, s.grade, s.section,
		       COALESCE(sr.pathway_track_name, 'Focus & Resilience Foundation'),
		       COALESCE(sr.primary_bucket, 'ATTN_STABILITY'),
		       COALESCE(sr.secondary_bucket, 'LOAD_REGULATION')
		FROM parent_students ps
		JOIN students s ON ps.student_id = s.id
		LEFT JOIN schools sc ON s.school_id = sc.id
		LEFT JOIN LATERAL (
			SELECT pathway_track_name, primary_bucket, secondary_bucket
			FROM student_results
			WHERE student_id = s.id
			ORDER BY completed_at DESC
			LIMIT 1
		) sr ON true
		WHERE ps.parent_id = $1
	`
	rows, err := r.db.Query(ctx, query, parentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var children []map[string]any
	for rows.Next() {
		var id, name, grade, section, trackName, prim, sec string
		var school *string
		if err := rows.Scan(&id, &name, &school, &grade, &section, &trackName, &prim, &sec); err == nil {
			schoolName := "JaagrMind Campus"
			if school != nil {
				schoolName = *school
			}
			children = append(children, map[string]any{
				"id":          id,
				"displayName": name,
				"school":      schoolName,
				"class":       grade + " - " + section,
				"skillsetSummary": map[string]any{
					"trackName":       trackName,
					"primaryFocus":    prim,
					"secondaryFocus":  sec,
					"optionalMessage": fmt.Sprintf("Invite %s to try a 2-minute %s activity today.", name, trackName),
				},
			})
		}
	}
	return children, nil
}
