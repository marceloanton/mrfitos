USE gymsaas;

-- Base dataset first
SOURCE backend/database/seeds/demo_dataset.sql;

SET @tenant_id := 1;
SET @gym_id := 1;
SET @user_id := 1;

-- Force more expired memberships and inactive members for a harsher scenario
UPDATE memberships ms
JOIN members m ON m.id = ms.member_id
SET
  ms.status = CASE
    WHEN CAST(SUBSTRING(m.member_code, 6) AS UNSIGNED) % 2 = 0 THEN 'expired'
    WHEN CAST(SUBSTRING(m.member_code, 6) AS UNSIGNED) % 7 = 0 THEN 'paused'
    ELSE ms.status
  END,
  ms.end_date = CASE
    WHEN CAST(SUBSTRING(m.member_code, 6) AS UNSIGNED) % 2 = 0 THEN CURDATE() - INTERVAL (CAST(SUBSTRING(m.member_code, 6) AS UNSIGNED) % 12 + 1) DAY
    ELSE ms.end_date
  END,
  ms.updated_at = NOW()
WHERE m.tenant_id = @tenant_id
  AND m.gym_id = @gym_id
  AND m.member_code LIKE 'DEMO-%';

UPDATE members
SET status = CASE
  WHEN CAST(SUBSTRING(member_code, 6) AS UNSIGNED) % 5 = 0 THEN 'inactive'
  WHEN CAST(SUBSTRING(member_code, 6) AS UNSIGNED) % 9 = 0 THEN 'frozen'
  ELSE status
END,
updated_at = NOW()
WHERE tenant_id = @tenant_id
  AND gym_id = @gym_id
  AND member_code LIKE 'DEMO-%';

-- More failed/pending payments
UPDATE payments
SET status = CASE
  WHEN external_reference LIKE 'DEMO-PAY-%' AND CAST(SUBSTRING(external_reference, 10) AS UNSIGNED) % 3 = 0 THEN 'failed'
  WHEN external_reference LIKE 'DEMO-PAY-%' AND CAST(SUBSTRING(external_reference, 10) AS UNSIGNED) % 5 = 0 THEN 'pending'
  ELSE status
END,
updated_at = NOW()
WHERE tenant_id = @tenant_id
  AND gym_id = @gym_id
  AND external_reference LIKE 'DEMO-PAY-%';

-- Member account debt pressure
UPDATE member_account_charges
SET status = 'pending_auto_debit',
due_date = CURDATE() - INTERVAL 4 DAY,
updated_at = NOW()
WHERE tenant_id = @tenant_id
  AND gym_id = @gym_id
  AND notes LIKE '[DEMO] %';

-- Add more checkout sessions with low approval ratio
DELETE FROM subscription_checkout_sessions
WHERE provider_reference LIKE 'DEMO-AGG-%';

SET @sp_pro := (SELECT id FROM subscription_plans WHERE code = 'pro' LIMIT 1);
SET @sp_scale := (SELECT id FROM subscription_plans WHERE code = 'scale' LIMIT 1);
SET @addon_whatsapp := (SELECT id FROM addon_modules WHERE code = 'whatsapp' LIMIT 1);

INSERT INTO subscription_checkout_sessions (
  tenant_id, plan_id, addon_id, provider, provider_reference, provider_preference_id, provider_payment_id,
  checkout_url, amount, currency, status, processed_at, expires_at, metadata, created_at, updated_at
) VALUES
(@tenant_id, @sp_pro, NULL, 'mercadopago', 'DEMO-AGG-CHK-0001', 'DEMO-AGG-PREF-0001', NULL, 'https://demo.checkout/ag1', 74900, 'ARS', 'rejected', NOW() - INTERVAL 12 DAY, NOW() + INTERVAL 1 DAY, JSON_OBJECT('source','admin_subscription','scenario','aggressive'), NOW() - INTERVAL 12 DAY, NOW()),
(@tenant_id, @sp_pro, NULL, 'mercadopago', 'DEMO-AGG-CHK-0002', 'DEMO-AGG-PREF-0002', NULL, 'https://demo.checkout/ag2', 74900, 'ARS', 'expired', NOW() - INTERVAL 10 DAY, NOW() - INTERVAL 1 DAY, JSON_OBJECT('source','self_service_upgrade','scenario','aggressive'), NOW() - INTERVAL 10 DAY, NOW()),
(@tenant_id, @sp_scale, NULL, 'mercadopago', 'DEMO-AGG-CHK-0003', 'DEMO-AGG-PREF-0003', NULL, 'https://demo.checkout/ag3', 124900, 'ARS', 'pending', NULL, NOW() + INTERVAL 2 DAY, JSON_OBJECT('source','admin_subscription','scenario','aggressive'), NOW() - INTERVAL 5 DAY, NOW()),
(@tenant_id, NULL, @addon_whatsapp, 'mercadopago', 'DEMO-AGG-CHK-0004', 'DEMO-AGG-PREF-0004', NULL, 'https://demo.checkout/ag4', 8900, 'ARS', 'rejected', NOW() - INTERVAL 3 DAY, NOW() + INTERVAL 2 DAY, JSON_OBJECT('source','self_service_upgrade','scenario','aggressive'), NOW() - INTERVAL 3 DAY, NOW()),
(@tenant_id, @sp_pro, NULL, 'mercadopago', 'DEMO-AGG-CHK-0005', 'DEMO-AGG-PREF-0005', 'DEMO-AGG-PAY-0005', 'https://demo.checkout/ag5', 74900, 'ARS', 'approved', NOW() - INTERVAL 1 DAY, NOW() + INTERVAL 5 DAY, JSON_OBJECT('source','self_service_upgrade','scenario','aggressive'), NOW() - INTERVAL 1 DAY, NOW());

-- Extra tracking volume with more clicks than approvals
INSERT INTO activity_logs (
  tenant_id, gym_id, user_id, entity_type, entity_id, action, metadata, ip_address, user_agent, created_at, updated_at
)
VALUES
(@tenant_id, @gym_id, @user_id, 'tracking_event', NULL, 'upgrade_banner_click', JSON_OBJECT('context','admin_subscription','scenario','aggressive'), '127.0.0.1', 'demo-seed-aggressive', NOW() - INTERVAL 9 DAY, NOW()),
(@tenant_id, @gym_id, @user_id, 'tracking_event', NULL, 'upgrade_banner_click', JSON_OBJECT('context','admin_subscription','scenario','aggressive'), '127.0.0.1', 'demo-seed-aggressive', NOW() - INTERVAL 8 DAY, NOW()),
(@tenant_id, @gym_id, @user_id, 'tracking_event', NULL, 'upgrade_pay_now_click', JSON_OBJECT('context','admin_subscription','scenario','aggressive'), '127.0.0.1', 'demo-seed-aggressive', NOW() - INTERVAL 7 DAY, NOW()),
(@tenant_id, @gym_id, @user_id, 'tracking_event', NULL, 'upgrade_recommended_cta_click', JSON_OBJECT('context','self_service_upgrade','scenario','aggressive'), '127.0.0.1', 'demo-seed-aggressive', NOW() - INTERVAL 6 DAY, NOW()),
(@tenant_id, @gym_id, @user_id, 'tracking_event', NULL, 'upgrade_recommended_cta_click_addon_whatsapp', JSON_OBJECT('context','self_service_upgrade','scenario','aggressive'), '127.0.0.1', 'demo-seed-aggressive', NOW() - INTERVAL 6 DAY, NOW()),
(@tenant_id, @gym_id, @user_id, 'tracking_event', NULL, 'checkout_created_recommended_addon_whatsapp', JSON_OBJECT('context','self_service_upgrade','scenario','aggressive'), '127.0.0.1', 'demo-seed-aggressive', NOW() - INTERVAL 6 DAY, NOW()),
(@tenant_id, @gym_id, @user_id, 'demo_seed', NULL, 'seed_loaded_aggressive', JSON_OBJECT('scenario','aggressive'), '127.0.0.1', 'demo-seed-aggressive', NOW(), NOW());
