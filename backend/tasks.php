<?php

declare(strict_types=1);
/* Asigna tareas y controla sus transiciones y visibilidad por responsable. */
require_once __DIR__.'/business.php';
businessEndpoint(function(PDO $pdo,array $user,string $method,array $input): array {
    $query='SELECT t.*,u.name AS assigned_name,d.name AS department_name FROM tasks t JOIN users u ON u.id=t.assigned_to JOIN departments d ON d.id=t.department_id';
    if ($method==='GET') {
        $where=[];$args=[];
        if (!isAdmin($user)) { $where[]='t.assigned_to=?';$args[]=$user['id']; }
        if (isset($_GET['id'])) { $where[]='t.id=?';$args[]=positiveId($_GET['id']); }
        if (isset($_GET['status']) && $_GET['status']!=='') { $where[]='t.status=?';$args[]=choice($_GET,'status',['pending','in_progress','completed','cancelled']); }
        $s=$pdo->prepare($query.($where ? ' WHERE '.implode(' AND ',$where) : '').' ORDER BY t.id DESC');$s->execute($args);$rows=$s->fetchAll();
        if (isset($_GET['id']) && !$rows) rejectBusiness(404,'Tarea no encontrada o sin acceso.');
        return okBusiness(isset($_GET['id']) ? $rows[0] : $rows);
    }
    if ($method==='POST' || $method==='PUT') {
        adminOnly($user);
        $title=textField($input,'title',150);$description=textField($input,'description',2000,false);
        $assignee=positiveId($input['assigned_to'] ?? null,'assigned_to');$employee=activeEmployee($pdo,$assignee);
        $priority=choice($input,'priority',['low','medium','high'],'medium');
        $due=textField($input,'due_date',10);
        $date=DateTimeImmutable::createFromFormat('!Y-m-d',$due);
        if (!$date || $date->format('Y-m-d')!==$due) rejectBusiness(422,'Fecha límite inválida.');
        if ($method==='POST') {
            if ($due < date('Y-m-d')) rejectBusiness(422,'La fecha límite no puede ser anterior a hoy.');
            $pdo->prepare('INSERT INTO tasks(title,description,assigned_to,created_by,department_id,priority,due_date) VALUES(?,?,?,?,?,?,?)')
                ->execute([$title,$description,$assignee,$user['id'],$employee['department_id'],$priority,$due]);
            return okBusiness(['id'=>(int)$pdo->lastInsertId()],'Tarea creada.',201);
        }
        $id=positiveId($_GET['id'] ?? null);$task=getRecord($pdo,'tasks',$id);
        if (!in_array($task['status'],['pending','in_progress'],true)) rejectBusiness(409,'Las tareas finalizadas no se editan.');
        if ($due!==$task['due_date'] && $due<date('Y-m-d')) rejectBusiness(422,'La nueva fecha límite no puede ser anterior a hoy.');
        // Conserva la clasificación histórica si no cambió el responsable.
        $department=$assignee===(int)$task['assigned_to'] ? $task['department_id'] : $employee['department_id'];
        $pdo->prepare('UPDATE tasks SET title=?,description=?,assigned_to=?,department_id=?,priority=?,due_date=? WHERE id=?')
            ->execute([$title,$description,$assignee,$department,$priority,$due,$id]);
        return okBusiness(['id'=>$id],'Tarea actualizada.');
    }
    if ($method==='PATCH') {
        $id=positiveId($_GET['id'] ?? null);$task=getRecord($pdo,'tasks',$id);
        if (!isAdmin($user) && (int)$task['assigned_to']!==(int)$user['id']) rejectBusiness(403,'Solo el responsable puede actualizar esta tarea.');
        $status=choice($input,'status',['in_progress','completed','cancelled']);
        $valid=($task['status']==='pending' && $status==='in_progress') ||
            ($task['status']==='in_progress' && $status==='completed') ||
            (isAdmin($user) && in_array($task['status'],['pending','in_progress'],true) && $status==='cancelled');
        if (!$valid) rejectBusiness(409,'Cambio de estado no permitido.');
        $completed=$status==='completed' ? utcNow() : null;
        $pdo->prepare('UPDATE tasks SET status=?,completed_at=? WHERE id=?')->execute([$status,$completed,$id]);
        return okBusiness(['id'=>$id,'status'=>$status,'completed_at'=>$completed],'Estado actualizado.');
    }
    rejectBusiness(405,'Método no permitido.');
});
