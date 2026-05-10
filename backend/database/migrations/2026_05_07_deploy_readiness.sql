-- Deploy readiness incremental migration (idempotent)
USE gymsaas;

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

-- Ensure superadmin role has current required permissions
UPDATE roles
SET permissions = JSON_ARRAY(
    'dashboard.read','reports.read',
    'members.read','members.write','members.delete',
    'plans.read','plans.write','plans.delete',
    'memberships.read','memberships.write','memberships.delete',
    'payments.read','payments.write','payments.delete',
    'attendance.read','attendance.write',
    'subscriptions.manage','subscriptions.manage.catalog',
    'whatsapp.read','whatsapp.send'
),
updated_at = NOW()
WHERE code = 'super_admin';
