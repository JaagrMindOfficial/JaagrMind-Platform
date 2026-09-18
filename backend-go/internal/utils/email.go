package utils

import (
	"fmt"
	"os"
	"strings"

	"github.com/resend/resend-go/v4"
)

// EmailService defines our interface for sending transactional emails across the platform
type EmailService interface {
	SendSchoolInviteEmail(toEmail, schoolName, inviteToken string) error
	SendInstitutionWelcomeEmail(toEmail, instituteName, contactName string) error
	SendInstitutionApprovalEmail(toEmail, instituteName, contactName, resetToken string) error
	SendParentWelcomeEmail(toEmail, parentName string) error
	SendCentralCounselorOnboardingEmail(toEmail, counselorName, tempPassword, portalURL string) error
	SendTeacherOnboardingEmail(toEmail, teacherName, schoolName, grade, section, tempPassword string) error
	SendSchoolCounselorOnboardingEmail(toEmail, counselorName, schoolName, role, tempPassword string) error
	SendPasswordResetOTPEmail(toEmail, otpCode string) error
	SendInquiryMeetingScheduledEmail(toEmail, parentName, studentName, counselorName, meetingDate, meetingTime, meetingLink string) error
	SendTicketUpdateEmail(toEmail, ticketSubject, status, responseNotes string) error
	SendTestEmail(toEmail, subject, content string) error
}

type resendEmailService struct {
	client *resend.Client
	from   string
}

func getBaseFrontendURL() string {
	if u := os.Getenv("FRONTEND_BASE_URL"); u != "" {
		return strings.TrimRight(u, "/")
	}
	raw := os.Getenv("FRONTEND_URL")
	if raw == "" {
		return "http://localhost:3000"
	}
	parts := strings.Split(raw, ",")
	return strings.TrimRight(strings.TrimSpace(parts[0]), "/")
}

// NewEmailService initializes the Resend email service
func NewEmailService() EmailService {
	apiKey := os.Getenv("RESEND_API_KEY")
	client := resend.NewClient(apiKey)

	// Verified custom domain on Resend
	fromEmail := "onboarding@jaagrmind.com"

	return &resendEmailService{
		client: client,
		from:   fromEmail,
	}
}

func (s *resendEmailService) SendSchoolInviteEmail(toEmail, schoolName, inviteToken string) error {
	baseURL := getBaseFrontendURL()
	inviteLink := fmt.Sprintf("%s/invite/%s", baseURL, inviteToken)

	htmlBody := fmt.Sprintf(`
		<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
			<div style="margin-bottom: 24px;">
				<h2 style="color: #0f172a; margin: 0 0 8px 0; font-size: 20px; font-weight: 700;">Welcome to JaagrMind</h2>
				<p style="color: #64748b; font-size: 14px; margin: 0;">Multi-Tenant Behavioral Analytics & Regulation Platform</p>
			</div>
			<p style="font-size: 14px; line-height: 1.6;">Hello Administrator,</p>
			<p style="font-size: 14px; line-height: 1.6;">You have been invited to provision and administer the campus wellness dashboard for <strong>%s</strong>.</p>
			<div style="margin: 28px 0;">
				<a href="%s" style="background-color: #0284c7; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600; display: inline-block;">Set Up Institutional Account</a>
			</div>
			<p style="color: #64748b; font-size: 13px; line-height: 1.5;">If the button above does not work, copy and paste this link into your browser:</p>
			<p style="color: #0284c7; font-size: 13px; word-break: break-all; margin-top: 4px;">%s</p>
			<div style="margin-top: 36px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
				This secure link will expire in 7 days. If you did not anticipate this invitation, please contact security@jaagrmind.com.
			</div>
		</div>
	`, schoolName, inviteLink, inviteLink)

	params := &resend.SendEmailRequest{
		From:    s.from,
		To:      []string{toEmail},
		Subject: fmt.Sprintf("Set up your JaagrMind dashboard for %s", schoolName),
		Html:    htmlBody,
	}

	_, err := s.client.Emails.Send(params)
	if err != nil {
		fmt.Printf("[RESEND-ERROR] Failed to send school invite to %s: %v\n", toEmail, err)
		return err
	}
	return nil
}

func (s *resendEmailService) SendInstitutionApprovalEmail(toEmail, instituteName, contactName, resetToken string) error {
	baseURL := getBaseFrontendURL()
	setupLink := fmt.Sprintf("%s/reset-password?token=%s", baseURL, resetToken)

	name := contactName
	if name == "" {
		name = "Administrator"
	}

	htmlBody := fmt.Sprintf(`
		<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
			<div style="margin-bottom: 24px;">
				<h2 style="color: #0f172a; margin: 0 0 8px 0; font-size: 20px; font-weight: 700;">Application Approved</h2>
				<p style="color: #64748b; font-size: 14px; margin: 0;">Institutional Partnership with JaagrMind</p>
			</div>
			<p style="font-size: 14px; line-height: 1.6;">Dear %s,</p>
			<p style="font-size: 14px; line-height: 1.6;">We are pleased to inform you that your institutional application for <strong>%s</strong> has been reviewed and officially approved by the JaagrMind Central Operations team.</p>
			<p style="font-size: 14px; line-height: 1.6;">Your campus tenant is now provisioned. To activate your administrator access, please complete your password setup:</p>
			<div style="margin: 28px 0;">
				<a href="%s" style="background-color: #059669; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600; display: inline-block;">Activate Administrator Portal</a>
			</div>
			<p style="color: #64748b; font-size: 13px; line-height: 1.5;">Direct setup link:</p>
			<p style="color: #059669; font-size: 13px; word-break: break-all; margin-top: 4px;">%s</p>
			<div style="margin-top: 36px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
				This activation token is valid for 72 hours and requires verifying your registered mobile number during setup.
			</div>
		</div>
	`, name, instituteName, setupLink, setupLink)

	params := &resend.SendEmailRequest{
		From:    s.from,
		To:      []string{toEmail},
		Subject: fmt.Sprintf("Application Approved: Set Up %s on JaagrMind", instituteName),
		Html:    htmlBody,
	}

	_, err := s.client.Emails.Send(params)
	if err != nil {
		fmt.Printf("[RESEND-ERROR] Failed to send approval email to %s: %v\n", toEmail, err)
		return err
	}
	return nil
}

func (s *resendEmailService) SendPasswordResetOTPEmail(toEmail, otpCode string) error {
	htmlBody := fmt.Sprintf(`
		<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
			<h2 style="color: #0f172a; margin: 0 0 12px 0; font-size: 18px; font-weight: 700;">Security Verification Code</h2>
			<p style="font-size: 14px; line-height: 1.6; color: #475569;">
				We received a request to verify identity or reset credentials for your JaagrMind account.
			</p>
			<div style="margin: 24px 0; padding: 18px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center;">
				<div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; font-weight: 600; margin-bottom: 6px;">One-Time Verification Code</div>
				<div style="font-size: 32px; font-weight: 800; letter-spacing: 0.25em; color: #0284c7; font-family: monospace;">%s</div>
				<div style="font-size: 12px; color: #94a3b8; margin-top: 6px;">Valid for 15 minutes</div>
			</div>
			<p style="font-size: 13px; color: #64748b; line-height: 1.5;">
				If you did not initiate this request, someone may have mistyped their email. No changes will be made without this code.
			</p>
			<div style="margin-top: 28px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8;">
				JaagrMind Institutional Authentication Service
			</div>
		</div>
	`, otpCode)

	params := &resend.SendEmailRequest{
		From:    s.from,
		To:      []string{toEmail},
		Subject: fmt.Sprintf("JaagrMind Verification Code: %s", otpCode),
		Html:    htmlBody,
	}

	_, err := s.client.Emails.Send(params)
	if err != nil {
		fmt.Printf("[RESEND-ERROR] Failed to send OTP email to %s: %v\n", toEmail, err)
		return err
	}
	return nil
}

func (s *resendEmailService) SendInquiryMeetingScheduledEmail(toEmail, parentName, studentName, counselorName, meetingDate, meetingTime, meetingLink string) error {
	linkHTML := ""
	if meetingLink != "" {
		linkHTML = fmt.Sprintf(`
			<div style="margin: 24px 0;">
				<a href="%s" style="background-color: #0284c7; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 600; display: inline-block;">Join Consultation Session</a>
			</div>
			<p style="font-size: 12px; color: #64748b;">Direct meeting link: <a href="%s" style="color: #0284c7;">%s</a></p>
		`, meetingLink, meetingLink, meetingLink)
	}

	htmlBody := fmt.Sprintf(`
		<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
			<h2 style="color: #0f172a; margin: 0 0 8px 0; font-size: 18px; font-weight: 700;">Student Wellness Consultation Scheduled</h2>
			<p style="font-size: 14px; line-height: 1.6;">Hello %s,</p>
			<p style="font-size: 14px; line-height: 1.6;">
				A consultation session regarding <strong>%s</strong> has been scheduled with <strong>%s</strong>.
			</p>
			<div style="margin: 20px 0; padding: 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
				<div style="font-size: 13px; margin-bottom: 6px;"><strong>Date:</strong> %s</div>
				<div style="font-size: 13px;"><strong>Time:</strong> %s</div>
			</div>
			%s
			<div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
				JaagrMind Campus Counseling & Family Desk
			</div>
		</div>
	`, parentName, studentName, counselorName, meetingDate, meetingTime, linkHTML)

	params := &resend.SendEmailRequest{
		From:    s.from,
		To:      []string{toEmail},
		Subject: fmt.Sprintf("Confirmed: Wellness Consultation for %s on %s", studentName, meetingDate),
		Html:    htmlBody,
	}

	_, err := s.client.Emails.Send(params)
	if err != nil {
		fmt.Printf("[RESEND-ERROR] Failed to send meeting schedule email to %s: %v\n", toEmail, err)
		return err
	}
	return nil
}

func (s *resendEmailService) SendTicketUpdateEmail(toEmail, ticketSubject, status, responseNotes string) error {
	htmlBody := fmt.Sprintf(`
		<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
			<h2 style="color: #0f172a; margin: 0 0 8px 0; font-size: 18px; font-weight: 700;">Support Ticket Update</h2>
			<p style="font-size: 14px; line-height: 1.6;">
				Your support ticket <strong>"%s"</strong> has been updated to <strong>%s</strong>.
			</p>
			<div style="margin: 20px 0; padding: 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px; line-height: 1.6;">
				<strong>Resolution / Remarks:</strong>
				<p style="margin: 8px 0 0 0; color: #334155;">%s</p>
			</div>
			<div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
				JaagrMind Technical Support Desk
			</div>
		</div>
	`, ticketSubject, status, responseNotes)

	params := &resend.SendEmailRequest{
		From:    s.from,
		To:      []string{toEmail},
		Subject: fmt.Sprintf("Support Update: %s [%s]", ticketSubject, status),
		Html:    htmlBody,
	}

	_, err := s.client.Emails.Send(params)
	if err != nil {
		fmt.Printf("[RESEND-ERROR] Failed to send ticket update email to %s: %v\n", toEmail, err)
		return err
	}
	return nil
}

func (s *resendEmailService) SendInstitutionWelcomeEmail(toEmail, instituteName, contactName string) error {
	name := contactName
	if name == "" {
		name = "Administrator"
	}

	htmlBody := fmt.Sprintf(`
		<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
			<div style="margin-bottom: 24px;">
				<h2 style="color: #0f172a; margin: 0 0 8px 0; font-size: 20px; font-weight: 700;">Application Received</h2>
				<p style="color: #64748b; font-size: 14px; margin: 0;">JaagrMind Institutional Partnerships</p>
			</div>
			<p style="font-size: 14px; line-height: 1.6;">Dear %s,</p>
			<p style="font-size: 14px; line-height: 1.6;">
				Thank you for expressing interest in bringing JaagrMind to <strong>%s</strong>. We have received your institutional application and our campus enablement team has begun preliminary review.
			</p>
			<div style="margin: 20px 0; padding: 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
				<div style="font-size: 13px; font-weight: 600; color: #0f172a; margin-bottom: 6px;">Next Steps:</div>
				<ul style="font-size: 13px; color: #475569; margin: 0; padding-left: 20px; line-height: 1.6;">
					<li>Verification of institutional credentials and administrative identity.</li>
					<li>Provisioning of campus database tenant and multi-grade roster synchronization.</li>
					<li>Dispatch of administrator activation credentials upon review approval.</li>
				</ul>
			</div>
			<p style="font-size: 13px; color: #64748b; line-height: 1.5;">
				Our team typically processes institutional applications within 24 business hours. If you have immediate questions, reply directly to this message or contact partnerships@jaagrmind.com.
			</p>
			<div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
				JaagrMind Institutional Onboarding Desk
			</div>
		</div>
	`, name, instituteName)

	params := &resend.SendEmailRequest{
		From:    s.from,
		To:      []string{toEmail},
		Subject: fmt.Sprintf("Application Received: %s on JaagrMind", instituteName),
		Html:    htmlBody,
	}

	_, err := s.client.Emails.Send(params)
	if err != nil {
		fmt.Printf("[RESEND-ERROR] Failed to send institution welcome to %s: %v\n", toEmail, err)
		return err
	}
	return nil
}

func (s *resendEmailService) SendParentWelcomeEmail(toEmail, parentName string) error {
	baseURL := getBaseFrontendURL()
	portalURL := fmt.Sprintf("%s/parent", baseURL)

	name := parentName
	if name == "" {
		name = "Parent"
	}

	htmlBody := fmt.Sprintf(`
		<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
			<div style="margin-bottom: 24px;">
				<h2 style="color: #0f172a; margin: 0 0 8px 0; font-size: 20px; font-weight: 700;">Welcome to the JaagrMind Family Desk</h2>
				<p style="color: #64748b; font-size: 14px; margin: 0;">Supporting Your Child's Emotional & Cognitive Growth</p>
			</div>
			<p style="font-size: 14px; line-height: 1.6;">Dear %s,</p>
			<p style="font-size: 14px; line-height: 1.6;">
				Your parent account is now active. With JaagrMind, you gain transparent, confidential insight into your child's emotional well-being and daily regulation development.
			</p>
			<div style="margin: 20px 0; padding: 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
				<div style="font-size: 13px; font-weight: 600; color: #0f172a; margin-bottom: 6px;">How To Get Started:</div>
				<ul style="font-size: 13px; color: #475569; margin: 0; padding-left: 20px; line-height: 1.6;">
					<li><strong>Link Your Child:</strong> Enter your child's student Access ID in the portal to connect records.</li>
					<li><strong>Review The Growth Radar:</strong> Explore study focus, calm recovery, and confidence trends.</li>
					<li><strong>Connect With School Counselors:</strong> Initiate confidential consultations with your school's wellness team.</li>
				</ul>
			</div>
			<div style="margin: 28px 0;">
				<a href="%s" style="background-color: #0284c7; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600; display: inline-block;">Open Parent Portal</a>
			</div>
			<p style="font-size: 12px; color: #64748b;">Portal link: <a href="%s" style="color: #0284c7;">%s</a></p>
			<div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
				JaagrMind Family Wellness Team
			</div>
		</div>
	`, name, portalURL, portalURL, portalURL)

	params := &resend.SendEmailRequest{
		From:    s.from,
		To:      []string{toEmail},
		Subject: "Welcome to JaagrMind Family Desk",
		Html:    htmlBody,
	}

	_, err := s.client.Emails.Send(params)
	if err != nil {
		fmt.Printf("[RESEND-ERROR] Failed to send parent welcome to %s: %v\n", toEmail, err)
		return err
	}
	return nil
}

func (s *resendEmailService) SendCentralCounselorOnboardingEmail(toEmail, counselorName, tempPassword, portalURL string) error {
	baseURL := getBaseFrontendURL()
	fullPortalURL := fmt.Sprintf("%s%s", baseURL, portalURL)

	htmlBody := fmt.Sprintf(`
		<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
			<div style="margin-bottom: 24px;">
				<h2 style="color: #0f172a; margin: 0 0 8px 0; font-size: 20px; font-weight: 700;">JaagrMind Counselor Appointment</h2>
				<p style="color: #64748b; font-size: 14px; margin: 0;">Central Care Desk & Psychological Telemetry</p>
			</div>
			<p style="font-size: 14px; line-height: 1.6;">Hello %s,</p>
			<p style="font-size: 14px; line-height: 1.6;">
				You have been onboarded as a Central Wellness Counselor on the JaagrMind Clinical Platform. You now have access to review student behavioral dossiers, coordinate with school counseling desks, and address parent wellness inquiries.
			</p>
			<div style="margin: 20px 0; padding: 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px; line-height: 1.6;">
				<div><strong>Login Email:</strong> %s</div>
				<div><strong>Temporary Password:</strong> <code style="background-color: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 13px;">%s</code></div>
			</div>
			<div style="margin: 28px 0;">
				<a href="%s" style="background-color: #0f172a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600; display: inline-block;">Access Central Care Desk</a>
			</div>
			<p style="font-size: 12px; color: #64748b;">Direct login: <a href="%s" style="color: #0284c7;">%s</a></p>
			<div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
				Please change your temporary password upon initial authentication.
			</div>
		</div>
	`, counselorName, toEmail, tempPassword, fullPortalURL, fullPortalURL, fullPortalURL)

	params := &resend.SendEmailRequest{
		From:    s.from,
		To:      []string{toEmail},
		Subject: "JaagrMind Central Counselor Access Provisioned",
		Html:    htmlBody,
	}

	_, err := s.client.Emails.Send(params)
	if err != nil {
		fmt.Printf("[RESEND-ERROR] Failed to send central counselor email to %s: %v\n", toEmail, err)
		return err
	}
	return nil
}

func (s *resendEmailService) SendTeacherOnboardingEmail(toEmail, teacherName, schoolName, grade, section, tempPassword string) error {
	baseURL := getBaseFrontendURL()
	loginURL := fmt.Sprintf("%s/login", baseURL)

	htmlBody := fmt.Sprintf(`
		<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
			<div style="margin-bottom: 24px;">
				<h2 style="color: #0f172a; margin: 0 0 8px 0; font-size: 20px; font-weight: 700;">Faculty Access: JaagrMind Platform</h2>
				<p style="color: #64748b; font-size: 14px; margin: 0;">%s</p>
			</div>
			<p style="font-size: 14px; line-height: 1.6;">Hello %s,</p>
			<p style="font-size: 14px; line-height: 1.6;">
				You have been designated as a faculty mentor for <strong>Class %sth - Section %s</strong> on the JaagrMind school portal.
			</p>
			<div style="margin: 20px 0; padding: 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px; line-height: 1.6;">
				<div><strong>Assigned Cohort:</strong> Class %sth - Section %s</div>
				<div><strong>Login Email:</strong> %s</div>
				<div><strong>Temporary Password:</strong> <code style="background-color: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 13px;">%s</code></div>
			</div>
			<div style="margin: 28px 0;">
				<a href="%s" style="background-color: #0284c7; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600; display: inline-block;">Log In to School Portal</a>
			</div>
			<p style="font-size: 12px; color: #64748b;">Login URL: <a href="%s" style="color: #0284c7;">%s</a></p>
			<div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
				Please update your password under Account Settings upon your first login.
			</div>
		</div>
	`, schoolName, teacherName, grade, section, grade, section, toEmail, tempPassword, loginURL, loginURL, loginURL)

	params := &resend.SendEmailRequest{
		From:    s.from,
		To:      []string{toEmail},
		Subject: fmt.Sprintf("Teacher Portal Access: %s on JaagrMind", schoolName),
		Html:    htmlBody,
	}

	_, err := s.client.Emails.Send(params)
	if err != nil {
		fmt.Printf("[RESEND-ERROR] Failed to send teacher onboarding to %s: %v\n", toEmail, err)
		return err
	}
	return nil
}

func (s *resendEmailService) SendSchoolCounselorOnboardingEmail(toEmail, counselorName, schoolName, role, tempPassword string) error {
	baseURL := getBaseFrontendURL()
	loginURL := fmt.Sprintf("%s/login", baseURL)

	htmlBody := fmt.Sprintf(`
		<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
			<div style="margin-bottom: 24px;">
				<h2 style="color: #0f172a; margin: 0 0 8px 0; font-size: 20px; font-weight: 700;">Campus Counselor Access</h2>
				<p style="color: #64748b; font-size: 14px; margin: 0;">%s • %s</p>
			</div>
			<p style="font-size: 14px; line-height: 1.6;">Dear %s,</p>
			<p style="font-size: 14px; line-height: 1.6;">
				You have been provisioned as a <strong>%s</strong> for <strong>%s</strong> on the JaagrMind Behavioral Health platform.
			</p>
			<div style="margin: 20px 0; padding: 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px; line-height: 1.6;">
				<div><strong>Institution:</strong> %s</div>
				<div><strong>Role:</strong> %s</div>
				<div><strong>Login Email:</strong> %s</div>
				<div><strong>Temporary Password:</strong> <code style="background-color: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 13px;">%s</code></div>
			</div>
			<div style="margin: 28px 0;">
				<a href="%s" style="background-color: #059669; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 600; display: inline-block;">Access Counselor Dossiers</a>
			</div>
			<p style="font-size: 12px; color: #64748b;">Direct login link: <a href="%s" style="color: #0284c7;">%s</a></p>
			<div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8;">
				Please reset your password upon initial sign in for student data privacy compliance.
			</div>
		</div>
	`, schoolName, role, counselorName, role, schoolName, schoolName, role, toEmail, tempPassword, loginURL, loginURL, loginURL)

	params := &resend.SendEmailRequest{
		From:    s.from,
		To:      []string{toEmail},
		Subject: fmt.Sprintf("Counselor Portal Credentials: %s", schoolName),
		Html:    htmlBody,
	}

	_, err := s.client.Emails.Send(params)
	if err != nil {
		fmt.Printf("[RESEND-ERROR] Failed to send school counselor email to %s: %v\n", toEmail, err)
		return err
	}
	return nil
}

func (s *resendEmailService) SendTestEmail(toEmail, subject, content string) error {
	htmlBody := fmt.Sprintf(`
		<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0;">
			<h2 style="color: #0f172a; margin: 0 0 8px 0; font-size: 18px; font-weight: 700;">JaagrMind Platform Notification</h2>
			<div style="font-size: 14px; line-height: 1.6; color: #334155;">%s</div>
			<div style="margin-top: 28px; padding-top: 14px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8;">
				JaagrMind Verification & Telemetry Service
			</div>
		</div>
	`, content)

	params := &resend.SendEmailRequest{
		From:    s.from,
		To:      []string{toEmail},
		Subject: subject,
		Html:    htmlBody,
	}

	_, err := s.client.Emails.Send(params)
	if err != nil {
		fmt.Printf("[RESEND-ERROR] Failed to send test email to %s: %v\n", toEmail, err)
		return err
	}
	return nil
}
