<?php

declare(strict_types=1);

/* Revoca la sesión actual para que su token deje de permitir el acceso. */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST, OPTIONS');
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido.']);
    exit;
}

try {
    require_once __DIR__ . '/auth.php';
    $pdo = (new Database())->connect();
    $user = requireAuth($pdo);

    // Emplea la misma zona horaria que el inicio de sesión.
    $now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
    $statement = $pdo->prepare(
        'UPDATE sessions SET revoked_at = :now
         WHERE id = :id AND user_id = :user_id AND revoked_at IS NULL'
    );
    $statement->execute([
        'now' => $now->format('Y-m-d H:i:s'),
        'id' => $user['session_id'],
        'user_id' => $user['id'],
    ]);

    echo json_encode([
        'success' => true,
        'message' => 'Sesión cerrada correctamente.',
        'data' => null,
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $exception) {
    error_log('Logout: ' . $exception->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'No fue posible cerrar la sesión en el servidor.',
    ], JSON_UNESCAPED_UNICODE);
}
