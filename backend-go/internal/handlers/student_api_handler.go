package handlers

import (
	"encoding/json"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jaagrmind/platform-api/internal/core/domain"
	"github.com/jaagrmind/platform-api/internal/middleware"
	"github.com/jaagrmind/platform-api/internal/services"
	"github.com/jaagrmind/platform-api/internal/services/assessment_engine"
	"github.com/jaagrmind/platform-api/internal/utils"
)

type StudentAPIHandler struct {
	schoolRepo       domain.SchoolRepository
	studentRepo      domain.StudentRepository
	assessRepo       domain.AssessmentRepository
	checkinLinkRepo  domain.CheckinLinkRepository
	authSvc          domain.AuthService
	emailSvc         utils.EmailService
	dbPool           *pgxpool.Pool
	conclusionEngine *assessment_engine.ConclusionEngine
}

func SetupStudentAPIRoutes(app *fiber.App, schoolRepo domain.SchoolRepository, studentRepo domain.StudentRepository, assessRepo domain.AssessmentRepository, checkinLinkRepo domain.CheckinLinkRepository, authSvc domain.AuthService, emailSvc utils.EmailService, dbPool *pgxpool.Pool, jwtSecret string) {
	handler := &StudentAPIHandler{
		schoolRepo:       schoolRepo,
		studentRepo:      studentRepo,
		assessRepo:       assessRepo,
		checkinLinkRepo:  checkinLinkRepo,
		authSvc:          authSvc,
		emailSvc:         emailSvc,
		dbPool:           dbPool,
		conclusionEngine: assessment_engine.NewConclusionEngine(nil, nil),
	}

	// Public routes for student login, direct check-in & public preview
	app.Get("/api/student/school-info", handler.GetSchoolInfo)
	app.Post("/api/auth/student/login", middleware.AuthLoginRateLimiter(), handler.StudentLogin)
	app.Get("/api/preview/assessment/:id", handler.GetPreviewAssessment)
	app.Get("/api/public/checkin-links/:code", handler.GetPublicCheckinLink)
	app.Get("/api/public/activities", handler.GetPublicActivities)
	app.Post("/api/public/assessment/direct-submit", middleware.AssessmentSubmissionRateLimiter(), handler.DirectSubmitAssessment)

	// Protected routes (require student role)
	studentAPI := app.Group("/api/student", middleware.RoleGuard(jwtSecret, "student"))
	studentAPI.Get("/assessment", handler.GetAssessment)
	studentAPI.Get("/tests", handler.GetAssessment)
	studentAPI.Post("/assessment/submit", handler.SubmitAssessment)
	studentAPI.Post("/submit", handler.SubmitAssessment)
	studentAPI.Get("/dashboard", handler.GetStudentDashboard)
	studentAPI.Get("/activities", handler.GetPublicActivities)
}

func (h *StudentAPIHandler) GetSchoolInfo(c fiber.Ctx) error {
	code := c.Query("schoolId")
	if code == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "School ID is required"})
	}

	school, err := h.schoolRepo.GetByCode(c.Context(), strings.ToUpper(code))
	if err != nil {
		// Fallback to GetByID in case UUID was provided
		school, err = h.schoolRepo.GetByID(c.Context(), code)
		if err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "Invalid school link or code"})
		}
	}

	if school.IsBlocked {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"message": "This school has been blocked."})
	}

	return c.JSON(fiber.Map{
		"id":          school.ID,
		"school_code": school.SchoolCode,
		"name":        school.Name,
		"logo":        school.Logo,
	})
}

func (h *StudentAPIHandler) StudentLogin(c fiber.Ctx) error {
	var req domain.StudentLoginRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Invalid request"})
	}

	classGrade := strings.TrimSpace(req.Class)
	if classGrade == "" {
		classGrade = strings.TrimSpace(req.Grade)
	}
	rollNo := strings.TrimSpace(req.RollNumber)
	accessID := strings.TrimSpace(req.AccessID)
	schoolInput := strings.TrimSpace(req.SchoolID)

	var student *domain.Student
	var school *domain.School
	var err error

	// 1. Direct / Family Code Resolution:
	candidateDirectCode := accessID
	if candidateDirectCode == "" || strings.HasPrefix(strings.ToUpper(schoolInput), "IND-") || strings.HasPrefix(strings.ToUpper(schoolInput), "FAM-") {
		candidateDirectCode = schoolInput
	}

	if candidateDirectCode != "" && (strings.HasPrefix(strings.ToUpper(candidateDirectCode), "IND-") || strings.HasPrefix(strings.ToUpper(candidateDirectCode), "FAM-") || strings.ToUpper(schoolInput) == "HOME" || schoolInput == "") {
		student, _ = h.studentRepo.GetByDirectCode(c.Context(), candidateDirectCode)
	}

	// 2. Standard Institutional School Login:
	if student == nil {
		if schoolInput == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "School Code or Student Passcode is required"})
		}
		if accessID == "" && (rollNo == "" || classGrade == "") {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Access ID or Class and Roll Number is required"})
		}

		school, err = h.schoolRepo.GetByCode(c.Context(), strings.ToUpper(schoolInput))
		if err != nil {
			school, err = h.schoolRepo.GetByID(c.Context(), schoolInput)
			if err != nil {
				// Also check if schoolInput itself was an access code
				student, _ = h.studentRepo.GetByDirectCode(c.Context(), schoolInput)
				if student == nil {
					return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "Invalid School Code or Access Passcode."})
				}
			}
		}
		if school != nil && school.IsBlocked {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"message": "This school has been blocked."})
		}

		if student == nil && school != nil {
			if accessID != "" {
				student, err = h.studentRepo.GetByAccessID(c.Context(), school.ID, accessID)
			}
			if (student == nil || err != nil) && (rollNo != "" || accessID != "") && classGrade != "" {
				targetRoll := rollNo
				if targetRoll == "" {
					targetRoll = accessID
				}
				student, err = h.studentRepo.GetByClassAndRoll(c.Context(), school.ID, classGrade, req.Section, targetRoll, req.Stream)
			}
		}
	}

	if err != nil || student == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "Invalid credentials. Please verify your School Code and Access ID."})
	}
	if !student.IsActive {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"message": "Account inactive"})
	}

	// Fetch school details if student is associated with an institutional school
	if school == nil && student.SchoolID != "" {
		school, _ = h.schoolRepo.GetByID(c.Context(), student.SchoolID)
	}

	// Update contact info if provided and not already recorded
	if (req.MobileNumber != "" && student.MobileNumber == "") || (req.Email != "" && student.Email == "") {
		newMobile := student.MobileNumber
		if newMobile == "" {
			newMobile = req.MobileNumber
		}
		newEmail := student.Email
		if newEmail == "" {
			newEmail = req.Email
		}
		_ = h.studentRepo.UpdateContact(c.Context(), student.ID, newMobile, newEmail)
	}

	// Generate JWT
	token, err := h.authSvc.GenerateToken(domain.TokenPayload{
		UserID: student.ID,
		Roles:  []string{"student"},
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": "Failed to generate token"})
	}

	res := domain.StudentLoginResponse{
		ID:         student.ID,
		AccessID:   student.AccessID,
		RollNumber: student.RollNumber,
		Stream:     student.Stream,
		Name:       student.Name,
		Class:      student.Grade,
		Section:    student.Section,
		Role:       "student",
		Token:      token,
	}
	if school != nil {
		res.School.Name = school.Name
		res.School.Logo = school.Logo
		res.School.SchoolID = school.SchoolCode
	} else {
		res.School.Name = "Independent / Family Study"
		res.School.SchoolID = "HOME"
	}

	return c.JSON(res)
}

func (h *StudentAPIHandler) GetAssessment(c fiber.Ctx) error {
	studentID := middleware.ExtractUserID(c)
	assessmentID := c.Query("assessmentId")

	var student *domain.Student
	if studentID != "" {
		s, err := h.studentRepo.GetByID(c.Context(), studentID)
		if err == nil && s != nil {
			student = s
		}
	}

	var target *domain.Assessment
	if assessmentID != "" {
		a, err := h.assessRepo.GetByID(c.Context(), assessmentID)
		if err == nil && a != nil && a.IsActive {
			// If student belongs to a school campus, ensure assessment is published to schools and authorized
			if student != nil && student.SchoolID != "" {
				if a.PublishToSchools {
					if a.AutoAssignSchools {
						target = a
					} else {
						assigned, _ := h.assessRepo.GetAssignedTests(c.Context(), student.SchoolID)
						for _, as := range assigned {
							if as.ID == a.ID {
								target = a
								break
							}
						}
					}
				}
			} else {
				target = a
			}
		}
	}

	// If no explicit ID requested, resolve from student's school-authorized assessments
	if target == nil && student != nil && student.SchoolID != "" {
		assigned, _ := h.assessRepo.GetAssignedTests(c.Context(), student.SchoolID)
		// Grade-match within authorized assessments
		if student.Grade != "" {
			for _, a := range assigned {
				for _, tg := range a.TargetGrades {
					if strings.EqualFold(strings.TrimSpace(tg), strings.TrimSpace(student.Grade)) {
						target = &a
						break
					}
				}
				if target != nil {
					break
				}
			}
		}
		// If no grade match but school has authorized tests, use the first one
		if target == nil && len(assigned) > 0 {
			target = &assigned[0]
		}
	}

	// Last resort: the platform default assessment
	if target == nil {
		def, err := h.assessRepo.GetDefault(c.Context())
		if err == nil && def != nil && def.IsActive {
			if student != nil && student.SchoolID != "" {
				if def.PublishToSchools {
					target = def
				}
			} else {
				target = def
			}
		}
	}

	if target == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "No active assessments found"})
	}

	isCompleted := false
	if studentID != "" {
		results, _ := h.assessRepo.GetResultsByStudent(c.Context(), studentID, target.ID)
		for _, r := range results {
			if r.Status != "archived" {
				isCompleted = true
				break
			}
		}
	}

	res := fiber.Map{
		"id":                  target.ID,
		"_id":                 target.ID,
		"assessmentId":        target.ID,
		"title":               target.Title,
		"description":         target.Description,
		"tier":                target.Tier,
		"minGrade":            target.MinGrade,
		"maxGrade":            target.MaxGrade,
		"targetGrades":        target.TargetGrades,
		"isCompleted":         isCompleted,
		"questions":           target.Questions,
		"buckets":             target.Buckets,
		"customSections":      target.CustomSections,
		"sections":            target.Sections,
		"inactivityAlertTime": target.InactivityAlertTime,
		"inactivityEndTime":   target.InactivityEndTime,
		"timePerQuestion":     target.TimePerQuestion,
		"totalTime":           target.TotalTime,
	}

	return c.JSON([]interface{}{res})
}

func (h *StudentAPIHandler) GetPreviewAssessment(c fiber.Ctx) error {
	id := c.Params("id")
	var target *domain.Assessment
	if id != "" && id != "default" {
		a, err := h.assessRepo.GetByID(c.Context(), id)
		if err == nil {
			target = a
		}
	}
	if target == nil {
		def, err := h.assessRepo.GetDefault(c.Context())
		if err == nil {
			target = def
		}
	}
	if target == nil {
		actives, err := h.assessRepo.GetActiveAssessments(c.Context())
		if err == nil && len(actives) > 0 {
			target = &actives[0]
		}
	}
	if target == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "Assessment not found"})
	}

	return c.JSON(fiber.Map{
		"id":                  target.ID,
		"_id":                 target.ID,
		"assessmentId":        target.ID,
		"title":               target.Title,
		"description":         target.Description,
		"questions":           target.Questions,
		"buckets":             target.Buckets,
		"customSections":      target.CustomSections,
		"sections":            target.Sections,
		"inactivityAlertTime": target.InactivityAlertTime,
		"inactivityEndTime":   target.InactivityEndTime,
		"timePerQuestion":     target.TimePerQuestion,
		"totalTime":           target.TotalTime,
	})
}

func (h *StudentAPIHandler) GetPublicCheckinLink(c fiber.Ctx) error {
	code := strings.TrimSpace(c.Params("code"))
	if code == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"valid": false, "message": "Check-in code is required"})
	}

	if h.checkinLinkRepo == nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"valid": false, "message": "Check-in link service unavailable"})
	}

	link, err := h.checkinLinkRepo.GetByCode(c.Context(), code)
	if err != nil || link == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"valid":   false,
			"reason":  "not_found",
			"message": "This check-in link does not exist or may have been removed.",
		})
	}

	// Check Expiry
	if link.ExpiresAt != nil && time.Now().After(*link.ExpiresAt) {
		return c.Status(fiber.StatusGone).JSON(fiber.Map{
			"valid":   false,
			"reason":  "expired",
			"message": "This check-in link has expired. Please contact your administrator for a new link.",
			"code":    link.Code,
		})
	}

	// Check Max Uses & Status
	if link.Status == "completed" || link.Status == "revoked" || (link.MaxUses > 0 && link.UseCount >= link.MaxUses) {
		return c.Status(fiber.StatusGone).JSON(fiber.Map{
			"valid":       false,
			"reason":      "completed",
			"message":     "This check-in link has already been used and completed.",
			"code":        link.Code,
			"completedAt": link.LastUsedAt,
		})
	}

	// Fetch assessment questions
	var target *domain.Assessment
	if link.AssessmentID != nil && *link.AssessmentID != "" {
		a, err := h.assessRepo.GetByID(c.Context(), *link.AssessmentID)
		if err == nil {
			target = a
		}
	}
	if target == nil {
		def, err := h.assessRepo.GetDefault(c.Context())
		if err == nil {
			target = def
		}
	}
	if target == nil {
		actives, err := h.assessRepo.GetActiveAssessments(c.Context())
		if err == nil && len(actives) > 0 {
			target = &actives[0]
		}
	}
	if target == nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"valid":   false,
			"message": "No active check-in questions found.",
		})
	}

	return c.JSON(fiber.Map{
		"valid":               true,
		"code":                link.Code,
		"label":               link.Label,
		"candidateName":       link.CandidateName,
		"candidateEmail":      link.CandidateEmail,
		"assessmentId":        target.ID,
		"title":               target.Title,
		"description":         target.Description,
		"questions":           target.Questions,
		"buckets":             target.Buckets,
		"customSections":      target.CustomSections,
		"sections":            target.Sections,
		"inactivityAlertTime": target.InactivityAlertTime,
		"inactivityEndTime":   target.InactivityEndTime,
		"timePerQuestion":     target.TimePerQuestion,
		"totalTime":           target.TotalTime,
		"maxUses":             link.MaxUses,
		"useCount":            link.UseCount,
	})
}

func getBucketLabel(score int) string {
	if score >= 8 && score <= 14 {
		return "Skill Stable"
	} else if score >= 15 && score <= 22 {
		return "Skill Emerging"
	} else if score >= 23 && score <= 32 {
		return "Skill Support Needed"
	}
	return "Skill Stable"
}

func getSectionName(code string) string {
	switch code {
	case "A":
		return "Focus & Attention"
	case "B":
		return "Self-Esteem & Inner Confidence"
	case "C":
		return "Social Confidence & Interaction"
	case "D":
		return "Digital Hygiene & Self-Control"
	default:
		return code
	}
}

func (h *StudentAPIHandler) SubmitAssessment(c fiber.Ctx) error {
	studentID := middleware.ExtractUserID(c)
	if studentID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"message": "Unauthorized"})
	}

	var req domain.AssessmentSubmitRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Invalid payload"})
	}

	if req.AssessmentID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Assessment ID is required"})
	}

	// Get student to find school_id
	student, err := h.studentRepo.GetByID(c.Context(), studentID)
	schoolID := ""
	if err == nil && student != nil {
		schoolID = student.SchoolID
	}

	// Rapid double-click debounce: prevent accidental duplicate submission within 15 seconds
	existingResults, _ := h.assessRepo.GetResultsByStudent(c.Context(), studentID, req.AssessmentID)
	if len(existingResults) > 0 {
		latest := existingResults[0] // GetResultsByStudent is ORDER BY completed_at DESC
		if !latest.CompletedAt.IsZero() && time.Since(latest.CompletedAt) < 15*time.Second {
			return c.JSON(fiber.Map{
				"success": true,
				"message": "Assessment submitted successfully",
			})
		}
	}

	// Fetch assessment to compute scores
	assessment, err := h.assessRepo.GetByID(c.Context(), req.AssessmentID)
	totalScore := 0
	sectionScores := map[string]int{"A": 0, "B": 0, "C": 0, "D": 0}

	if err == nil && assessment != nil {
		qData, _ := json.Marshal(assessment.Questions)
		var questions []struct {
			Section string `json:"section"`
			Options []struct {
				Marks int `json:"marks"`
			} `json:"options"`
		}
		_ = json.Unmarshal(qData, &questions)

		ansData, _ := json.Marshal(req.Answers)
		var answers []struct {
			SelectedOption *int `json:"selectedOption"`
			Value          *int `json:"value"`
			QuestionIndex  *int `json:"questionIndex"`
		}
		_ = json.Unmarshal(ansData, &answers)

		for idx, ans := range answers {
			qIdx := idx
			if ans.QuestionIndex != nil {
				qIdx = *ans.QuestionIndex
			}
			if qIdx >= 0 && qIdx < len(questions) {
				sec := questions[qIdx].Section
				if sec == "" {
					sec = "A"
				}
				marks := 0
				if ans.SelectedOption != nil && *ans.SelectedOption >= 0 && *ans.SelectedOption < len(questions[qIdx].Options) {
					marks = questions[qIdx].Options[*ans.SelectedOption].Marks
				} else if ans.Value != nil {
					marks = *ans.Value
				}
				totalScore += marks
				sectionScores[sec] += marks
			}
		}
	}

	sectionBuckets := map[string]string{
		"A": getBucketLabel(sectionScores["A"]),
		"B": getBucketLabel(sectionScores["B"]),
		"C": getBucketLabel(sectionScores["C"]),
		"D": getBucketLabel(sectionScores["D"]),
	}

	// Psychologist 4-Bucket Model & 16-Track Evaluation
	bucketScores := map[domain.BucketType]int{
		domain.BucketAttnStability:  sectionScores["A"],
		domain.BucketSelfSafety:     sectionScores["B"],
		domain.BucketSocialComfort:  sectionScores["C"],
		domain.BucketLoadRegulation: sectionScores["D"],
	}
	track, sortedBuckets := services.EvaluatePathwayBuckets(bucketScores)
	primarySkillArea := track.TrackName
	assignedBucket := getBucketLabel(int(math.Round(float64(totalScore) / 4.0)))

	moodVal := req.Mood
	if moodVal == nil {
		moodVal = req.MoodCheck
	}

	// ── Auto-Score with Assessment Engine ─────────────────────
	var pastHistory []assessment_engine.HistoryPoint
	for _, past := range existingResults {
		if past.Status == "complete" {
			hp := assessment_engine.HistoryPoint{
				CompletedAt:   past.CompletedAt,
				DomainMeans:   make(map[assessment_engine.DomainKey]float64),
				Patterns:      make(map[assessment_engine.DomainKey]assessment_engine.PatternLabel),
				PrimaryBucket: past.PrimaryBucket,
			}
			pastHistory = append(pastHistory, hp)
		}
	}

	conclusion := h.conclusionEngine.Evaluate(assessment.Questions, req.Answers, pastHistory)

	// Behavioral Diagnostics Synthesis (Qualitative Actionable Psychology)
	scoreA := sectionScores["A"]
	scoreB := sectionScores["B"]
	scoreC := sectionScores["C"]
	scoreD := sectionScores["D"]

	var launchFriction string
	if scoreA <= 12 {
		launchFriction = "Fluid Initiation: Moves into focused work without significant activation resistance or initiation anxiety."
	} else if scoreA <= 18 {
		launchFriction = "Moderate Activation Latency: Experiences 10-15 min initiation inertia; once engaged, sustains steady cognitive flow."
	} else {
		launchFriction = "Elevated Initiation Barrier: High cognitive activation threshold leading to task postponement; benefits from micro-step framing."
	}

	var classroomVoice string
	if scoreB <= 12 && scoreC <= 14 {
		classroomVoice = "Active Inquirer: Unhesitatingly signals confusion or seeks conceptual clarification in public learning spaces."
	} else if scoreB <= 18 {
		classroomVoice = "Selective Clarification: Comfortable asking peers or checking after class; refrains from raising hand in large groups."
	} else {
		classroomVoice = "Evaluative Silence: Suppresses queries when confused due to acute peer judgment anxiety; requires low-stakes anonymous channels."
	}

	var peerBoundaryStrain string
	if scoreC <= 12 {
		peerBoundaryStrain = "Differentiated & Grounded: Maintains strong interpersonal empathy without absorbing peer conflicts or gossip friction."
	} else if scoreC <= 18 {
		peerBoundaryStrain = "Moderate Boundary Strain: Occasionally feels pressured in social cross-currents; manages through peer diplomacy."
	} else {
		peerBoundaryStrain = "Acute Mediation Fatigue: High emotional toll from confidential peer drama or social friction; needs boundary reinforcement."
	}

	var screenDrag string
	if scoreD <= 12 {
		screenDrag = "Restorative Circadian Balance: Consistent digital shutdown enabling full cognitive recovery for morning classroom arrival."
	} else if scoreD <= 18 {
		screenDrag = "Mild Evening Screen Drag: Late-evening device engagement occasionally causes morning attentional lag in period 1."
	} else {
		screenDrag = "Severe Sleep Debt Drag: Post-10:30 PM digital consumption actively suppressing REM cycles; produces 9:00 AM executive slump."
	}

	var archetype string
	var archetypeTitle string
	var counselorStrategy string

	if scoreA > 16 && scoreD > 16 {
		archetype = "sprinter"
		archetypeTitle = "The High-Stakes Sprinter"
		counselorStrategy = "High ambition coupled with sleep disruption. Implement a non-negotiable 10:00 PM digital sunset and enforce 25-minute Pomodoro study pacing."
	} else if scoreC > 16 && scoreA <= 16 {
		archetype = "loyalist"
		archetypeTitle = "The Overburdened Loyalist"
		counselorStrategy = "High interpersonal empathy prone to social drama fatigue. Guide them on internal locus of control and stepping back from peer mediation."
	} else if scoreB > 16 && scoreA <= 16 {
		archetype = "observer"
		archetypeTitle = "The Quiet Observer"
		counselorStrategy = "Deep internal reflection accompanied by classroom voice hesitancy. Utilize small pair-share breakouts and digital question boxes before whole-class calls."
	} else {
		archetype = "pacer"
		archetypeTitle = "The Deep Pacer"
		counselorStrategy = "Steady cognitive cadence with balanced emotional regulation. Provide open-ended inquiry challenges and peer mentoring leadership roles."
	}

	radarVectors := map[string]int{
		"emotionalAwareness": 100 - (scoreB * 100 / 32),
		"selfRegulation":     100 - (scoreB * 90 / 32),
		"focusCognitive":     100 - (scoreA * 100 / 32),
		"stressAdaptability": 100 - (scoreB * 95 / 32),
		"academicTenacity":   100 - (scoreA * 85 / 32),
		"peerEngagement":     100 - (scoreC * 100 / 32),
	}

	behavioralDiagnostics := map[string]interface{}{
		"archetype":             archetype,
		"archetypeTitle":        archetypeTitle,
		"counselorStrategy":     counselorStrategy,
		"launchFriction":        launchFriction,
		"classroomVoice":        classroomVoice,
		"peerBoundaryStrain":    peerBoundaryStrain,
		"screenDrag":            screenDrag,
		"radarVectors":          radarVectors,
		"asymmetryInsight":      "High Academic Tenacity balanced with moderate Stress Adaptability demonstrates high internal grit, with recommended focus on proactive stress venting.",
		"reflection":            conclusion.Reflection,
		"selectedSkill":         conclusion.PrimarySkill,
		"domainMeans":           conclusion.Scoring.DomainMeans,
		"recommendedActivity":   conclusion.RecommendedActivity,
		"evidenceStatus":        conclusion.Scoring.EvidenceStatus,
		"trajectories":          conclusion.Interpretation.DomainTrajectories,
		"historySummary":        conclusion.Interpretation.HistorySummary,
	}

	err = h.assessRepo.SubmitResult(c.Context(), domain.StudentResult{
		StudentID:             studentID,
		SchoolID:              schoolID,
		AssessmentID:          req.AssessmentID,
		Status:                "complete",
		TotalScore:            totalScore,
		SectionScores:         sectionScores,
		SectionBuckets:        sectionBuckets,
		PrimarySkillArea:      primarySkillArea,
		SecondarySkillArea:    string(sortedBuckets[1].Bucket),
		AssignedBucket:        assignedBucket,
		Answers:               req.Answers,
		Mood:                  moodVal,
		TimeTaken:             req.TimeTaken,
		BehavioralDiagnostics: behavioralDiagnostics,
		PathwayTrackID:        track.TrackID,
		PathwayTrackName:      track.TrackName,
		PrimaryBucket:         string(sortedBuckets[0].Bucket),
		SecondaryBucket:       string(sortedBuckets[1].Bucket),
		IsBalanceMode:         track.IsBalanceMode,
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": "Failed to save result: " + err.Error()})
	}

	return c.JSON(fiber.Map{
		"success":              true,
		"message":              "Assessment submitted successfully",
		"reflection":           conclusion.Reflection,
		"recommended_activity": conclusion.RecommendedActivity,
		"primary_skill":        conclusion.PrimarySkill,
	})
}

// ── Direct Public Check-in (Email-Only & Automatic Resend Email Report) ─────
type DirectSubmitRequest struct {
	Email        string      `json:"email"`
	Name         string      `json:"name"`
	AssessmentID string      `json:"assessmentId"`
	LinkCode     string      `json:"linkCode"`
	Answers      interface{} `json:"answers"`
	TimeTaken    int         `json:"timeTaken"`
}

func (h *StudentAPIHandler) DirectSubmitAssessment(c fiber.Ctx) error {
	var req DirectSubmitRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Invalid request payload"})
	}

	cleanEmail := strings.ToLower(strings.TrimSpace(req.Email))
	if cleanEmail == "" || !strings.Contains(cleanEmail, "@") {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "A valid email address is required"})
	}

	cleanName := strings.TrimSpace(req.Name)
	if cleanName == "" {
		cleanName = "Friend"
	}

	cleanLinkCode := strings.TrimSpace(req.LinkCode)
	targetAssessmentID := req.AssessmentID

	if cleanLinkCode != "" && h.checkinLinkRepo != nil {
		if link, err := h.checkinLinkRepo.GetByCode(c.Context(), cleanLinkCode); err == nil && link != nil {
			if targetAssessmentID == "" && link.AssessmentID != nil && *link.AssessmentID != "" {
				targetAssessmentID = *link.AssessmentID
			}
		}
		_ = h.checkinLinkRepo.RecordUsage(c.Context(), cleanLinkCode)
	}

	// Fetch assessment questions
	var questionsRaw interface{}
	if targetAssessmentID != "" {
		if a, err := h.assessRepo.GetByID(c.Context(), targetAssessmentID); err == nil && a != nil {
			questionsRaw = a.Questions
		}
	}
	if questionsRaw == nil {
		if def, err := h.assessRepo.GetDefault(c.Context()); err == nil && def != nil {
			targetAssessmentID = def.ID
			questionsRaw = def.Questions
		}
	}

	// 1. Run Assessment Engines
	conclusion := h.conclusionEngine.Evaluate(questionsRaw, req.Answers, nil)

	// 2. Dispatch Email Report via Resend ONLY for Direct Check-ins
	if h.emailSvc != nil {
		go func() {
			_ = h.emailSvc.SendDirectAssessmentReportEmail(
				cleanEmail,
				cleanName,
				conclusion.PrimarySkill,
				conclusion.Reflection.Pattern,
				conclusion.Reflection.Context,
				conclusion.RecommendedActivity.Title,
				conclusion.RecommendedActivity.Instruction,
				conclusion.RecommendedActivity.Description,
			)
		}()
	}

	// 3. Persist direct result in database (saving lead email for Jaagr Mind)
	if h.dbPool != nil {
		var guestStudentID string
		err := h.dbPool.QueryRow(c.Context(), `
			SELECT id FROM students WHERE LOWER(email) = $1 LIMIT 1
		`, cleanEmail).Scan(&guestStudentID)

		if err != nil || guestStudentID == "" {
			guestStudentID = uuid.New().String()
			accessCode := fmt.Sprintf("DIR-%s", strings.ToUpper(uuid.New().String()[:6]))
			_, _ = h.dbPool.Exec(c.Context(), `
				INSERT INTO students (id, name, email, access_id, grade, section, academic_year, is_active)
				VALUES ($1::uuid, $2, $3, $4, 'Direct', 'A', '2026-2027', true)
			`, guestStudentID, cleanName, cleanEmail, accessCode)
		}

		secScoresJSON, _ := json.Marshal(conclusion.Scoring.LegacySectionScores)
		secBucketsJSON, _ := json.Marshal(conclusion.Scoring.Domains)
		answersJSON, _ := json.Marshal(req.Answers)
		diagJSON, _ := json.Marshal(map[string]interface{}{
			"reflection":          conclusion.Reflection,
			"recommendedActivity": conclusion.RecommendedActivity,
			"domainMeans":         conclusion.Scoring.DomainMeans,
			"email":               cleanEmail,
			"name":                cleanName,
			"directAccess":        true,
			"linkCode":            cleanLinkCode,
		})

		_, _ = h.dbPool.Exec(c.Context(), `
			INSERT INTO student_results (
				student_id, assessment_id, status, total_score, section_scores, section_buckets,
				primary_skill_area, secondary_skill_area, assigned_bucket, answers, time_taken,
				behavioral_diagnostics, origin, pathway_track_id, pathway_track_name,
				primary_bucket, secondary_bucket, is_balance_mode, completed_at, checkin_link_code
			) VALUES (
				$1::uuid, $2::uuid, 'complete', $3, $4, $5,
				$6, $7, $8, $9, $10,
				$11, 'direct', $12, $13,
				$14, $15, $16, NOW(), $17
			)
		`, guestStudentID, targetAssessmentID, conclusion.Scoring.LegacyTotalScore, secScoresJSON, secBucketsJSON,
			conclusion.PrimarySkill, string(conclusion.SecondaryBucket), conclusion.PrimarySkill, answersJSON, req.TimeTaken,
			diagJSON, conclusion.PathwayTrack.TrackID, conclusion.PathwayTrack.TrackName,
			string(conclusion.PrimaryBucket), string(conclusion.SecondaryBucket), conclusion.PathwayTrack.IsBalanceMode,
			cleanLinkCode)
	}

	return c.JSON(fiber.Map{
		"success":              true,
		"message":              "Your reflection has been recorded and an email report has been sent to " + cleanEmail,
		"reflection":           conclusion.Reflection,
		"recommended_activity": conclusion.RecommendedActivity,
		"domains":              conclusion.Scoring.Domains,
		"email":                cleanEmail,
	})
}

// ── Public Activities Catalog Endpoint ──────────────────────────────────────
func (h *StudentAPIHandler) GetPublicActivities(c fiber.Ctx) error {
	if h.dbPool == nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Database not initialized"})
	}

	rows, err := h.dbPool.Query(c.Context(), `
		SELECT name, title, bucket, instruction, description, duration_minutes
		FROM activity_catalog
		WHERE is_active = true
		ORDER BY bucket ASC, name ASC
	`)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	type ActivityItem struct {
		ID              string `json:"id"`
		Name            string `json:"name"`
		Title           string `json:"title"`
		Bucket          string `json:"bucket"`
		Instruction     string `json:"instruction"`
		Description     string `json:"description"`
		DurationMinutes int    `json:"duration_minutes"`
	}

	var activities []ActivityItem
	for rows.Next() {
		var a ActivityItem
		if err := rows.Scan(&a.Name, &a.Title, &a.Bucket, &a.Instruction, &a.Description, &a.DurationMinutes); err == nil {
			a.ID = a.Name
			activities = append(activities, a)
		}
	}
	if activities == nil {
		activities = []ActivityItem{}
	}

	return c.JSON(fiber.Map{
		"activities": activities,
	})
}

// ── Student Dashboard Endpoint ──────────────────────────────────────────────
func (h *StudentAPIHandler) GetStudentDashboard(c fiber.Ctx) error {
	studentID := middleware.ExtractUserID(c)
	if studentID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"message": "Unauthorized"})
	}

	student, err := h.studentRepo.GetByID(c.Context(), studentID)
	if err != nil || student == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "Student not found"})
	}

	results, _ := h.assessRepo.GetResultsByStudent(c.Context(), studentID, "")
	var latestResult *domain.StudentResult
	if len(results) > 0 {
		latestResult = &results[0]
	}

	var activities []map[string]interface{}
	if h.dbPool != nil {
		rows, _ := h.dbPool.Query(c.Context(), `
			SELECT name, title, bucket, instruction, description, duration_minutes
			FROM activity_catalog
			WHERE is_active = true
			ORDER BY bucket ASC, name ASC
		`)
		if rows != nil {
			defer rows.Close()
			for rows.Next() {
				var name, title, bucket, instruction, description string
				var duration int
				if err := rows.Scan(&name, &title, &bucket, &instruction, &description, &duration); err == nil {
					activities = append(activities, map[string]interface{}{
						"id":               name,
						"name":             name,
						"title":            title,
						"bucket":           bucket,
						"instruction":      instruction,
						"description":      description,
						"duration_minutes": duration,
					})
				}
			}
		}
	}
	if activities == nil {
		activities = []map[string]interface{}{}
	}

	return c.JSON(fiber.Map{
		"student":       student,
		"has_completed": latestResult != nil,
		"latest_result": latestResult,
		"activities":    activities,
	})
}
