<?php

namespace App\Controllers;

use App\Services\BillingService;
use DateTimeImmutable;
use Core\Request;
use Core\Response;

final class BillingController
{
    public function __construct(private readonly BillingService $service = new BillingService())
    {
    }

    public function createCheckoutSession(): void
    {
        $payload = Request::json();

        $tenantId = (int) ($payload['tenant_id'] ?? 0);
        $planCode = isset($payload['plan_code']) ? (string) $payload['plan_code'] : null;
        $addonCode = isset($payload['addon_code']) ? (string) $payload['addon_code'] : null;
        $context = isset($payload['context']) ? (string) $payload['context'] : null;

        if ($tenantId <= 0) {
            Response::json(['success' => false, 'message' => 'tenant_id must be a positive integer'], 422);
        }

        try {
            $data = $this->service->createCheckoutSession($tenantId, $planCode, $addonCode, $context);
            Response::json([
                'success' => true,
                'message' => 'Checkout session created',
                'data' => $data
            ], 201);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to create checkout session'], 500);
        }
    }

    public function selfServiceCreateCheckoutSession(): void
    {
        $tenantId = $this->resolveAuthTenantId();
        if ($tenantId <= 0) {
            Response::json(['success' => false, 'message' => 'Unauthorized context'], 401);
        }

        $payload = Request::json();
        $planCode = isset($payload['plan_code']) ? (string) $payload['plan_code'] : null;
        $addonCode = isset($payload['addon_code']) ? (string) $payload['addon_code'] : null;
        $context = isset($payload['context']) ? (string) $payload['context'] : 'self_service_upgrade';

        try {
            $data = $this->service->createCheckoutSession($tenantId, $planCode, $addonCode, $context);
            Response::json([
                'success' => true,
                'message' => 'Self-service checkout session created',
                'data' => $data
            ], 201);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to create self-service checkout session'], 500);
        }
    }

    public function selfServiceAddons(): void
    {
        $tenantId = $this->resolveAuthTenantId();
        if ($tenantId <= 0) {
            Response::json(['success' => false, 'message' => 'Unauthorized context'], 401);
        }

        try {
            $data = $this->service->getTenantAddonsForSelfService($tenantId);
            Response::json([
                'success' => true,
                'message' => 'Self-service addons loaded',
                'data' => $data
            ]);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to load self-service addons'], 500);
        }
    }

    public function mercadoPagoWebhook(): void
    {
        try {
            $data = $this->service->processMercadoPagoWebhook(
                Request::json(),
                $_GET,
                [
                    'x-signature' => (string) (Request::header('x-signature') ?? ''),
                    'x-request-id' => (string) (Request::header('x-request-id') ?? '')
                ],
                (string) file_get_contents('php://input')
            );
            Response::json([
                'success' => true,
                'message' => 'Webhook processed',
                'data' => $data
            ]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to process webhook'], 500);
        }
    }

    public function publicPricing(): void
    {
        try {
            $data = $this->service->getPublicPricingCatalog();
            $lastModifiedAt = $this->service->getPublicPricingLastModifiedAt();
            $lastModifiedHeader = gmdate('D, d M Y H:i:s', $lastModifiedAt->getTimestamp()) . ' GMT';
            $payload = [
                'success' => true,
                'message' => 'Public pricing loaded',
                'data' => $data
            ];

            $etag = '"' . hash('sha256', json_encode($payload, JSON_UNESCAPED_UNICODE)) . '"';
            $cacheHeaders = [
                'Cache-Control' => 'public, max-age=300, s-maxage=600, stale-while-revalidate=120',
                'ETag' => $etag,
                'Last-Modified' => $lastModifiedHeader
            ];

            $ifNoneMatch = (string) (Request::header('if-none-match') ?? '');
            $ifModifiedSince = (string) (Request::header('if-modified-since') ?? '');
            if ($this->matchesEtag($ifNoneMatch, $etag) || $this->matchesIfModifiedSince($ifModifiedSince, $lastModifiedAt)) {
                Response::noContent(304, $cacheHeaders);
            }

            Response::json($payload, 200, $cacheHeaders);
        } catch (\Throwable $e) {
            Response::json([
                'success' => false,
                'message' => 'Failed to load public pricing',
                'data' => [
                    'plans' => [],
                    'addons' => []
                ]
            ], 500);
        }
    }

    public function checkoutSessionStatus(): void
    {
        $providerReference = (string) Request::param('provider_reference', '');

        try {
            $data = $this->service->getCheckoutSessionStatusByReference($providerReference);
            Response::json([
                'success' => true,
                'message' => 'Checkout session fetched',
                'data' => $data
            ]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\OutOfBoundsException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 404);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to fetch checkout session'], 500);
        }
    }

    public function adminCheckoutSessions(): void
    {
        try {
            $data = $this->service->listAdminCheckoutSessions([
                'tenant_id' => Request::query('tenant_id'),
                'status' => Request::query('status'),
                'from' => Request::query('from'),
                'to' => Request::query('to'),
                'page' => Request::query('page'),
                'per_page' => Request::query('per_page'),
            ]);

            Response::json([
                'success' => true,
                'message' => 'Checkout sessions loaded',
                'data' => $data
            ]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to load checkout sessions'], 500);
        }
    }

    public function adminBillingFunnel(): void
    {
        try {
            $data = $this->service->getAdminBillingFunnel([
                'tenant_id' => Request::query('tenant_id'),
                'from' => Request::query('from'),
                'to' => Request::query('to'),
            ]);

            Response::json([
                'success' => true,
                'message' => 'Billing funnel loaded',
                'data' => $data
            ]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to load billing funnel'], 500);
        }
    }

    public function adminTenantRanking(): void
    {
        try {
            $data = $this->service->getTenantConversionRanking([
                'from' => Request::query('from'),
                'to' => Request::query('to'),
                'limit' => Request::query('limit'),
            ]);

            Response::json([
                'success' => true,
                'message' => 'Tenant conversion ranking loaded',
                'data' => $data
            ]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to load tenant conversion ranking'], 500);
        }
    }

    public function cronConversionAlert(): void
    {
        $payload = Request::json();
        try {
            $data = $this->service->evaluateConversionAlert([
                'tenant_id' => $payload['tenant_id'] ?? Request::query('tenant_id'),
                'from' => $payload['from'] ?? Request::query('from'),
                'to' => $payload['to'] ?? Request::query('to'),
                'threshold' => $payload['threshold'] ?? Request::query('threshold'),
            ]);

            Response::json([
                'success' => true,
                'message' => $data['alert_triggered'] ? 'Billing conversion alert triggered' : 'Billing conversion is within threshold',
                'data' => $data
            ]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to process billing conversion alert'], 500);
        }
    }

    public function exportAdminCheckoutSessionsCsv(): void
    {
        try {
            $rows = $this->service->exportAdminCheckoutSessions([
                'tenant_id' => Request::query('tenant_id'),
                'status' => Request::query('status'),
                'from' => Request::query('from'),
                'to' => Request::query('to'),
            ]);

            $headers = ['id', 'tenant_id', 'provider_reference', 'status', 'amount', 'currency', 'plan_code', 'addon_code', 'created_at', 'processed_at'];
            $filename = 'billing_checkout_sessions_' . gmdate('Ymd_His') . '.csv';
            $this->emitCsv($filename, $headers, $rows);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to export checkout sessions'], 500);
        }
    }

    public function exportAdminBillingFunnelCsv(): void
    {
        try {
            $row = $this->service->exportAdminBillingFunnel([
                'tenant_id' => Request::query('tenant_id'),
                'from' => Request::query('from'),
                'to' => Request::query('to'),
            ]);

            $headers = ['total_sessions', 'approved', 'pending', 'rejected', 'expired', 'approval_rate'];
            $filename = 'billing_funnel_' . gmdate('Ymd_His') . '.csv';
            $this->emitCsv($filename, $headers, [$row]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to export billing funnel'], 500);
        }
    }

    public function exportAdminTenantRankingCsv(): void
    {
        try {
            $payload = $this->service->getTenantConversionRanking([
                'from' => Request::query('from'),
                'to' => Request::query('to'),
                'limit' => Request::query('limit') ?? 100,
            ]);

            $rows = is_array($payload['items'] ?? null) ? $payload['items'] : [];
            $headers = [
                'tenant_id',
                'tenant_name',
                'clicks',
                'checkout_sessions',
                'approved_sessions',
                'checkout_to_approved_rate',
                'click_to_approved_rate',
                'partial_historical_data'
            ];
            $filename = 'billing_tenant_ranking_' . gmdate('Ymd_His') . '.csv';
            $this->emitCsv($filename, $headers, $rows);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to export tenant ranking'], 500);
        }
    }

    private function matchesEtag(string $ifNoneMatchHeader, string $currentEtag): bool
    {
        if (trim($ifNoneMatchHeader) === '') {
            return false;
        }

        foreach (explode(',', $ifNoneMatchHeader) as $candidate) {
            $normalized = trim($candidate);
            if ($normalized === '*') {
                return true;
            }

            if (str_starts_with($normalized, 'W/')) {
                $normalized = substr($normalized, 2);
            }

            if ($normalized === $currentEtag) {
                return true;
            }
        }

        return false;
    }

    private function matchesIfModifiedSince(string $ifModifiedSinceHeader, DateTimeImmutable $lastModifiedAt): bool
    {
        $value = trim($ifModifiedSinceHeader);
        if ($value === '') {
            return false;
        }

        $ifModifiedSinceTs = strtotime($value);
        if ($ifModifiedSinceTs === false) {
            return false;
        }

        return $ifModifiedSinceTs >= $lastModifiedAt->getTimestamp();
    }

    private function emitCsv(string $filename, array $headers, array $rows): never
    {
        http_response_code(200);
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: no-store, no-cache, must-revalidate');

        $out = fopen('php://output', 'wb');
        if ($out === false) {
            Response::json(['success' => false, 'message' => 'Unable to create CSV output'], 500);
        }

        fputcsv($out, $headers);
        foreach ($rows as $row) {
            $line = [];
            foreach ($headers as $column) {
                $value = $row[$column] ?? '';
                if ($value === null) {
                    $value = '';
                } elseif (is_bool($value)) {
                    $value = $value ? '1' : '0';
                } elseif (!is_scalar($value)) {
                    $value = json_encode($value, JSON_UNESCAPED_UNICODE);
                }
                $line[] = (string) $value;
            }
            fputcsv($out, $line);
        }
        fclose($out);
        exit;
    }

    private function resolveAuthTenantId(): int
    {
        $authUserRaw = $_SERVER['auth_user'] ?? null;
        $authUser = is_string($authUserRaw) ? json_decode($authUserRaw, true) : null;
        return (int) ($authUser['tenant_id'] ?? 0);
    }
}
