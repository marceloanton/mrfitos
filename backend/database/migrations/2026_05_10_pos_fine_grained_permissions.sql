USE gymsaas;

-- Ensure super_admin has POS fine-grained permissions (idempotent)
UPDATE roles
SET permissions = IFNULL(permissions, JSON_ARRAY()),
    updated_at = NOW()
WHERE code = 'super_admin'
  AND deleted_at IS NULL;

UPDATE roles
SET permissions = JSON_ARRAY_APPEND(permissions, '$', 'pos.read'),
    updated_at = NOW()
WHERE code = 'super_admin'
  AND deleted_at IS NULL
  AND JSON_CONTAINS(permissions, JSON_QUOTE('pos.read')) = 0;

UPDATE roles
SET permissions = JSON_ARRAY_APPEND(permissions, '$', 'pos.sale.create'),
    updated_at = NOW()
WHERE code = 'super_admin'
  AND deleted_at IS NULL
  AND JSON_CONTAINS(permissions, JSON_QUOTE('pos.sale.create')) = 0;

UPDATE roles
SET permissions = JSON_ARRAY_APPEND(permissions, '$', 'pos.product.manage'),
    updated_at = NOW()
WHERE code = 'super_admin'
  AND deleted_at IS NULL
  AND JSON_CONTAINS(permissions, JSON_QUOTE('pos.product.manage')) = 0;

UPDATE roles
SET permissions = JSON_ARRAY_APPEND(permissions, '$', 'pos.stock.manage'),
    updated_at = NOW()
WHERE code = 'super_admin'
  AND deleted_at IS NULL
  AND JSON_CONTAINS(permissions, JSON_QUOTE('pos.stock.manage')) = 0;

UPDATE roles
SET permissions = JSON_ARRAY_APPEND(permissions, '$', 'pos.cash.manage'),
    updated_at = NOW()
WHERE code = 'super_admin'
  AND deleted_at IS NULL
  AND JSON_CONTAINS(permissions, JSON_QUOTE('pos.cash.manage')) = 0;

UPDATE roles
SET permissions = JSON_ARRAY_APPEND(permissions, '$', 'pos.void'),
    updated_at = NOW()
WHERE code = 'super_admin'
  AND deleted_at IS NULL
  AND JSON_CONTAINS(permissions, JSON_QUOTE('pos.void')) = 0;

UPDATE roles
SET permissions = JSON_ARRAY_APPEND(permissions, '$', 'pos.report.read'),
    updated_at = NOW()
WHERE code = 'super_admin'
  AND deleted_at IS NULL
  AND JSON_CONTAINS(permissions, JSON_QUOTE('pos.report.read')) = 0;

UPDATE roles
SET permissions = JSON_ARRAY_APPEND(permissions, '$', 'pos.report.export'),
    updated_at = NOW()
WHERE code = 'super_admin'
  AND deleted_at IS NULL
  AND JSON_CONTAINS(permissions, JSON_QUOTE('pos.report.export')) = 0;
