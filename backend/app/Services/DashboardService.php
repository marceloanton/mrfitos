<?php

namespace App\Services;

use App\Repositories\DashboardRepository;

final class DashboardService
{
    public function __construct(
        private readonly DashboardRepository $repo = new DashboardRepository(),
        private readonly AdminSubscriptionService $subscriptionService = new AdminSubscriptionService()
    )
    {
    }

    public function metrics(int $tenantId, int $gymId): array
    {
        $metrics = $this->repo->metrics($tenantId, $gymId);
        $subscription = $this->subscriptionService->getTenantSubscriptionOverview($tenantId);
        $limits = is_array($subscription['limits'] ?? null) ? $subscription['limits'] : [];
        $usage = is_array($subscription['usage'] ?? null) ? $subscription['usage'] : [];

        $limitsHealth = $this->buildLimitsHealth($limits, $usage);
        $metrics['subscription'] = [
            'plan_code' => (string) ($subscription['plan']['code'] ?? 'free'),
            'plan_name' => (string) ($subscription['plan']['name'] ?? 'Free'),
            'status' => (string) ($subscription['status'] ?? 'active'),
            'limits_health' => $limitsHealth
        ];

        return $metrics;
    }

    private function buildLimitsHealth(array $limits, array $usage): array
    {
        $map = [
            ['limit' => 'max_members', 'usage' => 'active_members', 'label' => 'Members'],
            ['limit' => 'max_staff_users', 'usage' => 'active_staff_users', 'label' => 'Staff users'],
            ['limit' => 'max_gyms', 'usage' => 'active_gyms', 'label' => 'Gyms'],
            ['limit' => 'max_monthly_payments', 'usage' => 'monthly_payments', 'label' => 'Monthly payments'],
            ['limit' => 'max_monthly_checkins', 'usage' => 'monthly_checkins', 'label' => 'Monthly check-ins']
        ];

        $items = [];
        $maxPercent = 0;
        foreach ($map as $entry) {
            $limit = (int) ($limits[$entry['limit']] ?? 0);
            if ($limit <= 0) {
                continue;
            }
            $current = (int) ($usage[$entry['usage']] ?? 0);
            $percent = (int) min(100, round(($current / $limit) * 100));
            $maxPercent = max($maxPercent, $percent);
            $items[] = [
                'label' => $entry['label'],
                'current' => $current,
                'limit' => $limit,
                'percent' => $percent
            ];
        }

        $risk = 'low';
        if ($maxPercent >= 90) {
            $risk = 'high';
        } elseif ($maxPercent >= 70) {
            $risk = 'medium';
        }

        return [
            'max_percent' => $maxPercent,
            'risk' => $risk,
            'items' => $items
        ];
    }
}
