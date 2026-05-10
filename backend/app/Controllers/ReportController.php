<?php

namespace App\Controllers;

use App\Repositories\ActivityLogRepository;
use App\Services\ReportService;
use App\Services\SubscriptionService;
use Core\Request;
use Core\Response;

final class ReportController
{
    public function __construct(private readonly ReportService $service = new ReportService())
    {
    }

    public function renewals(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        if (!isset($auth['tenant_id'], $auth['gym_id'])) {
            Response::json(['success' => false, 'message' => 'Unauthorized context'], 401);
        }
        $subscription = new SubscriptionService();
        if (!$subscription->validateMonthlyReportsQueriesLimit((int) $auth['tenant_id'], (int) $auth['gym_id'])) {
            Response::json([
                'success' => false,
                'message' => 'Monthly reports queries limit reached for current plan. Upgrade required.'
            ], 402);
        }

        $from = (string) Request::query('from', date('Y-m-01'));
        $to = (string) Request::query('to', date('Y-m-t'));

        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $from) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $to)) {
            Response::json(['success' => false, 'message' => 'Invalid date range'], 422);
        }

        $data = $this->service->renewalReport((int) $auth['tenant_id'], (int) $auth['gym_id'], $from, $to);
        $activity = new ActivityLogRepository();
        $activity->create([
            'tenant_id' => (int) $auth['tenant_id'],
            'gym_id' => (int) $auth['gym_id'],
            'user_id' => isset($auth['sub']) ? (int) $auth['sub'] : null,
            'entity_type' => 'report',
            'entity_id' => null,
            'action' => 'reports_renewals_query',
            'metadata' => ['from' => $from, 'to' => $to],
            'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
        ]);
        Response::json(['success' => true, 'data' => ['from' => $from, 'to' => $to] + $data]);
    }
}
