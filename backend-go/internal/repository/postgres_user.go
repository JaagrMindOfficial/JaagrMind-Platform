package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jaagrmind/platform-api/internal/core/domain"
)

type postgresUser struct {
	db *pgxpool.Pool
}

func NewPostgresUser(db *pgxpool.Pool) domain.UserRepository {
	// Auto-migration: ensure columns exist and backfill
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, _ = db.Exec(ctx, `
		ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT;
		ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;
		ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'local';
		ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
		ALTER TABLE users ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT false;
	`)
	_, _ = db.Exec(ctx, `
		UPDATE users SET is_internal = true 
		WHERE id IN (
			SELECT user_id FROM user_roles 
			WHERE role = 'superadmin' OR (role = 'counselor' AND (entity_id IS NULL OR entity_id = '' OR entity_id = 'jaagrmind'))
		)
	`)
	_, _ = db.Exec(ctx, `UPDATE users SET is_internal = true WHERE LOWER(email) = 'admin@jaagrmind.com'`)

	return &postgresUser{db: db}
}

func (r *postgresUser) GetUserByEmail(ctx context.Context, email string) (*domain.User, error) {
	var user domain.User
	var passHash, phone, googleID, username, authProvider, avatarURL *string
	var metaBytes []byte
	err := r.db.QueryRow(ctx, `
		SELECT id, email, COALESCE(name, ''), password_hash, phone, google_id, username, auth_provider, avatar_url, metadata, COALESCE(is_internal, false), created_at 
		FROM users WHERE LOWER(email) = LOWER($1)
	`, strings.TrimSpace(email)).Scan(&user.ID, &user.Email, &user.Name, &passHash, &phone, &googleID, &username, &authProvider, &avatarURL, &metaBytes, &user.IsInternal, &user.CreatedAt)
	if err != nil {
		return nil, err
	}
	if passHash != nil {
		user.PasswordHash = *passHash
	}
	if phone != nil {
		user.Phone = *phone
	}
	if googleID != nil {
		user.GoogleID = *googleID
	}
	if username != nil {
		user.Username = *username
	}
	if authProvider != nil {
		user.AuthProvider = *authProvider
	}
	if avatarURL != nil {
		user.AvatarURL = *avatarURL
	}
	if len(metaBytes) > 0 {
		_ = json.Unmarshal(metaBytes, &user.Metadata)
	}
	user.Roles, _ = r.fetchRoles(ctx, user.ID)
	return &user, nil
}

func (r *postgresUser) GetUserByID(ctx context.Context, id string) (*domain.User, error) {
	var user domain.User
	var passHash, phone, googleID, username, authProvider, avatarURL *string
	var metaBytes []byte
	err := r.db.QueryRow(ctx, `
		SELECT id, email, COALESCE(name, ''), password_hash, phone, google_id, username, auth_provider, avatar_url, metadata, COALESCE(is_internal, false), created_at 
		FROM users WHERE id = $1
	`, id).Scan(&user.ID, &user.Email, &user.Name, &passHash, &phone, &googleID, &username, &authProvider, &avatarURL, &metaBytes, &user.IsInternal, &user.CreatedAt)
	if err != nil {
		return nil, err
	}
	if passHash != nil {
		user.PasswordHash = *passHash
	}
	if phone != nil {
		user.Phone = *phone
	}
	if googleID != nil {
		user.GoogleID = *googleID
	}
	if username != nil {
		user.Username = *username
	}
	if authProvider != nil {
		user.AuthProvider = *authProvider
	}
	if avatarURL != nil {
		user.AvatarURL = *avatarURL
	}
	if len(metaBytes) > 0 {
		_ = json.Unmarshal(metaBytes, &user.Metadata)
	}
	user.Roles, _ = r.fetchRoles(ctx, user.ID)
	return &user, nil
}

func (r *postgresUser) GetUserByGoogleID(ctx context.Context, googleID string) (*domain.User, error) {
	var user domain.User
	var passHash, phone, gID, username, authProvider, avatarURL *string
	var metaBytes []byte
	err := r.db.QueryRow(ctx, `
		SELECT id, email, COALESCE(name, ''), password_hash, phone, google_id, username, auth_provider, avatar_url, metadata, COALESCE(is_internal, false), created_at 
		FROM users WHERE google_id = $1
	`, googleID).Scan(&user.ID, &user.Email, &user.Name, &passHash, &phone, &gID, &username, &authProvider, &avatarURL, &metaBytes, &user.IsInternal, &user.CreatedAt)
	if err != nil {
		return nil, err
	}
	if passHash != nil {
		user.PasswordHash = *passHash
	}
	if phone != nil {
		user.Phone = *phone
	}
	if gID != nil {
		user.GoogleID = *gID
	}
	if username != nil {
		user.Username = *username
	}
	if authProvider != nil {
		user.AuthProvider = *authProvider
	}
	if avatarURL != nil {
		user.AvatarURL = *avatarURL
	}
	if len(metaBytes) > 0 {
		_ = json.Unmarshal(metaBytes, &user.Metadata)
	}
	user.Roles, _ = r.fetchRoles(ctx, user.ID)
	return &user, nil
}

func (r *postgresUser) CreateGoogleUser(ctx context.Context, email, name, googleID, avatarURL, phone string, metadata map[string]any) (*domain.User, error) {
	metaBytes, err := json.Marshal(metadata)
	if err != nil {
		metaBytes = []byte("{}")
	}

	var user domain.User
	var authProv, avaURL, ph string
	err = r.db.QueryRow(ctx, `
		INSERT INTO users (email, name, google_id, auth_provider, avatar_url, phone, metadata)
		VALUES ($1, $2, $3, 'google', $4, $5, $6)
		RETURNING id, email, COALESCE(name, ''), google_id, COALESCE(auth_provider, 'google'), COALESCE(avatar_url, ''), COALESCE(phone, ''), created_at
	`, strings.ToLower(strings.TrimSpace(email)), name, googleID, avatarURL, phone, metaBytes).Scan(
		&user.ID, &user.Email, &user.Name, &user.GoogleID, &authProv, &avaURL, &ph, &user.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	user.AuthProvider = authProv
	user.AvatarURL = avaURL
	user.Phone = ph
	user.Metadata = metadata
	return &user, nil
}

func (r *postgresUser) LinkGoogleAccount(ctx context.Context, userID, googleID, avatarURL string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE users 
		SET google_id = $1, 
		    avatar_url = COALESCE(NULLIF(avatar_url, ''), $2),
		    auth_provider = CASE WHEN auth_provider = 'local' OR auth_provider IS NULL THEN 'google_linked' ELSE auth_provider END
		WHERE id = $3
	`, googleID, avatarURL, userID)
	return err
}

func (r *postgresUser) CreateUser(ctx context.Context, email, name, passwordHash string) (*domain.User, error) {
	var user domain.User
	err := r.db.QueryRow(ctx, `
		INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3)
		RETURNING id, email, COALESCE(name, ''), password_hash, created_at
	`, strings.ToLower(strings.TrimSpace(email)), name, passwordHash).Scan(&user.ID, &user.Email, &user.Name, &user.PasswordHash, &user.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *postgresUser) CreateIndependentUser(ctx context.Context, email, name, passwordHash, phone string, metadata map[string]any) (*domain.User, error) {
	metaBytes, err := json.Marshal(metadata)
	if err != nil {
		metaBytes = []byte("{}")
	}

	var user domain.User
	err = r.db.QueryRow(ctx, `
		INSERT INTO users (email, name, password_hash, phone, metadata)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, email, COALESCE(name, ''), password_hash, COALESCE(phone, ''), created_at
	`, email, name, passwordHash, phone, metaBytes).Scan(&user.ID, &user.Email, &user.Name, &user.PasswordHash, &user.Phone, &user.CreatedAt)
	if err != nil {
		return nil, err
	}
	user.Metadata = metadata
	return &user, nil
}

func (r *postgresUser) AddRole(ctx context.Context, userID, role, entityID string) error {
	var entID *string
	if entityID != "" {
		entID = &entityID
	}
	_, err := r.db.Exec(ctx, `
		INSERT INTO user_roles (user_id, role, entity_id) VALUES ($1, $2, $3)
		ON CONFLICT DO NOTHING
	`, userID, role, entID)
	return err
}

func (r *postgresUser) GetUsersByRole(ctx context.Context, role string) ([]domain.User, error) {
	rows, err := r.db.Query(ctx, `
		SELECT u.id, u.email, COALESCE(u.name, ''), COALESCE(u.phone, ''), u.metadata, COALESCE(u.is_internal, false), u.created_at 
		FROM users u 
		JOIN user_roles ur ON u.id = ur.user_id 
		WHERE ur.role = $1
		ORDER BY u.created_at DESC
	`, role)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []domain.User
	for rows.Next() {
		var u domain.User
		var metaBytes []byte
		if err := rows.Scan(&u.ID, &u.Email, &u.Name, &u.Phone, &metaBytes, &u.IsInternal, &u.CreatedAt); err != nil {
			return nil, err
		}
		if len(metaBytes) > 0 {
			_ = json.Unmarshal(metaBytes, &u.Metadata)
		}
		u.Roles, _ = r.fetchRoles(ctx, u.ID)
		users = append(users, u)
	}
	return users, nil
}

func (r *postgresUser) GetUsersByRoleAndEntity(ctx context.Context, role, entityID string) ([]domain.User, error) {
	rows, err := r.db.Query(ctx, `
		SELECT u.id, u.email, COALESCE(u.name, ''), COALESCE(u.phone, ''), u.metadata, COALESCE(u.is_internal, false), u.created_at 
		FROM users u 
		JOIN user_roles ur ON u.id = ur.user_id 
		WHERE ur.role = $1 AND ur.entity_id = $2
		ORDER BY u.created_at DESC
	`, role, entityID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []domain.User
	for rows.Next() {
		var u domain.User
		var metaBytes []byte
		if err := rows.Scan(&u.ID, &u.Email, &u.Name, &u.Phone, &metaBytes, &u.IsInternal, &u.CreatedAt); err != nil {
			return nil, err
		}
		if len(metaBytes) > 0 {
			_ = json.Unmarshal(metaBytes, &u.Metadata)
		}
		u.Roles, _ = r.fetchRoles(ctx, u.ID)
		users = append(users, u)
	}
	return users, nil
}

func (r *postgresUser) fetchRoles(ctx context.Context, userID string) ([]domain.UserRole, error) {
	rows, err := r.db.Query(ctx, `
		SELECT role, COALESCE(entity_id::text, '') FROM user_roles WHERE user_id = $1
	`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var roles []domain.UserRole
	for rows.Next() {
		var role domain.UserRole
		if err := rows.Scan(&role.Role, &role.EntityID); err != nil {
			return nil, err
		}
		role.UserID = userID
		roles = append(roles, role)
	}
	return roles, nil
}

func (r *postgresUser) UpdatePassword(ctx context.Context, userID, passwordHash string) error {
	_, err := r.db.Exec(ctx, `UPDATE users SET password_hash = $1 WHERE id = $2`, passwordHash, userID)
	return err
}

func (r *postgresUser) UpdateUser(ctx context.Context, userID, name, email string) error {
	_, err := r.db.Exec(ctx, `UPDATE users SET name = $1, email = $2 WHERE id = $3`, name, email, userID)
	return err
}

func (r *postgresUser) CreateInstitutionApplication(ctx context.Context, app domain.InstitutionApplication) (*domain.InstitutionApplication, error) {
	var created domain.InstitutionApplication
	var createdAt time.Time
	err := r.db.QueryRow(ctx, `
		INSERT INTO institution_applications (
			institute_name, institute_type, city, state, contact_name, designation,
			email, phone, estimated_students, message, status
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
		RETURNING id, institute_name, institute_type, city, state, contact_name,
		          designation, email, phone, estimated_students, message, status, created_at
	`, app.InstituteName, app.InstituteType, app.City, app.State, app.ContactName,
		app.Designation, app.Email, app.Phone, app.EstimatedStudents, app.Message).
		Scan(&created.ID, &created.InstituteName, &created.InstituteType, &created.City,
			&created.State, &created.ContactName, &created.Designation, &created.Email,
			&created.Phone, &created.EstimatedStudents, &created.Message, &created.Status, &createdAt)
	if err != nil {
		return nil, err
	}
	created.CreatedAt = createdAt.Format(time.RFC3339)
	return &created, nil
}

func (r *postgresUser) GetInstitutionApplications(ctx context.Context) ([]domain.InstitutionApplication, error) {
	rows, err := r.db.Query(ctx, `
		SELECT id, institute_name, institute_type, city, COALESCE(state, ''), contact_name,
		       COALESCE(designation, ''), email, phone, COALESCE(estimated_students, 0), COALESCE(message, ''), status, created_at
		FROM institution_applications
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []domain.InstitutionApplication
	for rows.Next() {
		var app domain.InstitutionApplication
		var createdAt time.Time
		if err := rows.Scan(&app.ID, &app.InstituteName, &app.InstituteType, &app.City,
			&app.State, &app.ContactName, &app.Designation, &app.Email,
			&app.Phone, &app.EstimatedStudents, &app.Message, &app.Status, &createdAt); err != nil {
			return nil, err
		}
		app.CreatedAt = createdAt.Format(time.RFC3339)
		list = append(list, app)
	}
	return list, nil
}

func (r *postgresUser) GetInstitutionApplicationByID(ctx context.Context, id string) (*domain.InstitutionApplication, error) {
	var app domain.InstitutionApplication
	var createdAt time.Time
	err := r.db.QueryRow(ctx, `
		SELECT id, institute_name, institute_type, city, COALESCE(state, ''), contact_name,
		       COALESCE(designation, ''), email, phone, COALESCE(estimated_students, 0), COALESCE(message, ''), status, created_at
		FROM institution_applications
		WHERE id = $1
	`, id).Scan(&app.ID, &app.InstituteName, &app.InstituteType, &app.City,
		&app.State, &app.ContactName, &app.Designation, &app.Email,
		&app.Phone, &app.EstimatedStudents, &app.Message, &app.Status, &createdAt)
	if err != nil {
		return nil, err
	}
	app.CreatedAt = createdAt.Format(time.RFC3339)
	return &app, nil
}

func (r *postgresUser) UpdateApplicationStatus(ctx context.Context, id, status string) error {
	_, err := r.db.Exec(ctx, `UPDATE institution_applications SET status = $1 WHERE id = $2`, status, id)
	return err
}

func (r *postgresUser) CreatePasswordResetToken(ctx context.Context, email, phone, token string, expiresAt time.Time) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO password_resets (id, email, phone, token, expires_at, used, created_at)
		VALUES (gen_random_uuid(), $1, $2, $3, $4, false, NOW())
	`, email, phone, token, expiresAt)
	return err
}

func (r *postgresUser) VerifyAndResetPassword(ctx context.Context, token, email, phone, newPasswordHash string) (*domain.User, error) {
	var resetEmail, resetPhone string
	var expiresAt time.Time
	var used bool

	err := r.db.QueryRow(ctx, `
		SELECT email, phone, expires_at, used
		FROM password_resets
		WHERE token = $1
	`, token).Scan(&resetEmail, &resetPhone, &expiresAt, &used)
	if err != nil {
		// Check otp_verifications
		err = r.db.QueryRow(ctx, `
			SELECT email, phone, expires_at, used
			FROM otp_verifications
			WHERE token = $1
		`, token).Scan(&resetEmail, &resetPhone, &expiresAt, &used)
		if err != nil {
			return nil, fmt.Errorf("invalid or expired reset token")
		}
	}

	if used {
		return nil, fmt.Errorf("reset token has already been used")
	}

	if time.Now().After(expiresAt) {
		return nil, fmt.Errorf("reset token has expired")
	}

	// Verify identity: email check (case-insensitive)
	cleanInputEmail := strings.ToLower(strings.TrimSpace(email))
	cleanResetEmail := strings.ToLower(strings.TrimSpace(resetEmail))
	if cleanInputEmail != cleanResetEmail {
		return nil, fmt.Errorf("provided email address does not match registered account")
	}

	// Verify identity: phone check (strip non-digits, compare last 10 digits)
	digitsOnly := func(s string) string {
		var b strings.Builder
		for _, r := range s {
			if r >= '0' && r <= '9' {
				b.WriteRune(r)
			}
		}
		return b.String()
	}

	inputPhoneDigits := digitsOnly(phone)
	resetPhoneDigits := digitsOnly(resetPhone)
	if len(inputPhoneDigits) > 10 {
		inputPhoneDigits = inputPhoneDigits[len(inputPhoneDigits)-10:]
	}
	if len(resetPhoneDigits) > 10 {
		resetPhoneDigits = resetPhoneDigits[len(resetPhoneDigits)-10:]
	}

	if inputPhoneDigits == "" || resetPhoneDigits == "" || inputPhoneDigits != resetPhoneDigits {
		return nil, fmt.Errorf("provided mobile number does not match registered account details")
	}

	// Update user password in users table
	user, err := r.GetUserByEmail(ctx, cleanResetEmail)
	if err != nil {
		return nil, fmt.Errorf("user account not found for %s", cleanResetEmail)
	}

	if err := r.UpdatePassword(ctx, user.ID, newPasswordHash); err != nil {
		return nil, fmt.Errorf("failed to update password: %w", err)
	}

	// Mark reset token as used
	_, _ = r.db.Exec(ctx, `UPDATE password_resets SET used = true WHERE token = $1`, token)
	_, _ = r.db.Exec(ctx, `UPDATE otp_verifications SET used = true WHERE token = $1`, token)

	return user, nil
}

func (r *postgresUser) CreateOTPVerification(ctx context.Context, email, phone, otpCode, token string, expiresAt time.Time) error {
	_, err := r.db.Exec(ctx, `
		INSERT INTO otp_verifications (email, phone, otp_code, token, expires_at, verified, used)
		VALUES ($1, $2, $3, $4, $5, false, false)
	`, strings.ToLower(strings.TrimSpace(email)), strings.TrimSpace(phone), otpCode, token, expiresAt)
	return err
}

func (r *postgresUser) VerifyOTP(ctx context.Context, email, otpCode string) (string, error) {
	cleanEmail := strings.ToLower(strings.TrimSpace(email))
	cleanOTP := strings.TrimSpace(otpCode)

	var token string
	var id string
	err := r.db.QueryRow(ctx, `
		SELECT id, token 
		FROM otp_verifications
		WHERE LOWER(email) = $1 AND otp_code = $2 AND used = false AND expires_at > now()
		ORDER BY created_at DESC
		LIMIT 1
	`, cleanEmail, cleanOTP).Scan(&id, &token)
	if err != nil {
		return "", fmt.Errorf("invalid or expired verification code")
	}

	// Mark as verified
	_, _ = r.db.Exec(ctx, `UPDATE otp_verifications SET verified = true WHERE id = $1`, id)
	return token, nil
}

func (r *postgresUser) SetUserInternal(ctx context.Context, userID string, isInternal bool) error {
	_, err := r.db.Exec(ctx, `UPDATE users SET is_internal = $1 WHERE id = $2`, isInternal, userID)
	return err
}



