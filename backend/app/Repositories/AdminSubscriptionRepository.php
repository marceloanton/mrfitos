<?php

namespace App\Repositories;

use Core\Database;

final class AdminSubscriptionRepository
{
    public function tenantExists(int $tenantId): bool
    {
        $stmt = Database::connection()->prepare(
            'SELECT id FROM tenants WHERE id = :tenant_id AND deleted_at IS NULL LIMIT 1'
        );
        $stmt->execute(['tenant_id' => $tenantId]);
        return (bool) $stmt->fetchColumn();
    }

    public function findActiveSubscriptionByTenant(int $tenantId): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT ts.id, ts.tenant_id, ts.plan_id, ts.status, ts.started_at, ts.ends_at,
                    sp.code AS plan_code, sp.name AS plan_name, sp.features, sp.limits_json
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

    public function findPlanByCode(string $planCode): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT id, code, name, features, limits_json
             FROM subscription_plans
             WHERE code = :code AND is_active = 1
             LIMIT 1'
        );
        $stmt->execute(['code' => $planCode]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function countActiveMembers(int $tenantId): int
    {
        $stmt = Database::connection()->prepare(
            'SELECT COUNT(*) FROM members WHERE tenant_id = :tenant_id AND status = "active" AND deleted_at IS NULL'
        );
        $stmt->execute(['tenant_id' => $tenantId]);
        return (int) $stmt->fetchColumn();
    }

    public function countActiveGyms(int $tenantId): int
    {
        $stmt = Database::connection()->prepare(
            'SELECT COUNT(*) FROM gyms WHERE tenant_id = :tenant_id AND status = "active" AND deleted_at IS NULL'
        );
        $stmt->execute(['tenant_id' => $tenantId]);
        return (int) $stmt->fetchColumn();
    }

    public function countActiveStaffUsers(int $tenantId): int
    {
        $stmt = Database::connection()->prepare(
            'SELECT COUNT(*) FROM users WHERE tenant_id = :tenant_id AND status = "active" AND deleted_at IS NULL'
        );
        $stmt->execute(['tenant_id' => $tenantId]);
        return (int) $stmt->fetchColumn();
    }

    public function countMonthlyPayments(int $tenantId): int
    {
        $stmt = Database::connection()->prepare(
            'SELECT COUNT(*)
             FROM payments
             WHERE tenant_id = :tenant_id
               AND deleted_at IS NULL
               AND YEAR(created_at) = YEAR(CURRENT_DATE())
               AND MONTH(created_at) = MONTH(CURRENT_DATE())'
        );
        $stmt->execute(['tenant_id' => $tenantId]);
        return (int) $stmt->fetchColumn();
    }

    public function countMonthlyAttendanceCheckins(int $tenantId): int
    {
        $stmt = Database::connection()->prepare(
            'SELECT COUNT(*)
             FROM attendance_logs
             WHERE tenant_id = :tenant_id
               AND deleted_at IS NULL
               AND access_granted = 1
               AND YEAR(check_in_at) = YEAR(CURRENT_DATE())
               AND MONTH(check_in_at) = MONTH(CURRENT_DATE())'
        );
        $stmt->execute(['tenant_id' => $tenantId]);
        return (int) $stmt->fetchColumn();
    }

    public function countMonthlyPosSales(int $tenantId): int
    {
        $stmt = Database::connection()->prepare(
            'SELECT COUNT(*)
             FROM pos_sales
             WHERE tenant_id = :tenant_id
               AND deleted_at IS NULL
               AND YEAR(created_at) = YEAR(CURRENT_DATE())
               AND MONTH(created_at) = MONTH(CURRENT_DATE())'
        );
        $stmt->execute(['tenant_id' => $tenantId]);
        return (int) $stmt->fetchColumn();
    }

    public function countMonthlyWhatsAppMessages(int $tenantId): int
    {
        $stmt = Database::connection()->prepare(
            'SELECT COUNT(*)
             FROM whatsapp_batch_items
             WHERE tenant_id = :tenant_id
               AND YEAR(created_at) = YEAR(CURRENT_DATE())
               AND MONTH(created_at) = MONTH(CURRENT_DATE())'
        );
        $stmt->execute(['tenant_id' => $tenantId]);
        return (int) $stmt->fetchColumn();
    }

    public function countMonthlyReportsQueries(int $tenantId): int
    {
        $stmt = Database::connection()->prepare(
            'SELECT COUNT(*)
             FROM activity_logs
             WHERE tenant_id = :tenant_id
               AND action = "reports_renewals_query"
               AND YEAR(created_at) = YEAR(CURRENT_DATE())
               AND MONTH(created_at) = MONTH(CURRENT_DATE())'
        );
        $stmt->execute(['tenant_id' => $tenantId]);
        return (int) $stmt->fetchColumn();
    }

    public function deactivateActiveSubscriptions(int $tenantId, string $endedAt): void
    {
        $stmt = Database::connection()->prepare(
            'UPDATE tenant_subscriptions
             SET status = "cancelled", ends_at = :ended_at, updated_at = NOW()
             WHERE tenant_id = :tenant_id
               AND status = "active"
               AND (ends_at IS NULL OR ends_at > :ended_at)'
        );
        $stmt->execute([
            'tenant_id' => $tenantId,
            'ended_at' => $endedAt
        ]);
    }

    public function createSubscription(int $tenantId, int $planId, string $startedAt): void
    {
        $stmt = Database::connection()->prepare(
            'INSERT INTO tenant_subscriptions (tenant_id, plan_id, status, started_at, ends_at, created_at, updated_at)
             VALUES (:tenant_id, :plan_id, "active", :started_at, NULL, NOW(), NOW())'
        );
        $stmt->execute([
            'tenant_id' => $tenantId,
            'plan_id' => $planId,
            'started_at' => $startedAt
        ]);
    }

    public function createTrialSubscription(int $tenantId, int $planId, string $startedAt, string $endsAt): void
    {
        $stmt = Database::connection()->prepare(
            'INSERT INTO tenant_subscriptions (tenant_id, plan_id, status, started_at, ends_at, created_at, updated_at)
             VALUES (:tenant_id, :plan_id, "trial", :started_at, :ends_at, NOW(), NOW())'
        );
        $stmt->execute([
            'tenant_id' => $tenantId,
            'plan_id' => $planId,
            'started_at' => $startedAt,
            'ends_at' => $endsAt
        ]);
    }

    public function deactivateRunningSubscriptions(int $tenantId, string $endedAt): void
    {
        $stmt = Database::connection()->prepare(
            'UPDATE tenant_subscriptions
             SET status = "cancelled", ends_at = :ended_at, updated_at = NOW()
             WHERE tenant_id = :tenant_id
               AND status IN ("active", "trial")
               AND (ends_at IS NULL OR ends_at > :ended_at)'
        );
        $stmt->execute([
            'tenant_id' => $tenantId,
            'ended_at' => $endedAt
        ]);
    }

    public function findExpiredTrials(): array
    {
        $stmt = Database::connection()->query(
            'SELECT id, tenant_id
             FROM tenant_subscriptions
             WHERE status = "trial"
               AND ends_at IS NOT NULL
               AND ends_at < NOW()'
        );
        return $stmt->fetchAll() ?: [];
    }

    public function closeSubscriptionById(int $subscriptionId, string $endedAt): void
    {
        $stmt = Database::connection()->prepare(
            'UPDATE tenant_subscriptions
             SET status = "cancelled", ends_at = :ended_at, updated_at = NOW()
             WHERE id = :id'
        );
        $stmt->execute([
            'id' => $subscriptionId,
            'ended_at' => $endedAt
        ]);
    }

    public function hasRunningSubscription(int $tenantId): bool
    {
        $stmt = Database::connection()->prepare(
            'SELECT id
             FROM tenant_subscriptions
             WHERE tenant_id = :tenant_id
               AND status IN ("active", "trial")
               AND (ends_at IS NULL OR ends_at >= NOW())
             LIMIT 1'
        );
        $stmt->execute(['tenant_id' => $tenantId]);
        return (bool) $stmt->fetchColumn();
    }
}
