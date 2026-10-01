package repository

import (
	"context"
	"encoding/json"
	"log"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

type seedOption struct {
	Label string `json:"label"`
	Marks int    `json:"marks"`
}

type seedQuestion struct {
	ID          string       `json:"id,omitempty"`
	Text        string       `json:"text"`
	Section     string       `json:"section"`
	SectionName string       `json:"sectionName"`
	Direction   string       `json:"direction,omitempty"`
	IsPositive  bool         `json:"isPositive"`
	Options     []seedOption `json:"options"`
}

type seedBucket struct {
	Label    string `json:"label"`
	MinScore int    `json:"minScore"`
	MaxScore int    `json:"maxScore"`
	Color    string `json:"color"`
}

type seedSectionDef struct {
	Key  string `json:"key"`
	Name string `json:"name"`
}

type seedSectionObj struct {
	Title     string         `json:"title"`
	Questions []seedQuestion `json:"questions"`
}

// getDefaultV4Questions returns the official 32-item student assessment (v4.0)
func getDefaultV4Questions() []seedQuestion {
	options := []seedOption{
		{Label: "Not like me", Marks: 1},
		{Label: "A little like me", Marks: 2},
		{Label: "Quite like me", Marks: 3},
		{Label: "Very much like me", Marks: 4},
	}

	return []seedQuestion{
		// Section A: Focus & Attention
		{ID: "A1", Text: "When I am doing homework and a message appears on my phone, my attention gets pulled away from my work.", Section: "A", SectionName: "Focus & Attention", Direction: "R", IsPositive: false, Options: options},
		{ID: "A2", Text: "When I notice that my mind has wandered while reading, I can bring my attention back to what I was reading.", Section: "A", SectionName: "Focus & Attention", Direction: "P", IsPositive: true, Options: options},
		{ID: "A3", Text: "When I have homework to finish but would rather be doing something else, I can stay with the homework for a while.", Section: "A", SectionName: "Focus & Attention", Direction: "P", IsPositive: true, Options: options},
		{ID: "A4", Text: "When I remember another thing I want to do while I am already working on something, I switch before finishing what I started.", Section: "A", SectionName: "Focus & Attention", Direction: "R", IsPositive: false, Options: options},
		{ID: "A5", Text: "When I have several things to finish, I can decide which one to start first.", Section: "A", SectionName: "Focus & Attention", Direction: "P", IsPositive: true, Options: options},
		{ID: "A6", Text: "After someone interrupts me while I am working, it takes me a while to get back into the task.", Section: "A", SectionName: "Focus & Attention", Direction: "R", IsPositive: false, Options: options},
		{ID: "A7", Text: "When people around me are talking while I am working, I can keep working on what I am doing.", Section: "A", SectionName: "Focus & Attention", Direction: "P", IsPositive: true, Options: options},
		{ID: "A8", Text: "When I notice another activity while I am working, I can decide whether to switch to it or stay with what I am doing.", Section: "A", SectionName: "Focus & Attention", Direction: "P", IsPositive: true, Options: options},

		// Section B: Inner Confidence
		{ID: "B1", Text: "When something does not work the first time, I can trust myself to try another way.", Section: "B", SectionName: "Inner Confidence", Direction: "P", IsPositive: true, Options: options},
		{ID: "B2", Text: "When someone my age is doing better than me at something I care about, I start to feel that I am not good enough.", Section: "B", SectionName: "Inner Confidence", Direction: "R", IsPositive: false, Options: options},
		{ID: "B3", Text: "When I do not understand something, I can ask for help without feeling bad about myself.", Section: "B", SectionName: "Inner Confidence", Direction: "P", IsPositive: true, Options: options},
		{ID: "B4", Text: "When I am not sure I will do something well, I avoid starting because I might fail.", Section: "B", SectionName: "Inner Confidence", Direction: "R", IsPositive: false, Options: options},
		{ID: "B5", Text: "When I look at my earlier work, I can notice something I have improved.", Section: "B", SectionName: "Inner Confidence", Direction: "P", IsPositive: true, Options: options},
		{ID: "B6", Text: "When someone gives me feedback, I can listen to it without feeling that it means I am not good enough.", Section: "B", SectionName: "Inner Confidence", Direction: "P", IsPositive: true, Options: options},
		{ID: "B7", Text: "When I am unsure how something will turn out, I can trust myself enough to take one small step.", Section: "B", SectionName: "Inner Confidence", Direction: "P", IsPositive: true, Options: options},
		{ID: "B8", Text: "When I face a difficult challenge, I can stay steady and give it an honest try.", Section: "B", SectionName: "Inner Confidence", Direction: "P", IsPositive: true, Options: options},

		// Section C: Social Interaction
		{ID: "C1", Text: "When I have an idea in a group but am unsure how others will react, I keep the idea to myself.", Section: "C", SectionName: "Social Interaction", Direction: "R", IsPositive: false, Options: options},
		{ID: "C2", Text: "When a friend disagrees with my view, I try to understand their point of view.", Section: "C", SectionName: "Social Interaction", Direction: "P", IsPositive: true, Options: options},
		{ID: "C3", Text: "When a friend asks me to do something I do not want to do, I agree because I am worried they will be upset if I say no.", Section: "C", SectionName: "Social Interaction", Direction: "R", IsPositive: false, Options: options},
		{ID: "C4", Text: "When someone asks me to join an activity I do not want to join, I can say no respectfully.", Section: "C", SectionName: "Social Interaction", Direction: "P", IsPositive: true, Options: options},
		{ID: "C5", Text: "When a conversation with someone my age becomes awkward, I can stay calm enough to decide what to do next.", Section: "C", SectionName: "Social Interaction", Direction: "P", IsPositive: true, Options: options},
		{ID: "C6", Text: "When someone in my group has not spoken for a while, I notice that they may be getting left out.", Section: "C", SectionName: "Social Interaction", Direction: "P", IsPositive: true, Options: options},
		{ID: "C7", Text: "When someone keeps crossing a boundary after I have said I am uncomfortable, I can ask someone I trust for help.", Section: "C", SectionName: "Social Interaction", Direction: "P", IsPositive: true, Options: options},
		{ID: "C8", Text: "When a social situation feels too difficult to handle on my own, I can identify someone I trust to ask for help.", Section: "C", SectionName: "Social Interaction", Direction: "P", IsPositive: true, Options: options},

		// Section D: Healthy Digital Habits
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

// getTier1Data returns the 24 scenario questions for Grades 6-8
func getTier1Data() ([]seedSectionDef, []seedQuestion) {
	sections := []seedSectionDef{
		{Key: "A", Name: "Morning Rhythm & School Arrival"},
		{Key: "B", Name: "Classroom Curiosity & Speaking Up"},
		{Key: "C", Name: "Recess, Friends & Group Play"},
		{Key: "D", Name: "Evening Homework & Screen Time"},
	}

	questions := []seedQuestion{
		// Section A
		{
			Text:        "You walk through the school gate in the morning and see classmates chatting in groups. What is your honest first feeling?",
			Section:     "A",
			SectionName: "Morning Rhythm & School Arrival",
			IsPositive:  true,
			Options: []seedOption{
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
			Options: []seedOption{
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
			Options: []seedOption{
				{Label: "Full of energy and curious about what we'll do today", Marks: 1},
				{Label: "Decent energy — takes about 10 minutes to kick in", Marks: 2},
				{Label: "Yawning and daydreaming through most of it", Marks: 3},
				{Label: "Mentally exhausted before the first bell even rings", Marks: 4},
			},
		},
		{
			Text:        "When you arrive at your desk, how organized does your workspace and school day feel?",
			Section:     "A",
			SectionName: "Morning Rhythm & School Arrival",
			IsPositive:  true,
			Options: []seedOption{
				{Label: "I know exactly which books I need and feel in control", Marks: 1},
				{Label: "A little messy, but I manage to find my things", Marks: 2},
				{Label: "Often rummaging through my bag at the last minute", Marks: 3},
				{Label: "Always forgetting pens, rulers, or notebooks", Marks: 4},
			},
		},
		{
			Text:        "If the weather or traffic makes you 5 minutes late to school, how does your morning go?",
			Section:     "A",
			SectionName: "Morning Rhythm & School Arrival",
			IsPositive:  false,
			Options: []seedOption{
				{Label: "Calmly explain the delay and catch up on the blackboard notes", Marks: 1},
				{Label: "Walk in quietly with slight hesitation", Marks: 2},
				{Label: "Feel embarrassed with everybody looking at me", Marks: 3},
				{Label: "Ruin my entire mood for the rest of the morning", Marks: 4},
			},
		},
		{
			Text:        "Before the teacher walks in, how do you spend your five spare minutes at your desk?",
			Section:     "A",
			SectionName: "Morning Rhythm & School Arrival",
			IsPositive:  true,
			Options: []seedOption{
				{Label: "Chatting cheerfully with benchmates or reviewing today's timetable", Marks: 1},
				{Label: "Doodling or reading a storybook quietly", Marks: 2},
				{Label: "Worrying if there's a surprise test I forgot about", Marks: 3},
				{Label: "Feeling restless and wanting to run out into the corridor", Marks: 4},
			},
		},

		// Section B
		{
			Text:        "The teacher asks a question to the whole room. You think you know the answer, but you're not 100% sure. What usually happens?",
			Section:     "B",
			SectionName: "Classroom Curiosity & Speaking Up",
			IsPositive:  true,
			Options: []seedOption{
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
			Options: []seedOption{
				{Label: "Take a sip of water, draw it out, or ask someone for a clue", Marks: 1},
				{Label: "Skip it for now and come back to it with fresh eyes later", Marks: 2},
				{Label: "Feel irritated and mutter 'I'm just bad at this subject'", Marks: 3},
				{Label: "Slam the notebook shut and refuse to look at it again", Marks: 4},
			},
		},
		{
			Text:        "The teacher calls on you randomly to read a paragraph aloud. How does your voice and chest feel?",
			Section:     "B",
			SectionName: "Classroom Curiosity & Speaking Up",
			IsPositive:  true,
			Options: []seedOption{
				{Label: "Clear and confident — I enjoy reading aloud", Marks: 1},
				{Label: "A little flutter in my tummy, but I read smoothly", Marks: 2},
				{Label: "Shaky voice, trying to read as fast as possible to sit down", Marks: 3},
				{Label: "Heart pounding, stumble over words and feel like sinking into the floor", Marks: 4},
			},
		},
		{
			Text:        "When you don't understand an explanation on the board, what do you usually do?",
			Section:     "B",
			SectionName: "Classroom Curiosity & Speaking Up",
			IsPositive:  true,
			Options: []seedOption{
				{Label: "Politely raise my hand and ask 'Could you please explain that once more?'", Marks: 1},
				{Label: "Wait until after class and ask a trusted friend", Marks: 2},
				{Label: "Pretend I understood so the teacher doesn't stop", Marks: 3},
				{Label: "Zone out because it feels too difficult anyway", Marks: 4},
			},
		},
		{
			Text:        "A classmate gives an answer that makes the teacher smile and compliment them. What thought comes to you?",
			Section:     "B",
			SectionName: "Classroom Curiosity & Speaking Up",
			IsPositive:  true,
			Options: []seedOption{
				{Label: "Nice! That was a really clever way of explaining it", Marks: 1},
				{Label: "Cool, now I know the answer too", Marks: 2},
				{Label: "Wish I was as smart or confident as them", Marks: 3},
				{Label: "The teacher always picks favorites", Marks: 4},
			},
		},
		{
			Text:        "When starting a new creative project (like a poster, story, or science model), how does it feel?",
			Section:     "B",
			SectionName: "Classroom Curiosity & Speaking Up",
			IsPositive:  true,
			Options: []seedOption{
				{Label: "Excited with lots of fun ideas popping into my head", Marks: 1},
				{Label: "A little unsure at first, but fun once I get started", Marks: 2},
				{Label: "Nervous that mine won't look as pretty as other students'", Marks: 3},
				{Label: "Dread it — I'd rather just be told exactly what to write", Marks: 4},
			},
		},

		// Section C
		{
			Text:        "The bell rings for lunch break and everyone heads outside. Where are you most likely found?",
			Section:     "C",
			SectionName: "Recess, Friends & Group Play",
			IsPositive:  true,
			Options: []seedOption{
				{Label: "In the middle of the field running around or playing games with friends", Marks: 1},
				{Label: "Sitting with 2 or 3 close pals sharing tiffin and laughing", Marks: 2},
				{Label: "Walking around the edges, wishing someone would invite me over", Marks: 3},
				{Label: "Sitting alone in the library or corner of the classroom", Marks: 4},
			},
		},
		{
			Text:        "Two of your friends get into an argument during lunch about rules of a game. How do you respond?",
			Section:     "C",
			SectionName: "Recess, Friends & Group Play",
			IsPositive:  true,
			Options: []seedOption{
				{Label: "Help them talk it out calmly or suggest a fair coin toss", Marks: 1},
				{Label: "Stay neutral and give them space to cool off", Marks: 2},
				{Label: "Pick one side because I'm afraid of losing that friend", Marks: 3},
				{Label: "Feel super uncomfortable and walk away feeling upset", Marks: 4},
			},
		},
		{
			Text:        "Someone makes a joke at your expense during recess in front of other students. What happens inside you?",
			Section:     "C",
			SectionName: "Recess, Friends & Group Play",
			IsPositive:  false,
			Options: []seedOption{
				{Label: "Laugh it off if it's friendly, or firmly say 'Hey, that's not cool'", Marks: 1},
				{Label: "Shrug it off outwardly, but feel a little stung inside", Marks: 2},
				{Label: "Get very quiet and replay the moment in my head all afternoon", Marks: 3},
				{Label: "Lose my temper or feel like crying in the washroom", Marks: 4},
			},
		},
		{
			Text:        "You see a new student sitting alone at an empty bench with their lunch box. What do you do?",
			Section:     "C",
			SectionName: "Recess, Friends & Group Play",
			IsPositive:  true,
			Options: []seedOption{
				{Label: "Wave and invite them over to sit with our group", Marks: 1},
				{Label: "Give them a friendly smile as I walk past", Marks: 2},
				{Label: "Notice them, but feel too shy to initiate conversation", Marks: 3},
				{Label: "Don't pay much attention — stick to my own circle", Marks: 4},
			},
		},
		{
			Text:        "When you want to share a fun secret or something exciting that happened, do you have someone you trust?",
			Section:     "C",
			SectionName: "Recess, Friends & Group Play",
			IsPositive:  true,
			Options: []seedOption{
				{Label: "Yes, I have 1 or 2 great friends who always listen without judging", Marks: 1},
				{Label: "Yes, though I sometimes wonder if they tell others", Marks: 2},
				{Label: "I usually keep personal things to myself", Marks: 3},
				{Label: "No, I don't feel I have anyone at school who truly understands me", Marks: 4},
			},
		},
		{
			Text:        "A friend asks to copy your homework right before the teacher collects it. What do you do?",
			Section:     "C",
			SectionName: "Recess, Friends & Group Play",
			IsPositive:  true,
			Options: []seedOption{
				{Label: "Politely offer to explain how to do it, but don't just hand over my book", Marks: 1},
				{Label: "Let them look at one answer if they're genuinely stuck", Marks: 2},
				{Label: "Hand it over because I'm scared they'll stop talking to me if I say no", Marks: 3},
				{Label: "Lie and say I haven't done it either to avoid tension", Marks: 4},
			},
		},

		// Section D
		{
			Text:        "You sit down at your home study table after tea. What's your usual routine?",
			Section:     "D",
			SectionName: "Evening Homework & Screen Time",
			IsPositive:  true,
			Options: []seedOption{
				{Label: "Open the school diary, finish tough stuff first, then enjoy my evening", Marks: 1},
				{Label: "Take a few breaks, but finish everything before dinner", Marks: 2},
				{Label: "Stare at the book while thinking about other things for an hour", Marks: 3},
				{Label: "Fight with parents over starting homework; push it to late night", Marks: 4},
			},
		},
		{
			Text:        "Your phone or tablet is next to your notebook while doing math problems. What happens?",
			Section:     "D",
			SectionName: "Evening Homework & Screen Time",
			IsPositive:  true,
			Options: []seedOption{
				{Label: "I put it on silent across the room so I don't get distracted", Marks: 1},
				{Label: "I only check it when I finish a whole chapter or worksheet", Marks: 2},
				{Label: "Every notification makes me look, and a 5-minute break turns into 30", Marks: 3},
				{Label: "I can't study without a video playing or chat buzzing constantly", Marks: 4},
			},
		},
		{
			Text:        "When someone at home asks 'How was your day at school today?', what is your usual answer?",
			Section:     "D",
			SectionName: "Evening Homework & Screen Time",
			IsPositive:  true,
			Options: []seedOption{
				{Label: "Tell them about a funny moment, what we learned, or how lunch went", Marks: 1},
				{Label: "'Fine' or 'Good' — keep it short unless something big happened", Marks: 2},
				{Label: "Shrug and go straight to my room", Marks: 3},
				{Label: "Get annoyed because I don't feel like talking about school at home", Marks: 4},
			},
		},
		{
			Text:        "When you lie down in bed at night to sleep, what is your mind usually doing?",
			Section:     "D",
			SectionName: "Evening Homework & Screen Time",
			IsPositive:  true,
			Options: []seedOption{
				{Label: "Peaceful — I fall asleep fairly quickly", Marks: 1},
				{Label: "Thinking about fun things or playing out stories in my head", Marks: 2},
				{Label: "Worrying about tomorrow's tests, homework, or school stuff", Marks: 3},
				{Label: "Tossing and turning, unable to turn off my racing thoughts", Marks: 4},
			},
		},
		{
			Text:        "When you wake up on a Saturday morning with no school, how does your heart feel?",
			Section:     "D",
			SectionName: "Evening Homework & Screen Time",
			IsPositive:  true,
			Options: []seedOption{
				{Label: "Light and happy! Ready to play outside, draw, or spend time with family", Marks: 1},
				{Label: "Excited to play video games or watch cartoons", Marks: 2},
				{Label: "Still tired and wanting to sleep all day", Marks: 3},
				{Label: "Bored and unsure what to do with myself", Marks: 4},
			},
		},
		{
			Text:        "If you had a magic wand that could change one thing about your school life, what would it be?",
			Section:     "D",
			SectionName: "Evening Homework & Screen Time",
			IsPositive:  true,
			Options: []seedOption{
				{Label: "More hands-on science experiments, art, and sports time!", Marks: 1},
				{Label: "A little less homework so evenings feel more relaxed", Marks: 2},
				{Label: "Fewer tests so I don't feel nervous all the time", Marks: 3},
				{Label: "A friend group where I truly feel I belong without trying hard", Marks: 4},
			},
		},
	}

	return sections, questions
}

// getTier2Data returns the 24 scenario questions for Grades 9-10
func getTier2Data() ([]seedSectionDef, []seedQuestion) {
	sections := []seedSectionDef{
		{Key: "A", Name: "Classroom Dynamics & Speaking Up"},
		{Key: "B", Name: "The Study Desk & Focus Stamina"},
		{Key: "C", Name: "Peer Belonging & Comparison"},
		{Key: "D", Name: "Evening Wind-down & Digital Recharge"},
	}

	questions := []seedQuestion{
		// Section A
		{
			Text:        "The teacher is explaining a complex concept and everyone else seems to be nodding, but you're completely lost. What do you do?",
			Section:     "A",
			SectionName: "Classroom Dynamics & Speaking Up",
			IsPositive:  true,
			Options: []seedOption{
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
			Options: []seedOption{
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
			Options: []seedOption{
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
			Options: []seedOption{
				{Label: "Very comfortable — I enjoy coordinating and brainstorming", Marks: 1},
				{Label: "I contribute my fair share when asked", Marks: 2},
				{Label: "I stay quiet and let the louder members decide everything", Marks: 3},
				{Label: "I feel stressed and prefer doing individual assignments alone", Marks: 4},
			},
		},
		{
			Text:        "When a teacher gives constructive feedback on an essay or project, how do you take it?",
			Section:     "A",
			SectionName: "Classroom Dynamics & Speaking Up",
			IsPositive:  true,
			Options: []seedOption{
				{Label: "Grateful for specific guidance to improve next time", Marks: 1},
				{Label: "Mildly defensive at first, but understand the point later", Marks: 2},
				{Label: "Feel like they dislike me personally", Marks: 3},
				{Label: "Ignore it and feel demoralized", Marks: 4},
			},
		},
		{
			Text:        "During a double period of a dense academic subject, how do you maintain focus?",
			Section:     "A",
			SectionName: "Classroom Dynamics & Speaking Up",
			IsPositive:  true,
			Options: []seedOption{
				{Label: "Active note-taking and asking questions keeps my mind engaged", Marks: 1},
				{Label: "Focus fades halfway through, but I recover after a water break", Marks: 2},
				{Label: "Start doodling or staring out the window for the entire second period", Marks: 3},
				{Label: "Mentally check out completely within the first 20 minutes", Marks: 4},
			},
		},

		// Section B
		{
			Text:        "You sit down at your study desk with a 20-page textbook chapter. What happens in the first 10 minutes?",
			Section:     "B",
			SectionName: "The Study Desk & Focus Stamina",
			IsPositive:  true,
			Options: []seedOption{
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
			Options: []seedOption{
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
			Options: []seedOption{
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
			Options: []seedOption{
				{Label: "Proud of the effort I put in, regardless of how tough it was", Marks: 1},
				{Label: "Relieved that it's over for today", Marks: 2},
				{Label: "Worried that I didn't memorize enough of it", Marks: 3},
				{Label: "Just drained and exhausted", Marks: 4},
			},
		},
		{
			Text:        "When you run into a concept that seems completely impossible to understand, what's your next move?",
			Section:     "B",
			SectionName: "The Study Desk & Focus Stamina",
			IsPositive:  true,
			Options: []seedOption{
				{Label: "Look up a YouTube breakdown, diagram, or ask a peer for an analogy", Marks: 1},
				{Label: "Mark it and ask my teacher the next morning", Marks: 2},
				{Label: "Try to memorize the exact words without understanding the logic", Marks: 3},
				{Label: "Give up on that topic and hope it doesn't appear on the exam", Marks: 4},
			},
		},
		{
			Text:        "How consistent are your daily revision habits when exams are still a month away?",
			Section:     "B",
			SectionName: "The Study Desk & Focus Stamina",
			IsPositive:  true,
			Options: []seedOption{
				{Label: "Steady: 1-2 hours of consistent daily review avoids last-minute panic", Marks: 1},
				{Label: "Moderate: I do homework, but deep study only starts 2 weeks prior", Marks: 2},
				{Label: "Cramming mode: I only study when the panic of exam week hits", Marks: 3},
				{Label: "Chaotic: irregular bursts followed by days of complete procrastination", Marks: 4},
			},
		},

		// Section C
		{
			Text:        "A classmate casually boasts that they finished the entire syllabus and three sample papers. How does it land with you?",
			Section:     "C",
			SectionName: "Peer Belonging & Comparison",
			IsPositive:  true,
			Options: []seedOption{
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
			Options: []seedOption{
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
			Options: []seedOption{
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
			Options: []seedOption{
				{Label: "I hold the boundary firmly: 'If there's something to discuss, it's between you two — I don't carry rumors.'", Marks: 1},
				{Label: "I give a calm, neutral non-answer so I don't break trust, but don't lie either.", Marks: 2},
				{Label: "My heart races, feeling trapped in the middle and terrified that both friends will be mad at me.", Marks: 3},
				{Label: "The social pressure gets too intense, and I drop a hint just to stop the awkwardness.", Marks: 4},
			},
		},
		{
			Text:        "When seeing friends post about group hangouts you weren't invited to, what is your initial reaction?",
			Section:     "C",
			SectionName: "Peer Belonging & Comparison",
			IsPositive:  false,
			Options: []seedOption{
				{Label: "Fine with it — not every hangout includes everyone", Marks: 1},
				{Label: "Slight sting of FOMO, but I move on to my own evening", Marks: 2},
				{Label: "Ruminate on what I did wrong or why they left me out", Marks: 3},
				{Label: "Deeply hurt and feel like withdrawing from the group entirely", Marks: 4},
			},
		},
		{
			Text:        "When someone in your class is being teased or isolated, how do you handle it?",
			Section:     "C",
			SectionName: "Peer Belonging & Comparison",
			IsPositive:  true,
			Options: []seedOption{
				{Label: "Speak up or sit with them later to make sure they're okay", Marks: 1},
				{Label: "Don't participate in the teasing, but don't intervene openly", Marks: 2},
				{Label: "Laugh along nervously so the attention doesn't turn onto me", Marks: 3},
				{Label: "Avoid looking at them entirely to stay out of drama", Marks: 4},
			},
		},

		// Section D
		{
			Text:        "You're studying at 9:30 PM and your class WhatsApp group starts buzzing with test gossip and memes. What do you do?",
			Section:     "D",
			SectionName: "Evening Wind-down & Digital Recharge",
			IsPositive:  true,
			Options: []seedOption{
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
			Options: []seedOption{
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
			Options: []seedOption{
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
			Options: []seedOption{
				{Label: "Well balanced — I make time for friends, hobbies, and prep", Marks: 1},
				{Label: "Decent, though exam weeks throw it off balance temporarily", Marks: 2},
				{Label: "Guilty when relaxing, stressed when studying — never truly relaxed", Marks: 3},
				{Label: "Completely out of control — everything feels like chaos right now", Marks: 4},
			},
		},
		{
			Text:        "When you feel mentally drained after school, what is your most restorative recharge habit?",
			Section:     "D",
			SectionName: "Evening Wind-down & Digital Recharge",
			IsPositive:  true,
			Options: []seedOption{
				{Label: "A walk, workout, shower, healthy snack, or music without screen overload", Marks: 1},
				{Label: "A quick nap or chatting with a friend", Marks: 2},
				{Label: "Endless scrolling on social media that leaves me feeling even more drained", Marks: 3},
				{Label: "Lying in the dark feeling overwhelmed about everything I still have to do", Marks: 4},
			},
		},
		{
			Text:        "Looking ahead to your board exams and upcoming high school years, how do you view your journey?",
			Section:     "D",
			SectionName: "Evening Wind-down & Digital Recharge",
			IsPositive:  true,
			Options: []seedOption{
				{Label: "Confident and steady — one chapter and one week at a time", Marks: 1},
				{Label: "A bit nervous, but capable of handling it with support", Marks: 2},
				{Label: "Under heavy pressure from all sides", Marks: 3},
				{Label: "Terrified of failing and letting people down", Marks: 4},
			},
		},
	}

	return sections, questions
}

// getTier3Data returns the 24 scenario questions for Grades 11-12
func getTier3Data() ([]seedSectionDef, []seedQuestion) {
	sections := []seedSectionDef{
		{Key: "A", Name: "Deep Focus & Distraction Friction"},
		{Key: "B", Name: "High-Stakes Pressure & Recovery"},
		{Key: "C", Name: "Social Support vs. Silent Comparison"},
		{Key: "D", Name: "Sleep Debt & Long-Term Stamina"},
	}

	questions := []seedQuestion{
		// Section A
		{
			Text:        "When you sit down for a 2-hour self-study or problem-solving block, what is your focus pattern?",
			Section:     "A",
			SectionName: "Deep Focus & Distraction Friction",
			IsPositive:  true,
			Options: []seedOption{
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
			Options: []seedOption{
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
			Options: []seedOption{
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
			Options: []seedOption{
				{Label: "High autonomy: I set my agenda and execute steadily", Marks: 1},
				{Label: "Moderate: I get to it after a slow morning start", Marks: 2},
				{Label: "Low: I spend half the day feeling guilty about not starting yet", Marks: 3},
				{Label: "Paralyzed: inertia wins and I end up wasting the entire day", Marks: 4},
			},
		},
		{
			Text:        "When learning a concept that requires intense abstract reasoning, what is your stamina limit before fatigue sets in?",
			Section:     "A",
			SectionName: "Deep Focus & Distraction Friction",
			IsPositive:  true,
			Options: []seedOption{
				{Label: "60-90 minutes of sustained deep thinking", Marks: 1},
				{Label: "45 minutes, then I need a 5-minute cognitive reset", Marks: 2},
				{Label: "20 minutes before my eyes glaze over and I begin skimming", Marks: 3},
				{Label: "I experience cognitive fatigue almost immediately", Marks: 4},
			},
		},
		{
			Text:        "When you make a study plan for the week, how closely does your reality match your spreadsheet or diary?",
			Section:     "A",
			SectionName: "Deep Focus & Distraction Friction",
			IsPositive:  true,
			Options: []seedOption{
				{Label: "80-90% execution with flexible buffers for unexpected events", Marks: 1},
				{Label: "60-70% execution; I adjust as I go along", Marks: 2},
				{Label: "Less than 40%; the plan falls apart by Tuesday afternoon", Marks: 3},
				{Label: "I stopped making plans because failing to follow them makes me feel hopeless", Marks: 4},
			},
		},

		// Section B
		{
			Text:        "You receive a mock test or coaching rank that is far below your expectations. What is your honest recovery process?",
			Section:     "B",
			SectionName: "High-Stakes Pressure & Recovery",
			IsPositive:  true,
			Options: []seedOption{
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
			Options: []seedOption{
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
			Options: []seedOption{
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
			Options: []seedOption{
				{Label: "Great: I celebrate, sleep deeply, and return refreshed", Marks: 1},
				{Label: "Decent: takes a couple of days of downtime to recharge", Marks: 2},
				{Label: "Lingering tension: I feel uneasy if I'm not constantly working", Marks: 3},
				{Label: "Physical crash: I often get sick, get migraines, or feel wiped out", Marks: 4},
			},
		},
		{
			Text:        "How do you deal with the psychological weight of competitive exam prep or college admissions?",
			Section:     "B",
			SectionName: "High-Stakes Pressure & Recovery",
			IsPositive:  true,
			Options: []seedOption{
				{Label: "I keep perspective: my worth is much bigger than an exam rank", Marks: 1},
				{Label: "I treat it like athletic training: high effort, but boundaries on burnout", Marks: 2},
				{Label: "It consumes my entire identity — every waking minute feels high stakes", Marks: 3},
				{Label: "I feel like a spectator watching myself spiral without the will to stop it", Marks: 4},
			},
		},
		{
			Text:        "When faced with an unexpected shift in syllabus, test pattern, or schedule, how agile are you?",
			Section:     "B",
			SectionName: "High-Stakes Pressure & Recovery",
			IsPositive:  true,
			Options: []seedOption{
				{Label: "Adaptable: I revise my strategy and adjust immediately", Marks: 1},
				{Label: "Frustrated initially, but adapt within a couple of days", Marks: 2},
				{Label: "Severely rattled — changes throw my confidence off for weeks", Marks: 3},
				{Label: "Hopeless — feeling like the system is deliberately working against me", Marks: 4},
			},
		},

		// Section C
		{
			Text:        "When classmates or peers discuss their rank, prep materials, or study schedules, how does it affect you?",
			Section:     "C",
			SectionName: "Social Support vs. Silent Comparison",
			IsPositive:  true,
			Options: []seedOption{
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
			Options: []seedOption{
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
			Options: []seedOption{
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
			Options: []seedOption{
				{Label: "Very safe: I have mentors who provide perspective and genuine support", Marks: 1},
				{Label: "Somewhat safe: depends on whether the teacher is approachable", Marks: 2},
				{Label: "Unsafe: I fear being judged as lazy, uncommitted, or incapable", Marks: 3},
				{Label: "Non-existent: there is no adult in my academic life I can be real with", Marks: 4},
			},
		},
		{
			Text:        "When you see a peer succeeding effortlessly or achieving a top score, what is your genuine reaction?",
			Section:     "C",
			SectionName: "Social Support vs. Silent Comparison",
			IsPositive:  true,
			Options: []seedOption{
				{Label: "Sincerely happy for them: their success does not diminish my potential", Marks: 1},
				{Label: "Polite congratulations, though I quietly wish it was me", Marks: 2},
				{Label: "Bitterness and resentment: wondering why my effort never yields the same", Marks: 3},
				{Label: "Despair: feeling like the competitive gap between us is insurmountable", Marks: 4},
			},
		},
		{
			Text:        "In moments of acute emotional distress or panic before a major test, what is your safety valve?",
			Section:     "C",
			SectionName: "Social Support vs. Silent Comparison",
			IsPositive:  true,
			Options: []seedOption{
				{Label: "I pause, breathe, reach out to my support person, and regain grounding", Marks: 1},
				{Label: "I take a solo break, drink cold water, and talk myself through it", Marks: 2},
				{Label: "I bottle it inside, dissociate, and power through on pure adrenaline", Marks: 3},
				{Label: "I have emotional breakdowns in private washrooms or bedrooms", Marks: 4},
			},
		},

		// Section D
		{
			Text:        "It's 11:15 PM. You have one topic left to review, but your eyes are burning and comprehension has dropped to zero. What do you do?",
			Section:     "D",
			SectionName: "Sleep Debt & Long-Term Stamina",
			IsPositive:  true,
			Options: []seedOption{
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
			Options: []seedOption{
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
			Options: []seedOption{
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
			Options: []seedOption{
				{Label: "Grounded resilience: whatever happens, I'm developing lifelong tenacity and grit", Marks: 1},
				{Label: "Cautiously optimistic: one chapter and one day at a time", Marks: 2},
				{Label: "High anxiety: constantly worried that my best won't be enough", Marks: 3},
				{Label: "Nearing burnout: feeling like I'm surviving rather than thriving", Marks: 4},
			},
		},
		{
			Text:        "What does your nutrition and hydration look like during intense study weeks?",
			Section:     "D",
			SectionName: "Sleep Debt & Long-Term Stamina",
			IsPositive:  true,
			Options: []seedOption{
				{Label: "Conscious fuel: plenty of water, balanced meals, minimal junk", Marks: 1},
				{Label: "Regular home-cooked meals, though I forget water occasionally", Marks: 2},
				{Label: "Skipping meals or binging on high-sugar snacks and sodas while studying", Marks: 3},
				{Label: "Completely neglected: erratic eating, high caffeine, and loss of appetite", Marks: 4},
			},
		},
		{
			Text:        "If you could whisper one message of honest advice to yourself at the start of this school year, what would it be?",
			Section:     "D",
			SectionName: "Sleep Debt & Long-Term Stamina",
			IsPositive:  true,
			Options: []seedOption{
				{Label: "'Trust your process, guard your sleep, and don't let comparison steal your joy.'", Marks: 1},
				{Label: "'Start consistent revision early so you don't panic later.'", Marks: 2},
				{Label: "'Ask for help sooner when concepts get tough.'", Marks: 3},
				{Label: "'Remember that there are many different paths to a fulfilling future.'", Marks: 4},
			},
		},
	}

	return sections, questions
}

// SeedOrUpdateAllAssessments ensures the default 32-item assessment and 3 tiered assessments
// are properly seeded or updated to the latest question versions, and links them to all active schools.
func SeedOrUpdateAllAssessments(ctx context.Context, db *pgxpool.Pool) {
	log.Println("[Seeder] Starting assessment definitions verification and migration...")

	// ── 1. Default 32-Item Student Assessment ──────────────────────────────────
	v4Questions := getDefaultV4Questions()
	v4Buckets := []seedBucket{
		{Label: "More Consistent", MinScore: 24, MaxScore: 32, Color: "#4CAF50"},
		{Label: "Developing / Variable", MinScore: 16, MaxScore: 23, Color: "#FF9800"},
		{Label: "More Difficult Right Now", MinScore: 8, MaxScore: 15, Color: "#3B82F6"},
	}
	v4CustomSections := []seedSectionDef{
		{Key: "A", Name: "Focus & Attention"},
		{Key: "B", Name: "Inner Confidence"},
		{Key: "C", Name: "Social Interaction"},
		{Key: "D", Name: "Healthy Digital Habits"},
	}

	var v4Sections []seedSectionObj
	v4SectionMap := make(map[string][]seedQuestion)
	for _, q := range v4Questions {
		v4SectionMap[q.SectionName] = append(v4SectionMap[q.SectionName], q)
	}
	for _, s := range v4CustomSections {
		v4Sections = append(v4Sections, seedSectionObj{
			Title:     s.Name,
			Questions: v4SectionMap[s.Name],
		})
	}

	v4QuestionsJSON, _ := json.Marshal(v4Questions)
	v4BucketsJSON, _ := json.Marshal(v4Buckets)
	v4CustomSectionsJSON, _ := json.Marshal(v4CustomSections)
	v4SectionsJSON, _ := json.Marshal(v4Sections)

	defaultTitle := "Jaagr Mind Student Assessment"
	defaultDesc := "32-item, non-clinical reflection module designed to help students notice everyday patterns in attention, inner confidence, social interaction and digital choices."

	var defaultID string
	err := db.QueryRow(ctx, `
		SELECT id FROM assessments 
		WHERE is_default = true OR tier = 'all' OR title = $1 OR title ILIKE '%Student Wellness Assessment%'
		LIMIT 1
	`, defaultTitle).Scan(&defaultID)

	if err == nil && defaultID != "" {
		_, err = db.Exec(ctx, `
			UPDATE assessments 
			SET title = $1, description = $2, questions = $3, buckets = $4, custom_sections = $5, sections = $6, 
			    is_active = true, is_default = true, time_per_question = 30, total_time = 15, inactivity_alert_time = 40,
			    inactivity_end_time = 120, section_buckets = true, publish_to_schools = true, publish_to_parents = true,
			    auto_assign_schools = true, tier = 'all', min_grade = 1, max_grade = 12, 
			    target_grades = ARRAY['6','7','8','9','10','11','12']
			WHERE id = $7
		`, defaultTitle, defaultDesc, v4QuestionsJSON, v4BucketsJSON, v4CustomSectionsJSON, v4SectionsJSON, defaultID)
		if err != nil {
			log.Printf("[Seeder] ❌ Failed to update default assessment: %v\n", err)
		} else {
			log.Printf("[Seeder] ✓ Updated default assessment '%s' (%s) with 32 questions across 4 sections\n", defaultTitle, defaultID)
		}
	} else {
		err = db.QueryRow(ctx, `
			INSERT INTO assessments (
				title, description, is_default, time_per_question, total_time, inactivity_alert_time, 
				inactivity_end_time, questions, buckets, section_buckets, custom_sections, sections, 
				is_active, publish_to_schools, publish_to_parents, auto_assign_schools, 
				tier, min_grade, max_grade, target_grades
			) VALUES (
				$1, $2, true, 30, 15, 40, 120, $3, $4, true, $5, $6, true, true, true, true, 'all', 1, 12, ARRAY['6','7','8','9','10','11','12']
			)
			RETURNING id
		`, defaultTitle, defaultDesc, v4QuestionsJSON, v4BucketsJSON, v4CustomSectionsJSON, v4SectionsJSON).Scan(&defaultID)
		if err != nil {
			log.Printf("[Seeder] ❌ Failed to insert default assessment: %v\n", err)
		} else {
			log.Printf("[Seeder] ✓ Inserted default assessment '%s' (%s) with 32 questions across 4 sections\n", defaultTitle, defaultID)
		}
	}

	// ── 2. Tiered Assessments Helper ───────────────────────────────────────────
	tieredBuckets := []seedBucket{
		{Label: "Optimal Resilience", MinScore: 12, MaxScore: 20, Color: "#10B981"},
		{Label: "Emerging Tenacity", MinScore: 21, MaxScore: 32, Color: "#3B82F6"},
		{Label: "Moderate Stress / Focus Support", MinScore: 33, MaxScore: 44, Color: "#F59E0B"},
		{Label: "High Support Needed", MinScore: 45, MaxScore: 64, Color: "#EF4444"},
	}
	tieredBucketsJSON, _ := json.Marshal(tieredBuckets)

	seedOrUpdateTier := func(title, desc, tier string, minGrade, maxGrade int, targetGrades []string, sectionsDef []seedSectionDef, questions []seedQuestion) {
		var sections []seedSectionObj
		secMap := make(map[string][]seedQuestion)
		for _, q := range questions {
			secMap[q.SectionName] = append(secMap[q.SectionName], q)
		}
		for _, s := range sectionsDef {
			sections = append(sections, seedSectionObj{
				Title:     s.Name,
				Questions: secMap[s.Name],
			})
		}

		qJSON, _ := json.Marshal(questions)
		customSecJSON, _ := json.Marshal(sectionsDef)
		secJSON, _ := json.Marshal(sections)

		var existingID string
		err := db.QueryRow(ctx, `
			SELECT id FROM assessments 
			WHERE tier = $1 OR title = $2 OR title ILIKE $3
			LIMIT 1
		`, tier, title, "%"+strings.Split(title, "(")[0]+"%").Scan(&existingID)

		if err == nil && existingID != "" {
			_, err = db.Exec(ctx, `
				UPDATE assessments 
				SET title = $1, description = $2, questions = $3, buckets = $4, custom_sections = $5, sections = $6, 
				    is_active = true, is_default = false, time_per_question = 30, total_time = 15, inactivity_alert_time = 40,
				    inactivity_end_time = 120, section_buckets = true, publish_to_schools = true, publish_to_parents = true,
				    auto_assign_schools = true, tier = $7, min_grade = $8, max_grade = $9, target_grades = $10
				WHERE id = $11
			`, title, desc, qJSON, tieredBucketsJSON, customSecJSON, secJSON, tier, minGrade, maxGrade, targetGrades, existingID)
			if err != nil {
				log.Printf("[Seeder] ❌ Failed to update assessment '%s': %v\n", title, err)
			} else {
				log.Printf("[Seeder] ✓ Updated assessment '%s' (%s) with %d questions\n", title, existingID, len(questions))
			}
		} else {
			var newID string
			err = db.QueryRow(ctx, `
				INSERT INTO assessments (
					title, description, is_default, time_per_question, total_time, inactivity_alert_time, 
					inactivity_end_time, questions, buckets, section_buckets, custom_sections, sections, 
					is_active, publish_to_schools, publish_to_parents, auto_assign_schools, 
					tier, min_grade, max_grade, target_grades
				) VALUES (
					$1, $2, false, 30, 15, 40, 120, $3, $4, true, $5, $6, true, true, true, true, $7, $8, $9, $10
				)
				RETURNING id
			`, title, desc, qJSON, tieredBucketsJSON, customSecJSON, secJSON, tier, minGrade, maxGrade, targetGrades).Scan(&newID)
			if err != nil {
				log.Printf("[Seeder] ❌ Failed to insert assessment '%s': %v\n", title, err)
			} else {
				log.Printf("[Seeder] ✓ Inserted assessment '%s' (%s) with %d questions\n", title, newID, len(questions))
			}
		}
	}

	// ── 3. Seed Tier 1 (Grades 6–8) ───────────────────────────────────────────
	t1Sec, t1Q := getTier1Data()
	seedOrUpdateTier(
		"Middle School Day-in-the-Life Reflection (Grades 6–8)",
		"A friendly, story-driven check-in exploring daily classroom moments, making friends, handling tough homework, and screen habits.",
		"middle", 6, 8, []string{"6", "7", "8"},
		t1Sec, t1Q,
	)

	// ── 4. Seed Tier 2 (Grades 9–10) ──────────────────────────────────────────
	t2Sec, t2Q := getTier2Data()
	seedOrUpdateTier(
		"Secondary Student Rhythm & Resilience Check-in (Grades 9–10)",
		"An honest, scenario-driven reflection on academic momentum, peer dynamics, exam prep pressure, and managing focus.",
		"secondary", 9, 10, []string{"9", "10"},
		t2Sec, t2Q,
	)

	// ── 5. Seed Tier 3 (Grades 11–12) ─────────────────────────────────────────
	t3Sec, t3Q := getTier3Data()
	seedOrUpdateTier(
		"Senior Scholar Mindset & Stamina Reflection (Grades 11–12)",
		"A mature, non-judgmental check-in designed for high-stakes preparation, cognitive stamina, burnout awareness, and personal autonomy.",
		"senior", 11, 12, []string{"11", "12"},
		t3Sec, t3Q,
	)

	// ── 6. Link all active assessments to all active institutions ──────────────
	tag, err := db.Exec(ctx, `
		UPDATE schools 
		SET assigned_tests = ARRAY(SELECT id FROM assessments WHERE is_active = true)
		WHERE is_active = true
	`)
	if err != nil {
		log.Printf("[Seeder] ⚠️ Warning updating school assignments: %v\n", err)
	} else {
		log.Printf("[Seeder] ✓ Automatically linked all active assessments to %d active institution(s) in schools.assigned_tests\n", tag.RowsAffected())
	}
}

// seedOrUpdateAssessments is called by AutoMigrate
func seedOrUpdateAssessments(ctx context.Context, db *pgxpool.Pool) {
	SeedOrUpdateAllAssessments(ctx, db)
}
