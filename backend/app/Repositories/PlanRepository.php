<?php

namespace App\Repositories;

use Core\Database;
use PDO;

final class PlanRepository
{
    public function list(int $tenantId, int $gymId, string $q, ?int $isActive, int $page, int $perPage): array
    {
        $offset = ($page - 1) * $perPage;
        $where = 'tenant_id = :tenant_id AND gym_id = :gym_id AND deleted_at IS NULL';
        $params = ['tenant_id' => $tenantId, 'gym_id' => $gymId];

        if ($q !== '') {
            $where .= ' AND (name LIKE :q OR code LIKE :q)';
            $params['q'] = '%' . $q . '%';
        }

        if ($isActive !== null) {
            $where .= ' AND is_active = :is_active';
            $params['is_active'] = $isActive;
        }

        $countStmt = Database::connection()->prepare("SELECT COUNT(*) FROM plans WHERE {$where}");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $stmt = Database::connection()->prepare(
            "SELECT id, tenant_id, gym_id, name, code, description, duration_days, price, currency, billing_cycle, is_active, created_at, updated_at
             FROM plans
             WHERE {$where}
             ORDER BY id DESC
             LIMIT :limit OFFSET :offset"
        );
        foreach ($params as $k => $v) {
            $stmt->bindValue(':' . $k, $v);
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
            'SELECT id, tenant_id, gym_id, name, code, description, duration_days, price, currency, billing_cycle, is_active, created_at, updated_at
             FROM plans
             WHERE id = :id AND tenant_id = :tenant_id AND gym_id = :gym_id AND deleted_at IS NULL LIMIT 1'
        );
        $stmt->execute(['id' => $id, 'tenant_id' => $tenantId, 'gym_id' => $gymId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function create(array $data): int
    {
        $stmt = Database::connection()->prepare(
            'INSERT INTO plans (tenant_id, gym_id, name, code, description, duration_days, price, currency, billing_cycle, is_active, created_at, updated_at)
             VALUES (:tenant_id, :gym_id, :name, :code, :description, :duration_days, :price, :currency, :billing_cycle, :is_active, NOW(), NOW())'
        );
        $stmt->execute($data);
        return (int) Database::connection()->lastInsertId();
    }

    public function update(int $tenantId, int $gymId, int $id, array $data): bool
    {
        $stmt = Database::connection()->prepare(
            'UPDATE plans SET
                name = :name,
                description = :description,
                duration_days = :duration_days,
                price = :price,
                currency = :currency,
                billing_cycle = :billing_cycle,
                is_active = :is_active,
                updated_at = NOW()
             WHERE id = :id AND tenant_id = :tenant_id AND gym_id = :gym_id AND deleted_at IS NULL'
        );

        $stmt->execute([
            'id' => $id,
            'tenant_id' => $tenantId,
            'gym_id' => $gymId,
            'name' => $data['name'],
            'description' => $data['description'],
            'duration_days' => $data['duration_days'],
            'price' => $data['price'],
            'currency' => $data['currency'],
            'billing_cycle' => $data['billing_cycle'],
            'is_active' => $data['is_active']
        ]);

        return $stmt->rowCount() > 0;
    }

    public function softDelete(int $tenantId, int $gymId, int $id): bool
    {
        $stmt = Database::connection()->prepare(
            'UPDATE plans SET deleted_at = NOW(), updated_at = NOW()
             WHERE id = :id AND tenant_id = :tenant_id AND gym_id = :gym_id AND deleted_at IS NULL'
        );
        $stmt->execute(['id' => $id, 'tenant_id' => $tenantId, 'gym_id' => $gymId]);
        return $stmt->rowCount() > 0;
    }
}
