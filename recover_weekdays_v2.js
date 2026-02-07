import { pool } from './server/db.js'

async function recoverV2() {
    try {
        console.log('--- RECOVERY V2 START ---')

        // Get all services
        const [services] = await pool.query('SELECT id, weekday, service_time FROM services')

        for (const service of services) {
            // Find ANY attendance record
            const [att] = await pool.query(
                'SELECT service_weekday, service_date FROM attendance WHERE service_id = ? LIMIT 1',
                [service.id]
            )

            let recoveredWeekday = null

            if (att.length > 0) {
                if (att[0].service_weekday) {
                    recoveredWeekday = att[0].service_weekday
                } else if (att[0].service_date) {
                    // Fallback: Calculate from date
                    const date = new Date(att[0].service_date)
                    const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
                    recoveredWeekday = days[date.getUTCDay()] // Use UTC to avoid timezone shifts on pure dates
                }
            }

            if (recoveredWeekday) {
                console.log(`Service ${service.id} (${service.service_time}): Recovered -> ${recoveredWeekday}`)
                await pool.query('UPDATE services SET weekday = ? WHERE id = ?', [recoveredWeekday, service.id])
            } else {
                console.log(`Service ${service.id} (${service.service_time}): COULD NOT RECOVER (No attendance data)`)
                // If we really can't find it, we might set a placeholder like 'Not Set' or leave empty
            }
        }

        const [finalCheck] = await pool.query('SELECT id, weekday, service_time FROM services')
        console.log('--- FINAL STATE ---')
        console.log(finalCheck)

    } catch (err) {
        console.error('Fatal:', err)
    } finally {
        process.exit()
    }
}

recoverV2()
