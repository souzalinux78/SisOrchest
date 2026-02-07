import { pool } from './server/db.js'

async function simpleAlter() {
    try {
        console.log('Running ALTER TABLE...')
        try {
            await pool.query('ALTER TABLE services ADD COLUMN weekday VARCHAR(20) NOT NULL DEFAULT ""')
            console.log('Column added successfully.')
        } catch (err) {
            console.error('ALTER failed:', err.code, err.message)
        }

        console.log('Checking columns...')
        const [cols] = await pool.query('SHOW COLUMNS FROM services')
        console.log(cols.map(c => c.Field))

    } catch (err) {
        console.error('Fatal:', err)
    } finally {
        process.exit()
    }
}

simpleAlter()
