<?php

namespace App\Services;

use App\Repositories\PaymentRepository;

final class PaymentService
{
    public function __construct(private readonly PaymentRepository $payments = new PaymentRepository())
    {
    }

    public function list(int $tenantId, int $gymId, ?string $method, int $page, int $perPage): array
    {
        return $this->payments->list($tenantId, $gymId, $method, $page, $perPage);
    }

    public function get(int $tenantId, int $gymId, int $id): ?array
    {
        return $this->payments->findById($tenantId, $gymId, $id);
    }

    public function create(int $tenantId, int $gymId, int $userId, array $input): int
    {
        $memberId = (int) ($input['member_id'] ?? 0);
        $amount = (float) ($input['amount'] ?? 0);

        if ($memberId <= 0 || $amount <= 0) {
            throw new \InvalidArgumentException('member_id and amount are required');
        }

        $currency = strtoupper(trim((string) ($input['currency'] ?? 'ARS')));
        if (!preg_match('/^[A-Z]{3}$/', $currency)) {
            throw new \InvalidArgumentException('currency must be a 3-letter ISO code');
        }

        $method = (string) ($input['method'] ?? 'cash');
        if (!in_array($method, ['cash', 'card', 'transfer', 'mercadopago', 'other'], true)) {
            throw new \InvalidArgumentException('Invalid method');
        }

        $status = (string) ($input['status'] ?? 'paid');
        if (!in_array($status, ['pending', 'paid', 'failed', 'refunded'], true)) {
            throw new \InvalidArgumentException('Invalid status');
        }

        return $this->payments->create([
            'tenant_id' => $tenantId,
            'gym_id' => $gymId,
            'member_id' => $memberId,
            'membership_id' => isset($input['membership_id']) ? (int) $input['membership_id'] : null,
            'received_by_user_id' => $userId > 0 ? $userId : null,
            'amount' => $amount,
            'currency' => $currency,
            'method' => $method,
            'status' => $status,
            'paid_at' => (string) ($input['paid_at'] ?? date('Y-m-d H:i:s')),
            'external_reference' => trim((string) ($input['external_reference'] ?? '')) ?: null,
            'notes' => trim((string) ($input['notes'] ?? '')) ?: null
        ]);
    }

    public function update(int $tenantId, int $gymId, int $id, array $input): bool
    {
        $amount = (float) ($input['amount'] ?? 0);
        if ($amount <= 0) {
            throw new \InvalidArgumentException('amount must be greater than 0');
        }

        $currency = strtoupper(trim((string) ($input['currency'] ?? 'ARS')));
        if (!preg_match('/^[A-Z]{3}$/', $currency)) {
            throw new \InvalidArgumentException('currency must be a 3-letter ISO code');
        }

        $method = (string) ($input['method'] ?? 'cash');
        if (!in_array($method, ['cash', 'card', 'transfer', 'mercadopago', 'other'], true)) {
            throw new \InvalidArgumentException('Invalid method');
        }

        $status = (string) ($input['status'] ?? 'paid');
        if (!in_array($status, ['pending', 'paid', 'failed', 'refunded'], true)) {
            throw new \InvalidArgumentException('Invalid status');
        }

        return $this->payments->update($tenantId, $gymId, $id, [
            'amount' => $amount,
            'currency' => $currency,
            'method' => $method,
            'status' => $status,
            'paid_at' => (string) ($input['paid_at'] ?? date('Y-m-d H:i:s')),
            'external_reference' => trim((string) ($input['external_reference'] ?? '')) ?: null,
            'notes' => trim((string) ($input['notes'] ?? '')) ?: null
        ]);
    }

    public function delete(int $tenantId, int $gymId, int $id): bool
    {
        return $this->payments->softDelete($tenantId, $gymId, $id);
    }
}
