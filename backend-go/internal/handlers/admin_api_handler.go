package handlers

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gofiber/fiber/v3"
	"github.com/jaagrmind/platform-api/internal/core/domain"
	"github.com/jaagrmind/platform-api/internal/utils"
)

type AdminAPIHandler struct {
	schoolRepo    domain.SchoolRepository
	studentRepo   domain.StudentRepository
	assessRepo    domain.AssessmentRepository
	ticketRepo    domain.TicketRepository
	analyticsRepo domain.AnalyticsRepository
	userRepo      domain.UserRepository
	guideRepo     domain.GuideRepository
	eventRepo     domain.EventRepository
	parentRepo    domain.ParentRepository
	authSvc       domain.AuthService
	emailSvc      utils.EmailService
}

func SetupAdminAPIRoutes(app fiber.Router, schoolRepo domain.SchoolRepository, studentRepo domain.StudentRepository, assessRepo domain.AssessmentRepository, ticketRepo domain.TicketRepository, analyticsRepo domain.AnalyticsRepository, userRepo domain.UserRepository, guideRepo domain.GuideRepository, eventRepo domain.EventRepository, parentRepo domain.ParentRepository, authSvc domain.AuthService, emailSvc utils.EmailService) {
	handler := &AdminAPIHandler{
		schoolRepo:    schoolRepo,
		studentRepo:   studentRepo,
		assessRepo:    assessRepo,
		ticketRepo:    ticketRepo,
		analyticsRepo: analyticsRepo,
		userRepo:      userRepo,
		guideRepo:     guideRepo,
		eventRepo:     eventRepo,
		parentRepo:    parentRepo,
		authSvc:       authSvc,
		emailSvc:      emailSvc,
	}

	// Parent Inquiries (JaagrMind & School Inquiries)
	app.Get("/parent-inquiries", handler.GetParentInquiries)
	app.Get("/parent-inquiries/:id/messages", handler.GetAdminInquiryMessages)
	app.Post("/parent-inquiries/:id/reply", handler.ReplyAdminInquiry)
	app.Put("/parent-inquiries/:id", handler.UpdateParentInquiry)

	// Platform & School Counselor Management
	app.Get("/counselors", handler.GetAdminCounselors)
	app.Post("/counselors", handler.OnboardAdminCounselor)

	// Account
	app.Get("/account", handler.GetAdminAccount)
	app.Put("/account", handler.UpdateAdminAccount)

	// Platform Guides
	app.Get("/guides", handler.GetAdminGuides)
	app.Post("/guides", handler.CreateGuide)
	app.Put("/guides/:id", handler.UpdateGuide)
	app.Delete("/guides/:id", handler.DeleteGuide)

	// Schools
	app.Get("/schools", handler.GetSchools)
	app.Post("/schools", handler.CreateSchool)
	app.Put("/schools/:id", handler.UpdateSchool)
	app.Delete("/schools/:id", handler.DeleteSchool)
	app.Patch("/schools/:id/block", handler.ToggleBlockSchool)
	app.Post("/schools/:id/send-credentials", handler.SendCredentials)
	app.Post("/schools/:id/impersonate", handler.ImpersonateSchool)
	app.Post("/schools/:id/send-reset-link", handler.SendResetLink)

	// Students
	app.Get("/students", handler.GetStudents)
	app.Get("/students/:studentId/assigned-checkins", handler.GetStudentAssignedCheckins)
	app.Put("/students/:id", handler.UpdateStudent)
	app.Delete("/students/:id", handler.DeleteStudent)

	// Assessments
	app.Get("/assessments", handler.GetAssessments)
	app.Get("/assessments/:id", handler.GetAssessmentByID)
	app.Post("/assessments", handler.CreateAssessment)
	app.Put("/assessments/:id", handler.UpdateAssessment)
	app.Put("/assessments/:id/set-default", handler.SetDefaultAssessment)
	app.Delete("/assessments/:id", handler.DeleteAssessment)
	app.Get("/assessments/:id/schools", handler.GetAssessmentSchools)
	app.Post("/assessments/:id/assign-schools", handler.AssignAssessmentToSchools)

	// Tickets
	app.Get("/tickets", handler.GetTickets)
	app.Put("/tickets/:id/reply", handler.ReplyToTicket)

	// Analytics
	app.Get("/analytics", handler.GetAnalytics)
	app.Get("/analytics/schools", handler.GetSchoolsAnalytics)
	app.Get("/analytics/student/:studentId/attempts", handler.GetStudentAttempts)
	app.Get("/analytics/student/:studentId/attempts/:assessmentId", handler.GetStudentAttempts)

	// Institution Applications (Inbound Requests)
	app.Get("/institution-applications", handler.GetInstitutionApplications)
	app.Post("/institution-applications/:id/approve", handler.ApproveInstitutionApplication)
	app.Post("/institution-applications/:id/reject", handler.RejectInstitutionApplication)

	// Platform & School Events Audit Trail
	app.Get("/events", handler.GetAdminEvents)
}

func (h *AdminAPIHandler) GetInstitutionApplications(c fiber.Ctx) error {
	apps, err := h.userRepo.GetInstitutionApplications(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if apps == nil {
		apps = []domain.InstitutionApplication{}
	}
	return c.JSON(apps)
}

func (h *AdminAPIHandler) ApproveInstitutionApplication(c fiber.Ctx) error {
	id := c.Params("id")
	app, err := h.userRepo.GetInstitutionApplicationByID(c.Context(), id)
	if err != nil || app == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Application not found"})
	}

	if app.Status == "approved" {
		existingUser, uErr := h.userRepo.GetUserByEmail(c.Context(), app.Email)
		var existingSchool *domain.School
		if uErr == nil && existingUser != nil {
			for _, r := range existingUser.Roles {
				if r.Role == domain.RoleSchoolAdmin && r.EntityID != "" {
					existingSchool, _ = h.schoolRepo.GetByID(c.Context(), r.EntityID)
					break
				}
			}
		}
		if existingSchool != nil {
			resetToken := uuid.New().String()
			_ = h.userRepo.CreatePasswordResetToken(c.Context(), app.Email, app.Phone, resetToken, time.Now().Add(72*time.Hour))
			resetURL := fmt.Sprintf("http://localhost:3000/reset-password?token=%s", resetToken)
			return c.JSON(fiber.Map{
				"success":     true,
				"message":     fmt.Sprintf("Institution '%s' is already provisioned and active", app.InstituteName),
				"school":      existingSchool,
				"admin_email": app.Email,
				"admin_phone": app.Phone,
				"reset_url":   resetURL,
			})
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Application is already approved"})
	}

	// 1. Generate unique school code
	baseCode := strings.ToUpper(strings.ReplaceAll(app.InstituteName, " ", ""))
	if len(baseCode) > 6 {
		baseCode = baseCode[:6]
	}
	code := fmt.Sprintf("%s%d", baseCode, time.Now().Unix()%1000)

	// 2. Create School record
	createdSchool, err := h.schoolRepo.Create(c.Context(), domain.CreateSchoolRequest{
		Name:        app.InstituteName,
		SchoolCode:  code,
		City:        fmt.Sprintf("%s, %s", app.City, app.State),
		Contact:     app.Email,
		PhoneNumber: app.Phone,
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create school: " + err.Error()})
	}

	// 3. Create School Admin user
	adminName := app.ContactName
	if adminName == "" {
		adminName = app.InstituteName + " Administrator"
	}
	tempPass := uuid.New().String()[:12] + "A1!"
	hash, err := h.authSvc.HashPassword(tempPass)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to prepare admin credentials"})
	}

	user, err := h.userRepo.CreateIndependentUser(c.Context(), app.Email, adminName, hash, app.Phone, map[string]any{
		"designation": app.Designation,
		"source":      "institution_application",
		"school_id":   createdSchool.ID,
	})
	if err != nil {
		existingUser, getErr := h.userRepo.GetUserByEmail(c.Context(), app.Email)
		if getErr == nil && existingUser != nil {
			user = existingUser
		} else {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create admin user: " + err.Error()})
		}
	}

	// 4. Assign school_admin role scoped to school ID
	_ = h.userRepo.AddRole(c.Context(), user.ID, domain.RoleSchoolAdmin, createdSchool.ID)

	// 5. Update application status to approved
	_ = h.userRepo.UpdateApplicationStatus(c.Context(), id, "approved")

	// 6. Generate setup reset link
	resetToken := uuid.New().String()
	_ = h.userRepo.CreatePasswordResetToken(c.Context(), app.Email, app.Phone, resetToken, time.Now().Add(72*time.Hour))
	resetURL := fmt.Sprintf("http://localhost:3000/reset-password?token=%s", resetToken)

	// Send approval & account activation email via Resend
	if h.emailSvc != nil {
		go func(targetEmail, instName, contactName, token string) {
			_ = h.emailSvc.SendInstitutionApprovalEmail(targetEmail, instName, contactName, token)
		}(app.Email, app.InstituteName, app.ContactName, resetToken)
	}

	return c.JSON(fiber.Map{
		"success":     true,
		"message":     fmt.Sprintf("Institution '%s' approved and provisioned successfully", app.InstituteName),
		"school":      createdSchool,
		"admin_email": app.Email,
		"admin_phone": app.Phone,
		"reset_url":   resetURL,
	})
}

func (h *AdminAPIHandler) RejectInstitutionApplication(c fiber.Ctx) error {
	id := c.Params("id")
	if err := h.userRepo.UpdateApplicationStatus(c.Context(), id, "rejected"); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to decline application"})
	}
	return c.JSON(fiber.Map{"success": true, "message": "Application has been declined"})
}


func (h *AdminAPIHandler) GetStudents(c fiber.Ctx) error {
	students, err := h.studentRepo.GetAll(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch students"})
	}
	if students == nil {
		students = []domain.StudentWithSchool{}
	}
	return c.JSON(students)
}

func (h *AdminAPIHandler) UpdateStudent(c fiber.Ctx) error {
	id := c.Params("id")
	var req domain.CreateStudentRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid payload"})
	}

	student, err := h.studentRepo.Update(c.Context(), id, req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update student"})
	}
	return c.JSON(student)
}

func (h *AdminAPIHandler) DeleteStudent(c fiber.Ctx) error {
	id := c.Params("id")
	if err := h.studentRepo.Delete(c.Context(), id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete student"})
	}
	return c.JSON(fiber.Map{"success": true, "message": "Student deleted successfully"})
}

func (h *AdminAPIHandler) GetStudentAssignedCheckins(c fiber.Ctx) error {
	studentID := c.Params("studentId")
	if studentID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Student ID is required"})
	}

	student, err := h.studentRepo.GetByID(c.Context(), studentID)
	if err != nil || student == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Student not found"})
	}

	assessments, err := h.assessRepo.GetAssignedTests(c.Context(), student.SchoolID)
	if err != nil {
		assessments = []domain.Assessment{}
	}

	school, _ := h.schoolRepo.GetByID(c.Context(), student.SchoolID)
	schoolCode := ""
	if school != nil {
		if school.SchoolCode != "" {
			schoolCode = school.SchoolCode
		} else {
			schoolCode = school.ID
		}
	}

	type AssignedCheckinItem struct {
		AssessmentID   string      `json:"assessmentId"`
		Title          string      `json:"title"`
		Description    string      `json:"description"`
		Tier           string      `json:"tier"`
		TargetGrades   []string    `json:"targetGrades"`
		Status         string      `json:"status"`
		TotalScore     int         `json:"totalScore"`
		AssignedBucket string      `json:"assignedBucket"`
		SectionScores  interface{} `json:"sectionScores"`
		CompletedAt    *string     `json:"completedAt"`
		TimeTaken      int         `json:"timeTaken"`
		AttemptsCount  int         `json:"attemptsCount"`
		DirectLink     string      `json:"directLink"`
	}

	var items []AssignedCheckinItem
	for _, a := range assessments {
		if !utils.GradeMatchesTarget(student.Grade, a.TargetGrades, a.MinGrade, a.MaxGrade) {
			continue
		}

		item := AssignedCheckinItem{
			AssessmentID: a.ID,
			Title:        a.Title,
			Description:  a.Description,
			Tier:         a.Tier,
			TargetGrades: a.TargetGrades,
			Status:       "pending",
			DirectLink:   fmt.Sprintf("/student/login?test=%s&school=%s&accessId=%s", a.ID, schoolCode, student.AccessID),
		}

		results, err := h.assessRepo.GetResultsByStudent(c.Context(), student.ID, a.ID)
		if err == nil && len(results) > 0 {
			item.AttemptsCount = len(results)
			latest := results[0]
			item.TotalScore = latest.TotalScore
			item.AssignedBucket = latest.AssignedBucket
			item.SectionScores = latest.SectionScores
			item.TimeTaken = latest.TimeTaken
			completedStr := latest.CompletedAt.Format("2006-01-02 15:04:05")
			item.CompletedAt = &completedStr

			if latest.Status == "archived" {
				item.Status = "reassigned"
			} else {
				item.Status = "completed"
			}
		}

		items = append(items, item)
	}

	if items == nil {
		items = []AssignedCheckinItem{}
	}

	return c.JSON(items)
}

func (h *AdminAPIHandler) GetSchools(c fiber.Ctx) error {
	schools, err := h.schoolRepo.GetAll(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch schools"})
	}
	if schools == nil {
		schools = []domain.School{}
	}
	return c.JSON(schools)
}

func (h *AdminAPIHandler) CreateSchool(c fiber.Ctx) error {
	var req domain.CreateSchoolRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid payload"})
	}

	school, err := h.schoolRepo.Create(c.Context(), req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create school"})
	}
	return c.Status(fiber.StatusCreated).JSON(school)
}

func (h *AdminAPIHandler) UpdateSchool(c fiber.Ctx) error {
	id := c.Params("id")
	var req domain.CreateSchoolRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid payload"})
	}
	
	school, err := h.schoolRepo.Update(c.Context(), id, req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update school"})
	}
	return c.JSON(school)
}

func (h *AdminAPIHandler) DeleteSchool(c fiber.Ctx) error {
	id := c.Params("id")
	if err := h.schoolRepo.Delete(c.Context(), id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete school"})
	}
	return c.JSON(fiber.Map{"success": true, "message": "School deleted successfully"})
}

func (h *AdminAPIHandler) ToggleBlockSchool(c fiber.Ctx) error {
	id := c.Params("id")
	var req struct {
		IsBlocked bool `json:"is_blocked"`
	}
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid payload"})
	}

	err := h.schoolRepo.ToggleBlock(c.Context(), id, req.IsBlocked)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update block status"})
	}
	return c.JSON(fiber.Map{"success": true})
}

// ── Assessments ──────────────────────────────────────────────────────────

func (h *AdminAPIHandler) GetAssessments(c fiber.Ctx) error {
	assessments, err := h.assessRepo.GetAll(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch assessments"})
	}
	if assessments == nil {
		assessments = []domain.Assessment{}
	}
	return c.JSON(assessments)
}

func (h *AdminAPIHandler) CreateAssessment(c fiber.Ctx) error {
	var req domain.Assessment
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid payload"})
	}

	assessment, err := h.assessRepo.Create(c.Context(), req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create assessment"})
	}
	return c.Status(fiber.StatusCreated).JSON(assessment)
}

func (h *AdminAPIHandler) UpdateAssessment(c fiber.Ctx) error {
	id := c.Params("id")
	var req domain.Assessment
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid payload"})
	}

	assessment, err := h.assessRepo.Update(c.Context(), id, req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update assessment"})
	}
	return c.JSON(assessment)
}

func (h *AdminAPIHandler) GetAssessmentByID(c fiber.Ctx) error {
	id := c.Params("id")
	assessment, err := h.assessRepo.GetByID(c.Context(), id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Assessment not found"})
	}
	return c.JSON(assessment)
}

func (h *AdminAPIHandler) SetDefaultAssessment(c fiber.Ctx) error {
	id := c.Params("id")
	if err := h.assessRepo.SetDefault(c.Context(), id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to set default assessment"})
	}
	return c.JSON(fiber.Map{"success": true, "message": "Default assessment updated"})
}

func (h *AdminAPIHandler) DeleteAssessment(c fiber.Ctx) error {
	id := c.Params("id")
	if err := h.assessRepo.Delete(c.Context(), id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete assessment"})
	}
	return c.JSON(fiber.Map{"success": true, "message": "Assessment deleted successfully"})
}

func (h *AdminAPIHandler) GetAssessmentSchools(c fiber.Ctx) error {
	id := c.Params("id")
	schools, err := h.assessRepo.GetSchoolAssignments(c.Context(), id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch school assignments: " + err.Error()})
	}
	return c.JSON(schools)
}

func (h *AdminAPIHandler) AssignAssessmentToSchools(c fiber.Ctx) error {
	id := c.Params("id")
	var req struct {
		SchoolIDs []string `json:"schoolIds"`
		Reassign  bool     `json:"reassign"`
	}
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid payload"})
	}

	if err := h.assessRepo.AssignAssessmentToSchools(c.Context(), id, req.SchoolIDs, req.Reassign); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to assign assessment to schools: " + err.Error()})
	}

	actorName := "Super Administrator"
	if userID, _ := c.Locals("user_id").(string); userID != "" {
		if u, err := h.userRepo.GetUserByID(c.Context(), userID); err == nil && u != nil {
			if u.Name != "" {
				actorName = u.Name
			} else if u.Email != "" {
				actorName = u.Email
			}
		}
	}

	action := "assessment_assigned_schools"
	title := "Assessment Assigned to Institutions"
	if req.Reassign {
		action = "assessment_reassigned_schools"
		title = "Assessment Reassigned to Institutions (New Window)"
	}

	_, _ = h.eventRepo.Create(c.Context(), domain.CreateEventRequest{
		ActorName:   actorName,
		ActorRole:   "superadmin",
		EventType:   "governance",
		Action:      action,
		Title:       title,
		Description: fmt.Sprintf("Assigned assessment %s across %d institutions (reassign=%v)", id, len(req.SchoolIDs), req.Reassign),
		Metadata: map[string]interface{}{
			"assessment_id": id,
			"schools_count": len(req.SchoolIDs),
			"reassigned":    req.Reassign,
		},
	})

	return c.JSON(fiber.Map{
		"success": true,
		"message": fmt.Sprintf("Assessment successfully assigned to %d institutions", len(req.SchoolIDs)),
	})
}

// ── Tickets ──────────────────────────────────────────────────────────────

func (h *AdminAPIHandler) GetTickets(c fiber.Ctx) error {
	tickets, err := h.ticketRepo.GetAll(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch tickets"})
	}
	if tickets == nil {
		tickets = []domain.Ticket{}
	}
	return c.JSON(tickets)
}

func (h *AdminAPIHandler) ReplyToTicket(c fiber.Ctx) error {
	id := c.Params("id")
	var req domain.ReplyTicketRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid payload"})
	}

	ticket, err := h.ticketRepo.ReplyAndStatus(c.Context(), id, req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to reply to ticket"})
	}

	if h.emailSvc != nil && ticket != nil && ticket.SchoolEmail != "" {
		go func(targetEmail, subject, status, responseNotes string) {
			_ = h.emailSvc.SendTicketUpdateEmail(targetEmail, subject, status, responseNotes)
		}(ticket.SchoolEmail, ticket.Subject, ticket.Status, req.Reply)
	}

	return c.JSON(ticket)
}

// ── Analytics ────────────────────────────────────────────────────────────

func (h *AdminAPIHandler) GetAnalytics(c fiber.Ctx) error {
	schoolID := c.Query("school_id")
	if schoolID != "" && schoolID != "all" {
		branchID := c.Query("branch_id")
		grade := c.Query("grade")
		section := c.Query("section")
		detailed, err := h.analyticsRepo.GetDetailedSchoolAnalytics(c.Context(), schoolID, branchID, grade, section)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch school analytics: " + err.Error()})
		}
		return c.JSON(detailed)
	}

	stats, err := h.analyticsRepo.GetAdminAnalytics(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch analytics"})
	}

	schoolsComparison, _ := h.analyticsRepo.GetSchoolsOverview(c.Context())
	allSchools, _ := h.schoolRepo.GetAll(c.Context())

	natOverview, err := h.analyticsRepo.GetNationalOverview(c.Context())
	if err != nil {
		natOverview = &domain.NationalOverview{
			NationalRadar:       []map[string]interface{}{},
			ExecutiveBanner:     map[string]string{},
			FrictionDiagnostics: map[string]interface{}{},
			Archetypes:          []map[string]interface{}{},
			GradeHeatmaps:       []map[string]interface{}{},
		}
	}

	return c.JSON(fiber.Map{
		"total_schools":     stats.TotalSchools,
		"active_schools":    stats.ActiveSchools,
		"blocked_schools":   stats.BlockedSchools,
		"total_students":    stats.TotalStudents,
		"total_assessments": stats.TotalAssessments,
		"city_distribution": stats.CityDistribution,
		"platform_stats": fiber.Map{
			"total_schools":     stats.TotalSchools,
			"active_schools":    stats.ActiveSchools,
			"blocked_schools":   stats.BlockedSchools,
			"total_students":    stats.TotalStudents,
			"total_assessments": stats.TotalAssessments,
			"city_distribution": stats.CityDistribution,
		},
		"support_stats": fiber.Map{
			"total_tickets": stats.TotalTickets,
			"open_tickets":  stats.OpenTickets,
		},
		"national_radar":       natOverview.NationalRadar,
		"executive_banner":     natOverview.ExecutiveBanner,
		"friction_diagnostics": natOverview.FrictionDiagnostics,
		"archetypes":           natOverview.Archetypes,
		"grade_heatmaps":       natOverview.GradeHeatmaps,
		"schools_comparison":   schoolsComparison,
		"schools_list":         allSchools,
	})
}

func (h *AdminAPIHandler) GetSchoolsAnalytics(c fiber.Ctx) error {
	schools, err := h.analyticsRepo.GetSchoolsOverview(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch schools analytics"})
	}
	return c.JSON(schools)
}

func (h *AdminAPIHandler) GetStudentAttempts(c fiber.Ctx) error {
	studentID := c.Params("studentId")
	assessmentID := c.Params("assessmentId")
	if assessmentID == "all" {
		assessmentID = ""
	}

	results, err := h.assessRepo.GetResultsByStudent(c.Context(), studentID, assessmentID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": "Failed to fetch student attempts"})
	}
	if results == nil {
		results = []domain.StudentResult{}
	}

	for i := range results {
		if results[i].Origin == "parent" {
			results[i].OriginLabel = "Home / Parent Check-in"
		} else if results[i].Origin == "student" {
			results[i].OriginLabel = "Student Direct"
		} else {
			if results[i].SchoolName != "" {
				results[i].OriginLabel = results[i].SchoolName
			} else {
				results[i].OriginLabel = "School Session"
			}
		}
	}

	return c.JSON(results)
}

func (h *AdminAPIHandler) SendCredentials(c fiber.Ctx) error {
	id := c.Params("id")
	school, err := h.schoolRepo.GetByID(c.Context(), id)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "School not found"})
	}

	var adminEmail string
	var adminName string
	if h.userRepo != nil {
		users, _ := h.userRepo.GetUsersByRoleAndEntity(c.Context(), domain.RoleSchoolAdmin, id)
		if len(users) > 0 {
			adminEmail = users[0].Email
			adminName = users[0].Name
		}
	}

	if adminEmail == "" {
		adminEmail = school.Contact
		if adminEmail == "" {
			adminEmail = fmt.Sprintf("admin@%s.edu", strings.ToLower(school.SchoolCode))
		}
	}
	if adminName == "" {
		adminName = school.Name + " Admin"
	}

	codePart := school.SchoolCode
	if len(codePart) > 4 {
		codePart = codePart[:4]
	}
	tempPassword := fmt.Sprintf("%s@Pass2026", strings.ToUpper(codePart))

	return c.JSON(fiber.Map{
		"success":       true,
		"school_id":     school.ID,
		"school_name":   school.Name,
		"school_code":   school.SchoolCode,
		"admin_name":    adminName,
		"email":         adminEmail,
		"phone":         school.PhoneNumber,
		"temp_password": tempPassword,
		"portal_url":    "/school/login",
		"message":       "Credentials prepared for " + school.Name,
	})
}

func (h *AdminAPIHandler) ImpersonateSchool(c fiber.Ctx) error {
	id := c.Params("id")
	school, err := h.schoolRepo.GetByID(c.Context(), id)
	if err != nil || school == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "School not found"})
	}

	users, err := h.userRepo.GetUsersByRoleAndEntity(c.Context(), domain.RoleSchoolAdmin, id)
	var adminUser *domain.User
	if err == nil && len(users) > 0 {
		adminUser = &users[0]
	} else {
		adminEmail := school.Contact
		if adminEmail == "" {
			adminEmail = fmt.Sprintf("admin@%s.edu", strings.ToLower(school.SchoolCode))
		}
		existing, err := h.userRepo.GetUserByEmail(c.Context(), adminEmail)
		if err == nil && existing != nil {
			adminUser = existing
		} else {
			hash, _ := h.authSvc.HashPassword(uuid.New().String())
			created, err := h.userRepo.CreateIndependentUser(c.Context(), adminEmail, school.Name+" Admin", hash, school.PhoneNumber, map[string]any{"school_id": school.ID})
			if err == nil {
				adminUser = created
				_ = h.userRepo.AddRole(c.Context(), created.ID, domain.RoleSchoolAdmin, school.ID)
			}
		}
	}

	if adminUser == nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Could not establish school admin identity"})
	}

	// Ensure adminUser explicitly contains the school_admin role for this school
	hasSchoolAdminRole := false
	for _, r := range adminUser.Roles {
		if r.Role == domain.RoleSchoolAdmin {
			hasSchoolAdminRole = true
			break
		}
	}
	if !hasSchoolAdminRole {
		adminUser.Roles = append(adminUser.Roles, domain.UserRole{
			UserID:   adminUser.ID,
			Role:     domain.RoleSchoolAdmin,
			EntityID: school.ID,
		})
		_ = h.userRepo.AddRole(c.Context(), adminUser.ID, domain.RoleSchoolAdmin, school.ID)
	}

	token, err := h.authSvc.GenerateToken(domain.TokenPayload{
		UserID: adminUser.ID,
		Roles:  []string{domain.RoleSchoolAdmin},
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate impersonation token"})
	}

	return c.JSON(fiber.Map{
		"success":          true,
		"token":            token,
		"user":             adminUser,
		"school":           school,
		"is_impersonating": true,
		"message":          fmt.Sprintf("Impersonation active for %s", school.Name),
	})
}

func (h *AdminAPIHandler) SendResetLink(c fiber.Ctx) error {
	id := c.Params("id")
	school, err := h.schoolRepo.GetByID(c.Context(), id)
	if err != nil || school == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "School not found"})
	}

	var adminEmail string
	var adminPhone string

	users, _ := h.userRepo.GetUsersByRoleAndEntity(c.Context(), domain.RoleSchoolAdmin, id)
	if len(users) > 0 {
		adminEmail = users[0].Email
		adminPhone = users[0].Phone
	}

	if adminEmail == "" {
		adminEmail = school.Contact
		if adminEmail == "" {
			adminEmail = fmt.Sprintf("admin@%s.edu", strings.ToLower(school.SchoolCode))
		}
	}
	if adminPhone == "" {
		adminPhone = school.PhoneNumber
	}

	token := uuid.New().String()
	expiresAt := time.Now().Add(48 * time.Hour)

	if err := h.userRepo.CreatePasswordResetToken(c.Context(), adminEmail, adminPhone, token, expiresAt); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate reset link: " + err.Error()})
	}

	resetURL := fmt.Sprintf("http://localhost:3000/reset-password?token=%s", token)

	return c.JSON(fiber.Map{
		"success":     true,
		"email":       adminEmail,
		"phone":       adminPhone,
		"token":       token,
		"reset_url":   resetURL,
		"school_name": school.Name,
		"message":     fmt.Sprintf("Password setup & reset link generated and dispatched to %s", adminEmail),
	})
}


// ── Admin Account ────────────────────────────────────────────────────────

func (h *AdminAPIHandler) GetAdminAccount(c fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	user, err := h.userRepo.GetUserByID(c.Context(), userID)
	if err != nil || user == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}

	return c.JSON(fiber.Map{
		"user": user,
	})
}

func (h *AdminAPIHandler) UpdateAdminAccount(c fiber.Ctx) error {
	userID, _ := c.Locals("user_id").(string)
	if userID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req struct {
		Name  string `json:"name"`
		Email string `json:"email"`
	}
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request payload"})
	}

	if req.Name == "" || req.Email == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Name and email are required"})
	}

	if err := h.userRepo.UpdateUser(c.Context(), userID, req.Name, req.Email); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update profile"})
	}

	updatedUser, _ := h.userRepo.GetUserByID(c.Context(), userID)
	return c.JSON(fiber.Map{
		"success": true,
		"user":    updatedUser,
		"message": "Superadmin profile updated successfully",
	})
}

// ── Platform Guides ──────────────────────────────────────────────────────

func (h *AdminAPIHandler) GetAdminGuides(c fiber.Ctx) error {
	guides, err := h.guideRepo.GetAll(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch guides"})
	}
	if guides == nil {
		guides = []domain.PlatformGuide{}
	}
	return c.JSON(guides)
}

func (h *AdminAPIHandler) CreateGuide(c fiber.Ctx) error {
	var req domain.CreateGuideRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if req.Slug == "" || req.Title == "" || req.Content == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Slug, Title, and Content are required"})
	}

	guide, err := h.guideRepo.Create(c.Context(), req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create guide: " + err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(guide)
}

func (h *AdminAPIHandler) UpdateGuide(c fiber.Ctx) error {
	id := c.Params("id")
	var req domain.CreateGuideRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	guide, err := h.guideRepo.Update(c.Context(), id, req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update guide: " + err.Error()})
	}
	return c.JSON(guide)
}

func (h *AdminAPIHandler) DeleteGuide(c fiber.Ctx) error {
	id := c.Params("id")
	if err := h.guideRepo.Delete(c.Context(), id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete guide"})
	}
	return c.JSON(fiber.Map{"success": true, "message": "Guide deleted successfully"})
}

func (h *AdminAPIHandler) GetAdminEvents(c fiber.Ctx) error {
	schoolID := strings.TrimSpace(c.Query("school_id"))
	events, err := h.eventRepo.GetAll(c.Context(), schoolID, 50)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch events: " + err.Error()})
	}
	if events == nil {
		events = []domain.Event{}
	}
	return c.JSON(events)
}

func (h *AdminAPIHandler) GetParentInquiries(c fiber.Ctx) error {
	inquiries, err := h.parentRepo.GetParentInquiriesForSuperAdmin(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(inquiries)
}

func (h *AdminAPIHandler) UpdateParentInquiry(c fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Inquiry ID is required"})
	}

	var req struct {
		Status          string `json:"status"`
		ResolutionNotes string `json:"resolution_notes"`
		MeetingDate     string `json:"meeting_date"`
		MeetingTime     string `json:"meeting_time"`
		MeetingLink     string `json:"meeting_link"`
	}
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.Status == "" {
		req.Status = "resolved"
	}

	err := h.parentRepo.UpdateSuperAdminInquiryStatus(c.Context(), id, req.Status, req.ResolutionNotes)
	if err != nil {
		if strings.Contains(err.Error(), "view-only access") {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	if req.MeetingDate != "" || req.MeetingTime != "" || req.MeetingLink != "" {
		_ = h.parentRepo.UpdateInquiryMeeting(c.Context(), id, req.MeetingDate, req.MeetingTime, req.MeetingLink)
	}

	if strings.TrimSpace(req.ResolutionNotes) != "" {
		authorID, _ := c.Locals("user_id").(string)
		authorName := "JaagrMind Central Counselor"
		if authorID != "" {
			if u, err := h.userRepo.GetUserByID(c.Context(), authorID); err == nil && u != nil && u.Name != "" {
				authorName = u.Name
			}
		}
		_, _ = h.parentRepo.AddInquiryMessage(c.Context(), id, authorID, authorName, "jaagrmind_counselor", strings.TrimSpace(req.ResolutionNotes))
	}

	return c.JSON(fiber.Map{"success": true, "message": "Inquiry updated successfully"})
}

func (h *AdminAPIHandler) GetAdminInquiryMessages(c fiber.Ctx) error {
	inquiryID := c.Params("id")
	if inquiryID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Inquiry ID is required"})
	}

	messages, err := h.parentRepo.GetInquiryMessages(c.Context(), inquiryID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(messages)
}

func (h *AdminAPIHandler) ReplyAdminInquiry(c fiber.Ctx) error {
	inquiryID := c.Params("id")
	if inquiryID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Inquiry ID is required"})
	}

	var req struct {
		Message     string `json:"message"`
		MeetingDate string `json:"meeting_date"`
		MeetingTime string `json:"meeting_time"`
		MeetingLink string `json:"meeting_link"`
		Status      string `json:"status"`
	}
	if err := c.Bind().Body(&req); err != nil || strings.TrimSpace(req.Message) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Message cannot be empty"})
	}

	authorID, _ := c.Locals("user_id").(string)
	authorName := "JaagrMind Central Counselor"
	if authorID != "" {
		if u, err := h.userRepo.GetUserByID(c.Context(), authorID); err == nil && u != nil && u.Name != "" {
			authorName = u.Name
		}
	}

	msg, err := h.parentRepo.AddInquiryMessage(c.Context(), inquiryID, authorID, authorName, "jaagrmind_counselor", strings.TrimSpace(req.Message))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	if req.MeetingDate != "" || req.MeetingTime != "" || req.MeetingLink != "" {
		_ = h.parentRepo.UpdateInquiryMeeting(c.Context(), inquiryID, req.MeetingDate, req.MeetingTime, req.MeetingLink)
	}

	if req.Status != "" {
		_ = h.parentRepo.UpdateSuperAdminInquiryStatus(c.Context(), inquiryID, req.Status, req.Message)
	}

	return c.Status(fiber.StatusCreated).JSON(msg)
}

func (h *AdminAPIHandler) GetAdminCounselors(c fiber.Ctx) error {
	counselors, err := h.parentRepo.GetAllCounselors(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(counselors)
}

func (h *AdminAPIHandler) OnboardAdminCounselor(c fiber.Ctx) error {
	var req struct {
		Name           string `json:"name"`
		Email          string `json:"email"`
		Phone          string `json:"phone"`
		Role           string `json:"role"`
		SchoolID       string `json:"school_id"`
		BranchName     string `json:"branch_name"`
		AvailableHours string `json:"available_hours"`
	}
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	req.Name = strings.TrimSpace(req.Name)
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if req.Name == "" || req.Email == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Name and email are required"})
	}

	if req.Role == "" {
		if req.SchoolID != "" {
			req.Role = "School Wellness Counselor"
		} else {
			req.Role = "JaagrMind Central Counselor"
		}
	}
	if req.AvailableHours == "" {
		req.AvailableHours = "Mon-Fri, 9:00 AM - 5:00 PM"
	}

	// 1. Create or register in school_counselors
	created, err := h.parentRepo.AddSchoolCounselor(c.Context(), domain.SchoolCounselor{
		SchoolID:       req.SchoolID,
		Name:           req.Name,
		Email:          req.Email,
		Phone:          req.Phone,
		Role:           req.Role,
		BranchName:     req.BranchName,
		AvailableHours: req.AvailableHours,
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create counselor record: " + err.Error()})
	}

	// 2. Create or update user login account
	tempPassword := "counselor123"
	hash, err := h.authSvc.HashPassword(tempPassword)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to hash password"})
	}

	portalURL := "/care-desk"
	if req.SchoolID != "" {
		portalURL = "/counselor"
	}

	existingUser, _ := h.userRepo.GetUserByEmail(c.Context(), req.Email)
	if existingUser != nil {
		_ = h.userRepo.UpdatePassword(c.Context(), existingUser.ID, hash)
		_ = h.userRepo.AddRole(c.Context(), existingUser.ID, domain.RoleCounselor, req.SchoolID)

		if h.emailSvc != nil {
			go func(toEmail, counselorName, tempPass, pURL, schoolID, role string) {
				if schoolID != "" {
					schoolName := "Partner Institution"
					if sc, err := h.schoolRepo.GetByID(context.Background(), schoolID); err == nil && sc != nil && sc.Name != "" {
						schoolName = sc.Name
					}
					_ = h.emailSvc.SendSchoolCounselorOnboardingEmail(toEmail, counselorName, schoolName, role, tempPass)
				} else {
					_ = h.emailSvc.SendCentralCounselorOnboardingEmail(toEmail, counselorName, tempPass, pURL)
				}
			}(req.Email, req.Name, tempPassword, portalURL, req.SchoolID, req.Role)
		}

		return c.JSON(fiber.Map{
			"success":       true,
			"message":       "Counselor credentials refreshed successfully",
			"counselor":     created,
			"email":         req.Email,
			"name":          req.Name,
			"temp_password": tempPassword,
			"portal_url":    portalURL,
		})
	}

	metadata := map[string]any{
		"counselor_id": created.ID,
		"role":         req.Role,
	}
	if req.SchoolID != "" {
		metadata["school_id"] = req.SchoolID
	} else {
		metadata["affiliation"] = "jaagrmind_central"
	}

	newUser, err := h.userRepo.CreateIndependentUser(c.Context(), req.Email, req.Name, hash, req.Phone, metadata)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create counselor user account: " + err.Error()})
	}

	if err := h.userRepo.AddRole(c.Context(), newUser.ID, domain.RoleCounselor, req.SchoolID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to assign counselor role: " + err.Error()})
	}

	if h.emailSvc != nil {
		go func(toEmail, counselorName, tempPass, pURL, schoolID, role string) {
			if schoolID != "" {
				schoolName := "Partner Institution"
				if sc, err := h.schoolRepo.GetByID(context.Background(), schoolID); err == nil && sc != nil && sc.Name != "" {
					schoolName = sc.Name
				}
				_ = h.emailSvc.SendSchoolCounselorOnboardingEmail(toEmail, counselorName, schoolName, role, tempPass)
			} else {
				_ = h.emailSvc.SendCentralCounselorOnboardingEmail(toEmail, counselorName, tempPass, pURL)
			}
		}(req.Email, req.Name, tempPassword, portalURL, req.SchoolID, req.Role)
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success":       true,
		"message":       "Counselor onboarded successfully",
		"counselor":     created,
		"email":         req.Email,
		"name":          req.Name,
		"temp_password": tempPassword,
		"portal_url":    portalURL,
	})
}





