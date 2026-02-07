import { pool } from './server/db.js'

async function recreateColumn() {
    try {
        console.log('--- RECREATE COLUMN START ---')

        // 1. Try DROP
        try {
            console.log('Dropping weekday...')
            await pool.query('ALTER TABLE services DROP COLUMN weekday')
            console.log('DROP SUCCESS')
        } catch (e) {
            console.log('DROP FAILED:', e.code, e.sqlMessage)
        }

        // 2. Try ADD
        try {
            console.log('Adding weekday...')
            await pool.query('ALTER TABLE services ADD COLUMN weekday VARCHAR(20) NOT NULL DEFAULT "" AFTER id')
            console.log('ADD SUCCESS')
        } catch (e) {
            console.log('ADD FAILED:', e.code, e.sqlMessage)
        }

        // 3. Update data
        try {
            console.log('Updating data...')
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
            console.log('UPDATE SUCCESS')
        } catch (e) {
            console.log('UPDATE FAILED:', e.code, e.sqlMessage)
        }

        console.log('--- RECREATE COLUMN END ---')

    } catch (err) {
        console.error('Fatal:', err)
    }
}

recreateColumn()
