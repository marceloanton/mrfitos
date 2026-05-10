<?php

namespace App\Controllers;

use App\Services\AdminSubscriptionService;
use Core\Request;
use Core\Response;

final class AdminSubscriptionController
{
    public function __construct(private readonly AdminSubscriptionService $service = new AdminSubscriptionService())
    {
    }

    public function showTenantSubscription(): void
    {
        $tenantId = (int) Request::param('tenant_id', 0);
        if ($tenantId <= 0) {
            Response::json(['success' => false, 'message' => 'tenant_id must be a positive integer'], 422);
        }

        try {
            $data = $this->service->getTenantSubscriptionOverview($tenantId);
            Response::json([
                'success' => true,
                'message' => 'Tenant subscription fetched',
                'data' => $data
            ]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 404);
        }
    }

    public function updateTenantSubscription(): void
    {
        $tenantId = (int) Request::param('tenant_id', 0);
        if ($tenantId <= 0) {
            Response::json(['success' => false, 'message' => 'tenant_id must be a positive integer'], 422);
        }

        $payload = Request::json();
        $planCode = strtolower(trim((string) ($payload['plan_code'] ?? '')));
        if ($planCode === '') {
            Response::json(['success' => false, 'message' => 'plan_code is required'], 422);
        }

        try {
            $data = $this->service->updateTenantPlan($tenantId, $planCode);
            Response::json([
                'success' => true,
                'message' => 'Tenant subscription updated',
                'data' => $data
            ]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 404);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to update tenant subscription'], 500);
        }
    }

    public function startTrial(): void
    {
        $tenantId = (int) Request::param('tenant_id', 0);
        if ($tenantId <= 0) {
            Response::json(['success' => false, 'message' => 'tenant_id must be a positive integer'], 422);
        }

        try {
            $data = $this->service->startTenantTrial($tenantId);
            Response::json([
                'success' => true,
                'message' => 'Tenant trial started',
                'data' => $data
            ]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 404);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to start tenant trial'], 500);
        }
    }

    public function processExpiredTrials(): void
    {
        try {
            $data = $this->service->processExpiredTrials();
            Response::json([
                'success' => true,
                'message' => 'Expired trials processed',
                'data' => $data
            ]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 404);
        } catch (\Throwable $e) {
            Response::json(['success' => false, 'message' => 'Failed to process expired trials'], 500);
        }
    }
}
