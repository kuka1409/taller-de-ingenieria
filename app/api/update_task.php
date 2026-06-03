<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';

// El endpoint solo acepta peticiones POST para editar tareas existentes.
requerir_metodo('POST');

// Valida el identificador y el contenido editable de la tarea.
$datosEntrada = obtener_entrada_json();
$idTarea = normalizar_entero_positivo($datosEntrada['id'] ?? null, 'El ID de la tarea');
$titulo = normalizar_texto_obligatorio($datosEntrada['titulo'] ?? null, 160, 'El título de la tarea');
$descripcion = normalizar_texto_opcional($datosEntrada['descripcion'] ?? null, 2000, 'La descripción de la tarea');

try {
    // Verifica que la tarea siga existiendo antes de actualizarla.
    if (!existe_tarea($conexion, $idTarea)) {
        respuesta_error('La tarea solicitada no existe.', 404);
    }

    // Guarda el nuevo contenido y registra la fecha de actualización.
    $consulta = $conexion->prepare(
        'UPDATE tareas
        SET titulo = :titulo,
            descripcion = :descripcion,
            fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id = :id'
    );
    $consulta->execute([
        ':id' => $idTarea,
        ':titulo' => $titulo,
        ':descripcion' => $descripcion,
    ]);

    respuesta_exitosa(['mensaje' => 'Tarea actualizada correctamente.']);
} catch (Throwable $excepcion) {
    // Devuelve un error uniforme si la operación falla inesperadamente.
    respuesta_error('No se pudo actualizar la tarea.', 500);
}
