import { pool } from './server/db.js'

async function fixSchema() {
    try {
        console.log('Attempting to add column weekday...')

        // Attempt add column
        try {
            await pool.query('ALTER TABLE services ADD COLUMN weekday VARCHAR(20) NOT NULL DEFAULT "" AFTER id')
            console.log('ALTER TABLE executed.')
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('Column already exists.')
            } else {
                throw e
            }
        }

        console.log('Updating records...')
        // Use raw query for update
        await pool.query(`
      UPDATE services 
      SET weekday = CASE DAYOFWEEK(service_date)
        WHEN 1 THEN 'Domingo'
        WHEN 2 THEN 'Segunda'
        WHEN 3 THEN 'Terça'
        WHEN 4 THEN 'Quarta'
        WHEN 5 THEN 'Quinta'
        WHEN 6 THEN 'Sexta'
        WHEN 7 THEN 'Sábado'
      END
    `)
        console.log('Records updated.')

        const [rows] = await pool.query('SELECT id, service_date, weekday FROM services LIMIT 5')
        console.log('Verification:', rows)

    } catch (err) {
        console.error('Fix failed:', err)
    } finally {
        process.exit()
    }
}

fixSchema()
