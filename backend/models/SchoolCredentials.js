const db = require('../config/db');
const { mapRow, mapRows } = require('../utils/dbHelper');

const TABLE = 'school_credentials';

const SchoolCredentials = {
    TABLE,

    async findOne(where) {
        const row = await db(TABLE).where(where).first();
        return mapRow(row);
    },

    async create(data) {
        if (!data.created_at) data.created_at = new Date();
        if (!data.last_updated_at) data.last_updated_at = new Date();
        if (data.password_history && typeof data.password_history !== 'string') {
            data.password_history = JSON.stringify(data.password_history);
        }
        const [row] = await db(TABLE).insert(data).returning('*');
        return mapRow(row);
    },

    async updatePassword(schoolId, newPassword) {
        const cred = await db(TABLE).where('school_id', schoolId).first();
        if (cred) {
            const history = cred.password_history || [];
            history.push({
                password: cred.plain_password,
                changedAt: new Date().toISOString()
            });
            const [row] = await db(TABLE).where('school_id', schoolId).update({
                plain_password: newPassword,
                password_history: JSON.stringify(history),
                last_updated_at: new Date()
            }).returning('*');
            return mapRow(row);
        }
        return null;
    },

    async findOneAndUpdate(where, data) {
        const [row] = await db(TABLE).where(where).update({
            ...data,
            last_updated_at: new Date()
        }).returning('*');
        return mapRow(row);
    },

    async deleteMany(where) {
        return db(TABLE).where(where).del();
    },

    query() {
        return db(TABLE);
    }
};

module.exports = SchoolCredentials;
