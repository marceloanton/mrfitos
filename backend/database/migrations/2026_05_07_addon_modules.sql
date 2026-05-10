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

INSERT INTO addon_modules (code, name, description, price_monthly, currency, features, is_active)
VALUES
('whatsapp', 'WhatsApp Automation', 'Reminders and messaging workflows for members', 19, 'USD',
 JSON_OBJECT(
   'whatsapp_read', true,
   'whatsapp_send', true
 ),
 1),
('reports_plus', 'Reports Plus', 'Advanced business and retention reporting', 29, 'USD',
 JSON_OBJECT(
   'reports', true,
   'reports_plus', true
 ),
 1),
('multi_branch', 'Multi Branch', 'Enable multi-gym operations for one tenant', 39, 'USD',
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
