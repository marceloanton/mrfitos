<?php

namespace App\Controllers;

use App\Services\AttendanceService;
use App\Services\SubscriptionService;
use Core\Request;
use Core\Response;

final class AttendanceController
{
    public function __construct(private readonly AttendanceService $service = new AttendanceService())
    {
    }

    public function index(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $date = Request::query('date');
        $page = max(1, (int) Request::query('page', 1));
        $perPage = min(100, max(1, (int) Request::query('per_page', 20)));

        $result = $this->service->list((int) $auth['tenant_id'], (int) $auth['gym_id'], is_string($date) ? $date : null, $page, $perPage);
        Response::json(['success' => true, 'data' => $result]);
    }

    public function checkIn(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $input = Request::json();
        $subscription = new SubscriptionService();
        if (!$subscription->validateMonthlyAttendanceCheckinsLimit((int) $auth['tenant_id'], (int) $auth['gym_id'])) {
            Response::json(['success' => false, 'message' => 'Plan limit reached: upgrade required for more monthly check-ins'], 402);
        }

        try {
            $result = $this->service->checkInByCode(
                (int) $auth['tenant_id'],
                (int) $auth['gym_id'],
                (string) ($input['member_code'] ?? ''),
                (string) ($input['source'] ?? 'qr')
            );
            Response::json(['success' => true, 'data' => $result], 201);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\RuntimeException $e) {
            $code = $e->getCode() >= 100 ? $e->getCode() : 400;
            Response::json(['success' => false, 'message' => $e->getMessage()], $code);
        }
    }

    public function checkOut(): void
    {
        $auth = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $input = Request::json();

        try {
            $result = $this->service->checkOutByCode(
                (int) $auth['tenant_id'],
                (int) $auth['gym_id'],
                (string) ($input['member_code'] ?? '')
            );
            Response::json(['success' => true, 'data' => $result]);
        } catch (\InvalidArgumentException $e) {
            Response::json(['success' => false, 'message' => $e->getMessage()], 422);
        } catch (\RuntimeException $e) {
            $code = $e->getCode() >= 100 ? $e->getCode() : 400;
            Response::json(['success' => false, 'message' => $e->getMessage()], $code);
        }
    }
}
