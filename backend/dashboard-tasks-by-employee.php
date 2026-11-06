<?php
declare(strict_types=1);
/* Cuenta tareas creadas en el periodo por responsable, con permisos del token. */
require_once __DIR__.'/dashboard-common.php';
dashboardEndpoint(function(PDO $pdo,array $user,array $filters): array {
    [$where,$args]=dashboardWhere($user,$filters,'t','created_at');
    return dashboardRows($pdo,'SELECT u.id AS employee_id,u.name AS employee_name,COUNT(*) AS total
        FROM tasks t JOIN users u ON u.id=t.assigned_to WHERE '.$where.'
        GROUP BY u.id,u.name ORDER BY total DESC,u.name,u.id',$args);
});
