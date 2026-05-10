<?php

namespace Core;

final class Router
{
    private array $routes = [];

    public function add(string $method, string $path, callable|array $handler, array $middlewares = []): void
    {
        $this->routes[strtoupper($method)][$path] = ['handler' => $handler, 'middlewares' => $middlewares];
    }

    public function dispatch(string $method, string $path): void
    {
        $route = $this->resolveRoute(strtoupper($method), $path);
        if ($route === null) {
            Response::json(['success' => false, 'message' => 'Route not found'], 404);
        }

        $_SERVER['route_params'] = $route['params'] ?? [];

        foreach ($route['middlewares'] as $middlewareClass) {
            if (is_string($middlewareClass)) {
                (new $middlewareClass())->handle();
                continue;
            }

            $middlewareClass->handle();
        }

        $handler = $route['handler'];
        if (is_array($handler)) {
            [$class, $methodName] = $handler;
            (new $class())->$methodName();
            return;
        }

        $handler();
    }

    private function resolveRoute(string $method, string $path): ?array
    {
        $methodRoutes = $this->routes[$method] ?? [];
        if (isset($methodRoutes[$path])) {
            return $methodRoutes[$path] + ['params' => []];
        }

        foreach ($methodRoutes as $pattern => $route) {
            $regex = preg_replace('/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/', '(?P<$1>[^/]+)', $pattern);
            $regex = '#^' . $regex . '$#';
            if (!preg_match($regex, $path, $matches)) {
                continue;
            }

            $params = [];
            foreach ($matches as $key => $value) {
                if (is_string($key)) {
                    $params[$key] = $value;
                }
            }

            return $route + ['params' => $params];
        }

        return null;
    }
}
