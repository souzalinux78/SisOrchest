import { pool } from './server/db.js'

async function checkData() {
    try {
        console.log('--- Checking Services ---')
        const [services] = await pool.query('SELECT id, weekday, service_time FROM services LIMIT 10')
        console.log(services)

        console.log('--- Checking Attendance ---')
        const [attendance] = await pool.query('SELECT service_id, service_weekday FROM attendance LIMIT 10')
        console.log(attendance)

    } catch (err) {
        console.error('Error:', err)
    } finally {
        process.exit()
    }
}

checkData()
