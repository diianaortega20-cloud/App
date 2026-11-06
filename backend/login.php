<?php

declare(strict_types=1);

/*
 * Valida las credenciales y crea una sesión de acceso de 8 horas.
 * Devuelve los datos públicos del usuario y un token temporal.
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Responde a la verificación previa de CORS.
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Envía una respuesta JSON y termina la petición.
function respond(int $status, array $body): void
{
    http_response_code($status);

    echo json_encode($body, JSON_UNESCAPED_UNICODE);

    exit;
}

// Solo permite iniciar sesión mediante POST.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST, OPTIONS');

    respond(405, [
        'success' => false,
        'message' => 'Método no permitido.',
    ]);
}

try {
    require_once __DIR__ . '/config/database.php';

    // Lee el objeto JSON recibido.
    $input = json_decode(
        file_get_contents('php://input'),
        false,
        512,
        JSON_THROW_ON_ERROR
    );

    if (!$input instanceof stdClass) {
        respond(400, [
            'success' => false,
            'message' => 'Debes enviar un objeto JSON.',
        ]);
    }

    // Comprueba los tipos de las credenciales.
    if (
        !isset($input->username, $input->password) ||
        !is_string($input->username) ||
        !is_string($input->password)
    ) {
        respond(422, [
            'success' => false,
            'message' => 'Usuario y contraseña deben ser texto.',
        ]);
    }

    $username = trim($input->username);
    $password = $input->password;

    if ($username === '' || $password === '') {
        respond(422, [
            'success' => false,
            'message' => 'Usuario y contraseña son obligatorios.',
        ]);
    }

    // Busca al usuario por nombre de usuario o correo.
    $pdo = (new Database())->connect();

    $statement = $pdo->prepare(
        'SELECT
            id,
            username,
            email,
            name,
            password_hash,
            status,
            role,
            department_id,
            position
         FROM users
         WHERE username = :username OR email = :email
         LIMIT 1'
    );

    $statement->execute([
        'username' => $username,
        'email' => $username,
    ]);

    $user = $statement->fetch();

    // Rechaza credenciales incorrectas o cuentas inactivas.
    if (
        !$user ||
        $user['status'] !== 'active' ||
        !password_verify($password, $user['password_hash'])
    ) {
        respond(401, [
            'success' => false,
            'message' => 'Usuario o contraseña incorrectos.',
        ]);
    }

    // Genera el token. En MySQL solo se guarda su hash.
    $token = bin2hex(random_bytes(32));
    $tokenHash = hash('sha256', $token);

    // Usa UTC para guardar y comprobar las sesiones.
    $createdAt = new DateTimeImmutable(
        'now',
        new DateTimeZone('UTC')
    );

    $expiresAt = $createdAt->modify('+8 hours');

    // Registra la sesión del usuario.
    $statement = $pdo->prepare(
        'INSERT INTO sessions
            (user_id, token_hash, expires_at, created_at)
         VALUES
            (:user_id, :token_hash, :expires_at, :created_at)'
    );

    $statement->execute([
        'user_id' => (int) $user['id'],
        'token_hash' => $tokenHash,
        'expires_at' => $expiresAt->format('Y-m-d H:i:s'),
        'created_at' => $createdAt->format('Y-m-d H:i:s'),
    ]);

    // Conserva el formato que ya consume el frontend.
    respond(200, [
        'success' => true,
        'message' => 'Inicio de sesión correcto.',
        'user' => [
            'id' => (int) $user['id'],
            'username' => $user['username'],
            'email' => $user['email'],
            'name' => $user['name'],
            'status' => $user['status'],
            'role' => $user['role'],
            'department_id' => $user['department_id'] !== null
                ? (int) $user['department_id']
                : null,
            'position' => $user['position'],
        ],
        'token' => $token,
        'expires_at' => $expiresAt->format('Y-m-d\TH:i:s\Z'),
    ]);

} catch (JsonException $exception) {
    respond(400, [
        'success' => false,
        'message' => 'El JSON enviado no es válido.',
    ]);

} catch (Throwable $exception) {
    error_log('Login: ' . $exception->getMessage());

    respond(500, [
        'success' => false,
        'message' => 'Error interno del servidor.',
    ]);
}