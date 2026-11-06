<?php

declare(strict_types=1);

final class Database
{
    private string $host = 'localhost';
    private string $dbName = 'ionic_login';
    private string $username = 'TU_USUARIO';
    private string $password = 'TU_CONTRASENA';

    public function connect(): PDO
    {
        $dsn = "mysql:host={$this->host};dbname={$this->dbName};charset=utf8mb4";

        return new PDO($dsn, $this->username, $this->password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }
}