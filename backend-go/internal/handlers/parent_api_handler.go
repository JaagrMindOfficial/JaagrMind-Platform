package handlers

import (
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/jaagrmind/platform-api/internal/core/domain"
	"github.com/jaagrmind/platform-api/internal/middleware"
)

type ParentAPIHandler struct {
	parentRepo  domain.ParentRepository
	userRepo    domain.UserRepository
	authService domain.AuthService
}

func SetupParentAPIRoutes(
	app *fiber.App,
	parentRepo domain.ParentRepository,
	userRepo domain.UserRepository,
	authService domain.AuthService,
	jwtSecret string,
) {
	h := &ParentAPIHandler{
		parentRepo:  parentRepo,
		userRepo:    userRepo,
		authService: authService,
	}

	api := app.Group("/api/parent", middleware.Protected(jwtSecret))
	api.Get("/overview", h.GetOverview)
	api.Get("/children", h.GetChildren)
	api.Post("/link-child", h.LinkChild)
	api.Post("/add-child", h.AddChild)
	api.Post("/counselor-note", h.SendCounselorNote)
	api.Get("/inquiries", h.GetParentInquiries)
	api.Get("/inquiries/:id/messages", h.GetInquiryMessages)
	api.Post("/inquiries/:id/reply", h.ReplyToInquiry)
	api.Post("/student-checkin/submit", h.SubmitStudentCheckin)
	api.Get("/student/:studentId/attempts", h.GetStudentAttempts)
	api.Get("/student/:studentId/dossier", h.GetStudentDossier)
}

func (h *ParentAPIHandler) GetOverview(c fiber.Ctx) error {
	parentID, ok := c.Locals("user_id").(string)
	if !ok || parentID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	selectedStudentID := c.Query("student_id")
	overview, err := h.parentRepo.GetParentOverview(c.Context(), parentID, selectedStudentID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(overview)
}

func (h *ParentAPIHandler) GetChildren(c fiber.Ctx) error {
	parentID, ok := c.Locals("user_id").(string)
	if !ok || parentID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	children, err := h.parentRepo.GetChildren(c.Context(), parentID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	if children == nil {
		children = []domain.ChildSummary{}
	}

	return c.JSON(children)
}

func (h *ParentAPIHandler) LinkChild(c fiber.Ctx) error {
	parentID, ok := c.Locals("user_id").(string)
	if !ok || parentID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req domain.ParentLinkStudentRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request payload"})
	}

	cleanCode := strings.TrimSpace(req.SchoolCode)
	cleanAccessID := strings.TrimSpace(req.AccessID)
	cleanRoll := strings.TrimSpace(req.RollNumber)
	if cleanCode == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "School Code is required"})
	}
	if cleanAccessID == "" && cleanRoll == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Student Access ID or Class and Roll Number is required"})
	}

	child, err := h.parentRepo.LinkStudent(c.Context(), parentID, req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"message": "Student successfully linked to your family portal!",
		"child":   child,
	})
}

func (h *ParentAPIHandler) SendCounselorNote(c fiber.Ctx) error {
	parentID, ok := c.Locals("user_id").(string)
	if !ok || parentID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req domain.ParentCounselorNoteRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request payload"})
	}

	if strings.TrimSpace(req.StudentID) == "" || strings.TrimSpace(req.Note) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Student ID and note message are required"})
	}

	subject := strings.TrimSpace(req.Subject)
	if subject == "" {
		subject = "Confidential Note from Parent"
	}

	err := h.parentRepo.CreateNoteToCounselor(c.Context(), parentID, req.StudentID, subject, strings.TrimSpace(req.Note), req.IsConfidential)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Your confidential note has been securely forwarded to the student's wellness counselor.",
	})
}

func (h *ParentAPIHandler) AddChild(c fiber.Ctx) error {
	parentID, ok := c.Locals("user_id").(string)
	if !ok || parentID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req domain.ParentAddChildRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request payload"})
	}

	if strings.TrimSpace(req.Name) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Child's name is required"})
	}

	child, err := h.parentRepo.AddChild(c.Context(), parentID, req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"success": true,
		"message": "Child successfully added to your parent portal!",
		"child":   child,
	})
}

func (h *ParentAPIHandler) UpdateChild(c fiber.Ctx) error {
	parentID, ok := c.Locals("user_id").(string)
	if !ok || parentID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req domain.ParentUpdateChildRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request payload"})
	}

	if strings.TrimSpace(req.StudentID) == "" || strings.TrimSpace(req.Name) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Student ID and official student name are required"})
	}

	child, err := h.parentRepo.UpdateChild(c.Context(), parentID, req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Child profile updated successfully",
		"child":   child,
	})
}

func (h *ParentAPIHandler) SubmitStudentCheckin(c fiber.Ctx) error {
	parentID, ok := c.Locals("user_id").(string)
	if !ok || parentID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req domain.ParentSubmitCheckinRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request payload"})
	}

	if req.StudentID == "" || req.AssessmentID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "student_id and assessment_id are required"})
	}

	res, err := h.parentRepo.SubmitStudentCheckin(c.Context(), parentID, req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(res)
}

func (h *ParentAPIHandler) GetParentInquiries(c fiber.Ctx) error {
	parentID, ok := c.Locals("user_id").(string)
	if !ok || parentID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	inquiries, err := h.parentRepo.GetParentInquiriesForParent(c.Context(), parentID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(inquiries)
}

func (h *ParentAPIHandler) GetInquiryMessages(c fiber.Ctx) error {
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

func (h *ParentAPIHandler) ReplyToInquiry(c fiber.Ctx) error {
	parentID, ok := c.Locals("user_id").(string)
	if !ok || parentID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	inquiryID := c.Params("id")
	if inquiryID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Inquiry ID is required"})
	}

	var req struct {
		Message string `json:"message"`
	}
	if err := c.Bind().Body(&req); err != nil || strings.TrimSpace(req.Message) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Message cannot be empty"})
	}

	parentName := "Parent"
	if h.userRepo != nil && parentID != "" {
		if u, err := h.userRepo.GetUserByID(c.Context(), parentID); err == nil && u != nil && u.Name != "" {
			parentName = u.Name
		}
	}

	msg, err := h.parentRepo.AddInquiryMessage(c.Context(), inquiryID, parentID, parentName, "parent", strings.TrimSpace(req.Message))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(msg)
}

func (h *ParentAPIHandler) GetStudentAttempts(c fiber.Ctx) error {
	parentID, ok := c.Locals("user_id").(string)
	if !ok || parentID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	studentID := c.Params("studentId")
	if studentID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Student ID is required"})
	}

	attempts, err := h.parentRepo.GetStudentAttempts(c.Context(), parentID, studentID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(attempts)
}

func (h *ParentAPIHandler) GetStudentDossier(c fiber.Ctx) error {
	parentID, ok := c.Locals("user_id").(string)
	if !ok || parentID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	studentID := c.Params("studentId")
	if studentID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Student ID is required"})
	}

	dossier, err := h.parentRepo.GetStudentDossier(c.Context(), parentID, studentID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(dossier)
}



