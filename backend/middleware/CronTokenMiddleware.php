<?php

namespace Middleware;

use Core\Env;
use Core\Request;
use Core\Response;

final class CronTokenMiddleware
{
    public function handle(): void
    {
        $expected = trim((string) Env::get('CRON_BEARER_TOKEN', ''));
        if ($expected === '') {
            Response::json(['success' => false, 'message' => 'Cron token is not configured'], 503);
        }

        $auth = (string) (Request::header('Authorization') ?? '');
        if (!str_starts_with($auth, 'Bearer ')) {
            Response::json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        $provided = trim(substr($auth, 7));
        if ($provided === '' || !hash_equals($expected, $provided)) {
            Response::json(['success' => false, 'message' => 'Invalid cron token'], 401);
        }
    }
}

