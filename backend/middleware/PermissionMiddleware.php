<?php

namespace Middleware;

use Core\Response;

final class PermissionMiddleware
{
    public function __construct(private readonly string $permission)
    {
    }

    public function handle(): void
    {
        $authUserRaw = $_SERVER['auth_user'] ?? null;
        $authUser = $authUserRaw ? json_decode($authUserRaw, true) : null;
        $permissions = is_array($authUser['permissions'] ?? null) ? $authUser['permissions'] : [];

        if (!in_array($this->permission, $permissions, true)) {
            Response::json(['success' => false, 'message' => 'Forbidden'], 403);
        }
    }
}
