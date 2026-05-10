<?php

namespace Middleware;

use App\Services\SubscriptionService;
use Core\Response;

final class FeatureGateMiddleware
{
    public function __construct(private readonly string $feature)
    {
    }

    public function handle(): void
    {
        $authUserRaw = $_SERVER['auth_user'] ?? null;
        $authUser = $authUserRaw ? json_decode($authUserRaw, true) : null;
        $tenantId = (int) ($authUser['tenant_id'] ?? 0);
        if ($tenantId <= 0) {
            Response::json(['success' => false, 'message' => 'Unauthorized context'], 401);
        }

        $service = new SubscriptionService();
        if (!$service->canUseFeature($tenantId, $this->feature)) {
            Response::json(['success' => false, 'message' => 'Feature unavailable in current plan'], 402);
        }
    }
}
