<?php

namespace App\Services;

use App\Repositories\AdminAddonRepository;
use App\Repositories\AdminSubscriptionRepository;
use App\Repositories\ActivityLogRepository;
use App\Repositories\BillingRepository;
use Core\Database;
use Core\Env;

final class BillingService
{
    private const ALLOWED_SESSION_STATUSES = ['pending', 'approved', 'rejected', 'expired'];

    public function __construct(
        private readonly BillingRepository $repo = new BillingRepository(),
        private readonly AdminSubscriptionRepository $subscriptionRepo = new AdminSubscriptionRepository(),
        private readonly AdminAddonRepository $addonRepo = new AdminAddonRepository(),
        private readonly ActivityLogRepository $activityRepo = new ActivityLogRepository()
    ) {
    }

    public function createCheckoutSession(int $tenantId, ?string $planCode, ?string $addonCode, ?string $context = null): array
    {
        if (!$this->repo->tenantExists($tenantId)) {
            throw new \InvalidArgumentException('Tenant not found');
        }

        $planCode = $planCode ? strtolower(trim($planCode)) : null;
        $addonCode = $addonCode ? strtolower(trim($addonCode)) : null;

        if (($planCode === null || $planCode === '') && ($addonCode === null || $addonCode === '')) {
            throw new \InvalidArgumentException('plan_code or addon_code is required');
        }

        if ($planCode && $addonCode) {
            throw new \InvalidArgumentException('Use one target per checkout: plan_code or addon_code');
        }

        $plan = null;
        $addon = null;

        if ($planCode) {
            $plan = $this->repo->findPlanByCode($planCode);
            if (!$plan) {
                throw new \InvalidArgumentException('Plan not found or inactive');
            }
        }

        if ($addonCode) {
            $addon = $this->repo->findAddonByCode($addonCode);
            if (!$addon) {
                throw new \InvalidArgumentException('Addon not found or inactive');
            }
        }

        $reference = 'mp_' . bin2hex(random_bytes(12));
        $amount = (float) ($plan['price_monthly'] ?? $addon['price_monthly'] ?? 0);
        $currency = (string) ($plan['currency'] ?? $addon['currency'] ?? 'USD');
        $checkoutUrl = 'https://www.mercadopago.com/checkout/v1/redirect?pref_id=' . $reference;
        $providerPreferenceId = null;
        $metadataArray = [
            'plan_code' => $plan['code'] ?? null,
            'addon_code' => $addon['code'] ?? null,
            'external_reference' => $reference
        ];
        $context = $context !== null ? trim($context) : null;
        if ($context !== null && $context !== '') {
            $metadataArray['context'] = substr($context, 0, 100);
        }

        $mercadoPago = $this->createMercadoPagoPreference($reference, $tenantId, $amount, $currency, $plan, $addon);
        if ($mercadoPago !== null) {
            $checkoutUrl = (string) ($mercadoPago['init_point'] ?? $checkoutUrl);
            $providerPreferenceId = isset($mercadoPago['id']) ? (string) $mercadoPago['id'] : null;
            $metadataArray['mercadopago_preference'] = $mercadoPago;
        } else {
            $metadataArray['mock_fallback'] = true;
        }

        $this->repo->createCheckoutSession([
            'tenant_id' => $tenantId,
            'plan_id' => $plan ? (int) $plan['id'] : null,
            'addon_id' => $addon ? (int) $addon['id'] : null,
            'provider_reference' => $reference,
            'provider_preference_id' => $providerPreferenceId,
            'provider_payment_id' => null,
            'checkout_url' => $checkoutUrl,
            'amount' => $amount,
            'currency' => $currency,
            'expires_at' => date('Y-m-d H:i:s', strtotime('+30 minutes')),
            'metadata' => json_encode($metadataArray, JSON_UNESCAPED_UNICODE)
        ]);

        return [
            'tenant_id' => $tenantId,
            'provider' => 'mercadopago',
            'provider_reference' => $reference,
            'checkout_url' => $checkoutUrl,
            'amount' => $amount,
            'currency' => $currency,
            'status' => 'pending'
        ];
    }

    public function getPublicPricingCatalog(): array
    {
        $plans = array_map(
            fn (array $plan): array => [
                'code' => (string) ($plan['code'] ?? ''),
                'name' => (string) ($plan['name'] ?? ''),
                'price_monthly' => (float) ($plan['price_monthly'] ?? 0),
                'currency' => strtoupper((string) ($plan['currency'] ?? 'USD')),
                'price_label' => $this->buildPriceLabel(
                    (float) ($plan['price_monthly'] ?? 0),
                    (string) ($plan['currency'] ?? 'USD')
                ),
                'features' => $this->decodeJsonObject($plan['features'] ?? null),
                'limits_json' => $this->decodeJsonObject($plan['limits_json'] ?? null),
            ],
            $this->repo->getActivePlansCatalog()
        );

        $addons = array_map(
            fn (array $addon): array => [
                'code' => (string) ($addon['code'] ?? ''),
                'name' => (string) ($addon['name'] ?? ''),
                'description' => (string) ($addon['description'] ?? ''),
                'price_monthly' => (float) ($addon['price_monthly'] ?? 0),
                'currency' => strtoupper((string) ($addon['currency'] ?? 'USD')),
                'price_label' => $this->buildPriceLabel(
                    (float) ($addon['price_monthly'] ?? 0),
                    (string) ($addon['currency'] ?? 'USD')
                ),
                'features' => $this->decodeJsonObject($addon['features'] ?? null),
            ],
            $this->repo->getActiveAddonsCatalog()
        );

        return [
            'plans' => $plans,
            'addons' => $addons
        ];
    }

    public function getTenantAddonsForSelfService(int $tenantId): array
    {
        $activeSubs = $this->addonRepo->getActiveAddonSubscriptionsByTenant($tenantId);
        $available = $this->addonRepo->getAllAvailableAddons();
        $activeCodes = [];
        foreach ($activeSubs as $row) {
            $activeCodes[(string) ($row['code'] ?? '')] = true;
        }

        return array_map(function (array $row) use ($activeCodes): array {
            $code = (string) ($row['code'] ?? '');
            return [
                'code' => $code,
                'name' => (string) ($row['name'] ?? ''),
                'description' => (string) ($row['description'] ?? ''),
                'price_monthly' => (float) ($row['price_monthly'] ?? 0),
                'currency' => strtoupper((string) ($row['currency'] ?? 'USD')),
                'price_label' => $this->buildPriceLabel(
                    (float) ($row['price_monthly'] ?? 0),
                    (string) ($row['currency'] ?? 'USD')
                ),
                'features' => $this->decodeJsonObject($row['features'] ?? null),
                'active' => (bool) ($activeCodes[$code] ?? false)
            ];
        }, $available);
    }

    public function getPublicPricingLastModifiedAt(): \DateTimeImmutable
    {
        $raw = $this->repo->getLatestPricingUpdatedAt();
        if (!is_string($raw) || trim($raw) === '') {
            return new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
        }

        try {
            $parsed = new \DateTimeImmutable($raw);
            return $parsed->setTimezone(new \DateTimeZone('UTC'));
        } catch (\Throwable) {
            return new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
        }
    }

    public function getCheckoutSessionStatusByReference(string $providerReference): array
    {
        $reference = trim($providerReference);
        if ($reference === '') {
            throw new \InvalidArgumentException('provider_reference is required');
        }

        if (strlen($reference) > 120 || preg_match('/^[A-Za-z0-9_-]+$/', $reference) !== 1) {
            throw new \InvalidArgumentException('Invalid provider_reference format');
        }

        $row = $this->repo->findCheckoutSessionPublicStatusByReference($reference);
        if (!$row) {
            throw new \OutOfBoundsException('Checkout session not found');
        }

        return [
            'provider_reference' => (string) ($row['provider_reference'] ?? ''),
            'status' => (string) ($row['status'] ?? 'pending'),
            'amount' => (float) ($row['amount'] ?? 0),
            'currency' => strtoupper((string) ($row['currency'] ?? 'USD')),
            'checkout_url' => (string) ($row['checkout_url'] ?? ''),
            'created_at' => (string) ($row['created_at'] ?? ''),
            'processed_at' => $row['processed_at'] ?? null,
            'plan_code' => isset($row['plan_code']) && $row['plan_code'] !== null ? (string) $row['plan_code'] : null,
            'addon_code' => isset($row['addon_code']) && $row['addon_code'] !== null ? (string) $row['addon_code'] : null,
        ];
    }

    public function listAdminCheckoutSessions(array $query): array
    {
        $filters = $this->normalizeCheckoutFilters($query);
        $page = max(1, (int) ($query['page'] ?? 1));
        $perPage = (int) ($query['per_page'] ?? 20);
        if ($perPage <= 0) {
            $perPage = 20;
        }
        $perPage = min($perPage, 100);

        $total = $this->repo->countCheckoutSessions($filters);
        $offset = ($page - 1) * $perPage;
        $items = $this->repo->listCheckoutSessions($filters, $offset, $perPage);

        $normalizedItems = array_map(static fn (array $row): array => [
            'id' => (int) ($row['id'] ?? 0),
            'tenant_id' => (int) ($row['tenant_id'] ?? 0),
            'provider_reference' => (string) ($row['provider_reference'] ?? ''),
            'status' => (string) ($row['status'] ?? 'pending'),
            'amount' => (float) ($row['amount'] ?? 0),
            'currency' => strtoupper((string) ($row['currency'] ?? 'USD')),
            'plan_code' => isset($row['plan_code']) && $row['plan_code'] !== null ? (string) $row['plan_code'] : null,
            'addon_code' => isset($row['addon_code']) && $row['addon_code'] !== null ? (string) $row['addon_code'] : null,
            'created_at' => (string) ($row['created_at'] ?? ''),
            'processed_at' => $row['processed_at'] ?? null,
        ], $items);

        return [
            'items' => $normalizedItems,
            'pagination' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'total_pages' => $perPage > 0 ? (int) ceil($total / $perPage) : 0
            ]
        ];
    }

    public function getAdminBillingFunnel(array $query): array
    {
        $filters = $this->normalizeCheckoutFilters($query);
        unset($filters['status']);

        $row = $this->repo->checkoutFunnelSummary($filters);
        $total = (int) ($row['total_sessions'] ?? 0);
        $approved = (int) ($row['approved'] ?? 0);
        $pending = (int) ($row['pending'] ?? 0);
        $rejected = (int) ($row['rejected'] ?? 0);
        $expired = (int) ($row['expired'] ?? 0);

        return [
            'total_sessions' => $total,
            'approved' => $approved,
            'pending' => $pending,
            'rejected' => $rejected,
            'expired' => $expired,
            'approval_rate' => $total > 0 ? round(($approved / $total) * 100, 2) : 0.0
        ];
    }

    public function getTenantConversionRanking(array $query): array
    {
        $filters = $this->normalizeCheckoutFilters($query);
        $from = $filters['from'];
        $to = $filters['to'];
        $limit = max(1, min(100, (int) ($query['limit'] ?? 20)));

        $conn = Database::connection();
        $sessionsSql = 'SELECT s.tenant_id,
                               t.name AS tenant_name,
                               COUNT(*) AS checkout_sessions,
                               SUM(CASE WHEN s.status = "approved" THEN 1 ELSE 0 END) AS approved_sessions
                        FROM subscription_checkout_sessions s
                        INNER JOIN tenants t ON t.id = s.tenant_id
                        WHERE 1=1';
        $sessionsParams = [];
        if ($from !== null) {
            $sessionsSql .= ' AND s.created_at >= :from_dt';
            $sessionsParams['from_dt'] = $from . ' 00:00:00';
        }
        if ($to !== null) {
            $sessionsSql .= ' AND s.created_at <= :to_dt';
            $sessionsParams['to_dt'] = $to . ' 23:59:59';
        }
        $sessionsSql .= ' GROUP BY s.tenant_id, t.name';
        $stmt = $conn->prepare($sessionsSql);
        $stmt->execute($sessionsParams);
        $sessionRows = $stmt->fetchAll() ?: [];

        $clicksSql = 'SELECT tenant_id, COUNT(*) AS clicks
                      FROM activity_logs
                      WHERE entity_type = "upgrade_tracking"
                        AND action IN ("upgrade_banner_click","upgrade_badge_click","upgrade_pay_now_click")';
        $clicksParams = [];
        if ($from !== null) {
            $clicksSql .= ' AND created_at >= :from_dt';
            $clicksParams['from_dt'] = $from . ' 00:00:00';
        }
        if ($to !== null) {
            $clicksSql .= ' AND created_at <= :to_dt';
            $clicksParams['to_dt'] = $to . ' 23:59:59';
        }
        $clicksSql .= ' GROUP BY tenant_id';
        $stmt2 = $conn->prepare($clicksSql);
        $stmt2->execute($clicksParams);
        $clickRows = $stmt2->fetchAll() ?: [];

        $clickMap = [];
        foreach ($clickRows as $row) {
            $clickMap[(int) ($row['tenant_id'] ?? 0)] = (int) ($row['clicks'] ?? 0);
        }

        $ranking = [];
        foreach ($sessionRows as $row) {
            $tenantId = (int) ($row['tenant_id'] ?? 0);
            if ($tenantId <= 0) {
                continue;
            }
            $checkoutSessions = (int) ($row['checkout_sessions'] ?? 0);
            $approvedSessions = (int) ($row['approved_sessions'] ?? 0);
            $clicks = (int) ($clickMap[$tenantId] ?? 0);
            $checkoutToApproved = $checkoutSessions > 0 ? round(($approvedSessions / $checkoutSessions) * 100, 2) : 0.0;
            $rawClickToApproved = $clicks > 0 ? round(($approvedSessions / $clicks) * 100, 2) : 0.0;
            $clickToApproved = min(100.0, $rawClickToApproved);
            $partialHistoricalData = $rawClickToApproved > 100.0;

            $ranking[] = [
                'tenant_id' => $tenantId,
                'tenant_name' => (string) ($row['tenant_name'] ?? ('Tenant ' . $tenantId)),
                'clicks' => $clicks,
                'checkout_sessions' => $checkoutSessions,
                'approved_sessions' => $approvedSessions,
                'checkout_to_approved_rate' => $checkoutToApproved,
                'click_to_approved_rate' => $clickToApproved,
                'partial_historical_data' => $partialHistoricalData
            ];
        }

        usort($ranking, static function (array $a, array $b): int {
            $cmp = $b['click_to_approved_rate'] <=> $a['click_to_approved_rate'];
            if ($cmp !== 0) return $cmp;
            return $b['approved_sessions'] <=> $a['approved_sessions'];
        });

        $ranking = array_slice($ranking, 0, $limit);

        return [
            'items' => $ranking,
            'filters' => [
                'from' => $from,
                'to' => $to,
                'limit' => $limit
            ]
        ];
    }

    public function exportAdminCheckoutSessionsCsv(array $query): string
    {
        $filters = $this->normalizeCheckoutFilters($query);
        $rows = $this->repo->listCheckoutSessionsForExport($filters);

        $lines = [];
        $lines[] = $this->csvRow([
            'id', 'tenant_id', 'provider_reference', 'status', 'amount', 'currency',
            'plan_code', 'addon_code', 'created_at', 'processed_at'
        ]);

        foreach ($rows as $row) {
            $lines[] = $this->csvRow([
                (string) ((int) ($row['id'] ?? 0)),
                (string) ((int) ($row['tenant_id'] ?? 0)),
                (string) ($row['provider_reference'] ?? ''),
                (string) ($row['status'] ?? ''),
                (string) ((float) ($row['amount'] ?? 0)),
                strtoupper((string) ($row['currency'] ?? 'USD')),
                (string) ($row['plan_code'] ?? ''),
                (string) ($row['addon_code'] ?? ''),
                (string) ($row['created_at'] ?? ''),
                (string) ($row['processed_at'] ?? ''),
            ]);
        }

        return implode("\n", $lines) . "\n";
    }

    public function exportAdminBillingFunnelCsv(array $query): string
    {
        $funnel = $this->getAdminBillingFunnel($query);
        $header = $this->csvRow(['total_sessions', 'approved', 'pending', 'rejected', 'expired', 'approval_rate']);
        $row = $this->csvRow([
            (string) ($funnel['total_sessions'] ?? 0),
            (string) ($funnel['approved'] ?? 0),
            (string) ($funnel['pending'] ?? 0),
            (string) ($funnel['rejected'] ?? 0),
            (string) ($funnel['expired'] ?? 0),
            (string) ($funnel['approval_rate'] ?? 0),
        ]);

        return $header . "\n" . $row . "\n";
    }

    public function exportAdminCheckoutSessions(array $query): array
    {
        $filters = $this->normalizeCheckoutFilters($query);
        $items = $this->repo->listCheckoutSessionsForExport($filters);

        return array_map(static fn (array $row): array => [
            'id' => (int) ($row['id'] ?? 0),
            'tenant_id' => (int) ($row['tenant_id'] ?? 0),
            'provider_reference' => (string) ($row['provider_reference'] ?? ''),
            'status' => (string) ($row['status'] ?? 'pending'),
            'amount' => (float) ($row['amount'] ?? 0),
            'currency' => strtoupper((string) ($row['currency'] ?? 'USD')),
            'plan_code' => isset($row['plan_code']) && $row['plan_code'] !== null ? (string) $row['plan_code'] : '',
            'addon_code' => isset($row['addon_code']) && $row['addon_code'] !== null ? (string) $row['addon_code'] : '',
            'created_at' => (string) ($row['created_at'] ?? ''),
            'processed_at' => isset($row['processed_at']) && $row['processed_at'] !== null ? (string) $row['processed_at'] : '',
        ], $items);
    }

    public function exportAdminBillingFunnel(array $query): array
    {
        return $this->getAdminBillingFunnel($query);
    }

    public function evaluateConversionAlert(array $input): array
    {
        $window = $this->normalizeAlertWindow($input);
        $threshold = $this->normalizeThreshold($input['threshold'] ?? null);

        $funnel = $this->getAdminBillingFunnel([
            'tenant_id' => $input['tenant_id'] ?? null,
            'from' => $window['from'],
            'to' => $window['to'],
        ]);

        $approvalRate = (float) ($funnel['approval_rate'] ?? 0.0);
        $alertTriggered = $approvalRate < $threshold;

        $payload = [
            'alert_triggered' => $alertTriggered,
            'threshold' => $threshold,
            'funnel' => $funnel,
            'window' => $window,
            'tenant_id' => isset($input['tenant_id']) ? (int) $input['tenant_id'] : null,
            'generated_at' => gmdate('c')
        ];

        $webhookSent = false;
        $webhookStatus = null;
        $webhookError = null;

        $webhookUrl = trim((string) Env::get('BILLING_ALERT_WEBHOOK_URL', ''));
        if ($alertTriggered && $webhookUrl !== '') {
            $result = $this->httpJson('POST', $webhookUrl, ['Content-Type: application/json'], $payload);
            $webhookStatus = (int) ($result['status'] ?? 0);
            if (($result['ok'] ?? false) === true) {
                $webhookSent = true;
            } else {
                $webhookError = 'Webhook request failed';
            }
        }

        return [
            'alert_triggered' => $alertTriggered,
            'threshold' => $threshold,
            'funnel' => $funnel,
            'window' => $window,
            'webhook_sent' => $webhookSent,
            'webhook_status' => $webhookStatus,
            'webhook_error' => $webhookError,
        ];
    }

    public function processMercadoPagoWebhook(array $payload, array $query, array $headers, string $rawBody): array
    {
        $event = $this->resolveWebhookEvent($payload, $query);
        $this->validateWebhookSignature($event, $headers, $query, $rawBody);

        $providerReference = $event['provider_reference'] ?? null;
        $providerPaymentId = $event['provider_payment_id'] ?? null;
        $providerPreferenceId = $event['provider_preference_id'] ?? null;
        $normalizedStatus = strtolower(trim((string) ($event['status'] ?? 'pending')));

        if (!in_array($normalizedStatus, ['pending', 'approved', 'rejected', 'expired'], true)) {
            throw new \InvalidArgumentException('Invalid status');
        }

        $session = null;
        if ($providerReference) {
            $session = $this->repo->findCheckoutSessionByReference($providerReference);
        }
        if (!$session && $providerPaymentId) {
            $session = $this->repo->findCheckoutSessionByPaymentId($providerPaymentId);
        }
        if (!$session && $providerPreferenceId) {
            $session = $this->repo->findCheckoutSessionByPreferenceId($providerPreferenceId);
        }
        if (!$session) {
            throw new \InvalidArgumentException('Checkout session not found');
        }

        $metadata = $this->mergeSessionMetadata(
            $session,
            [
                'last_webhook_event' => $event,
                'provider_payment_id' => $providerPaymentId,
                'provider_preference_id' => $providerPreferenceId
            ]
        );

        if ($normalizedStatus !== 'approved') {
            $this->repo->updateCheckoutSessionWebhookData((int) $session['id'], $normalizedStatus, $providerPaymentId, $metadata);
            return [
                'provider_reference' => (string) $session['provider_reference'],
                'status' => $normalizedStatus,
                'applied' => false,
                'idempotent' => true
            ];
        }

        if ((string) ($session['processed_at'] ?? '') !== '') {
            $this->repo->updateCheckoutSessionWebhookData((int) $session['id'], 'approved', $providerPaymentId, $metadata);
            return [
                'provider_reference' => (string) $session['provider_reference'],
                'status' => 'approved',
                'applied' => false,
                'idempotent' => true
            ];
        }

        $conn = Database::connection();
        $conn->beginTransaction();
        try {
            if ((int) ($session['plan_id'] ?? 0) > 0) {
                $now = date('Y-m-d H:i:s');
                $this->subscriptionRepo->deactivateRunningSubscriptions((int) $session['tenant_id'], $now);
                $this->subscriptionRepo->createSubscription((int) $session['tenant_id'], (int) $session['plan_id'], $now);
            }

            if ((int) ($session['addon_id'] ?? 0) > 0) {
                $addonId = (int) $session['addon_id'];
                $tenantId = (int) $session['tenant_id'];
                $existing = $this->addonRepo->getActiveAddonSubscriptionByTenantAndAddon($tenantId, $addonId);
                if (!$existing) {
                    $this->addonRepo->activateAddon($tenantId, $addonId, date('Y-m-d H:i:s'));
                }
            }

            $this->repo->updateCheckoutSessionWebhookData((int) $session['id'], 'approved', $providerPaymentId, $metadata);
            $this->repo->markSessionProcessed((int) $session['id']);
            $conn->commit();
        } catch (\Throwable $e) {
            if ($conn->inTransaction()) {
                $conn->rollBack();
            }
            throw $e;
        }

        $this->logApprovedTrackingEvent($session, $providerPaymentId);

        return [
            'provider_reference' => (string) $session['provider_reference'],
            'status' => 'approved',
            'applied' => true,
            'idempotent' => false
        ];
    }

    private function logApprovedTrackingEvent(array $session, ?string $providerPaymentId): void
    {
        try {
            $decoded = [];
            if (!empty($session['metadata'])) {
                $decoded = json_decode((string) $session['metadata'], true);
                if (!is_array($decoded)) {
                    $decoded = [];
                }
            }

            $context = isset($decoded['context']) ? (string) $decoded['context'] : 'unknown';
            $this->activityRepo->create([
                'tenant_id' => (int) ($session['tenant_id'] ?? 0),
                'gym_id' => null,
                'user_id' => null,
                'entity_type' => 'upgrade_tracking',
                'entity_id' => isset($session['id']) ? (int) $session['id'] : null,
                'action' => 'approved',
                'metadata' => [
                    'context' => $context,
                    'provider_reference' => (string) ($session['provider_reference'] ?? ''),
                    'provider_payment_id' => $providerPaymentId,
                    'plan_id' => isset($session['plan_id']) ? (int) $session['plan_id'] : null,
                    'addon_id' => isset($session['addon_id']) ? (int) $session['addon_id'] : null
                ],
                'ip_address' => null,
                'user_agent' => null
            ]);
        } catch (\Throwable) {
            // Non-blocking analytics logging.
        }
    }

    private function createMercadoPagoPreference(string $reference, int $tenantId, float $amount, string $currency, ?array $plan, ?array $addon): ?array
    {
        $token = trim((string) Env::get('MP_ACCESS_TOKEN', ''));
        if ($token === '') {
            return null;
        }

        $appUrl = rtrim((string) Env::get('APP_URL', ''), '/');
        $backUrls = [
            'success' => (string) Env::get('MP_SUCCESS_URL', $appUrl !== '' ? $appUrl . '/billing/success' : 'https://example.com/success'),
            'failure' => (string) Env::get('MP_FAILURE_URL', $appUrl !== '' ? $appUrl . '/billing/failure' : 'https://example.com/failure'),
            'pending' => (string) Env::get('MP_PENDING_URL', $appUrl !== '' ? $appUrl . '/billing/pending' : 'https://example.com/pending')
        ];

        $title = $plan ? ('Plan ' . (string) $plan['name']) : ('Addon ' . (string) $addon['name']);
        $payload = [
            'external_reference' => $reference,
            'items' => [[
                'id' => $plan ? ('plan_' . (string) $plan['code']) : ('addon_' . (string) $addon['code']),
                'title' => $title,
                'quantity' => 1,
                'currency_id' => strtoupper($currency),
                'unit_price' => round($amount, 2)
            ]],
            'back_urls' => $backUrls,
            'auto_return' => 'approved',
            'metadata' => [
                'tenant_id' => $tenantId,
                'plan_code' => $plan['code'] ?? null,
                'addon_code' => $addon['code'] ?? null
            ]
        ];

        $result = $this->httpJson(
            'POST',
            'https://api.mercadopago.com/checkout/preferences',
            [
                'Authorization: Bearer ' . $token,
                'Content-Type: application/json'
            ],
            $payload
        );

        if ($result['ok'] !== true || !is_array($result['data'])) {
            return null;
        }

        $data = $result['data'];
        if (!isset($data['id'])) {
            return null;
        }

        return $data;
    }

    private function resolveWebhookEvent(array $payload, array $query): array
    {
        $providerReference = trim((string) ($payload['provider_reference'] ?? ''));
        $status = strtolower(trim((string) ($payload['status'] ?? '')));

        if ($providerReference !== '' && $status !== '') {
            return [
                'provider_reference' => $providerReference,
                'status' => $status,
                'raw' => ['payload' => $payload, 'query' => $query]
            ];
        }

        $topic = strtolower(trim((string) ($query['topic'] ?? $query['type'] ?? $payload['topic'] ?? $payload['type'] ?? $payload['action'] ?? '')));
        $resourceId = (string) ($payload['data']['id'] ?? $query['id'] ?? '');

        if (($topic === 'payment' || str_contains($topic, 'payment')) && $resourceId !== '') {
            $payment = $this->fetchMercadoPagoPayment($resourceId);
            if ($payment === null) {
                throw new \InvalidArgumentException('Unable to resolve Mercado Pago payment');
            }
            return [
                'provider_reference' => (string) ($payment['external_reference'] ?? ''),
                'provider_payment_id' => (string) ($payment['id'] ?? ''),
                'provider_preference_id' => (string) ($payment['order']['id'] ?? ''),
                'status' => $this->mapMercadoPagoStatus((string) ($payment['status'] ?? '')),
                'raw' => ['payload' => $payload, 'query' => $query, 'payment' => $payment]
            ];
        }

        if (($topic === 'merchant_order' || $topic === 'order') && $resourceId !== '') {
            $order = $this->fetchMercadoPagoMerchantOrder($resourceId);
            if ($order === null) {
                throw new \InvalidArgumentException('Unable to resolve Mercado Pago order');
            }

            $status = $this->mapMercadoPagoStatus((string) ($order['order_status'] ?? ''));
            $reference = (string) ($order['external_reference'] ?? '');
            $preferenceId = (string) ($order['preference_id'] ?? '');

            if ($reference === '' && $preferenceId !== '') {
                $session = $this->repo->findCheckoutSessionByPreferenceId($preferenceId);
                $reference = (string) ($session['provider_reference'] ?? '');
            }

            return [
                'provider_reference' => $reference,
                'provider_preference_id' => $preferenceId !== '' ? $preferenceId : null,
                'status' => $status,
                'raw' => ['payload' => $payload, 'query' => $query, 'order' => $order]
            ];
        }

        throw new \InvalidArgumentException('provider_reference and status are required');
    }

    private function validateWebhookSignature(array $event, array $headers, array $query, string $rawBody): void
    {
        $secret = trim((string) Env::get('MP_WEBHOOK_SECRET', ''));
        if ($secret === '') {
            return;
        }

        $topic = strtolower(trim((string) ($query['topic'] ?? $query['type'] ?? $event['raw']['payload']['type'] ?? $event['raw']['payload']['action'] ?? '')));
        $isMercadoPagoLike = $topic !== '' || isset($query['data_id']) || isset($query['id']) || isset($event['raw']['payload']['data']['id']);
        if (!$isMercadoPagoLike) {
            return;
        }

        $signatureHeader = trim((string) ($headers['x-signature'] ?? ''));
        $requestId = trim((string) ($headers['x-request-id'] ?? ''));
        if ($signatureHeader === '' || $requestId === '') {
            throw new \InvalidArgumentException('Invalid Mercado Pago signature headers');
        }

        $parts = [];
        foreach (explode(',', $signatureHeader) as $chunk) {
            if (!str_contains($chunk, '=')) {
                continue;
            }
            [$k, $v] = explode('=', trim($chunk), 2);
            $parts[strtolower(trim($k))] = trim($v);
        }

        $ts = $parts['ts'] ?? '';
        $v1 = $parts['v1'] ?? '';
        if ($ts === '' || $v1 === '') {
            throw new \InvalidArgumentException('Invalid Mercado Pago signature format');
        }

        $dataId = (string) ($query['data.id'] ?? $query['id'] ?? $event['raw']['payload']['data']['id'] ?? '');
        if ($dataId === '' && preg_match('/"id"\s*:\s*"?(?<id>[0-9]+)"?/', $rawBody, $m) === 1) {
            $dataId = (string) ($m['id'] ?? '');
        }

        $manifest = 'id:' . $dataId . ';request-id:' . $requestId . ';ts:' . $ts . ';';
        $expected = hash_hmac('sha256', $manifest, $secret);
        if (!hash_equals(strtolower($expected), strtolower($v1))) {
            throw new \InvalidArgumentException('Invalid Mercado Pago signature');
        }
    }

    private function fetchMercadoPagoPayment(string $paymentId): ?array
    {
        $token = trim((string) Env::get('MP_ACCESS_TOKEN', ''));
        if ($token === '') {
            return null;
        }

        $result = $this->httpJson(
            'GET',
            'https://api.mercadopago.com/v1/payments/' . rawurlencode($paymentId),
            ['Authorization: Bearer ' . $token]
        );

        return ($result['ok'] ?? false) && is_array($result['data']) ? $result['data'] : null;
    }

    private function fetchMercadoPagoMerchantOrder(string $orderId): ?array
    {
        $token = trim((string) Env::get('MP_ACCESS_TOKEN', ''));
        if ($token === '') {
            return null;
        }

        $result = $this->httpJson(
            'GET',
            'https://api.mercadopago.com/merchant_orders/' . rawurlencode($orderId),
            ['Authorization: Bearer ' . $token]
        );

        return ($result['ok'] ?? false) && is_array($result['data']) ? $result['data'] : null;
    }

    private function mapMercadoPagoStatus(string $status): string
    {
        $normalized = strtolower(trim($status));
        return match ($normalized) {
            'approved', 'paid', 'closed' => 'approved',
            'rejected', 'cancelled', 'refunded', 'charged_back' => 'rejected',
            'expired' => 'expired',
            default => 'pending',
        };
    }

    private function mergeSessionMetadata(array $session, array $append): ?string
    {
        $base = [];
        if (!empty($session['metadata'])) {
            $decoded = json_decode((string) $session['metadata'], true);
            if (is_array($decoded)) {
                $base = $decoded;
            }
        }
        $merged = array_merge($base, $append);
        return json_encode($merged, JSON_UNESCAPED_UNICODE);
    }

    private function decodeJsonObject(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }

        if (!is_string($value) || trim($value) === '') {
            return [];
        }

        $decoded = json_decode($value, true);
        return is_array($decoded) ? $decoded : [];
    }

    private function normalizeCheckoutFilters(array $query): array
    {
        $tenantId = (int) ($query['tenant_id'] ?? 0);
        $status = strtolower(trim((string) ($query['status'] ?? '')));
        $from = trim((string) ($query['from'] ?? ''));
        $to = trim((string) ($query['to'] ?? ''));

        if ($tenantId < 0) {
            throw new \InvalidArgumentException('tenant_id must be a positive integer');
        }

        if ($status !== '' && !in_array($status, self::ALLOWED_SESSION_STATUSES, true)) {
            throw new \InvalidArgumentException('Invalid status filter');
        }

        if ($from !== '' && !$this->isValidDateYmd($from)) {
            throw new \InvalidArgumentException('Invalid from date format. Use YYYY-MM-DD');
        }

        if ($to !== '' && !$this->isValidDateYmd($to)) {
            throw new \InvalidArgumentException('Invalid to date format. Use YYYY-MM-DD');
        }

        if ($from !== '' && $to !== '' && strcmp($from, $to) > 0) {
            throw new \InvalidArgumentException('from date must be less than or equal to to date');
        }

        return [
            'tenant_id' => $tenantId > 0 ? $tenantId : null,
            'status' => $status !== '' ? $status : null,
            'from' => $from !== '' ? $from : null,
            'to' => $to !== '' ? $to : null,
        ];
    }

    private function normalizeAlertWindow(array $input): array
    {
        $from = trim((string) ($input['from'] ?? ''));
        $to = trim((string) ($input['to'] ?? ''));

        if ($from === '' && $to === '') {
            $now = new \DateTimeImmutable('now');
            $from = $now->modify('first day of this month')->format('Y-m-d');
            $to = $now->modify('last day of this month')->format('Y-m-d');
        }

        if ($from !== '' && !$this->isValidDateYmd($from)) {
            throw new \InvalidArgumentException('Invalid from date format. Use YYYY-MM-DD');
        }
        if ($to !== '' && !$this->isValidDateYmd($to)) {
            throw new \InvalidArgumentException('Invalid to date format. Use YYYY-MM-DD');
        }

        if ($from === '' && $to !== '') {
            $from = $to;
        }
        if ($to === '' && $from !== '') {
            $to = $from;
        }

        if ($from !== '' && $to !== '' && strcmp($from, $to) > 0) {
            throw new \InvalidArgumentException('from date must be less than or equal to to date');
        }

        return ['from' => $from, 'to' => $to];
    }

    private function normalizeThreshold(mixed $value): float
    {
        if ($value === null || $value === '') {
            return 35.0;
        }

        if (!is_numeric($value)) {
            throw new \InvalidArgumentException('threshold must be numeric');
        }

        $threshold = (float) $value;
        if ($threshold < 0 || $threshold > 100) {
            throw new \InvalidArgumentException('threshold must be between 0 and 100');
        }

        return round($threshold, 2);
    }

    private function isValidDateYmd(string $date): bool
    {
        $dt = \DateTimeImmutable::createFromFormat('Y-m-d', $date);
        return $dt !== false && $dt->format('Y-m-d') === $date;
    }

    private function buildPriceLabel(float $amount, string $currency): string
    {
        $normalizedCurrency = strtoupper(trim($currency)) !== '' ? strtoupper(trim($currency)) : 'USD';
        $isInteger = abs($amount - round($amount)) < 0.00001;
        $formattedAmount = $isInteger ? (string) ((int) round($amount)) : number_format($amount, 2, '.', '');
        return $normalizedCurrency . ' ' . $formattedAmount . '/mo';
    }

    private function csvRow(array $fields): string
    {
        $escaped = array_map(static function (mixed $value): string {
            $v = (string) $value;
            $v = str_replace('"', '""', $v);
            return '"' . $v . '"';
        }, $fields);

        return implode(',', $escaped);
    }

    private function httpJson(string $method, string $url, array $headers, ?array $payload = null): array
    {
        $ch = curl_init($url);
        if ($ch === false) {
            return ['ok' => false, 'status' => 0, 'data' => null];
        }

        $httpHeaders = array_merge(['Accept: application/json'], $headers);
        $options = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => strtoupper($method),
            CURLOPT_HTTPHEADER => $httpHeaders,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_CONNECTTIMEOUT => 10,
        ];

        if ($payload !== null) {
            $options[CURLOPT_POSTFIELDS] = json_encode($payload, JSON_UNESCAPED_UNICODE);
        }

        curl_setopt_array($ch, $options);
        $body = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if (!is_string($body) || $body === '') {
            return ['ok' => false, 'status' => $status, 'data' => null];
        }

        $data = json_decode($body, true);
        $ok = $status >= 200 && $status < 300 && is_array($data);
        return ['ok' => $ok, 'status' => $status, 'data' => is_array($data) ? $data : null];
    }
}
