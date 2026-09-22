package services

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/argon2"
	"github.com/jaagrmind/platform-api/internal/core/domain"
)

type authService struct {
	repo      domain.UserRepository
	jwtSecret []byte
}

func NewAuthService(repo domain.UserRepository, secret string) domain.AuthService {
	return &authService{
		repo:      repo,
		jwtSecret: []byte(secret),
	}
}

func (s *authService) Login(ctx context.Context, req domain.LoginRequest) (*domain.LoginResponse, error) {
	user, err := s.repo.GetUserByEmail(ctx, req.Email)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	if !s.VerifyPassword(user.PasswordHash, req.Password) {
		return nil, errors.New("invalid credentials")
	}

	var roleStrings []string
	hasCounselorRole := false
	for _, r := range user.Roles {
		if r.Role == domain.RoleCounselor {
			hasCounselorRole = true
		} else {
			roleStrings = append(roleStrings, r.Role)
		}
	}

	if hasCounselorRole {
		exists, isActive, cErr := s.repo.IsCounselorActive(ctx, user.Email)
		if cErr == nil && exists {
			if isActive {
				roleStrings = append(roleStrings, domain.RoleCounselor)
			} else {
				// Counselor account is explicitly marked inactive / blocked
				if len(roleStrings) == 0 {
					return nil, errors.New("Counselor account has been deactivated. Please contact your school or platform administrator.")
				}
			}
		} else if !exists && !user.IsInternal {
			// Directory record deleted for campus counselor
			if len(roleStrings) == 0 {
				return nil, errors.New("Counselor account has been removed. Please contact your school or platform administrator.")
			}
		} else {
			roleStrings = append(roleStrings, domain.RoleCounselor)
		}
	}

	// Filter user.Roles in response to match validated roles
	var activeRoles []domain.UserRole
	for _, r := range user.Roles {
		for _, rs := range roleStrings {
			if r.Role == rs {
				activeRoles = append(activeRoles, r)
				break
			}
		}
	}
	user.Roles = activeRoles

	if len(roleStrings) == 0 {
		return nil, errors.New("Account has no active roles or has been deactivated. Please contact your administrator.")
	}

	token, err := s.GenerateToken(domain.TokenPayload{
		UserID: user.ID,
		Roles:  roleStrings,
	})
	if err != nil {
		return nil, fmt.Errorf("could not generate token: %w", err)
	}

	return &domain.LoginResponse{
		Token: token,
		User:  *user,
	}, nil
}

func (s *authService) GenerateToken(payload domain.TokenPayload) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub":   payload.UserID,
		"roles": payload.Roles,
		"exp":   time.Now().Add(time.Hour * 24 * 7).Unix(),
	})
	return token.SignedString(s.jwtSecret)
}

func (s *authService) HashPassword(password string) (string, error) {
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}

	hash := argon2.IDKey([]byte(password), salt, 1, 64*1024, 4, 32)

	return fmt.Sprintf(
		"$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
		argon2.Version, 64*1024, 1, 4,
		base64.RawStdEncoding.EncodeToString(salt),
		base64.RawStdEncoding.EncodeToString(hash),
	), nil
}

func (s *authService) VerifyPassword(encodedHash, password string) bool {
	parts := strings.Split(encodedHash, "$")
	if len(parts) != 6 {
		return false
	}
	salt, _ := base64.RawStdEncoding.DecodeString(parts[4])
	expectedHash, _ := base64.RawStdEncoding.DecodeString(parts[5])

	hash := argon2.IDKey([]byte(password), salt, 1, 64*1024, 4, uint32(len(expectedHash)))
	return subtle.ConstantTimeCompare(hash, expectedHash) == 1
}
