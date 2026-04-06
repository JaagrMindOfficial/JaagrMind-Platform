const db = require('../config/db');
const { mapRow, mapRows } = require('../utils/dbHelper');

const TABLE = 'students';

const Student = {
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
        if (!data.created_at) data.created_at = new Date();
        if (data.test_status && typeof data.test_status !== 'string') {
            data.test_status = JSON.stringify(data.test_status);
        }
        const [row] = await db(TABLE).insert(data).returning('*');
        return mapRow(row);
    },

    async insertMany(dataArray) {
        const prepared = dataArray.map(d => {
            if (d.test_status && typeof d.test_status !== 'string') {
                d.test_status = JSON.stringify(d.test_status);
            }
            if (!d.created_at) d.created_at = new Date();
            return d;
        });
        const rows = await db(TABLE).insert(prepared).returning('*');
        return mapRows(rows);
    },

    async updateById(id, data) {
        if (data.test_status && typeof data.test_status !== 'string') {
            data.test_status = JSON.stringify(data.test_status);
        }
        const [row] = await db(TABLE).where('id', id).update(data).returning('*');
        return mapRow(row);
    },

    async deleteById(id) {
        return db(TABLE).where('id', id).del();
    },

    async deleteMany(where) {
        return db(TABLE).where(where).del();
    },

    async countDocuments(where = {}) {
        const result = await db(TABLE).where(where).count('* as count').first();
        return parseInt(result.count);
    },

    query() {
        return db(TABLE);
    }
};

module.exports = Student;
