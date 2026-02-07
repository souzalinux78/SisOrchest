-- ===================================================
-- Script para atualizar a constraint UNIQUE da tabela attendance
-- Necessário para permitir múltiplos registros do mesmo músico no mesmo culto (em datas diferentes)
-- 
-- INSTRUÇÕES DE EXECUÇÃO:
-- 
-- Opção 1 - Via linha de comando:
--   mysql -u sisorches_user -p sisorchest_prod < /var/www/sisorchest/server/update_attendance_unique_constraint.sql
-- 
-- Opção 2 - Via MySQL CLI ou Workbench:
--   USE sisorchest_prod;
--   ALTER TABLE attendance DROP INDEX uq_attendance;
--   ALTER TABLE attendance ADD CONSTRAINT uq_attendance UNIQUE (service_id, musician_id, service_date);
-- ===================================================

-- 1. Remove a constraint antiga (service_id, musician_id)
ALTER TABLE `attendance` DROP INDEX `uq_attendance`;

-- 2. Adiciona a nova constraint (service_id, musician_id, service_date)
ALTER TABLE `attendance` ADD CONSTRAINT `uq_attendance` UNIQUE (`service_id`, `musician_id`, `service_date`);

-- Confirmação
SELECT 'Constraint uq_attendance atualizada com sucesso!' AS status;
