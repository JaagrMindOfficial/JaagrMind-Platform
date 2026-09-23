package handlers

import (
	"encoding/json"
	"math"
	"strings"
	"time"

	"github.com/gofiber/fiber/v3"
	"github.com/jaagrmind/platform-api/internal/core/domain"
	"github.com/jaagrmind/platform-api/internal/middleware"
	"github.com/jaagrmind/platform-api/internal/services"
)

type StudentAPIHandler struct {
	schoolRepo  domain.SchoolRepository
	studentRepo domain.StudentRepository
	assessRepo  domain.AssessmentRepository
	authSvc     domain.AuthService
}

func SetupStudentAPIRoutes(app *fiber.App, schoolRepo domain.SchoolRepository, studentRepo domain.StudentRepository, assessRepo domain.AssessmentRepository, authSvc domain.AuthService, jwtSecret string) {
	handler := &StudentAPIHandler{
		schoolRepo:  schoolRepo,
		studentRepo: studentRepo,
		assessRepo:  assessRepo,
		authSvc:     authSvc,
	}

	// Public routes for student login & preview
	app.Get("/api/student/school-info", handler.GetSchoolInfo)
	app.Post("/api/auth/student/login", handler.StudentLogin)
	app.Get("/api/preview/assessment/:id", handler.GetPreviewAssessment)

	// Protected routes (require student role)
	studentAPI := app.Group("/api/student", middleware.RoleGuard(jwtSecret, "student"))
	studentAPI.Get("/assessment", handler.GetAssessment)
	studentAPI.Get("/tests", handler.GetAssessment)
	studentAPI.Post("/assessment/submit", handler.SubmitAssessment)
	studentAPI.Post("/submit", handler.SubmitAssessment)
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

	if accessID == "" && (rollNo == "" || classGrade == "") {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Access ID or Class and Roll Number is required"})
	}
	if req.SchoolID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "School ID is required"})
	}

	// 1. Get School by Code (fallback to ID)
	school, err := h.schoolRepo.GetByCode(c.Context(), strings.ToUpper(req.SchoolID))
	if err != nil {
		school, err = h.schoolRepo.GetByID(c.Context(), req.SchoolID)
		if err != nil {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "Invalid school link. Please contact your school."})
		}
	}
	if school.IsBlocked {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"message": "This school has been blocked."})
	}

	// 2. Get Student by School ID and Access ID or Class/Roll
	var student *domain.Student
	if accessID != "" {
		student, err = h.studentRepo.GetByAccessID(c.Context(), school.ID, accessID)
	}

	// Fallback to Class + Section + Roll Number lookup
	if (student == nil || err != nil) && (rollNo != "" || accessID != "") && classGrade != "" {
		targetRoll := rollNo
		if targetRoll == "" {
			targetRoll = accessID
		}
		student, err = h.studentRepo.GetByClassAndRoll(c.Context(), school.ID, classGrade, req.Section, targetRoll, req.Stream)
	}

	if err != nil || student == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "Invalid credentials. Please verify your Access ID or Class & Roll Number."})
	}
	if !student.IsActive {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"message": "Account inactive"})
	}

	// 3. Update Contact info if provided and student does not already have contact recorded
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

	// 4. Generate JWT
	token, err := h.authSvc.GenerateToken(domain.TokenPayload{
		UserID: student.ID,
		Roles:  []string{"student"},
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": "Failed to generate token"})
	}

	// 5. Return old-frontend compatible response with roll_number and stream
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
	res.School.Name = school.Name
	res.School.Logo = school.Logo
	res.School.SchoolID = school.SchoolCode

	return c.JSON(res)
}

func (h *StudentAPIHandler) GetAssessment(c fiber.Ctx) error {
	studentID := middleware.ExtractUserID(c)
	assessmentID := c.Query("assessmentId")

	var target *domain.Assessment
	if assessmentID != "" {
		a, err := h.assessRepo.GetByID(c.Context(), assessmentID)
		if err == nil {
			target = a
		}
	}

	// If no explicit ID requested, resolve the check-in matching student's enrolled grade
	if target == nil && studentID != "" {
		student, err := h.studentRepo.GetByID(c.Context(), studentID)
		if err == nil && student != nil && student.Grade != "" {
			actives, _ := h.assessRepo.GetActiveAssessments(c.Context())
			for _, a := range actives {
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
		"archetype":          archetype,
		"archetypeTitle":     archetypeTitle,
		"counselorStrategy":  counselorStrategy,
		"launchFriction":     launchFriction,
		"classroomVoice":     classroomVoice,
		"peerBoundaryStrain": peerBoundaryStrain,
		"screenDrag":         screenDrag,
		"radarVectors":       radarVectors,
		"asymmetryInsight":   "High Academic Tenacity balanced with moderate Stress Adaptability demonstrates high internal grit, with recommended focus on proactive stress venting.",
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

	return c.JSON(fiber.Map{"success": true, "message": "Assessment submitted successfully"})
}
