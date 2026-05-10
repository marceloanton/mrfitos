USE gymsaas;

CREATE TABLE IF NOT EXISTS pos_cash_sessions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    gym_id BIGINT UNSIGNED NOT NULL,
    opened_by_user_id BIGINT UNSIGNED NOT NULL,
    closed_by_user_id BIGINT UNSIGNED NULL,
    status ENUM('open','closed') NOT NULL DEFAULT 'open',
    opening_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    expected_amount DECIMAL(12,2) NULL,
    closing_amount DECIMAL(12,2) NULL,
    difference_amount DECIMAL(12,2) NULL,
    opened_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at DATETIME NULL,
    notes VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pcs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_pcs_gym FOREIGN KEY (gym_id) REFERENCES gyms(id),
    CONSTRAINT fk_pcs_open_user FOREIGN KEY (opened_by_user_id) REFERENCES users(id),
    CONSTRAINT fk_pcs_close_user FOREIGN KEY (closed_by_user_id) REFERENCES users(id),
    KEY idx_pcs_scope_status (tenant_id, gym_id, status, opened_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
