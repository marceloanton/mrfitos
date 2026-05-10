<?php

namespace App\Repositories;

use Core\Database;

final class UserRepository
{
    public function findByEmail(string $email): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT id, tenant_id, email, first_name, last_name, password_hash, status
             FROM users
             WHERE email = :email AND deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute(['email' => $email]);
        $user = $stmt->fetch();
        return $user ?: null;
    }

    public function getUserGymRoles(int $userId): array
    {
        $stmt = Database::connection()->prepare(
            'SELECT ugr.gym_id, g.name AS gym_name, r.code AS role_code, r.permissions
             FROM user_gym_roles ugr
             INNER JOIN gyms g ON g.id = ugr.gym_id
             INNER JOIN roles r ON r.id = ugr.role_id
             WHERE ugr.user_id = :user_id
               AND ugr.deleted_at IS NULL
               AND r.deleted_at IS NULL
               AND g.deleted_at IS NULL'
        );
        $stmt->execute(['user_id' => $userId]);
        return $stmt->fetchAll() ?: [];
    }

    public function findById(int $id): ?array
    {
        $stmt = Database::connection()->prepare(
            'SELECT id, tenant_id, email, first_name, last_name, status
             FROM users
             WHERE id = :id AND deleted_at IS NULL
             LIMIT 1'
        );
        $stmt->execute(['id' => $id]);
        $user = $stmt->fetch();
        return $user ?: null;
    }

    public function updatePassword(int $userId, string $passwordHash): void
    {
        $stmt = Database::connection()->prepare(
            'UPDATE users SET password_hash = :password_hash, updated_at = NOW() WHERE id = :id'
        );
        $stmt->execute(['password_hash' => $passwordHash, 'id' => $userId]);
    }
}
