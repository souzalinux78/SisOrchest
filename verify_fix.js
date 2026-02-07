import { pool } from './server/db.js'

async function verify() {
    try {
        console.log('Verifying search...')

        // Simulate common_id=1, fev/2026
        const commonId = 1
        const month = 2
        const year = 2026
        const weekday = 'Domingo'

        console.log(`Searching for: common=${commonId}, ${month}/${year}, ${weekday}`)

        const [rows] = await pool.query(
            `SELECT DISTINCT service_date, service_weekday as weekday 
     FROM attendance a
     INNER JOIN services s ON s.id = a.service_id
     WHERE s.common_id = ? 
       AND MONTH(service_date) = ? 
       AND YEAR(service_date) = ? 
       AND a.service_weekday = ?
     ORDER BY service_date ASC`,
            [commonId, month, year, weekday]
        )

        console.log('Results:', rows)

    } catch (err) {
        console.error('Error:', err)
    } finally {
        process.exit()
    }
}

verify()
