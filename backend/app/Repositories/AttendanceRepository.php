<?php

namespace App\Repositories;

use Core\Database;
use PDO;

final class AttendanceRepository
{
    public function list(int $tenantId, int $gymId, ?string $date, int $page, int $perPage): array
    {
        $offset = ($page - 1) * $perPage;
        $where = 'a.tenant_id = :tenant_id AND a.gym_id = :gym_id AND a.deleted_at IS NULL';
        $params = ['tenant_id' => $tenantId, 'gym_id' => $gymId];

        if ($date) {
            $where .= ' AND DATE(a.check_in_at) = :date';
            $params['date'] = $date;
        }

        $countStmt = Database::connection()->prepare("SELECT COUNT(*) FROM attendance_logs a WHERE {$where}");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $sql = "SELECT a.id, a.member_id, a.check_in_at, a.check_out_at, a.access_granted, a.source, a.notes,
                       m.member_code, m.first_name, m.last_name
                FROM attendance_logs a
                INNER JOIN members m ON m.id = a.member_id
                                    AND m.tenant_id = a.tenant_id
                                    AND m.gym_id = a.gym_id
                                    AND m.deleted_at IS NULL
                WHERE {$where}
                ORDER BY a.id DESC
                LIMIT :limit OFFSET :offset";

        $stmt = Database::connection()->prepare($sql);
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

    public function findMemberByCode(int $tenantId, int $gymId, string $memberCode): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT id, status, member_code, first_name, last_name
             FROM members
             WHERE tenant_id = :tenant_id AND gym_id = :gym_id AND member_code = :member_code AND deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute(['tenant_id' => $tenantId, 'gym_id' => $gymId, 'member_code' => $memberCode]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function hasActiveMembership(int $tenantId, int $gymId, int $memberId): bool
    {
        $stmt = Database::connection()->prepare(
            'SELECT id
             FROM memberships
             WHERE tenant_id = :tenant_id
               AND gym_id = :gym_id
               AND member_id = :member_id
               AND status = "active"
               AND start_date <= CURRENT_DATE()
               AND end_date >= CURRENT_DATE()
               AND deleted_at IS NULL
             ORDER BY end_date DESC
             LIMIT 1'
        );
        $stmt->execute([
            'tenant_id' => $tenantId,
            'gym_id' => $gymId,
            'member_id' => $memberId
        ]);

        return (bool) $stmt->fetch();
    }

    public function findOpenAttendance(int $tenantId, int $gymId, int $memberId): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT id, check_in_at
             FROM attendance_logs
             WHERE tenant_id = :tenant_id AND gym_id = :gym_id AND member_id = :member_id
               AND access_granted = 1
               AND check_out_at IS NULL
               AND deleted_at IS NULL
             ORDER BY id DESC
             LIMIT 1'
        );
        $stmt->execute(['tenant_id' => $tenantId, 'gym_id' => $gymId, 'member_id' => $memberId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function createCheckIn(array $data): int
    {
        $stmt = Database::connection()->prepare(
            'INSERT INTO attendance_logs (tenant_id, gym_id, member_id, check_in_at, check_out_at, access_granted, source, notes, created_at, updated_at)
             VALUES (:tenant_id, :gym_id, :member_id, NOW(), :check_out_at, :access_granted, :source, :notes, NOW(), NOW())'
        );
        $stmt->execute($data);
        return (int) Database::connection()->lastInsertId();
    }

    public function closeAttendance(int $tenantId, int $gymId, int $attendanceId): bool
    {
        $stmt = Database::connection()->prepare(
            'UPDATE attendance_logs
             SET check_out_at = NOW(), updated_at = NOW()
             WHERE id = :id AND tenant_id = :tenant_id AND gym_id = :gym_id AND check_out_at IS NULL AND deleted_at IS NULL'
        );
        $stmt->execute(['id' => $attendanceId, 'tenant_id' => $tenantId, 'gym_id' => $gymId]);
        return $stmt->rowCount() > 0;
    }

    public function lockMemberForAttendance(int $tenantId, int $gymId, int $memberId): void
    {
        $stmt = Database::connection()->prepare(
            'SELECT id
             FROM members
             WHERE id = :id AND tenant_id = :tenant_id AND gym_id = :gym_id
             FOR UPDATE'
        );
        $stmt->execute(['id' => $memberId, 'tenant_id' => $tenantId, 'gym_id' => $gymId]);
    }
}
