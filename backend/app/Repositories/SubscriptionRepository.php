<?php

namespace App\Repositories;

use Core\Database;

final class SubscriptionRepository
{
    public function getActivePlanByTenant(int $tenantId): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT sp.code, sp.features, sp.limits_json, ts.status, ts.ends_at
             FROM tenant_subscriptions ts
             INNER JOIN subscription_plans sp ON sp.id = ts.plan_id
             WHERE ts.tenant_id = :tenant_id
               AND ts.status = "active"
               AND (ts.ends_at IS NULL OR ts.ends_at >= NOW())
             ORDER BY ts.id DESC
             LIMIT 1'
        );
        $stmt->execute(['tenant_id' => $tenantId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function countActiveMembers(int $tenantId, int $gymId): int
    {
        $stmt = Database::connection()->prepare(
            'SELECT COUNT(*)
             FROM members
             WHERE tenant_id = :tenant_id AND gym_id = :gym_id AND status = "active" AND deleted_at IS NULL'
        );
        $stmt->execute(['tenant_id' => $tenantId, 'gym_id' => $gymId]);
        return (int) $stmt->fetchColumn();
    }

    public function countActiveGyms(int $tenantId): int
    {
        $stmt = Database::connection()->prepare(
            'SELECT COUNT(*)
             FROM gyms
             WHERE tenant_id = :tenant_id AND status = "active" AND deleted_at IS NULL'
        );
        $stmt->execute(['tenant_id' => $tenantId]);
        return (int) $stmt->fetchColumn();
    }

    public function countActiveStaffUsers(int $tenantId): int
    {
        $stmt = Database::connection()->prepare(
            'SELECT COUNT(*)
             FROM users
             WHERE tenant_id = :tenant_id AND status = "active" AND deleted_at IS NULL'
        );
        $stmt->execute(['tenant_id' => $tenantId]);
        return (int) $stmt->fetchColumn();
    }

    public function countMonthlyPayments(int $tenantId, int $gymId): int
    {
        $stmt = Database::connection()->prepare(
            'SELECT COUNT(*)
             FROM payments
             WHERE tenant_id = :tenant_id
               AND gym_id = :gym_id
               AND deleted_at IS NULL
               AND YEAR(created_at) = YEAR(CURRENT_DATE())
               AND MONTH(created_at) = MONTH(CURRENT_DATE())'
        );
        $stmt->execute(['tenant_id' => $tenantId, 'gym_id' => $gymId]);
        return (int) $stmt->fetchColumn();
    }

    public function countMonthlyAttendanceCheckins(int $tenantId, int $gymId): int
    {
        $stmt = Database::connection()->prepare(
            'SELECT COUNT(*)
             FROM attendance_logs
             WHERE tenant_id = :tenant_id
               AND gym_id = :gym_id
               AND deleted_at IS NULL
               AND access_granted = 1
               AND YEAR(check_in_at) = YEAR(CURRENT_DATE())
               AND MONTH(check_in_at) = MONTH(CURRENT_DATE())'
        );
        $stmt->execute(['tenant_id' => $tenantId, 'gym_id' => $gymId]);
        return (int) $stmt->fetchColumn();
    }

    public function countMonthlyPosSales(int $tenantId, int $gymId): int
    {
        $stmt = Database::connection()->prepare(
            'SELECT COUNT(*)
             FROM pos_sales
             WHERE tenant_id = :tenant_id
               AND gym_id = :gym_id
               AND deleted_at IS NULL
               AND YEAR(created_at) = YEAR(CURRENT_DATE())
               AND MONTH(created_at) = MONTH(CURRENT_DATE())'
        );
        $stmt->execute(['tenant_id' => $tenantId, 'gym_id' => $gymId]);
        return (int) $stmt->fetchColumn();
    }

    public function countMonthlyWhatsAppMessages(int $tenantId, int $gymId): int
    {
        $stmt = Database::connection()->prepare(
            'SELECT COUNT(*)
             FROM whatsapp_batch_items
             WHERE tenant_id = :tenant_id
               AND gym_id = :gym_id
               AND YEAR(created_at) = YEAR(CURRENT_DATE())
               AND MONTH(created_at) = MONTH(CURRENT_DATE())'
        );
        $stmt->execute(['tenant_id' => $tenantId, 'gym_id' => $gymId]);
        return (int) $stmt->fetchColumn();
    }

    public function countMonthlyReportQueries(int $tenantId, int $gymId): int
    {
        $stmt = Database::connection()->prepare(
            'SELECT COUNT(*)
             FROM activity_logs
             WHERE tenant_id = :tenant_id
               AND gym_id = :gym_id
               AND action = "reports_renewals_query"
               AND YEAR(created_at) = YEAR(CURRENT_DATE())
               AND MONTH(created_at) = MONTH(CURRENT_DATE())'
        );
        $stmt->execute(['tenant_id' => $tenantId, 'gym_id' => $gymId]);
        return (int) $stmt->fetchColumn();
    }

    public function getActiveAddonFeaturesByTenant(int $tenantId): array
    {
        $stmt = Database::connection()->prepare(
            'SELECT am.features
             FROM tenant_addon_subscriptions tas
             INNER JOIN addon_modules am ON am.id = tas.addon_id
             WHERE tas.tenant_id = :tenant_id
               AND tas.status = "active"
               AND am.is_active = 1
               AND (tas.ends_at IS NULL OR tas.ends_at >= NOW())'
        );
        $stmt->execute(['tenant_id' => $tenantId]);
        $rows = $stmt->fetchAll();

        $merged = [];
        foreach ($rows as $row) {
            $features = json_decode((string) ($row['features'] ?? '[]'), true);
            if (!is_array($features)) {
                continue;
            }

            foreach ($features as $key => $value) {
                if (is_bool($value)) {
                    $merged[$key] = (bool) (($merged[$key] ?? false) || $value);
                    continue;
                }
                $merged[$key] = $value;
            }
        }

        return $merged;
    }
}
