const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

const generateSchoolId = async () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id;
    let exists = true;

    while (exists) {
        let part1 = '';
        let part2 = '';
        for (let i = 0; i < 4; i++) {
            part1 += chars.charAt(Math.floor(Math.random() * chars.length));
            part2 += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        id = `JM-${part1}-${part2}`;
        const row = await db('schools').where('school_id', id).first();
        exists = !!row;
    }
    return id;
};

const generateSchoolPassword = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
};

const generateAccessId = (schoolName) => {
    const words = schoolName.split(' ').filter(w => w.length > 0);
    let abbrev = '';

    if (words.length === 1) {
        abbrev = words[0].substring(0, 4).toUpperCase();
    } else {
        abbrev = words.map(w => w[0]).join('').substring(0, 4).toUpperCase();
    }

    const year = new Date().getFullYear();
    const uuid = uuidv4().replace(/-/g, '');
    const randomPart = uuid.substring(0, 16).toUpperCase();

    return `${abbrev}-${year}-${randomPart}`;
};

const generateBulkAccessIds = async (schoolName, count) => {
    const accessIds = [];
    const rows = await db('students').select('access_id');
    const existingIds = new Set(rows.map(s => s.access_id));

    while (accessIds.length < count) {
        const newId = generateAccessId(schoolName);
        if (!existingIds.has(newId) && !accessIds.includes(newId)) {
            accessIds.push(newId);
        }
    }

    return accessIds;
};

module.exports = {
    generateSchoolId,
    generateSchoolPassword,
    generateAccessId,
    generateBulkAccessIds
};
