<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';

// El endpoint solo acepta peticiones POST para agregar tareas a un grupo.
requerir_metodo('POST');

// Valida el grupo destino y el contenido de la nueva tarea.
$datosEntrada = obtener_entrada_json();
$idGrupo = normalizar_entero_positivo($datosEntrada['id_grupo'] ?? null, 'El ID del grupo');
$titulo = normalizar_texto_obligatorio($datosEntrada['titulo'] ?? null, 160, 'El título de la tarea');
$descripcion = normalizar_texto_opcional($datosEntrada['descripcion'] ?? null, 2000, 'La descripción de la tarea');

try {
    // Evita crear tareas en grupos que ya no existen.
    if (!existe_grupo($conexion, $idGrupo)) {
        respuesta_error('El grupo solicitado no existe.', 404);
    }

    // Calcula la siguiente posición disponible para conservar el orden de creación.
    $consultaPosicion = $conexion->prepare(
        'SELECT COALESCE(MAX(posicion) + 1, 0) AS siguiente_posicion
        FROM tareas
        WHERE id_grupo = :id_grupo'
    );
    $consultaPosicion->execute([':id_grupo' => $idGrupo]);
    $siguientePosicion = (int) $consultaPosicion->fetchColumn();

    // Inserta la tarea y devuelve su identificador para refrescar la interfaz.
    $consultaInsercion = $conexion->prepare(
        'INSERT INTO tareas (id_grupo, titulo, descripcion, posicion)
        VALUES (:id_grupo, :titulo, :descripcion, :posicion)'
    );
    $consultaInsercion->execute([
        ':id_grupo' => $idGrupo,
        ':titulo' => $titulo,
        ':descripcion' => $descripcion,
        ':posicion' => $siguientePosicion,
    ]);

    $idTarea = (int) $conexion->lastInsertId();

    respuesta_exitosa(
        [
            'mensaje' => 'Tarea creada correctamente.',
            'id_tarea' => $idTarea,
        ],
        201
    );
} catch (Throwable $excepcion) {
    // Cubre fallas no controladas durante la creación de la tarea.
    respuesta_error('No se pudo crear la tarea.', 500);
}
