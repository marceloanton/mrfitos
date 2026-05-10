<?php

namespace App\Services;

use App\Repositories\AdminSubscriptionRepository;
use Core\Database;

final class AdminSubscriptionService
{
    public function __construct(private readonly AdminSubscriptionRepository $repo = new AdminSubscriptionRepository())
    {
    }

    public function getTenantSubscriptionOverview(int $tenantId): array
    {
        if (!$this->repo->tenantExists($tenantId)) {
            throw new \InvalidArgumentException('Tenant not found');
        }

        $active = $this->repo->findActiveSubscriptionByTenant($tenantId);
        $features = json_decode((string) ($active['features'] ?? '[]'), true);
        $limits = json_decode((string) ($active['limits_json'] ?? '[]'), true);

        return [
            'tenant_id' => $tenantId,
            'plan' => [
                'code' => (string) ($active['plan_code'] ?? ''),
                'name' => (string) ($active['plan_name'] ?? '')
            ],
            'features' => is_array($features) ? $features : [],
            'limits' => is_array($limits) ? $limits : [],
            'usage' => [
                'active_members' => $this->repo->countActiveMembers($tenantId),
                'active_gyms' => $this->repo->countActiveGyms($tenantId),
                'active_staff_users' => $this->repo->countActiveStaffUsers($tenantId),
                'monthly_payments' => $this->repo->countMonthlyPayments($tenantId),
                'monthly_checkins' => $this->repo->countMonthlyAttendanceCheckins($tenantId)
            ]
        ];
    }

    public function updateTenantPlan(int $tenantId, string $planCode): array
    {
        if (!$this->repo->tenantExists($tenantId)) {
            throw new \InvalidArgumentException('Tenant not found');
        }

        $plan = $this->repo->findPlanByCode($planCode);
        if (!$plan) {
            throw new \InvalidArgumentException('Plan not found or inactive');
        }

        $now = date('Y-m-d H:i:s');
        $conn = Database::connection();
        $conn->beginTransaction();
        try {
            $this->repo->deactivateActiveSubscriptions($tenantId, $now);
            $this->repo->createSubscription($tenantId, (int) $plan['id'], $now);
            $conn->commit();
        } catch (\Throwable $e) {
            if ($conn->inTransaction()) {
                $conn->rollBack();
            }
            throw $e;
        }

        return $this->getTenantSubscriptionOverview($tenantId);
    }

    public function startTenantTrial(int $tenantId): array
    {
        if (!$this->repo->tenantExists($tenantId)) {
            throw new \InvalidArgumentException('Tenant not found');
        }

        $proPlan = $this->repo->findPlanByCode('pro');
        if (!$proPlan) {
            throw new \InvalidArgumentException('Pro plan not found or inactive');
        }

        $now = date('Y-m-d H:i:s');
        $trialEndsAt = date('Y-m-d H:i:s', strtotime('+14 days'));

        $conn = Database::connection();
        $conn->beginTransaction();
        try {
            $this->repo->deactivateRunningSubscriptions($tenantId, $now);
            $this->repo->createTrialSubscription($tenantId, (int) $proPlan['id'], $now, $trialEndsAt);
            $conn->commit();
        } catch (\Throwable $e) {
            if ($conn->inTransaction()) {
                $conn->rollBack();
            }
            throw $e;
        }

        return $this->getTenantSubscriptionOverview($tenantId);
    }

    public function processExpiredTrials(): array
    {
        $freePlan = $this->repo->findPlanByCode('free');
        if (!$freePlan) {
            throw new \InvalidArgumentException('Free plan not found or inactive');
        }

        $now = date('Y-m-d H:i:s');
        $processed = 0;
        $downgraded = 0;
        $expiredTrials = $this->repo->findExpiredTrials();

        $conn = Database::connection();
        $conn->beginTransaction();
        try {
            foreach ($expiredTrials as $trial) {
                $subscriptionId = (int) ($trial['id'] ?? 0);
                $tenantId = (int) ($trial['tenant_id'] ?? 0);
                if ($subscriptionId <= 0 || $tenantId <= 0) {
                    continue;
                }

                $this->repo->closeSubscriptionById($subscriptionId, $now);
                $processed++;

                if (!$this->repo->hasRunningSubscription($tenantId)) {
                    $this->repo->createSubscription($tenantId, (int) $freePlan['id'], $now);
                    $downgraded++;
                }
            }
            $conn->commit();
        } catch (\Throwable $e) {
            if ($conn->inTransaction()) {
                $conn->rollBack();
            }
            throw $e;
        }

        return [
            'processed_trials' => $processed,
            'downgraded_to_free' => $downgraded
        ];
    }
}
