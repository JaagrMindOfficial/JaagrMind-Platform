require('dotenv').config();
const knex = require('knex');
const { createClient } = require('@supabase/supabase-js');

const db = knex({
    client: 'pg',
    connection: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME || 'postgres',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: { rejectUnauthorized: false }
    },
    pool: {
        min: 2,
        max: 10,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 30000
    }
});

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const connectDB = async () => {
    try {
        const result = await db.raw('SELECT NOW()');
        console.log(`[PostgreSQL] Connected to Supabase at ${process.env.DB_HOST}`);
        console.log(`[PostgreSQL] Database: ${process.env.DB_NAME}`);
        console.log(`[PostgreSQL] Server time: ${result.rows[0].now}`);
    } catch (error) {
        console.error(`[PostgreSQL] Connection error: ${error.message}`);
        process.exit(1);
    }
};

module.exports = db;
module.exports.connectDB = connectDB;
module.exports.supabase = supabase;
