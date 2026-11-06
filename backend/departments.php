<?php

declare(strict_types=1);
/* Consulta y administra departamentos conservando sus relaciones históricas. */
require_once __DIR__.'/business.php';
businessEndpoint(function(PDO $pdo, array $user, string $method, array $input): array {
    if ($method === 'GET') {
        if (isset($_GET['id'])) {
            adminOnly($user);
            return okBusiness(getRecord($pdo, 'departments', positiveId($_GET['id'])));
        }
        $where = isAdmin($user) ? '' : " WHERE status = 'active'";
        return okBusiness($pdo->query('SELECT * FROM departments'.$where.' ORDER BY name')->fetchAll());
    }
    adminOnly($user);
    if ($method === 'POST' || $method === 'PUT') {
        $name = textField($input, 'name', 100);
        $description = textField($input, 'description', 500, false);
        if ($method === 'POST') {
            $s=$pdo->prepare('INSERT INTO departments(name,description) VALUES(?,?)');
            $s->execute([$name,$description]);
            return okBusiness(['id'=>(int)$pdo->lastInsertId()], 'Departamento creado.', 201);
        }
        $id=positiveId($_GET['id'] ?? null); getRecord($pdo,'departments',$id);
        $pdo->prepare('UPDATE departments SET name=?,description=? WHERE id=?')->execute([$name,$description,$id]);
        return okBusiness(getRecord($pdo,'departments',$id), 'Departamento actualizado.');
    }
    if ($method === 'PATCH') {
        $id=positiveId($_GET['id'] ?? null);getRecord($pdo,'departments',$id);
        $status=choice($input,'status',['active','inactive']);
        if ($status === 'inactive') {
            foreach (["SELECT COUNT(*) FROM users WHERE department_id=? AND status='active'",
                "SELECT COUNT(*) FROM tasks WHERE department_id=? AND status IN ('pending','in_progress')",
                "SELECT COUNT(*) FROM requests WHERE department_id=? AND status IN ('pending','in_review')"] as $sql) {
                $s=$pdo->prepare($sql);$s->execute([$id]);
                if ((int)$s->fetchColumn()>0) rejectBusiness(409,'Reasigna empleados y atiende o cancela actividades abiertas antes de desactivar el departamento.');
            }
        }
        $pdo->prepare('UPDATE departments SET status=? WHERE id=?')->execute([$status,$id]);
        return okBusiness(['id'=>$id,'status'=>$status], 'Estado actualizado.');
    }
    rejectBusiness(405,'Método no permitido.');
});
