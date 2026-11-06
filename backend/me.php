<?php

declare(strict_types=1);
/* Consulta y permite editar nombre y correo propios sin modificar permisos. */
require_once __DIR__.'/business.php';
businessEndpoint(function(PDO $pdo,array $user,string $method,array $input): array {
    if ($method==='PATCH') {
        if (!array_key_exists('name',$input) && !array_key_exists('email',$input)) rejectBusiness(422,'Envía nombre o correo.');
        $name=array_key_exists('name',$input) ? textField($input,'name',100) : $user['name'];
        $email=array_key_exists('email',$input) ? textField($input,'email',120) : $user['email'];
        if (!filter_var($email,FILTER_VALIDATE_EMAIL)) rejectBusiness(422,'Correo inválido.');
        $pdo->prepare('UPDATE users SET name=?,email=? WHERE id=?')->execute([$name,$email,$user['id']]);
    } elseif ($method!=='GET') rejectBusiness(405,'Método no permitido.');
    $s=$pdo->prepare('SELECT u.id,u.username,u.email,u.name,u.status,u.role,u.department_id,u.position,d.name AS department_name FROM users u LEFT JOIN departments d ON d.id=u.department_id WHERE u.id=?');
    $s->execute([$user['id']]);$data=$s->fetch();$data['id']=(int)$data['id'];
    $data['department_id']=$data['department_id']===null ? null : (int)$data['department_id'];
    return okBusiness($data,'Perfil actualizado.');
});
