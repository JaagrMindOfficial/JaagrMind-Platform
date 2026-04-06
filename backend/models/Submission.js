const db = require('../config/db');
const { mapRow, mapRows } = require('../utils/dbHelper');

const TABLE = 'submissions';

const Submission = {
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
        if (!data.submitted_at) data.submitted_at = new Date();
        ['section_scores', 'section_buckets', 'answers', 'mood_check'].forEach(field => {
            if (data[field] && typeof data[field] !== 'string') {
                data[field] = JSON.stringify(data[field]);
            }
        });
        const [row] = await db(TABLE).insert(data).returning('*');
        return mapRow(row);
    },

    async updateById(id, data) {
        ['section_scores', 'section_buckets', 'answers', 'mood_check'].forEach(field => {
            if (data[field] && typeof data[field] !== 'string') {
                data[field] = JSON.stringify(data[field]);
            }
        });
        const [row] = await db(TABLE).where('id', id).update(data).returning('*');
        return mapRow(row);
    },

    async deleteOne(where) {
        return db(TABLE).where(where).limit(1).del();
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

module.exports = Submission;
