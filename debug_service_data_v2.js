
import { pool } from './server/db.js';

async function checkData() {
    try {
        const serviceId = 1;
        console.log(`Checking Service ID: ${serviceId}`);

        const [services] = await pool.query('SELECT * FROM services WHERE id = ?', [serviceId]);
        if (services.length === 0) {
            console.log('Service not found!');
        } else {
            const s = services[0];
            console.log(`Service: ID=${s.id}, CommonID=${s.common_id}, Weekday=${s.weekday}`);
        }

        const [musicians] = await pool.query('SELECT id, name, common_id, status FROM musicians WHERE common_id = 1');
        console.log('Musicians in Common 1:', musicians); // Should show ID 1

        const [attendance] = await pool.query('SELECT * FROM attendance WHERE service_id = ?', [serviceId]);
        console.log('Attendance for Service 1:', attendance);

    } catch (err) {
        console.error(err);
    }
}
checkData().then(() => process.exit());
