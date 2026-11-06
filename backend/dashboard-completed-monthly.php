<?php
declare(strict_types=1);
/* Agrupa por mes UTC de finalización y completa los meses sin registros. */
require_once __DIR__.'/dashboard-common.php';
dashboardEndpoint(function(PDO $pdo,array $user,array $filters): array {
    [$where,$args]=dashboardWhere($user,$filters,'t','completed_at');
    $rows=dashboardRows($pdo,"SELECT SUBSTR(t.completed_at,1,7) AS month,COUNT(*) AS total FROM tasks t WHERE ".$where." AND t.status='completed' GROUP BY SUBSTR(t.completed_at,1,7)",$args);
    $totals=array_column($rows,'total','month');$result=[];
    $month=new DateTimeImmutable(substr($filters['from'],0,7).'-01',new DateTimeZone('UTC'));
    $end=substr($filters['to'],0,7);
    while ($month->format('Y-m')<=$end) {
        $key=$month->format('Y-m');$result[]=['month'=>$key,'total'=>$totals[$key] ?? 0];$month=$month->modify('+1 month');
    }
    return $result;
});
