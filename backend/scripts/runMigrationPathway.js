require('dotenv').config();
const fs = require('fs');
const path = require('path');
const knex = require('knex');

const db = knex({
    client: 'pg',
    connection: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT, 10) || 5432,
        database: process.env.DB_NAME || 'postgres',
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: { rejectUnauthorized: false }
    }
});

async function run() {
    const sqlPath = path.join(__dirname, '../config/migration_pathway_v1.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await db.raw(sql);
    console.log('migration_pathway_v1.sql applied.');
    await db.destroy();
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
