package handlers

import (
	"fmt"
	"strings"

	"github.com/gofiber/fiber/v3"
	"github.com/jaagrmind/platform-api/internal/core/domain"
)

type CareDeskAPIHandler struct {
	parentRepo    domain.ParentRepository
	userRepo      domain.UserRepository
	authSvc       domain.AuthService
	assessRepo    domain.AssessmentRepository
	counselorRepo domain.CounselorNoteRepository
}

func SetupCareDeskAPIRoutes(app fiber.Router, parentRepo domain.ParentRepository, userRepo domain.UserRepository, authSvc domain.AuthService, assessRepo domain.AssessmentRepository, counselorRepo domain.CounselorNoteRepository) {
	handler := &CareDeskAPIHandler{
		parentRepo:    parentRepo,
		userRepo:      userRepo,
		authSvc:       authSvc,
		assessRepo:    assessRepo,
		counselorRepo: counselorRepo,
	}

	app.Get("/inquiries", handler.GetInquiries)
	app.Get("/inquiries/:id/messages", handler.GetInquiryMessages)
	app.Post("/inquiries/:id/reply", handler.ReplyInquiry)
	app.Put("/inquiries/:id", handler.UpdateInquiry)
	app.Post("/inquiries/:id/claim", handler.ClaimInquiry)

	// Student telemetry for Care Desk dossiers
	app.Get("/students/:studentId/attempts", handler.GetStudentAttempts)
	app.Get("/students/:studentId/notes", handler.GetStudentNotes)
}

func (h *CareDeskAPIHandler) GetInquiries(c fiber.Ctx) error {
	inquiries, err := h.parentRepo.GetParentInquiriesForSuperAdmin(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if inquiries == nil {
		inquiries = []domain.ParentInquiry{}
	}
	return c.JSON(inquiries)
}

func (h *CareDeskAPIHandler) GetInquiryMessages(c fiber.Ctx) error {
	inquiryID := c.Params("id")
	if inquiryID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Inquiry ID is required"})
	}

	messages, err := h.parentRepo.GetInquiryMessages(c.Context(), inquiryID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if messages == nil {
		messages = []domain.InquiryMessage{}
	}
	return c.JSON(messages)
}

func (h *CareDeskAPIHandler) ReplyInquiry(c fiber.Ctx) error {
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

func (h *CareDeskAPIHandler) UpdateInquiry(c fiber.Ctx) error {
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

func (h *CareDeskAPIHandler) ClaimInquiry(c fiber.Ctx) error {
	inquiryID := c.Params("id")
	if inquiryID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Inquiry ID is required"})
	}

	authorID, _ := c.Locals("user_id").(string)
	if authorID == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	u, err := h.userRepo.GetUserByID(c.Context(), authorID)
	if err != nil || u == nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "User account not found"})
	}

	counselor, _, err := h.parentRepo.GetCounselorByEmail(c.Context(), u.Email)
	if err != nil || counselor == nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Counselor record not found for this account"})
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
		"success":      true,
		"message":      "Inquiry successfully claimed and assigned to you",
		"claimed_by":   claimedByName,
		"counselor_id": counselor.ID,
	})
}

func (h *CareDeskAPIHandler) GetStudentAttempts(c fiber.Ctx) error {
	studentID := c.Params("studentId")
	if studentID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Student ID is required"})
	}

	results, err := h.assessRepo.GetResultsByStudent(c.Context(), studentID, "")
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch student attempts"})
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

func (h *CareDeskAPIHandler) GetStudentNotes(c fiber.Ctx) error {
	studentID := c.Params("studentId")
	if studentID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Student ID is required"})
	}

	notes, err := h.counselorRepo.GetByStudentID(c.Context(), studentID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch student notes"})
	}
	if notes == nil {
		notes = []domain.CounselorNote{}
	}
	return c.JSON(notes)
}
