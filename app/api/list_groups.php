<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';

// El listado principal se expone únicamente mediante peticiones GET.
requerir_metodo('GET');

try {
    // Obtiene los grupos junto con el resumen de tareas para armar el panel principal.
    $consultaGrupos = $conexion->query(
        'SELECT
            g.id,
            g.titulo,
            g.descripcion,
            g.fecha_creacion,
            g.fecha_actualizacion,
            COUNT(t.id) AS total_tareas,
            COALESCE(SUM(CASE WHEN t.completada = 1 THEN 1 ELSE 0 END), 0) AS tareas_completadas
        FROM grupos g
        LEFT JOIN tareas t ON t.id_grupo = g.id
        GROUP BY g.id, g.titulo, g.descripcion, g.fecha_creacion, g.fecha_actualizacion
        ORDER BY g.fecha_actualizacion DESC, g.id DESC'
    );
    $filasGrupos = $consultaGrupos->fetchAll();

    if ($filasGrupos === []) {
        respuesta_exitosa(['grupos' => []]);
    }

    // Recupera las tareas por separado para asociarlas a cada grupo en la respuesta final.
    $consultaTareas = $conexion->query(
        'SELECT
            id,
            id_grupo,
            titulo,
            descripcion,
            completada,
            posicion,
            fecha_creacion,
            fecha_actualizacion
        FROM tareas
        ORDER BY id_grupo ASC, posicion ASC, id ASC'
    );

    $tareasPorGrupo = [];

    foreach ($consultaTareas->fetchAll() as $filaTarea) {
        $tarea = formatear_fila_tarea($filaTarea);
        $tareasPorGrupo[$tarea['id_grupo']][] = $tarea;
    }

    // Combina cada grupo con sus tareas y métricas calculadas para el frontend.
    $grupos = [];

    foreach ($filasGrupos as $filaGrupo) {
        $idGrupo = (int) $filaGrupo['id'];
        $grupos[] = formatear_fila_grupo($filaGrupo, $tareasPorGrupo[$idGrupo] ?? []);
    }

    respuesta_exitosa(['grupos' => $grupos]);
} catch (Throwable $excepcion) {
    // Cualquier error inesperado se responde en formato JSON uniforme.
    respuesta_error('No se pudieron cargar los grupos.', 500);
}
