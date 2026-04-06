const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { mapRow } = require('../utils/dbHelper');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            next();
        } catch (error) {
            console.error('Token verification failed:', error);
            res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

const isAdmin = async (req, res, next) => {
    try {
        if (req.user && req.user.role === 'admin') {
            const row = await db('admins').where('id', req.user.id)
                .select('id', 'email', 'name', 'role', 'created_at', 'last_login')
                .first();
            if (row) {
                req.admin = mapRow(row);
                next();
            } else {
                res.status(401).json({ message: 'Not authorized as admin' });
            }
        } else {
            res.status(401).json({ message: 'Not authorized as admin' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

const isSchoolAdmin = async (req, res, next) => {
    try {
        if (req.user && req.user.role === 'school') {
            const row = await db('schools').where('id', req.user.id)
                .select('id', 'school_id', 'name', 'email', 'logo', 'address', 'type',
                    'parent_id', 'contact', 'is_data_visible_to_school', 'assigned_tests',
                    'is_blocked', 'must_change_password', 'created_at', 'is_active')
                .first();
            if (row) {
                req.school = mapRow(row);
                next();
            } else {
                res.status(401).json({ message: 'Not authorized as school admin' });
            }
        } else {
            res.status(401).json({ message: 'Not authorized as school admin' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

const isStudent = async (req, res, next) => {
    try {
        if (req.user && req.user.role === 'student') {
            const student = await db('students').where('students.id', req.user.id)
                .first();
            if (student) {
                const school = await db('schools').where('id', student.school_id)
                    .select('id', 'name', 'logo', 'school_id')
                    .first();
                const mapped = mapRow(student);
                mapped.schoolId = school ? mapRow(school) : null;
                req.student = mapped;
                next();
            } else {
                res.status(401).json({ message: 'Student not found' });
            }
        } else {
            res.status(401).json({ message: 'Not authorized as student' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
};

module.exports = { protect, isAdmin, isSchoolAdmin, isStudent, generateToken };
