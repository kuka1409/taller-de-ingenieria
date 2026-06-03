<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';

// El endpoint solo acepta peticiones POST para cambiar el estado de una tarea.
requerir_metodo('POST');

// Valida el identificador de la tarea y el valor booleano del nuevo estado.
$datosEntrada = obtener_entrada_json();
$idTarea = normalizar_entero_positivo($datosEntrada['id'] ?? null, 'El ID de la tarea');
$completada = normalizar_booleano($datosEntrada['completada'] ?? null, 'El estado de la tarea');

try {
    // Verifica que la tarea exista antes de cambiar su estado.
    if (!existe_tarea($conexion, $idTarea)) {
        respuesta_error('La tarea solicitada no existe.', 404);
    }

    // Actualiza la marca de completada y refresca la fecha de modificación.
    $consulta = $conexion->prepare(
        'UPDATE tareas
        SET completada = :completada,
            fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id = :id'
    );
    $consulta->bindValue(':id', $idTarea, PDO::PARAM_INT);
    $consulta->bindValue(':completada', $completada, PDO::PARAM_BOOL);
    $consulta->execute();

    respuesta_exitosa(
        [
            'mensaje' => $completada
                ? 'Tarea marcada como completada.'
                : 'Tarea marcada como pendiente.',
            'id_tarea' => $idTarea,
            'completada' => $completada,
        ]
    );
} catch (Throwable $excepcion) {
    // Informa cualquier falla inesperada con el mismo formato de la API.
    respuesta_error('No se pudo actualizar el estado de la tarea.', 500);
}
