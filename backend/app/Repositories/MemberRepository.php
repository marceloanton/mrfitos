<?php

namespace App\Repositories;

use Core\Database;
use PDO;

final class MemberRepository
{
    public function list(int $tenantId, int $gymId, string $q, ?string $status, int $page, int $perPage): array
    {
        $offset = ($page - 1) * $perPage;
        $where = 'tenant_id = :tenant_id AND gym_id = :gym_id AND deleted_at IS NULL';
        $params = [
            'tenant_id' => $tenantId,
            'gym_id' => $gymId
        ];

        if ($q !== '') {
            $where .= ' AND (first_name LIKE :q OR last_name LIKE :q OR member_code LIKE :q OR email LIKE :q OR phone LIKE :q)';
            $params['q'] = '%' . $q . '%';
        }

        if ($status !== null && in_array($status, ['active', 'inactive', 'frozen'], true)) {
            $where .= ' AND status = :status';
            $params['status'] = $status;
        }

        $countStmt = Database::connection()->prepare("SELECT COUNT(*) FROM members WHERE {$where}");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $sql = "SELECT id, tenant_id, gym_id, member_code, first_name, last_name, email, phone, birth_date, emergency_contact, notes, status, created_at, updated_at
                FROM members
                WHERE {$where}
                ORDER BY id DESC
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

    public function findById(int $tenantId, int $gymId, int $memberId): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT id, tenant_id, gym_id, member_code, first_name, last_name, email, phone, birth_date, emergency_contact, notes, status, created_at, updated_at
             FROM members
             WHERE id = :id AND tenant_id = :tenant_id AND gym_id = :gym_id AND deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute([
            'id' => $memberId,
            'tenant_id' => $tenantId,
            'gym_id' => $gymId
        ]);

        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function create(array $data): int
    {
        $stmt = Database::connection()->prepare(
            'INSERT INTO members (
                tenant_id, gym_id, member_code, first_name, last_name, email, phone, birth_date, emergency_contact, notes, status, created_at, updated_at
            ) VALUES (
                :tenant_id, :gym_id, :member_code, :first_name, :last_name, :email, :phone, :birth_date, :emergency_contact, :notes, :status, NOW(), NOW()
            )'
        );

        $stmt->execute($data);
        return (int) Database::connection()->lastInsertId();
    }

    public function update(int $tenantId, int $gymId, int $memberId, array $data): bool
    {
        $stmt = Database::connection()->prepare(
            'UPDATE members SET
                first_name = :first_name,
                last_name = :last_name,
                email = :email,
                phone = :phone,
                birth_date = :birth_date,
                emergency_contact = :emergency_contact,
                notes = :notes,
                status = :status,
                updated_at = NOW()
             WHERE id = :id AND tenant_id = :tenant_id AND gym_id = :gym_id AND deleted_at IS NULL'
        );

        return $stmt->execute([
            'id' => $memberId,
            'tenant_id' => $tenantId,
            'gym_id' => $gymId,
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'email' => $data['email'],
            'phone' => $data['phone'],
            'birth_date' => $data['birth_date'],
            'emergency_contact' => $data['emergency_contact'],
            'notes' => $data['notes'],
            'status' => $data['status']
        ]);
    }

    public function softDelete(int $tenantId, int $gymId, int $memberId): bool
    {
        $stmt = Database::connection()->prepare(
            'UPDATE members SET deleted_at = NOW(), updated_at = NOW()
             WHERE id = :id AND tenant_id = :tenant_id AND gym_id = :gym_id AND deleted_at IS NULL'
        );

        return $stmt->execute([
            'id' => $memberId,
            'tenant_id' => $tenantId,
            'gym_id' => $gymId
        ]);
    }
}
