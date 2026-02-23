import { pool } from './server/db.js'

async function migrate() {
    try {
        console.log('🚀 Iniciando migração...')

        await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance_visitors (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        service_id BIGINT UNSIGNED NOT NULL,
        service_date DATE NOT NULL,
        visitors_count INT UNSIGNED NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_attendance_visitors_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
        CONSTRAINT uq_attendance_visitors UNIQUE (service_id, service_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `)
        console.log('✅ Tabela attendance_visitors criada ou já existente.')

        // Indices (usando try catch para ignorar se já existirem)
        try {
            await pool.query('CREATE INDEX idx_attendance_visitors_service ON attendance_visitors (service_id)')
            console.log('✅ Índice idx_attendance_visitors_service criado.')
        } catch (e) { console.log('ℹ️ Índice idx_attendance_visitors_service já existe.') }

        try {
            await pool.query('CREATE INDEX idx_attendance_visitors_date ON attendance_visitors (service_date)')
            console.log('✅ Índice idx_attendance_visitors_date criado.')
        } catch (e) { console.log('ℹ️ Índice idx_attendance_visitors_date já existe.') }

        console.log('🏁 Migração concluída com sucesso!')
    } catch (err) {
        console.error('❌ Erro na migração:', err)
    } finally {
        process.exit()
    }
}

migrate()
