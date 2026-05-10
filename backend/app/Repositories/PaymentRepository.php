<?php

namespace App\Repositories;

use Core\Database;

final class PaymentRepository
{
    public function list(int $tenantId, int $gymId, ?string $method, int $page, int $perPage): array
    {
        $offset = ($page - 1) * $perPage;
        $where = 'p.tenant_id = :tenant_id AND p.gym_id = :gym_id AND p.deleted_at IS NULL';
        $params = ['tenant_id' => $tenantId, 'gym_id' => $gymId];

        if ($method !== null && in_array($method, ['cash', 'card', 'transfer', 'mercadopago', 'other'], true)) {
            $where .= ' AND p.method = :method';
            $params['method'] = $method;
        }

        $countStmt = Database::connection()->prepare("SELECT COUNT(*) FROM payments p WHERE {$where}");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $stmt = Database::connection()->prepare(
            "SELECT p.id, p.member_id, p.membership_id, p.amount, p.currency, p.method, p.status, p.paid_at, p.external_reference,
                    mb.first_name, mb.last_name, mb.member_code
             FROM payments p
             INNER JOIN members mb ON mb.id = p.member_id
             WHERE {$where}
             ORDER BY p.id DESC
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

    public function findById(int $tenantId, int $gymId, int $id): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT id, tenant_id, gym_id, member_id, membership_id, amount, currency, method, status, paid_at, external_reference, notes, created_at, updated_at
             FROM payments
             WHERE id = :id AND tenant_id = :tenant_id AND gym_id = :gym_id AND deleted_at IS NULL LIMIT 1'
        );
        $stmt->execute(['id' => $id, 'tenant_id' => $tenantId, 'gym_id' => $gymId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function create(array $data): int
    {
        $stmt = Database::connection()->prepare(
            'INSERT INTO payments (tenant_id, gym_id, member_id, membership_id, received_by_user_id, amount, currency, method, status, paid_at, external_reference, notes, created_at, updated_at)
             VALUES (:tenant_id, :gym_id, :member_id, :membership_id, :received_by_user_id, :amount, :currency, :method, :status, :paid_at, :external_reference, :notes, NOW(), NOW())'
        );
        $stmt->execute($data);
        return (int) Database::connection()->lastInsertId();
    }

    public function update(int $tenantId, int $gymId, int $id, array $data): bool
    {
        $stmt = Database::connection()->prepare(
            'UPDATE payments SET
                amount = :amount,
                currency = :currency,
                method = :method,
                status = :status,
                paid_at = :paid_at,
                external_reference = :external_reference,
                notes = :notes,
                updated_at = NOW()
             WHERE id = :id AND tenant_id = :tenant_id AND gym_id = :gym_id AND deleted_at IS NULL'
        );

        $stmt->execute([
            'id' => $id,
            'tenant_id' => $tenantId,
            'gym_id' => $gymId,
            'amount' => $data['amount'],
            'currency' => $data['currency'],
            'method' => $data['method'],
            'status' => $data['status'],
            'paid_at' => $data['paid_at'],
            'external_reference' => $data['external_reference'],
            'notes' => $data['notes']
        ]);

        return $stmt->rowCount() > 0;
    }

    public function softDelete(int $tenantId, int $gymId, int $id): bool
    {
        $stmt = Database::connection()->prepare(
            'UPDATE payments SET deleted_at = NOW(), updated_at = NOW()
             WHERE id = :id AND tenant_id = :tenant_id AND gym_id = :gym_id AND deleted_at IS NULL'
        );
        $stmt->execute(['id' => $id, 'tenant_id' => $tenantId, 'gym_id' => $gymId]);
        return $stmt->rowCount() > 0;
    }
}
