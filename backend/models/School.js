const db = require('../config/db');
const bcrypt = require('bcryptjs');
const { mapRow, mapRows } = require('../utils/dbHelper');

const TABLE = 'schools';

const School = {
    TABLE,

    async findById(id) {
        const row = await db(TABLE).where('id', id).first();
        return mapRow(row);
    },

    async findOne(where) {
        const row = await db(TABLE).where(where).first();
        return mapRow(row);
    },

    async find(where = {}) {
        const rows = await db(TABLE).where(where);
        return mapRows(rows);
    },

    async create(data) {
        if (data.password && !data.password.startsWith('$2')) {
            const salt = await bcrypt.genSalt(10);
            data.password = await bcrypt.hash(data.password, salt);
        }
        if (!data.created_at) data.created_at = new Date();
        if (data.assigned_tests && Array.isArray(data.assigned_tests)) {
            data.assigned_tests = data.assigned_tests.map(String);
        }
        const [row] = await db(TABLE).insert(data).returning('*');
        return mapRow(row);
    },

    async updateById(id, data) {
        if (data.password && !data.password.startsWith('$2')) {
            const salt = await bcrypt.genSalt(10);
            data.password = await bcrypt.hash(data.password, salt);
        }
        if (data.assigned_tests && Array.isArray(data.assigned_tests)) {
            data.assigned_tests = data.assigned_tests.map(String);
        }
        const [row] = await db(TABLE).where('id', id).update(data).returning('*');
        return mapRow(row);
    },

    async deleteById(id) {
        return db(TABLE).where('id', id).del();
    },

    async countDocuments(where = {}) {
        const result = await db(TABLE).where(where).count('* as count').first();
        return parseInt(result.count);
    },

    async matchPassword(hashedPassword, enteredPassword) {
        return bcrypt.compare(enteredPassword, hashedPassword);
    },

    async hashPassword(password) {
        const salt = await bcrypt.genSalt(10);
        return bcrypt.hash(password, salt);
    },

    query() {
        return db(TABLE);
    }
};

module.exports = School;
