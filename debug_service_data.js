
import { pool } from './server/db.js';

async function checkData() {
    try {
        const serviceId = 1;
        console.log(`Checking Service ID: ${serviceId}`);

        const [services] = await pool.query('SELECT * FROM services WHERE id = ?', [serviceId]);
        if (services.length === 0) {
            console.log('Service not found!');
            return;
        }
        const service = services[0];
        console.log('Service:', service);

        const [musicians] = await pool.query('SELECT * FROM musicians WHERE id = 1');
        if (musicians.length === 0) {
            console.log('Musician 1 not found');
        } else {
            console.log('Musician 1:', musicians[0]);
        }

        const [activeMusicians] = await pool.query('SELECT id, name, common_id FROM musicians WHERE common_id = ? AND status = "active"', [service.common_id]);
        console.log(`Active musicians for common_id ${service.common_id}:`, activeMusicians.length);
        console.log('IDs:', activeMusicians.map(m => m.id));

        const [attendance] = await pool.query('SELECT * FROM attendance WHERE service_id = ? AND service_date = ?', [serviceId, '2026-02-15']);
        console.log('Attendance records for 2026-02-15:', attendance);

    } catch (err) {
        console.error(err);
    } process.exit();
}

checkData();
