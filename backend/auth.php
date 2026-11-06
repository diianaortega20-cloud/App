<?php

declare(strict_types=1);

/*
 * Comprueba el token de acceso y devuelve el usuario autenticado.
 * Las fechas de las sesiones se comparan en UTC.
 */

require_once __DIR__ . '/config/database.php';

// Devuelve un error de autenticación y termina la petición.
function authError(int $status, string $message): void
{
    http_response_code($status);

    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');

    echo json_encode([
        'success' => false,
        'message' => $message,
    ], JSON_UNESCAPED_UNICODE);

    exit;
}

// Obtiene y valida la sesión enviada como Bearer token.
function requireAuth(PDO $pdo): array
{
    $authorization = $_SERVER['HTTP_AUTHORIZATION']
        ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
        ?? '';

    // Algunos servidores exponen Authorization mediante getallheaders().
    if ($authorization === '' && function_exists('getallheaders')) {
        foreach (getallheaders() as $name => $value) {
            if (strcasecmp($name, 'Authorization') === 0) {
                $authorization = $value;
                break;
            }
        }
    }

    if (!preg_match(
        '/^Bearer\s+([a-f0-9]{64})$/i',
        trim($authorization),
        $matches
    )) {
        authError(401, 'Debes enviar un token de acceso válido.');
    }

    // El token es sensible a mayúsculas y minúsculas.
    $tokenHash = hash('sha256', $matches[1]);

    $now = new DateTimeImmutable(
        'now',
        new DateTimeZone('UTC')
    );

    // Consulta la sesión y los permisos actuales del usuario.
    $statement = $pdo->prepare(
        'SELECT
            s.id AS session_id,
            u.id,
            u.username,
            u.email,
            u.name,
            u.status,
            u.role,
            u.department_id,
            u.position
         FROM sessions s
         INNER JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = :token_hash
           AND s.revoked_at IS NULL
           AND s.expires_at > :now
           AND u.status = :status
         LIMIT 1'
    );

    $statement->execute([
        'token_hash' => $tokenHash,
        'now' => $now->format('Y-m-d H:i:s'),
        'status' => 'active',
    ]);

    $user = $statement->fetch();

    if (!$user) {
        authError(401, 'La sesión no es válida o ha vencido.');
    }

    $user['id'] = (int) $user['id'];
    $user['session_id'] = (int) $user['session_id'];

    $user['department_id'] = $user['department_id'] !== null
        ? (int) $user['department_id']
        : null;

    return $user;
}

// Restringe una operación al rol indicado.
function requireRole(array $user, string $role): void
{
    if ($user['role'] !== $role) {
        authError(403, 'No tienes permiso para realizar esta operación.');
    }
}