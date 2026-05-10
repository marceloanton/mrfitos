<?php

namespace App\Repositories;

use Core\Database;

final class DashboardRepository
{
    public function metrics(int $tenantId, int $gymId): array
    {
        $conn = Database::connection();

        $activeMembers = (int) $conn->prepare(
            'SELECT COUNT(*) FROM members
             WHERE tenant_id = :tenant_id AND gym_id = :gym_id AND status = "active" AND deleted_at IS NULL'
        )->execute(['tenant_id' => $tenantId, 'gym_id' => $gymId]);

        $stmt1 = $conn->prepare('SELECT COUNT(*) AS c FROM members WHERE tenant_id = :tenant_id AND gym_id = :gym_id AND status = "active" AND deleted_at IS NULL');
        $stmt1->execute(['tenant_id' => $tenantId, 'gym_id' => $gymId]);
        $activeMembers = (int) $stmt1->fetchColumn();

        $stmt2 = $conn->prepare('SELECT COUNT(*) AS c FROM memberships WHERE tenant_id = :tenant_id AND gym_id = :gym_id AND status = "active" AND end_date = CURRENT_DATE() AND deleted_at IS NULL');
        $stmt2->execute(['tenant_id' => $tenantId, 'gym_id' => $gymId]);
        $expiringToday = (int) $stmt2->fetchColumn();

        $stmt3 = $conn->prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE tenant_id = :tenant_id AND gym_id = :gym_id AND status = "paid" AND YEAR(paid_at) = YEAR(CURRENT_DATE()) AND MONTH(paid_at) = MONTH(CURRENT_DATE()) AND deleted_at IS NULL');
        $stmt3->execute(['tenant_id' => $tenantId, 'gym_id' => $gymId]);
        $revenueMonth = (float) $stmt3->fetchColumn();

        $stmt4 = $conn->prepare('SELECT COUNT(*) AS c FROM attendance_logs WHERE tenant_id = :tenant_id AND gym_id = :gym_id AND access_granted = 1 AND DATE(check_in_at) = CURRENT_DATE() AND deleted_at IS NULL');
        $stmt4->execute(['tenant_id' => $tenantId, 'gym_id' => $gymId]);
        $attendanceToday = (int) $stmt4->fetchColumn();

        return [
            'active_members' => $activeMembers,
            'expiring_today' => $expiringToday,
            'revenue_month' => $revenueMonth,
            'attendance_today' => $attendanceToday,
            'currency' => 'ARS'
        ];
    }
}
