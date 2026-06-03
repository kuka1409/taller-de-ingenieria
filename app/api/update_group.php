<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';

// El endpoint solo acepta peticiones POST para actualizar grupos existentes.
requerir_metodo('POST');

// Valida el identificador y los campos editables enviados por el cliente.
$datosEntrada = obtener_entrada_json();
$idGrupo = normalizar_entero_positivo($datosEntrada['id'] ?? null, 'El ID del grupo');
$titulo = normalizar_texto_obligatorio($datosEntrada['titulo'] ?? null, 120, 'El título del grupo');
$descripcion = normalizar_texto_opcional($datosEntrada['descripcion'] ?? null, 2000, 'La descripción del grupo');

try {
    // Verifica primero que el grupo exista para devolver un error claro si fue eliminado.
    if (!existe_grupo($conexion, $idGrupo)) {
        respuesta_error('El grupo solicitado no existe.', 404);
    }

    // Actualiza la información principal del grupo y su fecha de modificación.
    $consulta = $conexion->prepare(
        'UPDATE grupos
        SET titulo = :titulo,
            descripcion = :descripcion,
            fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id = :id'
    );
    $consulta->execute([
        ':id' => $idGrupo,
        ':titulo' => $titulo,
        ':descripcion' => $descripcion,
    ]);

    respuesta_exitosa(['mensaje' => 'Grupo actualizado correctamente.']);
} catch (Throwable $excepcion) {
    // Si ocurre una falla inesperada, se informa como error interno.
    respuesta_error('No se pudo actualizar el grupo.', 500);
}
