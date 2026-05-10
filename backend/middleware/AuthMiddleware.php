<?php

namespace Middleware;

use Core\Env;
use Core\Request;
use Core\Response;
use Helpers\Jwt;

final class AuthMiddleware
{
    public function handle(): void
    {
        $auth = Request::header('Authorization');
        if (!$auth || !str_starts_with($auth, 'Bearer ')) {
            Response::json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $token = substr($auth, 7);
        $payload = Jwt::decode($token, (string) Env::get('APP_KEY', 'secret'));
        if ($payload === null) {
            Response::json(['success' => false, 'message' => 'Invalid token'], 401);
        }

        $_SERVER['auth_user'] = json_encode($payload);
    }
}
