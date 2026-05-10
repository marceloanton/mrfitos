<?php

namespace App\Services;

use App\Repositories\PasswordResetRepository;
use App\Repositories\UserRepository;
use Core\Env;
use Helpers\Jwt;

final class AuthService
{
    public function __construct(
        private readonly UserRepository $users = new UserRepository(),
        private readonly PasswordResetRepository $passwordResets = new PasswordResetRepository(),
        private readonly SubscriptionService $subscriptions = new SubscriptionService()
    ) {
    }

    public function login(string $email, string $password, ?int $gymId = null): ?array
    {
        $user = $this->users->findByEmail($email);
        if (!$user || $user['status'] !== 'active') {
            return null;
        }

        if (!password_verify($password, $user['password_hash'])) {
            return null;
        }

        if (!$this->subscriptions->validateStaffUsersLimit((int) $user['tenant_id'])) {
            throw new \RuntimeException('Plan limit exceeded: max_staff_users reached', 402);
        }

        return $this->buildAuthPayload($user, $gymId);
    }

    public function switchGym(int $userId, int $gymId): ?array
    {
        $user = $this->users->findById($userId);
        if (!$user || $user['status'] !== 'active') {
            return null;
        }

        if (!$this->subscriptions->validateStaffUsersLimit((int) $user['tenant_id'])) {
            throw new \RuntimeException('Plan limit exceeded: max_staff_users reached', 402);
        }

        return $this->buildAuthPayload([
            'id' => $user['id'],
            'tenant_id' => $user['tenant_id'],
            'email' => $user['email'],
            'first_name' => $user['first_name'],
            'last_name' => $user['last_name'],
            'status' => $user['status']
        ], $gymId);
    }

    private function buildAuthPayload(array $user, ?int $gymId = null): ?array
    {
        $assignments = $this->users->getUserGymRoles((int) $user['id']);
        if ($assignments === []) {
            return null;
        }

        $availableGyms = [];
        foreach ($assignments as $assignment) {
            $gId = (int) $assignment['gym_id'];
            if (!isset($availableGyms[$gId])) {
                $availableGyms[$gId] = [
                    'gym_id' => $gId,
                    'gym_name' => (string) $assignment['gym_name']
                ];
            }
        }

        $selectedGymId = $gymId ?? (int) array_key_first($availableGyms);
        if (!isset($availableGyms[$selectedGymId])) {
            return null;
        }

        $gymAssignments = array_values(array_filter($assignments, fn(array $a) => (int) $a['gym_id'] === $selectedGymId));
        if ($gymAssignments === []) {
            return null;
        }

        $permissions = [];
        $roles = [];
        foreach ($gymAssignments as $assignment) {
            $roles[] = $assignment['role_code'];
            if (!empty($assignment['permissions'])) {
                $decoded = json_decode((string) $assignment['permissions'], true);
                if (is_array($decoded)) {
                    $permissions = array_merge($permissions, $decoded);
                }
            }
        }

        $permissions = array_values(array_unique($permissions));
        $roles = array_values(array_unique($roles));
        $availableGymsList = array_values($availableGyms);

        $ttl = (int) Env::get('JWT_TTL', 3600);
        $payload = [
            'sub' => (int) $user['id'],
            'tenant_id' => (int) $user['tenant_id'],
            'gym_id' => $selectedGymId,
            'email' => $user['email'],
            'name' => trim($user['first_name'] . ' ' . $user['last_name']),
            'roles' => $roles,
            'permissions' => $permissions,
            'available_gyms' => $availableGymsList,
            'exp' => time() + $ttl
        ];

        $token = Jwt::encode($payload, (string) Env::get('APP_KEY', 'secret'));

        return [
            'token' => $token,
            'user' => [
                'id' => (int) $user['id'],
                'tenant_id' => (int) $user['tenant_id'],
                'gym_id' => $selectedGymId,
                'email' => $user['email'],
                'name' => trim($user['first_name'] . ' ' . $user['last_name']),
                'roles' => $roles,
                'permissions' => $permissions,
                'available_gyms' => $availableGymsList
            ]
        ];
    }

    public function requestPasswordReset(string $email): void
    {
        $user = $this->users->findByEmail($email);
        if (!$user || $user['status'] !== 'active') {
            return;
        }

        $rawToken = bin2hex(random_bytes(32));
        $tokenHash = hash('sha256', $rawToken);
        $expiresAt = date('Y-m-d H:i:s', time() + 3600);
        $this->passwordResets->create((int) $user['tenant_id'], (int) $user['id'], $tokenHash, $expiresAt);

        error_log('PASSWORD_RESET_TOKEN:' . $rawToken);
    }

    public function resetPassword(string $token, string $newPassword): bool
    {
        $tokenHash = hash('sha256', $token);
        $reset = $this->passwordResets->findValidToken($tokenHash);
        if (!$reset) {
            return false;
        }

        $hash = password_hash($newPassword, PASSWORD_BCRYPT);
        $this->users->updatePassword((int) $reset['user_id'], $hash);
        $this->passwordResets->markUsed((int) $reset['id']);

        return true;
    }
}
