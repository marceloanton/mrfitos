<?php

namespace App\Controllers;

use App\Services\ReminderService;
use App\Services\SubscriptionService;
use Core\Request;
use Core\Response;

final class ReminderController
{
    public function __construct(private readonly ReminderService $service = new ReminderService())
    {
    }

    public function expiringMemberships(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        if (!isset($auth['tenant_id'], $auth['gym_id'])) {
            Response::json(['success' => false, 'message' => 'Unauthorized context'], 401);
        }
        $days = (int) Request::query('days', 3);
        $data = $this->service->expiringMemberships((int) $auth['tenant_id'], (int) $auth['gym_id'], $days);

        Response::json([
            'success' => true,
            'data' => [
                'days' => max(0, min(30, $days)),
                'items' => $data,
                'total' => count($data)
            ]
        ]);
    }

    public function buildBatch(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        if (!isset($auth['tenant_id'], $auth['gym_id'], $auth['sub'])) {
            Response::json(['success' => false, 'message' => 'Unauthorized context'], 401);
        }

        $input = Request::json();
        $membershipIds = is_array($input['membership_ids'] ?? null) ? $input['membership_ids'] : [];
        $template = (string) ($input['template'] ?? '');
        $subscription = new SubscriptionService();
        if (!$subscription->validateMonthlyWhatsAppMessagesLimit(
            (int) $auth['tenant_id'],
            (int) $auth['gym_id'],
            is_array($membershipIds) ? count($membershipIds) : 1
        )) {
            Response::json([
                'success' => false,
                'message' => 'Monthly WhatsApp messages limit reached for current plan. Upgrade required.'
            ], 402);
        }

        try {
            $data = $this->service->buildBatch(
                (int) $auth['tenant_id'],
                (int) $auth['gym_id'],
                (int) $auth['sub'],
                $membershipIds,
                $template,
                $_SERVER['REMOTE_ADDR'] ?? null,
                $_SERVER['HTTP_USER_AGENT'] ?? null
            );
            Response::json(['success' => true, 'data' => $data]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function batches(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        if (!isset($auth['tenant_id'], $auth['gym_id'])) {
            Response::json(['success' => false, 'message' => 'Unauthorized context'], 401);
        }
        $items = $this->service->listBatches((int) $auth['tenant_id'], (int) $auth['gym_id']);
        Response::json(['success' => true, 'data' => ['items' => $items]]);
    }

    public function batchItems(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        if (!isset($auth['tenant_id'], $auth['gym_id'])) {
            Response::json(['success' => false, 'message' => 'Unauthorized context'], 401);
        }
        $batchId = (int) Request::param('id', 0);
        $items = $this->service->getBatchItems((int) $auth['tenant_id'], (int) $auth['gym_id'], $batchId);
        Response::json(['success' => true, 'data' => ['items' => $items]]);
    }

    public function updateBatchItemStatus(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        if (!isset($auth['tenant_id'], $auth['gym_id'])) {
            Response::json(['success' => false, 'message' => 'Unauthorized context'], 401);
        }
        $batchId = (int) Request::param('id', 0);
        $itemId = (int) Request::param('item_id', 0);
        $input = Request::json();

        try {
            $ok = $this->service->updateBatchItemStatus(
                (int) $auth['tenant_id'],
                (int) $auth['gym_id'],
                $batchId,
                $itemId,
                (string) ($input['send_status'] ?? ''),
                isset($input['error_message']) ? (string) $input['error_message'] : null
            );
            if (!$ok) {
                Response::json(['success' => false, 'message' => 'Batch item not found'], 404);
            }
            Response::json(['success' => true, 'message' => 'Status updated']);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }
}
