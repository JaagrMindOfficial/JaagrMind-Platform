const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { mapRow, mapRows, excludeFields } = require('../utils/dbHelper');
const { protect, isAdmin, generateToken } = require('../middleware/auth');
const { generateSchoolId, generateSchoolPassword } = require('../utils/idGenerator');
const { exportSubmissionsToExcel, calculateAnalytics } = require('../utils/exportData');
const { logoUpload, deleteFromS3 } = require('../utils/s3Upload');
const { sendSchoolCredentialsEmail, sendPasswordChangedEmail } = require('../utils/emailService');

const upload = logoUpload;
const SALT_ROUNDS = 10;

async function hashPassword(plain) {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    return bcrypt.hash(plain, salt);
}

const getBucketCategory = (score) => {
    if (score >= 8 && score <= 14) return 'green';
    if (score >= 15 && score <= 22) return 'yellow';
    if (score >= 23 && score <= 32) return 'red';
    return 'unknown';
};

const getOverallBucket = (totalScore) => {
    if (totalScore >= 32 && totalScore <= 56) return 'doingWell';
    if (totalScore >= 57 && totalScore <= 88) return 'needsSupport';
    if (totalScore >= 89 && totalScore <= 128) return 'needsAttention';
    return 'unknown';
};

// @route   POST /api/admin/login
// @desc    Admin login
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const admin = await db('admins').where({ email: email.toLowerCase() }).first();
        if (!admin) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        await db('admins').where('id', admin.id).update({ last_login: new Date() });

        res.json({
            _id: admin.id,
            email: admin.email,
            name: admin.name,
            role: 'admin',
            token: generateToken(admin.id, 'admin')
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/admin/change-password
// @desc    Change admin's own password
// @access  Admin
router.put('/change-password', protect, isAdmin, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current and new password are required' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters' });
        }

        const admin = await db('admins').where('id', req.user._id).first();
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        const isMatch = await bcrypt.compare(currentPassword, admin.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        await db('admins').where('id', admin.id).update({ password: await hashPassword(newPassword) });

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/admin/profile
// @desc    Update admin's own profile (name, email)
// @access  Admin
router.put('/profile', protect, isAdmin, async (req, res) => {
    try {
        const { name, email } = req.body;

        const admin = await db('admins').where('id', req.user._id).first();
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        const updates = {};

        if (email && email.toLowerCase() !== admin.email) {
            const existingAdmin = await db('admins').where({ email: email.toLowerCase() }).first();
            if (existingAdmin) {
                return res.status(400).json({ message: 'Email already in use' });
            }
            updates.email = email.toLowerCase();
        }

        if (name) {
            updates.name = name;
        }

        if (Object.keys(updates).length > 0) {
            await db('admins').where('id', admin.id).update(updates);
        }

        const updated = await db('admins').where('id', admin.id).first();

        res.json({
            _id: updated.id,
            email: updated.email,
            name: updated.name,
            role: updated.role,
            message: 'Profile updated successfully'
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/admin/admins
// @desc    Get all admin accounts (with pagination)
// @access  Admin
router.get('/admins', protect, isAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        const [admins, countResult] = await Promise.all([
            db('admins')
                .select('id', 'email', 'name', 'role', 'created_at', 'last_login')
                .orderBy('created_at', 'desc')
                .offset(offset)
                .limit(limit),
            db('admins').count('* as count').first()
        ]);

        const total = parseInt(countResult.count);

        res.json({
            data: mapRows(admins),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get admins error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/admin/admins
// @desc    Create new admin account
// @access  Admin
router.post('/admins', protect, isAdmin, async (req, res) => {
    try {
        const { email, password, name, role } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }

        const existingAdmin = await db('admins').where({ email: email.toLowerCase() }).first();
        if (existingAdmin) {
            return res.status(400).json({ message: 'Admin with this email already exists' });
        }

        const [admin] = await db('admins').insert({
            email: email.toLowerCase(),
            password: await hashPassword(password),
            name: name || 'Company Admin',
            role: role || 'admin'
        }).returning('*');

        res.status(201).json({
            _id: admin.id,
            email: admin.email,
            name: admin.name,
            role: admin.role,
            createdAt: admin.created_at,
            message: 'Admin created successfully'
        });
    } catch (error) {
        console.error('Create admin error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/admin/admins/:id
// @desc    Update an admin account
// @access  Admin
router.put('/admins/:id', protect, isAdmin, async (req, res) => {
    try {
        const { email, name, role, password } = req.body;

        const admin = await db('admins').where('id', req.params.id).first();
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        const updates = {};

        if (email && email.toLowerCase() !== admin.email) {
            const existingAdmin = await db('admins').where({ email: email.toLowerCase() }).first();
            if (existingAdmin) {
                return res.status(400).json({ message: 'Email already in use' });
            }
            updates.email = email.toLowerCase();
        }

        if (name) updates.name = name;
        if (role) updates.role = role;
        if (password && password.length >= 6) {
            updates.password = await hashPassword(password);
        }

        if (Object.keys(updates).length > 0) {
            await db('admins').where('id', admin.id).update(updates);
        }

        const updated = await db('admins').where('id', admin.id).first();

        res.json({
            _id: updated.id,
            email: updated.email,
            name: updated.name,
            role: updated.role,
            createdAt: updated.created_at,
            lastLogin: updated.last_login,
            message: 'Admin updated successfully'
        });
    } catch (error) {
        console.error('Update admin error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/admin/admins/:id
// @desc    Delete an admin account
// @access  Admin
router.delete('/admins/:id', protect, isAdmin, async (req, res) => {
    try {
        if (req.params.id === req.user._id?.toString()) {
            return res.status(400).json({ message: 'You cannot delete your own account' });
        }

        const admin = await db('admins').where('id', req.params.id).first();
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        const countResult = await db('admins').count('* as count').first();
        if (parseInt(countResult.count) <= 1) {
            return res.status(400).json({ message: 'Cannot delete the last admin account' });
        }

        await db('admins').where('id', req.params.id).del();

        res.json({ message: 'Admin deleted successfully' });
    } catch (error) {
        console.error('Delete admin error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/admin/dashboard
// @desc    Get dashboard overview data
// @access  Admin
router.get('/dashboard', protect, isAdmin, async (req, res) => {
    try {
        const [schoolCountResult, studentCountResult, assessmentCountResult, submissionRows] = await Promise.all([
            db('schools').where({ is_active: true }).count('* as count').first(),
            db('students').where({ is_active: true }).count('* as count').first(),
            db('assessments').where({ is_active: true }).count('* as count').first(),
            db('submissions').orderBy('submitted_at', 'desc').limit(100)
        ]);

        const schoolCount = parseInt(schoolCountResult.count);
        const studentCount = parseInt(studentCountResult.count);
        const assessmentCount = parseInt(assessmentCountResult.count);
        const submissions = mapRows(submissionRows);

        const analytics = calculateAnalytics(submissions);

        // Calculate Wellness Trends (Last 6 Months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);

        const trendSubmissions = await db('submissions')
            .where('submitted_at', '>=', sixMonthsAgo)
            .select(
                db.raw('EXTRACT(MONTH FROM submitted_at)::int as month'),
                db.raw('EXTRACT(YEAR FROM submitted_at)::int as year')
            )
            .avg('total_score as avg_score')
            .count('* as count')
            .groupByRaw('EXTRACT(YEAR FROM submitted_at), EXTRACT(MONTH FROM submitted_at)')
            .orderByRaw('EXTRACT(YEAR FROM submitted_at), EXTRACT(MONTH FROM submitted_at)');

        const wellnessTrends = [];
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        for (let i = 0; i < 6; i++) {
            const d = new Date();
            d.setMonth(d.getMonth() - (5 - i));
            const month = d.getMonth() + 1;
            const year = d.getFullYear();

            const found = trendSubmissions.find(t => t.month === month && t.year === year);
            wellnessTrends.push({
                name: monthNames[month - 1],
                score: found ? Math.round(parseFloat(found.avg_score) * 10) / 10 : 0,
                count: found ? parseInt(found.count) : 0
            });
        }

        // Calculate Attention Needed (Schools with high % of 'red' bucket submissions)
        const attentionStats = await db('submissions as sub')
            .join('schools as sch', 'sub.school_id', 'sch.id')
            .where('sch.is_active', true)
            .select('sub.school_id', 'sch.name')
            .count('* as total')
            .select(db.raw("SUM(CASE WHEN sub.assigned_bucket = 'red' THEN 1 ELSE 0 END)::int as red_count"))
            .groupBy('sub.school_id', 'sch.name')
            .havingRaw('COUNT(*) >= 5')
            .orderByRaw("(SUM(CASE WHEN sub.assigned_bucket = 'red' THEN 1 ELSE 0 END)::float / COUNT(*)) DESC")
            .limit(5);

        const attentionNeeded = attentionStats.map(s => ({
            id: s.school_id,
            name: s.name,
            riskScore: Math.round((parseInt(s.red_count) / parseInt(s.total)) * 100),
            details: `${s.red_count}/${s.total} students need support`
        }));

        res.json({
            overview: {
                totalSchools: schoolCount,
                totalStudents: studentCount,
                totalAssessments: assessmentCount,
                totalSubmissions: submissions.length
            },
            analytics,
            analytics,
            wellnessTrends,
            attentionNeeded
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/admin/schools
// @desc    Get all schools (with pagination)
// @access  Admin
router.get('/schools', protect, isAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const offset = (page - 1) * limit;

        let query = db('schools').where({ is_active: true });
        let countQuery = db('schools').where({ is_active: true });

        if (search) {
            const searchFilter = function () {
                this.where('name', 'ilike', `%${search}%`)
                    .orWhere('school_id', 'ilike', `%${search}%`)
                    .orWhere('email', 'ilike', `%${search}%`);
            };
            query = query.andWhere(searchFilter);
            countQuery = countQuery.andWhere(searchFilter);
        }

        const [countResult, schools] = await Promise.all([
            countQuery.count('* as count').first(),
            query
                .orderBy('created_at', 'desc')
                .offset(offset)
                .limit(limit)
        ]);

        const total = parseInt(countResult.count);

        const mappedSchools = schools.map(s => {
            const mapped = mapRow(s);
            delete mapped.password;
            return mapped;
        });

        // Populate assignedTests
        const allTestIds = [...new Set(schools.flatMap(s => s.assigned_tests || []))];
        const assessmentsMap = {};
        if (allTestIds.length > 0) {
            const assessments = await db('assessments').whereIn('id', allTestIds).select('id', 'title', 'is_default');
            assessments.forEach(a => {
                assessmentsMap[a.id] = { _id: a.id, title: a.title, isDefault: a.is_default };
            });
        }

        // Populate parent info
        const parentIds = schools.filter(s => s.parent_id).map(s => s.parent_id);
        const parentsMap = {};
        if (parentIds.length > 0) {
            const parents = await db('schools').whereIn('id', parentIds).select('id', 'name', 'school_id');
            parents.forEach(p => {
                parentsMap[p.id] = { _id: p.id, name: p.name, schoolId: p.school_id };
            });
        }

        // Populate branches (sub-schools)
        const schoolIds = schools.map(s => s.id);
        const branchesMap = {};
        if (schoolIds.length > 0) {
            const branches = await db('schools').whereIn('parent_id', schoolIds).where('is_active', true);
            branches.forEach(b => {
                const pid = b.parent_id;
                if (!branchesMap[pid]) branchesMap[pid] = [];
                const mapped = mapRow(b);
                delete mapped.password;
                branchesMap[pid].push(mapped);
            });
        }

        // Get student and submission counts per school in bulk
        const [studentCounts, submissionCounts] = await Promise.all([
            db('students')
                .whereIn('school_id', schoolIds)
                .where('is_active', true)
                .select('school_id')
                .count('* as count')
                .groupBy('school_id'),
            db('submissions')
                .whereIn('school_id', schoolIds)
                .select('school_id')
                .count('* as count')
                .groupBy('school_id')
        ]);

        const studentCountMap = {};
        studentCounts.forEach(r => { studentCountMap[r.school_id] = parseInt(r.count); });
        const submissionCountMap = {};
        submissionCounts.forEach(r => { submissionCountMap[r.school_id] = parseInt(r.count); });

        const schoolsWithStats = mappedSchools.map(school => ({
            ...school,
            assignedTests: (school.assignedTests || []).map(tid => assessmentsMap[tid]).filter(Boolean),
            parentId: school.parentId ? (parentsMap[school.parentId] || school.parentId) : null,
            branches: branchesMap[school._id] || [],
            studentCount: studentCountMap[school._id] || 0,
            submissionCount: submissionCountMap[school._id] || 0
        }));

        res.json({
            data: schoolsWithStats,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get schools error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/admin/schools
// @desc    Register a new school (with email for login)
// @access  Admin
router.post('/schools', protect, isAdmin, upload.single('logo'), async (req, res) => {
    try {
        const { name, address, city, state, pincode, phone, email, type, parentId, isDataVisibleToSchool, sendEmail } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required for school registration' });
        }

        const existingSchool = await db('schools').where({ email: email.toLowerCase() }).first();
        if (existingSchool) {
            if (existingSchool.is_active === false) {
                console.log(`Found inactive school record for ${email}, cleaning up before registration...`);
                await db('schools').where('id', existingSchool.id).del();
                await db('school_credentials').where('school_id', existingSchool.id).del();
            } else {
                return res.status(400).json({ message: 'A school with this email already exists' });
            }
        }

        const schoolId = await generateSchoolId(db);
        const plainPassword = generateSchoolPassword();

        const defaultAssessment = await db('assessments').where({ is_default: true }).first();

        const frontendUrl = process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:5173';
        const loginUrl = `${frontendUrl}/login`;

        const addressObj = {
            street: address || '',
            city: city || '',
            state: state || '',
            pincode: pincode || '',
            full: address ? `${address}${city ? ', ' + city : ''}${state ? ', ' + state : ''}${pincode ? ' - ' + pincode : ''}` : ''
        };

        const [school] = await db('schools').insert({
            school_id: schoolId,
            name,
            email: email.toLowerCase(),
            address: JSON.stringify(addressObj),
            type: type || 'super',
            parent_id: parentId || null,
            contact: JSON.stringify({ phone, email }),
            password: await hashPassword(plainPassword),
            plain_password: plainPassword,
            must_change_password: true,
            is_data_visible_to_school: isDataVisibleToSchool === 'true' || isDataVisibleToSchool === true,
            logo: req.file ? req.file.location : '',
            assigned_tests: defaultAssessment ? [defaultAssessment.id] : []
        }).returning('*');

        await db('school_credentials').insert({
            school_id: school.id,
            email: email.toLowerCase(),
            school_name: name,
            plain_password: plainPassword
        });

        let emailSent = false;
        if (sendEmail === 'true' || sendEmail === true) {
            emailSent = await sendSchoolCredentialsEmail(
                email.toLowerCase(),
                name,
                plainPassword,
                loginUrl
            );
            if (emailSent) {
                await db('schools').where('id', school.id).update({
                    credentials_email_sent: true,
                    last_credentials_email_sent_at: new Date()
                });
            }
        }

        res.status(201).json({
            _id: school.id,
            schoolId: school.school_id,
            email: school.email,
            name: school.name,
            password: plainPassword,
            plainPassword: plainPassword,
            logo: school.logo,
            address: school.address,
            contact: school.contact,
            isDataVisibleToSchool: school.is_data_visible_to_school,
            isBlocked: school.is_blocked,
            assignedTests: school.assigned_tests,
            credentialsEmailSent: emailSent,
            message: emailSent
                ? 'School registered successfully. Credentials email sent!'
                : 'School registered successfully. Save the credentials!'
        });
    } catch (error) {
        console.error('Create school error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/admin/schools/:id/send-credentials
// @desc    Send or resend credentials email to school
// @access  Admin
router.post('/schools/:id/send-credentials', protect, isAdmin, async (req, res) => {
    try {
        const { regeneratePassword } = req.body;

        const school = await db('schools').where('id', req.params.id).first();
        if (!school) {
            return res.status(404).json({ message: 'School not found' });
        }

        if (!school.email) {
            return res.status(400).json({ message: 'School does not have an email configured' });
        }

        let password = school.plain_password;

        if (regeneratePassword === 'true' || regeneratePassword === true) {
            password = generateSchoolPassword();
            await db('schools').where('id', school.id).update({
                password: await hashPassword(password),
                plain_password: password,
                must_change_password: true
            });
            await db('school_credentials').where('school_id', school.id).update({
                plain_password: password
            });
        }

        const frontendUrl = process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:5173';
        const loginUrl = `${frontendUrl}/login`;

        const emailSent = await sendSchoolCredentialsEmail(
            school.email,
            school.name,
            password,
            loginUrl
        );

        if (emailSent) {
            await db('schools').where('id', school.id).update({
                credentials_email_sent: true,
                last_credentials_email_sent_at: new Date()
            });

            res.json({
                success: true,
                message: 'Credentials email sent successfully',
                passwordRegenerated: regeneratePassword === 'true' || regeneratePassword === true
            });
        } else {
            res.status(500).json({ message: 'Failed to send credentials email' });
        }
    } catch (error) {
        console.error('Send credentials error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/admin/schools/:id
// @desc    Update school
// @access  Admin
router.put('/schools/:id', protect, isAdmin, upload.single('logo'), async (req, res) => {
    try {
        const { name, address, city, state, pincode, phone, email, type, parentId, isDataVisibleToSchool, resetPassword } = req.body;

        const school = await db('schools').where('id', req.params.id).first();
        if (!school) {
            return res.status(404).json({ message: 'School not found' });
        }

        const updates = {};

        updates.name = name || school.name;

        // Update structured address
        let addressObj = school.address || {};
        if (typeof addressObj === 'string') addressObj = JSON.parse(addressObj);

        if (address !== undefined) addressObj.street = address;
        if (city !== undefined) addressObj.city = city;
        if (state !== undefined) addressObj.state = state;
        if (pincode !== undefined) addressObj.pincode = pincode;

        if (address || city || state || pincode) {
            const street = addressObj.street || '';
            const c = addressObj.city || '';
            const s = addressObj.state || '';
            const p = addressObj.pincode || '';
            addressObj.full = `${street}${c ? ', ' + c : ''}${s ? ', ' + s : ''}${p ? ' - ' + p : ''}`;
        } else if (address) {
            addressObj.full = address;
        }

        updates.address = JSON.stringify(addressObj);

        if (type) updates.type = type;
        if (parentId) updates.parent_id = parentId;

        updates.contact = JSON.stringify({
            phone: phone || school.contact?.phone,
            email: email || school.contact?.email
        });

        if (email && email.toLowerCase() !== school.email) {
            const emailExists = await db('schools')
                .where({ email: email.toLowerCase() })
                .whereNot('id', school.id)
                .first();
            if (emailExists) {
                return res.status(400).json({ message: 'Email already in use by another school' });
            }
            updates.email = email.toLowerCase();
        }

        updates.is_data_visible_to_school = isDataVisibleToSchool === 'true' || isDataVisibleToSchool === true;

        if (req.file) {
            if (school.logo && school.logo.includes('amazonaws.com')) {
                deleteFromS3(school.logo);
            }
            updates.logo = req.file.location;
        }

        let newPassword = null;
        if (resetPassword === 'true' || resetPassword === true) {
            newPassword = generateSchoolPassword();
            updates.password = await hashPassword(newPassword);
        }

        const [updated] = await db('schools').where('id', school.id).update(updates).returning('*');

        const response = {
            _id: updated.id,
            schoolId: updated.school_id,
            name: updated.name,
            email: updated.email,
            logo: updated.logo,
            address: updated.address,
            contact: updated.contact,
            isDataVisibleToSchool: updated.is_data_visible_to_school
        };

        if (newPassword) {
            response.newPassword = newPassword;
        }

        res.json(response);
    } catch (error) {
        console.error('Update school error:', error);
        if (error.code === '23505') {
            return res.status(400).json({ message: 'Duplicate field value entered' });
        }
        if (error.code === '22P02') {
            return res.status(400).json({ message: 'Invalid ID format' });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/admin/schools/:id
// @desc    Archive and hard delete school (archives all school data, students, submissions)
// @access  Admin
router.delete('/schools/:id', protect, isAdmin, async (req, res) => {
    try {
        await db.transaction(async (trx) => {
            const school = await trx('schools').where('id', req.params.id).first();
            if (!school) {
                res.status(404).json({ message: 'School not found' });
                return;
            }

            const students = await trx('students').where('school_id', school.id);

            const submissionRows = await trx('submissions as sub')
                .leftJoin('assessments as a', 'sub.assessment_id', 'a.id')
                .leftJoin('students as stu', 'sub.student_id', 'stu.id')
                .where('sub.school_id', school.id)
                .select(
                    'sub.*',
                    'a.title as assessment_title',
                    'stu.name as student_name'
                );

            await trx('archived_data').insert({
                type: 'school',
                archived_by: 'admin',
                reason: 'manual_deletion',
                school_data: JSON.stringify({
                    _id: school.id,
                    schoolId: school.school_id,
                    name: school.name,
                    logo: school.logo,
                    address: school.address,
                    contact: school.contact,
                    isDataVisibleToSchool: school.is_data_visible_to_school,
                    assignedTests: school.assigned_tests,
                    createdAt: school.created_at
                }),
                school_students: JSON.stringify(students.map(s => ({
                    _id: s.id,
                    accessId: s.access_id,
                    name: s.name,
                    rollNo: s.roll_no,
                    class: s.class,
                    section: s.section,
                    testStatus: s.test_status,
                    createdAt: s.created_at
                }))),
                school_submissions: JSON.stringify(submissionRows.map(sub => ({
                    studentId: sub.student_id,
                    studentName: sub.student_name || (sub.student_id ? 'Unknown' : 'Deleted Student'),
                    assessmentId: sub.assessment_id,
                    assessmentTitle: sub.assessment_title || 'Unknown Assessment',
                    totalScore: sub.total_score,
                    sectionScores: sub.section_scores,
                    assignedBucket: sub.assigned_bucket,
                    submittedAt: sub.submitted_at,
                    answers: sub.answers
                }))),
                stats: JSON.stringify({
                    studentCount: students.length,
                    submissionCount: submissionRows.length
                })
            });

            await trx('students').where('school_id', school.id).del();
            await trx('submissions').where('school_id', school.id).del();
            await trx('school_credentials').where('school_id', school.id).del();
            await trx('tickets').where('school_id', school.id).del();
            await trx('schools').where('id', req.params.id).del();

            res.json({
                message: 'School archived and permanently deleted successfully',
                archived: {
                    students: students.length,
                    submissions: submissionRows.length
                }
            });
        });
    } catch (error) {
        console.error('Delete school error:', error);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Server error: ' + error.message });
        }
    }
});

// @route   GET /api/admin/schools/:id/students-analytics
// @desc    Get all students of a school with their submission data
// @access  Admin
router.get('/schools/:id/students-analytics', protect, isAdmin, async (req, res) => {
    try {
        const { class: className, section, assessmentId, search } = req.query;

        const school = await db('schools').where('id', req.params.id).first();
        if (!school) {
            return res.status(404).json({ message: 'School not found' });
        }

        let studentQuery = db('students')
            .where({ school_id: school.id, is_active: true });

        if (className) studentQuery = studentQuery.where('class', className);
        if (section) studentQuery = studentQuery.where('section', section);
        if (search) {
            studentQuery = studentQuery.andWhere(function () {
                this.where('name', 'ilike', `%${search}%`)
                    .orWhere('access_id', 'ilike', `%${search}%`)
                    .orWhere('roll_no', 'ilike', `%${search}%`);
            });
        }

        const students = await studentQuery
            .select('id', 'name', 'access_id', 'class', 'section', 'roll_no', 'test_status')
            .orderBy([{ column: 'class', order: 'asc' }, { column: 'section', order: 'asc' }, { column: 'name', order: 'asc' }]);

        const studentIds = students.map(s => s.id);

        let subQuery = db('submissions as sub')
            .leftJoin('assessments as a', 'sub.assessment_id', 'a.id')
            .where('sub.school_id', school.id)
            .whereIn('sub.student_id', studentIds);

        if (assessmentId) {
            subQuery = subQuery.where('sub.assessment_id', assessmentId);
        }

        const submissionRows = await subQuery.select(
            'sub.id', 'sub.student_id', 'sub.assessment_id',
            'sub.total_score', 'sub.section_scores', 'sub.assigned_bucket', 'sub.submitted_at',
            'a.title as assessment_title'
        );

        const submissionsByStudent = {};
        submissionRows.forEach(sub => {
            const sid = sub.student_id;
            if (!submissionsByStudent[sid]) submissionsByStudent[sid] = [];
            submissionsByStudent[sid].push({
                assessmentId: sub.assessment_id,
                assessmentTitle: sub.assessment_title,
                totalScore: sub.total_score,
                sectionScores: sub.section_scores,
                bucket: sub.assigned_bucket,
                submittedAt: sub.submitted_at
            });
        });

        const studentsWithAnalytics = students.map(student => ({
            _id: student.id,
            name: student.name,
            accessId: student.access_id,
            class: student.class,
            section: student.section,
            rollNo: student.roll_no,
            submissions: submissionsByStudent[student.id] || [],
            latestSubmission: submissionsByStudent[student.id]?.[0] || null
        }));

        // Get unique classes and sections for filters
        const allStudents = await db('students')
            .where({ school_id: school.id, is_active: true })
            .select('class', 'section');

        const uniqueClasses = [...new Set(allStudents.map(s => s.class))].sort();
        const uniqueSections = className
            ? [...new Set(allStudents.filter(s => s.class === className).map(s => s.section))].sort()
            : [];

        const assessments = await db('assessments')
            .where({ is_active: true })
            .select('id', 'title');

        res.json({
            school: { _id: school.id, name: school.name, schoolId: school.school_id },
            students: studentsWithAnalytics,
            totalStudents: studentsWithAnalytics.length,
            filters: {
                classes: uniqueClasses,
                sections: uniqueSections,
                assessments: assessments.map(a => ({ _id: a.id, title: a.title }))
            }
        });
    } catch (error) {
        console.error('Get school students analytics error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// ============================================
// HIERARCHICAL ANALYTICS ENDPOINTS
// ============================================

// @route   GET /api/admin/analytics/overview
// @desc    Get nationwide analytics overview for admin dashboard
// @access  Admin
router.get('/analytics/overview', protect, isAdmin, async (req, res) => {
    try {
        const [totalSchoolsResult, totalStudentsResult, totalSubmissionsResult] = await Promise.all([
            db('schools').where({ is_active: true }).count('* as count').first(),
            db('students').where({ is_active: true }).count('* as count').first(),
            db('submissions').where({ status: 'complete' }).count('* as count').first()
        ]);

        const totalSchools = parseInt(totalSchoolsResult.count);
        const totalStudents = parseInt(totalStudentsResult.count);
        const totalSubmissions = parseInt(totalSubmissionsResult.count);

        const submissionRows = await db('submissions')
            .where({ status: 'complete' })
            .select('school_id', 'total_score', 'section_scores', 'assigned_bucket', 'submitted_at')
            .orderBy('submitted_at', 'desc')
            .limit(5000);

        const submissions = mapRows(submissionRows);

        // Calculate skill distribution
        const skillDistribution = {
            A: { green: 0, yellow: 0, red: 0 }, B: { green: 0, yellow: 0, red: 0 },
            C: { green: 0, yellow: 0, red: 0 }, D: { green: 0, yellow: 0, red: 0 }
        };
        const overallDistribution = { doingWell: 0, needsSupport: 0, needsAttention: 0 };

        submissions.forEach(sub => {
            if (sub.sectionScores) {
                Object.entries(sub.sectionScores).forEach(([section, score]) => {
                    if (skillDistribution[section]) {
                        const bucket = getBucketCategory(score);
                        if (bucket !== 'unknown') skillDistribution[section][bucket]++;
                    }
                });
            }
            const overall = getOverallBucket(sub.totalScore);
            if (overall !== 'unknown') overallDistribution[overall]++;
        });

        // Get monthly trend data (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlyTrend = await db('submissions')
            .where({ status: 'complete' })
            .where('submitted_at', '>=', sixMonthsAgo)
            .select(
                db.raw('EXTRACT(YEAR FROM submitted_at)::int as year'),
                db.raw('EXTRACT(MONTH FROM submitted_at)::int as month')
            )
            .count('* as count')
            .avg('total_score as avg_score')
            .groupByRaw('EXTRACT(YEAR FROM submitted_at), EXTRACT(MONTH FROM submitted_at)')
            .orderByRaw('EXTRACT(YEAR FROM submitted_at), EXTRACT(MONTH FROM submitted_at)');

        // Get top schools by submissions
        const topSchools = await db('submissions as sub')
            .join('schools as sch', 'sub.school_id', 'sch.id')
            .where('sub.status', 'complete')
            .select('sch.id', 'sch.name', 'sch.logo')
            .count('* as submission_count')
            .avg('sub.total_score as avg_score')
            .groupBy('sch.id', 'sch.name', 'sch.logo')
            .orderBy('submission_count', 'desc')
            .limit(10);

        // Get all schools for the school list
        const schoolRows = await db('schools')
            .where({ is_active: true })
            .select('id', 'name', 'school_id', 'logo', 'address', 'created_at')
            .orderBy('name', 'asc');

        const schoolIds = schoolRows.map(s => s.id);

        const [studentCounts, submissionCounts] = await Promise.all([
            db('students')
                .whereIn('school_id', schoolIds)
                .where('is_active', true)
                .select('school_id')
                .count('* as count')
                .groupBy('school_id'),
            db('submissions')
                .whereIn('school_id', schoolIds)
                .where('status', 'complete')
                .select('school_id')
                .count('* as count')
                .groupBy('school_id')
        ]);

        const studentCountMap = {};
        studentCounts.forEach(r => { studentCountMap[r.school_id] = parseInt(r.count); });
        const subCountMap = {};
        submissionCounts.forEach(r => { subCountMap[r.school_id] = parseInt(r.count); });

        const schoolStats = schoolRows.map(school => {
            const sc = studentCountMap[school.id] || 0;
            const subc = subCountMap[school.id] || 0;
            return {
                _id: school.id,
                name: school.name,
                schoolId: school.school_id,
                logo: school.logo,
                address: school.address,
                studentCount: sc,
                submissionCount: subc,
                completionRate: sc > 0 ? Math.round((subc / sc) * 100) : 0
            };
        });

        res.json({
            totals: { totalSchools, totalStudents, totalSubmissions },
            overallDistribution,
            skillDistribution,
            monthlyTrend: monthlyTrend.map(m => ({
                month: `${m.year}-${String(m.month).padStart(2, '0')}`,
                count: parseInt(m.count),
                avgScore: Math.round(parseFloat(m.avg_score) * 10) / 10
            })),
            topSchools: topSchools.map(r => ({
                schoolId: r.id,
                name: r.name,
                logo: r.logo,
                submissionCount: parseInt(r.submission_count),
                avgScore: Math.round(parseFloat(r.avg_score) * 10) / 10
            })),
            schools: schoolStats
        });
    } catch (error) {
        console.error('Analytics overview error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/admin/analytics/tests
// @desc    Get all tests/assessments with submission statistics
// @access  Admin
router.get('/analytics/tests', protect, isAdmin, async (req, res) => {
    try {
        const assessments = await db('assessments')
            .where({ is_active: true })
            .select('id', 'title', 'description', 'created_at')
            .orderBy('created_at', 'desc');

        const testsWithStats = await Promise.all(assessments.map(async (assessment) => {
            const stats = await db('submissions')
                .where('assessment_id', assessment.id)
                .select('status')
                .count('* as count')
                .avg('total_score as avg_score')
                .groupBy('status');

            const completed = stats.find(s => s.status === 'complete') || { count: '0', avg_score: 0 };
            const pending = stats.find(s => s.status === 'pending') || { count: '0' };
            const incomplete = stats.find(s => s.status === 'incomplete') || { count: '0' };

            const completedCount = parseInt(completed.count);
            const pendingCount = parseInt(pending.count);
            const incompleteCount = parseInt(incomplete.count);

            const bucketDist = await db('submissions')
                .where({ assessment_id: assessment.id, status: 'complete' })
                .select('assigned_bucket')
                .count('* as count')
                .groupBy('assigned_bucket');

            const distribution = { doingWell: 0, needsSupport: 0, needsAttention: 0 };
            bucketDist.forEach(b => {
                if (b.assigned_bucket === 'Doing Well' || b.assigned_bucket === 'doingWell') distribution.doingWell = parseInt(b.count);
                else if (b.assigned_bucket === 'Needs Support' || b.assigned_bucket === 'needsSupport') distribution.needsSupport = parseInt(b.count);
                else if (b.assigned_bucket === 'Needs Attention' || b.assigned_bucket === 'needsAttention') distribution.needsAttention = parseInt(b.count);
            });

            const totalSubs = completedCount + pendingCount + incompleteCount;

            return {
                _id: assessment.id,
                title: assessment.title,
                description: assessment.description,
                createdAt: assessment.created_at,
                totalSubmissions: totalSubs,
                completedSubmissions: completedCount,
                pendingSubmissions: pendingCount,
                incompleteSubmissions: incompleteCount,
                avgScore: Math.round((parseFloat(completed.avg_score) || 0) * 10) / 10,
                completionRate: totalSubs > 0 ? Math.round((completedCount / totalSubs) * 100) : 0,
                distribution
            };
        }));

        res.json({
            tests: testsWithStats,
            totalTests: testsWithStats.length
        });
    } catch (error) {
        console.error('Tests analytics error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/admin/analytics/tests/:testId
// @desc    Get detailed analytics for a specific test/assessment
// @access  Admin
router.get('/analytics/tests/:testId', protect, isAdmin, async (req, res) => {
    try {
        const assessment = await db('assessments').where('id', req.params.testId).first();
        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        const rawSubs = await db('submissions as sub')
            .leftJoin('students as stu', 'sub.student_id', 'stu.id')
            .leftJoin('schools as sch', 'sub.school_id', 'sch.id')
            .where({ 'sub.assessment_id': assessment.id, 'sub.status': 'complete' })
            .select(
                'sub.id', 'sub.student_id', 'sub.school_id',
                'sub.total_score', 'sub.section_scores', 'sub.assigned_bucket', 'sub.submitted_at',
                'stu.name as student_name', 'stu.access_id as student_access_id',
                'stu.class as student_class', 'stu.section as student_section',
                'sch.name as school_name', 'sch.school_id as school_code', 'sch.logo as school_logo'
            );

        const submissions = rawSubs.map(r => ({
            _id: r.id,
            totalScore: r.total_score,
            sectionScores: r.section_scores,
            assignedBucket: r.assigned_bucket,
            submittedAt: r.submitted_at,
            studentId: r.student_id ? {
                _id: r.student_id,
                name: r.student_name,
                accessId: r.student_access_id,
                class: r.student_class,
                section: r.student_section
            } : null,
            schoolId: r.school_id ? {
                _id: r.school_id,
                name: r.school_name,
                schoolId: r.school_code,
                logo: r.school_logo
            } : null
        }));

        const totalSubmissions = submissions.length;
        const avgScore = totalSubmissions > 0
            ? Math.round(submissions.reduce((acc, s) => acc + s.totalScore, 0) / totalSubmissions * 10) / 10
            : 0;

        const distribution = { doingWell: 0, needsSupport: 0, needsAttention: 0 };
        submissions.forEach(sub => {
            const bucket = getOverallBucket(sub.totalScore);
            if (bucket !== 'unknown') distribution[bucket]++;
        });

        const skillDistribution = {
            A: { green: 0, yellow: 0, red: 0 },
            B: { green: 0, yellow: 0, red: 0 },
            C: { green: 0, yellow: 0, red: 0 },
            D: { green: 0, yellow: 0, red: 0 }
        };
        submissions.forEach(sub => {
            if (sub.sectionScores) {
                Object.entries(sub.sectionScores).forEach(([section, score]) => {
                    if (skillDistribution[section]) {
                        const bucket = getBucketCategory(score);
                        if (bucket !== 'unknown') skillDistribution[section][bucket]++;
                    }
                });
            }
        });

        // School-wise breakdown
        const schoolMap = {};
        submissions.forEach(sub => {
            if (sub.schoolId) {
                const sid = sub.schoolId._id;
                if (!schoolMap[sid]) {
                    schoolMap[sid] = {
                        _id: sub.schoolId._id,
                        name: sub.schoolId.name,
                        schoolId: sub.schoolId.schoolId,
                        logo: sub.schoolId.logo,
                        submissions: 0,
                        totalScore: 0,
                        distribution: { doingWell: 0, needsSupport: 0, needsAttention: 0 }
                    };
                }
                schoolMap[sid].submissions++;
                schoolMap[sid].totalScore += sub.totalScore;
                const bucket = getOverallBucket(sub.totalScore);
                if (bucket !== 'unknown') schoolMap[sid].distribution[bucket]++;
            }
        });

        const schoolBreakdown = Object.values(schoolMap).map(s => ({
            ...s,
            avgScore: Math.round((s.totalScore / s.submissions) * 10) / 10
        })).sort((a, b) => b.submissions - a.submissions);

        const recentSubmissions = submissions.slice(0, 10).map(sub => ({
            _id: sub._id,
            studentName: sub.studentId?.name || 'Unknown',
            studentClass: sub.studentId?.class || '-',
            schoolName: sub.schoolId?.name || 'Unknown',
            totalScore: sub.totalScore,
            bucket: sub.assignedBucket,
            submittedAt: sub.submittedAt
        }));

        res.json({
            assessment: {
                _id: assessment.id,
                title: assessment.title,
                description: assessment.description,
                questionCount: assessment.questions?.length || 0,
                createdAt: assessment.created_at
            },
            stats: {
                totalSubmissions,
                avgScore,
                distribution,
                skillDistribution
            },
            schoolBreakdown,
            recentSubmissions
        });
    } catch (error) {
        console.error('Test analytics error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/admin/schools/:id/analytics
// @desc    Get school-level analytics with class breakdown
// @access  Admin
router.get('/schools/:id/analytics', protect, isAdmin, async (req, res) => {
    try {
        const school = await db('schools').where('id', req.params.id).first();
        if (!school) {
            return res.status(404).json({ message: 'School not found' });
        }

        const students = await db('students')
            .where({ school_id: school.id, is_active: true })
            .select('id', 'name', 'access_id', 'class', 'section', 'roll_no');

        const rawSubs = await db('submissions as sub')
            .leftJoin('students as stu', 'sub.student_id', 'stu.id')
            .where({ 'sub.school_id': school.id, 'sub.status': 'complete' })
            .select(
                'sub.id', 'sub.student_id', 'sub.total_score', 'sub.section_scores',
                'sub.assigned_bucket', 'sub.submitted_at',
                'stu.class as student_class', 'stu.section as student_section', 'stu.name as student_name'
            );

        const submissions = rawSubs.map(r => ({
            totalScore: r.total_score,
            sectionScores: r.section_scores,
            assignedBucket: r.assigned_bucket,
            submittedAt: r.submitted_at,
            studentId: r.student_id ? {
                _id: r.student_id,
                class: r.student_class,
                section: r.student_section,
                name: r.student_name
            } : null
        }));

        // Group data by class
        const classMap = {};
        students.forEach(student => {
            const cls = student.class || 'Unknown';
            if (!classMap[cls]) {
                classMap[cls] = {
                    students: [],
                    submissions: [],
                    totalStudents: 0,
                    completedStudents: 0,
                    skillDistribution: {
                        A: { green: 0, yellow: 0, red: 0 }, B: { green: 0, yellow: 0, red: 0 },
                        C: { green: 0, yellow: 0, red: 0 }, D: { green: 0, yellow: 0, red: 0 }
                    },
                    overallDistribution: { doingWell: 0, needsSupport: 0, needsAttention: 0 }
                };
            }
            classMap[cls].students.push(student.id);
            classMap[cls].totalStudents++;
        });

        const completedStudentIds = new Set();
        submissions.forEach(sub => {
            if (!sub.studentId) return;
            const cls = sub.studentId.class || 'Unknown';
            if (classMap[cls]) {
                completedStudentIds.add(sub.studentId._id);
                classMap[cls].submissions.push(sub);

                if (sub.sectionScores) {
                    Object.entries(sub.sectionScores).forEach(([section, score]) => {
                        if (classMap[cls].skillDistribution[section]) {
                            const bucket = getBucketCategory(score);
                            if (bucket !== 'unknown') classMap[cls].skillDistribution[section][bucket]++;
                        }
                    });
                }
                const overall = getOverallBucket(sub.totalScore);
                if (overall !== 'unknown') classMap[cls].overallDistribution[overall]++;
            }
        });

        students.forEach(student => {
            const cls = student.class || 'Unknown';
            if (completedStudentIds.has(student.id)) {
                classMap[cls].completedStudents++;
            }
        });

        const classes = Object.entries(classMap).map(([className, data]) => ({
            className,
            totalStudents: data.totalStudents,
            completedStudents: data.completedStudents,
            pendingStudents: data.totalStudents - data.completedStudents,
            completionRate: data.totalStudents > 0 ? Math.round((data.completedStudents / data.totalStudents) * 100) : 0,
            avgScore: data.submissions.length > 0
                ? Math.round(data.submissions.reduce((sum, s) => sum + (s.totalScore || 0), 0) / data.submissions.length)
                : 0,
            skillDistribution: data.skillDistribution,
            overallDistribution: data.overallDistribution
        })).sort((a, b) => {
            const aNum = parseInt(a.className) || 0;
            const bNum = parseInt(b.className) || 0;
            return aNum - bNum;
        });

        const recentSubmissions = submissions
            .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
            .slice(0, 10)
            .map(sub => ({
                studentName: sub.studentId?.name || 'Unknown',
                class: sub.studentId?.class || 'Unknown',
                section: sub.studentId?.section || '',
                totalScore: sub.totalScore,
                bucket: sub.assignedBucket,
                submittedAt: sub.submittedAt
            }));

        const totalStudents = students.length;
        const completedCount = completedStudentIds.size;

        // Monthly trend for this school (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        const monthlyTrend = await db('submissions')
            .where({ school_id: school.id, status: 'complete' })
            .where('submitted_at', '>=', sixMonthsAgo)
            .select(
                db.raw('EXTRACT(YEAR FROM submitted_at)::int as year'),
                db.raw('EXTRACT(MONTH FROM submitted_at)::int as month')
            )
            .count('* as count')
            .avg('total_score as avg_score')
            .groupByRaw('EXTRACT(YEAR FROM submitted_at), EXTRACT(MONTH FROM submitted_at)')
            .orderByRaw('EXTRACT(YEAR FROM submitted_at), EXTRACT(MONTH FROM submitted_at)');

        // Weekly trend for this school (last 8 weeks)
        const eightWeeksAgo = new Date();
        eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);

        const weeklyTrend = await db('submissions')
            .where({ school_id: school.id, status: 'complete' })
            .where('submitted_at', '>=', eightWeeksAgo)
            .select(
                db.raw('EXTRACT(ISOYEAR FROM submitted_at)::int as year'),
                db.raw('EXTRACT(WEEK FROM submitted_at)::int as week')
            )
            .count('* as count')
            .avg('total_score as avg_score')
            .groupByRaw('EXTRACT(ISOYEAR FROM submitted_at), EXTRACT(WEEK FROM submitted_at)')
            .orderByRaw('EXTRACT(ISOYEAR FROM submitted_at), EXTRACT(WEEK FROM submitted_at)');

        res.json({
            school: {
                _id: school.id,
                name: school.name,
                schoolId: school.school_id,
                logo: school.logo,
                address: school.address
            },
            stats: {
                totalStudents,
                completedStudents: completedCount,
                pendingStudents: totalStudents - completedCount,
                completionRate: totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0
            },
            classes,
            recentSubmissions,
            monthlyTrend: monthlyTrend.map(m => ({
                month: `${m.year}-${String(m.month).padStart(2, '0')}`,
                count: parseInt(m.count),
                avgScore: Math.round(parseFloat(m.avg_score) * 10) / 10
            })),
            weeklyTrend: weeklyTrend.map(w => ({
                week: `W${w.week} ${w.year}`,
                count: parseInt(w.count),
                avgScore: Math.round(parseFloat(w.avg_score) * 10) / 10
            }))
        });

    } catch (error) {
        console.error('School analytics error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/admin/schools/:id/class/:className/analytics
// @desc    Get class-level analytics with student list
// @access  Admin
router.get('/schools/:id/class/:className/analytics', protect, isAdmin, async (req, res) => {
    try {
        const { section } = req.query;
        const school = await db('schools').where('id', req.params.id).first();
        if (!school) {
            return res.status(404).json({ message: 'School not found' });
        }

        let studentQuery = db('students')
            .where({ school_id: school.id, is_active: true, class: req.params.className });
        if (section) studentQuery = studentQuery.where('section', section);

        const students = await studentQuery
            .select('id', 'name', 'access_id', 'class', 'section', 'roll_no', 'test_status')
            .orderBy([{ column: 'section', order: 'asc' }, { column: 'roll_no', order: 'asc' }, { column: 'name', order: 'asc' }]);

        const studentIds = students.map(s => s.id);

        const submissionRows = await db('submissions')
            .whereIn('student_id', studentIds)
            .where('status', 'complete')
            .select('id', 'student_id', 'total_score', 'section_scores', 'assigned_bucket', 'submitted_at');

        const submissionMap = {};
        submissionRows.forEach(sub => {
            submissionMap[sub.student_id] = sub;
        });

        const studentsWithAnalytics = students.map(student => {
            const sub = submissionMap[student.id];
            return {
                _id: student.id,
                name: student.name,
                accessId: student.access_id,
                class: student.class,
                section: student.section,
                rollNo: student.roll_no,
                hasSubmission: !!sub,
                totalScore: sub?.total_score || null,
                sectionScores: sub?.section_scores || null,
                bucket: sub?.assigned_bucket || null,
                submittedAt: sub?.submitted_at || null
            };
        });

        const completedStudents = studentsWithAnalytics.filter(s => s.hasSubmission);
        const avgScore = completedStudents.length > 0
            ? Math.round(completedStudents.reduce((sum, s) => sum + (s.totalScore || 0), 0) / completedStudents.length)
            : 0;

        const skillDistribution = {
            A: { green: 0, yellow: 0, red: 0 }, B: { green: 0, yellow: 0, red: 0 },
            C: { green: 0, yellow: 0, red: 0 }, D: { green: 0, yellow: 0, red: 0 }
        };
        const overallDistribution = { doingWell: 0, needsSupport: 0, needsAttention: 0 };

        submissionRows.forEach(sub => {
            if (sub.section_scores) {
                Object.entries(sub.section_scores).forEach(([sec, score]) => {
                    if (skillDistribution[sec]) {
                        const bucket = getBucketCategory(score);
                        if (bucket !== 'unknown') skillDistribution[sec][bucket]++;
                    }
                });
            }
            const overall = getOverallBucket(sub.total_score);
            if (overall !== 'unknown') overallDistribution[overall]++;
        });

        // Get unique sections for filter
        const allStudentsInClass = await db('students')
            .where({ school_id: school.id, is_active: true, class: req.params.className })
            .select('section');
        const sections = [...new Set(allStudentsInClass.map(s => s.section).filter(Boolean))].sort();

        res.json({
            school: { _id: school.id, name: school.name, schoolId: school.school_id },
            className: req.params.className,
            currentSection: section || null,
            sections,
            stats: {
                totalStudents: students.length,
                completedStudents: completedStudents.length,
                pendingStudents: students.length - completedStudents.length,
                completionRate: students.length > 0 ? Math.round((completedStudents.length / students.length) * 100) : 0,
                avgScore
            },
            skillDistribution,
            overallDistribution,
            students: studentsWithAnalytics
        });
    } catch (error) {
        console.error('Class analytics error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/admin/students/:studentId/analytics
// @desc    Get individual student analytics with submission details
// @access  Admin
router.get('/students/:studentId/analytics', protect, isAdmin, async (req, res) => {
    try {
        const { testId } = req.query;

        const studentRow = await db('students as stu')
            .leftJoin('schools as sch', 'stu.school_id', 'sch.id')
            .where('stu.id', req.params.studentId)
            .select(
                'stu.id', 'stu.name', 'stu.access_id', 'stu.class', 'stu.section', 'stu.roll_no', 'stu.school_id',
                'sch.name as school_name', 'sch.school_id as school_code', 'sch.logo as school_logo'
            )
            .first();

        if (!studentRow) {
            return res.status(404).json({ message: 'Student not found' });
        }

        let subQuery = db('submissions as sub')
            .leftJoin('assessments as a', 'sub.assessment_id', 'a.id')
            .where({ 'sub.student_id': studentRow.id, 'sub.status': 'complete' });

        if (testId) {
            subQuery = subQuery.where('sub.assessment_id', testId);
        }

        const submissionRows = await subQuery
            .select(
                'sub.*',
                'a.title as assessment_title', 'a.description as assessment_description',
                'a.questions as assessment_questions'
            )
            .orderBy('sub.submitted_at', 'desc');

        const formattedSubmissions = submissionRows.map(sub => {
            const questions = sub.assessment_questions || [];
            const answersWithDetails = (sub.answers || []).map(ans => {
                const question = questions[ans.questionIndex];
                const selectedOption = question?.options?.[ans.selectedOption];
                return {
                    questionIndex: ans.questionIndex,
                    section: ans.section || question?.section,
                    questionText: question?.text || 'Question not found',
                    options: question?.options?.map(opt => ({
                        label: opt.label,
                        marks: opt.marks
                    })) || [],
                    selectedOptionIndex: ans.selectedOption,
                    selectedOptionLabel: selectedOption?.label || 'Unknown',
                    marks: ans.marks,
                    timeTakenForQuestion: ans.timeTakenForQuestion
                };
            });

            return {
                _id: sub.id,
                assessmentId: sub.assessment_id,
                assessmentTitle: sub.assessment_title || 'Unknown Assessment',
                totalScore: sub.total_score,
                sectionScores: sub.section_scores,
                sectionBuckets: sub.section_buckets,
                bucket: sub.assigned_bucket,
                primarySkillArea: sub.primary_skill_area,
                secondarySkillArea: sub.secondary_skill_area,
                timeTaken: sub.time_taken,
                answers: answersWithDetails,
                moodCheck: sub.mood_check,
                submittedAt: sub.submitted_at
            };
        });

        // Get list of all tests this student has taken (for filter dropdown)
        const allSubRows = await db('submissions as sub')
            .leftJoin('assessments as a', 'sub.assessment_id', 'a.id')
            .where({ 'sub.student_id': studentRow.id, 'sub.status': 'complete' })
            .select('sub.assessment_id', 'a.title as assessment_title');

        const testsMap = {};
        allSubRows.forEach(sub => {
            if (sub.assessment_id) {
                testsMap[sub.assessment_id] = {
                    _id: sub.assessment_id,
                    title: sub.assessment_title
                };
            }
        });
        const availableTests = Object.values(testsMap);

        res.json({
            _id: studentRow.id,
            name: studentRow.name,
            accessId: studentRow.access_id,
            class: studentRow.class,
            section: studentRow.section,
            rollNo: studentRow.roll_no,
            school: studentRow.school_id ? {
                _id: studentRow.school_id,
                name: studentRow.school_name,
                schoolId: studentRow.school_code,
                logo: studentRow.school_logo
            } : null,
            submissions: formattedSubmissions,
            availableTests
        });
    } catch (error) {
        console.error('Student analytics error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/admin/assessments
// @desc    Get all assessments
// @access  Admin
router.get('/assessments', protect, isAdmin, async (req, res) => {
    try {
        const assessments = await db('assessments')
            .where({ is_active: true })
            .select('id', 'title', 'description', 'is_default', 'inactivity_alert_time', 'inactivity_end_time',
                'questions', 'buckets', 'custom_sections', 'created_at')
            .orderBy([{ column: 'is_default', order: 'desc' }, { column: 'created_at', order: 'desc' }]);

        const assessmentsWithStats = assessments.map(a => {
            const mapped = mapRow(a);
            mapped.questionCount = a.questions?.length || 0;
            return mapped;
        });

        res.json(assessmentsWithStats);
    } catch (error) {
        console.error('Get assessments error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/admin/assessments
// @desc    Create new assessment
// @access  Admin
router.post('/assessments', protect, isAdmin, async (req, res) => {
    try {
        const { title, description, inactivityAlertTime, inactivityEndTime, questions, buckets, customSections } = req.body;

        const [assessment] = await db('assessments').insert({
            title,
            description,
            inactivity_alert_time: inactivityAlertTime || 40,
            inactivity_end_time: inactivityEndTime || 120,
            questions: JSON.stringify(questions),
            buckets: JSON.stringify(buckets),
            custom_sections: JSON.stringify(customSections || []),
            is_default: false
        }).returning('*');

        res.status(201).json(mapRow(assessment));
    } catch (error) {
        console.error('Create assessment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/admin/assessments/:id
// @desc    Update assessment
// @access  Admin
router.put('/assessments/:id', protect, isAdmin, async (req, res) => {
    try {
        const { title, description, inactivityAlertTime, inactivityEndTime, questions, buckets, customSections } = req.body;

        const assessment = await db('assessments').where('id', req.params.id).first();
        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        const updates = {};
        if (title) updates.title = title;
        if (description) updates.description = description;
        if (inactivityAlertTime) updates.inactivity_alert_time = inactivityAlertTime;
        if (inactivityEndTime) updates.inactivity_end_time = inactivityEndTime;
        if (questions) updates.questions = JSON.stringify(questions);
        if (buckets) updates.buckets = JSON.stringify(buckets);
        if (customSections) updates.custom_sections = JSON.stringify(customSections);

        const [updated] = await db('assessments').where('id', req.params.id).update(updates).returning('*');

        res.json(mapRow(updated));
    } catch (error) {
        console.error('Update assessment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/admin/assessments/:id
// @desc    Delete assessment (soft delete or hard delete if no submissions)
// @access  Admin
router.delete('/assessments/:id', protect, isAdmin, async (req, res) => {
    try {
        const assessment = await db('assessments').where('id', req.params.id).first();
        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        if (assessment.is_default) {
            return res.status(400).json({ message: 'Cannot delete the default assessment' });
        }

        const countResult = await db('submissions')
            .where('assessment_id', assessment.id)
            .count('* as count')
            .first();
        const submissionCount = parseInt(countResult.count);

        if (submissionCount > 0) {
            await db('assessments').where('id', req.params.id).update({ is_active: false });
            res.json({ message: 'Assessment deactivated (has existing submissions)' });
        } else {
            await db('assessments').where('id', req.params.id).del();
            res.json({ message: 'Assessment deleted successfully' });
        }
    } catch (error) {
        console.error('Delete assessment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/admin/analytics
// @desc    Get analytics with filters
// @access  Admin
router.get('/analytics', protect, isAdmin, async (req, res) => {
    try {
        const { schoolId, startDate, endDate, bucket, className } = req.query;

        let baseQuery = db('submissions as sub')
            .leftJoin('students as stu', 'sub.student_id', 'stu.id')
            .leftJoin('schools as sch', 'sub.school_id', 'sch.id');

        if (schoolId) baseQuery = baseQuery.where('sub.school_id', schoolId);
        if (startDate) baseQuery = baseQuery.where('sub.submitted_at', '>=', new Date(startDate));
        if (endDate) baseQuery = baseQuery.where('sub.submitted_at', '<=', new Date(endDate));
        if (bucket) baseQuery = baseQuery.where('sub.assigned_bucket', bucket);

        const rawRows = await baseQuery.select(
            'sub.id', 'sub.student_id', 'sub.school_id', 'sub.assessment_id',
            'sub.total_score', 'sub.section_scores', 'sub.section_buckets',
            'sub.assigned_bucket', 'sub.submitted_at', 'sub.status',
            'sub.time_taken', 'sub.answers', 'sub.primary_skill_area', 'sub.secondary_skill_area',
            'sub.mood_check', 'sub.total_inactivity_time',
            'stu.name as student_name', 'stu.access_id as student_access_id',
            'stu.class as student_class', 'stu.section as student_section',
            'sch.name as school_name', 'sch.school_id as school_code'
        ).orderBy('sub.submitted_at', 'desc');

        const submissions = rawRows.map(r => ({
            _id: r.id,
            totalScore: r.total_score,
            sectionScores: r.section_scores,
            sectionBuckets: r.section_buckets,
            assignedBucket: r.assigned_bucket,
            submittedAt: r.submitted_at,
            status: r.status,
            timeTaken: r.time_taken,
            answers: r.answers,
            primarySkillArea: r.primary_skill_area,
            secondarySkillArea: r.secondary_skill_area,
            moodCheck: r.mood_check,
            totalInactivityTime: r.total_inactivity_time,
            studentId: r.student_id ? {
                _id: r.student_id,
                name: r.student_name,
                accessId: r.student_access_id,
                class: r.student_class,
                section: r.student_section
            } : null,
            schoolId: r.school_id ? {
                _id: r.school_id,
                name: r.school_name,
                schoolId: r.school_code
            } : null
        }));

        let filteredSubmissions = submissions;
        if (className) {
            filteredSubmissions = submissions.filter(s => s.studentId?.class === className);
        }

        const analytics = calculateAnalytics(filteredSubmissions);

        const schoolBreakdown = {};
        filteredSubmissions.forEach(sub => {
            const schoolName = sub.schoolId?.name || 'Unknown';
            if (!schoolBreakdown[schoolName]) {
                schoolBreakdown[schoolName] = { total: 0, buckets: {} };
            }
            schoolBreakdown[schoolName].total++;
            const b = sub.assignedBucket || 'Unknown';
            schoolBreakdown[schoolName].buckets[b] = (schoolBreakdown[schoolName].buckets[b] || 0) + 1;
        });

        const classBreakdown = {};
        filteredSubmissions.forEach(sub => {
            const classKey = sub.studentId?.class || 'Unknown';
            if (!classBreakdown[classKey]) {
                classBreakdown[classKey] = { total: 0, avgScore: 0, totalScore: 0, buckets: {} };
            }
            classBreakdown[classKey].total++;
            classBreakdown[classKey].totalScore += sub.totalScore || 0;
            const b = sub.assignedBucket || 'Unknown';
            classBreakdown[classKey].buckets[b] = (classBreakdown[classKey].buckets[b] || 0) + 1;
        });

        Object.keys(classBreakdown).forEach(cls => {
            classBreakdown[cls].avgScore = classBreakdown[cls].total > 0
                ? Math.round(classBreakdown[cls].totalScore / classBreakdown[cls].total * 10) / 10
                : 0;
        });

        res.json({
            ...analytics,
            schoolBreakdown,
            classBreakdown,
            recentSubmissions: filteredSubmissions.slice(0, 20),
            filters: {
                schoolId: schoolId || null,
                className: className || null,
                bucket: bucket || null
            }
        });
    } catch (error) {
        console.error('Analytics error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/admin/export
// @desc    Export data to Excel
// @access  Admin
router.get('/export', protect, isAdmin, async (req, res) => {
    try {
        const { schoolId, startDate, endDate, bucket } = req.query;

        let baseQuery = db('submissions as sub')
            .leftJoin('students as stu', 'sub.student_id', 'stu.id')
            .leftJoin('schools as sch', 'sub.school_id', 'sch.id');

        if (schoolId) baseQuery = baseQuery.where('sub.school_id', schoolId);
        if (startDate) baseQuery = baseQuery.where('sub.submitted_at', '>=', new Date(startDate));
        if (endDate) baseQuery = baseQuery.where('sub.submitted_at', '<=', new Date(endDate));
        if (bucket) baseQuery = baseQuery.where('sub.assigned_bucket', bucket);

        const rawRows = await baseQuery.select(
            'sub.*',
            'stu.name as student_name', 'stu.access_id as student_access_id',
            'stu.class as student_class', 'stu.section as student_section',
            'stu.roll_no as student_roll_no',
            'sch.name as school_name', 'sch.school_id as school_code'
        ).orderBy('sub.submitted_at', 'desc');

        const submissions = rawRows.map(r => ({
            _id: r.id,
            totalScore: r.total_score,
            sectionScores: r.section_scores,
            sectionBuckets: r.section_buckets,
            assignedBucket: r.assigned_bucket,
            submittedAt: r.submitted_at,
            status: r.status,
            timeTaken: r.time_taken,
            answers: r.answers,
            studentId: r.student_id ? {
                _id: r.student_id,
                name: r.student_name,
                accessId: r.student_access_id,
                class: r.student_class,
                section: r.student_section,
                rollNo: r.student_roll_no
            } : null,
            schoolId: r.school_id ? {
                _id: r.school_id,
                name: r.school_name,
                schoolId: r.school_code
            } : null
        }));

        const workbook = await exportSubmissionsToExcel(submissions);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=jaagrmind-export.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/admin/schools/:id/assign-test
// @desc    Assign test to school
// @access  Admin
router.post('/schools/:id/assign-test', protect, isAdmin, async (req, res) => {
    try {
        const { assessmentId } = req.body;

        const school = await db('schools').where('id', req.params.id).first();
        if (!school) {
            return res.status(404).json({ message: 'School not found' });
        }

        const currentTests = school.assigned_tests || [];
        if (!currentTests.includes(assessmentId)) {
            await db('schools').where('id', school.id).update({
                assigned_tests: db.raw('array_append(assigned_tests, ?::uuid)', [assessmentId])
            });
        }

        res.json({ message: 'Test assigned successfully' });
    } catch (error) {
        console.error('Assign test error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/admin/schools/:id/tests
// @desc    Update all assigned tests for a school (bulk assignment)
// @access  Admin
router.put('/schools/:id/tests', protect, isAdmin, async (req, res) => {
    try {
        const { assignedTests, assignAll } = req.body;

        const school = await db('schools').where('id', req.params.id).first();
        if (!school) {
            return res.status(404).json({ message: 'School not found' });
        }

        let newTests;
        if (assignAll) {
            const allAssessments = await db('assessments').where({ is_active: true }).select('id');
            newTests = allAssessments.map(a => a.id);
        } else if (assignedTests) {
            const validAssessments = await db('assessments')
                .whereIn('id', assignedTests)
                .where({ is_active: true })
                .select('id');
            newTests = validAssessments.map(a => a.id);
        }

        if (newTests) {
            await db('schools').where('id', req.params.id).update({ assigned_tests: newTests });
        }

        const updatedSchool = await db('schools').where('id', req.params.id).first();
        const testIds = updatedSchool.assigned_tests || [];
        let assessmentList = [];
        if (testIds.length > 0) {
            const assessments = await db('assessments').whereIn('id', testIds).select('id', 'title', 'is_default');
            assessmentList = assessments.map(a => ({ _id: a.id, title: a.title, isDefault: a.is_default }));
        }

        res.json({
            message: 'Tests updated successfully',
            assignedTests: assessmentList
        });
    } catch (error) {
        console.error('Update tests error:', error);
        if (error.code === '22P02') {
            return res.status(400).json({ message: 'Invalid assessment ID format' });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/admin/schools/:id/tests/:testId
// @desc    Remove a test from school
// @access  Admin
router.delete('/schools/:id/tests/:testId', protect, isAdmin, async (req, res) => {
    try {
        const school = await db('schools').where('id', req.params.id).first();
        if (!school) {
            return res.status(404).json({ message: 'School not found' });
        }

        await db('schools').where('id', req.params.id).update({
            assigned_tests: db.raw('array_remove(assigned_tests, ?::uuid)', [req.params.testId])
        });

        res.json({ message: 'Test removed from school' });
    } catch (error) {
        console.error('Remove test error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/admin/assessments/:id/set-default
// @desc    Set an assessment as the default
// @access  Admin
router.put('/assessments/:id/set-default', protect, isAdmin, async (req, res) => {
    try {
        const assessment = await db('assessments').where('id', req.params.id).first();
        if (!assessment) {
            return res.status(404).json({ message: 'Assessment not found' });
        }

        if (!assessment.is_active) {
            return res.status(400).json({ message: 'Cannot set inactive assessment as default' });
        }

        // Unset current default
        await db('assessments').where({ is_default: true }).update({ is_default: false });

        // Set new default
        await db('assessments').where('id', req.params.id).update({ is_default: true });

        // Add this assessment to all active schools that don't already have it
        await db('schools')
            .where('is_active', true)
            .whereRaw('NOT (assigned_tests @> ARRAY[?]::uuid[])', [req.params.id])
            .update({
                assigned_tests: db.raw('array_append(assigned_tests, ?::uuid)', [req.params.id])
            });

        res.json({
            message: 'Assessment set as default',
            assessment: {
                _id: assessment.id,
                title: assessment.title,
                isDefault: true
            }
        });
    } catch (error) {
        console.error('Set default error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/admin/schools/:id/credentials
// @desc    Update school ID and/or password
// @access  Admin
router.put('/schools/:id/credentials', protect, isAdmin, async (req, res) => {
    try {
        const { schoolId, password } = req.body;
        const school = await db('schools').where('id', req.params.id).first();

        if (!school) {
            return res.status(404).json({ message: 'School not found' });
        }

        const updates = {};

        if (schoolId && schoolId !== school.school_id) {
            const existing = await db('schools').where({ school_id: schoolId }).first();
            if (existing) {
                return res.status(400).json({ message: 'School ID already in use' });
            }
            updates.school_id = schoolId;
        }

        if (password) {
            updates.password = await hashPassword(password);
            updates.plain_password = password;
        }

        if (Object.keys(updates).length > 0) {
            await db('schools').where('id', school.id).update(updates);
        }

        const updated = await db('schools').where('id', school.id).first();

        res.json({
            message: 'Credentials updated',
            schoolId: updated.school_id,
            plainPassword: updated.plain_password
        });
    } catch (error) {
        console.error('Update credentials error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/admin/schools/:id/block
// @desc    Block or unblock a school
// @access  Admin
router.put('/schools/:id/block', protect, isAdmin, async (req, res) => {
    try {
        const { isBlocked } = req.body;
        const school = await db('schools').where('id', req.params.id).first();

        if (!school) {
            return res.status(404).json({ message: 'School not found' });
        }

        await db('schools').where('id', school.id).update({ is_blocked: isBlocked });

        res.json({
            message: isBlocked ? 'School blocked' : 'School unblocked',
            isBlocked
        });
    } catch (error) {
        console.error('Block school error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/admin/student/:id/details
// @desc    Get detailed student info with all submissions and answers
// @access  Admin
router.get('/student/:id/details', protect, isAdmin, async (req, res) => {
    try {
        const studentRow = await db('students as stu')
            .leftJoin('schools as sch', 'stu.school_id', 'sch.id')
            .where('stu.id', req.params.id)
            .select(
                'stu.*',
                'sch.name as school_name', 'sch.school_id as school_code'
            )
            .first();

        if (!studentRow) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const getSectionName = (code) => {
            const sections = {
                'A': 'Focus & Attention',
                'B': 'Self-Esteem & Inner Confidence',
                'C': 'Social Confidence & Interaction',
                'D': 'Digital Hygiene & Self-Control'
            };
            return sections[code] || code;
        };

        const submissionRows = await db('submissions as sub')
            .leftJoin('assessments as a', 'sub.assessment_id', 'a.id')
            .where('sub.student_id', studentRow.id)
            .select(
                'sub.*',
                'a.title as assessment_title', 'a.questions as assessment_questions',
                'a.custom_sections as assessment_custom_sections'
            )
            .orderBy('sub.submitted_at', 'desc');

        const detailedSubmissions = submissionRows.map(sub => {
            const questions = sub.assessment_questions || [];

            const answersWithQuestions = (sub.answers || []).map((answer, index) => {
                const question = questions[answer?.questionIndex ?? index];
                return {
                    questionIndex: (answer?.questionIndex ?? index) + 1,
                    questionText: question?.text || `Question ${index + 1}`,
                    section: question?.section || 'Unknown',
                    sectionName: getSectionName(question?.section),
                    selectedOption: answer?.selectedOption ?? null,
                    options: question?.options || [],
                    score: answer?.marks ?? 0,
                    isReverseScored: question?.isReverseScored || false
                };
            });

            const answersBySection = {};
            answersWithQuestions.forEach(a => {
                if (!answersBySection[a.section]) {
                    answersBySection[a.section] = {
                        sectionName: a.sectionName,
                        answers: [],
                        totalScore: 0
                    };
                }
                answersBySection[a.section].answers.push(a);
                answersBySection[a.section].totalScore += a.score;
            });

            return {
                _id: sub.id,
                assessmentId: sub.assessment_id,
                assessmentTitle: sub.assessment_title || 'Unknown Assessment',
                totalScore: sub.total_score,
                sectionScores: sub.section_scores,
                sectionBuckets: sub.section_buckets,
                assignedBucket: sub.assigned_bucket,
                primarySkillArea: sub.primary_skill_area,
                secondarySkillArea: sub.secondary_skill_area,
                timeTaken: sub.time_taken,
                totalInactivityTime: sub.total_inactivity_time,
                moodCheck: sub.mood_check,
                status: sub.status,
                submittedAt: sub.submitted_at,
                answersWithQuestions,
                answersBySection
            };
        });

        res.json({
            student: {
                _id: studentRow.id,
                name: studentRow.name,
                accessId: studentRow.access_id,
                class: studentRow.class,
                section: studentRow.section,
                rollNo: studentRow.roll_no,
                school: studentRow.school_id ? {
                    _id: studentRow.school_id,
                    name: studentRow.school_name,
                    schoolId: studentRow.school_code
                } : null,
                createdAt: studentRow.created_at
            },
            submissions: detailedSubmissions,
            totalSubmissions: detailedSubmissions.length
        });
    } catch (error) {
        console.error('Admin student details error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
