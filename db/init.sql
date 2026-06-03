CREATE TABLE IF NOT EXISTS grupos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(120) NOT NULL,
    descripcion TEXT,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tareas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_grupo INT NOT NULL,
    titulo VARCHAR(160) NOT NULL,
    descripcion TEXT,
    completada BOOLEAN NOT NULL DEFAULT FALSE,
    posicion INT NOT NULL DEFAULT 0,
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_tareas_grupo
        FOREIGN KEY (id_grupo) REFERENCES grupos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_grupos_fecha_actualizacion
    ON grupos (fecha_actualizacion, id);

CREATE INDEX idx_tareas_id_grupo_posicion
    ON tareas (id_grupo, posicion, id);

CREATE INDEX idx_tareas_id_grupo_completada
    ON tareas (id_grupo, completada);

DROP TRIGGER IF EXISTS trg_tareas_despues_insertar;
DROP TRIGGER IF EXISTS trg_tareas_despues_actualizar;
DROP TRIGGER IF EXISTS trg_tareas_despues_eliminar;

DELIMITER $$

CREATE TRIGGER trg_tareas_despues_insertar
AFTER INSERT ON tareas
FOR EACH ROW
BEGIN
    UPDATE grupos
    SET fecha_actualizacion = CURRENT_TIMESTAMP
    WHERE id = NEW.id_grupo;
END$$

CREATE TRIGGER trg_tareas_despues_actualizar
AFTER UPDATE ON tareas
FOR EACH ROW
BEGIN
    UPDATE grupos
    SET fecha_actualizacion = CURRENT_TIMESTAMP
    WHERE id = NEW.id_grupo;

    IF OLD.id_grupo <> NEW.id_grupo THEN
        UPDATE grupos
        SET fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id = OLD.id_grupo;
    END IF;
END$$

CREATE TRIGGER trg_tareas_despues_eliminar
AFTER DELETE ON tareas
FOR EACH ROW
BEGIN
    UPDATE grupos
    SET fecha_actualizacion = CURRENT_TIMESTAMP
    WHERE id = OLD.id_grupo;
END$$

DELIMITER ;
