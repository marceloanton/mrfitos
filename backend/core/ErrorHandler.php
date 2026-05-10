<?php

namespace Core;

use Throwable;

final class ErrorHandler
{
    public static function register(): void
    {
        set_exception_handler(function (Throwable $e): void {
            $status = 500;
            Response::json([
                'success' => false,
                'message' => 'Internal server error',
                'error' => Env::get('APP_DEBUG', 'false') === 'true' ? $e->getMessage() : null
            ], $status);
        });

        set_error_handler(function (int $severity, string $message, string $file, int $line): bool {
            if (!(error_reporting() & $severity)) {
                return false;
            }
            throw new \ErrorException($message, 0, $severity, $file, $line);
        });
    }
}
