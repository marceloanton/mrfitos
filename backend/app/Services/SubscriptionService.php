<?php

namespace App\Services;

use App\Repositories\SubscriptionRepository;

final class SubscriptionService
{
    public function __construct(private readonly SubscriptionRepository $repo = new SubscriptionRepository())
    {
    }

    public function getTenantEntitlements(int $tenantId): array
    {
        $plan = $this->repo->getActivePlanByTenant($tenantId);
        $addonFeatures = $this->repo->getActiveAddonFeaturesByTenant($tenantId);
        if (!$plan) {
            return [
                'plan_code' => 'free',
                'features' => $addonFeatures,
                'limits' => []
            ];
        }

        $features = json_decode((string) $plan['features'], true);
        $limits = json_decode((string) $plan['limits_json'], true);

        return [
            'plan_code' => (string) $plan['code'],
            'features' => $this->mergeFeatures(is_array($features) ? $features : [], $addonFeatures),
            'limits' => is_array($limits) ? $limits : []
        ];
    }

    public function canUseFeature(int $tenantId, string $feature): bool
    {
        $ent = $this->getTenantEntitlements($tenantId);
        return (bool) ($ent['features'][$feature] ?? false);
    }

    public function validateMemberCreationLimit(int $tenantId, int $gymId): bool
    {
        $ent = $this->getTenantEntitlements($tenantId);
        $maxMembers = (int) ($ent['limits']['max_members'] ?? 0);
        if ($maxMembers <= 0) {
            return true;
        }
        $current = $this->repo->countActiveMembers($tenantId, $gymId);
        return $current < $maxMembers;
    }

    public function validateStaffUsersLimit(int $tenantId): bool
    {
        $ent = $this->getTenantEntitlements($tenantId);
        $maxStaffUsers = (int) ($ent['limits']['max_staff_users'] ?? 0);
        if ($maxStaffUsers <= 0) {
            return true;
        }
        $current = $this->repo->countActiveStaffUsers($tenantId);
        return $current <= $maxStaffUsers;
    }

    public function validateGymCreationLimit(int $tenantId): bool
    {
        $ent = $this->getTenantEntitlements($tenantId);
        $maxGyms = (int) ($ent['limits']['max_gyms'] ?? 0);
        if ($maxGyms <= 0) {
            return true;
        }
        $current = $this->repo->countActiveGyms($tenantId);
        return $current < $maxGyms;
    }

    public function validateMonthlyPaymentsLimit(int $tenantId, int $gymId): bool
    {
        $ent = $this->getTenantEntitlements($tenantId);
        $maxMonthlyPayments = (int) ($ent['limits']['max_monthly_payments'] ?? 0);
        if ($maxMonthlyPayments <= 0) {
            return true;
        }
        $current = $this->repo->countMonthlyPayments($tenantId, $gymId);
        return $current < $maxMonthlyPayments;
    }

    public function validateMonthlyAttendanceCheckinsLimit(int $tenantId, int $gymId): bool
    {
        $ent = $this->getTenantEntitlements($tenantId);
        $maxMonthlyCheckins = (int) ($ent['limits']['max_monthly_checkins'] ?? 0);
        if ($maxMonthlyCheckins <= 0) {
            return true;
        }
        $current = $this->repo->countMonthlyAttendanceCheckins($tenantId, $gymId);
        return $current < $maxMonthlyCheckins;
    }

    public function validateMonthlyPosSalesLimit(int $tenantId, int $gymId): bool
    {
        $ent = $this->getTenantEntitlements($tenantId);
        $maxMonthlyPosSales = (int) ($ent['limits']['max_monthly_pos_sales'] ?? 0);
        if ($maxMonthlyPosSales <= 0) {
            return true;
        }
        $current = $this->repo->countMonthlyPosSales($tenantId, $gymId);
        return $current < $maxMonthlyPosSales;
    }

    public function validateMonthlyWhatsAppMessagesLimit(int $tenantId, int $gymId, int $requestedItems = 1): bool
    {
        $ent = $this->getTenantEntitlements($tenantId);
        $maxMonthlyMessages = (int) ($ent['limits']['max_monthly_whatsapp_messages'] ?? 0);
        if ($maxMonthlyMessages <= 0) {
            return true;
        }
        $requested = max(1, $requestedItems);
        $current = $this->repo->countMonthlyWhatsAppMessages($tenantId, $gymId);
        return ($current + $requested) <= $maxMonthlyMessages;
    }

    public function validateMonthlyReportsQueriesLimit(int $tenantId, int $gymId): bool
    {
        $ent = $this->getTenantEntitlements($tenantId);
        $maxMonthlyQueries = (int) ($ent['limits']['max_monthly_reports_queries'] ?? 0);
        if ($maxMonthlyQueries <= 0) {
            return true;
        }
        $current = $this->repo->countMonthlyReportQueries($tenantId, $gymId);
        return $current < $maxMonthlyQueries;
    }

    private function mergeFeatures(array $planFeatures, array $addonFeatures): array
    {
        $merged = $planFeatures;
        foreach ($addonFeatures as $key => $value) {
            if (is_bool($value)) {
                $merged[$key] = (bool) (($merged[$key] ?? false) || $value);
                continue;
            }
            $merged[$key] = $value;
        }
        return $merged;
    }
}
