const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { mapRow } = require('../utils/dbHelper');
const { protect } = require('../middleware/auth');
const { sendTicketCreatedEmail, sendTicketStatusUpdateEmail, sendEmail, sendContactFormConfirmationEmail } = require('../utils/emailService');

router.get('/', protect, async (req, res) => {
    try {
        let tickets;
        if (req.user.role === 'admin') {
            const rows = await db('tickets')
                .select('tickets.*', 'schools.name as school_name', 'schools.email as school_email', 'schools.school_id as school_code')
                .leftJoin('schools', 'tickets.school_id', 'schools.id')
                .orderBy('tickets.created_at', 'desc');
            tickets = rows.map(r => ({
                _id: r.id,
                subject: r.subject,
                category: r.category,
                priority: r.priority,
                message: r.message,
                status: r.status,
                createdAt: r.created_at,
                updatedAt: r.updated_at,
                responses: r.responses || [],
                school: { _id: r.school_id, name: r.school_name, email: r.school_email, schoolId: r.school_code }
            }));
        } else {
            const rows = await db('tickets')
                .where('school_id', req.user.id)
                .orderBy('created_at', 'desc');
            tickets = rows.map(r => ({
                _id: r.id,
                school: r.school_id,
                subject: r.subject,
                category: r.category,
                priority: r.priority,
                message: r.message,
                status: r.status,
                createdAt: r.created_at,
                updatedAt: r.updated_at,
                responses: r.responses || []
            }));
        }
        res.json(tickets);
    } catch (error) {
        console.error('Error fetching tickets:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.post('/', protect, async (req, res) => {
    try {
        const { subject, category, priority, message } = req.body;

        const [row] = await db('tickets').insert({
            school_id: req.user.id,
            subject,
            category,
            priority,
            message,
            status: 'pending',
            responses: JSON.stringify([]),
            created_at: new Date(),
            updated_at: new Date()
        }).returning('*');

        const school = await db('schools').where('id', req.user.id).first();
        if (school) {
            const ticketObj = { _id: row.id, subject: row.subject, category: row.category, priority: row.priority, message: row.message, status: row.status };
            const schoolObj = { name: school.name, email: school.email };
            await sendTicketCreatedEmail(schoolObj, ticketObj);
        }

        res.status(201).json({
            _id: row.id,
            school: row.school_id,
            subject: row.subject,
            category: row.category,
            priority: row.priority,
            message: row.message,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            responses: row.responses || []
        });
    } catch (error) {
        console.error('Error creating ticket:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.post('/public', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        const html = `
            <h3>New Contact Form Submission</h3>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Message:</strong></p>
            <blockquote>${message}</blockquote>
        `;

        await sendEmail(process.env.SMTP_USER, `Contact Form: ${subject}`, html);

        if (email) {
            await sendContactFormConfirmationEmail(name, email, subject, message);
        }

        res.status(200).json({ message: 'Message sent successfully' });
    } catch (error) {
        console.error('Error sending contact form:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.get('/:id', protect, async (req, res) => {
    try {
        const row = await db('tickets')
            .select('tickets.*', 'schools.name as school_name', 'schools.email as school_email', 'schools.school_id as school_code')
            .leftJoin('schools', 'tickets.school_id', 'schools.id')
            .where('tickets.id', req.params.id)
            .first();

        if (!row) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        if (req.user.role !== 'admin' && row.school_id !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        res.json({
            _id: row.id,
            subject: row.subject,
            category: row.category,
            priority: row.priority,
            message: row.message,
            status: row.status,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            responses: row.responses || [],
            school: { _id: row.school_id, name: row.school_name, email: row.school_email, schoolId: row.school_code }
        });
    } catch (error) {
        console.error('Error fetching ticket:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.post('/:id/respond', protect, async (req, res) => {
    try {
        const { message } = req.body;
        const ticket = await db('tickets').where('id', req.params.id).first();

        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        const school = await db('schools').where('id', ticket.school_id).select('id', 'name', 'email').first();

        if (req.user.role !== 'admin' && ticket.school_id !== req.user.id) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        const sender = req.user.role === 'admin' ? 'admin' : 'school';
        const responses = ticket.responses || [];
        responses.push({ sender, message, timestamp: new Date().toISOString() });

        let newStatus = ticket.status;
        if (sender === 'school' && ticket.status === 'resolved') {
            newStatus = 'in-progress';
        }

        const [updated] = await db('tickets').where('id', req.params.id).update({
            responses: JSON.stringify(responses),
            status: newStatus,
            updated_at: new Date()
        }).returning('*');

        if (sender === 'admin' && school) {
            const subject = `Reply to Ticket: ${ticket.subject}`;
            const html = `<p>Hello ${school.name},</p><p>Support has replied to your ticket:</p><blockquote>${message}</blockquote><p>Login to your dashboard to view the full conversation.</p>`;
            await sendEmail(school.email, subject, html);
        } else if (school) {
            const subject = `Reply from ${school.name}: ${ticket.subject}`;
            const html = `<p>New reply from ${school.name}:</p><blockquote>${message}</blockquote>`;
            await sendEmail(process.env.SMTP_USER, subject, html);
        }

        res.json({
            _id: updated.id,
            subject: updated.subject,
            category: updated.category,
            priority: updated.priority,
            message: updated.message,
            status: updated.status,
            createdAt: updated.created_at,
            updatedAt: updated.updated_at,
            responses: updated.responses || [],
            school: school ? { _id: school.id, name: school.name, email: school.email } : null
        });
    } catch (error) {
        console.error('Error responding to ticket:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.patch('/:id/status', protect, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const { status } = req.body;
        const validStatuses = ['pending', 'in-progress', 'resolved'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const ticket = await db('tickets').where('id', req.params.id).first();
        if (!ticket) {
            return res.status(404).json({ message: 'Ticket not found' });
        }

        const school = await db('schools').where('id', ticket.school_id).select('id', 'name', 'email').first();
        const oldStatus = ticket.status;

        const [updated] = await db('tickets').where('id', req.params.id).update({
            status,
            updated_at: new Date()
        }).returning('*');

        if (oldStatus !== status && school) {
            const ticketObj = { _id: updated.id, subject: updated.subject, school: { name: school.name, email: school.email } };
            await sendTicketStatusUpdateEmail(ticketObj, status);
        }

        res.json({
            _id: updated.id,
            subject: updated.subject,
            status: updated.status,
            updatedAt: updated.updated_at,
            responses: updated.responses || [],
            school: school ? { _id: school.id, name: school.name, email: school.email } : null
        });
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

router.get('/all', protect, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const rows = await db('tickets')
            .select('tickets.*', 'schools.name as school_name', 'schools.email as school_email')
            .leftJoin('schools', 'tickets.school_id', 'schools.id')
            .orderBy('tickets.created_at', 'desc');

        const tickets = rows.map(r => ({
            _id: r.id,
            subject: r.subject,
            category: r.category,
            priority: r.priority,
            message: r.message,
            status: r.status,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
            responses: r.responses || [],
            school: { _id: r.school_id, name: r.school_name, email: r.school_email }
        }));

        res.json(tickets);
    } catch (error) {
        console.error('Error fetching all tickets:', error);
        res.status(500).json({ message: 'Server Error' });
    }
});

module.exports = router;
