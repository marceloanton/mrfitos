<?php

namespace App\Repositories;

use Core\Database;

final class PosRepository
{
    public function findSaleById(int $tenantId, int $gymId, int $saleId): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT s.id, s.gym_id, s.receipt_number, s.created_at, s.charge_mode, s.total_amount, s.currency, s.notes, s.payment_id,
                    m.member_code, m.first_name, m.last_name
             FROM pos_sales s
             LEFT JOIN members m ON m.id = s.member_id AND m.tenant_id = s.tenant_id AND m.gym_id = s.gym_id
             WHERE s.id = :id
               AND s.tenant_id = :tenant_id
               AND s.gym_id = :gym_id
               AND s.deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute([
            'id' => $saleId,
            'tenant_id' => $tenantId,
            'gym_id' => $gymId
        ]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function findSaleByReceiptNumber(int $tenantId, int $gymId, string $receiptNumber): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT s.id, s.gym_id, s.receipt_number, s.created_at, s.charge_mode, s.total_amount, s.currency, s.notes, s.payment_id,
                    m.member_code, m.first_name, m.last_name
             FROM pos_sales s
             LEFT JOIN members m ON m.id = s.member_id AND m.tenant_id = s.tenant_id AND m.gym_id = s.gym_id
             WHERE s.receipt_number = :receipt_number
               AND s.tenant_id = :tenant_id
               AND s.gym_id = :gym_id
               AND s.deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute([
            'receipt_number' => $receiptNumber,
            'tenant_id' => $tenantId,
            'gym_id' => $gymId
        ]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function listSaleItems(int $tenantId, int $gymId, int $saleId): array
    {
        $stmt = Database::connection()->prepare(
            'SELECT item_name, qty, unit_price, line_total
             FROM pos_sale_items
             WHERE sale_id = :sale_id
               AND tenant_id = :tenant_id
               AND gym_id = :gym_id
             ORDER BY id ASC'
        );
        $stmt->execute([
            'sale_id' => $saleId,
            'tenant_id' => $tenantId,
            'gym_id' => $gymId
        ]);
        return $stmt->fetchAll() ?: [];
    }

    public function findPaymentById(int $tenantId, int $gymId, int $paymentId): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT method, amount, paid_at
             FROM payments
             WHERE id = :id
               AND tenant_id = :tenant_id
               AND gym_id = :gym_id
               AND deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute([
            'id' => $paymentId,
            'tenant_id' => $tenantId,
            'gym_id' => $gymId
        ]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function findCashSessionById(int $tenantId, int $gymId, int $cashSessionId): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT id, status, opening_amount, expected_amount, closing_amount, difference_amount, opened_at, closed_at, notes
             FROM pos_cash_sessions
             WHERE id = :id AND tenant_id = :tenant_id AND gym_id = :gym_id
             LIMIT 1'
        );
        $stmt->execute([
            'id' => $cashSessionId,
            'tenant_id' => $tenantId,
            'gym_id' => $gymId
        ]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function sumPaymentsByMethodInRange(int $tenantId, int $gymId, string $fromDateTime, string $toDateTime): array
    {
        $stmt = Database::connection()->prepare(
            'SELECT method, COALESCE(SUM(amount), 0) AS total_amount
             FROM payments
             WHERE tenant_id = :tenant_id
               AND gym_id = :gym_id
               AND deleted_at IS NULL
               AND status = "paid"
               AND paid_at >= :from_dt
               AND paid_at <= :to_dt
             GROUP BY method'
        );
        $stmt->execute([
            'tenant_id' => $tenantId,
            'gym_id' => $gymId,
            'from_dt' => $fromDateTime,
            'to_dt' => $toDateTime
        ]);
        return $stmt->fetchAll() ?: [];
    }

    public function getPosSalesTotalsInRange(int $tenantId, int $gymId, string $fromDateTime, string $toDateTime): array
    {
        $stmt = Database::connection()->prepare(
            'SELECT COUNT(*) AS sales_count, COALESCE(SUM(total_amount), 0) AS sales_total
             FROM pos_sales
             WHERE tenant_id = :tenant_id
               AND gym_id = :gym_id
               AND deleted_at IS NULL
               AND created_at >= :from_dt
               AND created_at <= :to_dt'
        );
        $stmt->execute([
            'tenant_id' => $tenantId,
            'gym_id' => $gymId,
            'from_dt' => $fromDateTime,
            'to_dt' => $toDateTime
        ]);
        $row = $stmt->fetch() ?: [];
        return [
            'sales_count' => (int) ($row['sales_count'] ?? 0),
            'sales_total' => (float) ($row['sales_total'] ?? 0),
        ];
    }

    public function getSettledMemberAccountSummaryInRange(int $tenantId, int $gymId, string $fromDateTime, string $toDateTime): array
    {
        $stmt = Database::connection()->prepare(
            'SELECT COUNT(*) AS settled_count, COALESCE(SUM(c.amount), 0) AS settled_total
             FROM member_account_charges c
             INNER JOIN payments p ON p.id = c.settled_payment_id
             WHERE c.tenant_id = :tenant_id
               AND c.gym_id = :gym_id
               AND c.status = "settled"
               AND p.tenant_id = :tenant_id
               AND p.gym_id = :gym_id
               AND p.deleted_at IS NULL
               AND p.status = "paid"
               AND p.paid_at >= :from_dt
               AND p.paid_at <= :to_dt'
        );
        $stmt->execute([
            'tenant_id' => $tenantId,
            'gym_id' => $gymId,
            'from_dt' => $fromDateTime,
            'to_dt' => $toDateTime
        ]);
        $row = $stmt->fetch() ?: [];
        return [
            'settled_count' => (int) ($row['settled_count'] ?? 0),
            'settled_total' => (float) ($row['settled_total'] ?? 0),
        ];
    }

    public function getSummary(int $tenantId, int $gymId): array
    {
        $todayStmt = Database::connection()->prepare(
            'SELECT
                COUNT(*) AS sales_count,
                COALESCE(SUM(total_amount), 0) AS sales_total
             FROM pos_sales
             WHERE tenant_id = :tenant_id
               AND gym_id = :gym_id
               AND deleted_at IS NULL
               AND DATE(created_at) = CURDATE()'
        );
        $todayStmt->execute(['tenant_id' => $tenantId, 'gym_id' => $gymId]);
        $today = $todayStmt->fetch() ?: ['sales_count' => 0, 'sales_total' => 0];

        $cashStmt = Database::connection()->prepare(
            'SELECT COALESCE(SUM(amount), 0)
             FROM payments
             WHERE tenant_id = :tenant_id
               AND gym_id = :gym_id
               AND deleted_at IS NULL
               AND status = "paid"
               AND method = "cash"
               AND DATE(paid_at) = CURDATE()'
        );
        $cashStmt->execute(['tenant_id' => $tenantId, 'gym_id' => $gymId]);
        $cashTotal = (float) $cashStmt->fetchColumn();

        $pendingStmt = Database::connection()->prepare(
            'SELECT COALESCE(SUM(amount), 0)
             FROM member_account_charges
             WHERE tenant_id = :tenant_id
               AND gym_id = :gym_id
               AND status = "pending_auto_debit"'
        );
        $pendingStmt->execute(['tenant_id' => $tenantId, 'gym_id' => $gymId]);
        $pendingTotal = (float) $pendingStmt->fetchColumn();

        return [
            'today_sales_count' => (int) ($today['sales_count'] ?? 0),
            'today_sales_total' => (float) ($today['sales_total'] ?? 0),
            'today_cash_collected' => $cashTotal,
            'pending_member_account_total' => $pendingTotal
        ];
    }

    public function getDailyCashSessionsSummary(int $tenantId, int $gymId, string $date): array
    {
        $stmt = Database::connection()->prepare(
            'SELECT
                COUNT(CASE WHEN status = "open" THEN 1 END) AS opened_count,
                COUNT(CASE WHEN status = "closed" THEN 1 END) AS closed_count,
                COALESCE(SUM(opening_amount), 0) AS opening_total,
                COALESCE(SUM(expected_amount), 0) AS expected_total,
                COALESCE(SUM(closing_amount), 0) AS closing_total,
                COALESCE(SUM(difference_amount), 0) AS difference_total
             FROM pos_cash_sessions
             WHERE tenant_id = :tenant_id
               AND gym_id = :gym_id
               AND DATE(opened_at) = :report_date'
        );
        $stmt->execute([
            'tenant_id' => $tenantId,
            'gym_id' => $gymId,
            'report_date' => $date
        ]);
        $row = $stmt->fetch() ?: [];

        return [
            'opened_count' => (int) ($row['opened_count'] ?? 0),
            'closed_count' => (int) ($row['closed_count'] ?? 0),
            'opening_total' => (float) ($row['opening_total'] ?? 0),
            'expected_total' => (float) ($row['expected_total'] ?? 0),
            'closing_total' => (float) ($row['closing_total'] ?? 0),
            'difference_total' => (float) ($row['difference_total'] ?? 0),
        ];
    }

    public function getDailyPaymentsByMethod(int $tenantId, int $gymId, string $date): array
    {
        $stmt = Database::connection()->prepare(
            'SELECT method, COALESCE(SUM(amount), 0) AS total_amount
             FROM payments
             WHERE tenant_id = :tenant_id
               AND gym_id = :gym_id
               AND deleted_at IS NULL
               AND status = "paid"
               AND DATE(paid_at) = :report_date
             GROUP BY method'
        );
        $stmt->execute([
            'tenant_id' => $tenantId,
            'gym_id' => $gymId,
            'report_date' => $date
        ]);
        return $stmt->fetchAll() ?: [];
    }

    public function getDailyPosSalesSummary(int $tenantId, int $gymId, string $date): array
    {
        $stmt = Database::connection()->prepare(
            'SELECT COUNT(*) AS sales_count, COALESCE(SUM(total_amount), 0) AS sales_total
             FROM pos_sales
             WHERE tenant_id = :tenant_id
               AND gym_id = :gym_id
               AND deleted_at IS NULL
               AND DATE(created_at) = :report_date'
        );
        $stmt->execute([
            'tenant_id' => $tenantId,
            'gym_id' => $gymId,
            'report_date' => $date
        ]);
        $row = $stmt->fetch() ?: [];
        return [
            'sales_count' => (int) ($row['sales_count'] ?? 0),
            'sales_total' => (float) ($row['sales_total'] ?? 0),
        ];
    }

    public function getDailySettledMemberAccountSummary(int $tenantId, int $gymId, string $date): array
    {
        $stmt = Database::connection()->prepare(
            'SELECT COUNT(*) AS settled_count, COALESCE(SUM(c.amount), 0) AS settled_total
             FROM member_account_charges c
             INNER JOIN payments p ON p.id = c.settled_payment_id
             WHERE c.tenant_id = :tenant_id
               AND c.gym_id = :gym_id
               AND c.status = "settled"
               AND p.tenant_id = :tenant_id
               AND p.gym_id = :gym_id
               AND p.deleted_at IS NULL
               AND p.status = "paid"
               AND DATE(p.paid_at) = :report_date'
        );
        $stmt->execute([
            'tenant_id' => $tenantId,
            'gym_id' => $gymId,
            'report_date' => $date
        ]);
        $row = $stmt->fetch() ?: [];
        return [
            'settled_count' => (int) ($row['settled_count'] ?? 0),
            'settled_total' => (float) ($row['settled_total'] ?? 0),
        ];
    }

    public function getSetting(int $tenantId, ?int $gymId, string $key): ?string
    {
        $stmt = Database::connection()->prepare(
            'SELECT setting_value
             FROM app_settings
             WHERE tenant_id = :tenant_id
               AND ((gym_id IS NULL AND :gym_id IS NULL) OR gym_id = :gym_id)
               AND setting_key = :setting_key
             LIMIT 1'
        );
        $stmt->execute([
            'tenant_id' => $tenantId,
            'gym_id' => $gymId,
            'setting_key' => $key
        ]);
        $value = $stmt->fetchColumn();
        return $value === false ? null : (string) $value;
    }

    public function upsertSetting(int $tenantId, ?int $gymId, string $key, string $value): void
    {
        $stmt = Database::connection()->prepare(
            'INSERT INTO app_settings (tenant_id, gym_id, setting_key, setting_value, created_at, updated_at)
             VALUES (:tenant_id, :gym_id, :setting_key, :setting_value, NOW(), NOW())
             ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()'
        );
        $stmt->execute([
            'tenant_id' => $tenantId,
            'gym_id' => $gymId,
            'setting_key' => $key,
            'setting_value' => $value
        ]);
    }

    public function findOpenCashSession(int $tenantId, int $gymId): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT id, status, opening_amount, opened_at, opened_by_user_id
             FROM pos_cash_sessions
             WHERE tenant_id = :tenant_id AND gym_id = :gym_id AND status = "open"
             ORDER BY id DESC
             LIMIT 1'
        );
        $stmt->execute(['tenant_id' => $tenantId, 'gym_id' => $gymId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function createCashSession(array $data): int
    {
        $stmt = Database::connection()->prepare(
            'INSERT INTO pos_cash_sessions
             (tenant_id, gym_id, opened_by_user_id, status, opening_amount, opened_at, notes, created_at, updated_at)
             VALUES
             (:tenant_id, :gym_id, :opened_by_user_id, "open", :opening_amount, NOW(), :notes, NOW(), NOW())'
        );
        $stmt->execute($data);
        return (int) Database::connection()->lastInsertId();
    }

    public function closeCashSession(array $data): bool
    {
        $stmt = Database::connection()->prepare(
            'UPDATE pos_cash_sessions
             SET status = "closed",
                 closed_by_user_id = :closed_by_user_id,
                 expected_amount = :expected_amount,
                 closing_amount = :closing_amount,
                 difference_amount = :difference_amount,
                 closed_at = NOW(),
                 notes = :notes,
                 updated_at = NOW()
             WHERE id = :id AND tenant_id = :tenant_id AND gym_id = :gym_id AND status = "open"'
        );
        $stmt->execute($data);
        return $stmt->rowCount() > 0;
    }

    public function sumCashCollectedSince(int $tenantId, int $gymId, string $fromDateTime): float
    {
        $stmt = Database::connection()->prepare(
            'SELECT COALESCE(SUM(amount), 0)
             FROM payments
             WHERE tenant_id = :tenant_id
               AND gym_id = :gym_id
               AND deleted_at IS NULL
               AND status = "paid"
               AND method = "cash"
               AND paid_at >= :from_dt'
        );
        $stmt->execute([
            'tenant_id' => $tenantId,
            'gym_id' => $gymId,
            'from_dt' => $fromDateTime
        ]);
        return (float) $stmt->fetchColumn();
    }

    public function listCashSessions(int $tenantId, int $gymId, int $page, int $perPage): array
    {
        $offset = ($page - 1) * $perPage;
        $countStmt = Database::connection()->prepare(
            'SELECT COUNT(*) FROM pos_cash_sessions WHERE tenant_id = :tenant_id AND gym_id = :gym_id'
        );
        $countStmt->execute(['tenant_id' => $tenantId, 'gym_id' => $gymId]);
        $total = (int) $countStmt->fetchColumn();

        $stmt = Database::connection()->prepare(
            'SELECT id, status, opening_amount, expected_amount, closing_amount, difference_amount, opened_at, closed_at, notes
             FROM pos_cash_sessions
             WHERE tenant_id = :tenant_id AND gym_id = :gym_id
             ORDER BY id DESC
             LIMIT :limit OFFSET :offset'
        );
        $stmt->bindValue(':tenant_id', $tenantId, \PDO::PARAM_INT);
        $stmt->bindValue(':gym_id', $gymId, \PDO::PARAM_INT);
        $stmt->bindValue(':limit', $perPage, \PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        return [
            'items' => $stmt->fetchAll() ?: [],
            'meta' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'total_pages' => (int) max(1, ceil($total / $perPage))
            ]
        ];
    }

    public function listProducts(int $tenantId, int $gymId): array
    {
        $stmt = Database::connection()->prepare(
            'SELECT id, code, name, price, currency, track_stock, stock_qty, is_active
             FROM pos_products
             WHERE tenant_id = :tenant_id AND gym_id = :gym_id AND deleted_at IS NULL
             ORDER BY id DESC'
        );
        $stmt->execute(['tenant_id' => $tenantId, 'gym_id' => $gymId]);
        return $stmt->fetchAll() ?: [];
    }

    public function createProduct(array $data): int
    {
        $stmt = Database::connection()->prepare(
            'INSERT INTO pos_products (tenant_id, gym_id, code, name, price, currency, track_stock, stock_qty, is_active, created_at, updated_at)
             VALUES (:tenant_id, :gym_id, :code, :name, :price, :currency, :track_stock, :stock_qty, :is_active, NOW(), NOW())'
        );
        $stmt->execute($data);
        return (int) Database::connection()->lastInsertId();
    }

    public function findProductById(int $tenantId, int $gymId, int $productId): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT id, code, name, price, currency, track_stock, stock_qty, is_active
             FROM pos_products
             WHERE id = :id AND tenant_id = :tenant_id AND gym_id = :gym_id AND deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute([
            'id' => $productId,
            'tenant_id' => $tenantId,
            'gym_id' => $gymId
        ]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function decrementStock(int $tenantId, int $gymId, int $productId, float $qty): bool
    {
        $stmt = Database::connection()->prepare(
            'UPDATE pos_products
             SET stock_qty = stock_qty - :qty, updated_at = NOW()
             WHERE id = :id
               AND tenant_id = :tenant_id
               AND gym_id = :gym_id
               AND deleted_at IS NULL
               AND track_stock = 1
               AND stock_qty >= :qty'
        );
        $stmt->execute([
            'qty' => $qty,
            'id' => $productId,
            'tenant_id' => $tenantId,
            'gym_id' => $gymId
        ]);
        return $stmt->rowCount() > 0;
    }

    public function incrementStock(int $tenantId, int $gymId, int $productId, float $qty): bool
    {
        $stmt = Database::connection()->prepare(
            'UPDATE pos_products
             SET stock_qty = stock_qty + :qty, updated_at = NOW()
             WHERE id = :id
               AND tenant_id = :tenant_id
               AND gym_id = :gym_id
               AND deleted_at IS NULL
               AND track_stock = 1'
        );
        $stmt->execute([
            'qty' => $qty,
            'id' => $productId,
            'tenant_id' => $tenantId,
            'gym_id' => $gymId
        ]);
        return $stmt->rowCount() > 0;
    }

    public function setStock(int $tenantId, int $gymId, int $productId, float $newQty): bool
    {
        $stmt = Database::connection()->prepare(
            'UPDATE pos_products
             SET stock_qty = :stock_qty, updated_at = NOW()
             WHERE id = :id
               AND tenant_id = :tenant_id
               AND gym_id = :gym_id
               AND deleted_at IS NULL
               AND track_stock = 1'
        );
        $stmt->execute([
            'stock_qty' => $newQty,
            'id' => $productId,
            'tenant_id' => $tenantId,
            'gym_id' => $gymId
        ]);
        return $stmt->rowCount() > 0;
    }

    public function createStockMovement(array $data): int
    {
        $stmt = Database::connection()->prepare(
            'INSERT INTO pos_stock_movements
             (tenant_id, gym_id, product_id, movement_type, qty, balance_after, reference_type, reference_id, created_by_user_id, notes, created_at, updated_at)
             VALUES
             (:tenant_id, :gym_id, :product_id, :movement_type, :qty, :balance_after, :reference_type, :reference_id, :created_by_user_id, :notes, NOW(), NOW())'
        );
        $stmt->execute($data);
        return (int) Database::connection()->lastInsertId();
    }

    public function listStockMovements(int $tenantId, int $gymId, ?int $productId, int $page, int $perPage): array
    {
        $offset = ($page - 1) * $perPage;
        $where = 'm.tenant_id = :tenant_id AND m.gym_id = :gym_id';
        $params = ['tenant_id' => $tenantId, 'gym_id' => $gymId];
        if ($productId !== null && $productId > 0) {
            $where .= ' AND m.product_id = :product_id';
            $params['product_id'] = $productId;
        }

        $countStmt = Database::connection()->prepare("SELECT COUNT(*) FROM pos_stock_movements m WHERE {$where}");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $stmt = Database::connection()->prepare(
            "SELECT m.id, m.product_id, m.movement_type, m.qty, m.balance_after, m.reference_type, m.reference_id, m.notes, m.created_at,
                    p.code AS product_code, p.name AS product_name
             FROM pos_stock_movements m
             INNER JOIN pos_products p ON p.id = m.product_id
             WHERE {$where}
             ORDER BY m.id DESC
             LIMIT :limit OFFSET :offset"
        );
        foreach ($params as $k => $v) {
            $stmt->bindValue(':' . $k, $v);
        }
        $stmt->bindValue(':limit', $perPage, \PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        return [
            'items' => $stmt->fetchAll() ?: [],
            'meta' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'total_pages' => (int) max(1, ceil($total / $perPage))
            ]
        ];
    }

    public function listSales(int $tenantId, int $gymId, int $page, int $perPage): array
    {
        $offset = ($page - 1) * $perPage;
        $countStmt = Database::connection()->prepare(
            'SELECT COUNT(*) FROM pos_sales WHERE tenant_id = :tenant_id AND gym_id = :gym_id AND deleted_at IS NULL'
        );
        $countStmt->execute(['tenant_id' => $tenantId, 'gym_id' => $gymId]);
        $total = (int) $countStmt->fetchColumn();

        $stmt = Database::connection()->prepare(
            'SELECT s.id, s.member_id, s.total_amount, s.currency, s.charge_mode, s.payment_id, s.receipt_number, s.notes, s.created_at,
                    m.member_code, m.first_name, m.last_name
             FROM pos_sales s
             LEFT JOIN members m ON m.id = s.member_id
             WHERE s.tenant_id = :tenant_id AND s.gym_id = :gym_id AND s.deleted_at IS NULL
             ORDER BY s.id DESC
             LIMIT :limit OFFSET :offset'
        );
        $stmt->bindValue(':tenant_id', $tenantId, \PDO::PARAM_INT);
        $stmt->bindValue(':gym_id', $gymId, \PDO::PARAM_INT);
        $stmt->bindValue(':limit', $perPage, \PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        return [
            'items' => $stmt->fetchAll() ?: [],
            'meta' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'total_pages' => (int) max(1, ceil($total / $perPage)),
            ]
        ];
    }

    public function createSale(array $data): int
    {
        $stmt = Database::connection()->prepare(
            'INSERT INTO pos_sales (tenant_id, gym_id, member_id, sold_by_user_id, total_amount, currency, charge_mode, payment_id, notes, created_at, updated_at)
             VALUES (:tenant_id, :gym_id, :member_id, :sold_by_user_id, :total_amount, :currency, :charge_mode, :payment_id, :notes, NOW(), NOW())'
        );
        $stmt->execute($data);
        return (int) Database::connection()->lastInsertId();
    }

    public function reserveNextReceiptNumber(int $tenantId, int $gymId): int
    {
        $initStmt = Database::connection()->prepare(
            'INSERT INTO pos_receipt_sequences (tenant_id, gym_id, next_number, created_at, updated_at)
             VALUES (:tenant_id, :gym_id, 1, NOW(), NOW())
             ON DUPLICATE KEY UPDATE updated_at = updated_at'
        );
        $initStmt->execute([
            'tenant_id' => $tenantId,
            'gym_id' => $gymId
        ]);

        $selectStmt = Database::connection()->prepare(
            'SELECT next_number
             FROM pos_receipt_sequences
             WHERE tenant_id = :tenant_id AND gym_id = :gym_id
             FOR UPDATE'
        );
        $selectStmt->execute([
            'tenant_id' => $tenantId,
            'gym_id' => $gymId
        ]);
        $current = (int) $selectStmt->fetchColumn();
        if ($current <= 0) {
            throw new \RuntimeException('Invalid receipt sequence state');
        }

        $updateStmt = Database::connection()->prepare(
            'UPDATE pos_receipt_sequences
             SET next_number = :next_number, updated_at = NOW()
             WHERE tenant_id = :tenant_id AND gym_id = :gym_id'
        );
        $updateStmt->execute([
            'next_number' => $current + 1,
            'tenant_id' => $tenantId,
            'gym_id' => $gymId
        ]);

        return $current;
    }

    public function setSaleReceiptNumber(int $tenantId, int $gymId, int $saleId, string $receiptNumber): void
    {
        $stmt = Database::connection()->prepare(
            'UPDATE pos_sales
             SET receipt_number = :receipt_number, updated_at = NOW()
             WHERE id = :id AND tenant_id = :tenant_id AND gym_id = :gym_id'
        );
        $stmt->execute([
            'receipt_number' => $receiptNumber,
            'id' => $saleId,
            'tenant_id' => $tenantId,
            'gym_id' => $gymId
        ]);
    }

    public function createSaleItem(array $data): void
    {
        $stmt = Database::connection()->prepare(
            'INSERT INTO pos_sale_items (sale_id, tenant_id, gym_id, product_id, item_name, qty, unit_price, line_total, created_at, updated_at)
             VALUES (:sale_id, :tenant_id, :gym_id, :product_id, :item_name, :qty, :unit_price, :line_total, NOW(), NOW())'
        );
        $stmt->execute($data);
    }

    public function createMemberAccountCharge(array $data): int
    {
        $stmt = Database::connection()->prepare(
            'INSERT INTO member_account_charges (tenant_id, gym_id, member_id, sale_id, amount, currency, status, due_date, notes, created_at, updated_at)
             VALUES (:tenant_id, :gym_id, :member_id, :sale_id, :amount, :currency, "pending_auto_debit", :due_date, :notes, NOW(), NOW())'
        );
        $stmt->execute($data);
        return (int) Database::connection()->lastInsertId();
    }

    public function listMemberAccountCharges(int $tenantId, int $gymId, string $status, int $page, int $perPage): array
    {
        $offset = ($page - 1) * $perPage;
        $where = 'c.tenant_id = :tenant_id AND c.gym_id = :gym_id';
        $params = ['tenant_id' => $tenantId, 'gym_id' => $gymId];
        if ($status !== '') {
            $where .= ' AND c.status = :status';
            $params['status'] = $status;
        }

        $countStmt = Database::connection()->prepare("SELECT COUNT(*) FROM member_account_charges c WHERE {$where}");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $stmt = Database::connection()->prepare(
            "SELECT c.id, c.member_id, c.sale_id, c.amount, c.currency, c.status, c.due_date, c.notes, c.created_at,
                    m.member_code, m.first_name, m.last_name
             FROM member_account_charges c
             INNER JOIN members m ON m.id = c.member_id
             WHERE {$where}
             ORDER BY c.id DESC
             LIMIT :limit OFFSET :offset"
        );
        foreach ($params as $k => $v) {
            $stmt->bindValue(':' . $k, $v);
        }
        $stmt->bindValue(':limit', $perPage, \PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, \PDO::PARAM_INT);
        $stmt->execute();

        return [
            'items' => $stmt->fetchAll() ?: [],
            'meta' => [
                'page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'total_pages' => (int) max(1, ceil($total / $perPage))
            ]
        ];
    }

    public function findPendingChargeById(int $tenantId, int $gymId, int $chargeId): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT id, member_id, amount, currency, status
             FROM member_account_charges
             WHERE id = :id AND tenant_id = :tenant_id AND gym_id = :gym_id
             LIMIT 1'
        );
        $stmt->execute(['id' => $chargeId, 'tenant_id' => $tenantId, 'gym_id' => $gymId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function createPayment(array $data): int
    {
        $stmt = Database::connection()->prepare(
            'INSERT INTO payments (tenant_id, gym_id, member_id, membership_id, received_by_user_id, amount, currency, method, status, paid_at, external_reference, notes, created_at, updated_at)
             VALUES (:tenant_id, :gym_id, :member_id, NULL, :received_by_user_id, :amount, :currency, :method, "paid", :paid_at, NULL, :notes, NOW(), NOW())'
        );
        $stmt->execute($data);
        return (int) Database::connection()->lastInsertId();
    }

    public function settleMemberAccountCharge(int $tenantId, int $gymId, int $chargeId, int $paymentId): bool
    {
        $stmt = Database::connection()->prepare(
            'UPDATE member_account_charges
             SET status = "settled", settled_payment_id = :payment_id, updated_at = NOW()
             WHERE id = :id AND tenant_id = :tenant_id AND gym_id = :gym_id AND status = "pending_auto_debit"'
        );
        $stmt->execute([
            'payment_id' => $paymentId,
            'id' => $chargeId,
            'tenant_id' => $tenantId,
            'gym_id' => $gymId
        ]);
        return $stmt->rowCount() > 0;
    }

    public function updateSalePayment(int $tenantId, int $gymId, int $saleId, int $paymentId): void
    {
        $stmt = Database::connection()->prepare(
            'UPDATE pos_sales SET payment_id = :payment_id, updated_at = NOW()
             WHERE id = :id AND tenant_id = :tenant_id AND gym_id = :gym_id'
        );
        $stmt->execute([
            'payment_id' => $paymentId,
            'id' => $saleId,
            'tenant_id' => $tenantId,
            'gym_id' => $gymId
        ]);
    }
}
