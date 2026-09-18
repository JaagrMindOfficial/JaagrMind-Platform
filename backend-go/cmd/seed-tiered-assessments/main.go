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

type SectionObj struct {
	Title     string     `json:"title"`
	Questions []Question `json:"questions"`
}

func main() {
	dbURL := "postgres://postgres:secret@localhost:5432/jaagrmind?sslmode=disable"
	dbPool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to db: %v", err)
	}
	defer dbPool.Close()

	ctx := context.Background()

	// -------------------------------------------------------------
	// TIER 1: Middle School Day-in-the-Life Reflection (Classes 6-8)
	// -------------------------------------------------------------
	tier1Sections := []SectionDef{
		{Key: "A", Name: "Morning Rhythm & School Arrival"},
		{Key: "B", Name: "Classroom Curiosity & Speaking Up"},
		{Key: "C", Name: "Recess, Friends & Group Play"},
		{Key: "D", Name: "Evening Homework & Screen Time"},
	}

	tier1Questions := []Question{
		// Section A
		{
			Text:        "You walk through the school gate in the morning and see classmates chatting in groups. What is your honest first feeling?",
			Section:     "A",
			SectionName: "Morning Rhythm & School Arrival",
			IsPositive:  true,
			Options: []Option{
				{Label: "Excited to run over and tell my friends something funny", Marks: 1},
				{Label: "A little sleepy, but happy to be here", Marks: 2},
				{Label: "A bit quiet or shy until I settle into my desk", Marks: 3},
				{Label: "I wish I could stay home under my blanket", Marks: 4},
			},
		},
		{
			Text:        "You unpack your bag and realize you left an assignment notebook on your study table at home. What happens inside your head?",
			Section:     "A",
			SectionName: "Morning Rhythm & School Arrival",
			IsPositive:  false,
			Options: []Option{
				{Label: "Honest mistake — I'll politely inform the teacher during attendance", Marks: 1},
				{Label: "Stomach sinks for a moment, but I ask a friend to share", Marks: 2},
				{Label: "Panic and worry that the teacher will be very angry with me", Marks: 3},
				{Label: "Try to hide or avoid being noticed when homework is collected", Marks: 4},
			},
		},
		{
			Text:        "During morning assembly or homeroom, how awake and ready for the day does your brain feel?",
			Section:     "A",
			SectionName: "Morning Rhythm & School Arrival",
			IsPositive:  true,
			Options: []Option{
				{Label: "Full of energy and curious about what we'll do today", Marks: 1},
				{Label: "Decent energy — takes about 10 minutes to kick in", Marks: 2},
				{Label: "Yawning and daydreaming through most of it", Marks: 3},
				{Label: "Mentally exhausted before the first bell even rings", Marks: 4},
			},
		},

		// Section B
		{
			Text:        "The teacher asks a question to the whole room. You think you know the answer, but you're not 100% sure. What usually happens?",
			Section:     "B",
			SectionName: "Classroom Curiosity & Speaking Up",
			IsPositive:  true,
			Options: []Option{
				{Label: "Hand goes up anyway — if I'm wrong, at least I tried!", Marks: 1},
				{Label: "I whisper it to my benchmate to see if they agree first", Marks: 2},
				{Label: "I keep quiet so nobody turns around to look at me", Marks: 3},
				{Label: "I wait to see if someone else says what I was thinking", Marks: 4},
			},
		},
		{
			Text:        "You're trying to solve a tough question and it doesn't work out on the third try. What is your honest instinct?",
			Section:     "B",
			SectionName: "Classroom Curiosity & Speaking Up",
			IsPositive:  true,
			Options: []Option{
				{Label: "Take a sip of water, draw it out, or ask someone for a clue", Marks: 1},
				{Label: "Sigh loudly and push the notebook away for a few minutes", Marks: 2},
				{Label: "Feel like I'm just not good at this subject", Marks: 3},
				{Label: "Quickly copy the answer from a friend to get it over with", Marks: 4},
			},
		},
		{
			Text:        "When you make a silly mistake in front of classmates and a few people chuckle, how does it feel inside?",
			Section:     "B",
			SectionName: "Classroom Curiosity & Speaking Up",
			IsPositive:  false,
			Options: []Option{
				{Label: "I laugh along with them — it was kind of funny!", Marks: 1},
				{Label: "My face gets warm for a minute, then I forget about it", Marks: 2},
				{Label: "I replay it in my mind the whole afternoon feeling embarrassed", Marks: 3},
				{Label: "I feel hurt or want to snap at them", Marks: 4},
			},
		},

		// Section C
		{
			Text:        "During lunch break, your friends start playing a game you're not very skilled at. What happens?",
			Section:     "C",
			SectionName: "Recess, Friends & Group Play",
			IsPositive:  true,
			Options: []Option{
				{Label: "Jump in and play anyway — laughing about funny moves is part of it!", Marks: 1},
				{Label: "Cheer from the sidelines or chat with people watching", Marks: 2},
				{Label: "Feel left out and wander off by myself", Marks: 3},
				{Label: "Get upset and try to force everyone to play my game", Marks: 4},
			},
		},
		{
			Text:        "During lunch break, your friend accidentally knocks over a classmate's artwork or water bottle while rushing to play. Your friend whispers: 'Let's just run outside, nobody saw.' What do you do?",
			Section:     "C",
			SectionName: "Recess, Friends & Group Play",
			IsPositive:  true,
			Options: []Option{
				{Label: "I say: 'Wait, let's help clean it up and tell them it was an accident — they won't be mad if we're honest.'", Marks: 1},
				{Label: "I stay and help clean it up myself, even if my friend runs ahead to the field.", Marks: 2},
				{Label: "I feel torn between being loyal to my friend and feeling bad for our classmate.", Marks: 3},
				{Label: "I run outside with my friend, but feel uneasy and guilty about it the rest of the day.", Marks: 4},
			},
		},
		{
			Text:        "How easy is it for you to share what you're genuinely feeling with at least one trusted friend or teacher?",
			Section:     "C",
			SectionName: "Recess, Friends & Group Play",
			IsPositive:  true,
			Options: []Option{
				{Label: "Pretty easy — I have people I feel safe talking to", Marks: 1},
				{Label: "Sometimes easy, if they ask me first", Marks: 2},
				{Label: "Hard — I keep big feelings bottled up inside", Marks: 3},
				{Label: "I feel like nobody really understands what I go through", Marks: 4},
			},
		},

		// Section D
		{
			Text:        "You're playing a game or watching videos on your phone/tablet, and it's time to stop for homework or dinner. What happens?",
			Section:     "D",
			SectionName: "Evening Homework & Screen Time",
			IsPositive:  true,
			Options: []Option{
				{Label: "'Just pausing now!' — I save my spot and close the screen", Marks: 1},
				{Label: "'Five more minutes!' which turns into 20 minutes", Marks: 2},
				{Label: "I get frustrated and secretly keep playing", Marks: 3},
				{Label: "I shut it down, but feel irritated for the next hour", Marks: 4},
			},
		},
		{
			Text:        "When you sit down at your study desk at home, how long before you start drifting or checking other things?",
			Section:     "D",
			SectionName: "Evening Homework & Screen Time",
			IsPositive:  true,
			Options: []Option{
				{Label: "I usually get a solid 25-30 minutes of steady focus", Marks: 1},
				{Label: "I get 10-15 minutes done, then need a mini stretch break", Marks: 2},
				{Label: "I keep getting up for water, snacks, or checking what others are doing", Marks: 3},
				{Label: "My mind feels scattered and it takes forever to finish simple work", Marks: 4},
			},
		},
		{
			Text:        "When you lie down in bed at night to sleep, what is your mind usually doing?",
			Section:     "D",
			SectionName: "Evening Homework & Screen Time",
			IsPositive:  true,
			Options: []Option{
				{Label: "Peaceful — I fall asleep fairly quickly", Marks: 1},
				{Label: "Thinking about fun things or playing out stories in my head", Marks: 2},
				{Label: "Worrying about tomorrow's tests, homework, or school stuff", Marks: 3},
				{Label: "Tossing and turning, unable to turn off my racing thoughts", Marks: 4},
			},
		},
	}

	// -----------------------------------------------------------------
	// TIER 2: Secondary Student Rhythm & Resilience Check-in (Classes 9-10)
	// -----------------------------------------------------------------
	tier2Sections := []SectionDef{
		{Key: "A", Name: "Classroom Dynamics & Speaking Up"},
		{Key: "B", Name: "The Study Desk & Focus Stamina"},
		{Key: "C", Name: "Peer Belonging & Comparison"},
		{Key: "D", Name: "Evening Wind-down & Digital Recharge"},
	}

	tier2Questions := []Question{
		// Section A
		{
			Text:        "The teacher is explaining a complex concept and everyone else seems to be nodding, but you're completely lost. What do you do?",
			Section:     "A",
			SectionName: "Classroom Dynamics & Speaking Up",
			IsPositive:  true,
			Options: []Option{
				{Label: "Raise my hand and ask them to repeat the last two steps", Marks: 1},
				{Label: "Note it down to ask a friend or look up after class", Marks: 2},
				{Label: "Pretend I understand too so I don't look slow", Marks: 3},
				{Label: "Zone out completely — my brain shuts off when confused", Marks: 4},
			},
		},
		{
			Text:        "When called upon unexpectedly to present or answer in class, how does your body react?",
			Section:     "A",
			SectionName: "Classroom Dynamics & Speaking Up",
			IsPositive:  true,
			Options: []Option{
				{Label: "A brief heartbeat skip, then I speak up steadily", Marks: 1},
				{Label: "My voice shakes a little, but I get my point across", Marks: 2},
				{Label: "Heart thumping and throat dries up; I give the shortest answer possible", Marks: 3},
				{Label: "Total blank freeze — I say 'I don't know' just to sit back down", Marks: 4},
			},
		},
		{
			Text:        "You put genuine effort into preparing for a quiz, but your score comes back below average. What's the voice in your head?",
			Section:     "A",
			SectionName: "Classroom Dynamics & Speaking Up",
			IsPositive:  false,
			Options: []Option{
				{Label: "'Disappointing, but I'll see where I lost marks and fix those chapters'", Marks: 1},
				{Label: "'I studied so hard, why does this keep happening to me?'", Marks: 2},
				{Label: "'Everyone else is just naturally smarter than me'", Marks: 3},
				{Label: "'I hate this subject, I'm not going to bother trying next time'", Marks: 4},
			},
		},
		{
			Text:        "During group projects or lab practicals, how comfortable are you taking initiative or sharing ideas?",
			Section:     "A",
			SectionName: "Classroom Dynamics & Speaking Up",
			IsPositive:  true,
			Options: []Option{
				{Label: "Very comfortable — I enjoy coordinating and brainstorming", Marks: 1},
				{Label: "I contribute my fair share when asked", Marks: 2},
				{Label: "I stay quiet and let the louder members decide everything", Marks: 3},
				{Label: "I feel stressed and prefer doing individual assignments alone", Marks: 4},
			},
		},

		// Section B
		{
			Text:        "You sit down at your study desk with a 20-page textbook chapter. What happens in the first 10 minutes?",
			Section:     "B",
			SectionName: "The Study Desk & Focus Stamina",
			IsPositive:  true,
			Options: []Option{
				{Label: "I skim the headings, take a deep breath, and start on page 1", Marks: 1},
				{Label: "I break it into 4 smaller bite-sized sections so it feels manageable", Marks: 2},
				{Label: "I spend 15 minutes organizing pencils, highlighters, and playlists", Marks: 3},
				{Label: "My brain feels foggy and I check my phone 'just for a second'", Marks: 4},
			},
		},
		{
			Text:        "When studying a subject you find dry or boring, how do you handle the friction?",
			Section:     "B",
			SectionName: "The Study Desk & Focus Stamina",
			IsPositive:  true,
			Options: []Option{
				{Label: "I use a timer (like 25 mins) and reward myself with a break", Marks: 1},
				{Label: "I push through it grudgingly, but I get it done", Marks: 2},
				{Label: "I reread the same paragraph 5 times while thinking of other things", Marks: 3},
				{Label: "I abandon it and switch to an easier subject or distract myself", Marks: 4},
			},
		},
		{
			Text:        "How often does the sheer amount of syllabus or upcoming deadlines feel overwhelming?",
			Section:     "B",
			SectionName: "The Study Desk & Focus Stamina",
			IsPositive:  false,
			Options: []Option{
				{Label: "Rarely — having a plan keeps me grounded", Marks: 1},
				{Label: "Occasionally, right before major exam weeks", Marks: 2},
				{Label: "Frequently — I constantly feel like I'm falling behind", Marks: 3},
				{Label: "Almost every day — I feel frozen by how much there is to do", Marks: 4},
			},
		},
		{
			Text:        "When you finish a tough study session, what is your sense of satisfaction?",
			Section:     "B",
			SectionName: "The Study Desk & Focus Stamina",
			IsPositive:  true,
			Options: []Option{
				{Label: "Proud of the effort I put in, regardless of how tough it was", Marks: 1},
				{Label: "Relieved that it's over for today", Marks: 2},
				{Label: "Worried that I didn't memorize enough of it", Marks: 3},
				{Label: "Just drained and exhausted", Marks: 4},
			},
		},

		// Section C
		{
			Text:        "A classmate casually boasts that they finished the entire syllabus and three sample papers. How does it land with you?",
			Section:     "C",
			SectionName: "Peer Belonging & Comparison",
			IsPositive:  true,
			Options: []Option{
				{Label: "'Good for them — everyone moves at their own pace'", Marks: 1},
				{Label: "A brief twinge of pressure, then I focus on my own plan", Marks: 2},
				{Label: "Stomach sinks — I feel instantly inadequate and anxious", Marks: 3},
				{Label: "I feel cynical and secretly hope they mess up", Marks: 4},
			},
		},
		{
			Text:        "In your school friend circle, do you feel accepted for who you truly are, or do you feel you have to put on a mask?",
			Section:     "C",
			SectionName: "Peer Belonging & Comparison",
			IsPositive:  true,
			Options: []Option{
				{Label: "I can be 100% myself without worrying about being judged", Marks: 1},
				{Label: "Mostly myself, though I keep some personal things private", Marks: 2},
				{Label: "I often pretend to agree with things just to fit in", Marks: 3},
				{Label: "I feel lonely even when sitting in the middle of the group", Marks: 4},
			},
		},
		{
			Text:        "When you're dealing with academic stress, who in your life can you genuinely confide in?",
			Section:     "C",
			SectionName: "Peer Belonging & Comparison",
			IsPositive:  true,
			Options: []Option{
				{Label: "Parents, an older sibling, a close friend, or a supportive teacher", Marks: 1},
				{Label: "One close friend who goes through similar things", Marks: 2},
				{Label: "I keep it to myself because I don't want to burden or worry others", Marks: 3},
				{Label: "Nobody — I feel I have to carry everything completely alone", Marks: 4},
			},
		},
		{
			Text:        "A close friend confides a sensitive secret about someone else in class and whispers: 'Promise me you won't tell anyone.' Later, that very classmate asks you directly: 'Did they tell you anything about me?' What is your honest dilemma?",
			Section:     "C",
			SectionName: "Peer Belonging & Comparison",
			IsPositive:  true,
			Options: []Option{
				{Label: "I hold the boundary firmly: 'If there's something to discuss, it's between you two — I don't carry rumors.'", Marks: 1},
				{Label: "I give a calm, neutral non-answer so I don't break trust, but don't lie either.", Marks: 2},
				{Label: "My heart races, feeling trapped in the middle and terrified that both friends will be mad at me.", Marks: 3},
				{Label: "The social pressure gets too intense, and I drop a hint just to stop the awkwardness.", Marks: 4},
			},
		},

		// Section D
		{
			Text:        "You're studying at 9:30 PM and your class WhatsApp group starts buzzing with test gossip and memes. What do you do?",
			Section:     "D",
			SectionName: "Evening Wind-down & Digital Recharge",
			IsPositive:  true,
			Options: []Option{
				{Label: "Phone is on Do Not Disturb in another room until I finish", Marks: 1},
				{Label: "Check it quickly for 2 mins to make sure it's not teacher notes, then close it", Marks: 2},
				{Label: "Get sucked into the chat and 30 minutes vanish before I realize", Marks: 3},
				{Label: "Feel anxious about missing out and keep the chat open while half-studying", Marks: 4},
			},
		},
		{
			Text:        "When you get into bed with your phone at night, how does the last hour before sleep usually look?",
			Section:     "D",
			SectionName: "Evening Wind-down & Digital Recharge",
			IsPositive:  true,
			Options: []Option{
				{Label: "Screen is put away 20-30 mins before sleep; I drift off naturally", Marks: 1},
				{Label: "I watch one short video or listen to music, then put it down", Marks: 2},
				{Label: "I get stuck scrolling Reels/Shorts well past midnight even though I'm exhausted", Marks: 3},
				{Label: "I fall asleep with the phone literally glowing in my hand", Marks: 4},
			},
		},
		{
			Text:        "When your alarm rings in the morning on a school day, how does your body feel?",
			Section:     "D",
			SectionName: "Evening Wind-down & Digital Recharge",
			IsPositive:  true,
			Options: []Option{
				{Label: "Rested and ready to get moving after a couple of stretches", Marks: 1},
				{Label: "A bit groggy for 10 minutes, then fine after brushing", Marks: 2},
				{Label: "Heavy eyes, hit snooze 3 times, feeling like I barely slept", Marks: 3},
				{Label: "Completely exhausted — waking up feels like climbing a mountain", Marks: 4},
			},
		},
		{
			Text:        "How do you feel about your personal balance between studying, sleeping, and just having fun downtime?",
			Section:     "D",
			SectionName: "Evening Wind-down & Digital Recharge",
			IsPositive:  true,
			Options: []Option{
				{Label: "Well balanced — I make time for friends, hobbies, and prep", Marks: 1},
				{Label: "Decent, though exam weeks throw it off balance temporarily", Marks: 2},
				{Label: "Guilty when relaxing, stressed when studying — never truly relaxed", Marks: 3},
				{Label: "Completely out of control — everything feels like chaos right now", Marks: 4},
			},
		},
	}

	// -----------------------------------------------------------------
	// TIER 3: Senior Scholar Mindset & Stamina Reflection (Classes 11-12)
	// -----------------------------------------------------------------
	tier3Sections := []SectionDef{
		{Key: "A", Name: "Deep Focus & Distraction Friction"},
		{Key: "B", Name: "High-Stakes Pressure & Recovery"},
		{Key: "C", Name: "Social Support vs. Silent Comparison"},
		{Key: "D", Name: "Sleep Debt & Long-Term Stamina"},
	}

	tier3Questions := []Question{
		// Section A
		{
			Text:        "When you sit down for a 2-hour self-study or problem-solving block, what is your focus pattern?",
			Section:     "A",
			SectionName: "Deep Focus & Distraction Friction",
			IsPositive:  true,
			Options: []Option{
				{Label: "I enter deep flow quickly and maintain momentum throughout", Marks: 1},
				{Label: "Takes 15 minutes of friction, then I lock in for steady work", Marks: 2},
				{Label: "Frequent micro-breaks every 10 minutes; mind keeps wandering", Marks: 3},
				{Label: "I sit at the desk for 2 hours but only get 20 minutes of real work done", Marks: 4},
			},
		},
		{
			Text:        "When you encounter a multi-step numerical or concept that makes you feel incompetent, how do you respond?",
			Section:     "A",
			SectionName: "Deep Focus & Distraction Friction",
			IsPositive:  true,
			Options: []Option{
				{Label: "I break it down into core principles and treat it like a puzzle", Marks: 1},
				{Label: "I bookmark it for discussion with a mentor or study partner", Marks: 2},
				{Label: "I feel a wave of panic that I'm not cut out for this competitive level", Marks: 3},
				{Label: "I immediately abandon the topic and avoid testing myself on it", Marks: 4},
			},
		},
		{
			Text:        "What is your relationship with phone notifications during critical study hours?",
			Section:     "A",
			SectionName: "Deep Focus & Distraction Friction",
			IsPositive:  true,
			Options: []Option{
				{Label: "Strict separation: phone in another room or app blockers enabled", Marks: 1},
				{Label: "Silenced on my desk; I check once during scheduled breaks", Marks: 2},
				{Label: "Constantly glancing whenever the screen lights up with coaching updates", Marks: 3},
				{Label: "Total distraction: I constantly switch between PDF notes and social feeds", Marks: 4},
			},
		},
		{
			Text:        "On an open Sunday without external classes, how much internal momentum do you have to execute your study goals?",
			Section:     "A",
			SectionName: "Deep Focus & Distraction Friction",
			IsPositive:  true,
			Options: []Option{
				{Label: "High autonomy: I set my agenda and execute steadily", Marks: 1},
				{Label: "Moderate: I get to it after a slow morning start", Marks: 2},
				{Label: "Low: I spend half the day feeling guilty about not starting yet", Marks: 3},
				{Label: "Paralyzed: inertia wins and I end up wasting the entire day", Marks: 4},
			},
		},

		// Section B
		{
			Text:        "You receive a mock test or coaching rank that is far below your expectations. What is your honest recovery process?",
			Section:     "B",
			SectionName: "High-Stakes Pressure & Recovery",
			IsPositive:  true,
			Options: []Option{
				{Label: "A brief period of disappointment, then systematic error analysis", Marks: 1},
				{Label: "A rough evening, but I reset and recalibrate by next morning", Marks: 2},
				{Label: "Days of severe self-doubt and feeling like all my sacrifices are wasted", Marks: 3},
				{Label: "Complete burnout shutdown: I avoid studying for several days", Marks: 4},
			},
		},
		{
			Text:        "When you think about the upcoming board exams, senior entrance tests, or academic transitions, what is the dominant emotion?",
			Section:     "B",
			SectionName: "High-Stakes Pressure & Recovery",
			IsPositive:  true,
			Options: []Option{
				{Label: "Focused readiness — it's a marathon, and I'm preparing step by step", Marks: 1},
				{Label: "Nervous excitement mixed with natural performance anxiety", Marks: 2},
				{Label: "Dread — feeling like my entire future depends on a single score", Marks: 3},
				{Label: "Numbness — I'm so exhausted by the expectations that I just want it over", Marks: 4},
			},
		},
		{
			Text:        "How do you handle family expectations or parental pressure regarding your academic trajectory?",
			Section:     "B",
			SectionName: "High-Stakes Pressure & Recovery",
			IsPositive:  true,
			Options: []Option{
				{Label: "Open dialogue: we discuss realistic expectations and healthy balance", Marks: 1},
				{Label: "I know they mean well, so I filter out the noise and focus on my work", Marks: 2},
				{Label: "Heavy burden: I feel terrified of disappointing them or failing", Marks: 3},
				{Label: "Constant friction: arguments or total emotional withdrawal at home", Marks: 4},
			},
		},
		{
			Text:        "When an exam week or intense coaching marathon concludes, how effectively does your nervous system reset?",
			Section:     "B",
			SectionName: "High-Stakes Pressure & Recovery",
			IsPositive:  true,
			Options: []Option{
				{Label: "Great: I celebrate, sleep deeply, and return refreshed", Marks: 1},
				{Label: "Decent: takes a couple of days of downtime to recharge", Marks: 2},
				{Label: "Lingering tension: I feel uneasy if I'm not constantly working", Marks: 3},
				{Label: "Physical crash: I often get sick, get migraines, or feel wiped out", Marks: 4},
			},
		},

		// Section C
		{
			Text:        "When classmates or peers discuss their rank, prep materials, or study schedules, how does it affect you?",
			Section:     "C",
			SectionName: "Social Support vs. Silent Comparison",
			IsPositive:  true,
			Options: []Option{
				{Label: "Zero comparison: my only benchmark is my personal trajectory from last week", Marks: 1},
				{Label: "Mild curiosity; I might adopt a useful tip without getting envious", Marks: 2},
				{Label: "Intense comparison: I feel an anxious urge to match or outwork them", Marks: 3},
				{Label: "Impostor syndrome: I feel like a fraud who doesn't belong in this peer group", Marks: 4},
			},
		},
		{
			Text:        "Do you have a circle of peers where you can talk about things OTHER than exams, marks, and coaching?",
			Section:     "C",
			SectionName: "Social Support vs. Silent Comparison",
			IsPositive:  true,
			Options: []Option{
				{Label: "Yes — we have real conversations, laugh, and decompress together", Marks: 1},
				{Label: "A couple of friends, though exam talk inevitably creeps in", Marks: 2},
				{Label: "Rarely — almost every interaction revolves around tests and syllabi", Marks: 3},
				{Label: "No — I feel completely isolated and disconnected from real friendship right now", Marks: 4},
			},
		},
		{
			Text:        "A close batchmate who usually puts on a brave face confides in you that they are secretly crumbling under family/entrance pressure, haven't slept in days, and begs: 'Promise you won't tell anyone, I'll handle it myself.' What is your honest response?",
			Section:     "C",
			SectionName: "Social Support vs. Silent Comparison",
			IsPositive:  true,
			Options: []Option{
				{Label: "I listen with care, but tell them gently: 'Carrying this alone is dangerous — let's speak to a counselor or mentor together.'", Marks: 1},
				{Label: "I offer to be their daily check-in buddy and help break down their workload step by step.", Marks: 2},
				{Label: "I feel terrified carrying their burden alone, anxious that something might go wrong.", Marks: 3},
				{Label: "I feel paralyzed and avoid them because my own stress is already too heavy to handle.", Marks: 4},
			},
		},
		{
			Text:        "How safe do you feel expressing vulnerability or admitting you're struggling to your teachers or mentors?",
			Section:     "C",
			SectionName: "Social Support vs. Silent Comparison",
			IsPositive:  true,
			Options: []Option{
				{Label: "Very safe: I have mentors who provide perspective and genuine support", Marks: 1},
				{Label: "Somewhat safe: depends on whether the teacher is approachable", Marks: 2},
				{Label: "Unsafe: I fear being judged as lazy, uncommitted, or incapable", Marks: 3},
				{Label: "Non-existent: there is no adult in my academic life I can be real with", Marks: 4},
			},
		},

		// Section D
		{
			Text:        "It's 11:15 PM. You have one topic left to review, but your eyes are burning and comprehension has dropped to zero. What do you do?",
			Section:     "D",
			SectionName: "Sleep Debt & Long-Term Stamina",
			IsPositive:  true,
			Options: []Option{
				{Label: "Close the book and sleep. Sleep consolidation is worth more than blurry eyes", Marks: 1},
				{Label: "Review a 2-page summary quickly, then turn off the light", Marks: 2},
				{Label: "Force myself to stay awake out of guilt, even if I retain nothing", Marks: 3},
				{Label: "End up on my phone scrolling for 45 mins because I'm too stressed to sleep", Marks: 4},
			},
		},
		{
			Text:        "How consistent has your sleep schedule been over the past 30 days?",
			Section:     "D",
			SectionName: "Sleep Debt & Long-Term Stamina",
			IsPositive:  true,
			Options: []Option{
				{Label: "Rock solid: 7-8 hours consistently, even during test weeks", Marks: 1},
				{Label: "Decent: 6-7 hours most nights, occasional late night", Marks: 2},
				{Label: "Irregular: 4-5 hours during weekdays, crash sleeping on weekends", Marks: 3},
				{Label: "Severe sleep debt: chronic exhaustion and relying on caffeine to function", Marks: 4},
			},
		},
		{
			Text:        "How often do you take a genuine mental recharge break (exercise, music, walk in nature, unplugged hobby)?",
			Section:     "D",
			SectionName: "Sleep Debt & Long-Term Stamina",
			IsPositive:  true,
			Options: []Option{
				{Label: "Daily or almost daily — it protects my mental stamina and clarity", Marks: 1},
				{Label: "A couple of times a week when time permits", Marks: 2},
				{Label: "Rarely — taking breaks fills me with guilt about wasted time", Marks: 3},
				{Label: "Never — my days are an endless blur of classes, homework, and worry", Marks: 4},
			},
		},
		{
			Text:        "When you look at the journey ahead towards your graduation and entrance goals, what is your overall mindset?",
			Section:     "D",
			SectionName: "Sleep Debt & Long-Term Stamina",
			IsPositive:  true,
			Options: []Option{
				{Label: "Grounded resilience: whatever happens, I'm developing lifelong tenacity and grit", Marks: 1},
				{Label: "Cautiously optimistic: one chapter and one day at a time", Marks: 2},
				{Label: "High anxiety: constantly worried that my best won't be enough", Marks: 3},
				{Label: "Nearing burnout: feeling like I'm surviving rather than thriving", Marks: 4},
			},
		},
	}

	buckets := []Bucket{
		{Label: "Optimal Resilience", MinScore: 12, MaxScore: 20, Color: "#10B981"},
		{Label: "Emerging Tenacity", MinScore: 21, MaxScore: 32, Color: "#3B82F6"},
		{Label: "Moderate Stress / Focus Support", MinScore: 33, MaxScore: 44, Color: "#F59E0B"},
		{Label: "High Support Needed", MinScore: 45, MaxScore: 64, Color: "#EF4444"},
	}

	bucketsJSON, _ := json.Marshal(buckets)

	// Helper to insert or update tiered assessment
	seedTier := func(title, desc, tier string, minGrade, maxGrade int, targetGrades []string, sectionsDef []SectionDef, questions []Question) {
		type SecObj struct {
			Title     string     `json:"title"`
			Questions []Question `json:"questions"`
		}
		var sections []SecObj
		secMap := make(map[string][]Question)
		for _, q := range questions {
			secMap[q.SectionName] = append(secMap[q.SectionName], q)
		}
		for _, s := range sectionsDef {
			sections = append(sections, SecObj{
				Title:     s.Name,
				Questions: secMap[s.Name],
			})
		}

		qJSON, _ := json.Marshal(questions)
		customSecJSON, _ := json.Marshal(sectionsDef)
		secJSON, _ := json.Marshal(sections)

		var existingID string
		err := dbPool.QueryRow(ctx, "SELECT id FROM assessments WHERE title = $1", title).Scan(&existingID)
		if err == nil && existingID != "" {
			_, err = dbPool.Exec(ctx, `
				UPDATE assessments 
				SET description = $1, questions = $2, buckets = $3, custom_sections = $4, sections = $5, is_active = true,
				    tier = $6, min_grade = $7, max_grade = $8, target_grades = $9
				WHERE id = $10
			`, desc, qJSON, bucketsJSON, customSecJSON, secJSON, tier, minGrade, maxGrade, targetGrades, existingID)
			if err != nil {
				log.Fatalf("Failed to update assessment %s: %v", title, err)
			}
			fmt.Printf("Updated assessment '%s' (%s) with %d questions\n", title, existingID, len(questions))
		} else {
			var newID string
			err = dbPool.QueryRow(ctx, `
				INSERT INTO assessments (title, description, is_default, time_per_question, total_time, inactivity_alert_time, inactivity_end_time, questions, buckets, section_buckets, custom_sections, sections, is_active, tier, min_grade, max_grade, target_grades)
				VALUES ($1, $2, false, 30, 15, 40, 120, $3, $4, true, $5, $6, true, $7, $8, $9, $10)
				RETURNING id
			`, title, desc, qJSON, bucketsJSON, customSecJSON, secJSON, tier, minGrade, maxGrade, targetGrades).Scan(&newID)
			if err != nil {
				log.Fatalf("Failed to insert assessment %s: %v", title, err)
			}
			fmt.Printf("Created assessment '%s' (%s) with %d questions\n", title, newID, len(questions))
		}
	}

	// Seed Tier 1 (Classes 6-8)
	seedTier(
		"Middle School Day-in-the-Life Reflection (Grades 6-8)",
		"A friendly, story-driven check-in exploring daily classroom moments, making friends, handling tough homework, and screen habits.",
		"middle", 6, 8, []string{"6", "7", "8"},
		tier1Sections,
		tier1Questions,
	)

	// Seed Tier 2 (Classes 9-10)
	seedTier(
		"Secondary Student Rhythm & Resilience Check-in (Grades 9-10)",
		"An honest, scenario-driven reflection on academic momentum, peer dynamics, exam prep pressure, and managing focus.",
		"secondary", 9, 10, []string{"9", "10"},
		tier2Sections,
		tier2Questions,
	)

	// Seed Tier 3 (Classes 11-12)
	seedTier(
		"Senior Scholar Mindset & Stamina Reflection (Grades 11-12)",
		"A mature, non-judgmental check-in designed for high-stakes preparation, cognitive stamina, burnout awareness, and personal autonomy.",
		"senior", 11, 12, []string{"11", "12"},
		tier3Sections,
		tier3Questions,
	)

	// Update all schools to have all active assessments assigned
	_, err = dbPool.Exec(ctx, `
		UPDATE schools 
		SET assigned_tests = ARRAY(SELECT id FROM assessments WHERE is_active = true)
	`)
	if err != nil {
		log.Printf("Warning: failed to assign tests to schools: %v", err)
	} else {
		fmt.Println("Assigned all active tiered assessments to all registered institutions")
	}
}
