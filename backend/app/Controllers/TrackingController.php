<?php

namespace App\Controllers;

use App\Services\TrackingService;
use Core\Request;
use Core\Response;

final class TrackingController
{
    public function __construct(private readonly TrackingService $service = new TrackingService())
    {
    }

    public function storeEvent(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        if (!isset($auth['tenant_id'], $auth['gym_id'], $auth['sub'])) {
            Response::json(['success' => false, 'message' => 'Unauthorized context'], 401);
        }

        try {
            $this->service->trackEvent(
                (int) $auth['tenant_id'],
                (int) $auth['gym_id'],
                (int) $auth['sub'],
                Request::json(),
                $_SERVER['REMOTE_ADDR'] ?? null,
                $_SERVER['HTTP_USER_AGENT'] ?? null
            );

            Response::json([
                'success' => true,
                'message' => 'Tracking event stored'
            ]);
        } catch (\InvalidArgumentException $e) {
            Response::json([
                'success' => false,
                'message' => $e->getMessage()
            ], 422);
        }
    }

    public function summary(): void
    {
        try {
            $data = $this->service->summary([
                'tenant_id' => Request::query('tenant_id'),
                'from' => Request::query('from'),
                'to' => Request::query('to'),
            ]);

            Response::json([
                'success' => true,
                'data' => $data
            ]);
        } catch (\InvalidArgumentException $e) {
            Response::json([
                'success' => false,
                'message' => $e->getMessage()
            ], 422);
        } catch (\Throwable $e) {
            Response::json([
                'success' => false,
                'message' => 'Failed to load tracking summary'
            ], 500);
        }
    }
}
