<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';

// El endpoint solo acepta peticiones POST para eliminar grupos.
requerir_metodo('POST');

// Valida que el identificador recibido corresponda a un grupo posible.
$datosEntrada = obtener_entrada_json();
$idGrupo = normalizar_entero_positivo($datosEntrada['id'] ?? null, 'El ID del grupo');

try {
    // Comprueba la existencia del grupo antes de intentar la eliminación.
    if (!existe_grupo($conexion, $idGrupo)) {
        respuesta_error('El grupo solicitado no existe.', 404);
    }

    // Elimina el grupo solicitado; las reglas de la base resuelven sus dependencias asociadas.
    $consulta = $conexion->prepare(
        'DELETE FROM grupos
        WHERE id = :id'
    );
    $consulta->execute([':id' => $idGrupo]);

    respuesta_exitosa(['mensaje' => 'Grupo eliminado correctamente.']);
} catch (Throwable $excepcion) {
    // Cubre cualquier falla no controlada durante la eliminación.
    respuesta_error('No se pudo eliminar el grupo.', 500);
}
