
import { pool } from './server/db.js';
import { listAttendance } from './server/repositories/presencaRepository.js';

async function verifyAttendance() {
    try {
        console.log('--- Verifying DB Content ---');
        const [rows] = await pool.query("SELECT * FROM attendance WHERE service_date = '2026-02-15'");
        console.log('Direct DB Query:', JSON.stringify(rows, null, 2));

        console.log('--- Verifying Repository listAttendance ---');
        const repoRows = await listAttendance({ common_id: 1 });
        // Filter locally to avoid spamming log, but logically we want to see if it's in the full list
        const found = repoRows.filter(r => r.service_date && (r.service_date === '2026-02-15' || r.service_date.toISOString?.().startsWith('2026-02-15')));
        console.log('Repository result for 2026-02-15:', found);

        if (found.length === 0) {
            console.log('Top 5 rows from repo:', repoRows.slice(0, 5));
        }

    } catch (err) {
        console.error(err);
    }
    process.exit();
}
verifyAttendance();
