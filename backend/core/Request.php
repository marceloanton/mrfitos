<?php

namespace Core;

final class Request
{
    public static function json(): array
    {
        $input = file_get_contents('php://input');
        if (!$input) {
            return [];
        }

        $decoded = json_decode($input, true);
        return is_array($decoded) ? $decoded : [];
    }

    public static function header(string $name): ?string
    {
        $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
        return $_SERVER[$key] ?? null;
    }

    public static function query(string $key, mixed $default = null): mixed
    {
        return $_GET[$key] ?? $default;
    }

    public static function param(string $key, mixed $default = null): mixed
    {
        return $_SERVER['route_params'][$key] ?? $default;
    }
}
