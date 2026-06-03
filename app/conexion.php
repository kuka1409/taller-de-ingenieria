<?php
declare(strict_types=1);

// Toma la configuración de la base de datos desde variables de entorno
// para mantener el mismo código en desarrollo y en contenedores.
$servidor = getenv('DB_HOST') ?: 'base_datos';
$puerto = getenv('DB_PORT') ?: '3306';
$nombreBaseDatos = getenv('DB_NAME') ?: 'aplicacion_dinamica';
$usuario = getenv('DB_USER') ?: 'usuario_app';
$contrasena = getenv('DB_PASSWORD') ?: 'clave_app';

try {
    // Construye la conexión PDO con codificación UTF-8 para manejar texto correctamente.
    $cadenaConexion = "mysql:host={$servidor};port={$puerto};dbname={$nombreBaseDatos};charset=utf8mb4";

    $conexion = new PDO(
        $cadenaConexion,
        $usuario,
        $contrasena,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
} catch (PDOException $excepcion) {
    // Si el error ocurre dentro de la API, la respuesta se devuelve en JSON
    // para que el frontend pueda interpretarla sin romper su flujo normal.
    $esPeticionApi = str_contains($_SERVER['SCRIPT_NAME'] ?? '', '/api/');

    if ($esPeticionApi) {
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=utf-8');
        }

        http_response_code(500);
        echo json_encode(
            [
                'exito' => false,
                'mensaje' => 'Error de conexión con la base de datos.',
            ],
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        );
        exit;
    }

    // Para la vista principal se corta la ejecución con un mensaje simple.
    http_response_code(500);
    exit('Error de conexión con la base de datos.');
}
