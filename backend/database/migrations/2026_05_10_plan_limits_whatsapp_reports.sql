UPDATE subscription_plans
SET limits_json = JSON_SET(
        COALESCE(limits_json, JSON_OBJECT()),
        '$.max_monthly_whatsapp_messages', 150,
        '$.max_monthly_reports_queries', 40
    ),
    updated_at = NOW()
WHERE code = 'free';

UPDATE subscription_plans
SET limits_json = JSON_SET(
        COALESCE(limits_json, JSON_OBJECT()),
        '$.max_monthly_whatsapp_messages', 4000,
        '$.max_monthly_reports_queries', 600
    ),
    updated_at = NOW()
WHERE code = 'pro';

UPDATE subscription_plans
SET limits_json = JSON_SET(
        COALESCE(limits_json, JSON_OBJECT()),
        '$.max_monthly_whatsapp_messages', 999999,
        '$.max_monthly_reports_queries', 999999
    ),
    updated_at = NOW()
WHERE code = 'scale';
