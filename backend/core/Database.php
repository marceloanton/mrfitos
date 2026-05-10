<?php

namespace Core;

use PDO;
use PDOException;

final class Database
{
    private static ?PDO $conn = null;

    public static function connection(): PDO
    {
        if (self::$conn instanceof PDO) {
            return self::$conn;
        }

        $host = Env::get('DB_HOST', '127.0.0.1');
        $port = Env::get('DB_PORT', '3306');
        $db = Env::get('DB_DATABASE', 'gymsaas');
        $user = Env::get('DB_USERNAME', 'root');
        $pass = Env::get('DB_PASSWORD', '');

        $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $host, $port, $db);

        try {
            self::$conn = new PDO($dsn, $user, $pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
            ]);
        } catch (PDOException $e) {
            Response::json(['success' => false, 'message' => 'Database connection error'], 500);
        }

        return self::$conn;
    }
}
