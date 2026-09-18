package utils

import (
	"fmt"
	"strings"
)

// CleanGradeStr strips common prefixes ("class", "grade") and ordinal suffixes ("th", "st", "nd", "rd")
// to allow robust grade cohort matching regardless of whether the grade is stored as "10", "10th", or "Class 10".
func CleanGradeStr(g string) string {
	g = strings.ToLower(strings.TrimSpace(g))
	g = strings.TrimPrefix(g, "class")
	g = strings.TrimPrefix(g, "grade")
	g = strings.TrimSpace(g)
	g = strings.TrimSuffix(g, "th")
	g = strings.TrimSuffix(g, "st")
	g = strings.TrimSuffix(g, "nd")
	g = strings.TrimSuffix(g, "rd")
	return strings.TrimSpace(g)
}

// GradeMatchesTarget checks if a student's grade matches any of the target grades or tier range.
func GradeMatchesTarget(studentGrade string, targetGrades []string, minGrade, maxGrade int) bool {
	cleanStudent := CleanGradeStr(studentGrade)
	if len(targetGrades) > 0 {
		for _, tg := range targetGrades {
			if CleanGradeStr(tg) == cleanStudent {
				return true
			}
		}
	}
	if minGrade > 0 && maxGrade > 0 && cleanStudent != "" {
		var gNum int
		if _, err := fmt.Sscanf(cleanStudent, "%d", &gNum); err == nil && gNum > 0 {
			if gNum >= minGrade && gNum <= maxGrade {
				return true
			}
		}
	}
	// If both targetGrades is empty and minGrade/maxGrade are not set or cover 1-12, it matches all
	if len(targetGrades) == 0 && minGrade <= 1 && (maxGrade == 0 || maxGrade >= 12) {
		return true
	}
	return false
}
