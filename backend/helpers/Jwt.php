<?php

namespace Helpers;

final class Jwt
{
    public static function encode(array $payload, string $secret): string
    {
        $header = self::base64UrlEncode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
        $body = self::base64UrlEncode(json_encode($payload));
        $signature = self::base64UrlEncode(hash_hmac('sha256', $header . '.' . $body, $secret, true));
        return $header . '.' . $body . '.' . $signature;
    }

    public static function decode(string $token, string $secret): ?array
    {
        $parts = explode('.', $token);
        if (count($parts) !== 3) return null;

        [$header, $body, $signature] = $parts;
        $validSignature = self::base64UrlEncode(hash_hmac('sha256', $header . '.' . $body, $secret, true));
        if (!hash_equals($validSignature, $signature)) return null;

        $payload = json_decode(self::base64UrlDecode($body), true);
        if (!is_array($payload)) return null;
        if (($payload['exp'] ?? 0) < time()) return null;

        return $payload;
    }

    private static function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $value): string
    {
        return base64_decode(strtr($value, '-_', '+/')) ?: '';
    }
}
