<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';

// El endpoint solo acepta peticiones POST para registrar nuevos grupos.
requerir_metodo('POST');

// Normaliza y valida los datos recibidos antes de intentar la inserción.
$datosEntrada = obtener_entrada_json();
$titulo = normalizar_texto_obligatorio($datosEntrada['titulo'] ?? null, 120, 'El título del grupo');
$descripcion = normalizar_texto_opcional($datosEntrada['descripcion'] ?? null, 2000, 'La descripción del grupo');

try {
    // Guarda el grupo y devuelve el identificador generado para refrescar la interfaz.
    $consulta = $conexion->prepare(
        'INSERT INTO grupos (titulo, descripcion)
        VALUES (:titulo, :descripcion)'
    );
    $consulta->execute([
        ':titulo' => $titulo,
        ':descripcion' => $descripcion,
    ]);

    $idGrupo = (int) $conexion->lastInsertId();

    respuesta_exitosa(
        [
            'mensaje' => 'Grupo creado correctamente.',
            'id_grupo' => $idGrupo,
        ],
        201
    );
} catch (Throwable $excepcion) {
    // Cualquier fallo inesperado se informa como error interno de la operación.
    respuesta_error('No se pudo crear el grupo.', 500);
}
