-- Add monthly caps in subscription plan limits (idempotent)
USE gymsaas;

UPDATE subscription_plans
SET limits_json = JSON_SET(
    COALESCE(limits_json, JSON_OBJECT()),
    '$.max_monthly_payments', COALESCE(JSON_EXTRACT(limits_json, '$.max_monthly_payments'), 120),
    '$.max_monthly_checkins', COALESCE(JSON_EXTRACT(limits_json, '$.max_monthly_checkins'), 400)
),
updated_at = NOW()
WHERE code = 'free';

UPDATE subscription_plans
SET limits_json = JSON_SET(
    COALESCE(limits_json, JSON_OBJECT()),
    '$.max_monthly_payments', COALESCE(JSON_EXTRACT(limits_json, '$.max_monthly_payments'), 999999),
    '$.max_monthly_checkins', COALESCE(JSON_EXTRACT(limits_json, '$.max_monthly_checkins'), 999999)
),
updated_at = NOW()
WHERE code = 'pro';
