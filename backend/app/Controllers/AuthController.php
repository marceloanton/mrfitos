<?php

namespace App\Controllers;

use App\Services\AuthService;
use Core\Request;
use Core\Response;

final class AuthController
{
    public function __construct(private readonly AuthService $auth = new AuthService())
    {
    }

    public function login(): void
    {
        $input = Request::json();
        $email = filter_var($input['email'] ?? '', FILTER_VALIDATE_EMAIL);
        $password = (string) ($input['password'] ?? '');
        $gymId = isset($input['gym_id']) ? (int) $input['gym_id'] : null;

        if (!$email || $password === '') {
            Response::json(['success' => false, 'message' => 'Invalid credentials payload'], 422);
        }

        try {
            $result = $this->auth->login($email, $password, $gymId);
        } catch (\RuntimeException $e) {
            if ($e->getCode() === 402) {
                Response::json(['success' => false, 'message' => $e->getMessage()], 402);
            }
            throw $e;
        }
        if ($result === null) {
            Response::json(['success' => false, 'message' => 'Invalid credentials or gym access'], 401);
        }

        Response::json(['success' => true, 'data' => $result]);
    }

    public function me(): void
    {
        $authUser = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        Response::json(['success' => true, 'data' => ['user' => $authUser]]);
    }

    public function forgotPassword(): void
    {
        $input = Request::json();
        $email = filter_var($input['email'] ?? '', FILTER_VALIDATE_EMAIL);
        if (!$email) {
            Response::json(['success' => false, 'message' => 'Invalid email'], 422);
        }

        $this->auth->requestPasswordReset($email);
        Response::json(['success' => true, 'message' => 'If the account exists, reset instructions were generated']);
    }

    public function switchGym(): void
    {
        $authUser = json_decode($_SERVER['auth_user'] ?? '{}', true) ?: [];
        $userId = (int) ($authUser['sub'] ?? 0);
        $input = Request::json();
        $gymId = (int) ($input['gym_id'] ?? 0);

        if ($userId <= 0 || $gymId <= 0) {
            Response::json(['success' => false, 'message' => 'gym_id is required'], 422);
        }

        try {
            $result = $this->auth->switchGym($userId, $gymId);
        } catch (\RuntimeException $e) {
            if ($e->getCode() === 402) {
                Response::json(['success' => false, 'message' => $e->getMessage()], 402);
            }
            throw $e;
        }
        if ($result === null) {
            Response::json(['success' => false, 'message' => 'Gym not allowed for this user'], 403);
        }

        Response::json(['success' => true, 'data' => $result]);
    }

    public function resetPassword(): void
    {
        $input = Request::json();
        $token = (string) ($input['token'] ?? '');
        $newPassword = (string) ($input['password'] ?? '');

        if ($token === '' || strlen($newPassword) < 8) {
            Response::json(['success' => false, 'message' => 'Invalid token or password'], 422);
        }

        $ok = $this->auth->resetPassword($token, $newPassword);
        if (!$ok) {
            Response::json(['success' => false, 'message' => 'Invalid or expired reset token'], 400);
        }

        Response::json(['success' => true, 'message' => 'Password updated']);
    }
}
