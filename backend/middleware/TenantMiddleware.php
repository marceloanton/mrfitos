<?php

namespace Middleware;

use Core\Request;
use Core\Response;

final class TenantMiddleware
{
    public function handle(): void
    {
        $authUserRaw = $_SERVER['auth_user'] ?? null;
        $authUser = $authUserRaw ? json_decode($authUserRaw, true) : null;

        $tenantHeader = Request::header('X-Tenant-Id');
        $gymHeader = Request::header('X-Gym-Id');

        if (!$authUser || !$tenantHeader || !$gymHeader) {
            Response::json(['success' => false, 'message' => 'Tenant context required'], 403);
        }

        if ((int) $authUser['tenant_id'] !== (int) $tenantHeader || (int) $authUser['gym_id'] !== (int) $gymHeader) {
            Response::json(['success' => false, 'message' => 'Tenant isolation violation'], 403);
        }
    }
}
