const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { protect } = require('../middleware/auth');

const isAuthorizedPreviewer = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'school')) {
        next();
    } else {
        res.status(401).json({ message: 'Not authorized for preview' });
    }
};

router.get('/assessment/:id', protect, isAuthorizedPreviewer, async (req, res) => {
    try {
        const assessment = await db('assessments').where('id', req.params.id).first();

        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        const questions = (assessment.questions || []).map((q, index) => ({
            index,
            text: q.text,
            section: q.section || 'A',
            options: (q.options || []).map((o) => ({ label: o.label }))
        }));
        const customSections = assessment.custom_sections || [];
        const sectionOrder = [...new Set(questions.map((q) => q.section))];

        res.json({
            _id: assessment.id,
            title: assessment.title,
            inactivityAlertTime: assessment.inactivity_alert_time,
            inactivityEndTime: assessment.inactivity_end_time,
            totalQuestions: questions.length,
            totalSections: sectionOrder.length,
            customSections,
            questions,
            resumeData: null
        });
    } catch (error) {
        console.error('Preview error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
