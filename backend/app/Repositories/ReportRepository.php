<?php

namespace App\Repositories;

use Core\Database;

final class ReportRepository
{
    public function renewalReport(int $tenantId, int $gymId, string $from, string $to): array
    {
        $sql = 'SELECT ms.id AS membership_id,
                       ms.end_date,
                       m.member_code,
                       m.first_name,
                       m.last_name,
                       m.phone,
                       p.name AS plan_name,
                       (
                         SELECT MAX(wbi.send_status)
                         FROM whatsapp_batch_items wbi
                         WHERE wbi.tenant_id = ms.tenant_id
                           AND wbi.gym_id = ms.gym_id
                           AND wbi.membership_id = ms.id
                       ) AS reminder_status
                FROM memberships ms
                INNER JOIN members m ON m.id = ms.member_id
                                    AND m.tenant_id = ms.tenant_id
                                    AND m.gym_id = ms.gym_id
                                    AND m.deleted_at IS NULL
                INNER JOIN plans p ON p.id = ms.plan_id
                                  AND p.tenant_id = ms.tenant_id
                                  AND p.gym_id = ms.gym_id
                                  AND p.deleted_at IS NULL
                WHERE ms.tenant_id = :tenant_id
                  AND ms.gym_id = :gym_id
                  AND ms.deleted_at IS NULL
                  AND ms.status = "active"
                  AND ms.end_date BETWEEN :from_date AND :to_date
                ORDER BY ms.end_date ASC, m.last_name ASC, m.first_name ASC';

        $stmt = Database::connection()->prepare($sql);
        $stmt->execute([
            'tenant_id' => $tenantId,
            'gym_id' => $gymId,
            'from_date' => $from,
            'to_date' => $to
        ]);

        return $stmt->fetchAll() ?: [];
    }
}
