const db = require('../config/db');
const { mapRow, mapRows } = require('../utils/dbHelper');

const TABLE = 'tickets';

const Ticket = {
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
        if (!data.updated_at) data.updated_at = new Date();
        if (data.responses && typeof data.responses !== 'string') {
            data.responses = JSON.stringify(data.responses);
        }
        const [row] = await db(TABLE).insert(data).returning('*');
        return mapRow(row);
    },

    async updateById(id, data) {
        data.updated_at = new Date();
        if (data.responses && typeof data.responses !== 'string') {
            data.responses = JSON.stringify(data.responses);
        }
        const [row] = await db(TABLE).where('id', id).update(data).returning('*');
        return mapRow(row);
    },

    async deleteMany(where) {
        return db(TABLE).where(where).del();
    },

    query() {
        return db(TABLE);
    }
};

module.exports = Ticket;
