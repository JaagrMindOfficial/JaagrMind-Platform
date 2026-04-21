/**
 * Seeds skill_buckets, games, and skill_bucket_games from pathwayGamesData.js
 * Usage: node scripts/seedPathwayGames.js  (from backend directory)
 */
require('dotenv').config();
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

const { SKILL_BUCKETS, GAMES } = require(path.join(__dirname, '../seeds/pathwayGamesData'));

async function run() {
    console.log('Seeding skill buckets and games...');

    const bucketIdByKey = {};
    for (const b of SKILL_BUCKETS) {
        const existing = await db('skill_buckets').where({ key: b.key }).first();
        if (existing) {
            bucketIdByKey[b.key] = existing.id;
            await db('skill_buckets').where({ id: existing.id }).update({
                name: b.name,
                description: b.description,
                sort_order: b.sort_order
            });
        } else {
            const [row] = await db('skill_buckets')
                .insert({
                    key: b.key,
                    name: b.name,
                    description: b.description,
                    sort_order: b.sort_order
                })
                .returning('*');
            bucketIdByKey[b.key] = row.id;
        }
    }

    const gameIdBySlug = {};
    for (const g of GAMES) {
        const existing = await db('games').where({ slug: g.slug }).first();
        if (existing) {
            gameIdBySlug[g.slug] = existing.id;
            await db('games')
                .where({ id: existing.id })
                .update({
                    name: g.name,
                    short_description: g.short_description,
                    full_description: g.full_description,
                    sort_order: g.sort_order,
                    is_active: true
                });
        } else {
            const [row] = await db('games')
                .insert({
                    slug: g.slug,
                    name: g.name,
                    short_description: g.short_description,
                    full_description: g.full_description,
                    sort_order: g.sort_order,
                    is_active: true
                })
                .returning('*');
            gameIdBySlug[g.slug] = row.id;
        }
    }

    for (const g of GAMES) {
        const bid = bucketIdByKey[g.bucketKey];
        const gid = gameIdBySlug[g.slug];
        if (!bid || !gid) continue;
        const exists = await db('skill_bucket_games').where({ skill_bucket_id: bid, game_id: gid }).first();
        if (!exists) {
            await db('skill_bucket_games').insert({
                skill_bucket_id: bid,
                game_id: gid,
                sort_order: g.sort_order
            });
        }
    }

    console.log('Done. Buckets:', Object.keys(bucketIdByKey).length, 'Games:', Object.keys(gameIdBySlug).length);
    await db.destroy();
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
