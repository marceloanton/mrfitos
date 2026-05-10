<?php

namespace App\Services;

use App\Repositories\MembershipRepository;

final class MembershipService
{
    public function __construct(private readonly MembershipRepository $memberships = new MembershipRepository())
    {
    }

    public function list(int $tenantId, int $gymId, ?string $status, int $page, int $perPage): array
    {
        return $this->memberships->list($tenantId, $gymId, $status, $page, $perPage);
    }

    public function get(int $tenantId, int $gymId, int $id): ?array
    {
        return $this->memberships->findById($tenantId, $gymId, $id);
    }

    public function create(int $tenantId, int $gymId, array $input): int
    {
        $memberId = (int) ($input['member_id'] ?? 0);
        $planId = (int) ($input['plan_id'] ?? 0);
        $startDate = (string) ($input['start_date'] ?? '');
        $endDate = (string) ($input['end_date'] ?? '');

        if ($memberId <= 0 || $planId <= 0 || $startDate === '' || $endDate === '') {
            throw new \InvalidArgumentException('member_id, plan_id, start_date and end_date are required');
        }

        if (strtotime($endDate) < strtotime($startDate)) {
            throw new \InvalidArgumentException('end_date must be greater than or equal to start_date');
        }

        $status = (string) ($input['status'] ?? 'active');
        if (!in_array($status, ['active', 'expired', 'cancelled', 'paused'], true)) {
            throw new \InvalidArgumentException('Invalid status');
        }

        return $this->memberships->create([
            'tenant_id' => $tenantId,
            'gym_id' => $gymId,
            'member_id' => $memberId,
            'plan_id' => $planId,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'status' => $status,
            'auto_renew' => (int) (($input['auto_renew'] ?? 0) ? 1 : 0)
        ]);
    }

    public function update(int $tenantId, int $gymId, int $id, array $input): bool
    {
        $planId = (int) ($input['plan_id'] ?? 0);
        $startDate = (string) ($input['start_date'] ?? '');
        $endDate = (string) ($input['end_date'] ?? '');

        if ($planId <= 0 || $startDate === '' || $endDate === '') {
            throw new \InvalidArgumentException('plan_id, start_date and end_date are required');
        }

        if (strtotime($endDate) < strtotime($startDate)) {
            throw new \InvalidArgumentException('end_date must be greater than or equal to start_date');
        }

        $status = (string) ($input['status'] ?? 'active');
        if (!in_array($status, ['active', 'expired', 'cancelled', 'paused'], true)) {
            throw new \InvalidArgumentException('Invalid status');
        }

        return $this->memberships->update($tenantId, $gymId, $id, [
            'plan_id' => $planId,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'status' => $status,
            'auto_renew' => (int) (($input['auto_renew'] ?? 0) ? 1 : 0),
            'cancelled_at' => $status === 'cancelled' ? date('Y-m-d H:i:s') : null
        ]);
    }

    public function delete(int $tenantId, int $gymId, int $id): bool
    {
        return $this->memberships->softDelete($tenantId, $gymId, $id);
    }
}
