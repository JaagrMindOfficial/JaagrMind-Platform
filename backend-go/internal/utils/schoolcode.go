package utils

import (
	"context"
	"strings"
	"unicode"

	"github.com/jaagrmind/platform-api/internal/core/domain"
)

// skipWords are tiny filler words skipped when extracting initials.
// We intentionally keep words like "school", "public", "academy" etc. because
// real-world school abbreviations use them: DPS, NPS, SSOT.
var skipWords = map[string]bool{
	"the": true, "of": true, "and": true, "for": true, "&": true,
}

// extractInitials pulls the first letter of every word from a name,
// skipping only articles and prepositions ("the", "of", "and", "for").
//
// Examples:
//
//	"Delhi Public School"          → "DPS"
//	"Scaler School of Technology"  → "SSOT"  (skips "of")
//	"National Public School"       → "NPS"
//	"The Heritage Academy"         → "HA"    (skips "The")
func extractInitials(name string) string {
	cleaned := strings.Map(func(r rune) rune {
		if unicode.IsLetter(r) || unicode.IsSpace(r) || r == '-' || r == '\'' {
			return r
		}
		return ' '
	}, name)

	words := strings.Fields(cleaned)
	if len(words) == 0 {
		return ""
	}

	// Collect first letter of every word except fillers
	var initials []byte
	for _, w := range words {
		if skipWords[strings.ToLower(w)] {
			continue
		}
		if len(w) > 0 {
			initials = append(initials, w[0])
		}
	}

	// If only 1 initial (single-word name), use first 3 chars instead
	if len(initials) < 2 {
		alpha := strings.Map(func(r rune) rune {
			if unicode.IsLetter(r) {
				return r
			}
			return -1
		}, name)
		if len(alpha) > 3 {
			alpha = alpha[:3]
		}
		return strings.ToUpper(alpha)
	}

	return strings.ToUpper(string(initials))
}

// cityPrefix returns a short city identifier for code suffixing.
// Returns 1-char for the base, with progressively longer versions available.
func cityPrefix(city string, length int) string {
	// Strip common suffixes and noise
	cleaned := strings.Map(func(r rune) rune {
		if unicode.IsLetter(r) {
			return r
		}
		return -1
	}, city)
	cleaned = strings.ToUpper(cleaned)
	if cleaned == "" {
		return ""
	}
	if length > len(cleaned) {
		length = len(cleaned)
	}
	return cleaned[:length]
}

// GenerateSchoolCodePreview generates a preview school code from name and city
// without checking uniqueness against the database. Useful for frontend previews.
func GenerateSchoolCodePreview(name, city string) string {
	initials := extractInitials(name)
	if initials == "" {
		return ""
	}

	cp := cityPrefix(city, 1)
	if cp != "" {
		return initials + "-" + cp
	}
	return initials
}

// GenerateSchoolCode generates a unique, human-readable school code.
//
// Algorithm:
//  1. Extract initials from significant words: "National Public School" → "NPS"
//     (noise words like "Public", "School" are skipped if enough initials remain)
//  2. Append city initial with dash: "NPS-B" (for Bangalore)
//  3. If collision, try numeric suffixes: "NPS-B1", "NPS-B2" ... "NPS-B99"
//  4. If still colliding, try longer city prefixes: "NPS-BL", "NPS-BLR"
//  5. Final fallback: append 2 random digits to the base
func GenerateSchoolCode(ctx context.Context, schoolRepo domain.SchoolRepository, name, city string) string {
	initials := extractInitials(name)
	if initials == "" {
		// Absolute fallback: first 3 alpha chars
		alpha := strings.Map(func(r rune) rune {
			if unicode.IsLetter(r) {
				return r
			}
			return -1
		}, name)
		if len(alpha) > 3 {
			alpha = alpha[:3]
		}
		initials = strings.ToUpper(alpha)
	}

	// Try: INITIALS-C (1-char city)
	cp := cityPrefix(city, 1)
	base := initials
	if cp != "" {
		base = initials + "-" + cp
	}

	// Attempt 1: base code as-is
	if !codeExists(ctx, schoolRepo, base) {
		return base
	}

	// Attempt 2: numeric suffixes 1-99
	for i := 1; i <= 99; i++ {
		candidate := base + itoa(i)
		if !codeExists(ctx, schoolRepo, candidate) {
			return candidate
		}
	}

	// Attempt 3: try longer city prefixes (2, 3 chars)
	for cl := 2; cl <= 4; cl++ {
		longerCP := cityPrefix(city, cl)
		if longerCP == "" || longerCP == cp {
			continue
		}
		candidate := initials + "-" + longerCP
		if !codeExists(ctx, schoolRepo, candidate) {
			return candidate
		}
		// Also try with numeric suffix
		for i := 1; i <= 9; i++ {
			candidate2 := initials + "-" + longerCP + itoa(i)
			if !codeExists(ctx, schoolRepo, candidate2) {
				return candidate2
			}
		}
	}

	// Final fallback: base + 3-digit number (start from 100)
	for i := 100; i <= 999; i++ {
		candidate := base + itoa(i)
		if !codeExists(ctx, schoolRepo, candidate) {
			return candidate
		}
	}

	// This should never be reached in practice
	return base + "X"
}

// codeExists checks if a school code is already taken in the database.
func codeExists(ctx context.Context, repo domain.SchoolRepository, code string) bool {
	existing, _ := repo.GetByCode(ctx, code)
	return existing != nil
}

// itoa converts a small integer to a string without importing strconv.
func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	var buf [10]byte
	pos := len(buf)
	for n > 0 {
		pos--
		buf[pos] = byte('0' + n%10)
		n /= 10
	}
	return string(buf[pos:])
}
