package main

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Option struct {
	Label string `json:"label"`
	Marks int    `json:"marks"`
}

type Question struct {
	ID          string   `json:"id"`
	Text        string   `json:"text"`
	Section     string   `json:"section"`
	SectionName string   `json:"sectionName"`
	Direction   string   `json:"direction"`
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

type SectionObj struct {
	Title     string     `json:"title"`
	Questions []Question `json:"questions"`
}

func GetV4Questions() []Question {
	options := []Option{
		{Label: "Not like me", Marks: 1},
		{Label: "A little like me", Marks: 2},
		{Label: "Quite like me", Marks: 3},
		{Label: "Very much like me", Marks: 4},
	}

	return []Question{
		// ── Section A: Focus & Attention ─────────────────────────────────────
		{ID: "A1", Text: "When I am doing homework and a message appears on my phone, my attention gets pulled away from my work.", Section: "A", SectionName: "Focus & Attention", Direction: "R", IsPositive: false, Options: options},
		{ID: "A2", Text: "When I notice that my mind has wandered while reading, I can bring my attention back to what I was reading.", Section: "A", SectionName: "Focus & Attention", Direction: "P", IsPositive: true, Options: options},
		{ID: "A3", Text: "When I have homework to finish but would rather be doing something else, I can stay with the homework for a while.", Section: "A", SectionName: "Focus & Attention", Direction: "P", IsPositive: true, Options: options},
		{ID: "A4", Text: "When I remember another thing I want to do while I am already working on something, I switch before finishing what I started.", Section: "A", SectionName: "Focus & Attention", Direction: "R", IsPositive: false, Options: options},
		{ID: "A5", Text: "When I have several things to finish, I can decide which one to start first.", Section: "A", SectionName: "Focus & Attention", Direction: "P", IsPositive: true, Options: options},
		{ID: "A6", Text: "After someone interrupts me while I am working, it takes me a while to get back into the task.", Section: "A", SectionName: "Focus & Attention", Direction: "R", IsPositive: false, Options: options},
		{ID: "A7", Text: "When people around me are talking while I am working, I can keep working on what I am doing.", Section: "A", SectionName: "Focus & Attention", Direction: "P", IsPositive: true, Options: options},
		{ID: "A8", Text: "When I notice another activity while I am working, I can decide whether to switch to it or stay with what I am doing.", Section: "A", SectionName: "Focus & Attention", Direction: "P", IsPositive: true, Options: options},

		// ── Section B: Inner Confidence ──────────────────────────────────────
		{ID: "B1", Text: "When something does not work the first time, I can trust myself to try another way.", Section: "B", SectionName: "Inner Confidence", Direction: "P", IsPositive: true, Options: options},
		{ID: "B2", Text: "When someone my age is doing better than me at something I care about, I start to feel that I am not good enough.", Section: "B", SectionName: "Inner Confidence", Direction: "R", IsPositive: false, Options: options},
		{ID: "B3", Text: "When I do not understand something, I can ask for help without feeling bad about myself.", Section: "B", SectionName: "Inner Confidence", Direction: "P", IsPositive: true, Options: options},
		{ID: "B4", Text: "When I am not sure I will do something well, I avoid starting because I might fail.", Section: "B", SectionName: "Inner Confidence", Direction: "R", IsPositive: false, Options: options},
		{ID: "B5", Text: "When I look at my earlier work, I can notice something I have improved.", Section: "B", SectionName: "Inner Confidence", Direction: "P", IsPositive: true, Options: options},
		{ID: "B6", Text: "When someone gives me feedback, I can listen to it without feeling that it means I am not good enough.", Section: "B", SectionName: "Inner Confidence", Direction: "P", IsPositive: true, Options: options},
		{ID: "B7", Text: "When I am unsure how something will turn out, I can trust myself enough to take one small step.", Section: "B", SectionName: "Inner Confidence", Direction: "P", IsPositive: true, Options: options},
		{ID: "B8", Text: "When I face a difficult challenge, I can stay steady and give it an honest try.", Section: "B", SectionName: "Inner Confidence", Direction: "P", IsPositive: true, Options: options},

		// ── Section C: Social Interaction ────────────────────────────────────
		{ID: "C1", Text: "When I have an idea in a group but am unsure how others will react, I keep the idea to myself.", Section: "C", SectionName: "Social Interaction", Direction: "R", IsPositive: false, Options: options},
		{ID: "C2", Text: "When a friend disagrees with my view, I try to understand their point of view.", Section: "C", SectionName: "Social Interaction", Direction: "P", IsPositive: true, Options: options},
		{ID: "C3", Text: "When a friend asks me to do something I do not want to do, I agree because I am worried they will be upset if I say no.", Section: "C", SectionName: "Social Interaction", Direction: "R", IsPositive: false, Options: options},
		{ID: "C4", Text: "When someone asks me to join an activity I do not want to join, I can say no respectfully.", Section: "C", SectionName: "Social Interaction", Direction: "P", IsPositive: true, Options: options},
		{ID: "C5", Text: "When a conversation with someone my age becomes awkward, I can stay calm enough to decide what to do next.", Section: "C", SectionName: "Social Interaction", Direction: "P", IsPositive: true, Options: options},
		{ID: "C6", Text: "When someone in my group has not spoken for a while, I notice that they may be getting left out.", Section: "C", SectionName: "Social Interaction", Direction: "P", IsPositive: true, Options: options},
		{ID: "C7", Text: "When someone keeps crossing a boundary after I have said I am uncomfortable, I can ask someone I trust for help.", Section: "C", SectionName: "Social Interaction", Direction: "P", IsPositive: true, Options: options},
		{ID: "C8", Text: "When a social situation feels too difficult to handle on my own, I can identify someone I trust to ask for help.", Section: "C", SectionName: "Social Interaction", Direction: "P", IsPositive: true, Options: options},

		// ── Section D: Healthy Digital Habits ────────────────────────────────
		{ID: "D1", Text: "When I open an app, game or website for one quick thing, I sometimes stay longer than I intended.", Section: "D", SectionName: "Healthy Digital Habits", Direction: "R", IsPositive: false, Options: options},
		{ID: "D2", Text: "When I am enjoying a digital activity but have decided to do something else, I can move away from the activity and do the other thing.", Section: "D", SectionName: "Healthy Digital Habits", Direction: "P", IsPositive: true, Options: options},
		{ID: "D3", Text: "When I am waiting for a few minutes and am not expecting any important messages, I check my device anyway.", Section: "D", SectionName: "Healthy Digital Habits", Direction: "R", IsPositive: false, Options: options},
		{ID: "D4", Text: "After watching, gaming or scrolling, it can take me a while to get focused on my homework.", Section: "D", SectionName: "Healthy Digital Habits", Direction: "R", IsPositive: false, Options: options},
		{ID: "D5", Text: "When I need to concentrate on something, I can use a strategy that reduces digital interruptions.", Section: "D", SectionName: "Healthy Digital Habits", Direction: "P", IsPositive: true, Options: options},
		{ID: "D6", Text: "When I see people online sharing things they are doing, buying or experiencing, I can enjoy seeing it without feeling that I have to do the same.", Section: "D", SectionName: "Healthy Digital Habits", Direction: "P", IsPositive: true, Options: options},
		{ID: "D7", Text: "When I am doing something important and a notification appears, it can pull my attention away from what I intended to do.", Section: "D", SectionName: "Healthy Digital Habits", Direction: "R", IsPositive: false, Options: options},
		{ID: "D8", Text: "When I can choose between a digital activity and something without a screen, I can choose based on what I want or need at that time.", Section: "D", SectionName: "Healthy Digital Habits", Direction: "P", IsPositive: true, Options: options},
	}
}

func loadEnv(filepath string) {
	file, err := os.Open(filepath)
	if err != nil {
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			key := strings.TrimSpace(parts[0])
			val := strings.TrimSpace(parts[1])
			val = strings.Trim(val, "\"'")
			if os.Getenv(key) == "" {
				os.Setenv(key, val)
			}
		}
	}
}

func main() {
	loadEnv(".env")
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:secret@localhost:5432/jaagrmind?sslmode=disable"
	}
	dbPool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to db: %v", err)
	}
	defer dbPool.Close()

	questions := GetV4Questions()

	buckets := []Bucket{
		{Label: "More Consistent", MinScore: 24, MaxScore: 32, Color: "#4CAF50"},
		{Label: "Developing / Variable", MinScore: 16, MaxScore: 23, Color: "#FF9800"},
		{Label: "More Difficult Right Now", MinScore: 8, MaxScore: 15, Color: "#3B82F6"},
	}

	customSections := []SectionDef{
		{Key: "A", Name: "Focus & Attention"},
		{Key: "B", Name: "Inner Confidence"},
		{Key: "C", Name: "Social Interaction"},
		{Key: "D", Name: "Healthy Digital Habits"},
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

	var existingID string
	err = dbPool.QueryRow(ctx, "SELECT id FROM assessments WHERE is_default = true").Scan(&existingID)
	if err == nil && existingID != "" {
		_, err = dbPool.Exec(ctx, `
			UPDATE assessments 
			SET title = $1, description = $2, questions = $3, buckets = $4, custom_sections = $5, sections = $6, is_active = true
			WHERE id = $7
		`, "Jaagr Mind Student Assessment", "32-item, non-clinical reflection module designed to help students notice everyday patterns in attention, inner confidence, social interaction and digital choices.", questionsJSON, bucketsJSON, customSectionsJSON, sectionsJSON, existingID)
		if err != nil {
			log.Fatalf("Failed to update default assessment: %v", err)
		}
		fmt.Printf("✓ Updated default assessment (%s) with official v4.0 32-item reflection module!\n", existingID)
	} else {
		var newID string
		err = dbPool.QueryRow(ctx, `
			INSERT INTO assessments (title, description, is_default, time_per_question, total_time, inactivity_alert_time, inactivity_end_time, questions, buckets, section_buckets, custom_sections, sections, is_active)
			VALUES ($1, $2, true, 30, 15, 40, 120, $3, $4, true, $5, $6, true)
			RETURNING id
		`, "Jaagr Mind Student Assessment", "32-item, non-clinical reflection module designed to help students notice everyday patterns in attention, inner confidence, social interaction and digital choices.", questionsJSON, bucketsJSON, customSectionsJSON, sectionsJSON).Scan(&newID)
		if err != nil {
			log.Fatalf("Failed to insert default assessment: %v", err)
		}
		fmt.Printf("✓ Seeded default assessment (%s) with official v4.0 32-item reflection module!\n", newID)
	}

	// Also assign to schools
	_, _ = dbPool.Exec(ctx, `
		UPDATE schools 
		SET assigned_tests = ARRAY(SELECT id FROM assessments WHERE is_active = true)
		WHERE is_active = true
	`)
	fmt.Println("✓ Updated school test assignments with v4.0 assessment")
}
