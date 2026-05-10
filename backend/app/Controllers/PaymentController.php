<?php

namespace App\Controllers;

use App\Services\PaymentService;
use App\Services\SubscriptionService;
use Core\Request;
use Core\Response;
use PDOException;

final class PaymentController
{
    public function __construct(private readonly PaymentService $service = new PaymentService())
    {
    }

    public function index(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $method = Request::query('method');
        $page = max(1, (int) Request::query('page', 1));
        $perPage = min(100, max(1, (int) Request::query('per_page', 20)));

        $result = $this->service->list((int) $auth['tenant_id'], (int) $auth['gym_id'], is_string($method) ? $method : null, $page, $perPage);
        Response::json(['success' => true, 'data' => $result]);
    }

    public function show(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $item = $this->service->get((int) $auth['tenant_id'], (int) $auth['gym_id'], (int) Request::param('id', 0));
        if (!$item) {
            Response::json(['success' => false, 'message' => 'Payment not found'], 404);
        }
        Response::json(['success' => true, 'data' => ['payment' => $item]]);
    }

    public function store(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $subscription = new SubscriptionService();
        if (!$subscription->validateMonthlyPaymentsLimit((int) $auth['tenant_id'], (int) $auth['gym_id'])) {
            Response::json(['success' => false, 'message' => 'Plan limit reached: upgrade required for more monthly payments'], 402);
        }

        try {
            $id = $this->service->create((int) $auth['tenant_id'], (int) $auth['gym_id'], (int) $auth['sub'], Request::json());
            $item = $this->service->get((int) $auth['tenant_id'], (int) $auth['gym_id'], $id);
            Response::json(['success' => true, 'data' => ['payment' => $item]], 201);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000) {
                Response::json(['success' => false, 'message' => 'Payment external reference must be unique in this gym'], 409);
            }
            Response::json(['success' => false, 'message' => 'Database error while creating payment'], 500);
        }
    }

    public function update(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $id = (int) Request::param('id', 0);

        try {
            $ok = $this->service->update((int) $auth['tenant_id'], (int) $auth['gym_id'], $id, Request::json());
            if (!$ok) {
                Response::json(['success' => false, 'message' => 'Payment not found'], 404);
            }
            $item = $this->service->get((int) $auth['tenant_id'], (int) $auth['gym_id'], $id);
            Response::json(['success' => true, 'data' => ['payment' => $item]]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000) {
                Response::json(['success' => false, 'message' => 'Payment external reference must be unique in this gym'], 409);
            }
            Response::json(['success' => false, 'message' => 'Database error while updating payment'], 500);
        }
    }

    public function destroy(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $ok = $this->service->delete((int) $auth['tenant_id'], (int) $auth['gym_id'], (int) Request::param('id', 0));
        if (!$ok) {
            Response::json(['success' => false, 'message' => 'Payment not found'], 404);
        }
        Response::json(['success' => true, 'message' => 'Payment deleted']);
    }
}
