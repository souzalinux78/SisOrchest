import { pool } from './server/db.js'

async function checkColumns() {
    try {
        const [columns] = await pool.query('SHOW COLUMNS FROM services')
        console.log('Columns in services table:', columns)

        // Check attendance table too
        const [attColumns] = await pool.query('SHOW COLUMNS FROM attendance')
        console.log('Columns in attendance table:', attColumns)

    } catch (err) {
        console.error('Error:', err)
    } finally {
        process.exit()
    }
}

checkColumns()
