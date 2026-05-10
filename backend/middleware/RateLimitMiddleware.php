<?php

namespace Middleware;

use Core\Response;

final class RateLimitMiddleware
{
    public function __construct(
        private readonly string $bucket,
        private readonly int $limit,
        private readonly int $windowSeconds
    ) {
    }

    public function handle(): void
    {
        $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $key = sprintf('rl:%s:%s', $this->bucket, $ip);
        $dir = dirname(__DIR__) . '/storage/ratelimit';
        if (!is_dir($dir)) {
            @mkdir($dir, 0777, true);
        }

        $path = $dir . '/' . md5($key) . '.json';
        $now = time();
        $data = ['start' => $now, 'count' => 0];

        if (is_file($path)) {
            $raw = file_get_contents($path);
            $decoded = json_decode((string) $raw, true);
            if (is_array($decoded) && isset($decoded['start'], $decoded['count'])) {
                $data = ['start' => (int) $decoded['start'], 'count' => (int) $decoded['count']];
            }
        }

        if (($now - $data['start']) >= $this->windowSeconds) {
            $data = ['start' => $now, 'count' => 0];
        }

        $data['count']++;
        file_put_contents($path, json_encode($data));

        if ($data['count'] > $this->limit) {
            $retryAfter = max(1, $this->windowSeconds - ($now - $data['start']));
            header('Retry-After: ' . $retryAfter);
            Response::json(['success' => false, 'message' => 'Too many requests'], 429);
        }
    }
}
