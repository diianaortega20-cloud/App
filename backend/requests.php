<?php

declare(strict_types=1);
/* Registra solicitudes internas y controla su consulta, edición y resolución. */
require_once __DIR__.'/business.php';
businessEndpoint(function(PDO $pdo,array $user,string $method,array $input): array {
    if ($method==='GET') {
        $query='SELECT r.*,o.name AS requested_name,a.name AS assigned_name,d.name AS department_name FROM requests r JOIN users o ON o.id=r.requested_by LEFT JOIN users a ON a.id=r.assigned_to JOIN departments d ON d.id=r.department_id';
        $where=[];$args=[];
        if (!isAdmin($user)) { $where[]='(r.requested_by=? OR r.assigned_to=?)';$args=[$user['id'],$user['id']]; }
        if (isset($_GET['id'])) { $where[]='r.id=?';$args[]=positiveId($_GET['id']); }
        if (isset($_GET['status']) && $_GET['status']!=='') { $where[]='r.status=?';$args[]=choice($_GET,'status',['pending','in_review','resolved','rejected','cancelled']); }
        $s=$pdo->prepare($query.($where?' WHERE '.implode(' AND ',$where):'').' ORDER BY r.id DESC');$s->execute($args);$rows=$s->fetchAll();
        if (isset($_GET['id']) && !$rows) rejectBusiness(404,'Solicitud no encontrada o sin acceso.');
        return okBusiness(isset($_GET['id'])?$rows[0]:$rows);
    }
    if ($method==='POST' || $method==='PUT') {
        $subject=textField($input,'subject',150);$description=textField($input,'description',2000);
        $department=positiveId($input['department_id'] ?? null,'department_id');activeDepartment($pdo,$department);
        if ($method==='POST') {
            $pdo->prepare('INSERT INTO requests(subject,description,requested_by,department_id) VALUES(?,?,?,?)')->execute([$subject,$description,$user['id'],$department]);
            return okBusiness(['id'=>(int)$pdo->lastInsertId()],'Solicitud registrada.',201);
        }
        $id=positiveId($_GET['id'] ?? null);$r=getRecord($pdo,'requests',$id);
        if (!isAdmin($user) && (int)$r['requested_by']!==(int)$user['id']) rejectBusiness(403,'Solo el solicitante puede editar.');
        if ($r['status']!=='pending' || $r['assigned_to']!==null) rejectBusiness(409,'Solo se editan solicitudes pendientes sin asignar.');
        $pdo->prepare('UPDATE requests SET subject=?,description=?,department_id=? WHERE id=?')->execute([$subject,$description,$department,$id]);
        return okBusiness(['id'=>$id],'Solicitud actualizada.');
    }
    if ($method==='PATCH') {
        $id=positiveId($_GET['id'] ?? null);$r=getRecord($pdo,'requests',$id);
        if (!isAdmin($user) && (int)$r['requested_by']!==(int)$user['id'] && (int)$r['assigned_to']!==(int)$user['id']) rejectBusiness(403,'No tienes acceso a esta solicitud.');
        $status=choice($input,'status',['resolved','rejected','cancelled']);
        $open=in_array($r['status'],['pending','in_review'],true);
        $allowed=($status==='resolved' && $r['status']==='in_review' && (isAdmin($user) || (int)$r['assigned_to']===(int)$user['id'])) ||
            ($status==='rejected' && $open && isAdmin($user)) ||
            ($status==='cancelled' && $open && (isAdmin($user) || ($r['status']==='pending' && (int)$r['requested_by']===(int)$user['id'])));
        if (!$allowed) rejectBusiness(409,'No puedes realizar esta transición en la solicitud.');
        $resolution=textField($input,'resolution',2000,$status!=='cancelled');
        $now=utcNow();
        $pdo->prepare('UPDATE requests SET status=?,resolution=?,resolved_at=? WHERE id=?')->execute([$status,$resolution ?: null,$now,$id]);
        return okBusiness(['id'=>$id,'status'=>$status,'resolution'=>$resolution,'resolved_at'=>$now],'Solicitud actualizada.');
    }
    rejectBusiness(405,'Método no permitido.');
});
