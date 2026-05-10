<?php

namespace App\Services;

use App\Repositories\MemberRepository;

final class MemberService
{
    public function __construct(private readonly MemberRepository $members = new MemberRepository())
    {
    }

    public function list(int $tenantId, int $gymId, string $q, ?string $status, int $page, int $perPage): array
    {
        return $this->members->list($tenantId, $gymId, $q, $status, $page, $perPage);
    }

    public function get(int $tenantId, int $gymId, int $memberId): ?array
    {
        return $this->members->findById($tenantId, $gymId, $memberId);
    }

    public function create(int $tenantId, int $gymId, array $input): int
    {
        $memberCode = trim((string) ($input['member_code'] ?? ''));
        $firstName = trim((string) ($input['first_name'] ?? ''));
        $lastName = trim((string) ($input['last_name'] ?? ''));

        if ($memberCode === '' || $firstName === '' || $lastName === '') {
            throw new \InvalidArgumentException('member_code, first_name and last_name are required');
        }

        $email = trim((string) ($input['email'] ?? ''));
        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new \InvalidArgumentException('Invalid email');
        }

        return $this->members->create([
            'tenant_id' => $tenantId,
            'gym_id' => $gymId,
            'member_code' => $memberCode,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'email' => $email !== '' ? $email : null,
            'phone' => trim((string) ($input['phone'] ?? '')) ?: null,
            'birth_date' => trim((string) ($input['birth_date'] ?? '')) ?: null,
            'emergency_contact' => trim((string) ($input['emergency_contact'] ?? '')) ?: null,
            'notes' => trim((string) ($input['notes'] ?? '')) ?: null,
            'status' => in_array(($input['status'] ?? 'active'), ['active', 'inactive', 'frozen'], true) ? $input['status'] : 'active'
        ]);
    }

    public function update(int $tenantId, int $gymId, int $memberId, array $input): bool
    {
        $firstName = trim((string) ($input['first_name'] ?? ''));
        $lastName = trim((string) ($input['last_name'] ?? ''));

        if ($firstName === '' || $lastName === '') {
            throw new \InvalidArgumentException('first_name and last_name are required');
        }

        $email = trim((string) ($input['email'] ?? ''));
        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new \InvalidArgumentException('Invalid email');
        }

        return $this->members->update($tenantId, $gymId, $memberId, [
            'first_name' => $firstName,
            'last_name' => $lastName,
            'email' => $email !== '' ? $email : null,
            'phone' => trim((string) ($input['phone'] ?? '')) ?: null,
            'birth_date' => trim((string) ($input['birth_date'] ?? '')) ?: null,
            'emergency_contact' => trim((string) ($input['emergency_contact'] ?? '')) ?: null,
            'notes' => trim((string) ($input['notes'] ?? '')) ?: null,
            'status' => in_array(($input['status'] ?? 'active'), ['active', 'inactive', 'frozen'], true) ? $input['status'] : 'active'
        ]);
    }

    public function delete(int $tenantId, int $gymId, int $memberId): bool
    {
        return $this->members->softDelete($tenantId, $gymId, $memberId);
    }
}
