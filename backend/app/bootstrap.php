<?php

declare(strict_types=1);

spl_autoload_register(function (string $class): void {
    $baseDir = dirname(__DIR__);
    $prefixes = [
        'App\\' => $baseDir . '/app/',
        'Core\\' => $baseDir . '/core/',
        'Middleware\\' => $baseDir . '/middleware/',
        'Helpers\\' => $baseDir . '/helpers/'
    ];

    foreach ($prefixes as $prefix => $dir) {
        if (!str_starts_with($class, $prefix)) {
            continue;
        }

        $relative = str_replace('\\', '/', substr($class, strlen($prefix)));
        $path = $dir . $relative . '.php';
        if (is_file($path)) {
            require_once $path;
        }
    }
});

Core\Env::load(dirname(__DIR__) . '/.env');
Core\ErrorHandler::register();
