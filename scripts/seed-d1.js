#!/usr/bin/env node

/**
 * Seed script to import data from spots.json into D1 database
 * 
 * Usage:
 * 1. Make sure you have created D1 database and updated wrangler.toml
 * 2. Run: node scripts/seed-d1.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Read spots.json
const spotsPath = path.join(__dirname, '../data/spots.json');
const spots = JSON.parse(fs.readFileSync(spotsPath, 'utf8'));

console.log(`📦 Found ${spots.length} spots to import`);

// Generate SQL INSERT statements
const insertStatements = spots.map(spot => {
    const {
        id,
        name,
        category,
        type,
        lat,
        lng,
        address = '',
        hours = '',
        desc = '',
        thumb = '',
    } = spot;

    // Escape single quotes in strings
    const escape = (str) => String(str || '').replace(/'/g, "''");

    return `INSERT OR IGNORE INTO spots (id, name, category, type, lat, lng, address, hours, description, thumbnail) 
VALUES ('${escape(id)}', '${escape(name)}', '${escape(category)}', '${escape(type)}', ${lat}, ${lng}, '${escape(address)}', '${escape(hours)}', '${escape(desc)}', '${escape(thumb)}');`;
});

// Generate SQL for media
const mediaStatements = [];
spots.forEach(spot => {
    if (spot.media && Array.isArray(spot.media)) {
        spot.media.forEach(m => {
            const escape = (str) => String(str || '').replace(/'/g, "''");
            mediaStatements.push(
                `INSERT INTO media (type, url, spot_id) VALUES ('${escape(m.type)}', '${escape(m.url)}', '${escape(spot.id)}');`
            );
        });
    }
});

// Combine all SQL
const allSQL = [
    '-- Seed data from spots.json',
    '-- Generated at: ' + new Date().toISOString(),
    '',
    ...insertStatements,
    '',
    '-- Media',
    ...mediaStatements,
].join('\n');

// Write to file
const sqlPath = path.join(__dirname, '../workers/api/seed.sql');
fs.writeFileSync(sqlPath, allSQL);

console.log(`✅ Generated seed.sql with ${insertStatements.length} spots and ${mediaStatements.length} media items`);
console.log(`📝 File saved to: ${sqlPath}`);
console.log('');
console.log('🚀 To apply to D1, run:');
console.log('   cd workers/api');
console.log('   npx wrangler d1 execute travel-db --file=seed.sql');
