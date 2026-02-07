
import { pool } from './server/db.js';
import fs from 'fs';

async function verifyAttendance() {
    try {
        const log = [];
        log.push('--- Verifying DB Content ---');
        const [rows] = await pool.query("SELECT * FROM attendance WHERE service_date = '2026-02-15'");
        log.push('Direct DB Query: ' + JSON.stringify(rows, null, 2));

        log.push('--- SQL for listAttendance ---');
        // Replicate query
        const [repoRows] = await pool.query(
            `SELECT a.id, a.service_id, a.musician_id, a.status, a.service_weekday, a.service_date, a.recorded_at,
            m.name, m.instrument, m.common_id
        FROM attendance a
        INNER JOIN musicians m ON m.id = a.musician_id
        WHERE m.common_id = 1
        ORDER BY a.service_date DESC, m.name ASC`
        );

        const found = repoRows.filter(r => {
            const d = new Date(r.service_date);
            return d.toISOString().startsWith('2026-02-15');
        });
        log.push('Repository filter for 2026-02-15: ' + JSON.stringify(found, null, 2));

        if (found.length === 0) {
            log.push('Top 5 rows from repo: ' + JSON.stringify(repoRows.slice(0, 5), null, 2));
        }

        fs.writeFileSync('verify_output.txt', log.join('\n'));
        console.log('Done writing verify_output.txt');

    } catch (err) {
        console.error(err);
    }
    process.exit();
}
verifyAttendance();
