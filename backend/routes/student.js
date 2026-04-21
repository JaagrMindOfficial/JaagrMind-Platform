const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { mapRow } = require('../utils/dbHelper');
const { protect, isStudent, generateToken } = require('../middleware/auth');
const { computePathway, getSkillStatus, normalizeThresholds } = require('../utils/pathwayEngine');

function buildStudentAssessmentPayload(assessment, resumeData) {
    const questions = (assessment.questions || []).map((q, index) => ({
        index,
        text: q.text,
        section: q.section || 'A',
        options: (q.options || []).map((o) => ({ label: o.label }))
    }));
    const customSections = assessment.custom_sections || [];
    const sectionOrder = [...new Set(questions.map((q) => q.section))];
    return {
        _id: assessment.id,
        title: assessment.title,
        inactivityAlertTime: assessment.inactivity_alert_time,
        inactivityEndTime: assessment.inactivity_end_time,
        totalQuestions: questions.length,
        totalSections: sectionOrder.length,
        customSections,
        questions,
        resumeData: resumeData || null
    };
}

function sectionInterpretationLabel(score, thresholds) {
    const s = getSkillStatus(score, thresholds);
    if (s === 'stable') return 'Stable';
    if (s === 'emerging') return 'Emerging';
    return 'Support Needed';
}

router.post('/login', async (req, res) => {
    try {
        const { accessId, mobileNumber, email, schoolId } = req.body;

        if (!accessId) {
            return res.status(400).json({ message: 'Access ID is required' });
        }

        if (!schoolId) {
            return res.status(400).json({
                message: 'Invalid access. Please use your school\'s test link to login.'
            });
        }

        const school = await db('schools')
            .where({ school_id: schoolId.toUpperCase(), is_active: true })
            .select('id', 'name', 'logo', 'school_id', 'is_blocked')
            .first();

        if (!school) {
            return res.status(400).json({
                message: 'Invalid school link. Please contact your school for the correct link.'
            });
        }

        if (school.is_blocked) {
            return res.status(403).json({
                message: 'This school has been blocked. Please contact administrator.'
            });
        }

        const student = await db('students')
            .where({ access_id: accessId.toUpperCase().trim(), is_active: true })
            .first();

        if (!student) {
            return res.status(404).json({ message: 'Invalid Access ID' });
        }

        const studentSchool = await db('schools')
            .where('id', student.school_id)
            .select('id', 'name', 'logo', 'school_id')
            .first();

        if (studentSchool?.school_id?.toUpperCase() !== schoolId.toUpperCase()) {
            return res.status(403).json({
                message: 'This Access ID does not belong to this school. Please use the correct school link.'
            });
        }

        const updates = {};
        if (mobileNumber) updates.mobile_number = mobileNumber;
        if (email) updates.email = email;
        if (Object.keys(updates).length > 0) {
            await db('students').where('id', student.id).update(updates);
        }

        res.json({
            _id: student.id,
            accessId: student.access_id,
            name: student.name,
            class: student.class,
            section: student.section,
            school: {
                name: studentSchool?.name,
                logo: studentSchool?.logo,
                schoolId: studentSchool?.school_id
            },
            role: 'student',
            token: generateToken(student.id, 'student')
        });
    } catch (error) {
        console.error('Student login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/tests', protect, isStudent, async (req, res) => {
    try {
        const student = req.student;
        const testStatus = student.testStatus || [];

        const tests = testStatus.map(t => ({
            assessmentId: t.assessmentId,
            isCompleted: t.isCompleted,
            completedAt: t.completedAt
        }));

        const assessmentIds = tests.map(t => t.assessmentId).filter(Boolean);
        let assessments = [];
        if (assessmentIds.length > 0) {
            assessments = await db('assessments')
                .whereIn('id', assessmentIds)
                .where('is_active', true)
                .select('id', 'title', 'description', 'inactivity_alert_time', 'inactivity_end_time', 'questions');
        }

        const testsWithDetails = tests.map(t => {
            const assessment = assessments.find(a => a.id === t.assessmentId);
            return {
                ...t,
                title: assessment?.title,
                description: assessment?.description,
                questionCount: assessment?.questions?.length || 0,
                inactivityAlertTime: assessment?.inactivity_alert_time || 40,
                inactivityEndTime: assessment?.inactivity_end_time || 120
            };
        });

        res.json({
            student: {
                name: student.name,
                class: student.class,
                section: student.section,
                school: student.schoolId
            },
            tests: testsWithDetails.filter(t => t.title)
        });
    } catch (error) {
        console.error('Get tests error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/assessment/:id', protect, isStudent, async (req, res) => {
    try {
        const student = req.student;
        const assessmentId = req.params.id;
        const testStatus = student.testStatus || [];

        const ts = testStatus.find(t => t.assessmentId === assessmentId);

        if (!ts) {
            return res.status(403).json({ message: 'You are not assigned this test' });
        }

        if (ts.isCompleted) {
            return res.status(400).json({ message: 'You have already completed this test' });
        }

        const assessment = await db('assessments').where('id', assessmentId).first();
        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        const testIndex = testStatus.findIndex(t => t.assessmentId === assessmentId);
        if (testIndex >= 0) {
            testStatus[testIndex].startedAt = new Date().toISOString();
            await db('students').where('id', student._id).update({
                test_status: JSON.stringify(testStatus)
            });
        }

        const existingSubmission = await db('submissions')
            .where({ student_id: student._id, assessment_id: assessmentId, status: 'incomplete' })
            .first();

        const resume = existingSubmission
            ? {
                lastQuestionIndex: existingSubmission.last_question_index,
                answers: existingSubmission.answers,
                submissionId: existingSubmission.id
            }
            : null;

        res.json(buildStudentAssessmentPayload(assessment, resume));
    } catch (error) {
        console.error('Get assessment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/submit', protect, isStudent, async (req, res) => {
    try {
        const { assessmentId, answers, timeTaken, mobileNumber, email, moodCheck, consentGiven } = req.body;
        const student = req.student;

        if (!assessmentId || !answers || !Array.isArray(answers)) {
            return res.status(400).json({ message: 'Invalid submission data' });
        }

        const testStatus = student.testStatus || [];
        const ts = testStatus.find(t => t.assessmentId === assessmentId);

        if (ts?.isCompleted) {
            return res.status(400).json({ message: 'Test already submitted' });
        }

        const assessment = await db('assessments').where('id', assessmentId).first();
        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        let totalScore = 0;
        const sectionScores = {};
        (assessment.questions || []).forEach((q) => {
            const k = q.section || 'A';
            if (sectionScores[k] === undefined) sectionScores[k] = 0;
        });

        const processedAnswers = [];
        const thresholds = normalizeThresholds(assessment.buckets || {});

        answers.forEach((answer, index) => {
            if (!answer) return;
            const question = assessment.questions[index];
            if (question && answer.selectedOption !== undefined && answer.selectedOption !== null) {
                const option = question.options?.[answer.selectedOption];
                const marks = option?.marks || 0;
                totalScore += marks;
                const sec = question.section || 'A';
                if (sectionScores[sec] === undefined) sectionScores[sec] = 0;
                sectionScores[sec] += marks;
                processedAnswers.push({
                    questionIndex: index,
                    section: sec,
                    selectedOption: answer.selectedOption,
                    marks,
                    timeTakenForQuestion: answer.timeTaken || 0
                });
            }
        });

        const sectionBuckets = {};
        Object.keys(sectionScores).forEach((key) => {
            sectionBuckets[key] = sectionInterpretationLabel(sectionScores[key] || 0, thresholds);
        });

        const pathwayPayload = computePathway({
            sectionScores,
            customSections: assessment.custom_sections || [],
            questions: assessment.questions || [],
            bucketsJson: assessment.buckets || {},
            dailyActivitySlots: (assessment.buckets && assessment.buckets.dailyActivitySlots) || 4
        });

        const primarySkillArea = pathwayPayload.primaryDisplay;
        const secondarySkillArea = pathwayPayload.secondaryDisplay;
        const assignedBucket = pathwayPayload.balanceMode ? 'Balance Mode' : pathwayPayload.trackName;

        const schoolIdValue = student.schoolId?._id || student.schoolId;

        const [submission] = await db('submissions').insert({
            student_id: student._id,
            school_id: schoolIdValue,
            assessment_id: assessmentId,
            total_score: totalScore,
            section_scores: JSON.stringify(sectionScores),
            section_buckets: JSON.stringify(sectionBuckets),
            primary_skill_area: primarySkillArea,
            secondary_skill_area: secondarySkillArea,
            assigned_bucket: assignedBucket,
            pathway: pathwayPayload,
            answers: JSON.stringify(processedAnswers),
            time_taken: timeTaken || 0,
            mobile_number: mobileNumber || '',
            email: email || '',
            consent_given: consentGiven || false,
            mood_check: moodCheck ? JSON.stringify(moodCheck) : null,
            status: 'complete',
            submitted_at: new Date()
        }).returning('*');

        try {
            await db('student_pathways')
                .insert({
                    student_id: student._id,
                    submission_id: submission.id,
                    assessment_id: assessmentId,
                    access_id: student.accessId || student.access_id || '',
                    pathway: pathwayPayload,
                    updated_at: new Date()
                })
                .onConflict('student_id')
                .merge({
                    submission_id: submission.id,
                    assessment_id: assessmentId,
                    access_id: student.accessId || student.access_id || '',
                    pathway: pathwayPayload,
                    updated_at: new Date()
                });
        } catch (pe) {
            console.warn('student_pathways upsert skipped:', pe.message);
        }

        const testIndex = testStatus.findIndex(t => t.assessmentId === assessmentId);
        if (testIndex >= 0) {
            testStatus[testIndex].isCompleted = true;
            testStatus[testIndex].score = totalScore;
            testStatus[testIndex].completedAt = new Date().toISOString();
        } else {
            testStatus.push({
                assessmentId: assessmentId,
                isCompleted: true,
                score: totalScore,
                completedAt: new Date().toISOString()
            });
        }

        await db('students').where('id', student._id).update({
            test_status: JSON.stringify(testStatus)
        });

        res.json({
            success: true,
            message: 'Assessment completed successfully. Thank you for your participation!',
            submissionId: submission.id,
            pathway: pathwayPayload
        });
    } catch (error) {
        console.error('Submit error:', error.message, error.stack);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
});

router.post('/save-progress', protect, isStudent, async (req, res) => {
    try {
        const { assessmentId, answers, lastQuestionIndex, totalInactivityTime, timeTaken, moodCheck, consentGiven } = req.body;
        const student = req.student;

        if (!assessmentId) {
            return res.status(400).json({ message: 'Assessment ID is required' });
        }

        const schoolIdValue = student.schoolId?._id || student.schoolId;
        const assessment = await db('assessments').where('id', assessmentId).first();
        const processedAnswers = [];

        if (answers && Array.isArray(answers)) {
            answers.forEach((answer, index) => {
                if (answer && answer.selectedOption !== undefined && answer.selectedOption !== null) {
                    const question = assessment?.questions?.[index];
                    const option = question?.options?.[answer.selectedOption];
                    const marks = option?.marks || 0;
                    processedAnswers.push({
                        questionIndex: index,
                        section: question?.section || 'A',
                        selectedOption: answer.selectedOption,
                        marks,
                        timeTakenForQuestion: answer.timeTaken || 0
                    });
                }
            });
        }

        let submission = await db('submissions')
            .where({ student_id: student._id, assessment_id: assessmentId })
            .whereIn('status', ['pending', 'incomplete'])
            .first();

        if (submission) {
            const [updated] = await db('submissions').where('id', submission.id).update({
                answers: JSON.stringify(processedAnswers),
                last_question_index: lastQuestionIndex || 0,
                total_inactivity_time: totalInactivityTime || 0,
                time_taken: timeTaken || 0,
                status: 'incomplete',
                mood_check: moodCheck ? JSON.stringify(moodCheck) : submission.mood_check,
                consent_given: consentGiven !== undefined ? consentGiven : submission.consent_given
            }).returning('*');
            submission = updated;
        } else {
            const [created] = await db('submissions').insert({
                student_id: student._id,
                school_id: schoolIdValue,
                assessment_id: assessmentId,
                answers: JSON.stringify(processedAnswers),
                last_question_index: lastQuestionIndex || 0,
                total_inactivity_time: totalInactivityTime || 0,
                time_taken: timeTaken || 0,
                status: 'incomplete',
                mood_check: moodCheck ? JSON.stringify(moodCheck) : null,
                consent_given: consentGiven || false,
                submitted_at: new Date()
            }).returning('*');
            submission = created;
        }

        res.json({
            success: true,
            submissionId: submission.id,
            status: 'incomplete'
        });
    } catch (error) {
        console.error('Save progress error:', error);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
});

router.get('/pathway', protect, isStudent, async (req, res) => {
    try {
        const row = await db('student_pathways').where({ student_id: req.student._id }).first();
        if (!row) {
            return res.json({ pathway: null, accessId: req.student.accessId || req.student.access_id });
        }
        res.json({
            pathway: row.pathway,
            accessId: row.access_id || req.student.accessId || req.student.access_id,
            assessmentId: row.assessment_id,
            submissionId: row.submission_id,
            updatedAt: row.updated_at
        });
    } catch (error) {
        console.error('Get pathway error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/school-info', async (req, res) => {
    try {
        const { schoolId } = req.query;

        if (!schoolId) {
            return res.json({ name: null, logo: null });
        }

        const school = await db('schools')
            .where({ school_id: schoolId.toUpperCase(), is_active: true })
            .select('name', 'logo')
            .first();

        if (!school) {
            return res.json({ name: null, logo: null });
        }

        res.json({ name: school.name, logo: school.logo });
    } catch (error) {
        console.error('School info error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
