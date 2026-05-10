<?php

namespace App\Controllers;

use App\Services\PosService;
use Core\Request;
use Core\Response;

final class PosController
{
    public function __construct(private readonly PosService $service = new PosService())
    {
    }

    public function products(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        Response::json([
            'success' => true,
            'data' => [
                'items' => $this->service->listProducts((int) $auth['tenant_id'], (int) $auth['gym_id'])
            ]
        ]);
    }

    public function lowStockProducts(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $threshold = Request::query('threshold', null);
        try {
            $data = $this->service->listLowStockProducts((int) $auth['tenant_id'], (int) $auth['gym_id'], $threshold);
            Response::json([
                'success' => true,
                'data' => $data
            ]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to fetch low stock products'], 500);
        }
    }

    public function summary(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        Response::json([
            'success' => true,
            'data' => $this->service->getSummary((int) $auth['tenant_id'], (int) $auth['gym_id'])
        ]);
    }

    public function createProduct(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        try {
            $id = $this->service->createProduct((int) $auth['tenant_id'], (int) $auth['gym_id'], Request::json());
            Response::json(['success' => true, 'data' => ['id' => $id]], 201);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to create POS product'], 500);
        }
    }

    public function sales(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $page = max(1, (int) Request::query('page', 1));
        $perPage = min(100, max(1, (int) Request::query('per_page', 20)));
        Response::json([
            'success' => true,
            'data' => $this->service->listSales((int) $auth['tenant_id'], (int) $auth['gym_id'], $page, $perPage)
        ]);
    }

    public function createSale(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        try {
            $data = $this->service->createSale(
                (int) $auth['tenant_id'],
                (int) $auth['gym_id'],
                (int) ($auth['sub'] ?? 0),
                Request::json()
            );
            Response::json(['success' => true, 'data' => $data], 201);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to create POS sale'], 500);
        }
    }

    public function voidSale(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $saleId = (int) Request::param('id', 0);
        try {
            $data = $this->service->voidSale(
                (int) $auth['tenant_id'],
                (int) $auth['gym_id'],
                (int) ($auth['sub'] ?? 0),
                $saleId,
                Request::json()
            );
            Response::json(['success' => true, 'data' => $data]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to void POS sale'], 500);
        }
    }

    public function saleReceipt(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $saleId = (int) Request::param('id', 0);
        try {
            $data = $this->service->getSaleReceipt((int) $auth['tenant_id'], (int) $auth['gym_id'], $saleId);
            Response::json(['success' => true, 'data' => $data]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to build POS sale receipt'], 500);
        }
    }

    public function saleReceiptByNumber(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $receiptNumber = (string) Request::query('number', '');
        try {
            $data = $this->service->getSaleReceiptByNumber((int) $auth['tenant_id'], (int) $auth['gym_id'], $receiptNumber);
            Response::json(['success' => true, 'data' => $data]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to build POS sale receipt'], 500);
        }
    }

    public function memberAccountCharges(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $status = trim((string) Request::query('status', ''));
        $page = max(1, (int) Request::query('page', 1));
        $perPage = min(100, max(1, (int) Request::query('per_page', 20)));
        Response::json([
            'success' => true,
            'data' => $this->service->listMemberAccountCharges((int) $auth['tenant_id'], (int) $auth['gym_id'], $status, $page, $perPage)
        ]);
    }

    public function settleMemberAccountCharge(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $chargeId = (int) Request::param('id', 0);
        try {
            $data = $this->service->settleMemberAccountCharge(
                (int) $auth['tenant_id'],
                (int) $auth['gym_id'],
                (int) ($auth['sub'] ?? 0),
                $chargeId,
                Request::json()
            );
            Response::json(['success' => true, 'data' => $data]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to settle member account charge'], 500);
        }
    }

    public function adjustStock(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        try {
            $data = $this->service->adjustStock(
                (int) $auth['tenant_id'],
                (int) $auth['gym_id'],
                (int) ($auth['sub'] ?? 0),
                Request::json()
            );
            Response::json(['success' => true, 'data' => $data]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to adjust stock'], 500);
        }
    }

    public function stockMovements(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $productId = (int) Request::query('product_id', 0);
        $page = max(1, (int) Request::query('page', 1));
        $perPage = min(100, max(1, (int) Request::query('per_page', 20)));
        Response::json([
            'success' => true,
            'data' => $this->service->listStockMovements(
                (int) $auth['tenant_id'],
                (int) $auth['gym_id'],
                $productId > 0 ? $productId : null,
                $page,
                $perPage
            )
        ]);
    }

    public function openCashSession(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        try {
            $data = $this->service->openCashSession(
                (int) $auth['tenant_id'],
                (int) $auth['gym_id'],
                (int) ($auth['sub'] ?? 0),
                Request::json()
            );
            Response::json(['success' => true, 'data' => $data], 201);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to open cash session'], 500);
        }
    }

    public function openCashSessionSummary(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $data = $this->service->getOpenCashSessionSummary((int) $auth['tenant_id'], (int) $auth['gym_id']);
        Response::json(['success' => true, 'data' => $data]);
    }

    public function closeCashSession(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        try {
            $data = $this->service->closeCashSession(
                (int) $auth['tenant_id'],
                (int) $auth['gym_id'],
                (int) ($auth['sub'] ?? 0),
                Request::json()
            );
            Response::json(['success' => true, 'data' => $data]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to close cash session'], 500);
        }
    }

    public function cashSessions(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $page = max(1, (int) Request::query('page', 1));
        $perPage = min(100, max(1, (int) Request::query('per_page', 20)));
        $userId = Request::query('user_id', null);
        try {
            Response::json([
                'success' => true,
                'data' => $this->service->listCashSessions((int) $auth['tenant_id'], (int) $auth['gym_id'], $page, $perPage, $userId)
            ]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to list cash sessions'], 500);
        }
    }

    public function cashSessionReport(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $sessionId = (int) Request::param('id', 0);
        try {
            $data = $this->service->getCashSessionReport((int) $auth['tenant_id'], (int) $auth['gym_id'], $sessionId);
            Response::json(['success' => true, 'data' => $data]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to build cash session report'], 500);
        }
    }

    public function zCloseReport(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $date = Request::query('date', null);
        try {
            $data = $this->service->getDailyZCloseReport((int) $auth['tenant_id'], (int) $auth['gym_id'], $date);
            Response::json(['success' => true, 'data' => $data]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to build POS daily Z close report'], 500);
        }
    }

    public function cashByOperatorReport(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $dateFrom = Request::query('date_from', null);
        $dateTo = Request::query('date_to', null);
        $userId = Request::query('user_id', null);
        try {
            $data = $this->service->getCashByOperatorReport(
                (int) $auth['tenant_id'],
                (int) $auth['gym_id'],
                $dateFrom,
                $dateTo,
                $userId
            );
            Response::json(['success' => true, 'data' => $data]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to build cash-by-operator report'], 500);
        }
    }

    public function alerts(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $dateFrom = Request::query('date_from', null);
        $dateTo = Request::query('date_to', null);
        $differenceThreshold = Request::query('difference_threshold', null);
        $voidsThreshold = Request::query('voids_threshold', null);
        try {
            $data = $this->service->getOperationalAlerts(
                (int) ($auth['tenant_id'] ?? 0),
                (int) ($auth['gym_id'] ?? 0),
                $dateFrom,
                $dateTo,
                $differenceThreshold,
                $voidsThreshold
            );
            Response::json(['success' => true, 'data' => $data]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to build POS operational alerts'], 500);
        }
    }

    public function zCloseReportExport(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $date = Request::query('date', null);
        try {
            $tenantId = (int) ($auth['tenant_id'] ?? 0);
            $gymId = (int) ($auth['gym_id'] ?? 0);
            $data = $this->service->getDailyZCloseReport($tenantId, $gymId, $date);
            $this->emitZCloseCsv($tenantId, $gymId, $data);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to export POS daily Z close report'], 500);
        }
    }

    public function audit(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $page = max(1, (int) Request::query('page', 1));
        $perPage = min(100, max(1, (int) Request::query('per_page', 20)));
        $dateFrom = Request::query('date_from', null);
        $dateTo = Request::query('date_to', null);
        $action = Request::query('action', null);
        $userId = Request::query('user_id', null);

        try {
            $data = $this->service->listPosAudit(
                (int) ($auth['tenant_id'] ?? 0),
                (int) ($auth['gym_id'] ?? 0),
                $dateFrom,
                $dateTo,
                $action,
                $userId,
                $page,
                $perPage
            );
            Response::json(['success' => true, 'data' => $data]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to fetch POS audit logs'], 500);
        }
    }

    public function auditExport(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $dateFrom = Request::query('date_from', null);
        $dateTo = Request::query('date_to', null);
        $action = Request::query('action', null);
        $userId = Request::query('user_id', null);

        try {
            $tenantId = (int) ($auth['tenant_id'] ?? 0);
            $gymId = (int) ($auth['gym_id'] ?? 0);
            $data = $this->service->exportPosAudit($tenantId, $gymId, $dateFrom, $dateTo, $action, $userId);
            $this->emitPosAuditCsv($tenantId, $gymId, $data);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to export POS audit logs'], 500);
        }
    }

    public function config(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $data = $this->service->getPosConfig((int) $auth['tenant_id'], (int) $auth['gym_id']);
        Response::json(['success' => true, 'data' => $data]);
    }

    public function updateConfig(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        try {
            $data = $this->service->updatePosConfig((int) $auth['tenant_id'], (int) $auth['gym_id'], Request::json());
            Response::json(['success' => true, 'data' => $data]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to update POS config'], 500);
        }
    }

    private function emitZCloseCsv(int $tenantId, int $gymId, array $report): never
    {
        $reportDate = (string) ($report['date'] ?? date('Y-m-d'));
        $filename = 'z-close-' . $reportDate . '.csv';

        http_response_code(200);
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: no-store, no-cache, must-revalidate');

        $out = fopen('php://output', 'wb');
        if ($out === false) {
            Response::json(['success' => false, 'message' => 'Unable to create CSV output'], 500);
        }

        fputcsv($out, ['section', 'metric', 'value']);

        fputcsv($out, ['metadata', 'tenant_id', (string) $tenantId]);
        fputcsv($out, ['metadata', 'gym_id', (string) $gymId]);
        fputcsv($out, ['metadata', 'date', $reportDate]);
        fputcsv($out, ['', '', '']);

        $cashSessions = is_array($report['cash_sessions'] ?? null) ? $report['cash_sessions'] : [];
        $this->writeSectionRows($out, 'cash_sessions', [
            'opened_count' => $cashSessions['opened_count'] ?? 0,
            'closed_count' => $cashSessions['closed_count'] ?? 0,
            'opening_total' => $cashSessions['opening_total'] ?? 0,
            'expected_total' => $cashSessions['expected_total'] ?? 0,
            'closing_total' => $cashSessions['closing_total'] ?? 0,
            'difference_total' => $cashSessions['difference_total'] ?? 0,
        ]);

        $payments = is_array($report['payments'] ?? null) ? $report['payments'] : [];
        $paymentsByMethod = is_array($payments['by_method'] ?? null) ? $payments['by_method'] : [];
        $this->writeSectionRows($out, 'payments_by_method', [
            'cash' => $paymentsByMethod['cash'] ?? 0,
            'transfer' => $paymentsByMethod['transfer'] ?? 0,
            'mercadopago' => $paymentsByMethod['mercadopago'] ?? 0,
            'card' => $paymentsByMethod['card'] ?? 0,
            'other' => $paymentsByMethod['other'] ?? 0,
            'total' => $payments['total'] ?? 0,
        ]);

        $posSales = is_array($report['pos_sales'] ?? null) ? $report['pos_sales'] : [];
        $this->writeSectionRows($out, 'pos_sales', [
            'count' => $posSales['count'] ?? 0,
            'total' => $posSales['total'] ?? 0,
        ]);

        $settlements = is_array($report['member_account_settlements'] ?? null) ? $report['member_account_settlements'] : [];
        $this->writeSectionRows($out, 'member_account_settlements', [
            'count' => $settlements['count'] ?? 0,
            'total' => $settlements['total'] ?? 0,
        ]);

        fclose($out);
        exit;
    }

    private function emitPosAuditCsv(int $tenantId, int $gymId, array $auditData): never
    {
        $filters = is_array($auditData['filters'] ?? null) ? $auditData['filters'] : [];
        $items = is_array($auditData['items'] ?? null) ? $auditData['items'] : [];

        $suffix = trim((string) ($filters['date_from'] ?? ''));
        if ($suffix === '') {
            $suffix = date('Y-m-d');
        }
        $filename = 'pos-audit-' . $suffix . '.csv';

        http_response_code(200);
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: no-store, no-cache, must-revalidate');

        $out = fopen('php://output', 'wb');
        if ($out === false) {
            Response::json(['success' => false, 'message' => 'Unable to create CSV output'], 500);
        }

        fputcsv($out, ['section', 'field', 'value']);
        fputcsv($out, ['metadata', 'tenant_id', (string) $tenantId]);
        fputcsv($out, ['metadata', 'gym_id', (string) $gymId]);
        fputcsv($out, ['filter', 'date_from', (string) ($filters['date_from'] ?? '')]);
        fputcsv($out, ['filter', 'date_to', (string) ($filters['date_to'] ?? '')]);
        fputcsv($out, ['filter', 'action', (string) ($filters['action'] ?? '')]);
        fputcsv($out, ['filter', 'user_id', (string) ($filters['user_id'] ?? '')]);
        fputcsv($out, ['', '', '']);

        fputcsv($out, [
            'audit',
            'id',
            'created_at',
            'user_id',
            'user_email',
            'entity_type',
            'entity_id',
            'action',
            'ip_address',
            'user_agent',
            'metadata_json'
        ]);

        foreach ($items as $item) {
            $user = is_array($item['user'] ?? null) ? $item['user'] : [];
            fputcsv($out, [
                'audit',
                (string) ($item['id'] ?? ''),
                (string) ($item['created_at'] ?? ''),
                (string) ($item['user_id'] ?? ''),
                (string) ($user['email'] ?? ''),
                (string) ($item['entity_type'] ?? ''),
                (string) ($item['entity_id'] ?? ''),
                (string) ($item['action'] ?? ''),
                (string) ($item['ip_address'] ?? ''),
                (string) ($item['user_agent'] ?? ''),
                $this->normalizeCsvValue($item['metadata'] ?? null),
            ]);
        }

        fclose($out);
        exit;
    }

    /**
     * @param resource $out
     */
    private function writeSectionRows($out, string $section, array $rows): void
    {
        foreach ($rows as $metric => $value) {
            fputcsv($out, [$section, (string) $metric, $this->normalizeCsvValue($value)]);
        }
        fputcsv($out, ['', '', '']);
    }

    private function normalizeCsvValue(mixed $value): string
    {
        if ($value === null) {
            return '';
        }
        if (is_bool($value)) {
            return $value ? '1' : '0';
        }
        if (!is_scalar($value)) {
            return (string) json_encode($value, JSON_UNESCAPED_UNICODE);
        }
        return (string) $value;
    }
}
