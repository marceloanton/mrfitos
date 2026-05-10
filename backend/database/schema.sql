-- Gym SaaS MVP Multi-tenant Schema
-- Target: MySQL 8+/MariaDB 10.5+

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS api_keys;
DROP TABLE IF EXISTS password_resets;
DROP TABLE IF EXISTS attendance_logs;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS memberships;
DROP TABLE IF EXISTS plans;
DROP TABLE IF EXISTS members;
DROP TABLE IF EXISTS user_gym_roles;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS gyms;
DROP TABLE IF EXISTS tenants;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE tenants (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(120) NOT NULL,
    status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
    deleted_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_tenants_slug (slug),
    KEY idx_tenants_status (status),
    KEY idx_tenants_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE gyms (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) NOT NULL,
    timezone VARCHAR(60) NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
    address VARCHAR(255) NULL,
    phone VARCHAR(50) NULL,
    email VARCHAR(150) NULL,
    status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    deleted_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_gyms_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    UNIQUE KEY uk_gyms_tenant_code (tenant_id, code),
    UNIQUE KEY uk_gyms_tenant_name (tenant_id, name),
    KEY idx_gyms_tenant_status (tenant_id, status),
    KEY idx_gyms_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    email VARCHAR(190) NOT NULL,
    username VARCHAR(100) NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(50) NULL,
    is_super_admin TINYINT(1) NOT NULL DEFAULT 0,
    status ENUM('active', 'inactive', 'blocked') NOT NULL DEFAULT 'active',
    last_login_at DATETIME NULL,
    deleted_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT chk_users_superadmin_not_deleted CHECK (NOT (is_super_admin = 1 AND deleted_at IS NOT NULL)),
    UNIQUE KEY uk_users_tenant_email (tenant_id, email),
    UNIQUE KEY uk_users_tenant_username (tenant_id, username),
    KEY idx_users_tenant_status (tenant_id, status),
    KEY idx_users_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE roles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    gym_id BIGINT UNSIGNED NULL,
    name VARCHAR(80) NOT NULL,
    code VARCHAR(80) NOT NULL,
    description VARCHAR(255) NULL,
    permissions JSON NULL,
    is_system TINYINT(1) NOT NULL DEFAULT 0,
    deleted_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_roles_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_roles_gym FOREIGN KEY (gym_id) REFERENCES gyms(id),
    UNIQUE KEY uk_roles_scope_code (tenant_id, gym_id, code),
    UNIQUE KEY uk_roles_scope_name (tenant_id, gym_id, name),
    KEY idx_roles_tenant (tenant_id),
    KEY idx_roles_gym (gym_id),
    KEY idx_roles_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE user_gym_roles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    gym_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    role_id BIGINT UNSIGNED NOT NULL,
    assigned_by BIGINT UNSIGNED NULL,
    deleted_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_ugr_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_ugr_gym FOREIGN KEY (gym_id) REFERENCES gyms(id),
    CONSTRAINT fk_ugr_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_ugr_role FOREIGN KEY (role_id) REFERENCES roles(id),
    CONSTRAINT fk_ugr_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id),
    UNIQUE KEY uk_ugr_unique_assignment (tenant_id, gym_id, user_id, role_id),
    KEY idx_ugr_user (user_id),
    KEY idx_ugr_role (role_id),
    KEY idx_ugr_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE members (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    gym_id BIGINT UNSIGNED NOT NULL,
    member_code VARCHAR(50) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(190) NULL,
    phone VARCHAR(50) NULL,
    birth_date DATE NULL,
    emergency_contact VARCHAR(150) NULL,
    notes TEXT NULL,
    status ENUM('active', 'inactive', 'frozen') NOT NULL DEFAULT 'active',
    deleted_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_members_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_members_gym FOREIGN KEY (gym_id) REFERENCES gyms(id),
    UNIQUE KEY uk_members_gym_code (tenant_id, gym_id, member_code),
    UNIQUE KEY uk_members_gym_email (tenant_id, gym_id, email),
    KEY idx_members_name (tenant_id, gym_id, last_name, first_name),
    KEY idx_members_status (tenant_id, gym_id, status),
    KEY idx_members_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE plans (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    gym_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(120) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description VARCHAR(255) NULL,
    duration_days INT UNSIGNED NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'ARS',
    billing_cycle ENUM('one_time', 'weekly', 'monthly', 'yearly') NOT NULL DEFAULT 'monthly',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    deleted_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_plans_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_plans_gym FOREIGN KEY (gym_id) REFERENCES gyms(id),
    CONSTRAINT chk_plans_duration_days_positive CHECK (duration_days > 0),
    CONSTRAINT chk_plans_price_non_negative CHECK (price >= 0),
    UNIQUE KEY uk_plans_gym_code (tenant_id, gym_id, code),
    UNIQUE KEY uk_plans_gym_name (tenant_id, gym_id, name),
    KEY idx_plans_status (tenant_id, gym_id, is_active),
    KEY idx_plans_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE memberships (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    gym_id BIGINT UNSIGNED NOT NULL,
    member_id BIGINT UNSIGNED NOT NULL,
    plan_id BIGINT UNSIGNED NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status ENUM('active', 'expired', 'cancelled', 'paused') NOT NULL DEFAULT 'active',
    auto_renew TINYINT(1) NOT NULL DEFAULT 0,
    cancelled_at DATETIME NULL,
    deleted_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_memberships_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_memberships_gym FOREIGN KEY (gym_id) REFERENCES gyms(id),
    CONSTRAINT fk_memberships_member FOREIGN KEY (member_id) REFERENCES members(id),
    CONSTRAINT fk_memberships_plan FOREIGN KEY (plan_id) REFERENCES plans(id),
    CONSTRAINT chk_memberships_date_range CHECK (end_date >= start_date),
    KEY idx_memberships_member_dates (tenant_id, gym_id, member_id, start_date, end_date),
    KEY idx_memberships_member_status_end (tenant_id, gym_id, member_id, status, end_date),
    KEY idx_memberships_plan (tenant_id, gym_id, plan_id),
    KEY idx_memberships_status (tenant_id, gym_id, status),
    KEY idx_memberships_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE payments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    gym_id BIGINT UNSIGNED NOT NULL,
    member_id BIGINT UNSIGNED NOT NULL,
    membership_id BIGINT UNSIGNED NULL,
    received_by_user_id BIGINT UNSIGNED NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'ARS',
    method ENUM('cash', 'card', 'transfer', 'mercadopago', 'other') NOT NULL,
    status ENUM('pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'paid',
    paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    external_reference VARCHAR(120) NULL,
    notes VARCHAR(255) NULL,
    deleted_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_payments_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_payments_gym FOREIGN KEY (gym_id) REFERENCES gyms(id),
    CONSTRAINT fk_payments_member FOREIGN KEY (member_id) REFERENCES members(id),
    CONSTRAINT fk_payments_membership FOREIGN KEY (membership_id) REFERENCES memberships(id),
    CONSTRAINT fk_payments_user FOREIGN KEY (received_by_user_id) REFERENCES users(id),
    CONSTRAINT chk_payments_amount_positive CHECK (amount > 0),
    UNIQUE KEY uk_payments_external_ref (tenant_id, gym_id, external_reference),
    KEY idx_payments_member (tenant_id, gym_id, member_id),
    KEY idx_payments_membership_paid_at (tenant_id, gym_id, membership_id, paid_at),
    KEY idx_payments_member_status_paid_at (tenant_id, gym_id, member_id, status, paid_at),
    KEY idx_payments_paid_at (tenant_id, gym_id, paid_at),
    KEY idx_payments_status (tenant_id, gym_id, status),
    KEY idx_payments_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE attendance_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    gym_id BIGINT UNSIGNED NOT NULL,
    member_id BIGINT UNSIGNED NOT NULL,
    check_in_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    check_out_at DATETIME NULL,
    access_granted TINYINT(1) NOT NULL DEFAULT 1,
    source ENUM('manual', 'qr', 'rfid', 'biometric', 'api') NOT NULL DEFAULT 'manual',
    notes VARCHAR(255) NULL,
    deleted_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_attendance_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_attendance_gym FOREIGN KEY (gym_id) REFERENCES gyms(id),
    CONSTRAINT fk_attendance_member FOREIGN KEY (member_id) REFERENCES members(id),
    KEY idx_attendance_member_date (tenant_id, gym_id, member_id, check_in_at),
    KEY idx_attendance_checkin (tenant_id, gym_id, check_in_at),
    KEY idx_attendance_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE password_resets (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_password_resets_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_password_resets_user FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE KEY uk_password_resets_token (token),
    KEY idx_password_resets_lookup (tenant_id, user_id, expires_at),
    KEY idx_password_resets_used_at (used_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE api_keys (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    gym_id BIGINT UNSIGNED NULL,
    name VARCHAR(120) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    last_used_at DATETIME NULL,
    expires_at DATETIME NULL,
    revoked_at DATETIME NULL,
    deleted_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_api_keys_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_api_keys_gym FOREIGN KEY (gym_id) REFERENCES gyms(id),
    UNIQUE KEY uk_api_keys_key_hash (key_hash),
    UNIQUE KEY uk_api_keys_scope_name (tenant_id, gym_id, name),
    KEY idx_api_keys_active (tenant_id, gym_id, revoked_at, expires_at),
    KEY idx_api_keys_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE activity_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    gym_id BIGINT UNSIGNED NULL,
    user_id BIGINT UNSIGNED NULL,
    entity_type VARCHAR(80) NOT NULL,
    entity_id BIGINT UNSIGNED NULL,
    action VARCHAR(80) NOT NULL,
    metadata JSON NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_activity_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_activity_gym FOREIGN KEY (gym_id) REFERENCES gyms(id),
    CONSTRAINT fk_activity_user FOREIGN KEY (user_id) REFERENCES users(id),
    KEY idx_activity_tenant_time (tenant_id, created_at),
    KEY idx_activity_gym_time (gym_id, created_at),
    KEY idx_activity_entity (tenant_id, entity_type, entity_id),
    KEY idx_activity_action (tenant_id, action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------
-- Bootstrap data (MVP)
-- ---------------------------------------

INSERT INTO tenants (id, name, slug, status, created_at, updated_at)
VALUES (1, 'GymSaaS Tenant', 'gymsaas-tenant', 'active', NOW(), NOW());

INSERT INTO gyms (id, tenant_id, name, code, timezone, status, created_at, updated_at)
VALUES (1, 1, 'GymSaaS Central', 'CENTRAL', 'America/Argentina/Buenos_Aires', 'active', NOW(), NOW());

INSERT INTO users (
    id, tenant_id, email, username, password_hash, first_name, last_name, is_super_admin, status, created_at, updated_at
) VALUES (
    1,
    1,
    'admin@manager.net.ar',
    'superadmin',
    '$2y$10$h4NBuEH.41Qi5sNqCZv.du2YQgDp.Q4rz7tgbnY9yUC7eYnY2WAfW',
    'Super',
    'Admin',
    1,
    'active',
    NOW(),
    NOW()
);

INSERT INTO roles (
    id, tenant_id, gym_id, name, code, description, permissions, is_system, created_at, updated_at
) VALUES (
    1,
    1,
    1,
    'Super Admin',
    'super_admin',
    'Full access role',
    JSON_ARRAY(
        'members.read','members.write','members.delete',
        'plans.read','plans.write','plans.delete',
        'memberships.read','memberships.write','memberships.delete',
        'payments.read','payments.write','payments.delete',
        'attendance.read','attendance.write','dashboard.read','reports.read','subscriptions.manage','subscriptions.manage.catalog','whatsapp.read','whatsapp.send'
    ),
    1,
    NOW(),
    NOW()
);

INSERT INTO user_gym_roles (
    id, tenant_id, gym_id, user_id, role_id, assigned_by, created_at, updated_at
) VALUES (
    1,
    1,
    1,
    1,
    1,
    1,
    NOW(),
    NOW()
);

CREATE TABLE IF NOT EXISTS protected_users (
    user_id BIGINT UNSIGNED PRIMARY KEY,
    reason VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_protected_users_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO protected_users (user_id, reason)
VALUES (1, 'System superadmin cannot be deleted');



-- WhatsApp batch tracking tables
CREATE TABLE IF NOT EXISTS whatsapp_batches (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    gym_id BIGINT UNSIGNED NOT NULL,
    created_by_user_id BIGINT UNSIGNED NULL,
    template_text TEXT NOT NULL,
    status ENUM('pending','partial','completed','cancelled') NOT NULL DEFAULT 'pending',
    total_items INT UNSIGNED NOT NULL DEFAULT 0,
    sent_items INT UNSIGNED NOT NULL DEFAULT 0,
    error_items INT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_wb_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_wb_gym FOREIGN KEY (gym_id) REFERENCES gyms(id),
    CONSTRAINT fk_wb_user FOREIGN KEY (created_by_user_id) REFERENCES users(id),
    KEY idx_wb_scope_time (tenant_id, gym_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS whatsapp_batch_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    batch_id BIGINT UNSIGNED NOT NULL,
    tenant_id BIGINT UNSIGNED NOT NULL,
    gym_id BIGINT UNSIGNED NOT NULL,
    member_id BIGINT UNSIGNED NOT NULL,
    membership_id BIGINT UNSIGNED NOT NULL,
    phone_normalized VARCHAR(30) NULL,
    message_text TEXT NOT NULL,
    whatsapp_link TEXT NULL,
    send_status ENUM('pending','sent','error') NOT NULL DEFAULT 'pending',
    sent_at DATETIME NULL,
    error_message VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_wbi_batch FOREIGN KEY (batch_id) REFERENCES whatsapp_batches(id),
    CONSTRAINT fk_wbi_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_wbi_gym FOREIGN KEY (gym_id) REFERENCES gyms(id),
    CONSTRAINT fk_wbi_member FOREIGN KEY (member_id) REFERENCES members(id),
    CONSTRAINT fk_wbi_membership FOREIGN KEY (membership_id) REFERENCES memberships(id),
    KEY idx_wbi_batch_status (batch_id, send_status),
    KEY idx_wbi_scope (tenant_id, gym_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- Subscription core for monetization
CREATE TABLE IF NOT EXISTS subscription_plans (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    price_monthly DECIMAL(12,2) NOT NULL DEFAULT 0,
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    features JSON NOT NULL,
    limits_json JSON NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_subscription_plans_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tenant_subscriptions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    plan_id BIGINT UNSIGNED NOT NULL,
    status ENUM('active','trial','past_due','cancelled') NOT NULL DEFAULT 'active',
    started_at DATETIME NOT NULL,
    ends_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_tenant_subscriptions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_tenant_subscriptions_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id),
    KEY idx_tenant_subscriptions_scope (tenant_id, status, ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subscription_checkout_sessions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    plan_id BIGINT UNSIGNED NULL,
    addon_id BIGINT UNSIGNED NULL,
    provider ENUM('mercadopago') NOT NULL,
    provider_reference VARCHAR(120) NOT NULL,
    provider_preference_id VARCHAR(120) NULL,
    provider_payment_id VARCHAR(120) NULL,
    checkout_url TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    status ENUM('pending','approved','rejected','expired') NOT NULL DEFAULT 'pending',
    processed_at DATETIME NULL,
    expires_at DATETIME NULL,
    metadata JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_scs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_scs_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id),
    CONSTRAINT fk_scs_addon FOREIGN KEY (addon_id) REFERENCES addon_modules(id),
    UNIQUE KEY uk_scs_provider_reference (provider_reference),
    KEY idx_scs_provider_preference (provider_preference_id),
    KEY idx_scs_provider_payment (provider_payment_id),
    KEY idx_scs_scope_status (tenant_id, status, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS addon_modules (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,
    price_monthly DECIMAL(12,2) NOT NULL DEFAULT 0,
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    features JSON NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_addon_modules_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tenant_addon_subscriptions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    addon_id BIGINT UNSIGNED NOT NULL,
    status ENUM('active','cancelled') NOT NULL DEFAULT 'active',
    started_at DATETIME NOT NULL,
    ends_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_tenant_addon_subscriptions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_tenant_addon_subscriptions_addon FOREIGN KEY (addon_id) REFERENCES addon_modules(id),
    KEY idx_tenant_addon_subscriptions_scope (tenant_id, status, ends_at),
    KEY idx_tenant_addon_subscriptions_addon (addon_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO subscription_plans (code, name, price_monthly, currency, features, limits_json, is_active)
VALUES
('free', 'Starter', 29900, 'ARS',
 JSON_OBJECT(
   'dashboard', true,
   'members', true,
   'plans', true,
   'memberships', true,
   'payments', true,
   'attendance', true,
   'whatsapp_read', false,
   'whatsapp_send', false,
   'reports', false
 ),
 JSON_OBJECT(
   'max_members', 60,
   'max_staff_users', 1,
   'max_gyms', 1,
   'max_monthly_payments', 90,
   'max_monthly_checkins', 250
 ),
 1),
('pro', 'Pro', 74900, 'ARS',
 JSON_OBJECT(
   'dashboard', true,
   'members', true,
   'plans', true,
   'memberships', true,
   'payments', true,
   'attendance', true,
   'whatsapp_read', true,
   'whatsapp_send', true,
   'reports', true
 ),
 JSON_OBJECT(
   'max_members', 250,
   'max_staff_users', 6,
   'max_gyms', 2,
   'max_monthly_payments', 600,
   'max_monthly_checkins', 2000
 ),
 1),
('scale', 'Scale', 124900, 'ARS',
 JSON_OBJECT(
   'dashboard', true,
   'members', true,
   'plans', true,
   'memberships', true,
   'payments', true,
   'attendance', true,
   'whatsapp_read', true,
   'whatsapp_send', true,
   'reports', true
 ),
 JSON_OBJECT(
   'max_members', 999999,
   'max_staff_users', 999999,
   'max_gyms', 10,
   'max_monthly_payments', 999999,
   'max_monthly_checkins', 999999
 ),
 1)
ON DUPLICATE KEY UPDATE
  name=VALUES(name),
  price_monthly=VALUES(price_monthly),
  currency=VALUES(currency),
  features=VALUES(features),
  limits_json=VALUES(limits_json),
  is_active=VALUES(is_active),
  updated_at=NOW();

INSERT INTO addon_modules (code, name, description, price_monthly, currency, features, is_active)
VALUES
('whatsapp', 'WhatsApp Automation', 'Recordatorios y workflows de cobranza por WhatsApp', 8900, 'ARS',
 JSON_OBJECT(
   'whatsapp_read', true,
   'whatsapp_send', true
 ),
 1),
('reports_plus', 'Reports Plus', 'Reportes avanzados de negocio y retención', 12900, 'ARS',
 JSON_OBJECT(
   'reports', true,
   'reports_plus', true
 ),
 1),
('multi_branch', 'Multi Branch', 'Operación multi-sede para un mismo tenant', 17900, 'ARS',
 JSON_OBJECT(
   'multi_branch', true
 ),
 1)
ON DUPLICATE KEY UPDATE
  name=VALUES(name),
  description=VALUES(description),
  price_monthly=VALUES(price_monthly),
  currency=VALUES(currency),
  features=VALUES(features),
  is_active=VALUES(is_active),
  updated_at=NOW();

-- Assign FREE plan by default to tenant 1 if no active subscription exists
INSERT INTO tenant_subscriptions (tenant_id, plan_id, status, started_at, ends_at)
SELECT 1, sp.id, 'active', NOW(), NULL
FROM subscription_plans sp
WHERE sp.code = 'free'
  AND NOT EXISTS (
    SELECT 1 FROM tenant_subscriptions ts WHERE ts.tenant_id = 1 AND ts.status = 'active'
  );

