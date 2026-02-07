
import { pool } from './server/db.js';
import fs from 'fs';

async function checkSchema() {
    try {
        const [rows] = await pool.query("SHOW CREATE TABLE attendance");
        fs.writeFileSync('schema_dump.txt', JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error(err);
    }
    process.exit();
}
checkSchema();
