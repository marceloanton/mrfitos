<?php

namespace App\Controllers;

use App\Services\MemberService;
use App\Services\SubscriptionService;
use Core\Request;
use Core\Response;

final class MemberController
{
    public function __construct(private readonly MemberService $service = new MemberService())
    {
    }

    public function index(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $tenantId = (int) ($auth['tenant_id'] ?? 0);
        $gymId = (int) ($auth['gym_id'] ?? 0);

        $q = trim((string) Request::query('q', ''));
        $status = Request::query('status');
        $page = max(1, (int) Request::query('page', 1));
        $perPage = min(100, max(1, (int) Request::query('per_page', 20)));

        $result = $this->service->list($tenantId, $gymId, $q, is_string($status) ? $status : null, $page, $perPage);
        Response::json(['success' => true, 'data' => $result]);
    }

    public function show(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $tenantId = (int) ($auth['tenant_id'] ?? 0);
        $gymId = (int) ($auth['gym_id'] ?? 0);
        $id = (int) Request::param('id', 0);

        $member = $this->service->get($tenantId, $gymId, $id);
        if (!$member) {
            Response::json(['success' => false, 'message' => 'Member not found'], 404);
        }

        Response::json(['success' => true, 'data' => ['member' => $member]]);
    }

    public function store(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $tenantId = (int) ($auth['tenant_id'] ?? 0);
        $gymId = (int) ($auth['gym_id'] ?? 0);

        $subscription = new SubscriptionService();
        if (!$subscription->validateMemberCreationLimit($tenantId, $gymId)) {
            Response::json(['success' => false, 'message' => 'Plan limit reached: upgrade required for more active members'], 402);
        }

        try {
            $id = $this->service->create($tenantId, $gymId, Request::json());
            $member = $this->service->get($tenantId, $gymId, $id);
            Response::json(['success' => true, 'data' => ['member' => $member]], 201);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function update(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $tenantId = (int) ($auth['tenant_id'] ?? 0);
        $gymId = (int) ($auth['gym_id'] ?? 0);
        $id = (int) Request::param('id', 0);

        try {
            $ok = $this->service->update($tenantId, $gymId, $id, Request::json());
            if (!$ok) {
                Response::json(['success' => false, 'message' => 'Member not found'], 404);
            }

            $member = $this->service->get($tenantId, $gymId, $id);
            Response::json(['success' => true, 'data' => ['member' => $member]]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function destroy(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $tenantId = (int) ($auth['tenant_id'] ?? 0);
        $gymId = (int) ($auth['gym_id'] ?? 0);
        $id = (int) Request::param('id', 0);

        $ok = $this->service->delete($tenantId, $gymId, $id);
        if (!$ok) {
            Response::json(['success' => false, 'message' => 'Member not found'], 404);
        }

        Response::json(['success' => true, 'message' => 'Member deleted']);
    }
}
