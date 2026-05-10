-- Pricing strategy for Argentina market (idempotent)
USE gymsaas;

INSERT INTO subscription_plans (code, name, price_monthly, currency, features, limits_json, is_active)
VALUES
('free', 'Starter', 29900, 'ARS',
 JSON_OBJECT(
   'dashboard', true,
   'members', true,
   'plans', true,
   'memberships', true,
   'payments', true,
   'attendance', true,
   'whatsapp_read', false,
   'whatsapp_send', false,
   'reports', false
 ),
 JSON_OBJECT(
   'max_members', 60,
   'max_staff_users', 1,
   'max_gyms', 1,
   'max_monthly_payments', 90,
   'max_monthly_checkins', 250
 ),
 1),
('pro', 'Pro', 74900, 'ARS',
 JSON_OBJECT(
   'dashboard', true,
   'members', true,
   'plans', true,
   'memberships', true,
   'payments', true,
   'attendance', true,
   'whatsapp_read', true,
   'whatsapp_send', true,
   'reports', true
 ),
 JSON_OBJECT(
   'max_members', 250,
   'max_staff_users', 6,
   'max_gyms', 2,
   'max_monthly_payments', 600,
   'max_monthly_checkins', 2000
 ),
 1),
('scale', 'Scale', 124900, 'ARS',
 JSON_OBJECT(
   'dashboard', true,
   'members', true,
   'plans', true,
   'memberships', true,
   'payments', true,
   'attendance', true,
   'whatsapp_read', true,
   'whatsapp_send', true,
   'reports', true
 ),
 JSON_OBJECT(
   'max_members', 999999,
   'max_staff_users', 999999,
   'max_gyms', 10,
   'max_monthly_payments', 999999,
   'max_monthly_checkins', 999999
 ),
 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  price_monthly = VALUES(price_monthly),
  currency = VALUES(currency),
  features = VALUES(features),
  limits_json = VALUES(limits_json),
  is_active = VALUES(is_active),
  updated_at = NOW();

INSERT INTO addon_modules (code, name, description, price_monthly, currency, features, is_active)
VALUES
('whatsapp', 'WhatsApp Automation', 'Recordatorios y workflows de cobranza por WhatsApp', 8900, 'ARS',
 JSON_OBJECT('whatsapp_read', true, 'whatsapp_send', true), 1),
('reports_plus', 'Reports Plus', 'Reportes avanzados de negocio y retención', 12900, 'ARS',
 JSON_OBJECT('reports', true, 'reports_plus', true), 1),
('multi_branch', 'Multi Branch', 'Operación multi-sede para un mismo tenant', 17900, 'ARS',
 JSON_OBJECT('multi_branch', true), 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  price_monthly = VALUES(price_monthly),
  currency = VALUES(currency),
  features = VALUES(features),
  is_active = VALUES(is_active),
  updated_at = NOW();
