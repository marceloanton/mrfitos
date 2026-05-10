<?php

use App\Controllers\AuthController;
use App\Controllers\AttendanceController;
use App\Controllers\DashboardController;
use App\Controllers\MemberController;
use App\Controllers\MembershipController;
use App\Controllers\PaymentController;
use App\Controllers\PlanController;
use App\Controllers\AdminSubscriptionController;
use App\Controllers\AdminAddonController;
use App\Controllers\BillingController;
use App\Controllers\ReminderController;
use App\Controllers\ReportController;
use App\Controllers\TrackingController;
use App\Controllers\PosController;
use Middleware\AuthMiddleware;
use Middleware\CronTokenMiddleware;
use Middleware\FeatureGateMiddleware;
use Middleware\PermissionMiddleware;
use Middleware\RateLimitMiddleware;
use Middleware\TenantMiddleware;

$router->add('GET', '/health', fn () => Core\Response::json(['success' => true, 'message' => 'ok']));
$router->add('GET', '/public/pricing', [BillingController::class, 'publicPricing']);
$router->add('GET', '/billing/checkout-session/{provider_reference}', [BillingController::class, 'checkoutSessionStatus'], [new RateLimitMiddleware('billing_checkout_status', 60, 60)]);
$router->add('GET', '/billing/self-service/addons', [BillingController::class, 'selfServiceAddons'], [AuthMiddleware::class, TenantMiddleware::class]);
$router->add('POST', '/billing/self-service/checkout-session', [BillingController::class, 'selfServiceCreateCheckoutSession'], [AuthMiddleware::class, TenantMiddleware::class]);
$router->add('GET', '/dashboard/metrics', [DashboardController::class, 'metrics'], [AuthMiddleware::class, TenantMiddleware::class, new FeatureGateMiddleware('dashboard'), new PermissionMiddleware('dashboard.read')]);
$router->add('POST', '/auth/login', [AuthController::class, 'login'], [new RateLimitMiddleware('auth_login', 20, 60)]);
$router->add('POST', '/auth/forgot-password', [AuthController::class, 'forgotPassword'], [new RateLimitMiddleware('auth_forgot', 10, 60)]);
$router->add('POST', '/auth/reset-password', [AuthController::class, 'resetPassword'], [new RateLimitMiddleware('auth_reset', 10, 60)]);
$router->add('POST', '/auth/switch-gym', [AuthController::class, 'switchGym'], [AuthMiddleware::class, TenantMiddleware::class]);
$router->add('GET', '/auth/me', [AuthController::class, 'me'], [AuthMiddleware::class, TenantMiddleware::class]);

$router->add(
    'GET',
    '/members',
    [MemberController::class, 'index'],
    [AuthMiddleware::class, TenantMiddleware::class, new FeatureGateMiddleware('members'), new PermissionMiddleware('members.read')]
);
$router->add(
    'GET',
    '/members/{id}',
    [MemberController::class, 'show'],
    [AuthMiddleware::class, TenantMiddleware::class, new FeatureGateMiddleware('members'), new PermissionMiddleware('members.read')]
);
$router->add(
    'POST',
    '/members',
    [MemberController::class, 'store'],
    [AuthMiddleware::class, TenantMiddleware::class, new FeatureGateMiddleware('members'), new PermissionMiddleware('members.write')]
);
$router->add(
    'PUT',
    '/members/{id}',
    [MemberController::class, 'update'],
    [AuthMiddleware::class, TenantMiddleware::class, new FeatureGateMiddleware('members'), new PermissionMiddleware('members.write')]
);
$router->add(
    'DELETE',
    '/members/{id}',
    [MemberController::class, 'destroy'],
    [AuthMiddleware::class, TenantMiddleware::class, new FeatureGateMiddleware('members'), new PermissionMiddleware('members.delete')]
);

$router->add(
    'GET',
    '/plans',
    [PlanController::class, 'index'],
    [AuthMiddleware::class, TenantMiddleware::class, new FeatureGateMiddleware('plans'), new PermissionMiddleware('plans.read')]
);
$router->add(
    'GET',
    '/plans/{id}',
    [PlanController::class, 'show'],
    [AuthMiddleware::class, TenantMiddleware::class, new FeatureGateMiddleware('plans'), new PermissionMiddleware('plans.read')]
);
$router->add(
    'POST',
    '/plans',
    [PlanController::class, 'store'],
    [AuthMiddleware::class, TenantMiddleware::class, new FeatureGateMiddleware('plans'), new PermissionMiddleware('plans.write')]
);
$router->add(
    'PUT',
    '/plans/{id}',
    [PlanController::class, 'update'],
    [AuthMiddleware::class, TenantMiddleware::class, new FeatureGateMiddleware('plans'), new PermissionMiddleware('plans.write')]
);
$router->add(
    'DELETE',
    '/plans/{id}',
    [PlanController::class, 'destroy'],
    [AuthMiddleware::class, TenantMiddleware::class, new FeatureGateMiddleware('plans'), new PermissionMiddleware('plans.delete')]
);

$router->add('GET', '/memberships', [MembershipController::class, 'index'], [AuthMiddleware::class, TenantMiddleware::class, new FeatureGateMiddleware('memberships'), new PermissionMiddleware('memberships.read')]);
$router->add('GET', '/memberships/{id}', [MembershipController::class, 'show'], [AuthMiddleware::class, TenantMiddleware::class, new FeatureGateMiddleware('memberships'), new PermissionMiddleware('memberships.read')]);
$router->add('POST', '/memberships', [MembershipController::class, 'store'], [AuthMiddleware::class, TenantMiddleware::class, new FeatureGateMiddleware('memberships'), new PermissionMiddleware('memberships.write')]);
$router->add('PUT', '/memberships/{id}', [MembershipController::class, 'update'], [AuthMiddleware::class, TenantMiddleware::class, new FeatureGateMiddleware('memberships'), new PermissionMiddleware('memberships.write')]);
$router->add('DELETE', '/memberships/{id}', [MembershipController::class, 'destroy'], [AuthMiddleware::class, TenantMiddleware::class, new FeatureGateMiddleware('memberships'), new PermissionMiddleware('memberships.delete')]);

$router->add('GET', '/payments', [PaymentController::class, 'index'], [AuthMiddleware::class, TenantMiddleware::class, new FeatureGateMiddleware('payments'), new PermissionMiddleware('payments.read')]);
$router->add('GET', '/payments/{id}', [PaymentController::class, 'show'], [AuthMiddleware::class, TenantMiddleware::class, new FeatureGateMiddleware('payments'), new PermissionMiddleware('payments.read')]);
$router->add('POST', '/payments', [PaymentController::class, 'store'], [AuthMiddleware::class, TenantMiddleware::class, new FeatureGateMiddleware('payments'), new PermissionMiddleware('payments.write')]);
$router->add('PUT', '/payments/{id}', [PaymentController::class, 'update'], [AuthMiddleware::class, TenantMiddleware::class, new FeatureGateMiddleware('payments'), new PermissionMiddleware('payments.write')]);
$router->add('DELETE', '/payments/{id}', [PaymentController::class, 'destroy'], [AuthMiddleware::class, TenantMiddleware::class, new FeatureGateMiddleware('payments'), new PermissionMiddleware('payments.delete')]);

$router->add('GET', '/attendance', [AttendanceController::class, 'index'], [AuthMiddleware::class, TenantMiddleware::class, new FeatureGateMiddleware('attendance'), new PermissionMiddleware('attendance.read')]);
$router->add('POST', '/attendance/check-in', [AttendanceController::class, 'checkIn'], [new RateLimitMiddleware('attendance_checkin', 120, 60), AuthMiddleware::class, TenantMiddleware::class, new FeatureGateMiddleware('attendance'), new PermissionMiddleware('attendance.write')]);
$router->add('POST', '/attendance/check-out', [AttendanceController::class, 'checkOut'], [new RateLimitMiddleware('attendance_checkout', 120, 60), AuthMiddleware::class, TenantMiddleware::class, new FeatureGateMiddleware('attendance'), new PermissionMiddleware('attendance.write')]);
$router->add('POST', '/tracking/events', [TrackingController::class, 'storeEvent'], [new RateLimitMiddleware('tracking_events', 120, 60), AuthMiddleware::class, TenantMiddleware::class]);
$router->add('GET', '/pos/products/low-stock', [PosController::class, 'lowStockProducts'], [AuthMiddleware::class, TenantMiddleware::class, new PermissionMiddleware('pos.read')]);
$router->add('GET', '/pos/products', [PosController::class, 'products'], [AuthMiddleware::class, TenantMiddleware::class, new PermissionMiddleware('pos.read')]);
$router->add('GET', '/pos/summary', [PosController::class, 'summary'], [AuthMiddleware::class, TenantMiddleware::class, new PermissionMiddleware('pos.read')]);
$router->add('GET', '/pos/config', [PosController::class, 'config'], [AuthMiddleware::class, TenantMiddleware::class, new PermissionMiddleware('pos.cash.manage')]);
$router->add('POST', '/pos/config', [PosController::class, 'updateConfig'], [AuthMiddleware::class, TenantMiddleware::class, new PermissionMiddleware('pos.cash.manage')]);
$router->add('POST', '/pos/products', [PosController::class, 'createProduct'], [AuthMiddleware::class, TenantMiddleware::class, new PermissionMiddleware('pos.product.manage')]);
$router->add('GET', '/pos/sales', [PosController::class, 'sales'], [AuthMiddleware::class, TenantMiddleware::class, new PermissionMiddleware('pos.read')]);
$router->add('GET', '/pos/sales/receipt', [PosController::class, 'saleReceiptByNumber'], [AuthMiddleware::class, TenantMiddleware::class, new PermissionMiddleware('pos.read')]);
$router->add('GET', '/pos/sales/{id}/receipt', [PosController::class, 'saleReceipt'], [AuthMiddleware::class, TenantMiddleware::class, new PermissionMiddleware('pos.read')]);
$router->add('POST', '/pos/sales', [PosController::class, 'createSale'], [AuthMiddleware::class, TenantMiddleware::class, new PermissionMiddleware('pos.sale.create')]);
$router->add('POST', '/pos/sales/{id}/void', [PosController::class, 'voidSale'], [AuthMiddleware::class, TenantMiddleware::class, new PermissionMiddleware('pos.void')]);
$router->add('GET', '/pos/member-account/charges', [PosController::class, 'memberAccountCharges'], [AuthMiddleware::class, TenantMiddleware::class, new PermissionMiddleware('pos.read')]);
$router->add('POST', '/pos/member-account/charges/{id}/settle', [PosController::class, 'settleMemberAccountCharge'], [AuthMiddleware::class, TenantMiddleware::class, new PermissionMiddleware('pos.sale.create')]);
$router->add('GET', '/pos/stock/movements', [PosController::class, 'stockMovements'], [AuthMiddleware::class, TenantMiddleware::class, new PermissionMiddleware('pos.read')]);
$router->add('POST', '/pos/stock/adjust', [PosController::class, 'adjustStock'], [AuthMiddleware::class, TenantMiddleware::class, new PermissionMiddleware('pos.stock.manage')]);
$router->add('POST', '/pos/cash-sessions/open', [PosController::class, 'openCashSession'], [AuthMiddleware::class, TenantMiddleware::class, new PermissionMiddleware('pos.cash.manage')]);
$router->add('GET', '/pos/cash-sessions/open-summary', [PosController::class, 'openCashSessionSummary'], [AuthMiddleware::class, TenantMiddleware::class, new PermissionMiddleware('pos.cash.manage')]);
$router->add('POST', '/pos/cash-sessions/close', [PosController::class, 'closeCashSession'], [AuthMiddleware::class, TenantMiddleware::class, new PermissionMiddleware('pos.cash.manage')]);
$router->add('GET', '/pos/cash-sessions', [PosController::class, 'cashSessions'], [AuthMiddleware::class, TenantMiddleware::class, new PermissionMiddleware('pos.cash.manage')]);
$router->add('GET', '/pos/cash-sessions/{id}/report', [PosController::class, 'cashSessionReport'], [AuthMiddleware::class, TenantMiddleware::class, new PermissionMiddleware('pos.report.read')]);
$router->add('GET', '/pos/reports/z-close', [PosController::class, 'zCloseReport'], [AuthMiddleware::class, TenantMiddleware::class, new PermissionMiddleware('pos.report.read')]);
$router->add('GET', '/pos/reports/z-close/export', [PosController::class, 'zCloseReportExport'], [AuthMiddleware::class, TenantMiddleware::class, new PermissionMiddleware('pos.report.export')]);
$router->add('GET', '/pos/reports/cash-by-operator', [PosController::class, 'cashByOperatorReport'], [AuthMiddleware::class, TenantMiddleware::class, new PermissionMiddleware('pos.report.read')]);
$router->add('GET', '/pos/alerts', [PosController::class, 'alerts'], [AuthMiddleware::class, TenantMiddleware::class, new PermissionMiddleware('pos.report.read')]);
$router->add('GET', '/pos/alerts/status', [PosController::class, 'alertsStatus'], [AuthMiddleware::class, TenantMiddleware::class, new PermissionMiddleware('pos.report.read')]);
$router->add('GET', '/pos/alerts/dispatch-history', [PosController::class, 'dispatchHistory'], [AuthMiddleware::class, TenantMiddleware::class, new PermissionMiddleware('pos.report.read')]);
$router->add('GET', '/pos/alerts/cron-history', [PosController::class, 'cronHistory'], [AuthMiddleware::class, TenantMiddleware::class, new PermissionMiddleware('pos.report.read')]);
$router->add('GET', '/pos/alerts/dispatch-history/export', [PosController::class, 'dispatchHistoryExport'], [AuthMiddleware::class, TenantMiddleware::class, new PermissionMiddleware('pos.report.export')]);
$router->add('GET', '/pos/alerts/notify-link', [PosController::class, 'alertsNotifyLink'], [AuthMiddleware::class, TenantMiddleware::class, new PermissionMiddleware('pos.report.read'), new PermissionMiddleware('whatsapp.send')]);
$router->add('POST', '/pos/alerts/notify-critical', [PosController::class, 'notifyCriticalAlert'], [AuthMiddleware::class, TenantMiddleware::class, new PermissionMiddleware('pos.report.read'), new PermissionMiddleware('whatsapp.send')]);
$router->add('GET', '/pos/alerts/contacts', [PosController::class, 'alertContacts'], [AuthMiddleware::class, TenantMiddleware::class, new PermissionMiddleware('pos.report.read')]);
$router->add('POST', '/pos/alerts/contacts', [PosController::class, 'createAlertContact'], [AuthMiddleware::class, TenantMiddleware::class, new PermissionMiddleware('pos.cash.manage')]);
$router->add('PATCH', '/pos/alerts/contacts/{id}', [PosController::class, 'updateAlertContact'], [AuthMiddleware::class, TenantMiddleware::class, new PermissionMiddleware('pos.cash.manage')]);
$router->add('DELETE', '/pos/alerts/contacts/{id}', [PosController::class, 'deleteAlertContact'], [AuthMiddleware::class, TenantMiddleware::class, new PermissionMiddleware('pos.cash.manage')]);
$router->add('GET', '/pos/audit', [PosController::class, 'audit'], [AuthMiddleware::class, TenantMiddleware::class, new PermissionMiddleware('pos.report.read')]);
$router->add('GET', '/pos/audit/export', [PosController::class, 'auditExport'], [AuthMiddleware::class, TenantMiddleware::class, new PermissionMiddleware('pos.report.export')]);

$router->add('GET', '/reminders/expirations', [ReminderController::class, 'expiringMemberships'], [new RateLimitMiddleware('reminders_read', 60, 60), AuthMiddleware::class, TenantMiddleware::class, new FeatureGateMiddleware('whatsapp_read'), new PermissionMiddleware('whatsapp.read')]);
$router->add('POST', '/reminders/batch', [ReminderController::class, 'buildBatch'], [new RateLimitMiddleware('reminders_batch', 20, 60), AuthMiddleware::class, TenantMiddleware::class, new FeatureGateMiddleware('whatsapp_send'), new PermissionMiddleware('whatsapp.send')]);
$router->add('GET', '/reminders/batches', [ReminderController::class, 'batches'], [AuthMiddleware::class, TenantMiddleware::class, new FeatureGateMiddleware('whatsapp_read'), new PermissionMiddleware('whatsapp.read')]);
$router->add('GET', '/reminders/batches/{id}/items', [ReminderController::class, 'batchItems'], [AuthMiddleware::class, TenantMiddleware::class, new FeatureGateMiddleware('whatsapp_read'), new PermissionMiddleware('whatsapp.read')]);
$router->add('PATCH', '/reminders/batches/{id}/items/{item_id}', [ReminderController::class, 'updateBatchItemStatus'], [AuthMiddleware::class, TenantMiddleware::class, new FeatureGateMiddleware('whatsapp_send'), new PermissionMiddleware('whatsapp.send')]);

$router->add('GET', '/reports/renewals', [ReportController::class, 'renewals'], [new RateLimitMiddleware('reports_read', 60, 60), AuthMiddleware::class, TenantMiddleware::class, new FeatureGateMiddleware('reports'), new PermissionMiddleware('reports.read')]);

$router->add('GET', '/admin/subscription/tenant/{tenant_id}', [AdminSubscriptionController::class, 'showTenantSubscription'], [AuthMiddleware::class, new PermissionMiddleware('subscriptions.manage')]);
$router->add('PUT', '/admin/subscription/tenant/{tenant_id}', [AdminSubscriptionController::class, 'updateTenantSubscription'], [AuthMiddleware::class, new PermissionMiddleware('subscriptions.manage')]);
$router->add('POST', '/admin/subscription/tenant/{tenant_id}/start-trial', [AdminSubscriptionController::class, 'startTrial'], [AuthMiddleware::class, new PermissionMiddleware('subscriptions.manage')]);
$router->add('POST', '/admin/subscription/process-expired-trials', [AdminSubscriptionController::class, 'processExpiredTrials'], [AuthMiddleware::class, new PermissionMiddleware('subscriptions.manage')]);
$router->add('POST', '/cron/subscription/process-expired-trials', [AdminSubscriptionController::class, 'processExpiredTrials'], [new RateLimitMiddleware('cron_trials', 30, 60), CronTokenMiddleware::class]);
$router->add('POST', '/cron/billing/conversion-alert', [BillingController::class, 'cronConversionAlert'], [new RateLimitMiddleware('cron_billing_alert', 30, 60), CronTokenMiddleware::class]);
$router->add('POST', '/cron/pos/alerts/dispatch', [PosController::class, 'dispatchCriticalAlertsCron'], [new RateLimitMiddleware('cron_pos_alert_dispatch', 30, 60), CronTokenMiddleware::class]);
$router->add('POST', '/cron/pos/member-account/auto-settle', [PosController::class, 'autoSettleMemberAccountCron'], [new RateLimitMiddleware('cron_pos_member_account_autosettle', 30, 60), CronTokenMiddleware::class]);
$router->add('GET', '/admin/addons/tenant/{tenant_id}', [AdminAddonController::class, 'showTenantAddons'], [AuthMiddleware::class, new PermissionMiddleware('subscriptions.manage')]);
$router->add('PUT', '/admin/addons/tenant/{tenant_id}/{addon_code}', [AdminAddonController::class, 'updateTenantAddon'], [AuthMiddleware::class, new PermissionMiddleware('subscriptions.manage')]);
$router->add('GET', '/admin/addons/catalog', [AdminAddonController::class, 'catalog'], [AuthMiddleware::class, new PermissionMiddleware('subscriptions.manage.catalog')]);
$router->add('PUT', '/admin/addons/catalog/{addon_code}', [AdminAddonController::class, 'updateCatalogAddon'], [AuthMiddleware::class, new PermissionMiddleware('subscriptions.manage.catalog')]);
$router->add('GET', '/admin/addons/catalog/audit', [AdminAddonController::class, 'catalogAudit'], [AuthMiddleware::class, new PermissionMiddleware('subscriptions.manage.catalog')]);
$router->add('GET', '/admin/addons/catalog/audit/export', [AdminAddonController::class, 'exportCatalogAuditCsv'], [AuthMiddleware::class, new PermissionMiddleware('subscriptions.manage.catalog')]);
$router->add('GET', '/admin/addons/catalog/audit/export.csv', [AdminAddonController::class, 'exportCatalogAuditCsv'], [AuthMiddleware::class, new PermissionMiddleware('subscriptions.manage.catalog')]);
$router->add('POST', '/admin/billing/checkout-session', [BillingController::class, 'createCheckoutSession'], [AuthMiddleware::class, new PermissionMiddleware('subscriptions.manage')]);
$router->add('GET', '/admin/billing/checkout-sessions', [BillingController::class, 'adminCheckoutSessions'], [AuthMiddleware::class, new PermissionMiddleware('subscriptions.manage')]);
$router->add('GET', '/admin/billing/funnel', [BillingController::class, 'adminBillingFunnel'], [AuthMiddleware::class, new PermissionMiddleware('subscriptions.manage')]);
$router->add('GET', '/admin/billing/tenant-ranking', [BillingController::class, 'adminTenantRanking'], [AuthMiddleware::class, new PermissionMiddleware('subscriptions.manage')]);
$router->add('GET', '/admin/billing/tenant-ranking/export.csv', [BillingController::class, 'exportAdminTenantRankingCsv'], [AuthMiddleware::class, new PermissionMiddleware('subscriptions.manage')]);
$router->add('GET', '/admin/billing/tenant-ranking/export', [BillingController::class, 'exportAdminTenantRankingCsv'], [AuthMiddleware::class, new PermissionMiddleware('subscriptions.manage')]);
$router->add('GET', '/admin/billing/checkout-sessions/export.csv', [BillingController::class, 'exportAdminCheckoutSessionsCsv'], [AuthMiddleware::class, new PermissionMiddleware('subscriptions.manage')]);
$router->add('GET', '/admin/billing/funnel/export.csv', [BillingController::class, 'exportAdminBillingFunnelCsv'], [AuthMiddleware::class, new PermissionMiddleware('subscriptions.manage')]);
$router->add('GET', '/admin/billing/checkout-sessions/export', [BillingController::class, 'exportAdminCheckoutSessionsCsv'], [AuthMiddleware::class, new PermissionMiddleware('subscriptions.manage')]);
$router->add('GET', '/admin/billing/funnel/export', [BillingController::class, 'exportAdminBillingFunnelCsv'], [AuthMiddleware::class, new PermissionMiddleware('subscriptions.manage')]);
$router->add('GET', '/admin/tracking/summary', [TrackingController::class, 'summary'], [AuthMiddleware::class, new PermissionMiddleware('subscriptions.manage')]);
$router->add('POST', '/billing/webhook/mercadopago', [BillingController::class, 'mercadoPagoWebhook'], [new RateLimitMiddleware('billing_webhook_mp', 120, 60)]);
