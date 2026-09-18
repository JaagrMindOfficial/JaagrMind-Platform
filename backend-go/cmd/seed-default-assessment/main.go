package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Option struct {
	Label string `json:"label"`
	Marks int    `json:"marks"`
}

type Question struct {
	Text        string   `json:"text"`
	Section     string   `json:"section"`
	SectionName string   `json:"sectionName"`
	IsPositive  bool     `json:"isPositive"`
	Options     []Option `json:"options"`
}

type Bucket struct {
	Label    string `json:"label"`
	MinScore int    `json:"minScore"`
	MaxScore int    `json:"maxScore"`
	Color    string `json:"color"`
}

type SectionDef struct {
	Key  string `json:"key"`
	Name string `json:"name"`
}

func main() {
	dbURL := "postgres://postgres:secret@localhost:5432/jaagrmind?sslmode=disable"
	dbPool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to db: %v", err)
	}
	defer dbPool.Close()

	standardNegativeOptions := []Option{
		{Label: "Not true for me", Marks: 1},
		{Label: "Sometimes true", Marks: 2},
		{Label: "Often true", Marks: 3},
		{Label: "Almost always true", Marks: 4},
	}

	standardPositiveOptions := []Option{
		{Label: "Not true for me", Marks: 4},
		{Label: "Sometimes true", Marks: 3},
		{Label: "Often true", Marks: 2},
		{Label: "Almost always true", Marks: 1},
	}

	questions := []Question{
		// Section A: Focus & Attention
		{Text: "I feel mentally tired before I begin my work", Section: "A", SectionName: "Focus & Attention", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I delay starting tasks that feel big or difficult.", Section: "A", SectionName: "Focus & Attention", IsPositive: false, Options: standardNegativeOptions},
		{Text: "My mind keeps jumping between thoughts when I try to study.", Section: "A", SectionName: "Focus & Attention", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I feel pressure or stress when I need to concentrate.", Section: "A", SectionName: "Focus & Attention", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I feel overwhelmed when I have many things to do.", Section: "A", SectionName: "Focus & Attention", IsPositive: false, Options: standardNegativeOptions},
		{Text: "Even simple work feels exhausting sometimes.", Section: "A", SectionName: "Focus & Attention", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I can stay focused once I begin a task.", Section: "A", SectionName: "Focus & Attention", IsPositive: true, Options: standardPositiveOptions},
		{Text: "I feel calm and steady while working on something.", Section: "A", SectionName: "Focus & Attention", IsPositive: true, Options: standardPositiveOptions},

		// Section B: Self-Esteem & Inner Confidence
		{Text: "I am very hard on myself when I make mistakes.", Section: "B", SectionName: "Self-Esteem & Inner Confidence", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I compare myself to others and feel less capable.", Section: "B", SectionName: "Self-Esteem & Inner Confidence", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I doubt my abilities even when I try sincerely.", Section: "B", SectionName: "Self-Esteem & Inner Confidence", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I feel disappointed in myself easily.", Section: "B", SectionName: "Self-Esteem & Inner Confidence", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I replay my mistakes in my mind for a long time.", Section: "B", SectionName: "Self-Esteem & Inner Confidence", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I judge myself more harshly than others judge me.", Section: "B", SectionName: "Self-Esteem & Inner Confidence", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I feel okay about myself even when I don't do well.", Section: "B", SectionName: "Self-Esteem & Inner Confidence", IsPositive: true, Options: standardPositiveOptions},
		{Text: "I can encourage myself after making a mistake.", Section: "B", SectionName: "Self-Esteem & Inner Confidence", IsPositive: true, Options: standardPositiveOptions},

		// Section C: Social Confidence & Interaction
		{Text: "I hesitate to speak up even when I know the answer.", Section: "C", SectionName: "Social Confidence & Interaction", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I worry about what others think of me.", Section: "C", SectionName: "Social Confidence & Interaction", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I feel awkward or uncomfortable in group situations.", Section: "C", SectionName: "Social Confidence & Interaction", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I avoid participating in class discussions.", Section: "C", SectionName: "Social Confidence & Interaction", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I stay quiet to avoid saying the wrong thing.", Section: "C", SectionName: "Social Confidence & Interaction", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I feel left out or invisible at school.", Section: "C", SectionName: "Social Confidence & Interaction", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I feel comfortable sharing my thoughts in groups.", Section: "C", SectionName: "Social Confidence & Interaction", IsPositive: true, Options: standardPositiveOptions},
		{Text: "I feel confident interacting with classmates.", Section: "C", SectionName: "Social Confidence & Interaction", IsPositive: true, Options: standardPositiveOptions},

		// Section D: Digital Hygiene & Self-Control
		{Text: "I use my phone or screen when I feel bored or restless.", Section: "D", SectionName: "Digital Hygiene & Self-Control", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I lose track of time while scrolling or gaming.", Section: "D", SectionName: "Digital Hygiene & Self-Control", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I feel irritated when my screen time is limited.", Section: "D", SectionName: "Digital Hygiene & Self-Control", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I check my phone even when I know I should not.", Section: "D", SectionName: "Digital Hygiene & Self-Control", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I use screens to avoid uncomfortable feelings or tasks.", Section: "D", SectionName: "Digital Hygiene & Self-Control", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I find it hard to stop using screens once I start.", Section: "D", SectionName: "Digital Hygiene & Self-Control", IsPositive: false, Options: standardNegativeOptions},
		{Text: "I can put my phone away when I decide to.", Section: "D", SectionName: "Digital Hygiene & Self-Control", IsPositive: true, Options: standardPositiveOptions},
		{Text: "I feel comfortable being offline for some time.", Section: "D", SectionName: "Digital Hygiene & Self-Control", IsPositive: true, Options: standardPositiveOptions},
	}

	buckets := []Bucket{
		{Label: "Skill Stable", MinScore: 8, MaxScore: 14, Color: "#4CAF50"},
		{Label: "Skill Emerging", MinScore: 15, MaxScore: 22, Color: "#FF9800"},
		{Label: "Skill Support Needed", MinScore: 23, MaxScore: 32, Color: "#F44336"},
	}

	customSections := []SectionDef{
		{Key: "A", Name: "Focus & Attention"},
		{Key: "B", Name: "Self-Esteem & Inner Confidence"},
		{Key: "C", Name: "Social Confidence & Interaction"},
		{Key: "D", Name: "Digital Hygiene & Self-Control"},
	}

	// Also construct the sections array for backward compatibility
	type SectionObj struct {
		Title     string     `json:"title"`
		Questions []Question `json:"questions"`
	}
	var sections []SectionObj
	sectionMap := make(map[string][]Question)
	for _, q := range questions {
		sectionMap[q.SectionName] = append(sectionMap[q.SectionName], q)
	}
	for _, s := range customSections {
		sections = append(sections, SectionObj{
			Title:     s.Name,
			Questions: sectionMap[s.Name],
		})
	}

	questionsJSON, _ := json.Marshal(questions)
	bucketsJSON, _ := json.Marshal(buckets)
	customSectionsJSON, _ := json.Marshal(customSections)
	sectionsJSON, _ := json.Marshal(sections)

	ctx := context.Background()

	// Check if default assessment exists
	var existingID string
	err = dbPool.QueryRow(ctx, "SELECT id FROM assessments WHERE is_default = true").Scan(&existingID)
	if err == nil && existingID != "" {
		_, err = dbPool.Exec(ctx, `
			UPDATE assessments 
			SET title = $1, description = $2, questions = $3, buckets = $4, custom_sections = $5, sections = $6, is_active = true
			WHERE id = $7
		`, "Student Wellness Assessment", "A comprehensive 32-question assessment to understand student mental wellness, emotional resilience, focus, and digital habits.", questionsJSON, bucketsJSON, customSectionsJSON, sectionsJSON, existingID)
		if err != nil {
			log.Fatalf("Failed to update default assessment: %v", err)
		}
		fmt.Printf("✓ Updated default assessment (%s) with 32 questions!\n", existingID)
	} else {
		var newID string
		err = dbPool.QueryRow(ctx, `
			INSERT INTO assessments (title, description, is_default, time_per_question, total_time, inactivity_alert_time, inactivity_end_time, questions, buckets, section_buckets, custom_sections, sections, is_active)
			VALUES ($1, $2, true, 30, 15, 40, 120, $3, $4, true, $5, $6, true)
			RETURNING id
		`, "Student Wellness Assessment", "A comprehensive 32-question assessment to understand student mental wellness, emotional resilience, focus, and digital habits.", questionsJSON, bucketsJSON, customSectionsJSON, sectionsJSON).Scan(&newID)
		if err != nil {
			log.Fatalf("Failed to insert default assessment: %v", err)
		}
		fmt.Printf("✓ Seeded default assessment (%s) with 32 questions!\n", newID)
	}

	// Also assign this assessment to Oakwood school if unassigned
	var oakwoodID string
	_ = dbPool.QueryRow(ctx, "SELECT id FROM schools WHERE school_code = 'OAKWOOD'").Scan(&oakwoodID)
	if oakwoodID != "" {
		_, _ = dbPool.Exec(ctx, "UPDATE schools SET assigned_tests = ARRAY(SELECT id FROM assessments WHERE is_active = true) WHERE id = $1", oakwoodID)
		fmt.Println("✓ Assigned assessments to OAKWOOD school")
	}
}
