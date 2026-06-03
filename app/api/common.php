<?php
declare(strict_types=1);

ini_set('display_errors', '0');
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/../conexion.php';

/**
 * Envía una respuesta JSON uniforme y finaliza la ejecución del script.
 *
 * Se utiliza como base para todas las respuestas de la API, tanto exitosas
 * como de error, asegurando un formato consistente para el frontend.
 *
 * @param array $contenido Datos que se enviarán al cliente.
 * @param int $codigoEstado Código HTTP asociado a la respuesta.
 * @return never Finaliza la ejecución con exit después de imprimir el JSON.
 */
function respuesta_json(array $contenido, int $codigoEstado = 200): never
{
    http_response_code($codigoEstado);
    echo json_encode($contenido, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Devuelve una respuesta JSON de éxito y finaliza la ejecución del script.
 *
 * Agrega automáticamente la bandera `exito` para simplificar el manejo
 * de respuestas satisfactorias en la interfaz.
 *
 * @param array $datos Información adicional incluida en la respuesta.
 * @param int $codigoEstado Código HTTP asociado a la respuesta.
 * @return never Finaliza la ejecución con exit después de responder al cliente.
 */
function respuesta_exitosa(array $datos = [], int $codigoEstado = 200): never
{
    respuesta_json(array_merge(['exito' => true], $datos), $codigoEstado);
}

/**
 * Devuelve una respuesta JSON de error y finaliza la ejecución del script.
 *
 * Centraliza los mensajes de validación y fallas internas para que todos
 * los endpoints respondan con la misma estructura.
 *
 * @param string $mensaje Mensaje descriptivo del error.
 * @param int $codigoEstado Código HTTP asociado al error.
 * @return never Finaliza la ejecución con exit después de responder al cliente.
 */
function respuesta_error(string $mensaje, int $codigoEstado = 400): never
{
    respuesta_json(
        [
            'exito' => false,
            'mensaje' => $mensaje,
        ],
        $codigoEstado
    );
}

/**
 * Verifica que la petición utilice el método HTTP esperado.
 *
 * Si el método recibido no coincide, responde con JSON de error y detiene
 * la ejecución para evitar procesar una operación inválida.
 *
 * @param string $metodo Método HTTP permitido para el endpoint.
 * @return void
 */
function requerir_metodo(string $metodo): void
{
    if (strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET') !== strtoupper($metodo)) {
        respuesta_error('Método no permitido.', 405);
    }
}

/**
 * Lee y decodifica el cuerpo JSON enviado por el cliente.
 *
 * Si la petición no incluye contenido, retorna un arreglo vacío. Si el
 * JSON es inválido, responde con error y finaliza la ejecución.
 *
 * @return array Datos decodificados desde el cuerpo de la petición.
 */
function obtener_entrada_json(): array
{
    $entradaCruda = file_get_contents('php://input');

    if ($entradaCruda === false || trim($entradaCruda) === '') {
        return [];
    }

    $datos = json_decode($entradaCruda, true);

    if (!is_array($datos)) {
        respuesta_error('JSON inválido.', 400);
    }

    return $datos;
}

/**
 * Convierte un valor arbitrario a texto seguro para su validación.
 *
 * Descarta arreglos y objetos para evitar entradas inesperadas y recorta
 * espacios sobrantes en los valores escalares.
 *
 * @param mixed $valor Valor recibido desde la petición.
 * @return string Texto normalizado para continuar con la validación.
 */
function valor_a_texto(mixed $valor): string
{
    if (is_array($valor) || is_object($valor)) {
        return '';
    }

    return trim((string) $valor);
}

/**
 * Calcula la longitud de un texto considerando soporte multibyte si existe.
 *
 * @param string $texto Texto cuya longitud se desea obtener.
 * @return int Cantidad de caracteres del texto.
 */
function longitud_texto(string $texto): int
{
    return function_exists('mb_strlen') ? mb_strlen($texto) : strlen($texto);
}

/**
 * Valida y normaliza un campo de texto obligatorio.
 *
 * Si el valor está vacío o supera la longitud permitida, responde con un
 * error JSON y finaliza la ejecución del endpoint.
 *
 * @param mixed $valor Valor recibido desde la petición.
 * @param int $longitudMaxima Límite máximo permitido para el texto.
 * @param string $etiquetaCampo Nombre legible del campo para el mensaje de error.
 * @return string Texto validado y listo para usar.
 */
function normalizar_texto_obligatorio(mixed $valor, int $longitudMaxima, string $etiquetaCampo): string
{
    $texto = valor_a_texto($valor);

    if ($texto === '') {
        respuesta_error($etiquetaCampo . ' es obligatorio.', 422);
    }

    if (longitud_texto($texto) > $longitudMaxima) {
        respuesta_error($etiquetaCampo . ' debe tener máximo ' . $longitudMaxima . ' caracteres.', 422);
    }

    return $texto;
}

/**
 * Valida y normaliza un campo de texto opcional.
 *
 * Si el valor llega vacío se transforma en `null`. Si supera la longitud
 * permitida, responde con un error JSON y finaliza la ejecución.
 *
 * @param mixed $valor Valor recibido desde la petición.
 * @param int $longitudMaxima Límite máximo permitido para el texto.
 * @param string $etiquetaCampo Nombre legible del campo para el mensaje de error.
 * @return string|null Texto validado o `null` cuando no se informa contenido.
 */
function normalizar_texto_opcional(mixed $valor, int $longitudMaxima, string $etiquetaCampo): ?string
{
    $texto = valor_a_texto($valor);

    if ($texto === '') {
        return null;
    }

    if (longitud_texto($texto) > $longitudMaxima) {
        respuesta_error($etiquetaCampo . ' debe tener máximo ' . $longitudMaxima . ' caracteres.', 422);
    }

    return $texto;
}

/**
 * Valida que un valor corresponda a un entero positivo.
 *
 * Ante un dato inválido responde con error JSON y detiene la ejecución
 * del endpoint para evitar consultas inconsistentes.
 *
 * @param mixed $valor Valor recibido desde la petición.
 * @param string $etiquetaCampo Nombre legible del campo para el mensaje de error.
 * @return int Entero positivo validado.
 */
function normalizar_entero_positivo(mixed $valor, string $etiquetaCampo): int
{
    $numero = filter_var($valor, FILTER_VALIDATE_INT);

    if ($numero === false || $numero < 1) {
        respuesta_error($etiquetaCampo . ' es inválido.', 422);
    }

    return $numero;
}

/**
 * Convierte distintos formatos de entrada a un valor booleano.
 *
 * Acepta valores booleanos nativos, `1`, `0`, `true` y `false`. Si el dato
 * no puede interpretarse, responde con error JSON y finaliza la ejecución.
 *
 * @param mixed $valor Valor recibido desde la petición.
 * @param string $etiquetaCampo Nombre legible del campo para el mensaje de error.
 * @return bool Estado booleano normalizado.
 */
function normalizar_booleano(mixed $valor, string $etiquetaCampo): bool
{
    if (is_bool($valor)) {
        return $valor;
    }

    if ($valor === 1 || $valor === '1') {
        return true;
    }

    if ($valor === 0 || $valor === '0') {
        return false;
    }

    if (is_string($valor)) {
        $normalizado = strtolower(trim($valor));

        if ($normalizado === 'true') {
            return true;
        }

        if ($normalizado === 'false') {
            return false;
        }
    }

    respuesta_error($etiquetaCampo . ' es inválido.', 422);
}

/**
 * Convierte una fila de la tabla `tareas` al formato esperado por la API.
 *
 * Realiza conversiones de tipo para que el frontend reciba valores
 * consistentes al listar o actualizar tareas.
 *
 * @param array $fila Registro obtenido desde la base de datos.
 * @return array Tarea normalizada para la respuesta JSON.
 */
function formatear_fila_tarea(array $fila): array
{
    return [
        'id' => (int) $fila['id'],
        'id_grupo' => (int) $fila['id_grupo'],
        'titulo' => (string) $fila['titulo'],
        'descripcion' => $fila['descripcion'] !== null ? (string) $fila['descripcion'] : null,
        'completada' => ((int) $fila['completada']) === 1,
        'posicion' => (int) $fila['posicion'],
        'fecha_creacion' => (string) $fila['fecha_creacion'],
        'fecha_actualizacion' => (string) $fila['fecha_actualizacion'],
    ];
}

/**
 * Convierte una fila de grupo al formato final consumido por la interfaz.
 *
 * Además de normalizar tipos, calcula el estado general del grupo y resume
 * la cantidad de tareas completadas y pendientes.
 *
 * @param array $fila Registro del grupo obtenido desde la base de datos.
 * @param array $tareas Tareas asociadas al grupo ya normalizadas.
 * @return array Grupo preparado para la respuesta JSON.
 */
function formatear_fila_grupo(array $fila, array $tareas = []): array
{
    $totalTareas = (int) ($fila['total_tareas'] ?? 0);
    $tareasCompletadas = (int) ($fila['tareas_completadas'] ?? 0);
    $tareasPendientes = max(0, $totalTareas - $tareasCompletadas);

    $estado = 'vacio';

    if ($totalTareas > 0 && $tareasCompletadas === $totalTareas) {
        $estado = 'completado';
    } elseif ($totalTareas > 0) {
        $estado = 'en_progreso';
    }

    return [
        'id' => (int) $fila['id'],
        'titulo' => (string) $fila['titulo'],
        'descripcion' => $fila['descripcion'] !== null ? (string) $fila['descripcion'] : null,
        'fecha_creacion' => (string) $fila['fecha_creacion'],
        'fecha_actualizacion' => (string) $fila['fecha_actualizacion'],
        'total_tareas' => $totalTareas,
        'tareas_completadas' => $tareasCompletadas,
        'tareas_pendientes' => $tareasPendientes,
        'estado' => $estado,
        'tareas' => $tareas,
    ];
}

/**
 * Comprueba si un grupo existe en la base de datos.
 *
 * Se utiliza antes de actualizar o eliminar registros para entregar
 * respuestas claras cuando el identificador no corresponde a un grupo real.
 *
 * @param PDO $conexion Conexión activa a la base de datos.
 * @param int $idGrupo Identificador del grupo a consultar.
 * @return bool `true` si el grupo existe, `false` en caso contrario.
 */
function existe_grupo(PDO $conexion, int $idGrupo): bool
{
    $consulta = $conexion->prepare('SELECT id FROM grupos WHERE id = :id LIMIT 1');
    $consulta->execute([':id' => $idGrupo]);

    return $consulta->fetchColumn() !== false;
}

/**
 * Comprueba si una tarea existe en la base de datos.
 *
 * Permite validar operaciones de edición, eliminación o cambio de estado
 * antes de ejecutar la consulta correspondiente.
 *
 * @param PDO $conexion Conexión activa a la base de datos.
 * @param int $idTarea Identificador de la tarea a consultar.
 * @return bool `true` si la tarea existe, `false` en caso contrario.
 */
function existe_tarea(PDO $conexion, int $idTarea): bool
{
    $consulta = $conexion->prepare('SELECT id FROM tareas WHERE id = :id LIMIT 1');
    $consulta->execute([':id' => $idTarea]);

    return $consulta->fetchColumn() !== false;
}
