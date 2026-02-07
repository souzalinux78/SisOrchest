import { pool } from './server/db.js'

async function migrate() {
    try {
        console.log('Starting migration...')

        // 1. Check if column exists
        const [columns] = await pool.query("SHOW COLUMNS FROM services LIKE 'weekday'")
        if (columns.length > 0) {
            console.log('Column "weekday" already exists.')
        } else {
            console.log('Adding "weekday" column...')
            await pool.query('ALTER TABLE services ADD COLUMN weekday VARCHAR(20) AFTER id')
            console.log('Column added.')
        }

        // 2. Update existing records
        console.log('Updating existing records...')
        await pool.query(`
      UPDATE services SET weekday = CASE DAYOFWEEK(service_date)
        WHEN 1 THEN 'Domingo'
        WHEN 2 THEN 'Segunda'
        WHEN 3 THEN 'Terça'
        WHEN 4 THEN 'Quarta'
        WHEN 5 THEN 'Quinta'
        WHEN 6 THEN 'Sexta'
        WHEN 7 THEN 'Sábado'
      END
      WHERE weekday IS NULL OR weekday = ''
    `)
        console.log('Records updated.')

        // 3. Verify
        const [rows] = await pool.query('SELECT id, service_date, weekday FROM services LIMIT 5')
        console.log('Sample data:', rows)

    } catch (err) {
        console.error('Migration failed:', err)
    } finally {
        process.exit()
    }
}

migrate()
