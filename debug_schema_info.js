
import { pool } from './server/db.js';

async function checkSchema() {
    try {
        const [rows] = await pool.query("DESCRIBE attendance");
        console.log(rows);
    } catch (err) {
        console.error(err);
    } process.exit();
}
checkSchema();
