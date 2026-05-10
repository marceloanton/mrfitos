USE gymsaas;

CREATE TABLE IF NOT EXISTS pos_stock_movements (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    gym_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    movement_type ENUM('in','out','adjustment') NOT NULL,
    qty DECIMAL(12,3) NOT NULL,
    balance_after DECIMAL(12,3) NOT NULL,
    reference_type VARCHAR(40) NULL,
    reference_id BIGINT UNSIGNED NULL,
    created_by_user_id BIGINT UNSIGNED NULL,
    notes VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_psm_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_psm_gym FOREIGN KEY (gym_id) REFERENCES gyms(id),
    CONSTRAINT fk_psm_product FOREIGN KEY (product_id) REFERENCES pos_products(id),
    CONSTRAINT fk_psm_user FOREIGN KEY (created_by_user_id) REFERENCES users(id),
    KEY idx_psm_scope_time (tenant_id, gym_id, created_at),
    KEY idx_psm_product_time (product_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
