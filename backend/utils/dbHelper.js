function snakeToCamel(str) {
    return str.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
}

function camelToSnake(str) {
    return str.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
}

function mapRow(row) {
    if (!row) return null;
    const mapped = {};
    for (const [key, value] of Object.entries(row)) {
        mapped[snakeToCamel(key)] = value;
    }
    mapped._id = mapped.id;
    return mapped;
}

function mapRows(rows) {
    return (rows || []).map(mapRow);
}

function toDb(data) {
    if (!data) return {};
    const mapped = {};
    for (const [key, value] of Object.entries(data)) {
        if (key === '_id') continue;
        mapped[camelToSnake(key)] = value;
    }
    return mapped;
}

function excludeFields(row, fields) {
    if (!row) return null;
    const result = { ...row };
    fields.forEach(f => delete result[f]);
    return result;
}

module.exports = {
    snakeToCamel,
    camelToSnake,
    mapRow,
    mapRows,
    toDb,
    excludeFields
};
