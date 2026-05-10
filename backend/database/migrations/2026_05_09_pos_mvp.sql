USE gymsaas;

CREATE TABLE IF NOT EXISTS pos_products (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    gym_id BIGINT UNSIGNED NOT NULL,
    code VARCHAR(60) NOT NULL,
    name VARCHAR(150) NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'ARS',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    deleted_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pos_products_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_pos_products_gym FOREIGN KEY (gym_id) REFERENCES gyms(id),
    UNIQUE KEY uk_pos_products_scope_code (tenant_id, gym_id, code),
    KEY idx_pos_products_scope_active (tenant_id, gym_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pos_sales (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    gym_id BIGINT UNSIGNED NOT NULL,
    member_id BIGINT UNSIGNED NULL,
    sold_by_user_id BIGINT UNSIGNED NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'ARS',
    charge_mode ENUM('immediate','cash','member_account') NOT NULL,
    payment_id BIGINT UNSIGNED NULL,
    notes VARCHAR(255) NULL,
    deleted_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pos_sales_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_pos_sales_gym FOREIGN KEY (gym_id) REFERENCES gyms(id),
    CONSTRAINT fk_pos_sales_member FOREIGN KEY (member_id) REFERENCES members(id),
    CONSTRAINT fk_pos_sales_user FOREIGN KEY (sold_by_user_id) REFERENCES users(id),
    CONSTRAINT fk_pos_sales_payment FOREIGN KEY (payment_id) REFERENCES payments(id),
    KEY idx_pos_sales_scope (tenant_id, gym_id, created_at),
    KEY idx_pos_sales_member (tenant_id, gym_id, member_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pos_sale_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sale_id BIGINT UNSIGNED NOT NULL,
    tenant_id BIGINT UNSIGNED NOT NULL,
    gym_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NULL,
    item_name VARCHAR(150) NOT NULL,
    qty DECIMAL(12,3) NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL,
    line_total DECIMAL(12,2) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pos_sale_items_sale FOREIGN KEY (sale_id) REFERENCES pos_sales(id),
    CONSTRAINT fk_pos_sale_items_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_pos_sale_items_gym FOREIGN KEY (gym_id) REFERENCES gyms(id),
    CONSTRAINT fk_pos_sale_items_product FOREIGN KEY (product_id) REFERENCES pos_products(id),
    KEY idx_pos_sale_items_scope (tenant_id, gym_id, sale_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS member_account_charges (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    gym_id BIGINT UNSIGNED NOT NULL,
    member_id BIGINT UNSIGNED NOT NULL,
    sale_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'ARS',
    status ENUM('pending_auto_debit','settled','cancelled') NOT NULL DEFAULT 'pending_auto_debit',
    settled_payment_id BIGINT UNSIGNED NULL,
    due_date DATE NULL,
    notes VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_mac_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_mac_gym FOREIGN KEY (gym_id) REFERENCES gyms(id),
    CONSTRAINT fk_mac_member FOREIGN KEY (member_id) REFERENCES members(id),
    CONSTRAINT fk_mac_sale FOREIGN KEY (sale_id) REFERENCES pos_sales(id),
    CONSTRAINT fk_mac_payment FOREIGN KEY (settled_payment_id) REFERENCES payments(id),
    KEY idx_mac_scope_status (tenant_id, gym_id, status, due_date),
    KEY idx_mac_member (tenant_id, gym_id, member_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
