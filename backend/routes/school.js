const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { mapRow, mapRows } = require('../utils/dbHelper');
const SchoolCredentials = require('../models/SchoolCredentials');
const { protect, isSchoolAdmin, generateToken } = require('../middleware/auth');
const { generateAccessId, generateBulkAccessIds, generateSchoolId, generateSchoolPassword } = require('../utils/idGenerator');
const { exportAccessIdsToExcel, calculateAnalytics, getSectionName } = require('../utils/exportData');
const { sendPasswordChangedEmail } = require('../utils/emailService');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /xlsx|xls|csv/;
        const extname = allowedTypes.test(file.originalname.toLowerCase());
        if (extname) {
            return cb(null, true);
        }
        cb(new Error('Only Excel/CSV files are allowed'));
    }
});

// @route   POST /api/school/login
// @desc    School admin login
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { schoolId, password } = req.body;

        const schoolRow = await db('schools')
            .where({ school_id: schoolId.toUpperCase(), is_active: true })
            .first();

        if (!schoolRow) {
            return res.status(401).json({ message: 'Invalid school ID or password' });
        }

        const school = mapRow(schoolRow);

        if (school.isBlocked) {
            return res.status(403).json({ message: 'This school account has been blocked. Please contact administrator.' });
        }

        const isMatch = await bcrypt.compare(password, school.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid school ID or password' });
        }

        let parent = null;
        if (school.parentId) {
            const parentRow = await db('schools')
                .where('id', school.parentId)
                .select('id', 'name', 'school_id')
                .first();
            parent = parentRow ? mapRow(parentRow) : null;
        }

        res.json({
            _id: school._id,
            schoolId: school.schoolId,
            email: school.email,
            name: school.name,
            logo: school.logo,
            type: school.type,
            parentId: parent,
            address: school.address,
            isDataVisibleToSchool: school.isDataVisibleToSchool,
            mustChangePassword: school.mustChangePassword || false,
            role: 'school',
            token: generateToken(school._id, 'school')
        });
    } catch (error) {
        console.error('School login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/school/change-password
// @desc    Change school password (mandatory on first login)
// @access  School Admin
router.put('/change-password', protect, isSchoolAdmin, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ message: 'New password must be at least 6 characters' });
        }

        const schoolRow = await db('schools').where('id', req.school._id).first();
        if (!schoolRow) {
            return res.status(404).json({ message: 'School not found' });
        }
        const school = mapRow(schoolRow);

        if (!school.mustChangePassword) {
            const isMatch = await bcrypt.compare(currentPassword, school.password);
            if (!isMatch) {
                return res.status(401).json({ message: 'Current password is incorrect' });
            }
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db('schools').where('id', school._id).update({
            password: hashedPassword,
            plain_password: newPassword,
            must_change_password: false
        });

        await SchoolCredentials.updatePassword(school._id, newPassword);

        if (school.email) {
            await sendPasswordChangedEmail(school.email, school.name);
        }

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/school/profile
// @desc    Update school profile
// @access  School Admin
router.put('/profile', protect, isSchoolAdmin, async (req, res) => {
    try {
        const { name, email, phone, address, city, state, pincode } = req.body;

        const schoolRow = await db('schools').where('id', req.school._id).first();
        if (!schoolRow) {
            return res.status(404).json({ message: 'School not found' });
        }
        const school = mapRow(schoolRow);

        const updateData = {};
        const contact = { ...(school.contact || {}) };

        if (name) updateData.name = name;
        if (phone) contact.phone = phone;

        if (email && email.toLowerCase() !== school.email) {
            const emailExists = await db('schools')
                .where('email', email.toLowerCase())
                .whereNot('id', school._id)
                .first();
            if (emailExists) {
                return res.status(400).json({ message: 'Email already in use' });
            }
            updateData.email = email.toLowerCase();
            contact.email = email.toLowerCase();

            await db('school_credentials')
                .where('school_id', school._id)
                .update({ email: email.toLowerCase() });
        }

        updateData.contact = JSON.stringify(contact);

        if (address !== undefined || city !== undefined || state !== undefined || pincode !== undefined) {
            const addr = {
                street: address !== undefined ? address : (school.address?.street || ''),
                city: city !== undefined ? city : (school.address?.city || ''),
                state: state !== undefined ? state : (school.address?.state || ''),
                pincode: pincode !== undefined ? pincode : (school.address?.pincode || ''),
                full: `${address || school.address?.street || ''}${(city || school.address?.city) ? ', ' + (city || school.address?.city) : ''}${(state || school.address?.state) ? ', ' + (state || school.address?.state) : ''}`
            };
            updateData.address = JSON.stringify(addr);
        }

        const [updatedRow] = await db('schools')
            .where('id', school._id)
            .update(updateData)
            .returning('*');
        const updated = mapRow(updatedRow);

        res.json({
            message: 'Profile updated successfully',
            school: {
                name: updated.name,
                email: updated.email,
                contact: updated.contact,
                address: updated.address
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/school/branches
// @desc    Get all sub-schools (branches)
// @access  School Admin (Super School only)
router.get('/branches', protect, isSchoolAdmin, async (req, res) => {
    try {
        const branchRows = await db('schools')
            .where({ parent_id: req.school._id, is_active: true })
            .orderBy('created_at', 'desc');

        const branches = mapRows(branchRows).map(b => {
            const { password, plainPassword, ...rest } = b;
            return rest;
        });

        const branchesWithStats = await Promise.all(branches.map(async (branch) => {
            const studentResult = await db('students')
                .where({ school_id: branch._id, is_active: true })
                .count('* as count')
                .first();
            const submissionResult = await db('submissions')
                .where({ school_id: branch._id })
                .count('* as count')
                .first();
            return {
                ...branch,
                stats: {
                    studentCount: parseInt(studentResult.count),
                    submissionCount: parseInt(submissionResult.count)
                }
            };
        }));

        res.json(branchesWithStats);
    } catch (error) {
        console.error('Get branches error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/school/branches
// @desc    Create a new sub-school (branch)
// @access  School Admin (Super School only)
router.post('/branches', protect, isSchoolAdmin, upload.single('logo'), async (req, res) => {
    try {
        const { name, address, city, state, pincode, phone, email, isDataVisibleToSchool, sendEmail } = req.body;

        const currentSchoolRow = await db('schools').where('id', req.school._id).first();
        const currentSchool = mapRow(currentSchoolRow);
        if (currentSchool.type === 'sub') {
            return res.status(403).json({ message: 'Sub-schools cannot create branches' });
        }

        if (!email) {
            return res.status(400).json({ message: 'Email is required for branch registration' });
        }

        const existingSchoolRow = await db('schools')
            .where('email', email.toLowerCase())
            .first();
        if (existingSchoolRow) {
            const existingSchool = mapRow(existingSchoolRow);
            if (existingSchool.isActive === false) {
                await db('school_credentials').where('school_id', existingSchool._id).del();
                await db('schools').where('id', existingSchool._id).del();
            } else {
                return res.status(400).json({ message: 'A school/branch with this email already exists' });
            }
        }

        const newSchoolId = await generateSchoolId();
        const plainPassword = generateSchoolPassword();
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        const logo = req.file ? req.file.location : currentSchool.logo;

        const addressObj = {
            street: address || '',
            city: city || '',
            state: state || '',
            pincode: pincode || '',
            full: address ? `${address}${city ? ', ' + city : ''}${state ? ', ' + state : ''}${pincode ? ' - ' + pincode : ''}` : ''
        };

        const [branchRow] = await db('schools').insert({
            school_id: newSchoolId,
            name,
            email: email.toLowerCase(),
            address: JSON.stringify(addressObj),
            type: 'sub',
            parent_id: currentSchool._id,
            contact: JSON.stringify({ phone, email }),
            password: hashedPassword,
            plain_password: plainPassword,
            must_change_password: true,
            is_data_visible_to_school: isDataVisibleToSchool === 'true' || isDataVisibleToSchool === true,
            logo,
            assigned_tests: currentSchool.assignedTests || []
        }).returning('*');
        const branch = mapRow(branchRow);

        await db('school_credentials').insert({
            school_id: branch._id,
            email: email.toLowerCase(),
            school_name: name,
            plain_password: plainPassword,
            password_history: JSON.stringify([]),
            created_at: new Date(),
            last_updated_at: new Date()
        });

        const { sendSchoolCredentialsEmail } = require('../utils/emailService');
        let emailSent = false;
        if (sendEmail === 'true' || sendEmail === true) {
            const frontendUrl = process.env.FRONTEND_URL?.split(',')[0] || 'http://localhost:5173';
            emailSent = await sendSchoolCredentialsEmail(
                email.toLowerCase(),
                name,
                plainPassword,
                `${frontendUrl}/login`
            );
            if (emailSent) {
                await db('schools').where('id', branch._id).update({
                    credentials_email_sent: true,
                    last_credentials_email_sent_at: new Date()
                });
            }
        }

        res.status(201).json({
            _id: branch._id,
            schoolId: branch.schoolId,
            email: branch.email,
            name: branch.name,
            type: branch.type,
            parentId: branch.parentId,
            message: 'Branch created successfully'
        });

    } catch (error) {
        console.error('Create branch error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/school/branches/:id
// @desc    Update branch details
// @access  School Admin (Super School only)
router.put('/branches/:id', protect, isSchoolAdmin, async (req, res) => {
    try {
        const { name, address, city, state, pincode, phone, email, isDataVisibleToSchool, password } = req.body;

        const branchRow = await db('schools')
            .where({ id: req.params.id, parent_id: req.school._id })
            .first();

        if (!branchRow) {
            return res.status(404).json({ message: 'Branch not found' });
        }
        const branch = mapRow(branchRow);

        const updateData = {};
        const contact = { ...(branch.contact || {}) };

        if (name) updateData.name = name;
        if (phone) contact.phone = phone;
        if (email) {
            updateData.email = email.toLowerCase();
            contact.email = email.toLowerCase();
        }
        updateData.contact = JSON.stringify(contact);

        if (isDataVisibleToSchool !== undefined) {
            updateData.is_data_visible_to_school = isDataVisibleToSchool === 'true' || isDataVisibleToSchool === true;
        }

        if (address || city || state || pincode) {
            const addr = {
                street: address || branch.address?.street || '',
                city: city || branch.address?.city || '',
                state: state || branch.address?.state || '',
                pincode: pincode || branch.address?.pincode || '',
                full: `${address || branch.address?.street || ''}${(city || branch.address?.city) ? ', ' + (city || branch.address?.city) : ''}${(state || branch.address?.state) ? ', ' + (state || branch.address?.state) : ''}`
            };
            updateData.address = JSON.stringify(addr);
        }

        if (password && password.trim().length > 0) {
            updateData.password = await bcrypt.hash(password, 10);
            updateData.plain_password = password;
            updateData.must_change_password = true;

            await db('school_credentials')
                .where('school_id', branch._id)
                .update({ plain_password: password });
        }

        const [updatedRow] = await db('schools')
            .where('id', req.params.id)
            .update(updateData)
            .returning('*');
        const updatedBranch = mapRow(updatedRow);

        res.json({
            message: 'Branch updated successfully',
            branch: {
                _id: updatedBranch._id,
                name: updatedBranch.name,
                email: updatedBranch.email,
                address: updatedBranch.address
            }
        });
    } catch (error) {
        console.error('Update branch error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/school/branches/:id
// @desc    Delete a branch
// @access  School Admin (Super School only)
router.delete('/branches/:id', protect, isSchoolAdmin, async (req, res) => {
    try {
        const branchRow = await db('schools')
            .where({ id: req.params.id, parent_id: req.school._id })
            .first();

        if (!branchRow) {
            return res.status(404).json({ message: 'Branch not found' });
        }

        await db('schools').where('id', req.params.id).del();
        await db('school_credentials').where('school_id', req.params.id).del();

        res.json({ message: 'Branch deleted successfully' });
    } catch (error) {
        console.error('Delete branch error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/school/dashboard
// @desc    Get school dashboard overview
// @access  School Admin
router.get('/dashboard', protect, isSchoolAdmin, async (req, res) => {
    try {
        const schoolId = req.school._id;
        let allSchoolIds;

        if (req.school.type === 'super') {
            const branchIds = await db('schools')
                .where('parent_id', req.school._id)
                .pluck('id');
            allSchoolIds = [req.school._id, ...branchIds];
        } else {
            allSchoolIds = [req.school._id];
        }

        const [studentResult, completedStudentRows] = await Promise.all([
            db('students')
                .whereIn('school_id', allSchoolIds)
                .where('is_active', true)
                .count('* as count')
                .first(),
            db('submissions')
                .whereIn('school_id', allSchoolIds)
                .where('status', 'complete')
                .distinct('student_id')
        ]);

        const studentCount = parseInt(studentResult.count);
        const completedCount = completedStudentRows.length;

        const classStatsRows = await db('students')
            .whereIn('school_id', allSchoolIds)
            .where('is_active', true)
            .select('class', 'section')
            .count('* as count')
            .groupBy('class', 'section')
            .orderBy([{ column: 'class', order: 'asc' }, { column: 'section', order: 'asc' }]);

        const classStats = classStatsRows.map(r => ({
            _id: { class: r.class, section: r.section },
            count: parseInt(r.count)
        }));

        const schoolRow = await db('schools').where('id', schoolId).first();
        const school = mapRow(schoolRow);

        const assignedTests = (school.assignedTests && school.assignedTests.length > 0)
            ? mapRows(await db('assessments')
                .whereIn('id', school.assignedTests)
                .select('id', 'title', 'is_default', 'questions'))
            : [];
        assignedTests.forEach(t => {
            t.questionCount = Array.isArray(t.questions) ? t.questions.length : 0;
            delete t.questions;
        });

        let parent = null;
        if (school.parentId) {
            const parentRow = await db('schools')
                .where('id', school.parentId)
                .select('id', 'name', 'school_id')
                .first();
            parent = parentRow ? mapRow(parentRow) : null;
        }

        const pendingTests = Math.max(0, studentCount - completedCount);

        res.json({
            school: {
                name: school.name,
                logo: school.logo,
                schoolId: school.schoolId,
                type: school.type,
                parentId: parent,
                address: school.address
            },
            stats: {
                totalStudents: studentCount,
                completedTests: completedCount,
                pendingTests: pendingTests
            },
            classStats,
            assignedTests
        });
    } catch (error) {
        console.error('School dashboard error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/school/students
// @desc    Get all students with filters (with pagination)
// @access  School Admin
router.get('/students', protect, isSchoolAdmin, async (req, res) => {
    try {
        const { class: className, section, status, page: pageParam, limit: limitParam, schoolId: schoolIdParam } = req.query;
        const page = parseInt(pageParam) || 1;
        const limit = parseInt(limitParam) || 20;
        const skip = (page - 1) * limit;

        const buildQuery = () => {
            let q = db('students').where('is_active', true);

            if (schoolIdParam) {
                q = q.where('school_id', schoolIdParam);
            } else if (req.school.type === 'super') {
                q = q.where(function () {
                    this.where('school_id', req.school._id)
                        .orWhere('parent_id', req.school._id);
                });
            } else {
                q = q.where('school_id', req.school._id);
            }

            if (className) q = q.where('class', className);
            if (section) q = q.where('section', section);
            return q;
        };

        if (schoolIdParam) {
            const targetSchoolRow = await db('schools').where('id', schoolIdParam).first();
            const targetSchool = targetSchoolRow ? mapRow(targetSchoolRow) : null;
            const isSelf = schoolIdParam === req.school._id;
            const isChild = targetSchool && targetSchool.parentId === req.school._id;
            if (!isSelf && !isChild) {
                return res.status(403).json({ message: 'Unauthorized' });
            }
        }

        const totalResult = await buildQuery().count('* as count').first();
        const total = parseInt(totalResult.count);

        const studentRows = await buildQuery()
            .orderBy([
                { column: 'class', order: 'asc' },
                { column: 'section', order: 'asc' },
                { column: 'roll_no', order: 'asc' },
                { column: 'name', order: 'asc' }
            ])
            .offset(skip)
            .limit(limit);
        let students = mapRows(studentRows);

        // Batch populate school names
        const schoolIds = [...new Set(students.map(s => s.schoolId).filter(Boolean))];
        if (schoolIds.length > 0) {
            const schoolRows = await db('schools').whereIn('id', schoolIds).select('id', 'name');
            const schoolMap = Object.fromEntries(mapRows(schoolRows).map(s => [s._id, s]));
            students.forEach(s => {
                s.schoolId = schoolMap[s.schoolId] || s.schoolId;
            });
        }

        // Batch populate assessment titles in testStatus
        const allAssessmentIds = [...new Set(
            students.flatMap(s => (s.testStatus || []).map(t => t.assessmentId).filter(Boolean))
        )];
        if (allAssessmentIds.length > 0) {
            const assessmentRows = await db('assessments').whereIn('id', allAssessmentIds).select('id', 'title');
            const assessmentMap = Object.fromEntries(mapRows(assessmentRows).map(a => [a._id, a]));
            students.forEach(s => {
                (s.testStatus || []).forEach(ts => {
                    if (ts.assessmentId && assessmentMap[ts.assessmentId]) {
                        ts.assessmentId = assessmentMap[ts.assessmentId];
                    }
                });
            });
        }

        if (status === 'completed') {
            students = students.filter(s =>
                (s.testStatus || []).some(t => t.isCompleted)
            );
        } else if (status === 'pending') {
            students = students.filter(s =>
                !(s.testStatus || []).some(t => t.isCompleted)
            );
        }

        res.json({
            data: students,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get students error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/school/students
// @desc    Add single student
// @access  School Admin
router.post('/students', protect, isSchoolAdmin, async (req, res) => {
    try {
        const { name, rollNo, class: className, section } = req.body;

        const existingStudent = await db('students')
            .where({
                school_id: req.school._id,
                is_active: true,
                class: className,
                section: section || '',
                roll_no: rollNo || ''
            })
            .whereRaw('LOWER(name) = LOWER(?)', [name.trim()])
            .first();

        if (existingStudent) {
            return res.status(400).json({
                message: 'A student with the same name, roll number, class and section already exists'
            });
        }

        const accessId = generateAccessId(req.school.name);

        const schoolRow = await db('schools').where('id', req.school._id).first();
        const school = mapRow(schoolRow);
        const assignedTestIds = school.assignedTests || [];
        let defaultTest = null;
        if (assignedTestIds.length > 0) {
            const assessmentRows = await db('assessments')
                .whereIn('id', assignedTestIds)
                .select('id', 'is_default');
            const assessments = mapRows(assessmentRows);
            defaultTest = assessments.find(t => t.isDefault) || assessments[0];
        }

        const [studentRow] = await db('students').insert({
            access_id: accessId,
            name: name.trim(),
            roll_no: rollNo?.trim() || '',
            class: className,
            section: section?.trim() || '',
            school_id: req.school._id,
            parent_id: req.school.type === 'sub' ? req.school.parentId : null,
            test_status: JSON.stringify(defaultTest ? [{
                assessmentId: defaultTest._id,
                isCompleted: false
            }] : [])
        }).returning('*');

        res.status(201).json(mapRow(studentRow));
    } catch (error) {
        console.error('Create student error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/school/students/import
// @desc    Bulk import students from Excel
// @access  School Admin
router.post('/students/import', protect, isSchoolAdmin, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Please upload a file' });
        }

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);

        if (data.length === 0) {
            return res.status(400).json({ message: 'No data found in file' });
        }

        const schoolRow = await db('schools').where('id', req.school._id).first();
        const school = mapRow(schoolRow);
        const assignedTestIds = school.assignedTests || [];
        let defaultTest = null;
        if (assignedTestIds.length > 0) {
            const assessmentRows = await db('assessments')
                .whereIn('id', assignedTestIds)
                .select('id', 'is_default');
            const assessments = mapRows(assessmentRows);
            defaultTest = assessments.find(t => t.isDefault) || assessments[0];
        }

        const existingStudentRows = await db('students')
            .where({ school_id: req.school._id, is_active: true })
            .select('name', 'roll_no', 'class', 'section');

        const existingSet = new Set(
            existingStudentRows.map(s =>
                `${s.name.toLowerCase().trim()}|${(s.roll_no || '').trim()}|${(s.class || '').trim()}|${(s.section || '').trim()}`
            )
        );

        const students = [];
        const errors = [];
        const duplicates = [];

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const name = row.Name || row.name || row.NAME || row['Student Name'];
            const rollNo = row.RollNo || row.rollNo || row['Roll No'] || row['roll_no'] || '';
            const className = row.Class || row.class || row.CLASS || '';
            const section = row.Section || row.section || row.SECTION || '';

            if (!name || !className) {
                errors.push({ row: i + 2, error: 'Name and Class are required' });
                continue;
            }

            const key = `${name.toString().toLowerCase().trim()}|${rollNo.toString().trim()}|${className.toString().trim()}|${section.toString().trim()}`;
            if (existingSet.has(key)) {
                duplicates.push({ row: i + 2, name: name.toString().trim() });
                continue;
            }
            existingSet.add(key);

            students.push({
                name: name.toString().trim(),
                rollNo: rollNo.toString().trim(),
                class: className.toString().trim(),
                section: section.toString().trim(),
                schoolId: req.school._id,
                parentId: req.school.type === 'sub' ? req.school.parentId : null,
                testStatus: defaultTest ? [{
                    assessmentId: defaultTest._id,
                    isCompleted: false
                }] : []
            });
        }

        if (students.length > 0) {
            const accessIds = await generateBulkAccessIds(school.name, students.length);

            const insertData = students.map((s, i) => ({
                access_id: accessIds[i],
                name: s.name,
                roll_no: s.rollNo,
                class: s.class,
                section: s.section,
                school_id: s.schoolId,
                parent_id: s.parentId,
                test_status: JSON.stringify(s.testStatus)
            }));

            const created = await db('students').insert(insertData).returning('*');

            res.status(201).json({
                message: `${created.length} students imported successfully`,
                imported: created.length,
                duplicates: duplicates.length > 0 ? duplicates : undefined,
                errors: errors.length > 0 ? errors : undefined
            });
        } else {
            res.status(400).json({
                message: 'No valid students to import',
                duplicates: duplicates.length > 0 ? duplicates : undefined,
                errors: errors.length > 0 ? errors : undefined
            });
        }
    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ message: 'Error importing students' });
    }
});

// @route   PUT /api/school/students/promote-class
// @desc    Increment class for all (or filtered) students by 1
// @access  School Admin
router.put('/students/promote-class', protect, isSchoolAdmin, async (req, res) => {
    try {
        const { filterClass, filterSection, studentIds } = req.body;

        let query = db('students').where('is_active', true);

        if (req.school.type === 'super') {
            const branchIds = await db('schools').where('parent_id', req.school._id).pluck('id');
            query = query.whereIn('school_id', [req.school._id, ...branchIds]);
        } else {
            query = query.where('school_id', req.school._id);
        }

        if (studentIds && studentIds.length > 0) {
            query = query.whereIn('id', studentIds);
        } else {
            if (filterClass) query = query.where('class', filterClass);
            if (filterSection) query = query.where('section', filterSection);
        }

        const students = mapRows(await query);

        let updatedCount = 0;
        let skippedCount = 0;
        for (const student of students) {
            const currentClass = parseInt(student.class);
            if (!isNaN(currentClass) && currentClass < 12) {
                await db('students').where('id', student._id).update({ class: (currentClass + 1).toString() });
                updatedCount++;
            } else if (currentClass >= 12) {
                skippedCount++;
            }
        }

        let message = `Class updated for ${updatedCount} students`;
        if (skippedCount > 0) message += ` (${skippedCount} already in class 12, skipped)`;

        res.json({ message, updatedCount, skippedCount });
    } catch (error) {
        console.error('Promote class error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/school/students/:id
// @desc    Update student
// @access  School Admin
router.put('/students/:id', protect, isSchoolAdmin, async (req, res) => {
    try {
        const { name, rollNo, class: className, section } = req.body;

        const studentRow = await db('students')
            .where({ id: req.params.id, school_id: req.school._id })
            .first();

        if (!studentRow) {
            return res.status(404).json({ message: 'Student not found' });
        }
        const student = mapRow(studentRow);

        const updateData = {};
        if (name) updateData.name = name;
        if (rollNo) updateData.roll_no = rollNo;
        if (className) updateData.class = className;
        if (section) updateData.section = section;

        const [updatedRow] = await db('students')
            .where('id', req.params.id)
            .update(updateData)
            .returning('*');

        res.json(mapRow(updatedRow));
    } catch (error) {
        console.error('Update student error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/school/students/:id
// @desc    Archive and Hard delete student
// @access  School Admin
router.delete('/students/:id', protect, isSchoolAdmin, async (req, res) => {
    try {
        await db.transaction(async (trx) => {
            const studentRow = await trx('students')
                .where({ id: req.params.id, school_id: req.school._id })
                .first();

            if (!studentRow) {
                const err = new Error('Student not found');
                err.statusCode = 404;
                throw err;
            }
            const student = mapRow(studentRow);

            const submissionRows = await trx('submissions').where('student_id', student._id);
            const submissions = mapRows(submissionRows);

            // Fetch assessment titles for archival
            const assessmentIds = [...new Set(submissions.map(s => s.assessmentId).filter(Boolean))];
            let assessmentMap = {};
            if (assessmentIds.length > 0) {
                const assessmentRows = await trx('assessments')
                    .whereIn('id', assessmentIds)
                    .select('id', 'title');
                assessmentMap = Object.fromEntries(mapRows(assessmentRows).map(a => [a._id, a]));
            }

            await trx('archived_data').insert({
                type: 'student',
                archived_by: 'school',
                reason: 'manual_deletion',
                student_data: JSON.stringify({
                    _id: student._id,
                    accessId: student.accessId,
                    name: student.name,
                    rollNo: student.rollNo,
                    class: student.class,
                    section: student.section,
                    schoolId: student.schoolId,
                    schoolName: req.school.name,
                    testStatus: student.testStatus,
                    createdAt: student.createdAt
                }),
                student_submissions: JSON.stringify(submissions.map(sub => ({
                    assessmentId: sub.assessmentId,
                    assessmentTitle: assessmentMap[sub.assessmentId]?.title || 'Unknown Assessment',
                    totalScore: sub.totalScore,
                    sectionScores: sub.sectionScores,
                    assignedBucket: sub.assignedBucket,
                    submittedAt: sub.submittedAt,
                    answers: sub.answers
                }))),
                stats: JSON.stringify({
                    submissionCount: submissions.length
                })
            });

            await trx('submissions').where('student_id', student._id).del();
            await trx('students').where('id', req.params.id).del();
        });

        res.json({ message: 'Student archived and permanently deleted successfully' });
    } catch (error) {
        if (error.statusCode === 404) {
            return res.status(404).json({ message: error.message });
        }
        console.error('Delete student error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/school/students/:id/reset
// @desc    Reset student test
// @access  School Admin
router.put('/students/:id/reset', protect, isSchoolAdmin, async (req, res) => {
    try {
        const { assessmentId } = req.body;

        const studentRow = await db('students')
            .where({ id: req.params.id, school_id: req.school._id })
            .first();

        if (!studentRow) {
            return res.status(404).json({ message: 'Student not found' });
        }
        const student = mapRow(studentRow);

        const testStatus = student.testStatus || [];
        const testIndex = testStatus.findIndex(t => t.assessmentId === assessmentId);

        if (testIndex >= 0) {
            testStatus[testIndex].isCompleted = false;
            testStatus[testIndex].score = 0;
            testStatus[testIndex].sectionScores = { A: 0, B: 0, C: 0, D: 0 };
            testStatus[testIndex].sectionBuckets = { A: '', B: '', C: '', D: '' };
            testStatus[testIndex].bucket = '';
            testStatus[testIndex].completedAt = null;
        }

        await db('students').where('id', student._id).update({
            test_status: JSON.stringify(testStatus)
        });

        await db('submissions')
            .where({ student_id: student._id, assessment_id: assessmentId })
            .del();

        res.json({ message: 'Test reset successfully' });
    } catch (error) {
        console.error('Reset test error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});



// @route   POST /api/school/students/bulk-delete
// @desc    Delete multiple students at once (with archival)
// @access  School Admin
router.post('/students/bulk-delete', protect, isSchoolAdmin, async (req, res) => {
    try {
        const { studentIds } = req.body;

        if (!studentIds || studentIds.length === 0) {
            return res.status(400).json({ message: 'No students selected' });
        }

        let schoolFilter;
        if (req.school.type === 'super') {
            const branchIds = await db('schools').where('parent_id', req.school._id).pluck('id');
            schoolFilter = [req.school._id, ...branchIds];
        } else {
            schoolFilter = [req.school._id];
        }

        const studentRows = await db('students')
            .whereIn('id', studentIds)
            .whereIn('school_id', schoolFilter)
            .where('is_active', true);
        const students = mapRows(studentRows);

        let deletedCount = 0;
        for (const student of students) {
            const submissionRows = await db('submissions').where('student_id', student._id);
            const submissions = mapRows(submissionRows);

            await db('archived_data').insert({
                type: 'student',
                archived_by: 'school',
                reason: 'bulk_deletion',
                student_data: JSON.stringify({
                    _id: student._id,
                    accessId: student.accessId,
                    name: student.name,
                    rollNo: student.rollNo,
                    class: student.class,
                    section: student.section,
                    schoolId: student.schoolId,
                    schoolName: req.school.name,
                    testStatus: student.testStatus,
                    createdAt: student.createdAt
                }),
                student_submissions: JSON.stringify(submissions.map(sub => ({
                    assessmentId: sub.assessmentId,
                    totalScore: sub.totalScore,
                    sectionScores: sub.sectionScores,
                    assignedBucket: sub.assignedBucket,
                    submittedAt: sub.submittedAt
                }))),
                stats: JSON.stringify({ submissionCount: submissions.length })
            });

            await db('submissions').where('student_id', student._id).del();
            await db('students').where('id', student._id).del();
            deletedCount++;
        }

        res.json({
            message: `${deletedCount} students deleted successfully`,
            deletedCount
        });
    } catch (error) {
        console.error('Bulk delete error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/school/classes
// @desc    Get unique classes and sections
// @access  School Admin
router.get('/classes', protect, isSchoolAdmin, async (req, res) => {
    try {
        const targetSchoolId = req.query.schoolId || req.school._id;

        const classRows = await db('students')
            .where({ school_id: targetSchoolId, is_active: true })
            .select('class', 'section')
            .count('* as count')
            .groupBy('class', 'section')
            .orderBy([{ column: 'class', order: 'asc' }, { column: 'section', order: 'asc' }]);

        const classes = classRows.map(r => ({
            _id: { class: r.class, section: r.section },
            count: parseInt(r.count)
        }));

        const uniqueClasses = [...new Set(classes.map(c => c._id.class))];

        res.json({ classes, uniqueClasses });
    } catch (error) {
        console.error('Get classes error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/school/tests
// @desc    Get assigned tests
// @access  School Admin
router.get('/tests', protect, isSchoolAdmin, async (req, res) => {
    try {
        const schoolRow = await db('schools').where('id', req.school._id).first();
        const school = mapRow(schoolRow);
        const assignedTestIds = school.assignedTests || [];

        const assignedTests = assignedTestIds.length > 0
            ? mapRows(await db('assessments')
                .whereIn('id', assignedTestIds)
                .select('id', 'title', 'description', 'is_default', 'time_per_question', 'total_time', 'questions', 'custom_sections'))
            : [];

        res.json(assignedTests);
    } catch (error) {
        console.error('Get tests error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/school/available-assessments
// @desc    Get all assessments available to this school (from pool)
// @access  School Admin
router.get('/available-assessments', protect, isSchoolAdmin, async (req, res) => {
    try {
        const schoolRow = await db('schools').where('id', req.school._id).first();
        const school = mapRow(schoolRow);
        const assignedTestIds = school.assignedTests || [];

        const assignedTests = assignedTestIds.length > 0
            ? mapRows(await db('assessments')
                .whereIn('id', assignedTestIds)
                .select('id', 'title', 'description', 'is_default', 'time_per_question', 'total_time', 'questions', 'custom_sections'))
            : [];

        const assessmentStats = await Promise.all(
            assignedTests.map(async (assessment) => {
                const assignedResult = await db('students')
                    .where({ school_id: req.school._id, is_active: true })
                    .whereRaw("test_status @> ?::jsonb", [JSON.stringify([{ assessmentId: assessment._id }])])
                    .count('* as count')
                    .first();
                const completedResult = await db('submissions')
                    .where({ school_id: req.school._id, assessment_id: assessment._id, status: 'complete' })
                    .count('* as count')
                    .first();
                return {
                    ...assessment,
                    assignedStudents: parseInt(assignedResult.count),
                    completedStudents: parseInt(completedResult.count),
                    questionCount: Array.isArray(assessment.questions) ? assessment.questions.length : 0
                };
            })
        );

        res.json(assessmentStats);
    } catch (error) {
        console.error('Get available assessments error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/school/tests/assign
// @desc    Assign test to class/section/student
// @access  School Admin
router.post('/tests/assign', protect, isSchoolAdmin, async (req, res) => {
    try {
        const { assessmentId, targetType, targetClass, targetSection, studentIds } = req.body;

        let query = db('students').where({ school_id: req.school._id, is_active: true });

        if (targetType === 'class') {
            query = query.where('class', targetClass);
        } else if (targetType === 'section') {
            query = query.where('class', targetClass).where('section', targetSection);
        } else if (targetType === 'students' && studentIds) {
            query = query.whereIn('id', studentIds);
        }

        const students = mapRows(await query);

        for (const student of students) {
            const testStatus = student.testStatus || [];
            const existingTest = testStatus.find(t => t.assessmentId === assessmentId);

            if (!existingTest) {
                testStatus.push({ assessmentId, isCompleted: false });
                await db('students').where('id', student._id).update({
                    test_status: JSON.stringify(testStatus)
                });
            } else if (existingTest.isCompleted) {
                const testIndex = testStatus.findIndex(t => t.assessmentId === assessmentId);
                if (testIndex !== -1) {
                    testStatus[testIndex].isCompleted = false;
                    testStatus[testIndex].score = 0;
                    testStatus[testIndex].sectionScores = { A: 0, B: 0, C: 0, D: 0 };
                    testStatus[testIndex].sectionBuckets = { A: '', B: '', C: '', D: '' };
                    testStatus[testIndex].bucket = '';
                    testStatus[testIndex].startedAt = null;
                    testStatus[testIndex].completedAt = null;
                    await db('students').where('id', student._id).update({
                        test_status: JSON.stringify(testStatus)
                    });
                }
            }
        }

        res.json({
            message: `Test assigned to ${students.length} students`,
            assignedCount: students.length
        });
    } catch (error) {
        console.error('Assign test error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/school/tests/unassign
// @desc    Unassign test from specific students
// @access  School Admin
router.post('/tests/unassign', protect, isSchoolAdmin, async (req, res) => {
    try {
        const { assessmentId, studentIds } = req.body;

        if (!studentIds || studentIds.length === 0) {
            return res.status(400).json({ message: 'No students selected' });
        }

        const studentRows = await db('students')
            .whereIn('id', studentIds)
            .where({ school_id: req.school._id, is_active: true });
        const students = mapRows(studentRows);

        let unassignedCount = 0;
        for (const student of students) {
            const testStatus = student.testStatus || [];
            const testIndex = testStatus.findIndex(t => t.assessmentId === assessmentId);

            if (testIndex !== -1) {
                if (!testStatus[testIndex].isCompleted) {
                    testStatus.splice(testIndex, 1);
                    await db('students').where('id', student._id).update({
                        test_status: JSON.stringify(testStatus)
                    });
                    unassignedCount++;
                }
            }
        }

        res.json({
            message: `Test unassigned from ${unassignedCount} students`,
            unassignedCount
        });
    } catch (error) {
        console.error('Unassign test error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/school/test-status
// @desc    Get test completion status
// @access  School Admin
router.get('/test-status', protect, isSchoolAdmin, async (req, res) => {
    try {
        const { assessmentId, class: className, section } = req.query;

        let query = db('students').where('is_active', true);

        if (req.school.type === 'super') {
            query = query.where(function () {
                this.where('school_id', req.school._id)
                    .orWhere('parent_id', req.school._id);
            });
        } else {
            query = query.where('school_id', req.school._id);
        }

        if (className) query = query.where('class', className);
        if (section) query = query.where('section', section);

        const studentRows = await query
            .select('id', 'name', 'access_id', 'class', 'section', 'roll_no', 'test_status')
            .orderBy([
                { column: 'class', order: 'asc' },
                { column: 'section', order: 'asc' },
                { column: 'name', order: 'asc' }
            ]);
        const students = mapRows(studentRows);

        const status = students.map(s => {
            const test = (s.testStatus || []).find(t => t.assessmentId === assessmentId);
            return {
                _id: s._id,
                name: s.name,
                accessId: s.accessId,
                class: s.class,
                section: s.section,
                rollNo: s.rollNo,
                status: test?.isCompleted ? 'Completed' : 'Pending',
                completedAt: test?.completedAt
            };
        });

        res.json(status);
    } catch (error) {
        console.error('Get test status error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/school/export-ids
// @desc    Export access IDs to Excel (supports selected students or filters)
// @access  School Admin
router.post('/export-ids', protect, isSchoolAdmin, async (req, res) => {
    try {
        const { class: className, section, studentIds } = req.body;

        let query = db('students').where('is_active', true);

        if (studentIds && studentIds.length > 0) {
            query = query.whereIn('id', studentIds);
        } else {
            if (req.school.type === 'super') {
                query = query.where(function () {
                    this.where('school_id', req.school._id)
                        .orWhere('parent_id', req.school._id);
                });
            } else {
                query = query.where('school_id', req.school._id);
            }
            if (className) query = query.where('class', className);
            if (section) query = query.where('section', section);
        }

        const studentRows = await query
            .select('id', 'access_id', 'name', 'roll_no', 'class', 'section')
            .orderBy([
                { column: 'class', order: 'asc' },
                { column: 'section', order: 'asc' },
                { column: 'roll_no', order: 'asc' }
            ]);
        const students = mapRows(studentRows);

        if (students.length === 0) {
            return res.status(400).json({ message: 'No students found. Export cannot be generated.' });
        }

        const workbook = await exportAccessIdsToExcel(students, req.school.name);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=access-ids-${req.school.schoolId}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Export IDs error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/school/analytics
// @desc    Get school analytics (if allowed)
// @access  School Admin
router.get('/analytics', protect, isSchoolAdmin, async (req, res) => {
    try {
        const schoolRow = await db('schools').where('id', req.school._id).first();
        const school = mapRow(schoolRow);
        if (!school.isDataVisibleToSchool) {
            return res.status(403).json({
                message: 'Analytics not available. Please contact admin.'
            });
        }

        const { class: className, section } = req.query;

        let schoolName = req.school.name;
        let studentQuery = db('students').where('is_active', true);

        if (req.query.schoolId) {
            const targetSchoolRow = await db('schools').where('id', req.query.schoolId).first();
            const targetSchool = targetSchoolRow ? mapRow(targetSchoolRow) : null;

            const isSelf = req.query.schoolId === req.school._id;
            const isChild = targetSchool && targetSchool.parentId === req.school._id;

            if (!isSelf && !isChild) {
                return res.status(403).json({ message: 'Unauthorized' });
            }

            studentQuery = studentQuery.where('school_id', req.query.schoolId);
            if (targetSchool) schoolName = targetSchool.name;

        } else if (req.school.type === 'super') {
            studentQuery = studentQuery.where(function () {
                this.where('school_id', req.school._id)
                    .orWhere('parent_id', req.school._id);
            });
            schoolName = `${req.school.name} & Branches`;
        } else {
            studentQuery = studentQuery.where('school_id', req.school._id);
        }

        if (className) studentQuery = studentQuery.where('class', className);
        if (section) studentQuery = studentQuery.where('section', section);

        const filteredStudentRows = await studentQuery.clone().select('id', 'class');
        const filteredStudents = mapRows(filteredStudentRows);
        const studentIds = filteredStudents.map(s => s._id);

        const participationByGrade = {};
        filteredStudents.forEach(s => {
            const grade = s.class || 'Unknown';
            if (!participationByGrade[grade]) {
                participationByGrade[grade] = { grade, total: 0, completed: 0, pending: 0 };
            }
            participationByGrade[grade].total++;
        });

        let submissionRows = [];
        if (studentIds.length > 0) {
            submissionRows = await db('submissions')
                .whereIn('student_id', studentIds)
                .where('status', 'complete')
                .orderBy('submitted_at', 'desc');
        }
        const submissions = mapRows(submissionRows);

        // Batch populate students and schools on submissions
        const subStudentIds = [...new Set(submissions.map(s => s.studentId).filter(Boolean))];
        let studentMap = {};
        if (subStudentIds.length > 0) {
            const studRows = await db('students')
                .whereIn('id', subStudentIds)
                .select('id', 'name', 'access_id', 'class', 'section');
            studentMap = Object.fromEntries(mapRows(studRows).map(s => [s._id, s]));
        }

        const subSchoolIds = [...new Set(submissions.map(s => s.schoolId).filter(Boolean))];
        let schoolMapForSubs = {};
        if (subSchoolIds.length > 0) {
            const schRows = await db('schools')
                .whereIn('id', subSchoolIds)
                .select('id', 'name');
            schoolMapForSubs = Object.fromEntries(mapRows(schRows).map(s => [s._id, s]));
        }

        submissions.forEach(sub => {
            sub.studentId = studentMap[sub.studentId] || null;
            sub.schoolId = schoolMapForSubs[sub.schoolId] || null;
        });

        const completedStudentIds = new Set();
        submissions.forEach(sub => {
            if (sub.studentId) {
                if (!completedStudentIds.has(sub.studentId._id)) {
                    completedStudentIds.add(sub.studentId._id);
                    const grade = sub.studentId.class || 'Unknown';
                    if (participationByGrade[grade]) {
                        participationByGrade[grade].completed++;
                    }
                }
            }
        });

        const participationData = Object.values(participationByGrade).map(p => ({
            ...p,
            pending: p.total - p.completed
        })).sort((a, b) => {
            const numA = parseInt(a.grade);
            const numB = parseInt(b.grade);
            return !isNaN(numA) && !isNaN(numB) ? numA - numB : a.grade.localeCompare(b.grade);
        });

        const analytics = calculateAnalytics(submissions);

        res.json({
            ...analytics,
            participationByGrade: participationData,
            recentSubmissions: submissions.slice(0, 20),
            filters: { class: className || null, section: section || null },
            aggregated: req.school.type === 'super' && !req.query.schoolId,
            schoolName
        });
    } catch (error) {
        console.error('School analytics error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/school/assessment-link/:assessmentId
// @desc    Get shareable assessment link
// @access  School Admin
router.get('/assessment-link/:assessmentId', protect, isSchoolAdmin, async (req, res) => {
    try {
        const assessmentRow = await db('assessments').where('id', req.params.assessmentId).first();
        if (!assessmentRow) {
            return res.status(404).json({ message: 'Assessment not found' });
        }
        const assessment = mapRow(assessmentRow);

        const frontendUrls = process.env.FRONTEND_URL || 'https://www.jaagrmind.com';
        const baseUrl = frontendUrls.split(',')[0].trim();
        const link = `${baseUrl}/student/login?school=${req.school.schoolId}&test=${req.params.assessmentId}`;

        res.json({
            link,
            schoolName: req.school.name,
            assessmentTitle: assessment.title
        });
    } catch (error) {
        console.error('Get link error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/school/students-analytics
// @desc    Get all students with their submission data for school panel
// @access  School Admin
router.get('/students-analytics', protect, isSchoolAdmin, async (req, res) => {
    try {
        const schoolRow = await db('schools').where('id', req.school._id).first();
        const school = mapRow(schoolRow);
        if (!school.isDataVisibleToSchool) {
            return res.status(403).json({
                message: 'Analytics not available. Please contact admin.'
            });
        }

        const { class: className, section, assessmentId, search, studentId } = req.query;

        let targetSchoolId = req.school._id;
        let isAggregated = false;

        if (req.query.schoolId) {
            const targetSchoolRow = await db('schools').where('id', req.query.schoolId).first();
            const targetSchool = targetSchoolRow ? mapRow(targetSchoolRow) : null;

            const isSelf = req.query.schoolId === req.school._id;
            const isChild = targetSchool && targetSchool.parentId === req.school._id;

            if (!isSelf && !isChild) {
                return res.status(403).json({ message: 'Unauthorized' });
            }
            targetSchoolId = req.query.schoolId;
        } else if (req.school.type === 'super') {
            isAggregated = true;
        }

        let query = db('students').where('is_active', true);

        if (studentId) {
            query = query.where('id', studentId);
        } else if (search) {
            // search $or overwrites school $or (preserving original behavior)
            if (!isAggregated) {
                query = query.where('school_id', targetSchoolId);
            }
            query = query.where(function () {
                this.where('name', 'ilike', `%${search}%`)
                    .orWhere('access_id', 'ilike', `%${search}%`)
                    .orWhere('roll_no', 'ilike', `%${search}%`);
            });
        } else if (isAggregated) {
            query = query.where(function () {
                this.where('school_id', req.school._id)
                    .orWhere('parent_id', req.school._id);
            });
        } else {
            query = query.where('school_id', targetSchoolId);
        }

        if (className) query = query.where('class', className);
        if (section) query = query.where('section', section);

        const studentRows = await query
            .select('id', 'name', 'access_id', 'class', 'section', 'roll_no')
            .orderBy([
                { column: 'class', order: 'asc' },
                { column: 'section', order: 'asc' },
                { column: 'name', order: 'asc' }
            ]);
        const students = mapRows(studentRows);

        let submissionQuery = db('submissions')
            .whereIn('student_id', students.map(s => s._id));
        if (assessmentId) {
            submissionQuery = submissionQuery.where('assessment_id', assessmentId);
        }

        const submissionRows = await submissionQuery
            .select('id', 'student_id', 'assessment_id', 'total_score', 'section_scores', 'assigned_bucket', 'submitted_at');
        const submissions = mapRows(submissionRows);

        // Batch populate assessment titles
        const allAssessmentIds = [...new Set(submissions.map(s => s.assessmentId).filter(Boolean))];
        let assessmentMap = {};
        if (allAssessmentIds.length > 0) {
            const assessmentRows = await db('assessments')
                .whereIn('id', allAssessmentIds)
                .select('id', 'title');
            assessmentMap = Object.fromEntries(mapRows(assessmentRows).map(a => [a._id, a]));
        }

        const submissionsByStudent = {};
        submissions.forEach(sub => {
            const studentIdStr = sub.studentId;
            if (!submissionsByStudent[studentIdStr]) {
                submissionsByStudent[studentIdStr] = [];
            }
            const assessmentObj = assessmentMap[sub.assessmentId];
            submissionsByStudent[studentIdStr].push({
                assessmentId: assessmentObj?._id || sub.assessmentId,
                assessmentTitle: assessmentObj?.title,
                totalScore: sub.totalScore,
                sectionScores: sub.sectionScores,
                bucket: sub.assignedBucket,
                submittedAt: sub.submittedAt
            });
        });

        const studentsWithAnalytics = students.map(student => ({
            _id: student._id,
            name: student.name,
            accessId: student.accessId,
            class: student.class,
            section: student.section,
            rollNo: student.rollNo,
            submissions: submissionsByStudent[student._id] || [],
            latestSubmission: submissionsByStudent[student._id]?.[0] || null
        }));

        // Filter options
        const allStudentRows = await db('students')
            .where({ school_id: targetSchoolId, is_active: true })
            .select('class', 'section');
        const uniqueClasses = [...new Set(allStudentRows.map(s => s.class))].sort();
        const uniqueSections = className
            ? [...new Set(allStudentRows.filter(s => s.class === className).map(s => s.section))].sort()
            : [];

        const assignedTestIds = school.assignedTests || [];
        const assessments = assignedTestIds.length > 0
            ? mapRows(await db('assessments')
                .whereIn('id', assignedTestIds)
                .where('is_active', true)
                .select('id', 'title'))
            : [];

        res.json({
            students: studentsWithAnalytics,
            totalStudents: studentsWithAnalytics.length,
            filters: {
                classes: uniqueClasses,
                sections: uniqueSections,
                assessments: assessments
            }
        });
    } catch (error) {
        console.error('School students analytics error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/school/student/:id/details
// @desc    Get detailed student info with all submissions and answers
// @access  School Admin
router.get('/student/:id/details', protect, isSchoolAdmin, async (req, res) => {
    try {
        let query = db('students').where({ id: req.params.id, is_active: true });

        if (req.school.type === 'super') {
            query = query.where(function () {
                this.where('school_id', req.school._id)
                    .orWhere('parent_id', req.school._id);
            });
        } else {
            query = query.where('school_id', req.school._id);
        }

        const studentRow = await query.first();
        if (!studentRow) {
            return res.status(404).json({ message: 'Student not found' });
        }
        const student = mapRow(studentRow);

        const submissionRows = await db('submissions')
            .where('student_id', student._id)
            .orderBy('submitted_at', 'desc');
        const submissions = mapRows(submissionRows);

        // Batch populate assessment details
        const assessmentIds = [...new Set(submissions.map(s => s.assessmentId).filter(Boolean))];
        let assessmentMap = {};
        if (assessmentIds.length > 0) {
            const assessmentRows = await db('assessments')
                .whereIn('id', assessmentIds)
                .select('id', 'title', 'questions', 'custom_sections');
            assessmentMap = Object.fromEntries(mapRows(assessmentRows).map(a => [a._id, a]));
        }

        const detailedSubmissions = submissions.map(sub => {
            const assessment = assessmentMap[sub.assessmentId] || {};
            const questions = assessment.questions || [];

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
                _id: sub._id,
                assessmentId: assessment._id || sub.assessmentId,
                assessmentTitle: assessment.title || 'Unknown Assessment',
                totalScore: sub.totalScore,
                sectionScores: sub.sectionScores,
                sectionBuckets: sub.sectionBuckets,
                assignedBucket: sub.assignedBucket,
                primarySkillArea: sub.primarySkillArea,
                secondarySkillArea: sub.secondarySkillArea,
                timeTaken: sub.timeTaken,
                totalInactivityTime: sub.totalInactivityTime,
                moodCheck: sub.moodCheck,
                status: sub.status,
                submittedAt: sub.submittedAt,
                answersWithQuestions,
                answersBySection
            };
        });

        res.json({
            student: {
                _id: student._id,
                name: student.name,
                accessId: student.accessId,
                class: student.class,
                section: student.section,
                rollNo: student.rollNo,
                createdAt: student.createdAt
            },
            submissions: detailedSubmissions,
            totalSubmissions: detailedSubmissions.length
        });
    } catch (error) {
        console.error('Student details error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/school/analytics/student/:studentId/attempts/:assessmentId
// @desc    Get all attempts for a student on a specific assessment
// @access  School Admin
router.get('/analytics/student/:studentId/attempts/:assessmentId', protect, isSchoolAdmin, async (req, res) => {
    try {
        const { studentId, assessmentId } = req.params;

        const studentRow = await db('students').where('id', studentId).first();
        if (!studentRow) {
            return res.status(404).json({ message: 'Student not found' });
        }

        const submissionRows = await db('submissions')
            .where({ student_id: studentId, assessment_id: assessmentId, status: 'complete' })
            .select('id', 'total_score', 'section_scores', 'assigned_bucket', 'submitted_at', 'time_taken')
            .orderBy('submitted_at', 'asc');

        res.json(mapRows(submissionRows));
    } catch (error) {
        console.error('Get student attempts error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
