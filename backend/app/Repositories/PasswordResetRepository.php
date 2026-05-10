<?php

namespace App\Repositories;

use Core\Database;

final class PasswordResetRepository
{
    public function create(int $tenantId, int $userId, string $tokenHash, string $expiresAt): void
    {
        $stmt = Database::connection()->prepare(
            'INSERT INTO password_resets (tenant_id, user_id, token, expires_at, created_at, updated_at)
             VALUES (:tenant_id, :user_id, :token, :expires_at, NOW(), NOW())'
        );

        $stmt->execute([
            'tenant_id' => $tenantId,
            'user_id' => $userId,
            'token' => $tokenHash,
            'expires_at' => $expiresAt
        ]);
    }

    public function findValidToken(string $tokenHash): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT id, tenant_id, user_id, expires_at, used_at
             FROM password_resets
             WHERE token = :token
             LIMIT 1'
        );
        $stmt->execute(['token' => $tokenHash]);
        $row = $stmt->fetch();

        if (!$row) {
            return null;
        }

        if (!empty($row['used_at']) || strtotime((string) $row['expires_at']) < time()) {
            return null;
        }

        return $row;
    }

    public function markUsed(int $id): void
    {
        $stmt = Database::connection()->prepare(
            'UPDATE password_resets SET used_at = NOW(), updated_at = NOW() WHERE id = :id'
        );
        $stmt->execute(['id' => $id]);
    }
}
