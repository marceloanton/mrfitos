<?php

namespace App\Controllers;

use App\Services\MembershipService;
use Core\Request;
use Core\Response;
use PDOException;

final class MembershipController
{
    public function __construct(private readonly MembershipService $service = new MembershipService())
    {
    }

    public function index(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $status = Request::query('status');
        $page = max(1, (int) Request::query('page', 1));
        $perPage = min(100, max(1, (int) Request::query('per_page', 20)));

        $result = $this->service->list((int) $auth['tenant_id'], (int) $auth['gym_id'], is_string($status) ? $status : null, $page, $perPage);
        Response::json(['success' => true, 'data' => $result]);
    }

    public function show(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $item = $this->service->get((int) $auth['tenant_id'], (int) $auth['gym_id'], (int) Request::param('id', 0));
        if (!$item) {
            Response::json(['success' => false, 'message' => 'Membership not found'], 404);
        }
        Response::json(['success' => true, 'data' => ['membership' => $item]]);
    }

    public function store(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        try {
            $id = $this->service->create((int) $auth['tenant_id'], (int) $auth['gym_id'], Request::json());
            $item = $this->service->get((int) $auth['tenant_id'], (int) $auth['gym_id'], $id);
            Response::json(['success' => true, 'data' => ['membership' => $item]], 201);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (PDOException $e) {
            Response::json(['success' => false, 'message' => 'Database error while creating membership'], 500);
        }
    }

    public function update(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $id = (int) Request::param('id', 0);

        try {
            $ok = $this->service->update((int) $auth['tenant_id'], (int) $auth['gym_id'], $id, Request::json());
            if (!$ok) {
                Response::json(['success' => false, 'message' => 'Membership not found'], 404);
            }
            $item = $this->service->get((int) $auth['tenant_id'], (int) $auth['gym_id'], $id);
            Response::json(['success' => true, 'data' => ['membership' => $item]]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (PDOException $e) {
            Response::json(['success' => false, 'message' => 'Database error while updating membership'], 500);
        }
    }

    public function destroy(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $ok = $this->service->delete((int) $auth['tenant_id'], (int) $auth['gym_id'], (int) Request::param('id', 0));
        if (!$ok) {
            Response::json(['success' => false, 'message' => 'Membership not found'], 404);
        }
        Response::json(['success' => true, 'message' => 'Membership deleted']);
    }
}
