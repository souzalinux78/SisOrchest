import { pool } from './server/db.js'

async function checkDB() {
    try {
        const [tables] = await pool.query('SHOW TABLES')
        console.log('Tables:', tables)

        const [cols] = await pool.query('DESCRIBE attendance_visitors')
        console.log('attendance_visitors columns:', cols)

        const [count] = await pool.query('SELECT COUNT(*) as count FROM attendance_visitors')
        console.log('attendance_visitors count:', count)
    } catch (err) {
        console.error('DB Check Error:', err)
    } finally {
        process.exit()
    }
}

checkDB()
