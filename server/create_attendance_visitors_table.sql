-- ===================================================
-- Script para criar a tabela attendance_visitors
-- Seguro para execução em produção (usa IF NOT EXISTS)
-- 
-- INSTRUÇÕES DE EXECUÇÃO:
-- 
-- Opção 1 - Via linha de comando (RECOMENDADO):
--   mysql -u sisorches_user -p sisorchest_prod < /var/www/sisorchest/server/create_attendance_visitors_table.sql
-- 
-- Opção 2 - Via MySQL CLI:
--   mysql -u sisorches_user -p
--   USE sisorchest_prod;
--   source /var/www/sisorchest/server/create_attendance_visitors_table.sql;
-- 
-- Opção 3 - Copiar e colar no MySQL Workbench ou phpMyAdmin
-- ===================================================

-- Criar a tabela attendance_visitors se ela não existir
CREATE TABLE IF NOT EXISTS attendance_visitors (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_id BIGINT UNSIGNED NOT NULL,
  service_date DATE NOT NULL,
  visitors_count INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_attendance_visitors_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  CONSTRAINT uq_attendance_visitors UNIQUE (service_id, service_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Criar índices para melhorar performance
-- Nota: Se os índices já existirem, você verá um erro "Duplicate key name"
-- Isso é normal e pode ser ignorado - a tabela já está funcionando

-- Índice para service_id (melhora JOINs e filtros por culto)
CREATE INDEX idx_attendance_visitors_service ON attendance_visitors (service_id);

-- Índice para service_date (melhora filtros por data)
CREATE INDEX idx_attendance_visitors_date ON attendance_visitors (service_date);

-- Verificar se a tabela foi criada corretamente
SELECT 
  'Tabela attendance_visitors criada/verificada com sucesso!' AS status,
  COUNT(*) AS total_registros_existentes
FROM attendance_visitors;
