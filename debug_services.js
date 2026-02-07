import { pool } from './server/db.js'

async function checkServices() {
    try {
        console.log('Checking services...')
        const [rows] = await pool.query('SELECT id, service_date, weekday, common_id FROM services LIMIT 20')
        console.log('Services found:', rows)

        if (rows.length > 0) {
            console.log('Sample weekday:', rows[0].weekday)
            console.log('Sample service_date:', rows[0].service_date)
        } else {
            console.log('No services found.')
        }

        // Check distinct weekdays
        const [weekdays] = await pool.query('SELECT DISTINCT weekday FROM services')
        console.log('Distinct weekdays:', weekdays)

    } catch (err) {
        console.error('Error:', err)
    } finally {
        process.exit()
    }
}

checkServices()
