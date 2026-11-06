<?php
declare(strict_types=1);
/* Cuenta solicitudes por departamento destinatario sin duplicar participantes. */
require_once __DIR__.'/dashboard-common.php';
dashboardEndpoint(function(PDO $pdo,array $user,array $filters): array {
    [$where,$args]=dashboardWhere($user,$filters,'r','created_at',true);
    return dashboardRows($pdo,'SELECT d.id AS department_id,d.name AS department_name,COUNT(*) AS total
        FROM requests r JOIN departments d ON d.id=r.department_id WHERE '.$where.'
        GROUP BY d.id,d.name ORDER BY total DESC,d.name,d.id',$args);
});
