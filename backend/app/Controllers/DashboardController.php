<?php

namespace App\Controllers;

use App\Services\DashboardService;
use Core\Response;

final class DashboardController
{
    public function __construct(private readonly DashboardService $service = new DashboardService())
    {
    }

    public function metrics(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        if (!isset($auth['tenant_id'], $auth['gym_id'])) {
            Response::json(['success' => false, 'message' => 'Unauthorized context'], 401);
        }

        $data = $this->service->metrics((int) $auth['tenant_id'], (int) $auth['gym_id']);
        Response::json(['success' => true, 'data' => $data]);
    }
}
