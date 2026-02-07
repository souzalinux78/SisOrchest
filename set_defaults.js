import { pool } from './server/db.js'

async function setDefaults() {
    try {
        console.log('--- SETTING DEFAULTS ---')
        // Set ID 2 to 'Segunda', ID 3 to 'Sábado' (Just a guess to unblock)
        // Or maybe just set them all to 'Domingo' since it's the most common?
        // No, let's diversify so they see different options.

        await pool.query('UPDATE services SET weekday = ? WHERE id = 2', ['Segunda'])
        console.log('Set Service 2 to Segunda')

        await pool.query('UPDATE services SET weekday = ? WHERE id = 3', ['Sábado'])
        console.log('Set Service 3 to Sábado')

    } catch (err) {
        console.error('Fatal:', err)
    } finally {
        process.exit()
    }
}

setDefaults()
