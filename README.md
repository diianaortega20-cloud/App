# App — Ionic + Angular + PHP + MySQL

Aplicación académica desarrollada con **Ionic y Angular** que integra
inicio de sesión y un CRUD de usuarios mediante una **API en PHP**,
**Axios** y una base de datos **MySQL** ejecutada con XAMPP.

## Descripción

El proyecto permite autenticar usuarios y administrar registros de la
tabla `users`.

La aplicación se organiza mediante Tabs:

- **Tab 1 — Administración de usuarios:** consultar, crear, actualizar,
  cambiar estado y eliminar usuarios.
- **Tab 2 — Mi Perfil:** interfaz destinada a mostrar información
  del usuario.
- **Tab 3:** sección adicional de la aplicación.

Además, la aplicación cuenta con una estrategia básica de funcionamiento
offline que permite detectar la pérdida de conexión y mostrar la última
lista de usuarios almacenada temporalmente.

## Tecnologías

- Ionic y Angular
- TypeScript, HTML y SCSS
- Axios
- PHP
- MySQL
- XAMPP
- LocalStorage
- Git y GitHub
- Postman para pruebas de la API

## Repositorio

Repositorio del proyecto:

`https://github.com/diianaortega20-cloud/App.git`

Rama principal: `main`

## Arquitectura

```text
Ionic / Angular
      |
      | UserService + Axios
      v
API PHP (Apache / XAMPP)
      |
      v
MySQL
```

Para el funcionamiento offline básico:

```text
API / MySQL
     |
     v
UserService
     |
     v
Tab1Page
     |
     +----> Interfaz
     |
     +----> LocalStorage (caché)
```

Durante el desarrollo:

```text
Frontend: http://localhost:8100
Backend:  http://localhost/api_9b/
```

## Estructura principal del frontend

```text
src/app/
├── login/
├── models/
│   └── user.interface.ts
├── services/
│   └── user.service.ts
├── tab1/
├── tab2/
├── tab3/
├── tabs/
├── app.component.ts
└── app.routes.ts
```

## Backend

La API PHP se encuentra fuera del proyecto Ionic, en XAMPP:

```text
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

| Campo | Descripción |
|---|---|
| `id` | Identificador |
| `username` | Nombre de usuario |
| `email` | Correo electrónico |
| `name` | Nombre |
| `password_hash` | Hash de contraseña |
| `status` | `active` o `inactive` |
| `created_at` | Fecha de creación |
| `updated_at` | Fecha de actualización |

Las contraseñas se almacenan mediante hash. El inicio de sesión utiliza
`password_verify()` para verificarlas.

## Inicio de sesión

El frontend envía mediante Axios una petición:

```text
POST http://localhost/api_9b/login.php
```

Ejemplo de cuerpo:

```json
{
  "username": "usuario",
  "password": "contraseña"
}
```

Si las credenciales son válidas, la API devuelve los datos del usuario y
la aplicación navega hacia las Tabs.

## Modelo de datos en TypeScript

La aplicación utiliza dos interfaces principales:

- `User`: representa los datos de un usuario obtenidos desde la API.
- `UserForm`: representa los datos utilizados en el formulario para
  crear o modificar usuarios.

Estas interfaces se encuentran en:

```text
src/app/models/user.interface.ts
```

## Capa de acceso a datos

La aplicación utiliza un servicio de Angular para separar las operaciones
de acceso a datos de los componentes de la interfaz.

El servicio se encuentra en:

```text
src/app/services/user.service.ts
```

`Tab1Page` utiliza `UserService` y el servicio se comunica mediante Axios
con la API PHP.

```text
Tab1Page
    |
    v
UserService
    |
    v
Axios
    |
    v
users.php
    |
    v
MySQL
```

## CRUD de usuarios

El CRUD de Tab 1 se comunica con:

```text
http://localhost/api_9b/users.php
```

Métodos implementados:

| Método | Función |
|---|---|
| `GET` | Consultar usuarios |
| `POST` | Crear usuario |
| `PUT` | Actualizar usuario |
| `PATCH` | Cambiar el estado |
| `DELETE` | Eliminar usuario |
| `OPTIONS` | Atender solicitudes CORS |

Ejemplos:

```text
GET    /api_9b/users.php
GET    /api_9b/users.php?id=2
POST   /api_9b/users.php
PUT    /api_9b/users.php?id=2
PATCH  /api_9b/users.php?id=2
DELETE /api_9b/users.php?id=2
```

Ejemplo para crear un usuario:

```json
{
  "username": "usuario",
  "email": "usuario@example.com",
  "name": "Nombre Usuario",
  "password": "contraseña",
  "status": "active"
}
```

## Persistencia

Los usuarios se almacenan de forma persistente en la base de datos
MySQL. Esto permite que la información permanezca disponible aunque
la aplicación se cierre y posteriormente se vuelva a ejecutar.

MySQL es el almacenamiento principal de la aplicación.

## Funcionamiento offline básico

La aplicación implementa una estrategia básica para reaccionar ante
problemas de conexión.

Se utiliza `navigator.onLine` para conocer el estado de conexión y los
eventos `online` y `offline` para detectar cambios mientras la aplicación
se encuentra abierta.

Cuando existe conexión:

```text
API PHP
   |
   v
Usuarios de MySQL
   |
   v
Tab1
   |
   v
LocalStorage
```

La última lista de usuarios obtenida correctamente se almacena
temporalmente en `localStorage` utilizando la clave:

```text
cached_users
```

Cuando se pierde la conexión, Tab 1 recupera esa información y muestra
los últimos usuarios almacenados.

La interfaz también informa el estado:

```text
● Conectado
```

o:

```text
● Sin conexión
```

Cuando no existe conexión se permite consultar la información almacenada,
pero las operaciones que modifican la base de datos requieren conexión:

| Operación | Sin conexión |
|---|---|
| Consultar usuarios almacenados | Sí |
| Crear usuario | No |
| Editar usuario | No |
| Cambiar estado | No |
| Eliminar usuario | No |

Si la API no está disponible, la aplicación muestra mensajes adecuados,
por ejemplo:

```text
Sin conexión. Mostrando datos almacenados.
```

o:

```text
Necesitas conexión para guardar cambios.
```

## Prueba de funcionamiento offline

La funcionalidad offline puede comprobarse desde las herramientas de
desarrollo del navegador:

1. Ejecutar normalmente la aplicación y acceder a Tab 1.
2. Esperar a que los usuarios sean consultados y almacenados en caché.
3. Abrir las herramientas de desarrollo del navegador.
4. En la sección Network cambiar la conexión de `No throttling` a `Offline`.
5. Sin recargar completamente la aplicación, comprobar que cambia el
   estado a `Sin conexión`.
6. Verificar que los últimos usuarios almacenados continúan visibles.
7. Intentar una operación de modificación y comprobar que se muestra
   un mensaje indicando que se necesita conexión.
8. Restaurar `No throttling` y comprobar que la aplicación detecta
   nuevamente la conexión.

## Manejo de errores

Las operaciones asíncronas utilizan manejo de errores para evitar que
un fallo de la API detenga el funcionamiento de la interfaz.

Cuando ocurre un problema se muestran mensajes relacionados con la
operación realizada.

Entre los casos considerados se encuentran:

- Error al consultar usuarios.
- Error al crear o modificar usuarios.
- Error al eliminar usuarios.
- API o servidor no disponible.
- Pérdida de conexión.
- Ausencia de datos almacenados en caché.

## CORS

La API configura CORS para permitir la comunicación entre el frontend
servido por Ionic y el backend servido por Apache durante el desarrollo.

## Tab 1 — Administración de usuarios

Tab 1 es la interfaz principal del CRUD. Permite registrar usuarios,
consultar los existentes, editar información, activar o desactivar
usuarios y eliminar registros.

También contiene la detección del estado de conexión y la recuperación
de los usuarios almacenados temporalmente cuando no existe conexión.

## Tab 2 — Mi Perfil

Tab 2 comparte el estilo visual del login y está destinada a mostrar
datos como nombre, usuario, correo y estado. La pantalla contempla una
tarjeta de perfil y un botón de cierre de sesión.

## Diseño

Login, Tab 1 y Tab 2 comparten una paleta basada en:

```text
Fondo:    #ea5c54 → #bb6dec
Paneles:  #35394a → #1f222e
Acento:   #dc6180
Texto:    #afb1be
```

La interfaz utiliza la fuente **Gudea**.

## Instalación del frontend

Clonar el repositorio:

```bash
git clone https://github.com/diianaortega20-cloud/App.git
cd App
```

Instalar dependencias:

```bash
npm install
```

Ejecutar:

```bash
ionic serve
```

La aplicación estará disponible normalmente en:

```text
http://localhost:8100
```

## Requisitos del backend

Para utilizar las funciones conectadas a la API se requiere:

- XAMPP con Apache y MySQL activos.
- API ubicada en `htdocs/api_9b`.
- Base de datos `ionic_login`.
- Tabla `users`.
- Configuración válida en `config/database.php`.

## Flujo del sistema

```text
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
   |       |
   |       +--> UserService
   |       +--> Caché LocalStorage
   |
   +--> Tab 2: Mi Perfil
   |
   +--> Tab 3
```

## Seguridad

No deben publicarse contraseñas reales de MySQL, tokens, API keys,
secret keys, archivos `.env` con secretos ni llaves privadas.

Las contraseñas de los usuarios no se almacenan en el caché de Tab 1.
La API devuelve únicamente los datos necesarios para mostrar los usuarios.

Antes de subir cambios conviene revisar:

```bash
git status
git diff --cached
```

## Control de versiones

Flujo básico:

```bash
git status
git add <archivos>
git commit -m "Descripción de los cambios"
git push
```

## Estado del proyecto

Actualmente el proyecto incluye:

- Inicio de sesión.
- Navegación mediante Tabs.
- Modelo de datos.
- Interfaces `User` y `UserForm`.
- Servicio `UserService`.
- API PHP.
- Base de datos MySQL.
- CRUD completo de usuarios.
- Persistencia de información.
- Manejo de errores.
- Detección del estado de conexión.
- Caché temporal mediante `localStorage`.
- Consulta básica de información sin conexión.
- Mensajes de conexión y errores.
- CORS.
- Interfaz responsive.
- Pantalla de perfil en Tab 2.
- Control de versiones con Git y GitHub.

## Autor

Diana Ortega Corchado