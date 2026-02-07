
import { pool } from './server/db.js';

async function fixSchema() {
    try {
        console.log('--- Fixing Schema ---');
        // Drop the incorrect unique constraint
        try {
            await pool.query("ALTER TABLE attendance DROP INDEX uq_attendance");
            console.log('Dropped index uq_attendance');
        } catch (e) {
            console.log('Index uq_attendance might not exist or error:', e.message);
        }

        // Add the correct unique constraint
        try {
            await pool.query("ALTER TABLE attendance ADD UNIQUE KEY uq_attendance (service_id, musician_id, service_date)");
            console.log('Added unique index (service_id, musician_id, service_date)');
        } catch (e) {
            console.error('Error adding index:', e.message);
        }

    } catch (err) {
        console.error(err);
    }
    process.exit();
}
fixSchema();
