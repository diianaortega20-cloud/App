<?php

declare(strict_types=1);
/* Asigna una solicitud a un responsable activo de su departamento destino. */
require_once __DIR__.'/business.php';
businessEndpoint(function(PDO $pdo,array $user,string $method,array $input): array {
    adminOnly($user);
    if ($method!=='PATCH') rejectBusiness(405,'Método no permitido.');
    $id=positiveId($_GET['id'] ?? null);$r=getRecord($pdo,'requests',$id);
    if (!in_array($r['status'],['pending','in_review'],true)) rejectBusiness(409,'La solicitud ya está finalizada.');
    $assigned=positiveId($input['assigned_to'] ?? null,'assigned_to');$employee=activeEmployee($pdo,$assigned);
    if ((int)$employee['department_id']!==(int)$r['department_id']) rejectBusiness(422,'El responsable debe pertenecer al departamento destino.');
    $pdo->prepare("UPDATE requests SET assigned_to=?,status='in_review' WHERE id=?")->execute([$assigned,$id]);
    return okBusiness(['id'=>$id,'assigned_to'=>$assigned,'status'=>'in_review'],'Responsable asignado.');
});
