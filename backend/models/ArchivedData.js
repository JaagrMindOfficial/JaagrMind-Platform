const db = require('../config/db');
const { mapRow, mapRows } = require('../utils/dbHelper');

const TABLE = 'archived_data';

const ArchivedData = {
    TABLE,

    async create(data, trx) {
        const conn = trx || db;
        if (!data.archived_at) data.archived_at = new Date();
        ['student_data', 'student_submissions', 'school_data', 'school_students', 'school_submissions', 'stats'].forEach(field => {
            if (data[field] && typeof data[field] !== 'string') {
                data[field] = JSON.stringify(data[field]);
            }
        });
        const [row] = await conn(TABLE).insert(data).returning('*');
        return mapRow(row);
    },

    async find(where = {}) {
        const rows = await db(TABLE).where(where);
        return mapRows(rows);
    },

    query() {
        return db(TABLE);
    }
};

module.exports = ArchivedData;
