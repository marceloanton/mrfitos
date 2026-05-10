<?php

namespace App\Controllers;

use App\Services\AdminAddonService;
use Core\Request;
use Core\Response;

final class AdminAddonController
{
    public function __construct(private readonly AdminAddonService $service = new AdminAddonService())
    {
    }

    public function showTenantAddons(): void
    {
        $tenantId = (int) Request::param('tenant_id', 0);
        if ($tenantId <= 0) {
            Response::json(['success' => false, 'message' => 'tenant_id must be a positive integer'], 422);
        }

        try {
            $data = $this->service->getTenantAddonOverview($tenantId);
            Response::json([
                'success' => true,
                'message' => 'Tenant addons fetched',
                'data' => $data
            ]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 404);
        }
    }

    public function updateTenantAddon(): void
    {
        $tenantId = (int) Request::param('tenant_id', 0);
        if ($tenantId <= 0) {
            Response::json(['success' => false, 'message' => 'tenant_id must be a positive integer'], 422);
        }

        $addonCode = strtolower(trim((string) Request::param('addon_code', '')));
        if ($addonCode === '') {
            Response::json(['success' => false, 'message' => 'addon_code is required'], 422);
        }

        $payload = Request::json();
        if (!array_key_exists('active', $payload) || !is_bool($payload['active'])) {
            Response::json(['success' => false, 'message' => 'active must be boolean'], 422);
        }

        try {
            $data = $this->service->setAddonState($tenantId, $addonCode, (bool) $payload['active']);
            Response::json([
                'success' => true,
                'message' => 'Tenant addon updated',
                'data' => $data
            ]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 404);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to update tenant addon'], 500);
        }
    }

    public function catalog(): void
    {
        try {
            $data = $this->service->getAddonCatalogSummary();
            Response::json([
                'success' => true,
                'message' => 'Addon catalog loaded',
                'data' => $data
            ]);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to load addon catalog'], 500);
        }
    }

    public function updateCatalogAddon(): void
    {
        $addonCode = strtolower(trim((string) Request::param('addon_code', '')));
        if ($addonCode === '') {
            Response::json(['success' => false, 'message' => 'addon_code is required'], 422);
        }

        $payload = Request::json();
        try {
            $authUserRaw = $_SERVER['auth_user'] ?? null;
            $authUser = is_string($authUserRaw) ? json_decode($authUserRaw, true) : [];
            $data = $this->service->updateCatalogAddon($addonCode, $payload, [
                'tenant_id' => (int) ($authUser['tenant_id'] ?? 0),
                'gym_id' => isset($authUser['gym_id']) ? (int) $authUser['gym_id'] : null,
                'user_id' => isset($authUser['id']) ? (int) $authUser['id'] : null,
                'ip_address' => (string) ($_SERVER['REMOTE_ADDR'] ?? ''),
                'user_agent' => (string) ($_SERVER['HTTP_USER_AGENT'] ?? '')
            ]);
            Response::json([
                'success' => true,
                'message' => 'Addon catalog updated',
                'data' => $data
            ]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to update addon catalog'], 500);
        }
    }

    public function catalogAudit(): void
    {
        try {
            $authUserRaw = $_SERVER['auth_user'] ?? null;
            $authUser = is_string($authUserRaw) ? json_decode($authUserRaw, true) : [];
            $tenantId = (int) ($authUser['tenant_id'] ?? 0);
            $data = $this->service->getCatalogAudit([
                'tenant_id' => $tenantId,
                'from' => Request::query('from'),
                'to' => Request::query('to'),
                'addon_code' => Request::query('addon_code'),
                'user_id' => Request::query('user_id'),
                'page' => Request::query('page'),
                'per_page' => Request::query('per_page'),
            ]);
            Response::json([
                'success' => true,
                'message' => 'Addon catalog audit loaded',
                'data' => $data
            ]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to load addon catalog audit'], 500);
        }
    }

    public function exportCatalogAuditCsv(): void
    {
        try {
            $authUserRaw = $_SERVER['auth_user'] ?? null;
            $authUser = is_string($authUserRaw) ? json_decode($authUserRaw, true) : [];
            $tenantId = (int) ($authUser['tenant_id'] ?? 0);
            $rows = $this->service->exportCatalogAudit([
                'tenant_id' => $tenantId,
                'from' => Request::query('from'),
                'to' => Request::query('to'),
                'addon_code' => Request::query('addon_code'),
                'user_id' => Request::query('user_id'),
                'page' => Request::query('page'),
                'per_page' => Request::query('per_page'),
            ]);

            $filename = 'addon_catalog_audit_' . gmdate('Ymd_His') . '.csv';
            $headers = ['created_at', 'addon_code', 'user_email', 'user_name', 'before_price_monthly', 'after_price_monthly', 'before_is_active', 'after_is_active', 'ip_address'];
            $this->emitCsv($filename, $headers, $rows);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to export addon catalog audit'], 500);
        }
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
}
