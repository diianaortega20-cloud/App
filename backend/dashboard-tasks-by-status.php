<?php
declare(strict_types=1);
/* Incluye los cuatro estados aunque alguno no tenga tareas. */
require_once __DIR__.'/dashboard-common.php';
dashboardEndpoint(function(PDO $pdo,array $user,array $filters): array {
    [$where,$args]=dashboardWhere($user,$filters,'t','created_at');
    $rows=dashboardRows($pdo,'SELECT t.status,COUNT(*) AS total FROM tasks t WHERE '.$where.' GROUP BY t.status',$args);
    $totals=array_column($rows,'total','status');$result=[];
    foreach (['pending','in_progress','completed','cancelled'] as $status) $result[]=['status'=>$status,'total'=>$totals[$status] ?? 0];
    return $result;
});
