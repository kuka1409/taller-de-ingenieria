<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';

// El endpoint solo acepta peticiones POST para eliminar tareas.
requerir_metodo('POST');

// Valida que el identificador recibido sea correcto.
$datosEntrada = obtener_entrada_json();
$idTarea = normalizar_entero_positivo($datosEntrada['id'] ?? null, 'El ID de la tarea');

try {
    // Comprueba la existencia de la tarea para responder con un 404 cuando corresponda.
    if (!existe_tarea($conexion, $idTarea)) {
        respuesta_error('La tarea solicitada no existe.', 404);
    }

    // Elimina el registro solicitado de la tabla de tareas.
    $consulta = $conexion->prepare(
        'DELETE FROM tareas
        WHERE id = :id'
    );
    $consulta->execute([':id' => $idTarea]);

    respuesta_exitosa(['mensaje' => 'Tarea eliminada correctamente.']);
} catch (Throwable $excepcion) {
    // Cubre errores inesperados durante la eliminación.
    respuesta_error('No se pudo eliminar la tarea.', 500);
}
