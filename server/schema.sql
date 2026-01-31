CREATE DATABASE IF NOT EXISTS sisorchest_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

USE sisorchest_dev;

CREATE TABLE IF NOT EXISTS commons (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_commons_name ON commons (name);

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  phone VARCHAR(40) NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(40) NOT NULL DEFAULT 'member',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  common_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_common FOREIGN KEY (common_id) REFERENCES commons(id) ON DELETE SET NULL
);

CREATE INDEX idx_users_status ON users (status);
CREATE INDEX idx_users_created_at ON users (created_at);

CREATE TABLE IF NOT EXISTS user_approval_audit (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  approved_by BIGINT UNSIGNED NOT NULL,
  note VARCHAR(255) NULL,
  approved_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_approval_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_approval_admin FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_approval_user ON user_approval_audit (user_id);
CREATE INDEX idx_approval_admin ON user_approval_audit (approved_by);

CREATE TABLE IF NOT EXISTS musicians (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  instrument VARCHAR(120) NOT NULL,
  phone VARCHAR(40) NULL,
  email VARCHAR(160) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  common_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_musicians_common FOREIGN KEY (common_id) REFERENCES commons(id) ON DELETE RESTRICT
);

CREATE INDEX idx_musicians_common ON musicians (common_id);
CREATE INDEX idx_musicians_status ON musicians (status);
CREATE INDEX idx_musicians_name ON musicians (name);

CREATE TABLE IF NOT EXISTS services (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  weekday VARCHAR(20) NOT NULL,
  service_time TIME NOT NULL,
  common_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_services_common FOREIGN KEY (common_id) REFERENCES commons(id) ON DELETE RESTRICT
);

CREATE INDEX idx_services_common ON services (common_id);
CREATE INDEX idx_services_weekday_time ON services (weekday, service_time);

CREATE TABLE IF NOT EXISTS attendance (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  service_id BIGINT UNSIGNED NOT NULL,
  musician_id BIGINT UNSIGNED NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'present',
  service_weekday VARCHAR(20) NOT NULL,
  service_date DATE NOT NULL,
  recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_attendance_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_musician FOREIGN KEY (musician_id) REFERENCES musicians(id) ON DELETE CASCADE,
  CONSTRAINT uq_attendance UNIQUE (service_id, musician_id)
);

CREATE INDEX idx_attendance_service ON attendance (service_id);
CREATE INDEX idx_attendance_service_date ON attendance (service_date);
