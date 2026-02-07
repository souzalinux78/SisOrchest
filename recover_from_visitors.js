import { pool } from './server/db.js'

async function recoverFromVisitors() {
    try {
        console.log('--- RECOVERY FROM VISITORS ---')

        const idsToCheck = [2, 3] // The ones we know are missing

        for (const id of idsToCheck) {
            const [att] = await pool.query(
                'SELECT service_date FROM attendance_visitors WHERE service_id = ? LIMIT 1',
                [id]
            )

            if (att.length > 0) {
                const date = new Date(att[0].service_date)
                const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
                const recoveredWeekday = days[date.getUTCDay()]
                console.log(`Service ${id}: Recovered from visitors -> ${recoveredWeekday}`)
                await pool.query('UPDATE services SET weekday = ? WHERE id = ?', [recoveredWeekday, id])
            } else {
                console.log(`Service ${id}: No visitor data found.`)
            }
        }
    } catch (err) {
        console.error('Fatal:', err)
    } finally {
        process.exit()
    }
}

recoverFromVisitors()
