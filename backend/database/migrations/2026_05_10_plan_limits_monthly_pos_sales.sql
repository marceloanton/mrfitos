UPDATE subscription_plans
SET limits_json = JSON_SET(COALESCE(limits_json, JSON_OBJECT()), '$.max_monthly_pos_sales', 120),
    updated_at = NOW()
WHERE code = 'free';

UPDATE subscription_plans
SET limits_json = JSON_SET(COALESCE(limits_json, JSON_OBJECT()), '$.max_monthly_pos_sales', 1200),
    updated_at = NOW()
WHERE code = 'pro';

UPDATE subscription_plans
SET limits_json = JSON_SET(COALESCE(limits_json, JSON_OBJECT()), '$.max_monthly_pos_sales', 999999),
    updated_at = NOW()
WHERE code = 'scale';
