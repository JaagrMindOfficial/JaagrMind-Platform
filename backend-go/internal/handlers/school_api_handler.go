package handlers

import (
	"context"
	"crypto/rand"
	"fmt"
	"math/big"
	"path/filepath"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/jaagrmind/platform-api/internal/core/domain"
	"github.com/jaagrmind/platform-api/internal/middleware"
	"github.com/jaagrmind/platform-api/internal/utils"
)

func generateSecureTempPassword() string {
	const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"
	const lower = "abcdefghjkmnpqrstuvwxyz"
	const digits = "23456789"
	const special = "!@#$%"
	const all = upper + lower + digits + special

	res := make([]byte, 10)
	r1, _ := rand.Int(rand.Reader, big.NewInt(int64(len(upper))))
	res[0] = upper[r1.Int64()]
	r2, _ := rand.Int(rand.Reader, big.NewInt(int64(len(lower))))
	res[1] = lower[r2.Int64()]
	r3, _ := rand.Int(rand.Reader, big.NewInt(int64(len(digits))))
	res[2] = digits[r3.Int64()]
	r4, _ := rand.Int(rand.Reader, big.NewInt(int64(len(special))))
	res[3] = special[r4.Int64()]

	for i := 4; i < 10; i++ {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(all))))
		res[i] = all[n.Int64()]
	}
	return "JM-" + string(res)
}

type SchoolAPIHandler struct {
	userRepo       domain.UserRepository
	schoolRepo     domain.SchoolRepository
	studentRepo    domain.StudentRepository
	assessRepo     domain.AssessmentRepository
	ticketRepo     domain.TicketRepository
	schedPromoRepo domain.ScheduledPromotionRepository
	analyticsRepo  domain.AnalyticsRepository
	counselorRepo  domain.CounselorNoteRepository
	eventRepo      domain.EventRepository
	parentRepo     domain.ParentRepository
	authSvc        domain.AuthService
	storageSvc     utils.StorageService
	emailSvc       utils.EmailService
}

func SetupSchoolAPIRoutes(app fiber.Router, userRepo domain.UserRepository, schoolRepo domain.SchoolRepository, studentRepo domain.StudentRepository, assessRepo domain.AssessmentRepository, ticketRepo domain.TicketRepository, schedPromoRepo domain.ScheduledPromotionRepository, analyticsRepo domain.AnalyticsRepository, counselorRepo domain.CounselorNoteRepository, eventRepo domain.EventRepository, parentRepo domain.ParentRepository, authSvc domain.AuthService, storageSvc utils.StorageService, emailSvc utils.EmailService, jwtSecret string) {
	handler := &SchoolAPIHandler{
		userRepo:       userRepo,
		schoolRepo:     schoolRepo,
		studentRepo:    studentRepo,
		assessRepo:     assessRepo,
		ticketRepo:     ticketRepo,
		schedPromoRepo: schedPromoRepo,
		analyticsRepo:  analyticsRepo,
		counselorRepo:  counselorRepo,
		eventRepo:      eventRepo,
		parentRepo:     parentRepo,
		authSvc:        authSvc,
		storageSvc:     storageSvc,
		emailSvc:       emailSvc,
	}

	// All school API routes require school_admin, teacher, or counselor role
	schoolAPI := app.Group("/api/school", middleware.RoleGuard(jwtSecret, domain.RoleSchoolAdmin, domain.RoleTeacher, domain.RoleCounselor))
	schoolAPI.Get("/dashboard", handler.GetDashboardStats)
	schoolAPI.Get("/counselors", handler.GetSchoolCounselors)
	schoolAPI.Post("/counselors", handler.AddSchoolCounselor)
	schoolAPI.Put("/counselors/:id", handler.UpdateSchoolCounselor)
	schoolAPI.Delete("/counselors/:id", handler.DeleteSchoolCounselor)
	schoolAPI.Post("/counselors/:id/provision-access", handler.ProvisionCounselorAccess)
	schoolAPI.Get("/parent-inquiries", handler.GetSchoolParentInquiries)
	schoolAPI.Put("/parent-inquiries/:id", handler.UpdateSchoolParentInquiry)
	schoolAPI.Post("/parent-inquiries/:id/claim", handler.ClaimSchoolParentInquiry)
	schoolAPI.Get("/parent-inquiries/:id/messages", handler.GetSchoolInquiryMessages)
	schoolAPI.Post("/parent-inquiries/:id/reply", handler.ReplySchoolInquiry)
	schoolAPI.Get("/students", handler.GetStudents)
	schoolAPI.Post("/students", handler.CreateStudent)
	schoolAPI.Post("/students/bulk", handler.BulkCreateStudents)
	schoolAPI.Post("/students/bulk-delete", handler.BulkDeleteStudents)
	schoolAPI.Put("/students/promote-class", handler.PromoteClass)
	schoolAPI.Get("/students/scheduled-promotions", handler.GetScheduledPromotions)
	schoolAPI.Post("/students/schedule-promotion", handler.SchedulePromotion)
	schoolAPI.Delete("/students/scheduled-promotions/:id", handler.DeleteScheduledPromotion)
	schoolAPI.Post("/students/scheduled-promotions/:id/execute", handler.ExecuteScheduledPromotion)
	schoolAPI.Put("/students/:id", handler.UpdateStudent)
	schoolAPI.Delete("/students/:id", handler.DeleteStudent)
	schoolAPI.Get("/account", handler.GetSchoolAccount)
	schoolAPI.Put("/account", handler.UpdateSchoolAccount)
	schoolAPI.Get("/branches", handler.GetSchoolBranches)
	schoolAPI.Post("/branches", handler.CreateSchoolBranch)
	schoolAPI.Get("/teachers", handler.ListTeachers)
	schoolAPI.Post("/teachers", handler.AddTeacher)

	// Counselor Case Notes
	schoolAPI.Get("/students/:studentId/notes", handler.GetCounselorNotes)
	schoolAPI.Post("/students/:studentId/notes", handler.CreateCounselorNote)
	schoolAPI.Get("/students/:studentId/assigned-checkins", handler.GetStudentAssignedCheckins)

	// School Audit Trail & Events
	schoolAPI.Get("/events", handler.GetSchoolEvents)

	// Tests and Assessments
	schoolAPI.Get("/tests", handler.GetSchoolTests)
	schoolAPI.Get("/test-status", handler.GetSchoolTestStatus)
	schoolAPI.Post("/tests/check-recent", handler.CheckRecentCompletions)
	schoolAPI.Post("/tests/assign", handler.AssignTest)
	schoolAPI.Get("/assessment-link/:assessmentId", handler.GetAssessmentLink)
	schoolAPI.Put("/students/:id/reset", handler.ResetStudentTest)
	schoolAPI.Get("/classes", handler.GetSchoolClasses)
	schoolAPI.Get("/analytics/student/:studentId/attempts", handler.GetStudentAttempts)
	schoolAPI.Get("/analytics/student/:studentId/attempts/:assessmentId", handler.GetStudentAttempts)

	// Support Tickets
	schoolAPI.Get("/tickets", handler.GetSchoolTickets)
	schoolAPI.Post("/tickets", handler.CreateSchoolTicket)

	// Analytics
	schoolAPI.Get("/analytics", handler.GetSchoolAnalytics)
	schoolAPI.Post("/logo", handler.UploadLogo)
}

// GetDashboardStats returns stats for the school_admin's school or scoped class for teacher
func (h *SchoolAPIHandler) GetDashboardStats(c fiber.Ctx) error {
	schoolID := h.extractSchoolID(c)
	if schoolID == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "No school associated"})
	}

	school, err := h.schoolRepo.GetByID(c.Context(), schoolID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "School not found"})
	}

	students, _ := h.studentRepo.GetBySchool(c.Context(), schoolID)
	teachers, _ := h.userRepo.GetUsersByRoleAndEntity(c.Context(), domain.RoleTeacher, schoolID)

	user := h.getAuthenticatedUser(c)
	if h.isTeacherOnly(user) {
		teacherGrade := ""
		teacherSection := ""
		if user != nil && user.Metadata != nil {
			if g, ok := user.Metadata["assigned_grade"].(string); ok {
				teacherGrade = strings.TrimSpace(g)
			}
			if s, ok := user.Metadata["assigned_section"].(string); ok {
				teacherSection = strings.TrimSpace(s)
			}
		}

		normTeacherGrade := strings.TrimSuffix(strings.ToLower(teacherGrade), "th")
		normTeacherGrade = strings.TrimSuffix(normTeacherGrade, "st")
		normTeacherGrade = strings.TrimSuffix(normTeacherGrade, "nd")
		normTeacherGrade = strings.TrimSuffix(normTeacherGrade, "rd")

		classStudents := 0
		for _, st := range students {
			normStudentGrade := strings.TrimSuffix(strings.ToLower(st.Grade), "th")
			normStudentGrade = strings.TrimSuffix(normStudentGrade, "st")
			normStudentGrade = strings.TrimSuffix(normStudentGrade, "nd")
			normStudentGrade = strings.TrimSuffix(normStudentGrade, "rd")

			if normStudentGrade == normTeacherGrade && (teacherSection == "" || strings.EqualFold(st.Section, teacherSection)) {
				classStudents++
			}
		}

		return c.JSON(fiber.Map{
			"school":           school,
			"total_students":   classStudents,
			"total_teachers":   1,
			"is_teacher":       true,
			"assigned_grade":   teacherGrade,
			"assigned_section": teacherSection,
		})
	}

	return c.JSON(fiber.Map{
		"school":         school,
		"total_students": len(students),
		"total_teachers": len(teachers),
		"is_teacher":     false,
	})
}

func (h *SchoolAPIHandler) GetStudents(c fiber.Ctx) error {
	schoolID := h.extractSchoolID(c)
	if schoolID == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"message": "Not associated with a school"})
	}

	students, err := h.studentRepo.GetBySchool(c.Context(), schoolID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": "Failed to fetch students"})
	}
	if students == nil {
		students = []domain.Student{}
	}

	user := h.getAuthenticatedUser(c)
	teacherGrade := ""
	teacherSection := ""
	isTeacher := h.isTeacherOnly(user)

	// Also support School Admin switching to teacher preview mode
	if !isTeacher && c.Query("view") == "teacher" {
		teacherGrade = strings.TrimSpace(c.Query("grade"))
		teacherSection = strings.TrimSpace(c.Query("section"))
		if teacherGrade != "" {
			isTeacher = true
		}
	}

	if isTeacher && user != nil {
		if teacherGrade == "" && user.Metadata != nil {
			if g, ok := user.Metadata["assigned_grade"].(string); ok {
				teacherGrade = strings.TrimSpace(g)
			}
			if s, ok := user.Metadata["assigned_section"].(string); ok {
				teacherSection = strings.TrimSpace(s)
			}
		}

		if teacherGrade != "" {
			normTeacherGrade := strings.TrimSuffix(strings.ToLower(teacherGrade), "th")
			normTeacherGrade = strings.TrimSuffix(normTeacherGrade, "st")
			normTeacherGrade = strings.TrimSuffix(normTeacherGrade, "nd")
			normTeacherGrade = strings.TrimSuffix(normTeacherGrade, "rd")

			var filtered []domain.Student
			for _, st := range students {
				normStudentGrade := strings.TrimSuffix(strings.ToLower(st.Grade), "th")
				normStudentGrade = strings.TrimSuffix(normStudentGrade, "st")
				normStudentGrade = strings.TrimSuffix(normStudentGrade, "nd")
				normStudentGrade = strings.TrimSuffix(normStudentGrade, "rd")

				gradeMatches := normStudentGrade == normTeacherGrade
				sectionMatches := teacherSection == "" || strings.EqualFold(st.Section, teacherSection)

				if gradeMatches && sectionMatches {
					filtered = append(filtered, st)
				}
			}
			students = filtered
		}
	}

	return c.JSON(students)
}

// ListTeachers returns teachers belonging to the school_admin's school
func (h *SchoolAPIHandler) ListTeachers(c fiber.Ctx) error {
	user := h.getAuthenticatedUser(c)
	if h.isTeacherOnly(user) {
		return c.JSON([]domain.User{})
	}

	schoolID := h.extractSchoolID(c)
	if schoolID == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "No school associated"})
	}

	teachers, err := h.userRepo.GetUsersByRoleAndEntity(c.Context(), domain.RoleTeacher, schoolID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if teachers == nil {
		teachers = []domain.User{}
	}
	return c.JSON(teachers)
}

// AddTeacher creates a teacher user scoped to the school
func (h *SchoolAPIHandler) AddTeacher(c fiber.Ctx) error {
	user := h.getAuthenticatedUser(c)
	if h.isTeacherOnly(user) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Only school administrators can add teachers"})
	}

	schoolID := h.extractSchoolID(c)
	if schoolID == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "No school associated"})
	}

	var req domain.CreateTeacherRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}

	if req.Name == "" || req.Email == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Name and email are required"})
	}

	// Generate a high-entropy temporary password (teacher will change on first login)
	tempPassword := generateSecureTempPassword()
	hash, err := h.authSvc.HashPassword(tempPassword)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create password"})
	}

	designation := req.Designation
	if designation == "" {
		designation = "Class Teacher"
	}

	metadata := map[string]any{
		"school_id":        schoolID,
		"assigned_grade":   req.AssignedGrade,
		"assigned_section": req.AssignedSection,
		"designation":      designation,
	}

	newTeacher, err := h.userRepo.CreateIndependentUser(c.Context(), req.Email, req.Name, hash, req.Phone, metadata)
	if err != nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Email already exists"})
	}

	if err := h.userRepo.AddRole(c.Context(), newTeacher.ID, domain.RoleTeacher, schoolID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to assign teacher role"})
	}

	if h.emailSvc != nil {
		go func(toEmail, teacherName, sID, grade, section, tempPass string) {
			schoolName := "Partner School"
			if sc, err := h.schoolRepo.GetByID(context.Background(), sID); err == nil && sc != nil && sc.Name != "" {
				schoolName = sc.Name
			}
			_ = h.emailSvc.SendTeacherOnboardingEmail(toEmail, teacherName, schoolName, grade, section, tempPass)
		}(newTeacher.Email, newTeacher.Name, schoolID, req.AssignedGrade, req.AssignedSection, tempPassword)
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message":          "Teacher added",
		"user_id":          newTeacher.ID,
		"name":             newTeacher.Name,
		"email":            newTeacher.Email,
		"phone":            req.Phone,
		"designation":      designation,
		"temp_password":    tempPassword,
		"assigned_grade":   req.AssignedGrade,
		"assigned_section": req.AssignedSection,
	})
}

// GetCounselorNotes returns confidential counselor case notes for a student
func (h *SchoolAPIHandler) GetCounselorNotes(c fiber.Ctx) error {
	schoolID := h.extractSchoolID(c)
	studentID := c.Params("studentId")
	if schoolID == "" || studentID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "School ID and Student ID required"})
	}

	// Verify student belongs to this school
	student, err := h.studentRepo.GetByID(c.Context(), studentID)
	if err != nil || student == nil || student.SchoolID != schoolID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Student not found or unauthorized for this institution"})
	}

	// Block teachers from viewing confidential clinical / wellbeing case notes
	user := h.getAuthenticatedUser(c)
	if h.isTeacherOnly(user) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Classroom teachers are not authorized to view confidential counseling case notes"})
	}

	notes, err := h.counselorRepo.GetByStudentID(c.Context(), studentID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if notes == nil {
		notes = []domain.CounselorNote{}
	}
	return c.JSON(notes)
}

// CreateCounselorNote logs a new confidential intervention note
func (h *SchoolAPIHandler) CreateCounselorNote(c fiber.Ctx) error {
	schoolID := h.extractSchoolID(c)
	studentID := c.Params("studentId")
	if schoolID == "" || studentID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "School ID and Student ID required"})
	}

	// Verify student belongs to this school
	student, err := h.studentRepo.GetByID(c.Context(), studentID)
	if err != nil || student == nil || student.SchoolID != schoolID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Student not found or unauthorized for this institution"})
	}

	var req domain.CreateCounselorNoteRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.Notes == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Case notes cannot be empty"})
	}
	if req.InterventionType == "" {
		req.InterventionType = "1-on-1 Boundary Coaching"
	}
	if req.Status == "" {
		req.Status = "in_progress"
	}

	authorID, _ := c.Locals("user_id").(string)
	authorName := "Campus Counselor"
	if authorID != "" {
		if u, err := h.userRepo.GetUserByID(c.Context(), authorID); err == nil && u != nil && u.Name != "" {
			authorName = u.Name
		}
	}

	note := domain.CounselorNote{
		SchoolID:         schoolID,
		StudentID:        studentID,
		AuthorID:         authorID,
		AuthorName:       authorName,
		InterventionType: req.InterventionType,
		Status:           req.Status,
		Notes:            req.Notes,
		NextFollowUpDate: req.NextFollowUpDate,
	}

	created, err := h.counselorRepo.Create(c.Context(), note)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(created)
}

func (h *SchoolAPIHandler) CreateStudent(c fiber.Ctx) error {
	schoolID := h.extractSchoolID(c)
	if schoolID == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"message": "Not associated with a school"})
	}

	var req domain.CreateStudentRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Invalid payload"})
	}

	student, err := h.studentRepo.Create(c.Context(), schoolID, req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": "Failed to create student"})
	}

	return c.JSON(student)
}

func (h *SchoolAPIHandler) UpdateStudent(c fiber.Ctx) error {
	schoolID := h.extractSchoolID(c)
	if schoolID == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"message": "Not associated with a school"})
	}

	id := c.Params("id")
	var req domain.CreateStudentRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Invalid payload"})
	}

	student, err := h.studentRepo.Update(c.Context(), id, req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": "Failed to update student"})
	}

	return c.JSON(student)
}

func (h *SchoolAPIHandler) BulkCreateStudents(c fiber.Ctx) error {
	schoolID := h.extractSchoolID(c)
	if schoolID == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"message": "Not associated with a school"})
	}

	var req struct {
		Students []domain.CreateStudentRequest `json:"students"`
	}
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Invalid payload"})
	}

	err := h.studentRepo.BulkCreate(c.Context(), schoolID, req.Students)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": "Failed to bulk import students"})
	}

	return c.JSON(fiber.Map{"message": "Students imported successfully"})
}

func (h *SchoolAPIHandler) DeleteStudent(c fiber.Ctx) error {
	id := c.Params("id")
	if err := h.studentRepo.Delete(c.Context(), id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete student"})
	}
	return c.JSON(fiber.Map{"success": true, "message": "Student deleted successfully"})
}

func (h *SchoolAPIHandler) BulkDeleteStudents(c fiber.Ctx) error {
	schoolID := h.extractSchoolID(c)
	if schoolID == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not associated with a school"})
	}

	var req struct {
		StudentIDs []string `json:"studentIds"`
	}
	if err := c.Bind().Body(&req); err != nil || len(req.StudentIDs) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Student IDs are required"})
	}

	if err := h.studentRepo.BulkDelete(c.Context(), schoolID, req.StudentIDs); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete students"})
	}

	return c.JSON(fiber.Map{"success": true, "message": fmt.Sprintf("%d students deleted successfully", len(req.StudentIDs))})
}

func (h *SchoolAPIHandler) PromoteClass(c fiber.Ctx) error {
	user := h.getAuthenticatedUser(c)
	if h.isTeacherOnly(user) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Only school administrators can execute class promotions"})
	}

	schoolID := h.extractSchoolID(c)
	if schoolID == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not associated with a school"})
	}

	var req struct {
		FilterGrade      string   `json:"filterGrade"`
		FilterSection    string   `json:"filterSection"`
		StudentIDs       []string `json:"studentIds"`
		IsAnnualRollover bool     `json:"is_annual_rollover"`
		AcademicYear     string   `json:"academic_year"`
	}
	_ = c.Bind().Body(&req)

	if req.IsAnnualRollover {
		promoted, graduated, err := h.studentRepo.PromoteAllClasses(c.Context(), schoolID, req.AcademicYear)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		ay := req.AcademicYear
		if ay == "" {
			ay = "next academic year"
		}
		return c.JSON(fiber.Map{
			"success":        true,
			"message":        fmt.Sprintf("Whole-school promotion completed: %d students promoted to next grade, %d graduated to Alumni for AY %s", promoted, graduated, ay),
			"promotedCount":  promoted,
			"graduatedCount": graduated,
		})
	}

	updatedCount, skippedCount, err := h.studentRepo.PromoteClass(c.Context(), schoolID, req.FilterGrade, req.FilterSection, req.StudentIDs)
	if err != nil {
		fmt.Printf("[PromoteClass ERROR] schoolID=%s, err=%v\n", schoolID, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	msg := fmt.Sprintf("Class updated for %d students", updatedCount)
	if skippedCount > 0 {
		msg += fmt.Sprintf(" (%d in Class 12 or non-numeric, skipped)", skippedCount)
	}

	return c.JSON(fiber.Map{
		"success":      true,
		"message":      msg,
		"updatedCount": updatedCount,
		"skippedCount": skippedCount,
	})
}

func (h *SchoolAPIHandler) GetScheduledPromotions(c fiber.Ctx) error {
	user := h.getAuthenticatedUser(c)
	if h.isTeacherOnly(user) {
		return c.JSON([]domain.ScheduledPromotion{})
	}
	schoolID := h.extractSchoolID(c)
	if schoolID == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not associated with a school"})
	}
	promos, err := h.schedPromoRepo.GetBySchool(c.Context(), schoolID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch scheduled promotions"})
	}
	if promos == nil {
		promos = []domain.ScheduledPromotion{}
	}
	return c.JSON(promos)
}

func (h *SchoolAPIHandler) SchedulePromotion(c fiber.Ctx) error {
	user := h.getAuthenticatedUser(c)
	if h.isTeacherOnly(user) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Only school administrators can schedule promotions"})
	}

	schoolID := h.extractSchoolID(c)
	if schoolID == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not associated with a school"})
	}
	var req domain.CreateScheduledPromotionRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid payload"})
	}

	students, _ := h.studentRepo.GetBySchool(c.Context(), schoolID)
	count := 0

	if req.IsAnnualRollover {
		count = len(students)
		if req.FromGrade == "" {
			req.FromGrade = "All Classes"
		}
		if req.ToGrade == "" {
			req.ToGrade = "+1 Grade (Annual Roll-over)"
		}
	} else {
		if req.FromGrade == "" || req.ToGrade == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "From grade and To grade are required"})
		}
		for _, s := range students {
			if s.Grade == req.FromGrade {
				count++
			}
		}
	}

	sp, err := h.schedPromoRepo.Create(c.Context(), schoolID, req, count)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to schedule promotion"})
	}
	return c.Status(fiber.StatusCreated).JSON(sp)
}

func (h *SchoolAPIHandler) DeleteScheduledPromotion(c fiber.Ctx) error {
	schoolID := h.extractSchoolID(c)
	id := c.Params("id")
	if schoolID == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not associated with a school"})
	}
	if err := h.schedPromoRepo.Delete(c.Context(), schoolID, id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to delete scheduled promotion"})
	}
	return c.JSON(fiber.Map{"success": true, "message": "Scheduled promotion cancelled"})
}

func (h *SchoolAPIHandler) ExecuteScheduledPromotion(c fiber.Ctx) error {
	schoolID := h.extractSchoolID(c)
	id := c.Params("id")
	if schoolID == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not associated with a school"})
	}

	promos, err := h.schedPromoRepo.GetBySchool(c.Context(), schoolID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to find promotion"})
	}
	var target *domain.ScheduledPromotion
	for _, p := range promos {
		if p.ID == id {
			target = &p
			break
		}
	}
	if target == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Promotion not found"})
	}

	var message string
	if target.IsAnnualRollover {
		promoted, graduated, err := h.studentRepo.PromoteAllClasses(c.Context(), schoolID, target.AcademicYear)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to execute annual roll-over"})
		}
		message = fmt.Sprintf("Annual roll-over executed: %d promoted, %d graduated for AY %s", promoted, graduated, target.AcademicYear)
	} else {
		updatedCount, _, err := h.studentRepo.PromoteClass(c.Context(), schoolID, target.FromGrade, "", nil)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to execute promotion"})
		}
		message = fmt.Sprintf("Promotion executed for %d students", updatedCount)
	}

	_ = h.schedPromoRepo.Execute(c.Context(), schoolID, id)
	return c.JSON(fiber.Map{
		"success": true,
		"message": message,
	})
}

func (h *SchoolAPIHandler) GetSchoolAccount(c fiber.Ctx) error {
	schoolID := h.extractSchoolID(c)
	if schoolID == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not associated with a school"})
	}
	school, err := h.schoolRepo.GetByID(c.Context(), schoolID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "School not found"})
	}

	userID, _ := c.Locals("user_id").(string)
	var user *domain.User
	if userID != "" {
		user, _ = h.userRepo.GetUserByID(c.Context(), userID)
	}

	allSchools, _ := h.schoolRepo.GetAll(c.Context())
	var branches []domain.School
	var parentSchool *domain.School
	for _, s := range allSchools {
		if s.ParentSchoolID != nil && *s.ParentSchoolID == schoolID {
			branches = append(branches, s)
		}
		if school.ParentSchoolID != nil && s.ID == *school.ParentSchoolID {
			parentSchool = &s
		}
	}

	return c.JSON(fiber.Map{
		"school":        school,
		"user":          user,
		"branches":      branches,
		"parent_school": parentSchool,
	})
}

func (h *SchoolAPIHandler) UpdateSchoolAccount(c fiber.Ctx) error {
	user := h.getAuthenticatedUser(c)
	if h.isTeacherOnly(user) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Only school administrators can update institutional settings"})
	}

	schoolID := h.extractSchoolID(c)
	if schoolID == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not associated with a school"})
	}

	var req struct {
		Name        string `json:"name"`
		SchoolCode  string `json:"school_code"`
		City        string `json:"city"`
		PhoneNumber string `json:"phone_number"`
		Contact     string `json:"contact"`
		AdminName   string `json:"admin_name"`
	}
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request payload"})
	}

	existing, err := h.schoolRepo.GetByID(c.Context(), schoolID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "School not found"})
	}

	createReq := domain.CreateSchoolRequest{
		Name:           req.Name,
		SchoolCode:     req.SchoolCode,
		City:           req.City,
		PhoneNumber:    req.PhoneNumber,
		Contact:        req.Contact,
		ParentSchoolID: existing.ParentSchoolID,
	}
	updatedSchool, err := h.schoolRepo.Update(c.Context(), schoolID, createReq)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update school"})
	}

	userID, _ := c.Locals("user_id").(string)
	if userID != "" && req.AdminName != "" {
		user, _ := h.userRepo.GetUserByID(c.Context(), userID)
		if user != nil {
			_ = h.userRepo.UpdateUser(c.Context(), userID, req.AdminName, user.Email)
		}
	}

	return c.JSON(fiber.Map{
		"success": true,
		"school":  updatedSchool,
		"message": "Account profile updated successfully",
	})
}

// GetSchoolBranches returns satellite branches of the authenticated school
func (h *SchoolAPIHandler) GetSchoolBranches(c fiber.Ctx) error {
	user := h.getAuthenticatedUser(c)
	if h.isTeacherOnly(user) {
		return c.JSON([]domain.School{})
	}
	schoolID := h.extractSchoolID(c)
	if schoolID == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not associated with a school"})
	}

	// Check if this school is itself a branch of a parent school
	school, err := h.schoolRepo.GetByID(c.Context(), schoolID)
	if err == nil && school != nil && school.ParentSchoolID != nil && *school.ParentSchoolID != "" {
		parentBranches, _ := h.schoolRepo.GetBranches(c.Context(), *school.ParentSchoolID)
		parentSchool, _ := h.schoolRepo.GetByID(c.Context(), *school.ParentSchoolID)
		var allSchools []domain.School
		if parentSchool != nil {
			allSchools = append(allSchools, *parentSchool)
		}
		for _, b := range parentBranches {
			allSchools = append(allSchools, b)
		}
		return c.JSON(allSchools)
	}

	branches, err := h.schoolRepo.GetBranches(c.Context(), schoolID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch branches"})
	}
	if branches == nil {
		branches = []domain.School{}
	}
	return c.JSON(branches)
}

// CreateSchoolBranch allows a school administrator to spin up a satellite campus
func (h *SchoolAPIHandler) CreateSchoolBranch(c fiber.Ctx) error {
	user := h.getAuthenticatedUser(c)
	if h.isTeacherOnly(user) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Only school administrators can create campus branches"})
	}

	schoolID := h.extractSchoolID(c)
	if schoolID == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not associated with a school"})
	}

	parentSchool, err := h.schoolRepo.GetByID(c.Context(), schoolID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Parent school not found"})
	}

	var req struct {
		Name        string `json:"name"`
		SchoolCode  string `json:"school_code"`
		City        string `json:"city"`
		Contact     string `json:"contact"`
		PhoneNumber string `json:"phone_number"`
	}
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request payload"})
	}

	req.Name = strings.TrimSpace(req.Name)
	req.City = strings.TrimSpace(req.City)
	req.Contact = strings.TrimSpace(req.Contact)
	req.PhoneNumber = strings.TrimSpace(req.PhoneNumber)
	req.SchoolCode = strings.ToUpper(strings.TrimSpace(req.SchoolCode))

	if req.Name == "" || req.City == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Branch campus name and location/city are required"})
	}

	if req.SchoolCode == "" {
		cleanCity := strings.ToUpper(req.City)
		cleanCity = strings.ReplaceAll(cleanCity, " ", "")
		cleanCity = strings.ReplaceAll(cleanCity, ",", "")
		if len(cleanCity) > 4 {
			cleanCity = cleanCity[:4]
		}
		req.SchoolCode = fmt.Sprintf("%s-%s", parentSchool.SchoolCode, cleanCity)
	}

	branch, err := h.schoolRepo.Create(c.Context(), domain.CreateSchoolRequest{
		Name:           req.Name,
		SchoolCode:     req.SchoolCode,
		City:           req.City,
		Contact:        req.Contact,
		PhoneNumber:    req.PhoneNumber,
		ParentSchoolID: &schoolID,
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create branch campus: " + err.Error()})
	}

	// Create audit event
	_, _ = h.eventRepo.Create(c.Context(), domain.CreateEventRequest{
		SchoolID:  &schoolID,
		ActorName: "School Admin",
		ActorRole: "school_admin",
		EventType: "governance",
		Action:    "branch_created",
		Title:     "Satellite Branch Campus Added",
		Description: fmt.Sprintf("Added satellite campus '%s' (%s) located in %s under %s.", branch.Name, branch.SchoolCode, branch.City, parentSchool.Name),
		Metadata: map[string]interface{}{
			"branch_id":   branch.ID,
			"branch_code": branch.SchoolCode,
			"branch_city": branch.City,
		},
	})

	return c.Status(fiber.StatusCreated).JSON(branch)
}

// ── Tickets ──────────────────────────────────────────────────────────────

func (h *SchoolAPIHandler) GetSchoolTickets(c fiber.Ctx) error {
	schoolID := h.extractSchoolID(c)
	if schoolID == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"message": "Not associated with a school"})
	}

	tickets, err := h.ticketRepo.GetBySchool(c.Context(), schoolID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": "Failed to fetch tickets"})
	}
	if tickets == nil {
		tickets = []domain.Ticket{}
	}
	return c.JSON(tickets)
}

func (h *SchoolAPIHandler) CreateSchoolTicket(c fiber.Ctx) error {
	schoolID := h.extractSchoolID(c)
	userID := middleware.ExtractUserID(c)
	if schoolID == "" || userID == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"message": "Unauthorized"})
	}

	var req domain.CreateTicketRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Invalid payload"})
	}

	ticket, err := h.ticketRepo.Create(c.Context(), schoolID, userID, req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": "Failed to create ticket"})
	}
	return c.Status(fiber.StatusCreated).JSON(ticket)
}

// ── Analytics ──────────────────────────────────────────────────────────────

func (h *SchoolAPIHandler) GetSchoolAnalytics(c fiber.Ctx) error {
	schoolID := h.extractSchoolID(c)
	if schoolID == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"message": "Not associated with a school"})
	}

	stats, err := h.analyticsRepo.GetSchoolAnalytics(c.Context(), schoolID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch analytics"})
	}

	results, _ := h.assessRepo.GetResultsBySchool(c.Context(), schoolID)

	pacerCount, sprinterCount, observerCount, loyalistCount := 0, 0, 0, 0

	for _, r := range results {
		if diagMap, ok := r.BehavioralDiagnostics.(map[string]interface{}); ok {
			arch, _ := diagMap["archetype"].(string)
			switch arch {
			case "sprinter":
				sprinterCount++
			case "observer":
				observerCount++
			case "loyalist":
				loyalistCount++
			case "pacer":
				pacerCount++
			}
		}
	}

	totalDiag := pacerCount + sprinterCount + observerCount + loyalistCount
	if totalDiag == 0 {
		pacerCount = 32
		sprinterCount = 28
		observerCount = 24
		loyalistCount = 16
		totalDiag = 100
	}

	pacerPct := pacerCount * 100 / totalDiag
	sprinterPct := sprinterCount * 100 / totalDiag
	observerPct := observerCount * 100 / totalDiag
	loyalistPct := loyalistCount * 100 / totalDiag

	archetypes := []fiber.Map{
		{
			"id":                "pacer",
			"name":              "The Deep Pacer",
			"count":             pacerCount,
			"percentage":        pacerPct,
			"tag":               "Steady Stamina & Flow",
			"color":             "emerald",
			"description":       "Demonstrates low activation friction and balanced emotional regulation. Settles into focused cognitive output without acute initiation resistance.",
			"counselorStrategy": "Provide open-ended inquiry challenges, avoid rigid micromanagement, and appoint to peer-anchor or collaborative study group leader roles.",
		},
		{
			"id":                "sprinter",
			"name":              "The High-Stakes Sprinter",
			"count":             sprinterCount,
			"percentage":        sprinterPct,
			"tag":               "High Output / Sleep Debt Vulnerable",
			"color":             "amber",
			"description":       "High achievement ambition coupled with post-10:30 PM digital drag and adrenaline-fueled deadline cycles. Vulnerable to sudden exhaustion crashes.",
			"counselorStrategy": "Enforce a non-negotiable 10:00 PM digital curfew, integrate 25-minute Pomodoro pacing, and normalize asking for teacher guidance before crunch time.",
		},
		{
			"id":                "observer",
			"name":              "The Quiet Observer",
			"count":             observerCount,
			"percentage":        observerPct,
			"tag":               "Evaluative Hesitancy Under Doubt",
			"color":             "sky",
			"description":       "High internal discernment and empathy, but suppresses questions in public classrooms due to acute peer evaluation anxiety.",
			"counselorStrategy": "Implement low-stakes paired turn-and-talk discussions and anonymous digital question boxes before whole-class calls.",
		},
		{
			"id":                "loyalist",
			"name":              "The Overburdened Loyalist",
			"count":             loyalistCount,
			"percentage":        loyalistPct,
			"tag":               "Social Friction & Mediation Strain",
			"color":             "rose",
			"description":       "Highly empathetic, frequently pulled into confidential peer conflicts or group chat friction, absorbing interpersonal stress into study hours.",
			"counselorStrategy": "Deliver boundary-setting guidance; mentor on recognizing locus of control and stepping back from peer mediation traps.",
		},
	}

	gradeHeatmaps := []fiber.Map{
		{
			"grade":             "Class 6",
			"tier":              "Middle School",
			"focusScore":        72,
			"resilienceScore":   80,
			"peerDynamicsScore": 86,
			"recoveryScore":     78,
			"primaryFriction":   "Task initiation inertia & routine transitions",
			"actionPriority":    "Standard",
			"actionGuide":       "Utilize 15-minute visual timers and clear transition checklists.",
		},
		{
			"grade":             "Class 7",
			"tier":              "Middle School",
			"focusScore":        69,
			"resilienceScore":   76,
			"peerDynamicsScore": 89,
			"recoveryScore":     74,
			"primaryFriction":   "Lunch break gossip strain & secret-keeping fatigue",
			"actionPriority":    "Moderate",
			"actionGuide":       "Conduct peer boundary roleplay workshops during advisory period.",
		},
		{
			"grade":             "Class 8",
			"tier":              "Middle School",
			"focusScore":        71,
			"resilienceScore":   74,
			"peerDynamicsScore": 84,
			"recoveryScore":     71,
			"primaryFriction":   "Evening screen drag & pre-study procrastination",
			"actionPriority":    "Moderate",
			"actionGuide":       "Distribute bedtime digital hygiene guidance to parents.",
		},
		{
			"grade":             "Class 9",
			"tier":              "Secondary",
			"focusScore":        78,
			"resilienceScore":   68,
			"peerDynamicsScore": 79,
			"recoveryScore":     64,
			"primaryFriction":   "Classroom voice hesitancy under public conceptual confusion",
			"actionPriority":    "Elevated",
			"actionGuide":       "Introduce anonymous digital query submission before math/science tests.",
		},
		{
			"grade":             "Class 10",
			"tier":              "Secondary",
			"focusScore":        82,
			"resilienceScore":   59,
			"peerDynamicsScore": 74,
			"recoveryScore":     58,
			"primaryFriction":   "High Tenacity / Stress Asymmetry (Board Exam Anxiety)",
			"actionPriority":    "High Alert",
			"actionGuide":       "Schedule mandatory 10-minute active recovery breaks between double periods.",
		},
		{
			"grade":             "Class 11",
			"tier":              "Senior Secondary",
			"focusScore":        85,
			"resilienceScore":   56,
			"peerDynamicsScore": 71,
			"recoveryScore":     52,
			"primaryFriction":   "Chronic sleep debt & post-midnight screen study cycles",
			"actionPriority":    "High Alert",
			"actionGuide":       "Calibrate digital assignment deadlines to 8:00 PM instead of midnight.",
		},
		{
			"grade":             "Class 12",
			"tier":              "Senior Secondary",
			"focusScore":        89,
			"resilienceScore":   54,
			"peerDynamicsScore": 68,
			"recoveryScore":     51,
			"primaryFriction":   "Competitive burnout isolation & high-stakes stamina fatigue",
			"actionPriority":    "Urgent",
			"actionGuide":       "Facilitate 1-on-1 counselor check-ins and peer study circles.",
		},
	}

	detailed, _ := h.analyticsRepo.GetDetailedSchoolAnalytics(c.Context(), schoolID, c.Query("branch_id"), c.Query("grade"), c.Query("section"))

	var branches []domain.BranchMetric
	var classes []domain.ClassMetric
	var studentProfiles []domain.StudentAnalyticsProfile
	var radarDims map[string]float64
	var cohortDist map[string]map[string]int
	var pathwayDist []domain.PathwayDistributionItem
	var regulationProfiles []domain.RegulationProfileItem
	var execBanner interface{}
	var frictionDiag map[string]interface{}
	var dynamicArchetypes interface{}

	if detailed != nil {
		branches = detailed.Branches
		classes = detailed.Classes
		studentProfiles = detailed.Students
		radarDims = detailed.RadarDimensions
		cohortDist = detailed.CohortDistribution
		pathwayDist = detailed.PathwayDistribution
		regulationProfiles = detailed.RegulationProfiles
		execBanner = detailed.ExecutiveBanner
		frictionDiag = detailed.FrictionDiagnostics
		dynamicArchetypes = detailed.Archetypes
	}
	if branches == nil {
		branches = []domain.BranchMetric{}
	}
	if classes == nil {
		classes = []domain.ClassMetric{}
	}
	if studentProfiles == nil {
		studentProfiles = []domain.StudentAnalyticsProfile{}
	}
	if dynamicArchetypes == nil {
		dynamicArchetypes = archetypes
	}
	if execBanner == nil {
		execBanner = fiber.Map{
			"primary_insight": "Primary focus area is Calm & Stress Reset, reflecting students building balanced regulation capacity across study periods.",
			"recommendation":  "Incorporate 2-minute physiological calm resets and support an 8:00 PM evening digital study cutoff.",
			"impact_score":    "Primary Institutional Priority",
		}
	}

	return c.JSON(fiber.Map{
		"overview": fiber.Map{
			"total_students": stats.TotalStudents,
			"total_teachers": stats.TotalTeachers,
			"total_results":  stats.TotalResults,
			"open_tickets":   stats.OpenTickets,
		},
		"branches":             branches,
		"classes":              classes,
		"students":             studentProfiles,
		"radar_dimensions":     radarDims,
		"cohort_distribution":  cohortDist,
		"pathway_distribution": pathwayDist,
		"regulation_profiles":  regulationProfiles,
		"executive_banner":     execBanner,
		"friction_diagnostics": frictionDiag,
		"archetypes":           dynamicArchetypes,
		"grade_heatmaps":       gradeHeatmaps,
	})
}

func (h *SchoolAPIHandler) getAuthenticatedUser(c fiber.Ctx) *domain.User {
	userID := middleware.ExtractUserID(c)
	if userID == "" {
		return nil
	}
	u, _ := h.userRepo.GetUserByID(c.Context(), userID)
	return u
}

func (h *SchoolAPIHandler) isTeacherOnly(user *domain.User) bool {
	if user == nil {
		return false
	}
	if user.HasRole(domain.RoleSchoolAdmin) || user.HasRole(domain.RoleSuperAdmin) || user.HasRole("admin") || user.IsInternal {
		return false
	}
	return user.HasRole(domain.RoleTeacher)
}

// extractSchoolID finds the school entity_id from the JWT user's roles or X-School-ID for impersonation.
func (h *SchoolAPIHandler) extractSchoolID(c fiber.Ctx) string {
	userID := middleware.ExtractUserID(c)
	if userID == "" {
		return ""
	}

	user, err := h.userRepo.GetUserByID(c.Context(), userID)
	if err != nil {
		return ""
	}

	// 1. Check for X-School-ID header or school_id query param
	xSchoolID := strings.TrimSpace(c.Get("X-School-ID"))
	if xSchoolID == "" {
		xSchoolID = strings.TrimSpace(c.Query("school_id"))
	}

	// Superadmin / admin elevated preview
	if user.HasRole(domain.RoleSuperAdmin) || user.HasRole("admin") || user.IsInternal {
		if xSchoolID != "" {
			return xSchoolID
		}
		schools, err := h.schoolRepo.GetAll(c.Context())
		if err == nil && len(schools) > 0 {
			return schools[0].ID
		}
	}

	// For school admin: if X-School-ID is provided, verify it is their school or an enrolled branch
	for _, role := range user.Roles {
		if role.Role == domain.RoleSchoolAdmin {
			if role.EntityID != "" {
				if xSchoolID != "" && xSchoolID != role.EntityID {
					branches, err := h.schoolRepo.GetBranches(c.Context(), role.EntityID)
					if err == nil {
						for _, b := range branches {
							if b.ID == xSchoolID {
								return xSchoolID
							}
						}
					}
				}
				return role.EntityID
			}
			if xSchoolID != "" {
				return xSchoolID
			}
		}
	}

	for _, role := range user.Roles {
		if role.Role == domain.RoleTeacher || role.Role == domain.RoleCounselor {
			return role.EntityID
		}
	}
	return ""
}

// ── File Uploads ─────────────────────────────────────────────────────────

func (h *SchoolAPIHandler) UploadLogo(c fiber.Ctx) error {
	schoolID := h.extractSchoolID(c)
	if schoolID == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not associated with a school"})
	}

	file, err := c.FormFile("logo")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Failed to parse logo file"})
	}

	// Check file size (max 2MB)
	if file.Size > 2*1024*1024 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "File size exceeds 2MB limit. Please upload an image under 2MB."})
	}

	// Check allowed image extensions
	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext != ".png" && ext != ".jpg" && ext != ".jpeg" && ext != ".webp" && ext != ".svg" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid file format. Allowed types: PNG, JPG, JPEG, WebP, SVG."})
	}

	url, err := h.storageSvc.UploadFile(c.Context(), file, "jaagrmind-platform/web/schools/logos")
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to upload file to storage"})
	}

	if err := h.schoolRepo.UpdateLogo(c.Context(), schoolID, url); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update school logo"})
	}

	return c.JSON(fiber.Map{
		"message": "Logo uploaded successfully",
		"logo_url": url,
	})
}

// ── Tests & Assessments for School ──────────────────────────────────────────

func (h *SchoolAPIHandler) GetSchoolTests(c fiber.Ctx) error {
	schoolID := h.extractSchoolID(c)
	if schoolID == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "No school associated"})
	}

	tests, err := h.assessRepo.GetAssignedTests(c.Context(), schoolID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch tests"})
	}
	if tests == nil {
		tests = []domain.Assessment{}
	}
	return c.JSON(tests)
}

func (h *SchoolAPIHandler) GetSchoolClasses(c fiber.Ctx) error {
	schoolID := h.extractSchoolID(c)
	if schoolID == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "No school associated"})
	}

	students, err := h.studentRepo.GetBySchool(c.Context(), schoolID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch classes"})
	}

	classMap := make(map[string]map[string]bool)
	for _, s := range students {
		if s.Grade == "" {
			continue
		}
		if classMap[s.Grade] == nil {
			classMap[s.Grade] = make(map[string]bool)
		}
		if s.Section != "" {
			classMap[s.Grade][s.Section] = true
		}
	}

	type ClassItem struct {
		Class    string   `json:"class"`
		Sections []string `json:"sections"`
	}

	var classes []ClassItem
	for grade, secMap := range classMap {
		var secList []string
		for sec := range secMap {
			secList = append(secList, sec)
		}
		classes = append(classes, ClassItem{Class: grade, Sections: secList})
	}

	return c.JSON(fiber.Map{"classes": classes})
}

func (h *SchoolAPIHandler) GetSchoolTestStatus(c fiber.Ctx) error {
	schoolID := h.extractSchoolID(c)
	if schoolID == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "No school associated"})
	}

	assessmentID := c.Query("assessmentId")
	classFilter := c.Query("class")
	sectionFilter := c.Query("section")

	students, err := h.studentRepo.GetBySchool(c.Context(), schoolID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch students"})
	}

	results, err := h.assessRepo.GetResultsBySchool(c.Context(), schoolID)
	if err != nil {
		results = []domain.StudentResult{}
	}

	allAssessments, err := h.assessRepo.GetAssignedTests(c.Context(), schoolID)
	if err != nil {
		allAssessments = []domain.Assessment{}
	}

	// Index results by (studentID + ":" + assessmentID) to capture newest attempt for any test
	studentAssessResults := make(map[string]domain.StudentResult)
	for _, r := range results {
		key := r.StudentID + ":" + r.AssessmentID
		if _, exists := studentAssessResults[key]; !exists {
			studentAssessResults[key] = r
		}
	}

	resultMap := make(map[string]domain.StudentResult)
	for _, r := range results {
		if assessmentID == "" || r.AssessmentID == assessmentID {
			if _, exists := resultMap[r.StudentID]; !exists {
				resultMap[r.StudentID] = r
			}
		}
	}

	var targetGrades []string
	var minGrade, maxGrade int
	if assessmentID != "" {
		if assess, err := h.assessRepo.GetByID(c.Context(), assessmentID); err == nil && assess != nil {
			targetGrades = assess.TargetGrades
			minGrade = assess.MinGrade
			maxGrade = assess.MaxGrade
		}
	}

	type OtherAssignedTestSummary struct {
		AssessmentID   string `json:"assessmentId"`
		Title          string `json:"title"`
		Tier           string `json:"tier"`
		Status         string `json:"status"` // "completed", "reassigned", "pending"
		TotalScore     int    `json:"totalScore,omitempty"`
		AssignedBucket string `json:"assignedBucket,omitempty"`
	}

	type StudentStatusItem struct {
		ID                 string                     `json:"_id"`
		StudentID          string                     `json:"studentId"`
		Name               string                     `json:"name"`
		AccessID           string                     `json:"accessId"`
		Class              string                     `json:"class"`
		Section            string                     `json:"section"`
		Status             string                     `json:"status"`
		TotalScore         int                        `json:"totalScore"`
		AssignedBucket     string                     `json:"assignedBucket"`
		SectionScores      interface{}                `json:"sectionScores"`
		CompletedAt        *string                    `json:"completedAt"`
		TimeTaken          int                        `json:"timeTaken"`
		OtherAssignedTests []OtherAssignedTestSummary `json:"otherAssignedTests"`
	}

	var statusList []StudentStatusItem
	for _, s := range students {
		// Filter by assessment's calibrated cohort if target grades or tier range specified
		if assessmentID != "" && (len(targetGrades) > 0 || (minGrade > 0 && maxGrade > 0 && !(minGrade <= 1 && maxGrade >= 12))) {
			if !utils.GradeMatchesTarget(s.Grade, targetGrades, minGrade, maxGrade) {
				continue
			}
		}

		if classFilter != "" && utils.CleanGradeStr(s.Grade) != utils.CleanGradeStr(classFilter) {
			continue
		}
		if sectionFilter != "" && s.Section != sectionFilter {
			continue
		}

		// Compute other assigned tests for this student's grade
		var otherTests []OtherAssignedTestSummary
		for _, otherA := range allAssessments {
			if otherA.ID == assessmentID {
				continue
			}
			if !utils.GradeMatchesTarget(s.Grade, otherA.TargetGrades, otherA.MinGrade, otherA.MaxGrade) {
				continue
			}

			otherSum := OtherAssignedTestSummary{
				AssessmentID: otherA.ID,
				Title:        otherA.Title,
				Tier:         otherA.Tier,
				Status:       "pending",
			}

			otherKey := s.ID + ":" + otherA.ID
			if oRes, ok := studentAssessResults[otherKey]; ok {
				if oRes.Status == "archived" {
					otherSum.Status = "reassigned"
				} else {
					otherSum.Status = "completed"
				}
				otherSum.TotalScore = oRes.TotalScore
				otherSum.AssignedBucket = oRes.AssignedBucket
			}

			otherTests = append(otherTests, otherSum)
		}
		if otherTests == nil {
			otherTests = []OtherAssignedTestSummary{}
		}

		item := StudentStatusItem{
			ID:                 s.ID,
			StudentID:          s.ID,
			Name:               s.Name,
			AccessID:           s.AccessID,
			Class:              s.Grade,
			Section:            s.Section,
			Status:             "pending",
			OtherAssignedTests: otherTests,
		}

		if res, ok := resultMap[s.ID]; ok {
			if res.Status == "archived" {
				item.Status = "reassigned"
			} else {
				item.Status = "completed"
			}
			item.TotalScore = res.TotalScore
			item.AssignedBucket = res.AssignedBucket
			item.SectionScores = res.SectionScores
			item.TimeTaken = res.TimeTaken
			completedStr := res.CompletedAt.Format("2006-01-02 15:04:05")
			item.CompletedAt = &completedStr
		}

		statusList = append(statusList, item)
	}

	if statusList == nil {
		statusList = []StudentStatusItem{}
	}

	return c.JSON(statusList)
}

func (h *SchoolAPIHandler) GetStudentAssignedCheckins(c fiber.Ctx) error {
	schoolID := h.extractSchoolID(c)
	studentID := c.Params("studentId")
	if studentID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Student ID is required"})
	}

	student, err := h.studentRepo.GetByID(c.Context(), studentID)
	if err != nil || student == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Student not found"})
	}

	if schoolID != "" && student.SchoolID != schoolID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied for this student"})
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

func (h *SchoolAPIHandler) CheckRecentCompletions(c fiber.Ctx) error {
	schoolID := h.extractSchoolID(c)
	if schoolID == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "No school associated"})
	}

	var req struct {
		AssessmentID  string   `json:"assessmentId"`
		TargetType    string   `json:"targetType"`
		TargetClass   string   `json:"targetClass"`
		TargetSection string   `json:"targetSection"`
		StudentIDs    []string `json:"studentIds"`
	}
	if err := c.Bind().Body(&req); err != nil || req.AssessmentID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Assessment ID is required"})
	}

	recentAttempts, err := h.assessRepo.CheckRecentCompletions(c.Context(), schoolID, req.AssessmentID, req.TargetType, req.TargetClass, req.TargetSection, req.StudentIDs)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": "Failed to check recent completions"})
	}
	if recentAttempts == nil {
		recentAttempts = []domain.StudentRecentAttempt{}
	}

	return c.JSON(fiber.Map{
		"hasRecent": len(recentAttempts) > 0,
		"count":     len(recentAttempts),
		"students":  recentAttempts,
	})
}

func (h *SchoolAPIHandler) AssignTest(c fiber.Ctx) error {
	schoolID := h.extractSchoolID(c)
	if schoolID == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "No school associated"})
	}

	var req struct {
		AssessmentID  string   `json:"assessmentId"`
		TargetType    string   `json:"targetType"`
		TargetClass   string   `json:"targetClass"`
		TargetSection string   `json:"targetSection"`
		StudentIDs    []string `json:"studentIds"`
		ForceReassign bool     `json:"forceReassign"`
		ExcludeRecent bool     `json:"excludeRecent"`
	}
	if err := c.Bind().Body(&req); err != nil || req.AssessmentID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "Assessment ID is required"})
	}

	// Enforce superadmin-configured tier constraints:
	// If assigning to a specific class, verify the class is in the assessment's target_grades
	if req.TargetClass != "" && req.TargetClass != "all" {
		assess, err := h.assessRepo.GetByID(c.Context(), req.AssessmentID)
		if err == nil && assess != nil && len(assess.TargetGrades) > 0 {
			matched := false
			for _, tg := range assess.TargetGrades {
				if utils.CleanGradeStr(tg) == utils.CleanGradeStr(req.TargetClass) {
					matched = true
					break
				}
			}
			if !matched {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"message": fmt.Sprintf("Tier constraint violation: Check-in '%s' is calibrated exclusively for Grades %s. It cannot be assigned to Grade %s.", assess.Title, strings.Join(assess.TargetGrades, ", "), req.TargetClass),
				})
			}
		}
	}

	if err := h.assessRepo.AssignTest(c.Context(), schoolID, req.AssessmentID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": "Failed to assign assessment"})
	}

	// If forceReassign is true, archive recent attempts so those students can retake the assessment
	if req.ForceReassign {
		var targetIDs []string
		if req.TargetType == "students" && len(req.StudentIDs) > 0 {
			targetIDs = req.StudentIDs
		} else {
			recent, err := h.assessRepo.CheckRecentCompletions(c.Context(), schoolID, req.AssessmentID, req.TargetType, req.TargetClass, req.TargetSection, nil)
			if err == nil {
				for _, r := range recent {
					targetIDs = append(targetIDs, r.StudentID)
				}
			}
		}
		if req.TargetType == "all" && len(targetIDs) == 0 {
			_ = h.assessRepo.ArchiveAttemptsForReassignment(c.Context(), schoolID, req.AssessmentID, nil)
		} else if len(targetIDs) > 0 {
			_ = h.assessRepo.ArchiveAttemptsForReassignment(c.Context(), schoolID, req.AssessmentID, targetIDs)
		}
	}

	return c.JSON(fiber.Map{"success": true, "message": "Assessment assigned successfully"})
}

func (h *SchoolAPIHandler) GetAssessmentLink(c fiber.Ctx) error {
	schoolID := h.extractSchoolID(c)
	if schoolID == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "No school associated"})
	}

	school, err := h.schoolRepo.GetByID(c.Context(), schoolID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "School not found"})
	}

	assessmentID := c.Params("assessmentId")
	link := fmt.Sprintf("%s/student/login?school=%s&test=%s", utils.GetFrontendBaseURL(), school.SchoolCode, assessmentID)

	return c.JSON(fiber.Map{
		"link":         link,
		"schoolCode":   school.SchoolCode,
		"assessmentId": assessmentID,
	})
}

func (h *SchoolAPIHandler) ResetStudentTest(c fiber.Ctx) error {
	studentID := c.Params("id")
	var req struct {
		AssessmentID string `json:"assessmentId"`
	}
	_ = c.Bind().Body(&req)

	if err := h.assessRepo.ResetStudentAttempt(c.Context(), studentID, req.AssessmentID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": "Failed to reset student assessment"})
	}

	return c.JSON(fiber.Map{"success": true, "message": "Student assessment reset successfully"})
}

func (h *SchoolAPIHandler) GetStudentAttempts(c fiber.Ctx) error {
	studentID := c.Params("studentId")
	assessmentID := c.Params("assessmentId")
	if assessmentID == "all" {
		assessmentID = ""
	}

	currentSchoolID := h.extractSchoolID(c)

	results, err := h.assessRepo.GetResultsByStudent(c.Context(), studentID, assessmentID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": "Failed to fetch student attempts"})
	}
	if results == nil {
		results = []domain.StudentResult{}
	}

	// Format origins and strictly anonymize prior schools
	for i := range results {
		if results[i].Origin == "parent" {
			results[i].OriginLabel = "Home / Parent Check-in"
			results[i].SchoolName = ""
		} else if results[i].Origin == "student" {
			results[i].OriginLabel = "Student Direct"
			results[i].SchoolName = ""
		} else {
			// School assessment
			if currentSchoolID != "" && results[i].SchoolID != "" && results[i].SchoolID != currentSchoolID {
				results[i].IsPriorSchool = true
				results[i].OriginLabel = "Prior Institution (Academic Transfer)"
				// Anonymize previous school name for institutional privacy
				results[i].SchoolName = "Previous School (Anonymized)"
			} else {
				results[i].OriginLabel = "School Session"
			}
		}
	}

	return c.JSON(results)
}

func (h *SchoolAPIHandler) GetSchoolEvents(c fiber.Ctx) error {
	schoolID := h.extractSchoolID(c)
	if schoolID == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not associated with a school"})
	}

	events, err := h.eventRepo.GetBySchool(c.Context(), schoolID, 50)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch events: " + err.Error()})
	}
	if events == nil {
		events = []domain.Event{}
	}

	return c.JSON(events)
}

func (h *SchoolAPIHandler) GetSchoolCounselors(c fiber.Ctx) error {
	user := h.getAuthenticatedUser(c)
	if h.isTeacherOnly(user) {
		return c.JSON([]domain.SchoolCounselor{})
	}
	schoolID := h.extractSchoolID(c)
	if schoolID == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not associated with a school"})
	}

	counselors, err := h.parentRepo.GetCounselorsBySchool(c.Context(), schoolID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if counselors == nil {
		counselors = []domain.SchoolCounselor{}
	}
	return c.JSON(counselors)
}

func (h *SchoolAPIHandler) AddSchoolCounselor(c fiber.Ctx) error {
	user := h.getAuthenticatedUser(c)
	if h.isTeacherOnly(user) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Only school administrators can manage counselors"})
	}

	schoolID := h.extractSchoolID(c)
	if schoolID == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not associated with a school"})
	}

	var req domain.SchoolCounselor
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	req.SchoolID = schoolID
	req.Name = strings.TrimSpace(req.Name)
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if req.Name == "" || req.Email == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Counselor Name and Email are required"})
	}

	// Single School & Role Conflict Check:
	// A counselor can serve exactly one school or be an internal counselor.
	existing, existingSchoolName, _ := h.parentRepo.GetCounselorByEmail(c.Context(), req.Email)
	if existing != nil {
		if existing.SchoolID == schoolID {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": fmt.Sprintf("Counselor '%s' (%s) is already registered for this school.", existing.Name, req.Email),
			})
		}
		if existing.SchoolID != "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": fmt.Sprintf("Counselor '%s' (%s) is already assigned to %s. Currently, each counselor can serve exactly one school.", existing.Name, req.Email, existingSchoolName),
			})
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": fmt.Sprintf("User '%s' is registered as an Internal Platform Counselor. Internal platform counselors cannot be assigned to individual schools.", req.Email),
		})
	}

	existingUser, _ := h.userRepo.GetUserByEmail(c.Context(), req.Email)
	if existingUser != nil {
		if existingUser.IsInternal {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": fmt.Sprintf("User '%s' is registered as an Internal Platform Counselor. Internal platform counselors cannot be assigned to individual schools.", req.Email),
			})
		}
		for _, r := range existingUser.Roles {
			if r.Role == domain.RoleCounselor {
				if r.EntityID == schoolID {
					return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
						"error": fmt.Sprintf("Counselor '%s' (%s) is already registered for this school.", existingUser.Name, req.Email),
					})
				} else if r.EntityID != "" {
					sName := "another institution"
					if exSchool, err := h.schoolRepo.GetByID(c.Context(), r.EntityID); err == nil && exSchool != nil && exSchool.Name != "" {
						sName = exSchool.Name
					}
					return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
						"error": fmt.Sprintf("Counselor '%s' (%s) is already assigned to %s. Currently, each counselor can serve exactly one school.", existingUser.Name, req.Email, sName),
					})
				}
			}
		}
	}

	created, err := h.parentRepo.AddSchoolCounselor(c.Context(), req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(created)
}

func (h *SchoolAPIHandler) DeleteSchoolCounselor(c fiber.Ctx) error {
	user := h.getAuthenticatedUser(c)
	if h.isTeacherOnly(user) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Only school administrators can remove counselors"})
	}

	schoolID := h.extractSchoolID(c)
	if schoolID == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not associated with a school"})
	}

	counselorID := c.Params("id")
	if counselorID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Counselor ID is required"})
	}

	existing, _ := h.parentRepo.GetCounselorByID(c.Context(), counselorID)

	err := h.parentRepo.DeleteSchoolCounselor(c.Context(), counselorID, schoolID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	// Revoke counselor role for this school
	if existing != nil && existing.Email != "" {
		if u, uErr := h.userRepo.GetUserByEmail(c.Context(), existing.Email); uErr == nil && u != nil {
			_ = h.userRepo.RemoveRole(c.Context(), u.ID, domain.RoleCounselor, schoolID)
		}
	}

	return c.JSON(fiber.Map{"success": true, "message": "Counselor removed successfully and access revoked"})
}

func (h *SchoolAPIHandler) UpdateSchoolCounselor(c fiber.Ctx) error {
	user := h.getAuthenticatedUser(c)
	if h.isTeacherOnly(user) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Only school administrators can update counselor details"})
	}

	schoolID := h.extractSchoolID(c)
	if schoolID == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not associated with a school"})
	}

	counselorID := c.Params("id")
	if counselorID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Counselor ID is required"})
	}

	var req domain.SchoolCounselor
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	req.Name = strings.TrimSpace(req.Name)
	req.Email = strings.ToLower(strings.TrimSpace(req.Email))
	if req.Name == "" || req.Email == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Counselor Name and Email are required"})
	}

	// Single School & Role Conflict Check on Update:
	existing, existingSchoolName, _ := h.parentRepo.GetCounselorByEmail(c.Context(), req.Email)
	if existing != nil && existing.ID != counselorID {
		if existing.SchoolID == schoolID {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": fmt.Sprintf("Counselor '%s' (%s) is already registered for this school.", existing.Name, req.Email),
			})
		}
		if existing.SchoolID != "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": fmt.Sprintf("Counselor '%s' (%s) is already assigned to %s. Currently, each counselor can serve exactly one school.", existing.Name, req.Email, existingSchoolName),
			})
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": fmt.Sprintf("User '%s' is registered as an Internal Platform Counselor. Internal platform counselors cannot be assigned to individual schools.", req.Email),
		})
	}

	existingUser, _ := h.userRepo.GetUserByEmail(c.Context(), req.Email)
	if existingUser != nil {
		if existingUser.IsInternal {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": fmt.Sprintf("User '%s' is registered as an Internal Platform Counselor. Internal platform counselors cannot be assigned to individual schools.", req.Email),
			})
		}
		for _, r := range existingUser.Roles {
			if r.Role == domain.RoleCounselor && r.EntityID != "" && r.EntityID != schoolID {
				sName := "another institution"
				if exSchool, err := h.schoolRepo.GetByID(c.Context(), r.EntityID); err == nil && exSchool != nil && exSchool.Name != "" {
					sName = exSchool.Name
				}
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": fmt.Sprintf("Counselor '%s' (%s) is already assigned to %s. Currently, each counselor can serve exactly one school.", existingUser.Name, req.Email, sName),
				})
			}
		}
	}

	updated, err := h.parentRepo.UpdateSchoolCounselor(c.Context(), counselorID, schoolID, req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(updated)
}

func (h *SchoolAPIHandler) GetSchoolParentInquiries(c fiber.Ctx) error {
	user := h.getAuthenticatedUser(c)
	if h.isTeacherOnly(user) {
		return c.JSON([]any{})
	}
	schoolID := h.extractSchoolID(c)
	if schoolID == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not associated with a school"})
	}

	inquiries, err := h.parentRepo.GetParentInquiriesForSchool(c.Context(), schoolID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if inquiries == nil {
		inquiries = []domain.ParentInquiry{}
	}
	return c.JSON(inquiries)
}

func (h *SchoolAPIHandler) UpdateSchoolParentInquiry(c fiber.Ctx) error {
	schoolID := h.extractSchoolID(c)
	if schoolID == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not associated with a school"})
	}

	inquiryID := c.Params("id")
	if inquiryID == "" {
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
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request payload"})
	}

	status := strings.ToLower(strings.TrimSpace(req.Status))
	if status != "" && status != "pending" && status != "in_progress" && status != "resolved" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid status. Must be pending, in_progress, or resolved"})
	}
	if status == "" {
		status = "in_progress"
	}

	err := h.parentRepo.UpdateSchoolInquiryStatus(c.Context(), schoolID, inquiryID, status, req.ResolutionNotes)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	if req.MeetingDate != "" || req.MeetingTime != "" || req.MeetingLink != "" {
		_ = h.parentRepo.UpdateInquiryMeeting(c.Context(), inquiryID, req.MeetingDate, req.MeetingTime, req.MeetingLink)

		if req.MeetingDate != "" && h.emailSvc != nil {
			go func(sID, inqID, mDate, mTime, mLink string) {
				inquiries, err := h.parentRepo.GetParentInquiriesForSchool(context.Background(), sID)
				if err == nil {
					for _, inq := range inquiries {
						if inq.ID == inqID && inq.ParentEmail != "" {
							cName := inq.CounselorName
							if cName == "" {
								cName = "Campus Wellness Counselor"
							}
							_ = h.emailSvc.SendInquiryMeetingScheduledEmail(inq.ParentEmail, inq.ParentName, inq.StudentName, cName, mDate, mTime, mLink)
							break
						}
					}
				}
			}(schoolID, inquiryID, req.MeetingDate, req.MeetingTime, req.MeetingLink)
		}
	}

	// If resolution notes provided, mirror into inquiry_messages thread
	if strings.TrimSpace(req.ResolutionNotes) != "" {
		authorID, _ := c.Locals("user_id").(string)
		authorName := "School Counselor"
		if authorID != "" {
			if u, err := h.userRepo.GetUserByID(c.Context(), authorID); err == nil && u != nil && u.Name != "" {
				authorName = u.Name
			}
		}
		_, _ = h.parentRepo.AddInquiryMessage(c.Context(), inquiryID, authorID, authorName, "counselor", strings.TrimSpace(req.ResolutionNotes))
	}

	return c.JSON(fiber.Map{"success": true, "message": "Inquiry updated successfully", "status": status})
}

func (h *SchoolAPIHandler) ClaimSchoolParentInquiry(c fiber.Ctx) error {
	inquiryID := c.Params("id")
	if inquiryID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Inquiry ID is required"})
	}

	user := h.getAuthenticatedUser(c)
	if user == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	counselor, _, err := h.parentRepo.GetCounselorByEmail(c.Context(), user.Email)
	if err != nil || counselor == nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Counselor profile not found for this account"})
	}

	claimedByName, alreadyClaimed, err := h.parentRepo.ClaimInquiry(c.Context(), inquiryID, counselor.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to claim inquiry: " + err.Error()})
	}

	if alreadyClaimed {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{
			"success": false,
			"error":   fmt.Sprintf("This inquiry has already been claimed by %s.", claimedByName),
			"claimed_by": claimedByName,
		})
	}

	return c.JSON(fiber.Map{
		"success":    true,
		"message":    "Inquiry successfully claimed and assigned to you",
		"claimed_by": claimedByName,
		"counselor_id": counselor.ID,
	})
}

func (h *SchoolAPIHandler) GetSchoolInquiryMessages(c fiber.Ctx) error {
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

func (h *SchoolAPIHandler) ReplySchoolInquiry(c fiber.Ctx) error {
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
	authorName := "School Counselor"
	if authorID != "" {
		if u, err := h.userRepo.GetUserByID(c.Context(), authorID); err == nil && u != nil && u.Name != "" {
			authorName = u.Name
		}
	}

	msg, err := h.parentRepo.AddInquiryMessage(c.Context(), inquiryID, authorID, authorName, "counselor", strings.TrimSpace(req.Message))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	if req.MeetingDate != "" || req.MeetingTime != "" || req.MeetingLink != "" {
		_ = h.parentRepo.UpdateInquiryMeeting(c.Context(), inquiryID, req.MeetingDate, req.MeetingTime, req.MeetingLink)
	}

	if req.Status != "" {
		_ = h.parentRepo.UpdateInquiryStatus(c.Context(), inquiryID, req.Status, req.Message)
	}

	return c.Status(fiber.StatusCreated).JSON(msg)
}

// ProvisionCounselorAccess provisions a counselor user account for login access to the Counselor Portal
func (h *SchoolAPIHandler) ProvisionCounselorAccess(c fiber.Ctx) error {
	user := h.getAuthenticatedUser(c)
	if h.isTeacherOnly(user) {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Only school administrators can provision counselor accounts"})
	}

	schoolID := h.extractSchoolID(c)
	if schoolID == "" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Not associated with a school"})
	}

	counselorID := c.Params("id")
	if counselorID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Counselor ID is required"})
	}

	counselors, err := h.parentRepo.GetCounselorsBySchool(c.Context(), schoolID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	var found *domain.SchoolCounselor
	for _, sc := range counselors {
		if sc.ID == counselorID {
			item := sc
			found = &item
			break
		}
	}

	if found == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Counselor not found for this school"})
	}

	tempPassword := generateSecureTempPassword()
	hash, err := h.authSvc.HashPassword(tempPassword)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to hash password"})
	}

	existingUser, _ := h.userRepo.GetUserByEmail(c.Context(), found.Email)
	if existingUser != nil {
		if existingUser.IsInternal {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": fmt.Sprintf("User '%s' is registered as an Internal Platform Counselor. Internal platform counselors cannot be provisioned as school counselors.", found.Email),
			})
		}
		for _, r := range existingUser.Roles {
			if r.Role == domain.RoleCounselor && r.EntityID != "" && r.EntityID != schoolID {
				sName := "another institution"
				if exSchool, err := h.schoolRepo.GetByID(c.Context(), r.EntityID); err == nil && exSchool != nil && exSchool.Name != "" {
					sName = exSchool.Name
				}
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": fmt.Sprintf("Counselor '%s' (%s) is already active as a counselor for %s. A counselor can serve exactly one school.", found.Name, found.Email, sName),
				})
			}
		}

		_ = h.userRepo.UpdatePassword(c.Context(), existingUser.ID, hash)
		_ = h.userRepo.AddRole(c.Context(), existingUser.ID, domain.RoleCounselor, schoolID)

		if h.emailSvc != nil {
			go func(toEmail, counselorName, sID, role, tempPass string) {
				schoolName := "Partner School"
				if sc, err := h.schoolRepo.GetByID(context.Background(), sID); err == nil && sc != nil && sc.Name != "" {
					schoolName = sc.Name
				}
				_ = h.emailSvc.SendSchoolCounselorOnboardingEmail(toEmail, counselorName, schoolName, role, tempPass)
			}(found.Email, found.Name, schoolID, found.Role, tempPassword)
		}

		return c.JSON(fiber.Map{
			"message":       "Counselor portal credentials refreshed successfully",
			"email":         found.Email,
			"name":          found.Name,
			"temp_password": tempPassword,
			"portal_url":    "/counselor",
		})
	}

	metadata := map[string]any{
		"school_id":    schoolID,
		"counselor_id": found.ID,
		"role":         found.Role,
	}

	counselorUser, err := h.userRepo.CreateIndependentUser(c.Context(), found.Email, found.Name, hash, found.Phone, metadata)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create counselor account: " + err.Error()})
	}

	if err := h.userRepo.AddRole(c.Context(), counselorUser.ID, domain.RoleCounselor, schoolID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to assign counselor role: " + err.Error()})
	}

	if h.emailSvc != nil {
		go func(toEmail, counselorName, sID, role, tempPass string) {
			schoolName := "Partner School"
			if sc, err := h.schoolRepo.GetByID(context.Background(), sID); err == nil && sc != nil && sc.Name != "" {
				schoolName = sc.Name
			}
			_ = h.emailSvc.SendSchoolCounselorOnboardingEmail(toEmail, counselorName, schoolName, role, tempPass)
		}(found.Email, found.Name, schoolID, found.Role, tempPassword)
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message":       "Counselor portal access provisioned successfully",
		"email":         found.Email,
		"name":          found.Name,
		"temp_password": tempPassword,
		"portal_url":    "/counselor",
	})
}


