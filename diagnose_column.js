import { pool } from './server/db.js'

async function diagnose() {
    try {
        console.log('--- DIAGNOSTIC START ---')

        // 1. Try to SELECT the column
        try {
            await pool.query('SELECT weekday FROM services LIMIT 1')
            console.log('SELECT weekday: SUCCESS')
        } catch (e) {
            console.log('SELECT weekday: FAILED', e.code, e.sqlMessage)
        }

        // 2. Try to ADD the column
        try {
            await pool.query('ALTER TABLE services ADD COLUMN weekday VARCHAR(20)')
            console.log('ALTER ADD: SUCCESS')
        } catch (e) {
            console.log('ALTER ADD: FAILED', e.code, e.sqlMessage)
        }

        // 3. List all columns
        const [cols] = await pool.query('SHOW COLUMNS FROM services')
        console.log('COLUMNS:', cols.map(c => c.Field))
        console.log('--- DIAGNOSTIC END ---')

    } catch (err) {
        console.error('Fatal:', err)
    } finally {
        process.exit()
    }
}

diagnose()
