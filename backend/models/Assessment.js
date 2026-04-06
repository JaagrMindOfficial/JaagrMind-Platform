const db = require('../config/db');
const { mapRow, mapRows } = require('../utils/dbHelper');

const TABLE = 'assessments';

const Assessment = {
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
        if (data.questions && typeof data.questions !== 'string') {
            data.questions = JSON.stringify(data.questions);
        }
        if (data.buckets && typeof data.buckets !== 'string') {
            data.buckets = JSON.stringify(data.buckets);
        }
        if (data.custom_sections && typeof data.custom_sections !== 'string') {
            data.custom_sections = JSON.stringify(data.custom_sections);
        }
        const [row] = await db(TABLE).insert(data).returning('*');
        return mapRow(row);
    },

    async updateById(id, data) {
        if (data.questions && typeof data.questions !== 'string') {
            data.questions = JSON.stringify(data.questions);
        }
        if (data.buckets && typeof data.buckets !== 'string') {
            data.buckets = JSON.stringify(data.buckets);
        }
        if (data.custom_sections && typeof data.custom_sections !== 'string') {
            data.custom_sections = JSON.stringify(data.custom_sections);
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

    query() {
        return db(TABLE);
    }
};

module.exports = Assessment;
