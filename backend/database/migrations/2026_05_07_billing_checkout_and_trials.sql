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

ALTER TABLE tenant_subscriptions
MODIFY COLUMN status ENUM('active','trial','past_due','cancelled') NOT NULL DEFAULT 'active';

ALTER TABLE subscription_checkout_sessions
    ADD COLUMN IF NOT EXISTS provider_preference_id VARCHAR(120) NULL AFTER provider_reference,
    ADD COLUMN IF NOT EXISTS provider_payment_id VARCHAR(120) NULL AFTER provider_preference_id,
    ADD COLUMN IF NOT EXISTS processed_at DATETIME NULL AFTER status;
