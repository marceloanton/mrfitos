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
        Response::json([
            'success' => true,
            'data' => $this->service->listCashSessions((int) $auth['tenant_id'], (int) $auth['gym_id'], $page, $perPage)
        ]);
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
}
