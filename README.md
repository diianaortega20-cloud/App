# App --- Ionic + Angular + PHP + MySQL

Aplicación académica desarrollada con **Ionic y Angular** que integra
inicio de sesión y un CRUD de usuarios mediante una **API en PHP**,
**Axios** y una base de datos **MySQL** ejecutada con XAMPP.

## Descripción

El proyecto permite autenticar usuarios y administrar registros de la
tabla `users`.

La aplicación se organiza mediante Tabs:

-   **Tab 1 --- Administración de usuarios:** consultar, crear,
    actualizar, cambiar estado y eliminar usuarios.
-   **Tab 2 --- Mi Perfil:** interfaz destinada a mostrar información
    del usuario.
-   **Tab 3:** sección adicional de la aplicación.

## Tecnologías

-   Ionic y Angular
-   TypeScript, HTML y SCSS
-   Axios
-   PHP
-   MySQL
-   XAMPP
-   Git y GitHub
-   Postman para pruebas de la API

## Repositorio

Repositorio del proyecto:

`https://github.com/diianaortega20-cloud/App.git`

Rama principal: `main`

## Arquitectura

``` text
Ionic / Angular
      |
      | Axios
      v
API PHP (Apache / XAMPP)
      |
      v
MySQL
```

Durante el desarrollo:

``` text
Frontend: http://localhost:8100
Backend:  http://localhost/api_9b/
```

## Estructura principal del frontend

``` text
src/app/
├── login/
├── tab1/
├── tab2/
├── tab3/
├── tabs/
├── app.component.ts
└── app.routes.ts
```

## Backend

La API PHP se encuentra fuera del proyecto Ionic, en XAMPP:

``` text
C:\xampp\htdocs\api_9b\
├── config\
│   └── database.php
├── login.php
└── users.php
```

El archivo `database.php` contiene la configuración de conexión a MySQL
y no debe publicarse si contiene credenciales sensibles.

## Base de datos

Base de datos: `ionic_login`

Tabla: `users`

  Campo             Descripción
  ----------------- ------------------------
  `id`              Identificador
  `username`        Nombre de usuario
  `email`           Correo electrónico
  `name`            Nombre
  `password_hash`   Hash de contraseña
  `status`          `active` o `inactive`
  `created_at`      Fecha de creación
  `updated_at`      Fecha de actualización

Las contraseñas se almacenan mediante hash. El inicio de sesión utiliza
`password_verify()` para verificarlas.

## Inicio de sesión

El frontend envía mediante Axios una petición:

``` text
POST http://localhost/api_9b/login.php
```

Ejemplo de cuerpo:

``` json
{
  "username": "usuario",
  "password": "contraseña"
}
```

Si las credenciales son válidas, la API devuelve los datos del usuario y
la aplicación navega hacia las Tabs.

## CRUD de usuarios

El CRUD de Tab 1 se comunica con:

``` text
http://localhost/api_9b/users.php
```

Métodos implementados:

  Método      Función
  ----------- ------------------------------------------------
  `GET`       Consultar usuarios
  `POST`      Crear usuario
  `PUT`       Actualizar usuario
  `PATCH`     Actualizar parcialmente, por ejemplo el estado
  `DELETE`    Eliminar usuario
  `OPTIONS`   Atender solicitudes CORS

Ejemplos:

``` text
GET    /api_9b/users.php
GET    /api_9b/users.php?id=2
POST   /api_9b/users.php
PUT    /api_9b/users.php?id=2
PATCH  /api_9b/users.php?id=2
DELETE /api_9b/users.php?id=2
```

Ejemplo para crear un usuario:

``` json
{
  "username": "usuario",
  "email": "usuario@example.com",
  "name": "Nombre Usuario",
  "password": "contraseña",
  "status": "active"
}
```

## CORS

La API configura CORS para permitir la comunicación entre el frontend
servido por Ionic y el backend servido por Apache durante el desarrollo.

## Tab 1 --- Administración de usuarios

Tab 1 es la interfaz del CRUD. Permite registrar usuarios, consultar los
existentes, editar información, activar o desactivar usuarios y eliminar
registros. Axios conecta estas acciones con `users.php`.

## Tab 2 --- Mi Perfil

Tab 2 comparte el estilo visual del login y está destinada a mostrar
datos como nombre, usuario, correo y estado. La pantalla contempla una
tarjeta de perfil y un botón de cierre de sesión.

## Diseño

Login, Tab 1 y Tab 2 comparten una paleta basada en:

``` text
Fondo:    #ea5c54 → #bb6dec
Paneles:  #35394a → #1f222e
Acento:   #dc6180
Texto:    #afb1be
```

La interfaz utiliza la fuente **Gudea**.

## Instalación del frontend

Clonar el repositorio:

``` bash
git clone https://github.com/diianaortega20-cloud/App.git
cd App
```

Instalar dependencias:

``` bash
npm install
```

Ejecutar:

``` bash
ionic serve
```

La aplicación estará disponible normalmente en `http://localhost:8100`.

## Requisitos del backend

Para utilizar las funciones conectadas a la API se requiere XAMPP con
Apache y MySQL activos, la API ubicada en `htdocs/api_9b`, la base de
datos `ionic_login`, la tabla `users` y una configuración válida en
`config/database.php`.

## Flujo del sistema

``` text
Usuario
   |
   v
Login Ionic
   |
   | Axios
   v
login.php
   |
   v
MySQL / users
   |
   v
Tabs
   |
   +--> Tab 1: CRUD de usuarios
   +--> Tab 2: Mi Perfil
   +--> Tab 3
```

## Seguridad

No deben publicarse contraseñas reales de MySQL, tokens, API keys,
secret keys, archivos `.env` con secretos ni llaves privadas.

Antes de subir cambios conviene revisar:

``` bash
git status
git diff --cached
```

## Control de versiones

Flujo básico:

``` bash
git status
git add <archivos>
git commit -m "Descripción de los cambios"
git push
```

## Estado del proyecto

El proyecto contempla inicio de sesión con Ionic/Axios/PHP/MySQL,
navegación mediante Tabs, API PHP de usuarios, CRUD en Tab 1, métodos
GET/POST/PUT/PATCH/DELETE, CORS, interfaz responsive, pantalla de perfil
en Tab 2 y control de versiones con Git/GitHub.

## Autor

Diana Ortega Corchado