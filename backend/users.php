<?php

declare(strict_types=1);
/* Conserva el CRUD y agrega rol, departamento, puesto y protección del administrador. */
require_once __DIR__.'/business.php';

function publicEmployee(array $u): array {
    unset($u['password_hash']);
    $u['id']=(int)$u['id'];
    $u['department_id']=$u['department_id'] === null ? null : (int)$u['department_id'];
    return $u;
}
function keepAdministrator(PDO $pdo, array $actor, array $target, string $role, string $status, bool $delete=false): void {
    if ((int)$target['id'] === (int)$actor['id'] && ($delete || $role !== 'admin' || $status !== 'active')) {
        rejectBusiness(409,'No puedes eliminar, desactivar ni quitar el rol administrador a tu propia cuenta.');
    }
    if ($target['role']==='admin' && $target['status']==='active' && ($delete || $role!=='admin' || $status!=='active')) {
        $count=(int)$pdo->query("SELECT COUNT(*) FROM users WHERE role='admin' AND status='active'")->fetchColumn();
        if ($count<=1) rejectBusiness(409,'Debe permanecer un administrador activo.');
    }
}
businessEndpoint(function(PDO $pdo,array $actor,string $method,array $input): array {
    adminOnly($actor);
    if ($method==='GET') {
        $sql='SELECT u.*,d.name AS department_name FROM users u LEFT JOIN departments d ON d.id=u.department_id';
        if (isset($_GET['id'])) {
            $id=positiveId($_GET['id']);getRecord($pdo,'users',$id);
            $s=$pdo->prepare($sql.' WHERE u.id=?');$s->execute([$id]);
            return ['body'=>['success'=>true,'user'=>publicEmployee($s->fetch())]];
        }
        return ['body'=>['success'=>true,'users'=>array_map('publicEmployee',$pdo->query($sql.' ORDER BY u.id DESC')->fetchAll())]];
    }
    $id=$method==='POST' ? null : positiveId($_GET['id'] ?? null);
    $target=$id ? getRecord($pdo,'users',$id) : null;
    if ($method==='POST' || $method==='PUT') {
        $username=textField($input,'username',50);$name=textField($input,'name',100);
        $email=textField($input,'email',120);
        if (!filter_var($email,FILTER_VALIDATE_EMAIL)) rejectBusiness(422,'Correo electrónico inválido.');
        $password=$input['password'] ?? '';
        if (!is_string($password) || ($method==='POST' && $password==='')) rejectBusiness(422,'La contraseña es obligatoria al crear usuarios.');
        // Bcrypt admite hasta 72 bytes; conserva compatibilidad con contraseñas anteriores.
        if (strlen($password)>72) rejectBusiness(422,'La contraseña no puede exceder 72 bytes.');
        $role=choice($input,'role',['admin','employee'],$target['role'] ?? 'employee');
        $status=choice($input,'status',['active','inactive'],$target['status'] ?? 'active');
        $department=optionalId($input['department_id'] ?? ($target['department_id'] ?? null));
        // null explícito permite retirar el departamento.
        if (array_key_exists('department_id',$input)) $department=optionalId($input['department_id']);
        $position=textField($input,'position',100,false);
        if ($department!==null) {
            $d=getRecord($pdo,'departments',$department);
            if ($d['status']!=='active' && (!$target || (int)$target['department_id']!==$department)) rejectBusiness(422,'Selecciona un departamento activo.');
        }
        if ($target) {
            keepAdministrator($pdo,$actor,$target,$role,$status);
            if ($department !== ($target['department_id']===null ? null : (int)$target['department_id'])) {
                $s=$pdo->prepare("SELECT COUNT(*) FROM requests WHERE assigned_to=? AND status='in_review'");$s->execute([$id]);
                if ((int)$s->fetchColumn()>0) rejectBusiness(409,'Reasigna las solicitudes abiertas antes de cambiar el departamento.');
            }
            if ($target['status']==='active' && $status==='inactive') {
                foreach (["SELECT COUNT(*) FROM tasks WHERE assigned_to=? AND status IN ('pending','in_progress')",
                    "SELECT COUNT(*) FROM requests WHERE assigned_to=? AND status='in_review'"] as $sql) {
                    $s=$pdo->prepare($sql);$s->execute([$id]);
                    if ((int)$s->fetchColumn()>0) rejectBusiness(409,'Reasigna o finaliza las tareas y solicitudes antes de desactivar al responsable.');
                }
            }
            $hash=$password!=='' ? password_hash($password,PASSWORD_DEFAULT) : $target['password_hash'];
            $pdo->prepare('UPDATE users SET username=?,email=?,name=?,password_hash=?,status=?,role=?,department_id=?,position=? WHERE id=?')
                ->execute([$username,$email,$name,$hash,$status,$role,$department,$position ?: null,$id]);
            if ($password!=='' || $status==='inactive') {
                $pdo->prepare('UPDATE sessions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL')->execute([utcNow(),$id]);
            }
            return ['body'=>['success'=>true,'message'=>'Usuario actualizado correctamente.']];
        }
        $pdo->prepare('INSERT INTO users(username,email,name,password_hash,status,role,department_id,position) VALUES(?,?,?,?,?,?,?,?)')
            ->execute([$username,$email,$name,password_hash($password,PASSWORD_DEFAULT),$status,$role,$department,$position ?: null]);
        return ['http'=>201,'body'=>['success'=>true,'message'=>'Usuario creado correctamente.','id'=>(int)$pdo->lastInsertId()]];
    }
    if ($method==='PATCH') {
        $status=choice($input,'status',['active','inactive']);
        keepAdministrator($pdo,$actor,$target,$target['role'],$status);
        if ($status==='inactive') {
            foreach (["SELECT COUNT(*) FROM tasks WHERE assigned_to=? AND status IN ('pending','in_progress')",
                "SELECT COUNT(*) FROM requests WHERE assigned_to=? AND status='in_review'"] as $sql) {
                $s=$pdo->prepare($sql);$s->execute([$id]);
                if ((int)$s->fetchColumn()>0) rejectBusiness(409,'El usuario tiene actividades abiertas. Reasígnalas primero.');
            }
            $pdo->prepare('UPDATE sessions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL')->execute([utcNow(),$id]);
        }
        $pdo->prepare('UPDATE users SET status=? WHERE id=?')->execute([$status,$id]);
        return ['body'=>['success'=>true,'message'=>'Estado actualizado correctamente.']];
    }
    if ($method==='DELETE') {
        keepAdministrator($pdo,$actor,$target,$target['role'],$target['status'],true);
        // Las claves foráneas impiden borrar usuarios con historial de tareas o solicitudes.
        $pdo->prepare('DELETE FROM users WHERE id=?')->execute([$id]);
        return ['body'=>['success'=>true,'message'=>'Usuario eliminado correctamente.']];
    }
    rejectBusiness(405,'Método no permitido.');
});
