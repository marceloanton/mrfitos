<?php

namespace Core;

final class Response
{
    public static function json(array $data, int $status = 200, array $headers = []): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        foreach ($headers as $name => $value) {
            header((string) $name . ': ' . (string) $value);
        }
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        exit;
    }

    public static function noContent(int $status = 204, array $headers = []): never
    {
        http_response_code($status);
        foreach ($headers as $name => $value) {
            header((string) $name . ': ' . (string) $value);
        }
        exit;
    }
}
