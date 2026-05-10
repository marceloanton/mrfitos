<?php

namespace App\Repositories;

use Core\Database;
use PDO;

final class MembershipRepository
{
    public function list(int $tenantId, int $gymId, ?string $status, int $page, int $perPage): array
    {
        $offset = ($page - 1) * $perPage;
        $where = 'm.tenant_id = :tenant_id AND m.gym_id = :gym_id AND m.deleted_at IS NULL';
        $params = ['tenant_id' => $tenantId, 'gym_id' => $gymId];

        if ($status !== null && in_array($status, ['active', 'expired', 'cancelled', 'paused'], true)) {
            $where .= ' AND m.status = :status';
            $params['status'] = $status;
        }

        $countStmt = Database::connection()->prepare("SELECT COUNT(*) FROM memberships m WHERE {$where}");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $sql = "SELECT m.id, m.member_id, m.plan_id, m.start_date, m.end_date, m.status, m.auto_renew,
                       mb.first_name, mb.last_name, mb.member_code,
                       p.name AS plan_name, p.price, p.currency
                FROM memberships m
                INNER JOIN members mb ON mb.id = m.member_id
                INNER JOIN plans p ON p.id = m.plan_id
                WHERE {$where}
                ORDER BY m.id DESC
                LIMIT :limit OFFSET :offset";

        $stmt = Database::connection()->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue(':' . $key, $value);
        }
        $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
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
            'SELECT id, tenant_id, gym_id, member_id, plan_id, start_date, end_date, status, auto_renew, cancelled_at, created_at, updated_at
             FROM memberships
             WHERE id = :id AND tenant_id = :tenant_id AND gym_id = :gym_id AND deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute(['id' => $id, 'tenant_id' => $tenantId, 'gym_id' => $gymId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function create(array $data): int
    {
        $stmt = Database::connection()->prepare(
            'INSERT INTO memberships (tenant_id, gym_id, member_id, plan_id, start_date, end_date, status, auto_renew, created_at, updated_at)
             VALUES (:tenant_id, :gym_id, :member_id, :plan_id, :start_date, :end_date, :status, :auto_renew, NOW(), NOW())'
        );
        $stmt->execute($data);
        return (int) Database::connection()->lastInsertId();
    }

    public function update(int $tenantId, int $gymId, int $id, array $data): bool
    {
        $stmt = Database::connection()->prepare(
            'UPDATE memberships SET
                plan_id = :plan_id,
                start_date = :start_date,
                end_date = :end_date,
                status = :status,
                auto_renew = :auto_renew,
                cancelled_at = :cancelled_at,
                updated_at = NOW()
             WHERE id = :id AND tenant_id = :tenant_id AND gym_id = :gym_id AND deleted_at IS NULL'
        );

        $stmt->execute([
            'id' => $id,
            'tenant_id' => $tenantId,
            'gym_id' => $gymId,
            'plan_id' => $data['plan_id'],
            'start_date' => $data['start_date'],
            'end_date' => $data['end_date'],
            'status' => $data['status'],
            'auto_renew' => $data['auto_renew'],
            'cancelled_at' => $data['cancelled_at']
        ]);

        return $stmt->rowCount() > 0;
    }

    public function softDelete(int $tenantId, int $gymId, int $id): bool
    {
        $stmt = Database::connection()->prepare(
            'UPDATE memberships SET deleted_at = NOW(), updated_at = NOW()
             WHERE id = :id AND tenant_id = :tenant_id AND gym_id = :gym_id AND deleted_at IS NULL'
        );
        $stmt->execute(['id' => $id, 'tenant_id' => $tenantId, 'gym_id' => $gymId]);
        return $stmt->rowCount() > 0;
    }
}
