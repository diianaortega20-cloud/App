<?php
declare(strict_types=1);
/* Consultas de solo lectura: conserva la autenticación y configuración existentes. */
require_once __DIR__.'/business.php';

function dashboardEndpoint(callable $handler): void
{
    if (!in_array($_SERVER['REQUEST_METHOD'], ['GET', 'OPTIONS'], true)) {
        header('Content-Type: application/json; charset=utf-8');
        header('Access-Control-Allow-Origin: *');
        header('Allow: GET, OPTIONS');
        businessResponse(405, ['success'=>false,'message'=>'Método no permitido.']);
    }
    businessEndpoint(function(PDO $pdo, array $user) use ($handler): array {
        $filters = dashboardFilters($pdo);
        return okBusiness($handler($pdo, $user, $filters), 'Información del dashboard.');
    });
}

function dashboardFilters(PDO $pdo): array
{
    $dates=[];
    foreach (['from'=>gmdate('Y-01-01'), 'to'=>gmdate('Y-12-31')] as $key=>$default) {
        $value=$_GET[$key] ?? $default;
        if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}$/D', $value)) rejectBusiness(422, 'Usa fechas YYYY-MM-DD.');
        $date=DateTimeImmutable::createFromFormat('!Y-m-d', $value, new DateTimeZone('UTC'));
        if (!$date || $date->format('Y-m-d')!==$value || $value<'1000-01-01' || $value>'9998-12-31') rejectBusiness(422, 'Fecha inválida.');
        $dates[$key]=$date;
    }
    if ($dates['from']>$dates['to'] || (int)$dates['from']->diff($dates['to'])->days>3660) rejectBusiness(422, 'El periodo debe estar ordenado y no superar 3660 días.');
    $department=null;
    if (isset($_GET['department_id'])) {
        $value=$_GET['department_id'];
        $department=is_string($value) ? filter_var($value,FILTER_VALIDATE_INT,['options'=>['min_range'=>1]]) : false;
        if ($department===false) rejectBusiness(422,'Departamento inválido.');
        $s=$pdo->prepare('SELECT id FROM departments WHERE id=?');$s->execute([$department]);
        if (!$s->fetch()) rejectBusiness(422,'Departamento inexistente.');
    }
    return ['from'=>$dates['from']->format('Y-m-d'), 'to'=>$dates['to']->format('Y-m-d'),
        'until'=>$dates['to']->modify('+1 day')->format('Y-m-d'), 'department_id'=>$department];
}

function dashboardWhere(array $user,array $filters,string $alias,string $dateColumn,bool $requests=false): array
{
    // Alias y columnas proceden exclusivamente de los endpoints, nunca del cliente.
    $where=["$alias.$dateColumn >= ?", "$alias.$dateColumn < ?"];
    $args=[$filters['from'].' 00:00:00',$filters['until'].' 00:00:00'];
    if (!isAdmin($user)) {
        $where[]=$requests ? "($alias.requested_by=? OR $alias.assigned_to=?)" : "$alias.assigned_to=?";
        $args[]=(int)$user['id'];
        if ($requests) $args[]=(int)$user['id'];
    }
    if ($filters['department_id']!==null) { $where[]="$alias.department_id=?";$args[]=$filters['department_id']; }
    return [implode(' AND ',$where),$args];
}

function dashboardRows(PDO $pdo,string $sql,array $args): array
{
    $s=$pdo->prepare($sql);$s->execute($args);$rows=$s->fetchAll();
    foreach ($rows as &$row) {
        $row['total']=(int)$row['total'];
        foreach (['employee_id','department_id'] as $key) if (isset($row[$key])) $row[$key]=(int)$row[$key];
    }
    return $rows;
}
