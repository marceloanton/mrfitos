<?php

namespace App\Services;

use App\Repositories\PlanRepository;

final class PlanService
{
    public function __construct(private readonly PlanRepository $plans = new PlanRepository())
    {
    }

    public function list(int $tenantId, int $gymId, string $q, ?int $isActive, int $page, int $perPage): array
    {
        return $this->plans->list($tenantId, $gymId, $q, $isActive, $page, $perPage);
    }

    public function get(int $tenantId, int $gymId, int $id): ?array
    {
        return $this->plans->findById($tenantId, $gymId, $id);
    }

    public function create(int $tenantId, int $gymId, array $input): int
    {
        $code = trim((string) ($input['code'] ?? ''));
        $name = trim((string) ($input['name'] ?? ''));
        if ($code === '' || $name === '') {
            throw new \InvalidArgumentException('code and name are required');
        }

        $duration = (int) ($input['duration_days'] ?? 0);
        $price = (float) ($input['price'] ?? 0);
        if ($duration <= 0 || $price < 0) {
            throw new \InvalidArgumentException('duration_days and price are invalid');
        }

        $billing = (string) ($input['billing_cycle'] ?? 'monthly');
        if (!in_array($billing, ['one_time', 'weekly', 'monthly', 'yearly'], true)) {
            throw new \InvalidArgumentException('Invalid billing_cycle');
        }

        $currency = strtoupper(trim((string) ($input['currency'] ?? 'ARS')));
        if (!preg_match('/^[A-Z]{3}$/', $currency)) {
            throw new \InvalidArgumentException('currency must be a 3-letter ISO code');
        }

        return $this->plans->create([
            'tenant_id' => $tenantId,
            'gym_id' => $gymId,
            'code' => $code,
            'name' => $name,
            'description' => trim((string) ($input['description'] ?? '')) ?: null,
            'duration_days' => $duration,
            'price' => $price,
            'currency' => $currency,
            'billing_cycle' => $billing,
            'is_active' => (int) (($input['is_active'] ?? 1) ? 1 : 0)
        ]);
    }

    public function update(int $tenantId, int $gymId, int $id, array $input): bool
    {
        $name = trim((string) ($input['name'] ?? ''));
        if ($name === '') {
            throw new \InvalidArgumentException('name is required');
        }

        $duration = (int) ($input['duration_days'] ?? 0);
        $price = (float) ($input['price'] ?? 0);
        if ($duration <= 0 || $price < 0) {
            throw new \InvalidArgumentException('duration_days and price are invalid');
        }

        $billing = (string) ($input['billing_cycle'] ?? 'monthly');
        if (!in_array($billing, ['one_time', 'weekly', 'monthly', 'yearly'], true)) {
            throw new \InvalidArgumentException('Invalid billing_cycle');
        }

        $currency = strtoupper(trim((string) ($input['currency'] ?? 'ARS')));
        if (!preg_match('/^[A-Z]{3}$/', $currency)) {
            throw new \InvalidArgumentException('currency must be a 3-letter ISO code');
        }

        return $this->plans->update($tenantId, $gymId, $id, [
            'name' => $name,
            'description' => trim((string) ($input['description'] ?? '')) ?: null,
            'duration_days' => $duration,
            'price' => $price,
            'currency' => $currency,
            'billing_cycle' => $billing,
            'is_active' => (int) (($input['is_active'] ?? 1) ? 1 : 0)
        ]);
    }

    public function delete(int $tenantId, int $gymId, int $id): bool
    {
        return $this->plans->softDelete($tenantId, $gymId, $id);
    }
}
