<?php

declare(strict_types=1);

require_once __DIR__ . '/../app/bootstrap.php';

use Core\Router;

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOriginsRaw = (string) Core\Env::get('CORS_ALLOWED_ORIGINS', 'http://localhost:5173,http://127.0.0.1:5173');
$allowedOrigins = array_values(array_filter(array_map('trim', explode(',', $allowedOriginsRaw))));

/**
 * Supports exact origins and wildcard patterns like:
 * - https://*.example.com
 * - http://localhost:*
 */
$isAllowedOrigin = static function (string $requestOrigin, array $patterns): bool {
    if ($requestOrigin === '') {
        return false;
    }

    foreach ($patterns as $pattern) {
        if ($pattern === '*') {
            return true;
        }

        if ($requestOrigin === $pattern) {
            return true;
        }

        if (str_contains($pattern, '*')) {
            $regex = '#^' . str_replace('\*', '.*', preg_quote($pattern, '#')) . '$#i';
            if (preg_match($regex, $requestOrigin) === 1) {
                return true;
            }
        }
    }

    return false;
};

if ($isAllowedOrigin($origin, $allowedOrigins)) {
    header('Vary: Origin');
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Tenant-Id, X-Gym-Id');
    header('Access-Control-Max-Age: 86400');
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$router = new Router();
require_once __DIR__ . '/../routes/api.php';

$router->dispatch($_SERVER['REQUEST_METHOD'] ?? 'GET', parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');
