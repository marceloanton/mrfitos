<?php

namespace App\Repositories;

use Core\Database;

final class ReminderRepository
{
    public function expiringMemberships(int $tenantId, int $gymId, int $daysAhead): array
    {
        $stmt = Database::connection()->prepare(
            'SELECT m.id AS member_id, m.member_code, m.first_name, m.last_name, m.phone,
                    ms.id AS membership_id, ms.end_date, p.name AS plan_name
             FROM memberships ms
             INNER JOIN members m ON m.id = ms.member_id
                                 AND m.tenant_id = ms.tenant_id
                                 AND m.gym_id = ms.gym_id
                                 AND m.deleted_at IS NULL
             INNER JOIN plans p ON p.id = ms.plan_id
                               AND p.tenant_id = ms.tenant_id
                               AND p.gym_id = ms.gym_id
                               AND p.deleted_at IS NULL
                               AND p.is_active = 1
             WHERE ms.tenant_id = :tenant_id
               AND ms.gym_id = :gym_id
               AND ms.deleted_at IS NULL
               AND ms.status = "active"
               AND ms.end_date BETWEEN CURRENT_DATE() AND DATE_ADD(CURRENT_DATE(), INTERVAL :days DAY)
             ORDER BY ms.end_date ASC, m.last_name ASC, m.first_name ASC'
        );

        $stmt->bindValue(':tenant_id', $tenantId, \PDO::PARAM_INT);
        $stmt->bindValue(':gym_id', $gymId, \PDO::PARAM_INT);
        $stmt->bindValue(':days', $daysAhead, \PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll() ?: [];
    }

    public function findMembershipsForReminders(int $tenantId, int $gymId, array $membershipIds): array
    {
        if ($membershipIds === []) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($membershipIds), '?'));
        $sql = 'SELECT m.id AS member_id, m.member_code, m.first_name, m.last_name, m.phone,
                       ms.id AS membership_id, ms.end_date, p.name AS plan_name
                FROM memberships ms
                INNER JOIN members m ON m.id = ms.member_id
                                    AND m.tenant_id = ms.tenant_id
                                    AND m.gym_id = ms.gym_id
                                    AND m.deleted_at IS NULL
                INNER JOIN plans p ON p.id = ms.plan_id
                                  AND p.tenant_id = ms.tenant_id
                                  AND p.gym_id = ms.gym_id
                                  AND p.deleted_at IS NULL
                                  AND p.is_active = 1
                WHERE ms.tenant_id = ?
                  AND ms.gym_id = ?
                  AND ms.deleted_at IS NULL
                  AND ms.id IN (' . $placeholders . ')';

        $stmt = Database::connection()->prepare($sql);
        $params = array_merge([$tenantId, $gymId], $membershipIds);
        $stmt->execute($params);
        return $stmt->fetchAll() ?: [];
    }
}
