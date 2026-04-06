require('dotenv').config();
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

const email = 'jatin.24bcs10213@sst.scaler.com';

async function check() {
    try {
        await db.raw('SELECT NOW()');
        console.log('Connected to DB');

        console.log(`Checking for email: ${email}`);

        const school = await db('schools').where('email', email.toLowerCase()).first();
        console.log('School found:', school ? school.id : 'null');
        if (school) {
            console.log('School details:', JSON.stringify(school, null, 2));
        }

        const creds = await db('school_credentials').where('email', email.toLowerCase()).first();
        console.log('SchoolCredentials found:', creds ? creds.id : 'null');

        const archived = await db('archived_data')
            .whereRaw("student_data->>'email' = ? OR school_data->'contact'->>'email' = ?", [email.toLowerCase(), email.toLowerCase()])
            .first();
        console.log('ArchivedData found:', archived ? archived.id : 'null');

        const regexSchool = await db('schools').where('email', 'ilike', email).first();
        console.log('School found via ILIKE:', regexSchool ? regexSchool.id : 'null');

    } catch (e) {
        console.error(e);
    } finally {
        await db.destroy();
    }
}

check();
