<?php

namespace App\Controllers;

use App\Services\PlanService;
use Core\Request;
use Core\Response;
use PDOException;

final class PlanController
{
    public function __construct(private readonly PlanService $service = new PlanService())
    {
    }

    public function index(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $tenantId = (int) ($auth['tenant_id'] ?? 0);
        $gymId = (int) ($auth['gym_id'] ?? 0);

        $q = trim((string) Request::query('q', ''));
        $active = Request::query('is_active');
        $isActive = null;
        if ($active !== null && $active !== '') {
            if (!in_array((string) $active, ['0', '1'], true)) {
                Response::json(['success' => false, 'message' => 'is_active must be 0 or 1'], 422);
            }
            $isActive = (int) $active;
        }
        $page = max(1, (int) Request::query('page', 1));
        $perPage = min(100, max(1, (int) Request::query('per_page', 20)));

        $result = $this->service->list($tenantId, $gymId, $q, $isActive, $page, $perPage);
        Response::json(['success' => true, 'data' => $result]);
    }

    public function show(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $plan = $this->service->get((int) $auth['tenant_id'], (int) $auth['gym_id'], (int) Request::param('id', 0));
        if (!$plan) {
            Response::json(['success' => false, 'message' => 'Plan not found'], 404);
        }
        Response::json(['success' => true, 'data' => ['plan' => $plan]]);
    }

    public function store(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        try {
            $id = $this->service->create((int) $auth['tenant_id'], (int) $auth['gym_id'], Request::json());
            $plan = $this->service->get((int) $auth['tenant_id'], (int) $auth['gym_id'], $id);
            Response::json(['success' => true, 'data' => ['plan' => $plan]], 201);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000) {
                Response::json(['success' => false, 'message' => 'Plan code/name must be unique in this gym'], 409);
            }
            Response::json(['success' => false, 'message' => 'Database error while creating plan'], 500);
        }
    }

    public function update(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $id = (int) Request::param('id', 0);

        try {
            $ok = $this->service->update((int) $auth['tenant_id'], (int) $auth['gym_id'], $id, Request::json());
            if (!$ok) {
                Response::json(['success' => false, 'message' => 'Plan not found'], 404);
            }
            $plan = $this->service->get((int) $auth['tenant_id'], (int) $auth['gym_id'], $id);
            Response::json(['success' => true, 'data' => ['plan' => $plan]]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000) {
                Response::json(['success' => false, 'message' => 'Plan code/name must be unique in this gym'], 409);
            }
            Response::json(['success' => false, 'message' => 'Database error while updating plan'], 500);
        }
    }

    public function destroy(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $ok = $this->service->delete((int) $auth['tenant_id'], (int) $auth['gym_id'], (int) Request::param('id', 0));
        if (!$ok) {
            Response::json(['success' => false, 'message' => 'Plan not found'], 404);
        }
        Response::json(['success' => true, 'message' => 'Plan deleted']);
    }
}
