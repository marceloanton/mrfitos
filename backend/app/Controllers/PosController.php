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

    public function autosettleKpi(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $date = Request::query('date', null);
        $dateFrom = Request::query('date_from', null);
        $dateTo = Request::query('date_to', null);
        try {
            $data = $this->service->getMemberAccountAutosettleKpi(
                (int) ($auth['tenant_id'] ?? 0),
                (int) ($auth['gym_id'] ?? 0),
                is_string($date) ? $date : null,
                is_string($dateFrom) ? $dateFrom : null,
                is_string($dateTo) ? $dateTo : null
            );
            Response::json(['success' => true, 'data' => $data]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to fetch POS autosettle KPI'], 500);
        }
    }

    public function autosettleKpiExport(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $date = Request::query('date', null);
        $dateFrom = Request::query('date_from', null);
        $dateTo = Request::query('date_to', null);
        try {
            $tenantId = (int) ($auth['tenant_id'] ?? 0);
            $gymId = (int) ($auth['gym_id'] ?? 0);
            $data = $this->service->getMemberAccountAutosettleKpi(
                $tenantId,
                $gymId,
                is_string($date) ? $date : null,
                is_string($dateFrom) ? $dateFrom : null,
                is_string($dateTo) ? $dateTo : null
            );
            $this->emitAutosettleKpiCsv($tenantId, $gymId, $data);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to export POS autosettle KPI'], 500);
        }
    }

    public function memberAccountAging(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        try {
            $data = $this->service->getMemberAccountAging(
                (int) ($auth['tenant_id'] ?? 0),
                (int) ($auth['gym_id'] ?? 0)
            );
            Response::json(['success' => true, 'data' => $data]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to fetch member account aging'], 500);
        }
    }

    public function memberAccountOverdueWhatsAppLink(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $memberId = (int) Request::query('member_id', 0);
        try {
            $data = $this->service->buildMemberOverdueWhatsAppLink(
                (int) ($auth['tenant_id'] ?? 0),
                (int) ($auth['gym_id'] ?? 0),
                $memberId,
                (int) ($auth['sub'] ?? 0)
            );
            Response::json(['success' => true, 'data' => $data]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to build overdue WhatsApp link'], 500);
        }
    }

    public function memberAccountCollectionsKpiToday(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        try {
            $data = $this->service->getMemberAccountCollectionsKpiToday(
                (int) ($auth['tenant_id'] ?? 0),
                (int) ($auth['gym_id'] ?? 0)
            );
            Response::json(['success' => true, 'data' => $data]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to fetch member account collections KPI'], 500);
        }
    }

    public function memberAccountFollowupUpsert(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        try {
            $data = $this->service->upsertMemberAccountFollowup(
                (int) ($auth['tenant_id'] ?? 0),
                (int) ($auth['gym_id'] ?? 0),
                (int) ($auth['sub'] ?? 0),
                Request::json()
            );
            Response::json(['success' => true, 'data' => $data]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to update member account followup'], 500);
        }
    }

    public function memberAccountFollowupContactResult(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        try {
            $data = $this->service->updateMemberAccountFollowupContactResult(
                (int) ($auth['tenant_id'] ?? 0),
                (int) ($auth['gym_id'] ?? 0),
                (int) ($auth['sub'] ?? 0),
                Request::json()
            );
            Response::json(['success' => true, 'data' => $data]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to update contact result'], 500);
        }
    }

    public function memberAccountFollowupFunnelWeekly(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $dateFrom = Request::query('date_from', null);
        $dateTo = Request::query('date_to', null);
        try {
            $data = $this->service->getMemberAccountFollowupFunnelWeekly(
                (int) ($auth['tenant_id'] ?? 0),
                (int) ($auth['gym_id'] ?? 0),
                $dateFrom,
                $dateTo
            );
            Response::json(['success' => true, 'data' => $data]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to fetch member account followup funnel'], 500);
        }
    }

    public function memberAccountPromiseAgenda(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $limit = Request::query('limit', null);
        try {
            $data = $this->service->getMemberAccountPromiseAgenda(
                (int) ($auth['tenant_id'] ?? 0),
                (int) ($auth['gym_id'] ?? 0),
                $limit
            );
            Response::json(['success' => true, 'data' => $data]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to fetch member account promise agenda'], 500);
        }
    }

    public function memberAccountPromiseAgendaExport(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $limit = Request::query('limit', null);
        try {
            $tenantId = (int) ($auth['tenant_id'] ?? 0);
            $gymId = (int) ($auth['gym_id'] ?? 0);
            $data = $this->service->getMemberAccountPromiseAgenda($tenantId, $gymId, $limit);
            $this->emitMemberAccountPromiseAgendaCsv($tenantId, $gymId, $data);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to export member account promise agenda'], 500);
        }
    }

    public function memberAccountPromiseAgendaBulkContacted(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        try {
            $data = $this->service->markOverduePromisesAsContacted(
                (int) ($auth['tenant_id'] ?? 0),
                (int) ($auth['gym_id'] ?? 0),
                (int) ($auth['sub'] ?? 0)
            );
            Response::json(['success' => true, 'data' => $data]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to mark overdue promises as contacted'], 500);
        }
    }

    public function memberAccountPromiseAgendaOverdueWhatsAppLinks(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $limit = Request::query('limit', null);
        try {
            $data = $this->service->buildOverduePromiseWhatsAppBatch(
                (int) ($auth['tenant_id'] ?? 0),
                (int) ($auth['gym_id'] ?? 0),
                $limit
            );
            Response::json(['success' => true, 'data' => $data]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to build overdue promise WhatsApp links'], 500);
        }
    }

    public function memberAccountPromiseAgendaOverdueWhatsAppLinksExport(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $limit = Request::query('limit', null);
        try {
            $tenantId = (int) ($auth['tenant_id'] ?? 0);
            $gymId = (int) ($auth['gym_id'] ?? 0);
            $data = $this->service->buildOverduePromiseWhatsAppBatch($tenantId, $gymId, $limit);
            $this->emitOverduePromiseWhatsAppLinksCsv($tenantId, $gymId, $data);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to export overdue promise WhatsApp links'], 500);
        }
    }

    public function memberAccountContactEffectivenessToday(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        try {
            $data = $this->service->getMemberAccountContactEffectivenessToday(
                (int) ($auth['tenant_id'] ?? 0),
                (int) ($auth['gym_id'] ?? 0)
            );
            Response::json(['success' => true, 'data' => $data]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to fetch contact effectiveness KPI'], 500);
        }
    }

    public function memberAccountContactEffectivenessRange(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $dateFrom = Request::query('date_from', null);
        $dateTo = Request::query('date_to', null);
        try {
            $data = $this->service->getMemberAccountContactEffectivenessRange(
                (int) ($auth['tenant_id'] ?? 0),
                (int) ($auth['gym_id'] ?? 0),
                $dateFrom,
                $dateTo
            );
            Response::json(['success' => true, 'data' => $data]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to fetch contact effectiveness range'], 500);
        }
    }

    public function memberAccountContactEffectivenessRangeExport(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $dateFrom = Request::query('date_from', null);
        $dateTo = Request::query('date_to', null);
        try {
            $tenantId = (int) ($auth['tenant_id'] ?? 0);
            $gymId = (int) ($auth['gym_id'] ?? 0);
            $data = $this->service->getMemberAccountContactEffectivenessRange($tenantId, $gymId, $dateFrom, $dateTo);
            $this->emitMemberAccountContactEffectivenessCsv($tenantId, $gymId, $data);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to export contact effectiveness range'], 500);
        }
    }

    public function memberAccountCollectorRanking(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $dateFrom = Request::query('date_from', null);
        $dateTo = Request::query('date_to', null);
        $limit = Request::query('limit', null);
        $sortBy = Request::query('sort_by', null);
        $sortDir = Request::query('sort_dir', null);
        try {
            $data = $this->service->getMemberAccountCollectorRanking(
                (int) ($auth['tenant_id'] ?? 0),
                (int) ($auth['gym_id'] ?? 0),
                $dateFrom,
                $dateTo,
                $limit,
                $sortBy,
                $sortDir
            );
            Response::json(['success' => true, 'data' => $data]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to fetch collector ranking'], 500);
        }
    }

    public function memberAccountCollectorRankingExport(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $dateFrom = Request::query('date_from', null);
        $dateTo = Request::query('date_to', null);
        $limit = Request::query('limit', null);
        $sortBy = Request::query('sort_by', null);
        $sortDir = Request::query('sort_dir', null);
        try {
            $tenantId = (int) ($auth['tenant_id'] ?? 0);
            $gymId = (int) ($auth['gym_id'] ?? 0);
            $data = $this->service->getMemberAccountCollectorRanking($tenantId, $gymId, $dateFrom, $dateTo, $limit, $sortBy, $sortDir);
            $this->emitMemberAccountCollectorRankingCsv($tenantId, $gymId, $data);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to export collector ranking'], 500);
        }
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

    public function autoSettleMemberAccount(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        try {
            $input = Request::json();
            $limit = (int) ($input['limit'] ?? 100);
            $method = strtolower(trim((string) ($input['method'] ?? 'transfer')));
            $data = $this->service->settlePendingMemberAccountCharges(
                (int) ($auth['tenant_id'] ?? 0),
                (int) ($auth['gym_id'] ?? 0),
                $limit,
                $method,
                (int) ($auth['sub'] ?? 0),
                'manual_batch'
            );
            Response::json([
                'success' => true,
                'message' => 'POS member account auto-settlement executed',
                'data' => $data
            ]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to auto-settle member account charges'], 500);
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

    public function alertsStatus(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $cooldownMinutes = Request::query('cooldown_minutes', null);
        try {
            $data = $this->service->getOperationalAlertsStatus(
                (int) ($auth['tenant_id'] ?? 0),
                (int) ($auth['gym_id'] ?? 0),
                $cooldownMinutes
            );
            Response::json(['success' => true, 'data' => $data]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to fetch POS alert operational status'], 500);
        }
    }

    public function dispatchHistory(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $page = max(1, (int) Request::query('page', 1));
        $perPage = min(100, max(1, (int) Request::query('per_page', 20)));
        $dateFrom = Request::query('date_from', null);
        $dateTo = Request::query('date_to', null);

        try {
            $data = $this->service->listCriticalAlertDispatchHistory(
                (int) ($auth['tenant_id'] ?? 0),
                (int) ($auth['gym_id'] ?? 0),
                $dateFrom,
                $dateTo,
                $page,
                $perPage
            );
            Response::json(['success' => true, 'data' => $data]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to fetch POS critical alert dispatch history'], 500);
        }
    }

    public function cronHistory(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $page = max(1, (int) Request::query('page', 1));
        $perPage = min(100, max(1, (int) Request::query('per_page', 20)));

        try {
            $data = $this->service->listPosAlertCronHistory(
                (int) ($auth['tenant_id'] ?? 0),
                (int) ($auth['gym_id'] ?? 0),
                $page,
                $perPage
            );
            Response::json(['success' => true, 'data' => $data]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to fetch POS alert cron history'], 500);
        }
    }

    public function dispatchHistoryExport(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $dateFrom = Request::query('date_from', null);
        $dateTo = Request::query('date_to', null);

        try {
            $tenantId = (int) ($auth['tenant_id'] ?? 0);
            $gymId = (int) ($auth['gym_id'] ?? 0);
            $data = $this->service->exportCriticalAlertDispatchHistory($tenantId, $gymId, $dateFrom, $dateTo);
            $this->emitDispatchHistoryCsv($data);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to export POS critical alert dispatch history'], 500);
        }
    }

    public function alertsNotifyLink(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $dateFrom = Request::query('date_from', null);
        $dateTo = Request::query('date_to', null);
        $differenceThreshold = Request::query('difference_threshold', null);
        $voidsThreshold = Request::query('voids_threshold', null);
        $phone = Request::query('phone', null);
        $contactId = Request::query('contact_id', null);
        try {
            $data = $this->service->getOperationalAlertsNotifyLink(
                (int) ($auth['tenant_id'] ?? 0),
                (int) ($auth['gym_id'] ?? 0),
                $dateFrom,
                $dateTo,
                $differenceThreshold,
                $voidsThreshold,
                $phone,
                $contactId
            );
            Response::json(['success' => true, 'data' => $data]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to build POS alert WhatsApp link'], 500);
        }
    }

    public function notifyCriticalAlert(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        try {
            $data = $this->service->notifyCriticalOperationalAlerts(
                (int) ($auth['tenant_id'] ?? 0),
                (int) ($auth['gym_id'] ?? 0),
                (int) ($auth['sub'] ?? 0),
                Request::json()
            );
            Response::json(['success' => true, 'data' => $data]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to dispatch POS critical alert'], 500);
        }
    }

    public function dispatchCriticalAlertsCron(): void
    {
        try {
            $input = Request::json();
            if (!is_array($input)) {
                $input = [];
            }

            $tenantId = isset($input['tenant_id']) ? (int) $input['tenant_id'] : 0;
            $gymId = isset($input['gym_id']) ? (int) $input['gym_id'] : 0;
            if ($tenantId > 0 && $gymId > 0) {
                $data = $this->service->notifyCriticalOperationalAlerts($tenantId, $gymId, 0, $input);
                $item = [
                    'tenant_id' => $tenantId,
                    'gym_id' => $gymId,
                    'dispatched' => (bool) ($data['dispatched'] ?? false),
                ];
                if (isset($data['reason'])) {
                    $item['reason'] = (string) $data['reason'];
                }
                if (isset($data['level'])) {
                    $item['level'] = (string) $data['level'];
                }

                $this->service->logPosAlertCriticalCronRun($tenantId, $gymId, [
                    'mode' => 'single',
                    'processed' => 1,
                    'dispatched' => $item['dispatched'] ? 1 : 0,
                    'skipped' => $item['dispatched'] ? 0 : 1,
                    'tenant_id' => $tenantId,
                    'gym_id' => $gymId,
                ]);

                Response::json([
                    'success' => true,
                    'data' => [
                        'mode' => 'single',
                        'processed' => 1,
                        'dispatched' => $item['dispatched'] ? 1 : 0,
                        'skipped' => $item['dispatched'] ? 0 : 1,
                        'items' => [$item],
                    ]
                ]);
                return;
            }

            $scopes = $this->service->listActiveTenantGymScopes();
            $items = [];
            $dispatchedCount = 0;
            $skippedCount = 0;
            $perTenantSummary = [];

            foreach ($scopes as $scope) {
                $scopeTenantId = (int) ($scope['tenant_id'] ?? 0);
                $scopeGymId = (int) ($scope['gym_id'] ?? 0);
                if ($scopeTenantId <= 0 || $scopeGymId <= 0) {
                    continue;
                }

                $data = $this->service->notifyCriticalOperationalAlerts($scopeTenantId, $scopeGymId, 0, $input);
                $wasDispatched = (bool) ($data['dispatched'] ?? false);
                $item = [
                    'tenant_id' => $scopeTenantId,
                    'gym_id' => $scopeGymId,
                    'dispatched' => $wasDispatched,
                ];
                if (isset($data['reason'])) {
                    $item['reason'] = (string) $data['reason'];
                }
                if (isset($data['level'])) {
                    $item['level'] = (string) $data['level'];
                }
                $items[] = $item;
                if ($wasDispatched) {
                    $dispatchedCount++;
                } else {
                    $skippedCount++;
                }

                if (!isset($perTenantSummary[$scopeTenantId])) {
                    $perTenantSummary[$scopeTenantId] = [
                        'processed' => 0,
                        'dispatched' => 0,
                        'skipped' => 0,
                        'scope_gym_ids' => [],
                    ];
                }
                $perTenantSummary[$scopeTenantId]['processed']++;
                if ($wasDispatched) {
                    $perTenantSummary[$scopeTenantId]['dispatched']++;
                } else {
                    $perTenantSummary[$scopeTenantId]['skipped']++;
                }
                $perTenantSummary[$scopeTenantId]['scope_gym_ids'][(string) $scopeGymId] = $scopeGymId;
            }

            foreach ($perTenantSummary as $summaryTenantId => $summary) {
                $scopeGymIds = array_values($summary['scope_gym_ids']);
                sort($scopeGymIds);
                $this->service->logPosAlertCriticalCronRun((int) $summaryTenantId, null, [
                    'mode' => 'bulk',
                    'processed' => (int) $summary['processed'],
                    'dispatched' => (int) $summary['dispatched'],
                    'skipped' => (int) $summary['skipped'],
                    'scope_gym_ids' => $scopeGymIds,
                ]);
            }

            Response::json([
                'success' => true,
                'data' => [
                    'mode' => 'bulk',
                    'processed' => count($items),
                    'dispatched' => $dispatchedCount,
                    'skipped' => $skippedCount,
                    'items' => $items,
                ]
            ]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to dispatch POS critical alerts by cron'], 500);
        }
    }

    public function autoSettleMemberAccountCron(): void
    {
        try {
            $input = Request::json();
            $mode = strtolower(trim((string) ($input['mode'] ?? 'single')));
            $limit = (int) ($input['limit'] ?? 100);
            $method = strtolower(trim((string) ($input['method'] ?? 'transfer')));

            if ($mode === 'single') {
                $tenantId = (int) ($input['tenant_id'] ?? 0);
                $gymId = (int) ($input['gym_id'] ?? 0);
                if ($tenantId <= 0 || $gymId <= 0) {
                    Response::json(['success' => false, 'message' => 'tenant_id and gym_id are required in single mode'], 422);
                    return;
                }

                $data = $this->service->settlePendingMemberAccountCharges($tenantId, $gymId, $limit, $method, null, 'cron_single');
                Response::json([
                    'success' => true,
                    'message' => 'POS member account auto-settlement executed',
                    'data' => $data,
                ]);
                return;
            }

            if ($mode !== 'bulk') {
                Response::json(['success' => false, 'message' => 'Invalid mode. Use single or bulk'], 422);
                return;
            }

            $scopes = $this->service->listActiveTenantGymScopes();
            $items = [];
            $totals = [
                'processed' => 0,
                'settled' => 0,
                'failed' => 0,
            ];

            foreach ($scopes as $scope) {
                $tenantId = (int) ($scope['tenant_id'] ?? 0);
                $gymId = (int) ($scope['gym_id'] ?? 0);
                if ($tenantId <= 0 || $gymId <= 0) {
                    continue;
                }

                try {
                    $result = $this->service->settlePendingMemberAccountCharges($tenantId, $gymId, $limit, $method, null, 'cron_bulk');
                    $items[] = $result;
                    $totals['processed'] += (int) ($result['processed'] ?? 0);
                    $totals['settled'] += (int) ($result['settled'] ?? 0);
                    $totals['failed'] += (int) ($result['failed'] ?? 0);
                } catch (\Throwable $e) {
                    $items[] = [
                        'tenant_id' => $tenantId,
                        'gym_id' => $gymId,
                        'processed' => 0,
                        'settled' => 0,
                        'failed' => 1,
                        'failures' => [[
                            'charge_id' => null,
                            'message' => $e->getMessage(),
                        ]],
                    ];
                    $totals['failed']++;
                }
            }

            Response::json([
                'success' => true,
                'message' => 'POS member account auto-settlement bulk executed',
                'data' => [
                    'mode' => 'bulk',
                    'scope_count' => count($items),
                    'totals' => $totals,
                    'items' => $items,
                ],
            ]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to run POS member account auto-settlement cron'], 500);
        }
    }

    public function alertContacts(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        Response::json([
            'success' => true,
            'data' => [
                'items' => $this->service->listAlertContacts((int) ($auth['tenant_id'] ?? 0), (int) ($auth['gym_id'] ?? 0))
            ]
        ]);
    }

    public function createAlertContact(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        try {
            $data = $this->service->createAlertContact(
                (int) ($auth['tenant_id'] ?? 0),
                (int) ($auth['gym_id'] ?? 0),
                Request::json()
            );
            Response::json(['success' => true, 'data' => $data], 201);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to create POS alert contact'], 500);
        }
    }

    public function updateAlertContact(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $contactId = (int) Request::param('id', 0);
        try {
            $data = $this->service->updateAlertContact(
                (int) ($auth['tenant_id'] ?? 0),
                (int) ($auth['gym_id'] ?? 0),
                $contactId,
                Request::json()
            );
            Response::json(['success' => true, 'data' => $data]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to update POS alert contact'], 500);
        }
    }

    public function deleteAlertContact(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $contactId = (int) Request::param('id', 0);
        try {
            $data = $this->service->deleteAlertContact(
                (int) ($auth['tenant_id'] ?? 0),
                (int) ($auth['gym_id'] ?? 0),
                $contactId
            );
            Response::json(['success' => true, 'data' => $data]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to delete POS alert contact'], 500);
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

    private function emitDispatchHistoryCsv(array $historyData): never
    {
        $filters = is_array($historyData['filters'] ?? null) ? $historyData['filters'] : [];
        $items = is_array($historyData['items'] ?? null) ? $historyData['items'] : [];

        $suffix = trim((string) ($filters['date_from'] ?? ''));
        if ($suffix === '') {
            $suffix = date('Y-m-d');
        }
        $filename = 'pos-alert-dispatch-history-' . $suffix . '.csv';

        http_response_code(200);
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Cache-Control: no-store, no-cache, must-revalidate');

        $out = fopen('php://output', 'wb');
        if ($out === false) {
            Response::json(['success' => false, 'message' => 'Unable to create CSV output'], 500);
        }

        fputcsv($out, [
            'id',
            'created_at',
            'user_id',
            'level',
            'reason',
            'target_source',
            'target_label',
            'whatsapp_link',
            'entity_type',
            'entity_id',
            'action'
        ]);

        foreach ($items as $item) {
            fputcsv($out, [
                $this->normalizeCsvValue($item['id'] ?? null),
                $this->normalizeCsvValue($item['created_at'] ?? null),
                $this->normalizeCsvValue($item['user_id'] ?? null),
                $this->normalizeCsvValue($item['level'] ?? null),
                $this->normalizeCsvValue($item['reason'] ?? null),
                $this->normalizeCsvValue($item['target_source'] ?? null),
                $this->normalizeCsvValue($item['target_label'] ?? null),
                $this->normalizeCsvValue($item['whatsapp_link'] ?? null),
                $this->normalizeCsvValue($item['entity_type'] ?? null),
                $this->normalizeCsvValue($item['entity_id'] ?? null),
                $this->normalizeCsvValue($item['action'] ?? null),
            ]);
        }

        fclose($out);
        exit;
    }

    private function emitAutosettleKpiCsv(int $tenantId, int $gymId, array $kpi): never
    {
        $dateFrom = (string) ($kpi['date_from'] ?? date('Y-m-d'));
        $dateTo = (string) ($kpi['date_to'] ?? $dateFrom);
        $filename = 'pos-autosettle-kpi-' . $dateFrom . '-to-' . $dateTo . '.csv';

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
        fputcsv($out, ['metadata', 'date_from', $dateFrom]);
        fputcsv($out, ['metadata', 'date_to', $dateTo]);
        fputcsv($out, ['metadata', 'limit', $this->normalizeCsvValue($data['limit'] ?? null)]);
        fputcsv($out, ['metadata', 'sort_by', $this->normalizeCsvValue($data['sort_by'] ?? null)]);
        fputcsv($out, ['metadata', 'sort_dir', $this->normalizeCsvValue($data['sort_dir'] ?? null)]);
        fputcsv($out, ['', '', '']);

        $this->writeSectionRows($out, 'totals', [
            'runs_count' => $kpi['runs_count'] ?? 0,
            'processed_total' => $kpi['processed_total'] ?? 0,
            'settled_total' => $kpi['settled_total'] ?? 0,
            'failed_total' => $kpi['failed_total'] ?? 0,
            'settled_amount_total' => $kpi['settled_amount_total'] ?? 0,
        ]);

        fputcsv($out, ['daily', 'date', 'runs_count', 'processed_total', 'settled_total', 'failed_total', 'settled_amount_total']);
        $daily = is_array($kpi['daily'] ?? null) ? $kpi['daily'] : [];
        foreach ($daily as $row) {
            fputcsv($out, [
                'daily',
                $this->normalizeCsvValue($row['date'] ?? null),
                $this->normalizeCsvValue($row['runs_count'] ?? null),
                $this->normalizeCsvValue($row['processed_total'] ?? null),
                $this->normalizeCsvValue($row['settled_total'] ?? null),
                $this->normalizeCsvValue($row['failed_total'] ?? null),
                $this->normalizeCsvValue($row['settled_amount_total'] ?? null),
            ]);
        }

        fclose($out);
        exit;
    }

    private function emitMemberAccountPromiseAgendaCsv(int $tenantId, int $gymId, array $agenda): never
    {
        $filename = 'pos-member-account-promise-agenda-' . date('Y-m-d') . '.csv';
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
        fputcsv($out, ['summary', 'today', (string) ($agenda['today'] ?? '')]);
        fputcsv($out, ['summary', 'due_today_count', (string) ($agenda['due_today_count'] ?? 0)]);
        fputcsv($out, ['summary', 'overdue_count', (string) ($agenda['overdue_count'] ?? 0)]);
        fputcsv($out, ['', '', '']);

        fputcsv($out, ['items', 'member_id', 'member_code', 'first_name', 'last_name', 'promise_date', 'overdue_total_amount', 'overdue_charges_count', 'notes', 'updated_at']);
        $items = is_array($agenda['items'] ?? null) ? $agenda['items'] : [];
        foreach ($items as $item) {
            fputcsv($out, [
                'items',
                $this->normalizeCsvValue($item['member_id'] ?? null),
                $this->normalizeCsvValue($item['member_code'] ?? null),
                $this->normalizeCsvValue($item['first_name'] ?? null),
                $this->normalizeCsvValue($item['last_name'] ?? null),
                $this->normalizeCsvValue($item['promise_date'] ?? null),
                $this->normalizeCsvValue($item['overdue_total_amount'] ?? null),
                $this->normalizeCsvValue($item['overdue_charges_count'] ?? null),
                $this->normalizeCsvValue($item['notes'] ?? null),
                $this->normalizeCsvValue($item['updated_at'] ?? null),
            ]);
        }

        fclose($out);
        exit;
    }

    private function emitOverduePromiseWhatsAppLinksCsv(int $tenantId, int $gymId, array $batch): never
    {
        $filename = 'pos-overdue-promise-whatsapp-links-' . date('Y-m-d') . '.csv';
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
        fputcsv($out, ['metadata', 'generated_at', (string) ($batch['generated_at'] ?? '')]);
        fputcsv($out, ['metadata', 'items_count', (string) ($batch['items_count'] ?? 0)]);
        fputcsv($out, ['', '', '']);
        fputcsv($out, ['items', 'member_id', 'member_code', 'member_name', 'promise_date', 'phone_normalized', 'overdue_total_amount', 'overdue_charges_count', 'max_days_overdue', 'whatsapp_link']);

        $items = is_array($batch['items'] ?? null) ? $batch['items'] : [];
        foreach ($items as $item) {
            fputcsv($out, [
                'items',
                $this->normalizeCsvValue($item['member_id'] ?? null),
                $this->normalizeCsvValue($item['member_code'] ?? null),
                $this->normalizeCsvValue($item['member_name'] ?? null),
                $this->normalizeCsvValue($item['promise_date'] ?? null),
                $this->normalizeCsvValue($item['phone_normalized'] ?? null),
                $this->normalizeCsvValue($item['overdue_total_amount'] ?? null),
                $this->normalizeCsvValue($item['overdue_charges_count'] ?? null),
                $this->normalizeCsvValue($item['max_days_overdue'] ?? null),
                $this->normalizeCsvValue($item['whatsapp_link'] ?? null),
            ]);
        }

        fclose($out);
        exit;
    }

    private function emitMemberAccountContactEffectivenessCsv(int $tenantId, int $gymId, array $data): never
    {
        $filename = 'pos-contact-effectiveness-' . (($data['date_from'] ?? date('Y-m-d')) . '-to-' . ($data['date_to'] ?? date('Y-m-d'))) . '.csv';
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
        foreach ($data as $k => $v) {
            fputcsv($out, ['kpi', (string) $k, $this->normalizeCsvValue($v)]);
        }
        fclose($out);
        exit;
    }

    private function emitMemberAccountCollectorRankingCsv(int $tenantId, int $gymId, array $data): never
    {
        $dateFrom = (string) ($data['date_from'] ?? date('Y-m-d'));
        $dateTo = (string) ($data['date_to'] ?? date('Y-m-d'));
        $filename = 'pos-collector-ranking-' . $dateFrom . '-to-' . $dateTo . '.csv';
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
        fputcsv($out, ['metadata', 'date_from', $dateFrom]);
        fputcsv($out, ['metadata', 'date_to', $dateTo]);
        fputcsv($out, ['metadata', 'limit', $this->normalizeCsvValue($data['limit'] ?? null)]);
        fputcsv($out, ['metadata', 'sort_by', $this->normalizeCsvValue($data['sort_by'] ?? null)]);
        fputcsv($out, ['metadata', 'sort_dir', $this->normalizeCsvValue($data['sort_dir'] ?? null)]);
        $summary = is_array($data['summary'] ?? null) ? $data['summary'] : [];
        foreach ($summary as $k => $v) {
            fputcsv($out, ['summary', (string) $k, $this->normalizeCsvValue($v)]);
        }
        fputcsv($out, ['', '', '']);

        $rules = is_array($data['commission_rules'] ?? null) ? $data['commission_rules'] : [];
        foreach ($rules as $k => $v) {
            fputcsv($out, ['commission_rules', (string) $k, $this->normalizeCsvValue($v)]);
        }
        fputcsv($out, ['', '', '']);

        fputcsv($out, [
            'ranking',
            'user_id',
            'user_name',
            'user_email',
            'contacts_count',
            'responses_count',
            'response_rate',
            'settlements_count',
            'recovered_amount',
            'commission_rate',
            'commission_amount'
        ]);

        $rows = is_array($data['items'] ?? null) ? $data['items'] : [];
        $totalContacts = 0;
        $totalResponses = 0;
        $totalSettlements = 0;
        $totalRecovered = 0.0;
        $totalCommission = 0.0;
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $contactsCount = (int) ($row['contacts_count'] ?? 0);
            $responsesCount = (int) ($row['responses_count'] ?? 0);
            $settlementsCount = (int) ($row['settlements_count'] ?? 0);
            $recoveredAmount = (float) ($row['recovered_amount'] ?? 0);
            $commissionAmount = (float) ($row['commission_amount'] ?? 0);
            fputcsv($out, [
                'ranking',
                $this->normalizeCsvValue($row['user_id'] ?? null),
                $this->normalizeCsvValue($row['user_name'] ?? null),
                $this->normalizeCsvValue($row['user_email'] ?? null),
                $this->normalizeCsvValue($contactsCount),
                $this->normalizeCsvValue($responsesCount),
                $this->normalizeCsvValue($row['response_rate'] ?? null),
                $this->normalizeCsvValue($settlementsCount),
                $this->normalizeCsvValue($recoveredAmount),
                $this->normalizeCsvValue($row['commission_rate'] ?? null),
                $this->normalizeCsvValue($commissionAmount),
            ]);
            $totalContacts += $contactsCount;
            $totalResponses += $responsesCount;
            $totalSettlements += $settlementsCount;
            $totalRecovered += $recoveredAmount;
            $totalCommission += $commissionAmount;
        }
        $totalResponseRate = $totalContacts > 0 ? round(($totalResponses / $totalContacts) * 100, 2) : 0.0;
        fputcsv($out, [
            'ranking',
            'TOTAL',
            '',
            '',
            $this->normalizeCsvValue($totalContacts),
            $this->normalizeCsvValue($totalResponses),
            $this->normalizeCsvValue($totalResponseRate),
            $this->normalizeCsvValue($totalSettlements),
            $this->normalizeCsvValue(round($totalRecovered, 2)),
            '',
            $this->normalizeCsvValue(round($totalCommission, 2)),
        ]);

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
            $encoded = (string) json_encode($value, JSON_UNESCAPED_UNICODE);
            return $this->sanitizeForCsvFormula($encoded);
        }
        return $this->sanitizeForCsvFormula((string) $value);
    }

    private function sanitizeForCsvFormula(string $value): string
    {
        if ($value === '') {
            return $value;
        }
        $first = $value[0];
        if ($first === '=' || $first === '+' || $first === '-' || $first === '@') {
            return "'" . $value;
        }
        return $value;
    }
}
