require('dotenv').config();
const fs = require('fs');
const path = require('path');
const knex = require('knex');

const db = knex({
    client: 'pg',
    connection: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME || 'postgres',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: { rejectUnauthorized: false }
    }
});

async function setup() {
    try {
        console.log('Connecting to Supabase PostgreSQL...');
        await db.raw('SELECT NOW()');
        console.log('Connected successfully!\n');

        const schemaPath = path.join(__dirname, 'schema.sql');
        const sql = fs.readFileSync(schemaPath, 'utf8');

        console.log('Running schema migration...');
        await db.raw(sql);
        console.log('Schema created successfully!\n');

        const tables = await db.raw(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `);
        console.log('Tables created:');
        tables.rows.forEach(t => console.log(`  - ${t.table_name}`));

        console.log('\nDatabase setup complete!');
    } catch (error) {
        console.error('Setup error:', error.message);
    } finally {
        await db.destroy();
    }
}

setup();
