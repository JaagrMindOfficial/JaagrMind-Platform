const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { mapRow } = require('../utils/dbHelper');
const { generateToken } = require('../middleware/auth');

const ADMIN_DOMAINS = ['jaagr.com', 'jaagrmind.com'];

const isAdminDomain = (email) => {
    const domain = email.split('@')[1]?.toLowerCase();
    return ADMIN_DOMAINS.includes(domain);
};

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const normalizedEmail = email.toLowerCase().trim();

        if (isAdminDomain(normalizedEmail)) {
            console.log(`[Auth] Attempting Admin login for: ${normalizedEmail}`);
            const admin = await db('admins').where('email', normalizedEmail).first();

            if (!admin) {
                console.log(`[Auth] Admin not found: ${normalizedEmail}`);
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            const isMatch = await bcrypt.compare(password, admin.password);
            if (!isMatch) {
                console.log(`[Auth] Password mismatch for Admin: ${normalizedEmail}`);
                return res.status(401).json({ message: 'Invalid credentials' });
            }
            console.log(`[Auth] Admin login successful: ${normalizedEmail}`);

            await db('admins').where('id', admin.id).update({ last_login: new Date() });

            return res.json({
                _id: admin.id,
                email: admin.email,
                name: admin.name,
                role: 'admin',
                token: generateToken(admin.id, 'admin')
            });
        } else {
            const school = await db('schools')
                .where({ email: normalizedEmail, is_active: true })
                .first();

            if (!school) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            if (school.is_blocked) {
                return res.status(403).json({ message: 'Your account has been blocked. Please contact administrator.' });
            }

            const isMatch = await bcrypt.compare(password, school.password);
            if (!isMatch) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            return res.json({
                _id: school.id,
                schoolId: school.school_id,
                email: school.email,
                name: school.name,
                logo: school.logo,
                role: 'school',
                mustChangePassword: school.must_change_password || false,
                isDataVisibleToSchool: school.is_data_visible_to_school,
                token: generateToken(school.id, 'school')
            });
        }
    } catch (error) {
        console.error('Unified login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
