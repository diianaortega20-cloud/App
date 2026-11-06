<?php

declare(strict_types=1);

/* Funciones compartidas de validación, permisos y transacciones de los módulos. */
require_once __DIR__ . '/auth.php';

function businessResponse(int $status, array $body): void
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}
function rejectBusiness(int $status, string $message): never
{
    throw new RuntimeException($message, $status);
}
function textField(array $input, string $key, int $max, bool $required = true): string
{
    $value = $input[$key] ?? '';
    if (!is_string($value)) rejectBusiness(422, "El campo $key debe ser texto.");
    $value = trim($value);
    if (($required && $value === '') || mb_strlen($value) > $max) {
        rejectBusiness(422, "Revisa $key: " . ($required ? 'obligatorio, ' : '') . "máximo $max caracteres.");
    }
    return $value;
}
function positiveId(mixed $value, string $field = 'id'): int
{
    if (!is_int($value) && !is_string($value)) rejectBusiness(400, "$field debe ser un ID positivo.");
    $id = filter_var($value, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
    if ($id === false) rejectBusiness(400, "$field debe ser un ID positivo.");
    return $id;
}
function optionalId(mixed $value): ?int
{
    return $value === null || $value === '' ? null : positiveId($value);
}
function choice(array $input, string $field, array $allowed, ?string $default = null): string
{
    $value = $input[$field] ?? $default;
    if (!is_string($value) || !in_array($value, $allowed, true)) rejectBusiness(422, "Valor no permitido para $field.");
    return $value;
}
function getRecord(PDO $pdo, string $table, int $id): array
{
    // Los nombres de tabla se definen dentro de PHP, nunca desde la petición.
    if (!in_array($table, ['users','departments','tasks','requests'], true)) throw new LogicException('Tabla no válida.');
    $stmt = $pdo->prepare("SELECT * FROM $table WHERE id = ?");
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) rejectBusiness(404, 'Registro no encontrado.');
    return $row;
}
function activeDepartment(PDO $pdo, int $id): array
{
    $row = getRecord($pdo, 'departments', $id);
    if ($row['status'] !== 'active') rejectBusiness(409, 'El departamento está inactivo.');
    return $row;
}
function activeEmployee(PDO $pdo, int $id): array
{
    $row = getRecord($pdo, 'users', $id);
    if ($row['status'] !== 'active' || $row['department_id'] === null) rejectBusiness(422, 'El responsable debe estar activo y tener departamento.');
    activeDepartment($pdo, (int)$row['department_id']);
    return $row;
}
function isAdmin(array $user): bool { return $user['role'] === 'admin'; }
function adminOnly(array $user): void
{
    if (!isAdmin($user)) rejectBusiness(403, 'Esta operación requiere rol administrador.');
}
function utcNow(): string { return gmdate('Y-m-d H:i:s'); }
function businessEndpoint(callable $handler): void
{
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
    $pdo = null;
    try {
        $pdo = (new Database())->connect();
        $user = requireAuth($pdo);
        $method = $_SERVER['REQUEST_METHOD'];
        $input = [];
        if (in_array($method, ['POST','PUT','PATCH'], true)) {
            $object = json_decode(file_get_contents('php://input'), false, 512, JSON_THROW_ON_ERROR);
            if (!$object instanceof stdClass) rejectBusiness(400, 'Envía un objeto JSON.');
            $input = (array)$object;
        }
        if ($method !== 'GET') {
            $pdo->beginTransaction();
            // Serializa las modificaciones de este pequeño sistema para proteger relaciones y administradores.
            $pdo->query('SELECT id FROM departments ORDER BY id FOR UPDATE')->fetchAll();
            $pdo->query('SELECT id FROM users ORDER BY id FOR UPDATE')->fetchAll();
            $current = getRecord($pdo, 'users', (int)$user['id']);
            if ($current['status'] !== 'active') rejectBusiness(401, 'La cuenta ya no está activa.');
            $current['id'] = (int)$current['id'];
            $user = array_merge($user, $current);
        }
        $result = $handler($pdo, $user, $method, $input);
        if ($pdo->inTransaction()) $pdo->commit();
        businessResponse($result['http'] ?? 200, $result['body']);
    } catch (JsonException $e) {
        if ($pdo && $pdo->inTransaction()) $pdo->rollBack();
        businessResponse(400, ['success'=>false,'message'=>'El JSON enviado no es válido.']);
    } catch (PDOException $e) {
        if ($pdo && $pdo->inTransaction()) $pdo->rollBack();
        error_log('Empresa: '.$e->getMessage());
        $code = (int)($e->errorInfo[1] ?? 0);
        businessResponse(in_array($code,[1062,1451,1452],true) ? 409 : 500,
            ['success'=>false,'message'=>$code === 1062 ? 'Ya existe ese nombre, usuario o correo.' :
            (in_array($code,[1451,1452],true) ? 'El registro tiene relaciones. Revisa las asignaciones o utiliza desactivación.' : 'Error de base de datos.')]);
    } catch (Throwable $e) {
        if ($pdo && $pdo->inTransaction()) $pdo->rollBack();
        $status = in_array($e->getCode(), [400,401,403,404,405,409,422], true) ? $e->getCode() : 500;
        if ($status === 500) error_log('Empresa: '.$e->getMessage());
        businessResponse($status, ['success'=>false,'message'=>$status === 500 ? 'Error interno del servidor.' : $e->getMessage()]);
    }
}
function okBusiness(mixed $data, string $message = 'Operación realizada.', int $http = 200): array
{
    return ['http'=>$http,'body'=>['success'=>true,'message'=>$message,'data'=>$data]];
}
