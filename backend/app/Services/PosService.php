<?php

namespace App\Services;

use App\Repositories\PosRepository;
use App\Repositories\ActivityLogRepository;
use Core\Database;
use Core\Env;

final class PosService
{
    private const SETTING_REQUIRE_OPEN_CASH = 'pos.require_open_cash';

    public function __construct(
        private readonly PosRepository $repo = new PosRepository(),
        private readonly ActivityLogRepository $activity = new ActivityLogRepository()
    )
    {
    }

    public function listProducts(int $tenantId, int $gymId): array
    {
        return $this->repo->listProducts($tenantId, $gymId);
    }

    public function listLowStockProducts(int $tenantId, int $gymId, mixed $thresholdInput): array
    {
        $threshold = $this->resolveLowStockThreshold($thresholdInput);
        $rows = $this->repo->listLowStockProducts($tenantId, $gymId, $threshold);

        $items = array_map(static fn (array $row): array => [
            'id' => (int) ($row['id'] ?? 0),
            'code' => (string) ($row['code'] ?? ''),
            'name' => (string) ($row['name'] ?? ''),
            'stock_qty' => (float) ($row['stock_qty'] ?? 0),
            'price' => (float) ($row['price'] ?? 0),
            'currency' => (string) ($row['currency'] ?? 'ARS'),
        ], $rows);

        return [
            'threshold' => $threshold,
            'items' => $items,
        ];
    }

    public function getSummary(int $tenantId, int $gymId): array
    {
        return $this->repo->getSummary($tenantId, $gymId);
    }

    public function createProduct(int $tenantId, int $gymId, array $input): int
    {
        $name = trim((string) ($input['name'] ?? ''));
        $code = trim((string) ($input['code'] ?? ''));
        $price = (float) ($input['price'] ?? 0);
        if ($name === '' || $code === '' || $price <= 0) {
            throw new \InvalidArgumentException('name, code and price are required');
        }

        $currency = strtoupper(trim((string) ($input['currency'] ?? 'ARS')));
        if (!preg_match('/^[A-Z]{3}$/', $currency)) {
            throw new \InvalidArgumentException('currency must be a 3-letter ISO code');
        }

        return $this->repo->createProduct([
            'tenant_id' => $tenantId,
            'gym_id' => $gymId,
            'code' => substr($code, 0, 60),
            'name' => substr($name, 0, 150),
            'price' => $price,
            'currency' => $currency,
            'track_stock' => array_key_exists('track_stock', $input) ? (!empty($input['track_stock']) ? 1 : 0) : 1,
            'stock_qty' => max(0, (float) ($input['stock_qty'] ?? 0)),
            'is_active' => !empty($input['is_active']) ? 1 : 0
        ]);
    }

    public function listSales(int $tenantId, int $gymId, int $page, int $perPage): array
    {
        return $this->repo->listSales($tenantId, $gymId, $page, $perPage);
    }

    public function getSaleReceipt(int $tenantId, int $gymId, int $saleId): array
    {
        if ($saleId <= 0) {
            throw new \InvalidArgumentException('Invalid sale id');
        }

        $sale = $this->repo->findSaleById($tenantId, $gymId, $saleId);
        return $this->buildSaleReceiptPayload($tenantId, $gymId, $sale);
    }

    public function getSaleReceiptByNumber(int $tenantId, int $gymId, string $receiptNumber): array
    {
        $normalized = strtoupper(trim($receiptNumber));
        if ($normalized === '') {
            throw new \InvalidArgumentException('receipt number is required');
        }

        $sale = $this->repo->findSaleByReceiptNumber($tenantId, $gymId, $normalized);
        return $this->buildSaleReceiptPayload($tenantId, $gymId, $sale);
    }

    private function buildSaleReceiptPayload(int $tenantId, int $gymId, ?array $sale): array
    {
        if (!$sale) {
            throw new \InvalidArgumentException('Sale not found');
        }

        $saleId = (int) ($sale['id'] ?? 0);
        $items = $this->repo->listSaleItems($tenantId, $gymId, $saleId);
        $normalizedItems = array_map(static fn (array $item): array => [
            'item_name' => (string) ($item['item_name'] ?? ''),
            'qty' => (float) ($item['qty'] ?? 0),
            'unit_price' => (float) ($item['unit_price'] ?? 0),
            'line_total' => (float) ($item['line_total'] ?? 0)
        ], $items);

        $payment = null;
        $paymentId = isset($sale['payment_id']) ? (int) $sale['payment_id'] : 0;
        if ($paymentId > 0) {
            $paymentRow = $this->repo->findPaymentById($tenantId, $gymId, $paymentId);
            if ($paymentRow) {
                $payment = [
                    'method' => (string) ($paymentRow['method'] ?? ''),
                    'amount' => (float) ($paymentRow['amount'] ?? 0),
                    'paid_at' => $paymentRow['paid_at'] ?? null,
                ];
            }
        }

        return [
            'sale' => [
                'id' => (int) $sale['id'],
                'receipt_number' => (string) ($sale['receipt_number'] ?? ''),
                'created_at' => (string) ($sale['created_at'] ?? ''),
                'charge_mode' => (string) ($sale['charge_mode'] ?? ''),
                'total_amount' => (float) ($sale['total_amount'] ?? 0),
                'currency' => (string) ($sale['currency'] ?? 'ARS'),
                'notes' => $sale['notes'] ?? null,
            ],
            'member' => [
                'member_code' => $sale['member_code'] ?? null,
                'first_name' => $sale['first_name'] ?? null,
                'last_name' => $sale['last_name'] ?? null,
            ],
            'items' => $normalizedItems,
            'payment' => $payment,
        ];
    }

    public function voidSale(int $tenantId, int $gymId, int $userId, int $saleId, array $input): array
    {
        if ($saleId <= 0) {
            throw new \InvalidArgumentException('Invalid sale id');
        }

        $reason = trim((string) ($input['reason'] ?? ''));
        if (mb_strlen($reason) < 5) {
            throw new \InvalidArgumentException('reason is required (min 5 chars)');
        }

        $sale = $this->repo->findSaleByIdAnyStatus($tenantId, $gymId, $saleId);
        if (!$sale) {
            throw new \InvalidArgumentException('Sale not found');
        }
        if (!empty($sale['deleted_at'])) {
            throw new \InvalidArgumentException('Sale already voided');
        }

        $conn = Database::connection();
        $conn->beginTransaction();
        try {
            $saleItems = $this->repo->listSaleItemsWithProduct($tenantId, $gymId, $saleId);
            foreach ($saleItems as $item) {
                $productId = isset($item['product_id']) ? (int) $item['product_id'] : 0;
                $trackStock = (int) ($item['track_stock'] ?? 0);
                if ($productId > 0 && $trackStock === 1) {
                    $qty = (float) ($item['qty'] ?? 0);
                    if ($qty <= 0) {
                        continue;
                    }
                    $ok = $this->repo->incrementStock($tenantId, $gymId, $productId, $qty);
                    if (!$ok) {
                        throw new \RuntimeException('Failed to restore stock for product ' . $productId);
                    }
                    $updated = $this->repo->findProductById($tenantId, $gymId, $productId);
                    $this->repo->createStockMovement([
                        'tenant_id' => $tenantId,
                        'gym_id' => $gymId,
                        'product_id' => $productId,
                        'movement_type' => 'in',
                        'qty' => $qty,
                        'balance_after' => (float) ($updated['stock_qty'] ?? 0),
                        'reference_type' => 'sale_void',
                        'reference_id' => $saleId,
                        'created_by_user_id' => $userId > 0 ? $userId : null,
                        'notes' => 'POS sale void restock'
                    ]);
                }
            }

            $existingNotes = trim((string) ($sale['notes'] ?? ''));
            $voidNote = '[VOID ' . date('Y-m-d H:i:s') . '] reason: ' . $reason;
            $finalNotes = $existingNotes === '' ? $voidNote : ($existingNotes . ' | ' . $voidNote);
            $voided = $this->repo->markSaleVoided($tenantId, $gymId, $saleId, substr($finalNotes, 0, 255));
            if (!$voided) {
                throw new \RuntimeException('Unable to void sale');
            }

            $pendingCharge = $this->repo->findPendingMemberAccountChargeBySaleId($tenantId, $gymId, $saleId);
            $chargeCancelled = false;
            if ($pendingCharge) {
                $chargeNotesBase = trim((string) ($pendingCharge['notes'] ?? ''));
                $chargeVoidNote = '[VOID ' . date('Y-m-d H:i:s') . '] cancelled by sale void #' . $saleId;
                $chargeNotes = $chargeNotesBase === '' ? $chargeVoidNote : ($chargeNotesBase . ' | ' . $chargeVoidNote);
                $chargeCancelled = $this->repo->cancelMemberAccountCharge(
                    $tenantId,
                    $gymId,
                    (int) $pendingCharge['id'],
                    substr($chargeNotes, 0, 255)
                );
            }

            $this->activity->create([
                'tenant_id' => $tenantId,
                'gym_id' => $gymId,
                'user_id' => $userId > 0 ? $userId : null,
                'entity_type' => 'pos_sale',
                'entity_id' => $saleId,
                'action' => 'void',
                'metadata' => [
                    'reason' => $reason,
                    'status' => 'voided',
                    'member_account_charge_cancelled' => $chargeCancelled,
                ],
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
            ]);

            $conn->commit();
            return [
                'sale_id' => $saleId,
                'status' => 'voided',
            ];
        } catch (\Throwable $e) {
            if ($conn->inTransaction()) {
                $conn->rollBack();
            }
            throw $e;
        }
    }

    public function createSale(int $tenantId, int $gymId, int $userId, array $input): array
    {
        $requireOpenCash = $this->getRequireOpenCash($tenantId, $gymId);
        if ($requireOpenCash) {
            $openCash = $this->repo->findOpenCashSession($tenantId, $gymId);
            if (!$openCash) {
                throw new \InvalidArgumentException('No open cash session. Open cash before creating POS sales.');
            }
        }

        $memberId = isset($input['member_id']) ? (int) $input['member_id'] : null;
        $chargeMode = (string) ($input['charge_mode'] ?? '');
        if (!in_array($chargeMode, ['immediate', 'cash', 'member_account'], true)) {
            throw new \InvalidArgumentException('Invalid charge_mode');
        }

        $items = is_array($input['items'] ?? null) ? $input['items'] : [];
        if (count($items) === 0) {
            throw new \InvalidArgumentException('At least one item is required');
        }

        if ($chargeMode === 'member_account' && (!$memberId || $memberId <= 0)) {
            throw new \InvalidArgumentException('member_id is required for member_account charge mode');
        }

        $currency = strtoupper(trim((string) ($input['currency'] ?? 'ARS')));
        if (!preg_match('/^[A-Z]{3}$/', $currency)) {
            throw new \InvalidArgumentException('currency must be a 3-letter ISO code');
        }

        $normalizedItems = [];
        $total = 0.0;
        foreach ($items as $item) {
            $productId = isset($item['product_id']) ? (int) $item['product_id'] : null;
            $qty = (float) ($item['qty'] ?? 1);
            $name = trim((string) ($item['item_name'] ?? $item['name'] ?? ''));
            $unitPrice = (float) ($item['unit_price'] ?? $item['price'] ?? 0);

            if ($productId && $productId > 0) {
                $product = $this->repo->findProductById($tenantId, $gymId, $productId);
                if (!$product || (int) ($product['is_active'] ?? 0) !== 1) {
                    throw new \InvalidArgumentException('Product not found or inactive');
                }
                $name = (string) ($product['name'] ?? $name);
                $unitPrice = (float) ($product['price'] ?? $unitPrice);
                if ((int) ($product['track_stock'] ?? 0) === 1) {
                    $stock = (float) ($product['stock_qty'] ?? 0);
                    if ($stock < $qty) {
                        throw new \InvalidArgumentException('Insufficient stock for product: ' . $name);
                    }
                }
            }

            if ($name === '' || $qty <= 0 || $unitPrice < 0) {
                throw new \InvalidArgumentException('Invalid item payload');
            }
            $lineTotal = round($qty * $unitPrice, 2);
            $total += $lineTotal;
            $normalizedItems[] = [
                'product_id' => $productId,
                'item_name' => substr($name, 0, 150),
                'qty' => $qty,
                'unit_price' => $unitPrice,
                'line_total' => $lineTotal
            ];
        }
        $total = round($total, 2);
        if ($total <= 0) {
            throw new \InvalidArgumentException('Sale total must be greater than zero');
        }

        $paymentMethod = (string) ($input['payment_method'] ?? ($chargeMode === 'cash' ? 'cash' : 'transfer'));
        if (!in_array($paymentMethod, ['cash', 'card', 'transfer', 'mercadopago', 'other'], true)) {
            throw new \InvalidArgumentException('Invalid payment_method');
        }

        $conn = Database::connection();
        $conn->beginTransaction();
        try {
            $paymentId = null;
            if ($chargeMode !== 'member_account') {
                if (!$memberId || $memberId <= 0) {
                    throw new \InvalidArgumentException('member_id is required for immediate/cash charge modes');
                }
                $paymentId = $this->repo->createPayment([
                    'tenant_id' => $tenantId,
                    'gym_id' => $gymId,
                    'member_id' => $memberId,
                    'received_by_user_id' => $userId > 0 ? $userId : null,
                    'amount' => $total,
                    'currency' => $currency,
                    'method' => $chargeMode === 'cash' ? 'cash' : $paymentMethod,
                    'paid_at' => date('Y-m-d H:i:s'),
                    'notes' => trim((string) ($input['notes'] ?? '')) ?: 'POS sale'
                ]);
            }

            $saleId = $this->repo->createSale([
                'tenant_id' => $tenantId,
                'gym_id' => $gymId,
                'member_id' => $memberId > 0 ? $memberId : null,
                'sold_by_user_id' => $userId > 0 ? $userId : null,
                'total_amount' => $total,
                'currency' => $currency,
                'charge_mode' => $chargeMode,
                'payment_id' => $paymentId,
                'notes' => trim((string) ($input['notes'] ?? '')) ?: null
            ]);
            $receiptSeq = $this->repo->reserveNextReceiptNumber($tenantId, $gymId);
            $receiptNumber = $this->formatReceiptNumber($gymId, $receiptSeq);
            $this->repo->setSaleReceiptNumber($tenantId, $gymId, $saleId, $receiptNumber);

            foreach ($normalizedItems as $item) {
                $this->repo->createSaleItem([
                    'sale_id' => $saleId,
                    'tenant_id' => $tenantId,
                    'gym_id' => $gymId,
                    'product_id' => $item['product_id'],
                    'item_name' => $item['item_name'],
                    'qty' => $item['qty'],
                    'unit_price' => $item['unit_price'],
                    'line_total' => $item['line_total'],
                ]);

                if (!empty($item['product_id'])) {
                    $product = $this->repo->findProductById($tenantId, $gymId, (int) $item['product_id']);
                    if ($product && (int) ($product['track_stock'] ?? 0) === 1) {
                        $ok = $this->repo->decrementStock($tenantId, $gymId, (int) $item['product_id'], (float) $item['qty']);
                        if (!$ok) {
                            throw new \InvalidArgumentException('Stock changed during sale. Please retry.');
                        }
                        $updated = $this->repo->findProductById($tenantId, $gymId, (int) $item['product_id']);
                        $this->repo->createStockMovement([
                            'tenant_id' => $tenantId,
                            'gym_id' => $gymId,
                            'product_id' => (int) $item['product_id'],
                            'movement_type' => 'out',
                            'qty' => (float) $item['qty'],
                            'balance_after' => (float) ($updated['stock_qty'] ?? 0),
                            'reference_type' => 'sale',
                            'reference_id' => $saleId,
                            'created_by_user_id' => $userId > 0 ? $userId : null,
                            'notes' => 'POS sale output'
                        ]);
                    }
                }
            }

            $accountChargeId = null;
            if ($chargeMode === 'member_account') {
                $dueDateRaw = trim((string) ($input['due_date'] ?? ''));
                $accountChargeId = $this->repo->createMemberAccountCharge([
                    'tenant_id' => $tenantId,
                    'gym_id' => $gymId,
                    'member_id' => $memberId,
                    'sale_id' => $saleId,
                    'amount' => $total,
                    'currency' => $currency,
                    'due_date' => $dueDateRaw !== '' ? $dueDateRaw : null,
                    'notes' => trim((string) ($input['notes'] ?? '')) ?: null
                ]);
            }

            $conn->commit();
            return [
                'sale_id' => $saleId,
                'receipt_number' => $receiptNumber,
                'payment_id' => $paymentId,
                'member_account_charge_id' => $accountChargeId,
                'total_amount' => $total,
                'currency' => $currency,
                'charge_mode' => $chargeMode
            ];
        } catch (\Throwable $e) {
            if ($conn->inTransaction()) {
                $conn->rollBack();
            }
            throw $e;
        }
    }

    public function listMemberAccountCharges(int $tenantId, int $gymId, string $status, int $page, int $perPage): array
    {
        return $this->repo->listMemberAccountCharges($tenantId, $gymId, $status, $page, $perPage);
    }

    public function settleMemberAccountCharge(int $tenantId, int $gymId, int $userId, int $chargeId, array $input): array
    {
        $charge = $this->repo->findPendingChargeById($tenantId, $gymId, $chargeId);
        if (!$charge) {
            throw new \InvalidArgumentException('Charge not found');
        }
        if ((string) ($charge['status'] ?? '') !== 'pending_auto_debit') {
            throw new \InvalidArgumentException('Charge is not pending auto debit');
        }

        $method = (string) ($input['method'] ?? 'transfer');
        if (!in_array($method, ['cash', 'card', 'transfer', 'mercadopago', 'other'], true)) {
            throw new \InvalidArgumentException('Invalid payment method');
        }

        $conn = Database::connection();
        $conn->beginTransaction();
        try {
            $paymentId = $this->repo->createPayment([
                'tenant_id' => $tenantId,
                'gym_id' => $gymId,
                'member_id' => (int) $charge['member_id'],
                'received_by_user_id' => $userId > 0 ? $userId : null,
                'amount' => (float) $charge['amount'],
                'currency' => (string) $charge['currency'],
                'method' => $method,
                'paid_at' => date('Y-m-d H:i:s'),
                'notes' => trim((string) ($input['notes'] ?? '')) ?: 'Auto-debit settlement'
            ]);
            $this->repo->settleMemberAccountCharge($tenantId, $gymId, $chargeId, $paymentId);
            $conn->commit();
            return [
                'charge_id' => $chargeId,
                'payment_id' => $paymentId,
                'status' => 'settled'
            ];
        } catch (\Throwable $e) {
            if ($conn->inTransaction()) {
                $conn->rollBack();
            }
            throw $e;
        }
    }

    public function adjustStock(int $tenantId, int $gymId, int $userId, array $input): array
    {
        $productId = (int) ($input['product_id'] ?? 0);
        $movementType = (string) ($input['movement_type'] ?? 'adjustment');
        $qty = (float) ($input['qty'] ?? 0);
        if ($productId <= 0 || $qty <= 0) {
            throw new \InvalidArgumentException('product_id and qty are required');
        }
        if (!in_array($movementType, ['in', 'out', 'adjustment'], true)) {
            throw new \InvalidArgumentException('Invalid movement_type');
        }

        $product = $this->repo->findProductById($tenantId, $gymId, $productId);
        if (!$product) {
            throw new \InvalidArgumentException('Product not found');
        }
        if ((int) ($product['track_stock'] ?? 0) !== 1) {
            throw new \InvalidArgumentException('Product does not track stock');
        }

        $conn = Database::connection();
        $conn->beginTransaction();
        try {
            if ($movementType === 'in') {
                $ok = $this->repo->incrementStock($tenantId, $gymId, $productId, $qty);
                if (!$ok) throw new \InvalidArgumentException('Unable to increment stock');
            } elseif ($movementType === 'out') {
                $ok = $this->repo->decrementStock($tenantId, $gymId, $productId, $qty);
                if (!$ok) throw new \InvalidArgumentException('Insufficient stock');
            } else {
                $ok = $this->repo->setStock($tenantId, $gymId, $productId, $qty);
                if (!$ok) throw new \InvalidArgumentException('Unable to set stock');
            }

            $updated = $this->repo->findProductById($tenantId, $gymId, $productId);
            $movementId = $this->repo->createStockMovement([
                'tenant_id' => $tenantId,
                'gym_id' => $gymId,
                'product_id' => $productId,
                'movement_type' => $movementType,
                'qty' => $qty,
                'balance_after' => (float) ($updated['stock_qty'] ?? 0),
                'reference_type' => 'manual',
                'reference_id' => null,
                'created_by_user_id' => $userId > 0 ? $userId : null,
                'notes' => trim((string) ($input['notes'] ?? '')) ?: null
            ]);

            $conn->commit();
            return [
                'movement_id' => $movementId,
                'product_id' => $productId,
                'movement_type' => $movementType,
                'balance_after' => (float) ($updated['stock_qty'] ?? 0),
            ];
        } catch (\Throwable $e) {
            if ($conn->inTransaction()) {
                $conn->rollBack();
            }
            throw $e;
        }
    }

    public function listStockMovements(int $tenantId, int $gymId, ?int $productId, int $page, int $perPage): array
    {
        return $this->repo->listStockMovements($tenantId, $gymId, $productId, $page, $perPage);
    }

    public function openCashSession(int $tenantId, int $gymId, int $userId, array $input): array
    {
        $existing = $this->repo->findOpenCashSession($tenantId, $gymId);
        if ($existing) {
            throw new \InvalidArgumentException('There is already an open cash session');
        }
        $openingAmount = (float) ($input['opening_amount'] ?? 0);
        if ($openingAmount < 0) {
            throw new \InvalidArgumentException('opening_amount must be >= 0');
        }

        $sessionId = $this->repo->createCashSession([
            'tenant_id' => $tenantId,
            'gym_id' => $gymId,
            'opened_by_user_id' => $userId,
            'opening_amount' => $openingAmount,
            'notes' => trim((string) ($input['notes'] ?? '')) ?: null
        ]);

        return [
            'cash_session_id' => $sessionId,
            'status' => 'open',
            'opening_amount' => $openingAmount
        ];
    }

    public function getOpenCashSessionSummary(int $tenantId, int $gymId): array
    {
        $session = $this->repo->findOpenCashSession($tenantId, $gymId);
        if (!$session) {
            return ['open' => false];
        }

        $cashCollected = $this->repo->sumCashCollectedSince($tenantId, $gymId, (string) $session['opened_at']);
        $expected = (float) $session['opening_amount'] + $cashCollected;
        return [
            'open' => true,
            'session_id' => (int) $session['id'],
            'opened_at' => (string) $session['opened_at'],
            'opening_amount' => (float) $session['opening_amount'],
            'cash_collected' => $cashCollected,
            'expected_amount' => $expected
        ];
    }

    public function closeCashSession(int $tenantId, int $gymId, int $userId, array $input): array
    {
        $session = $this->repo->findOpenCashSession($tenantId, $gymId);
        if (!$session) {
            throw new \InvalidArgumentException('No open cash session');
        }
        $closingAmount = (float) ($input['closing_amount'] ?? 0);
        if ($closingAmount < 0) {
            throw new \InvalidArgumentException('closing_amount must be >= 0');
        }

        $cashCollected = $this->repo->sumCashCollectedSince($tenantId, $gymId, (string) $session['opened_at']);
        $expected = (float) $session['opening_amount'] + $cashCollected;
        $difference = round($closingAmount - $expected, 2);

        $ok = $this->repo->closeCashSession([
            'id' => (int) $session['id'],
            'tenant_id' => $tenantId,
            'gym_id' => $gymId,
            'closed_by_user_id' => $userId,
            'expected_amount' => $expected,
            'closing_amount' => $closingAmount,
            'difference_amount' => $difference,
            'notes' => trim((string) ($input['notes'] ?? '')) ?: null
        ]);
        if (!$ok) {
            throw new \InvalidArgumentException('Unable to close cash session');
        }

        return [
            'cash_session_id' => (int) $session['id'],
            'status' => 'closed',
            'opening_amount' => (float) $session['opening_amount'],
            'cash_collected' => $cashCollected,
            'expected_amount' => $expected,
            'closing_amount' => $closingAmount,
            'difference_amount' => $difference
        ];
    }

    public function listCashSessions(int $tenantId, int $gymId, int $page, int $perPage, mixed $userIdInput = null): array
    {
        $userId = $this->resolveOptionalUserId($userIdInput);
        return $this->repo->listCashSessions($tenantId, $gymId, $page, $perPage, $userId);
    }

    public function getCashByOperatorReport(
        int $tenantId,
        int $gymId,
        mixed $dateFromInput,
        mixed $dateToInput,
        mixed $userIdInput
    ): array {
        $filters = $this->resolveCashByOperatorFilters($dateFromInput, $dateToInput, $userIdInput);

        $summary = $this->repo->getCashByOperatorSummary(
            $tenantId,
            $gymId,
            $filters['date_from'],
            $filters['date_to'],
            $filters['user_id']
        );
        $rows = $this->repo->getCashByOperatorRows(
            $tenantId,
            $gymId,
            $filters['date_from'],
            $filters['date_to'],
            $filters['user_id']
        );

        $operators = array_map(static fn (array $row): array => [
            'user_id' => (int) ($row['user_id'] ?? 0),
            'sessions_count' => (int) ($row['sessions_count'] ?? 0),
            'opening_total' => (float) ($row['opening_total'] ?? 0),
            'expected_total' => (float) ($row['expected_total'] ?? 0),
            'closing_total' => (float) ($row['closing_total'] ?? 0),
            'difference_total' => (float) ($row['difference_total'] ?? 0),
        ], $rows);

        return [
            'filters' => $filters,
            'summary' => [
                'sessions_count' => (int) ($summary['sessions_count'] ?? 0),
                'opening_total' => (float) ($summary['opening_total'] ?? 0),
                'expected_total' => (float) ($summary['expected_total'] ?? 0),
                'closing_total' => (float) ($summary['closing_total'] ?? 0),
                'difference_total' => (float) ($summary['difference_total'] ?? 0),
            ],
            'operators' => $operators,
        ];
    }

    public function getOperationalAlerts(
        int $tenantId,
        int $gymId,
        mixed $dateFromInput,
        mixed $dateToInput,
        mixed $differenceThresholdInput,
        mixed $voidsThresholdInput
    ): array {
        $filters = $this->resolveOperationalAlertFilters(
            $dateFromInput,
            $dateToInput,
            $differenceThresholdInput,
            $voidsThresholdInput
        );

        $cashRows = $this->repo->getHighCashDifferences(
            $tenantId,
            $gymId,
            $filters['date_from'],
            $filters['date_to'],
            $filters['difference_threshold']
        );
        $voidRows = $this->repo->getUnusualVoidsByOperator(
            $tenantId,
            $gymId,
            $filters['date_from'],
            $filters['date_to'],
            $filters['voids_threshold']
        );

        $highCashDifferences = array_map(static fn (array $row): array => [
            'cash_session_id' => (int) ($row['cash_session_id'] ?? 0),
            'user_id' => isset($row['user_id']) ? (int) $row['user_id'] : null,
            'opened_at' => (string) ($row['opened_at'] ?? ''),
            'closed_at' => (string) ($row['closed_at'] ?? ''),
            'difference_amount' => (float) ($row['difference_amount'] ?? 0),
        ], $cashRows);

        $unusualVoidsByOperator = array_map(static fn (array $row): array => [
            'user_id' => (int) ($row['user_id'] ?? 0),
            'void_count' => (int) ($row['void_count'] ?? 0),
        ], $voidRows);

        $highCashDifferencesCount = count($highCashDifferences);
        $unusualVoidOperatorsCount = count($unusualVoidsByOperator);

        $level = 'ok';
        $message = 'Sin alertas operativas críticas';
        if ($highCashDifferencesCount >= 3 || $unusualVoidOperatorsCount >= 2) {
            $level = 'critical';
            $message = 'Riesgo operativo alto: revisar cajas y anulaciones';
        } elseif ($highCashDifferencesCount >= 1 || $unusualVoidOperatorsCount >= 1) {
            $level = 'warn';
            $message = 'Hay alertas operativas para revisar';
        }

        return [
            'filters' => $filters,
            'high_cash_differences' => $highCashDifferences,
            'unusual_voids_by_operator' => $unusualVoidsByOperator,
            'summary' => [
                'high_cash_differences_count' => $highCashDifferencesCount,
                'unusual_void_operators_count' => $unusualVoidOperatorsCount,
                'level' => $level,
                'message' => $message,
            ],
        ];
    }

    public function getOperationalAlertsNotifyLink(
        int $tenantId,
        int $gymId,
        mixed $dateFromInput,
        mixed $dateToInput,
        mixed $differenceThresholdInput,
        mixed $voidsThresholdInput,
        mixed $phoneInput,
        mixed $contactIdInput
    ): array {
        $alerts = $this->getOperationalAlerts(
            $tenantId,
            $gymId,
            $dateFromInput,
            $dateToInput,
            $differenceThresholdInput,
            $voidsThresholdInput
        );

        $summary = is_array($alerts['summary'] ?? null) ? $alerts['summary'] : [];
        $level = (string) ($summary['level'] ?? 'ok');
        $baseMessage = (string) ($summary['message'] ?? 'Sin alertas operativas críticas');
        $cashCount = (int) ($summary['high_cash_differences_count'] ?? 0);
        $voidOpsCount = (int) ($summary['unusual_void_operators_count'] ?? 0);

        $rawPhone = trim((string) ($phoneInput ?? ''));
        $targetSource = 'none';
        $targetLabel = null;

        if ($rawPhone !== '') {
            $targetSource = 'query_phone';
        } else {
            $contactId = $this->resolveOptionalUserId($contactIdInput);
            if ($contactId !== null) {
                $contact = $this->repo->findAlertContactById($tenantId, $gymId, $contactId);
                if ($contact && (int) ($contact['is_active'] ?? 0) === 1) {
                    $rawPhone = trim((string) ($contact['phone'] ?? ''));
                    $targetSource = 'contact';
                    $targetLabel = (string) ($contact['label'] ?? '');
                }
            }
            if ($rawPhone === '') {
                $gymPhone = $this->repo->findGymPhone($tenantId, $gymId);
                $rawPhone = trim((string) ($gymPhone ?? ''));
                if ($rawPhone !== '') {
                    $targetSource = 'gym_phone';
                }
            }
        }

        $normalizedPhone = $this->normalizePhoneDigits($rawPhone);
        if ($normalizedPhone === null) {
            return [
                'level' => $level,
                'message' => $baseMessage . '. No hay teléfono válido configurado para WhatsApp.',
                'phone_normalized' => null,
                'whatsapp_link' => null,
                'target_source' => 'none',
                'target_label' => null,
            ];
        }

        $text = sprintf(
            '[MRFitOS] Alerta POS %s. %s. Diferencias de caja: %d. Operadores con anulaciones inusuales: %d.',
            strtoupper($level),
            $baseMessage,
            $cashCount,
            $voidOpsCount
        );

        return [
            'level' => $level,
            'message' => $baseMessage,
            'phone_normalized' => $normalizedPhone,
            'whatsapp_link' => 'https://wa.me/' . $normalizedPhone . '?text=' . rawurlencode($text),
            'target_source' => $targetSource,
            'target_label' => $targetLabel,
        ];
    }

    public function notifyCriticalOperationalAlerts(
        int $tenantId,
        int $gymId,
        int $userId,
        array $input
    ): array {
        $dateFrom = $input['date_from'] ?? null;
        $dateTo = $input['date_to'] ?? null;
        $differenceThreshold = $input['difference_threshold'] ?? null;
        $voidsThreshold = $input['voids_threshold'] ?? null;
        $phone = $input['phone'] ?? null;
        $contactId = $input['contact_id'] ?? null;
        $cooldownMinutes = $this->resolveCooldownMinutes($input['cooldown_minutes'] ?? null);

        $notifyData = $this->getOperationalAlertsNotifyLink(
            $tenantId,
            $gymId,
            $dateFrom,
            $dateTo,
            $differenceThreshold,
            $voidsThreshold,
            $phone,
            $contactId
        );

        $level = (string) ($notifyData['level'] ?? 'ok');
        if ($level !== 'critical') {
            return [
                'dispatched' => false,
                'reason' => 'not_critical',
                'level' => $level,
                'message' => (string) ($notifyData['message'] ?? ''),
                'cooldown_minutes' => $cooldownMinutes,
            ];
        }

        $whatsappLink = $notifyData['whatsapp_link'] ?? null;
        if (!is_string($whatsappLink) || trim($whatsappLink) === '') {
            return [
                'dispatched' => false,
                'reason' => 'no_target',
                'level' => $level,
                'message' => (string) ($notifyData['message'] ?? ''),
                'target_source' => (string) ($notifyData['target_source'] ?? 'none'),
                'target_label' => $notifyData['target_label'] ?? null,
                'cooldown_minutes' => $cooldownMinutes,
            ];
        }

        $lastDispatch = $this->repo->findLatestActivityByAction($tenantId, $gymId, 'pos_alert_critical_notified');
        if ($lastDispatch) {
            $lastCreatedAt = (string) ($lastDispatch['created_at'] ?? '');
            $lastTs = strtotime($lastCreatedAt);
            if ($lastTs !== false) {
                $cooldownUntilTs = $lastTs + ($cooldownMinutes * 60);
                if (time() < $cooldownUntilTs) {
                    return [
                        'dispatched' => false,
                        'reason' => 'cooldown',
                        'level' => $level,
                        'message' => (string) ($notifyData['message'] ?? ''),
                        'cooldown_minutes' => $cooldownMinutes,
                        'cooldown_until' => date('Y-m-d H:i:s', $cooldownUntilTs),
                        'last_dispatched_at' => $lastCreatedAt,
                        'target_source' => (string) ($notifyData['target_source'] ?? 'none'),
                        'target_label' => $notifyData['target_label'] ?? null,
                    ];
                }
            }
        }

        $this->activity->create([
            'tenant_id' => $tenantId,
            'gym_id' => $gymId,
            'user_id' => $userId > 0 ? $userId : null,
            'entity_type' => 'pos_alert',
            'entity_id' => null,
            'action' => 'pos_alert_critical_notified',
            'metadata' => [
                'level' => $level,
                'message' => (string) ($notifyData['message'] ?? ''),
                'target_source' => (string) ($notifyData['target_source'] ?? 'none'),
                'target_label' => $notifyData['target_label'] ?? null,
                'phone_normalized' => $notifyData['phone_normalized'] ?? null,
                'whatsapp_link' => $whatsappLink,
                'cooldown_minutes' => $cooldownMinutes,
                'filters' => [
                    'date_from' => $dateFrom,
                    'date_to' => $dateTo,
                    'difference_threshold' => $differenceThreshold,
                    'voids_threshold' => $voidsThreshold,
                    'contact_id' => $contactId,
                ],
            ],
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
        ]);

        return [
            'dispatched' => true,
            'level' => $level,
            'message' => (string) ($notifyData['message'] ?? ''),
            'whatsapp_link' => $whatsappLink,
            'target_source' => (string) ($notifyData['target_source'] ?? 'none'),
            'target_label' => $notifyData['target_label'] ?? null,
            'phone_normalized' => $notifyData['phone_normalized'] ?? null,
            'cooldown_minutes' => $cooldownMinutes,
        ];
    }

    public function listAlertContacts(int $tenantId, int $gymId): array
    {
        $rows = $this->repo->listAlertContacts($tenantId, $gymId);
        return array_map([$this, 'normalizeAlertContact'], $rows);
    }

    public function createAlertContact(int $tenantId, int $gymId, array $input): array
    {
        $label = trim((string) ($input['label'] ?? ''));
        if (mb_strlen($label) < 2) {
            throw new \InvalidArgumentException('label is required (min 2 chars)');
        }

        if (!array_key_exists('phone', $input)) {
            throw new \InvalidArgumentException('phone is required');
        }
        $phone = $this->normalizePhoneDigits((string) ($input['phone'] ?? ''));
        if ($phone === null) {
            throw new \InvalidArgumentException('phone is invalid');
        }

        $id = $this->repo->createAlertContact([
            'tenant_id' => $tenantId,
            'gym_id' => $gymId,
            'label' => substr($label, 0, 80),
            'phone' => $phone,
            'is_active' => array_key_exists('is_active', $input) ? (!empty($input['is_active']) ? 1 : 0) : 1,
        ]);

        $created = $this->repo->findAlertContactById($tenantId, $gymId, $id);
        if (!$created) {
            throw new \RuntimeException('Failed to create alert contact');
        }
        return $this->normalizeAlertContact($created);
    }

    public function updateAlertContact(int $tenantId, int $gymId, int $contactId, array $input): array
    {
        if ($contactId <= 0) {
            throw new \InvalidArgumentException('Invalid contact id');
        }
        $existing = $this->repo->findAlertContactById($tenantId, $gymId, $contactId);
        if (!$existing) {
            throw new \InvalidArgumentException('Alert contact not found');
        }

        $fields = [];
        if (array_key_exists('label', $input)) {
            $label = trim((string) ($input['label'] ?? ''));
            if (mb_strlen($label) < 2) {
                throw new \InvalidArgumentException('label must have at least 2 chars');
            }
            $fields['label'] = substr($label, 0, 80);
        }
        if (array_key_exists('phone', $input)) {
            $phone = $this->normalizePhoneDigits((string) ($input['phone'] ?? ''));
            if ($phone === null) {
                throw new \InvalidArgumentException('phone is invalid');
            }
            $fields['phone'] = $phone;
        }
        if (array_key_exists('is_active', $input)) {
            $fields['is_active'] = !empty($input['is_active']) ? 1 : 0;
        }
        if ($fields === []) {
            throw new \InvalidArgumentException('No valid fields to update');
        }

        $ok = $this->repo->updateAlertContact($tenantId, $gymId, $contactId, $fields);
        if (!$ok) {
            throw new \RuntimeException('Failed to update alert contact');
        }
        $updated = $this->repo->findAlertContactById($tenantId, $gymId, $contactId);
        if (!$updated) {
            throw new \RuntimeException('Alert contact not found after update');
        }
        return $this->normalizeAlertContact($updated);
    }

    public function deleteAlertContact(int $tenantId, int $gymId, int $contactId): array
    {
        if ($contactId <= 0) {
            throw new \InvalidArgumentException('Invalid contact id');
        }
        $existing = $this->repo->findAlertContactById($tenantId, $gymId, $contactId);
        if (!$existing) {
            throw new \InvalidArgumentException('Alert contact not found');
        }

        $ok = $this->repo->softDeleteAlertContact($tenantId, $gymId, $contactId);
        if (!$ok) {
            throw new \RuntimeException('Failed to delete alert contact');
        }

        return [
            'id' => $contactId,
            'status' => 'deleted',
        ];
    }

    public function getCashSessionReport(int $tenantId, int $gymId, int $cashSessionId): array
    {
        if ($cashSessionId <= 0) {
            throw new \InvalidArgumentException('Invalid cash session id');
        }

        $session = $this->repo->findCashSessionById($tenantId, $gymId, $cashSessionId);
        if (!$session) {
            throw new \InvalidArgumentException('Cash session not found');
        }

        $fromDateTime = (string) ($session['opened_at'] ?? '');
        if ($fromDateTime === '') {
            throw new \InvalidArgumentException('Cash session has invalid opened_at');
        }
        $toDateTime = (string) ($session['closed_at'] ?? '');
        if ($toDateTime === '') {
            $toDateTime = date('Y-m-d H:i:s');
        }

        $paymentsByMethodRows = $this->repo->sumPaymentsByMethodInRange($tenantId, $gymId, $fromDateTime, $toDateTime);
        $paymentsByMethod = [];
        $paymentsTotal = 0.0;
        foreach ($paymentsByMethodRows as $row) {
            $method = (string) ($row['method'] ?? 'other');
            $amount = (float) ($row['total_amount'] ?? 0);
            $paymentsByMethod[$method] = $amount;
            $paymentsTotal += $amount;
        }

        $salesTotals = $this->repo->getPosSalesTotalsInRange($tenantId, $gymId, $fromDateTime, $toDateTime);
        $memberAccountSummary = $this->repo->getSettledMemberAccountSummaryInRange($tenantId, $gymId, $fromDateTime, $toDateTime);

        return [
            'cash_session' => [
                'id' => (int) $session['id'],
                'status' => (string) ($session['status'] ?? ''),
                'opening_amount' => (float) ($session['opening_amount'] ?? 0),
                'expected_amount' => isset($session['expected_amount']) ? (float) $session['expected_amount'] : null,
                'closing_amount' => isset($session['closing_amount']) ? (float) $session['closing_amount'] : null,
                'difference_amount' => isset($session['difference_amount']) ? (float) $session['difference_amount'] : null,
                'opened_at' => (string) ($session['opened_at'] ?? ''),
                'closed_at' => $session['closed_at'] ?? null,
                'notes' => $session['notes'] ?? null,
            ],
            'range' => [
                'from' => $fromDateTime,
                'to' => $toDateTime
            ],
            'payments' => [
                'by_method' => $paymentsByMethod,
                'total' => round($paymentsTotal, 2)
            ],
            'pos_sales' => [
                'count' => (int) ($salesTotals['sales_count'] ?? 0),
                'total' => (float) ($salesTotals['sales_total'] ?? 0)
            ],
            'member_account_settlements' => [
                'count' => (int) ($memberAccountSummary['settled_count'] ?? 0),
                'total' => (float) ($memberAccountSummary['settled_total'] ?? 0)
            ]
        ];
    }

    public function getDailyZCloseReport(int $tenantId, int $gymId, ?string $date): array
    {
        $reportDate = $this->resolveReportDate($date);

        $cashSessions = $this->repo->getDailyCashSessionsSummary($tenantId, $gymId, $reportDate);
        $paymentRows = $this->repo->getDailyPaymentsByMethod($tenantId, $gymId, $reportDate);
        $salesSummary = $this->repo->getDailyPosSalesSummary($tenantId, $gymId, $reportDate);
        $settlementsSummary = $this->repo->getDailySettledMemberAccountSummary($tenantId, $gymId, $reportDate);

        $paymentsByMethod = [
            'cash' => 0.0,
            'transfer' => 0.0,
            'mercadopago' => 0.0,
            'card' => 0.0,
            'other' => 0.0,
        ];
        foreach ($paymentRows as $row) {
            $method = (string) ($row['method'] ?? 'other');
            $amount = (float) ($row['total_amount'] ?? 0);
            if (!array_key_exists($method, $paymentsByMethod)) {
                $method = 'other';
            }
            $paymentsByMethod[$method] += $amount;
        }
        $paymentsTotal = array_sum($paymentsByMethod);

        return [
            'date' => $reportDate,
            'cash_sessions' => [
                'opened_count' => (int) ($cashSessions['opened_count'] ?? 0),
                'closed_count' => (int) ($cashSessions['closed_count'] ?? 0),
                'opening_total' => (float) ($cashSessions['opening_total'] ?? 0),
                'expected_total' => (float) ($cashSessions['expected_total'] ?? 0),
                'closing_total' => (float) ($cashSessions['closing_total'] ?? 0),
                'difference_total' => (float) ($cashSessions['difference_total'] ?? 0),
            ],
            'payments' => [
                'by_method' => $paymentsByMethod,
                'total' => round((float) $paymentsTotal, 2),
            ],
            'pos_sales' => [
                'count' => (int) ($salesSummary['sales_count'] ?? 0),
                'total' => (float) ($salesSummary['sales_total'] ?? 0),
            ],
            'member_account_settlements' => [
                'count' => (int) ($settlementsSummary['settled_count'] ?? 0),
                'total' => (float) ($settlementsSummary['settled_total'] ?? 0),
            ],
        ];
    }

    public function getPosConfig(int $tenantId, int $gymId): array
    {
        return [
            'require_open_cash' => $this->getRequireOpenCash($tenantId, $gymId)
        ];
    }

    public function updatePosConfig(int $tenantId, int $gymId, array $input): array
    {
        if (!array_key_exists('require_open_cash', $input) || !is_bool($input['require_open_cash'])) {
            throw new \InvalidArgumentException('require_open_cash must be boolean');
        }
        $value = (bool) $input['require_open_cash'];
        $this->repo->upsertSetting($tenantId, $gymId, self::SETTING_REQUIRE_OPEN_CASH, $value ? '1' : '0');
        return [
            'require_open_cash' => $value
        ];
    }

    public function listPosAudit(
        int $tenantId,
        int $gymId,
        mixed $dateFromInput,
        mixed $dateToInput,
        mixed $actionInput,
        mixed $userIdInput,
        int $page,
        int $perPage
    ): array {
        $filters = $this->resolvePosAuditFilters($dateFromInput, $dateToInput, $actionInput, $userIdInput);
        $rows = $this->repo->listPosAudit(
            $tenantId,
            $gymId,
            $filters['date_from'],
            $filters['date_to'],
            $filters['action'],
            $filters['user_id'],
            $page,
            $perPage
        );

        $rows['items'] = array_map([$this, 'normalizeAuditItem'], $rows['items'] ?? []);
        return $rows;
    }

    public function exportPosAudit(
        int $tenantId,
        int $gymId,
        mixed $dateFromInput,
        mixed $dateToInput,
        mixed $actionInput,
        mixed $userIdInput
    ): array {
        $filters = $this->resolvePosAuditFilters($dateFromInput, $dateToInput, $actionInput, $userIdInput);
        $rows = $this->repo->exportPosAudit(
            $tenantId,
            $gymId,
            $filters['date_from'],
            $filters['date_to'],
            $filters['action'],
            $filters['user_id']
        );

        return [
            'filters' => $filters,
            'items' => array_map([$this, 'normalizeAuditItem'], $rows),
        ];
    }

    public function listCriticalAlertDispatchHistory(
        int $tenantId,
        int $gymId,
        mixed $dateFromInput,
        mixed $dateToInput,
        int $page,
        int $perPage
    ): array {
        $filters = $this->resolveDispatchHistoryFilters($dateFromInput, $dateToInput);
        $rows = $this->repo->listCriticalAlertDispatchHistory(
            $tenantId,
            $gymId,
            $filters['date_from'],
            $filters['date_to'],
            $page,
            $perPage
        );

        $rows['items'] = array_map([$this, 'normalizeDispatchHistoryItem'], $rows['items'] ?? []);
        return $rows;
    }

    private function getRequireOpenCash(int $tenantId, int $gymId): bool
    {
        $stored = $this->repo->getSetting($tenantId, $gymId, self::SETTING_REQUIRE_OPEN_CASH);
        if ($stored !== null) {
            return $stored === '1' || strtolower($stored) === 'true';
        }
        return filter_var((string) Env::get('POS_REQUIRE_OPEN_CASH', '1'), FILTER_VALIDATE_BOOL);
    }

    private function formatReceiptNumber(int $gymId, int $sequence): string
    {
        $gymSegment = str_pad((string) max(0, $gymId), 3, '0', STR_PAD_LEFT);
        $seqSegment = str_pad((string) max(1, $sequence), 8, '0', STR_PAD_LEFT);
        return 'POS-' . $gymSegment . '-' . $seqSegment;
    }

    private function resolveReportDate(?string $date): string
    {
        $raw = trim((string) ($date ?? ''));
        if ($raw === '') {
            return date('Y-m-d');
        }

        $dt = \DateTime::createFromFormat('Y-m-d', $raw);
        $errors = \DateTime::getLastErrors();
        if (
            !$dt ||
            !is_array($errors) ||
            ($errors['warning_count'] ?? 0) > 0 ||
            ($errors['error_count'] ?? 0) > 0 ||
            $dt->format('Y-m-d') !== $raw
        ) {
            throw new \InvalidArgumentException('date must be in YYYY-MM-DD format');
        }

        return $raw;
    }

    private function resolveLowStockThreshold(mixed $thresholdInput): float
    {
        if ($thresholdInput === null || $thresholdInput === '') {
            return 5.0;
        }

        if (!is_numeric($thresholdInput)) {
            throw new \InvalidArgumentException('threshold must be numeric');
        }

        $threshold = (float) $thresholdInput;
        if ($threshold <= 0 || $threshold > 10000) {
            throw new \InvalidArgumentException('threshold must be > 0 and <= 10000');
        }

        return $threshold;
    }

    private function resolveCashByOperatorFilters(mixed $dateFromInput, mixed $dateToInput, mixed $userIdInput): array
    {
        $dateFrom = $this->resolveOptionalDate($dateFromInput, 'date_from');
        $dateTo = $this->resolveOptionalDate($dateToInput, 'date_to');
        if ($dateFrom !== null && $dateTo !== null && $dateFrom > $dateTo) {
            throw new \InvalidArgumentException('date_from must be <= date_to');
        }

        return [
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
            'user_id' => $this->resolveOptionalUserId($userIdInput),
        ];
    }

    private function resolveOperationalAlertFilters(
        mixed $dateFromInput,
        mixed $dateToInput,
        mixed $differenceThresholdInput,
        mixed $voidsThresholdInput
    ): array {
        $dateFrom = $this->resolveOptionalDate($dateFromInput, 'date_from');
        $dateTo = $this->resolveOptionalDate($dateToInput, 'date_to');
        if ($dateFrom !== null && $dateTo !== null && $dateFrom > $dateTo) {
            throw new \InvalidArgumentException('date_from must be <= date_to');
        }

        $differenceThreshold = 0.0;
        if ($differenceThresholdInput !== null && $differenceThresholdInput !== '') {
            if (!is_numeric($differenceThresholdInput)) {
                throw new \InvalidArgumentException('difference_threshold must be numeric');
            }
            $differenceThreshold = (float) $differenceThresholdInput;
            if ($differenceThreshold < 0 || $differenceThreshold > 1000000000) {
                throw new \InvalidArgumentException('difference_threshold must be >= 0 and <= 1000000000');
            }
        }

        $voidsThreshold = 3;
        if ($voidsThresholdInput !== null && $voidsThresholdInput !== '') {
            if (!is_numeric($voidsThresholdInput)) {
                throw new \InvalidArgumentException('voids_threshold must be an integer');
            }
            $voidsThreshold = (int) $voidsThresholdInput;
            if ($voidsThreshold < 0 || $voidsThreshold > 10000) {
                throw new \InvalidArgumentException('voids_threshold must be >= 0 and <= 10000');
            }
        }

        return [
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
            'difference_threshold' => $differenceThreshold,
            'voids_threshold' => $voidsThreshold,
        ];
    }

    private function resolveOptionalDate(mixed $value, string $fieldName): ?string
    {
        $raw = trim((string) ($value ?? ''));
        if ($raw === '') {
            return null;
        }

        $dt = \DateTime::createFromFormat('Y-m-d', $raw);
        $errors = \DateTime::getLastErrors();
        if (
            !$dt ||
            !is_array($errors) ||
            ($errors['warning_count'] ?? 0) > 0 ||
            ($errors['error_count'] ?? 0) > 0 ||
            $dt->format('Y-m-d') !== $raw
        ) {
            throw new \InvalidArgumentException($fieldName . ' must be in YYYY-MM-DD format');
        }

        return $raw;
    }

    private function resolveOptionalUserId(mixed $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (!is_numeric($value)) {
            throw new \InvalidArgumentException('user_id must be an integer');
        }

        $userId = (int) $value;
        if ($userId <= 0) {
            throw new \InvalidArgumentException('user_id must be greater than 0');
        }
        return $userId;
    }

    private function resolvePosAuditFilters(
        mixed $dateFromInput,
        mixed $dateToInput,
        mixed $actionInput,
        mixed $userIdInput
    ): array {
        $dateFrom = $this->resolveOptionalDate($dateFromInput, 'date_from');
        $dateTo = $this->resolveOptionalDate($dateToInput, 'date_to');
        if ($dateFrom !== null && $dateTo !== null && $dateFrom > $dateTo) {
            throw new \InvalidArgumentException('date_from must be <= date_to');
        }

        $action = trim((string) ($actionInput ?? ''));
        if ($action !== '' && mb_strlen($action) > 80) {
            throw new \InvalidArgumentException('action must be <= 80 chars');
        }

        return [
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
            'action' => $action !== '' ? $action : null,
            'user_id' => $this->resolveOptionalUserId($userIdInput),
        ];
    }

    private function normalizeAuditItem(array $row): array
    {
        $metadataRaw = $row['metadata'] ?? null;
        $metadata = null;
        if (is_string($metadataRaw) && $metadataRaw !== '') {
            $decoded = json_decode($metadataRaw, true);
            if (is_array($decoded)) {
                $metadata = $decoded;
            }
        }

        return [
            'id' => (int) ($row['id'] ?? 0),
            'user_id' => isset($row['user_id']) ? (int) $row['user_id'] : null,
            'user' => [
                'email' => $row['user_email'] ?? null,
                'first_name' => $row['first_name'] ?? null,
                'last_name' => $row['last_name'] ?? null,
            ],
            'entity_type' => (string) ($row['entity_type'] ?? ''),
            'entity_id' => isset($row['entity_id']) ? (int) $row['entity_id'] : null,
            'action' => (string) ($row['action'] ?? ''),
            'metadata' => $metadata,
            'ip_address' => $row['ip_address'] ?? null,
            'user_agent' => $row['user_agent'] ?? null,
            'created_at' => (string) ($row['created_at'] ?? ''),
        ];
    }

    private function normalizeAlertContact(array $row): array
    {
        return [
            'id' => (int) ($row['id'] ?? 0),
            'label' => (string) ($row['label'] ?? ''),
            'phone' => (string) ($row['phone'] ?? ''),
            'is_active' => (int) ($row['is_active'] ?? 0) === 1,
            'created_at' => (string) ($row['created_at'] ?? ''),
            'updated_at' => (string) ($row['updated_at'] ?? ''),
        ];
    }

    private function resolveDispatchHistoryFilters(mixed $dateFromInput, mixed $dateToInput): array
    {
        $dateFrom = $this->resolveOptionalDate($dateFromInput, 'date_from');
        $dateTo = $this->resolveOptionalDate($dateToInput, 'date_to');
        if ($dateFrom !== null && $dateTo !== null && $dateFrom > $dateTo) {
            throw new \InvalidArgumentException('date_from must be <= date_to');
        }

        return [
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
        ];
    }

    private function normalizeDispatchHistoryItem(array $row): array
    {
        $metadata = [];
        $raw = $row['metadata'] ?? null;
        if (is_string($raw) && $raw !== '') {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $metadata = $decoded;
            }
        }

        return [
            'id' => (int) ($row['id'] ?? 0),
            'created_at' => (string) ($row['created_at'] ?? ''),
            'user_id' => isset($row['user_id']) ? (int) $row['user_id'] : null,
            'entity_type' => (string) ($row['entity_type'] ?? ''),
            'entity_id' => isset($row['entity_id']) ? (int) $row['entity_id'] : null,
            'action' => (string) ($row['action'] ?? ''),
            'level' => isset($metadata['level']) ? (string) $metadata['level'] : null,
            'reason' => isset($metadata['reason']) ? (string) $metadata['reason'] : null,
            'target_source' => isset($metadata['target_source']) ? (string) $metadata['target_source'] : null,
            'target_label' => isset($metadata['target_label']) ? (string) $metadata['target_label'] : null,
            'whatsapp_link' => isset($metadata['whatsapp_link']) ? (string) $metadata['whatsapp_link'] : null,
        ];
    }

    private function normalizePhoneDigits(string $phone): ?string
    {
        $digits = preg_replace('/\D+/', '', $phone);
        if (!is_string($digits)) {
            return null;
        }
        $digits = trim($digits);
        if ($digits === '') {
            return null;
        }
        $len = strlen($digits);
        if ($len < 8 || $len > 15) {
            return null;
        }
        return $digits;
    }

    private function resolveCooldownMinutes(mixed $value): int
    {
        if ($value === null || $value === '') {
            return 60;
        }
        if (!is_numeric($value)) {
            throw new \InvalidArgumentException('cooldown_minutes must be numeric');
        }
        $minutes = (int) $value;
        if ($minutes < 1 || $minutes > 1440) {
            throw new \InvalidArgumentException('cooldown_minutes must be between 1 and 1440');
        }
        return $minutes;
    }
}
