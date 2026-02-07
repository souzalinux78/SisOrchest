
import { pool } from './server/db.js';

async function checkSchema() {
    try {
        const [rows] = await pool.query("DESCRIBE attendance");
        console.log(JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error(err);
    }
}
checkSchema().then(() => process.exit());
