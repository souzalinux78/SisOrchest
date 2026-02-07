import { pool } from './server/db.js'

async function recover() {
    try {
        console.log('--- RECOVERING WEEKDAYS ---')

        // 1. Get services
        const [services] = await pool.query('SELECT id FROM services')
        console.log(`Found ${services.length} services to check.`)

        for (const service of services) {
            // Find latest attendance for this service
            const [att] = await pool.query(
                'SELECT service_weekday FROM attendance WHERE service_id = ? ORDER BY recorded_at DESC LIMIT 1',
                [service.id]
            )

            if (att.length > 0 && att[0].service_weekday) {
                const weekday = att[0].service_weekday
                console.log(`Recovering Service ID ${service.id} -> ${weekday}`)
                await pool.query('UPDATE services SET weekday = ? WHERE id = ?', [weekday, service.id])
            } else {
                console.log(`Service ID ${service.id} has no attendance history. Setting default based on ID/Pattern or leaving manual.`)
                // Default fallback logic or manual intervention needed. 
                // For now, let's just log it.
            }
        }

        console.log('--- VERIFICATION ---')
        const [check] = await pool.query('SELECT id, weekday FROM services')
        console.log(check)

    } catch (err) {
        console.error('Fatal:', err)
    } finally {
        process.exit()
    }
}

recover()
