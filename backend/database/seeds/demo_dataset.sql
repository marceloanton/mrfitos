USE gymsaas;

SET @tenant_id := 1;
SET @gym_id := 1;
SET @user_id := 1;

-- Clean previous demo data (idempotent)
DELETE FROM whatsapp_batch_items
WHERE message_text LIKE '[DEMO] %';

DELETE FROM whatsapp_batches
WHERE template_text LIKE '[DEMO] %';

DELETE FROM subscription_checkout_sessions
WHERE provider_reference LIKE 'DEMO-%';

DELETE FROM activity_logs
WHERE entity_type = 'demo_seed';

DELETE FROM pos_sale_items
WHERE sale_id IN (
  SELECT id FROM pos_sales WHERE notes LIKE '[DEMO] %'
);

DELETE FROM member_account_charges
WHERE notes LIKE '[DEMO] %';

DELETE FROM pos_sales
WHERE notes LIKE '[DEMO] %';

DELETE FROM pos_products
WHERE code LIKE 'DEMO-%';

DELETE FROM attendance_logs
WHERE notes LIKE '[DEMO] %';

DELETE FROM payments
WHERE external_reference LIKE 'DEMO-%';

DELETE FROM memberships
WHERE member_id IN (
  SELECT id FROM members WHERE member_code LIKE 'DEMO-%'
);

DELETE FROM members
WHERE member_code LIKE 'DEMO-%';

DELETE FROM plans
WHERE code LIKE 'DEMO-%';

-- Demo plans
INSERT INTO plans (
  tenant_id, gym_id, name, code, description, duration_days, price, currency, billing_cycle, is_active, created_at, updated_at
) VALUES
(@tenant_id, @gym_id, 'Plan Demo Semanal', 'DEMO-WEEK', 'Plan semanal demo', 7, 9000, 'ARS', 'weekly', 1, NOW(), NOW()),
(@tenant_id, @gym_id, 'Plan Demo Mensual', 'DEMO-MONTH', 'Plan mensual demo', 30, 30000, 'ARS', 'monthly', 1, NOW(), NOW()),
(@tenant_id, @gym_id, 'Plan Demo Premium', 'DEMO-PREMIUM', 'Plan premium demo', 30, 49000, 'ARS', 'monthly', 1, NOW(), NOW());

SET @plan_week := (SELECT id FROM plans WHERE tenant_id = @tenant_id AND gym_id = @gym_id AND code = 'DEMO-WEEK' LIMIT 1);
SET @plan_month := (SELECT id FROM plans WHERE tenant_id = @tenant_id AND gym_id = @gym_id AND code = 'DEMO-MONTH' LIMIT 1);
SET @plan_premium := (SELECT id FROM plans WHERE tenant_id = @tenant_id AND gym_id = @gym_id AND code = 'DEMO-PREMIUM' LIMIT 1);

-- Number helpers
DROP TEMPORARY TABLE IF EXISTS tmp_demo_nums;
CREATE TEMPORARY TABLE tmp_demo_nums (n INT PRIMARY KEY);
INSERT INTO tmp_demo_nums (n) VALUES
(1),(2),(3),(4),(5),(6),(7),(8),(9),(10),
(11),(12),(13),(14),(15),(16),(17),(18),(19),(20),
(21),(22),(23),(24),(25);

-- Members
INSERT INTO members (
  tenant_id, gym_id, member_code, first_name, last_name, email, phone, notes, status, created_at, updated_at
)
SELECT
  @tenant_id,
  @gym_id,
  CONCAT('DEMO-', LPAD(n, 3, '0')),
  CONCAT('Socio', n),
  'Demo',
  CONCAT('demo', n, '@example.com'),
  CONCAT('+54911', LPAD(100000 + n, 6, '0')),
  '[DEMO] Socio generado para pruebas visuales',
  CASE
    WHEN n % 9 = 0 THEN 'frozen'
    WHEN n % 7 = 0 THEN 'inactive'
    ELSE 'active'
  END,
  NOW() - INTERVAL (30 - n) DAY,
  NOW() - INTERVAL (n % 5) DAY
FROM tmp_demo_nums;

-- Memberships
INSERT INTO memberships (
  tenant_id, gym_id, member_id, plan_id, start_date, end_date, status, auto_renew, created_at, updated_at
)
SELECT
  @tenant_id,
  @gym_id,
  m.id,
  CASE
    WHEN MOD(t.n, 3) = 1 THEN @plan_week
    WHEN MOD(t.n, 3) = 2 THEN @plan_month
    ELSE @plan_premium
  END,
  CURDATE() - INTERVAL (40 - t.n) DAY,
  CURDATE() + INTERVAL (CASE WHEN MOD(t.n, 5) = 0 THEN -3 ELSE (30 - MOD(t.n, 10)) END) DAY,
  CASE
    WHEN MOD(t.n, 5) = 0 THEN 'expired'
    WHEN MOD(t.n, 11) = 0 THEN 'paused'
    ELSE 'active'
  END,
  CASE WHEN MOD(t.n, 4) = 0 THEN 1 ELSE 0 END,
  NOW() - INTERVAL (30 - t.n) DAY,
  NOW() - INTERVAL (t.n % 3) DAY
FROM members m
JOIN tmp_demo_nums t
  ON m.member_code = CONCAT('DEMO-', LPAD(t.n, 3, '0'))
WHERE m.tenant_id = @tenant_id
  AND m.gym_id = @gym_id;

-- Payments
INSERT INTO payments (
  tenant_id, gym_id, member_id, membership_id, received_by_user_id, amount, currency, method, status, paid_at, external_reference, notes, created_at, updated_at
)
SELECT
  @tenant_id,
  @gym_id,
  m.id,
  ms.id,
  @user_id,
  CASE
    WHEN ms.plan_id = @plan_week THEN 9000
    WHEN ms.plan_id = @plan_month THEN 30000
    ELSE 49000
  END,
  'ARS',
  CASE
    WHEN MOD(t.n, 4) = 0 THEN 'mercadopago'
    WHEN MOD(t.n, 4) = 1 THEN 'cash'
    WHEN MOD(t.n, 4) = 2 THEN 'transfer'
    ELSE 'card'
  END,
  CASE WHEN MOD(t.n, 13) = 0 THEN 'failed' ELSE 'paid' END,
  NOW() - INTERVAL MOD(t.n * 2, 28) DAY,
  CONCAT('DEMO-PAY-', LPAD(t.n, 4, '0')),
  '[DEMO] Pago de prueba',
  NOW() - INTERVAL MOD(t.n * 2, 28) DAY,
  NOW()
FROM members m
JOIN tmp_demo_nums t
  ON m.member_code = CONCAT('DEMO-', LPAD(t.n, 3, '0'))
JOIN memberships ms
  ON ms.member_id = m.id
 AND ms.tenant_id = @tenant_id
 AND ms.gym_id = @gym_id
WHERE m.tenant_id = @tenant_id
  AND m.gym_id = @gym_id;

-- Attendance logs
INSERT INTO attendance_logs (
  tenant_id, gym_id, member_id, check_in_at, check_out_at, access_granted, source, notes, created_at, updated_at
)
SELECT
  @tenant_id,
  @gym_id,
  m.id,
  NOW() - INTERVAL MOD((t.n * d.d), 20) DAY - INTERVAL (8 + MOD(t.n, 10)) HOUR,
  NOW() - INTERVAL MOD((t.n * d.d), 20) DAY - INTERVAL (6 + MOD(t.n, 7)) HOUR,
  1,
  CASE WHEN MOD(t.n, 3) = 0 THEN 'qr' ELSE 'manual' END,
  '[DEMO] Asistencia demo',
  NOW(),
  NOW()
FROM members m
JOIN tmp_demo_nums t
  ON m.member_code = CONCAT('DEMO-', LPAD(t.n, 3, '0'))
JOIN (SELECT 1 AS d UNION ALL SELECT 2 UNION ALL SELECT 3) d
WHERE m.tenant_id = @tenant_id
  AND m.gym_id = @gym_id;

-- POS products
INSERT INTO pos_products (
  tenant_id, gym_id, code, name, price, currency, track_stock, stock_qty, is_active, created_at, updated_at
) VALUES
(@tenant_id, @gym_id, 'DEMO-WHEY', 'Whey Protein 1kg', 35000, 'ARS', 1, 24, 1, NOW(), NOW()),
(@tenant_id, @gym_id, 'DEMO-SHAKER', 'Shaker 700ml', 6500, 'ARS', 1, 40, 1, NOW(), NOW()),
(@tenant_id, @gym_id, 'DEMO-BAR', 'Protein Bar', 3200, 'ARS', 1, 90, 1, NOW(), NOW());

SET @prod_whey := (SELECT id FROM pos_products WHERE tenant_id = @tenant_id AND gym_id = @gym_id AND code = 'DEMO-WHEY' LIMIT 1);
SET @prod_shaker := (SELECT id FROM pos_products WHERE tenant_id = @tenant_id AND gym_id = @gym_id AND code = 'DEMO-SHAKER' LIMIT 1);
SET @prod_bar := (SELECT id FROM pos_products WHERE tenant_id = @tenant_id AND gym_id = @gym_id AND code = 'DEMO-BAR' LIMIT 1);

-- POS sales
INSERT INTO pos_sales (
  tenant_id, gym_id, member_id, sold_by_user_id, total_amount, currency, charge_mode, payment_id, receipt_number, notes, created_at, updated_at
)
SELECT
  @tenant_id,
  @gym_id,
  m.id,
  @user_id,
  CASE WHEN MOD(t.n, 3) = 0 THEN 35000 WHEN MOD(t.n, 3) = 1 THEN 6500 ELSE 9600 END,
  'ARS',
  CASE WHEN MOD(t.n, 5) = 0 THEN 'member_account' WHEN MOD(t.n, 2) = 0 THEN 'immediate' ELSE 'cash' END,
  NULL,
  CONCAT('D', DATE_FORMAT(NOW(), '%y%m'), '-', LPAD(t.n, 5, '0')),
  '[DEMO] Venta POS demo',
  NOW() - INTERVAL MOD(t.n, 25) DAY,
  NOW()
FROM members m
JOIN tmp_demo_nums t
  ON m.member_code = CONCAT('DEMO-', LPAD(t.n, 3, '0'))
WHERE m.tenant_id = @tenant_id
  AND m.gym_id = @gym_id
  AND t.n <= 18;

INSERT INTO pos_sale_items (
  sale_id, tenant_id, gym_id, product_id, item_name, qty, unit_price, line_total, created_at, updated_at
)
SELECT
  s.id,
  @tenant_id,
  @gym_id,
  CASE
    WHEN MOD(t.n, 3) = 0 THEN @prod_whey
    WHEN MOD(t.n, 3) = 1 THEN @prod_shaker
    ELSE @prod_bar
  END,
  CASE
    WHEN MOD(t.n, 3) = 0 THEN 'Whey Protein 1kg'
    WHEN MOD(t.n, 3) = 1 THEN 'Shaker 700ml'
    ELSE 'Protein Bar'
  END,
  CASE WHEN MOD(t.n, 3) = 2 THEN 3 ELSE 1 END,
  CASE
    WHEN MOD(t.n, 3) = 0 THEN 35000
    WHEN MOD(t.n, 3) = 1 THEN 6500
    ELSE 3200
  END,
  CASE
    WHEN MOD(t.n, 3) = 0 THEN 35000
    WHEN MOD(t.n, 3) = 1 THEN 6500
    ELSE 9600
  END,
  NOW(),
  NOW()
FROM pos_sales s
JOIN tmp_demo_nums t
  ON s.receipt_number = CONCAT('D', DATE_FORMAT(NOW(), '%y%m'), '-', LPAD(t.n, 5, '0'))
WHERE s.tenant_id = @tenant_id
  AND s.gym_id = @gym_id;

INSERT INTO member_account_charges (
  tenant_id, gym_id, member_id, sale_id, amount, currency, due_date, status, notes, created_at, updated_at
)
SELECT
  @tenant_id,
  @gym_id,
  s.member_id,
  s.id,
  s.total_amount,
  'ARS',
  CURDATE() + INTERVAL 10 DAY,
  CASE WHEN MOD(t.n, 2) = 0 THEN 'pending_auto_debit' ELSE 'settled' END,
  '[DEMO] Cargo a cuenta corriente por POS',
  NOW() - INTERVAL MOD(t.n, 10) DAY,
  NOW()
FROM pos_sales s
JOIN tmp_demo_nums t
  ON s.receipt_number = CONCAT('D', DATE_FORMAT(NOW(), '%y%m'), '-', LPAD(t.n, 5, '0'))
WHERE s.tenant_id = @tenant_id
  AND s.gym_id = @gym_id
  AND s.charge_mode = 'member_account';

-- WhatsApp batches + items
INSERT INTO whatsapp_batches (
  tenant_id, gym_id, created_by_user_id, template_text, status, total_items, sent_items, error_items, created_at, updated_at
) VALUES
(@tenant_id, @gym_id, @user_id, '[DEMO] Recordatorio de vencimiento de cuota', 'partial', 8, 6, 2, NOW() - INTERVAL 3 DAY, NOW()),
(@tenant_id, @gym_id, @user_id, '[DEMO] Promo upgrade plan premium', 'completed', 10, 10, 0, NOW() - INTERVAL 9 DAY, NOW());

SET @wb_1 := (SELECT id FROM whatsapp_batches WHERE tenant_id = @tenant_id AND gym_id = @gym_id AND template_text = '[DEMO] Recordatorio de vencimiento de cuota' LIMIT 1);
SET @wb_2 := (SELECT id FROM whatsapp_batches WHERE tenant_id = @tenant_id AND gym_id = @gym_id AND template_text = '[DEMO] Promo upgrade plan premium' LIMIT 1);

INSERT INTO whatsapp_batch_items (
  batch_id, tenant_id, gym_id, member_id, membership_id, phone_normalized, message_text, whatsapp_link, send_status, sent_at, error_message, created_at, updated_at
)
SELECT
  CASE WHEN t.n <= 8 THEN @wb_1 ELSE @wb_2 END,
  @tenant_id,
  @gym_id,
  m.id,
  ms.id,
  CONCAT('54911', LPAD(100000 + t.n, 6, '0')),
  '[DEMO] Mensaje de WhatsApp',
  CONCAT('https://wa.me/54911', LPAD(100000 + t.n, 6, '0')),
  CASE
    WHEN t.n IN (4, 7) THEN 'error'
    ELSE 'sent'
  END,
  NOW() - INTERVAL MOD(t.n, 6) DAY,
  CASE WHEN t.n IN (4, 7) THEN 'Sin respuesta de cliente' ELSE NULL END,
  NOW(),
  NOW()
FROM members m
JOIN tmp_demo_nums t
  ON m.member_code = CONCAT('DEMO-', LPAD(t.n, 3, '0'))
JOIN memberships ms
  ON ms.member_id = m.id
 AND ms.tenant_id = @tenant_id
 AND ms.gym_id = @gym_id
WHERE m.tenant_id = @tenant_id
  AND m.gym_id = @gym_id
  AND t.n <= 18;

-- Billing checkout sessions (for Admin Billing analytics)
SET @sp_free := (SELECT id FROM subscription_plans WHERE code = 'free' LIMIT 1);
SET @sp_pro := (SELECT id FROM subscription_plans WHERE code = 'pro' LIMIT 1);
SET @sp_scale := (SELECT id FROM subscription_plans WHERE code = 'scale' LIMIT 1);
SET @addon_whatsapp := (SELECT id FROM addon_modules WHERE code = 'whatsapp' LIMIT 1);

INSERT INTO subscription_checkout_sessions (
  tenant_id, plan_id, addon_id, provider, provider_reference, provider_preference_id, provider_payment_id, checkout_url, amount, currency, status, processed_at, expires_at, metadata, created_at, updated_at
)
VALUES
(@tenant_id, @sp_pro, NULL, 'mercadopago', 'DEMO-CHK-0001', 'DEMO-PREF-0001', 'DEMO-PAYMENT-0001', 'https://demo.checkout/1', 74900, 'ARS', 'approved', NOW() - INTERVAL 20 DAY, NOW() + INTERVAL 2 DAY, JSON_OBJECT('source','admin_subscription'), NOW() - INTERVAL 22 DAY, NOW()),
(@tenant_id, @sp_scale, NULL, 'mercadopago', 'DEMO-CHK-0002', 'DEMO-PREF-0002', NULL, 'https://demo.checkout/2', 124900, 'ARS', 'pending', NULL, NOW() + INTERVAL 1 DAY, JSON_OBJECT('source','self_service_upgrade'), NOW() - INTERVAL 2 DAY, NOW()),
(@tenant_id, NULL, @addon_whatsapp, 'mercadopago', 'DEMO-CHK-0003', 'DEMO-PREF-0003', 'DEMO-PAYMENT-0003', 'https://demo.checkout/3', 8900, 'ARS', 'approved', NOW() - INTERVAL 7 DAY, NOW() + INTERVAL 2 DAY, JSON_OBJECT('source','self_service_upgrade'), NOW() - INTERVAL 8 DAY, NOW()),
(@tenant_id, @sp_pro, NULL, 'mercadopago', 'DEMO-CHK-0004', 'DEMO-PREF-0004', NULL, 'https://demo.checkout/4', 74900, 'ARS', 'rejected', NOW() - INTERVAL 5 DAY, NOW() + INTERVAL 2 DAY, JSON_OBJECT('source','admin_subscription'), NOW() - INTERVAL 6 DAY, NOW()),
(@tenant_id, @sp_pro, NULL, 'mercadopago', 'DEMO-CHK-0005', 'DEMO-PREF-0005', NULL, 'https://demo.checkout/5', 74900, 'ARS', 'expired', NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 1 HOUR, JSON_OBJECT('source','self_service_upgrade'), NOW() - INTERVAL 3 DAY, NOW());

-- Tracking events for Billing panel
INSERT INTO activity_logs (
  tenant_id, gym_id, user_id, entity_type, entity_id, action, metadata, ip_address, user_agent, created_at, updated_at
)
VALUES
(@tenant_id, @gym_id, @user_id, 'tracking_event', NULL, 'upgrade_banner_click', JSON_OBJECT('context','admin_subscription'), '127.0.0.1', 'demo-seed', NOW() - INTERVAL 10 DAY, NOW()),
(@tenant_id, @gym_id, @user_id, 'tracking_event', NULL, 'upgrade_badge_click', JSON_OBJECT('context','admin_subscription'), '127.0.0.1', 'demo-seed', NOW() - INTERVAL 9 DAY, NOW()),
(@tenant_id, @gym_id, @user_id, 'tracking_event', NULL, 'upgrade_pay_now_click', JSON_OBJECT('context','admin_subscription'), '127.0.0.1', 'demo-seed', NOW() - INTERVAL 8 DAY, NOW()),
(@tenant_id, @gym_id, @user_id, 'tracking_event', NULL, 'checkout_created', JSON_OBJECT('context','admin_subscription'), '127.0.0.1', 'demo-seed', NOW() - INTERVAL 8 DAY, NOW()),
(@tenant_id, @gym_id, @user_id, 'tracking_event', NULL, 'upgrade_recommended_cta_click', JSON_OBJECT('context','self_service_upgrade'), '127.0.0.1', 'demo-seed', NOW() - INTERVAL 4 DAY, NOW()),
(@tenant_id, @gym_id, @user_id, 'tracking_event', NULL, 'upgrade_recommended_cta_click_plan_pro', JSON_OBJECT('context','self_service_upgrade'), '127.0.0.1', 'demo-seed', NOW() - INTERVAL 4 DAY, NOW()),
(@tenant_id, @gym_id, @user_id, 'tracking_event', NULL, 'checkout_created_recommended_plan_pro', JSON_OBJECT('context','self_service_upgrade'), '127.0.0.1', 'demo-seed', NOW() - INTERVAL 4 DAY, NOW()),
(@tenant_id, @gym_id, @user_id, 'tracking_event', NULL, 'checkout_created', JSON_OBJECT('context','self_service_upgrade'), '127.0.0.1', 'demo-seed', NOW() - INTERVAL 4 DAY, NOW()),
(@tenant_id, @gym_id, @user_id, 'demo_seed', NULL, 'seed_loaded', JSON_OBJECT('members',25,'pos_sales',18,'checkouts',5), '127.0.0.1', 'demo-seed', NOW(), NOW());

DROP TEMPORARY TABLE IF EXISTS tmp_demo_nums;
