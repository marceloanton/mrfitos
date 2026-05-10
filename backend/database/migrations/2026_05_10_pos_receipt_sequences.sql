ALTER TABLE pos_sales
    ADD COLUMN receipt_number VARCHAR(40) NULL AFTER payment_id;

CREATE TABLE IF NOT EXISTS pos_receipt_sequences (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id BIGINT UNSIGNED NOT NULL,
    gym_id BIGINT UNSIGNED NOT NULL,
    next_number BIGINT UNSIGNED NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_pos_receipt_sequences_tenant_gym (tenant_id, gym_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE pos_sales
    ADD UNIQUE KEY uk_pos_sales_receipt_number (tenant_id, gym_id, receipt_number);
