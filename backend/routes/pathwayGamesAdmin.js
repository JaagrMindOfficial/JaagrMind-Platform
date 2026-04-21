const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { mapRow, mapRows } = require('../utils/dbHelper');
const { protect, isAdmin } = require('../middleware/auth');

router.get('/skill-buckets', protect, isAdmin, async (req, res) => {
    try {
        const buckets = await db('skill_buckets').select('*').orderBy('sort_order', 'asc');
        const withCounts = await Promise.all(
            buckets.map(async (b) => {
                const r = await db('skill_bucket_games').where({ skill_bucket_id: b.id }).count('* as c').first();
                return { ...mapRow(b), gameCount: parseInt(r.c, 10) };
            })
        );
        res.json(withCounts);
    } catch (e) {
        console.error('skill-buckets list', e);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/skill-buckets', protect, isAdmin, async (req, res) => {
    try {
        const { key, name, description, sortOrder } = req.body;
        if (!key || !name) return res.status(400).json({ message: 'key and name are required' });
        const [row] = await db('skill_buckets')
            .insert({
                key: String(key).toUpperCase().replace(/\s+/g, '_'),
                name,
                description: description || '',
                sort_order: sortOrder ?? 0
            })
            .returning('*');
        res.status(201).json(mapRow(row));
    } catch (e) {
        if (e.code === '23505') return res.status(400).json({ message: 'Bucket key already exists' });
        console.error('skill-buckets create', e);
        res.status(500).json({ message: 'Server error' });
    }
});

router.put('/skill-buckets/:id', protect, isAdmin, async (req, res) => {
    try {
        const { name, description, sortOrder } = req.body;
        const updates = {};
        if (name !== undefined) updates.name = name;
        if (description !== undefined) updates.description = description;
        if (sortOrder !== undefined) updates.sort_order = sortOrder;
        const [row] = await db('skill_buckets').where({ id: req.params.id }).update(updates).returning('*');
        if (!row) return res.status(404).json({ message: 'Not found' });
        res.json(mapRow(row));
    } catch (e) {
        console.error('skill-buckets update', e);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/games-catalog', protect, isAdmin, async (req, res) => {
    try {
        const games = await db('games').where({ is_active: true }).select('*').orderBy('sort_order', 'asc').orderBy('name', 'asc');
        res.json(mapRows(games));
    } catch (e) {
        console.error('games-catalog', e);
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/games-catalog', protect, isAdmin, async (req, res) => {
    try {
        const { slug, name, shortDescription, fullDescription, sortOrder } = req.body;
        if (!slug || !name) return res.status(400).json({ message: 'slug and name are required' });
        const [row] = await db('games')
            .insert({
                slug: String(slug).toLowerCase().replace(/\s+/g, '_'),
                name,
                short_description: shortDescription || '',
                full_description: fullDescription || '',
                sort_order: sortOrder ?? 0,
                is_active: true
            })
            .returning('*');
        res.status(201).json(mapRow(row));
    } catch (e) {
        if (e.code === '23505') return res.status(400).json({ message: 'Game slug already exists' });
        console.error('games-catalog create', e);
        res.status(500).json({ message: 'Server error' });
    }
});

router.put('/games-catalog/:id', protect, isAdmin, async (req, res) => {
    try {
        const { name, shortDescription, fullDescription, sortOrder, isActive } = req.body;
        const updates = {};
        if (name !== undefined) updates.name = name;
        if (shortDescription !== undefined) updates.short_description = shortDescription;
        if (fullDescription !== undefined) updates.full_description = fullDescription;
        if (sortOrder !== undefined) updates.sort_order = sortOrder;
        if (isActive !== undefined) updates.is_active = isActive;
        const [row] = await db('games').where({ id: req.params.id }).update(updates).returning('*');
        if (!row) return res.status(404).json({ message: 'Not found' });
        res.json(mapRow(row));
    } catch (e) {
        console.error('games-catalog update', e);
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/skill-buckets/:id/games', protect, isAdmin, async (req, res) => {
    try {
        const bucket = await db('skill_buckets').where({ id: req.params.id }).first();
        if (!bucket) return res.status(404).json({ message: 'Bucket not found' });

        const links = await db('skill_bucket_games as sbg')
            .join('games as g', 'g.id', 'sbg.game_id')
            .where('sbg.skill_bucket_id', req.params.id)
            .select(
                'g.id',
                'g.slug',
                'g.name',
                'g.short_description',
                'g.full_description',
                'g.sort_order',
                'g.is_active',
                'g.created_at',
                'sbg.sort_order as link_sort'
            )
            .orderBy('sbg.sort_order', 'asc')
            .orderBy('g.name', 'asc');

        res.json({
            bucket: mapRow(bucket),
            games: links.map((r) => {
                const m = mapRow(r);
                m.linkSort = r.link_sort;
                return m;
            })
        });
    } catch (e) {
        console.error('skill-buckets games get', e);
        res.status(500).json({ message: 'Server error' });
    }
});

router.put('/skill-buckets/:id/games', protect, isAdmin, async (req, res) => {
    try {
        const { gameIds } = req.body;
        if (!Array.isArray(gameIds)) return res.status(400).json({ message: 'gameIds array required' });

        const bucket = await db('skill_buckets').where({ id: req.params.id }).first();
        if (!bucket) return res.status(404).json({ message: 'Bucket not found' });

        await db('skill_bucket_games').where({ skill_bucket_id: req.params.id }).del();

        let order = 0;
        for (const gid of gameIds) {
            await db('skill_bucket_games').insert({
                skill_bucket_id: req.params.id,
                game_id: gid,
                sort_order: order++
            });
        }

        res.json({ success: true, count: gameIds.length });
    } catch (e) {
        console.error('skill-buckets games put', e);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
