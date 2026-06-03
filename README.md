# Aplicación dinámica

Aplicación web dinámica para gestionar grupos y tareas mediante operaciones CRUD, ejecutada con contenedores Docker.

## Tecnologías usadas

- PHP
- Apache
- MySQL 8.0
- Docker
- Docker Compose

## Estructura del proyecto

```text
app-dinamica/
├── app/
│   ├── index.php
│   ├── conexion.php
│   ├── Dockerfile
│   ├── api/
│   ├── assets/
│   └── uploads/
├── db/
│   └── init.sql
├── informe/
│   └── .gitkeep
├── .env.example
├── .gitignore
├── docker-compose.yml
└── README.md
```

## Requisitos previos

- Docker
- Docker Compose

## Levantar el proyecto desde cero

1. Clonar el repositorio.
2. Crear el archivo de entorno:

   ```bash
   cp .env.example .env
   ```

3. Construir los contenedores:

   ```bash
   docker-compose build
   ```

4. Iniciar el entorno:

   ```bash
   docker-compose up -d
   ```

5. Verificar que los contenedores estén activos:

   ```bash
   docker ps
   ```

6. Revisar los logs de la base de datos:

   ```bash
   docker-compose logs base_datos
   ```

7. Abrir la aplicación en el navegador:

   ```text
   http://localhost:8080
   ```

## Operaciones CRUD disponibles

La aplicación permite gestionar grupos y tareas:

- Crear grupos.
- Listar grupos con sus tareas y estados.
- Editar grupos existentes.
- Eliminar grupos completos.
- Crear tareas dentro de un grupo.
- Marcar tareas como completadas o pendientes.
- Editar tareas existentes.
- Eliminar tareas.

## Detener el proyecto

```bash
docker-compose down
```

## Reiniciar desde cero eliminando volúmenes

```bash
docker-compose down -v
```
