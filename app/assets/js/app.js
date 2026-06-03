// Estado compartido de la interfaz para grupos y modal activo.
const estadoAplicacion = {
    grupos: [],
    idGrupoActivo: null,
    modoModal: 'vista',
    idGrupoResaltado: null,
    idsGruposExpandidos: new Set(),
};

// Referencias a los elementos principales del DOM usados por la aplicación.
const elementos = {
    formularioGrupo: document.getElementById('formulario-grupo'),
    mensajeFormularioGrupo: document.getElementById('mensaje-formulario-grupo'),
    campoTituloGrupo: document.getElementById('titulo-grupo'),
    mensajePagina: document.getElementById('mensaje-pagina'),
    listaGrupos: document.getElementById('lista-grupos'),
    modal: document.getElementById('modal-grupo'),
    tituloModal: document.getElementById('titulo-modal-grupo'),
    subtituloModal: document.getElementById('subtitulo-modal-grupo'),
    insigniaModal: document.getElementById('insignia-modal-grupo'),
    mensajeModal: document.getElementById('mensaje-modal'),
    cuerpoModal: document.getElementById('cuerpo-modal'),
};

// Inicializa los eventos base y carga la información al abrir la página.
document.addEventListener('DOMContentLoaded', () => {
    registrarEventos();
    cargarGrupos();
});

/**
 * Registra los eventos principales de la interfaz.
 *
 * Centraliza la suscripción de formularios, botones, filtros y acciones
 * del modal para mantener el inicio de la aplicación ordenado.
 *
 * @returns {void} No retorna datos.
 */
function registrarEventos() {
    elementos.formularioGrupo.addEventListener('submit', manejarCreacionGrupo);
    elementos.listaGrupos.addEventListener('click', manejarClicGrupos);
    elementos.listaGrupos.addEventListener('change', manejarCambioGrupos);
    elementos.modal.addEventListener('click', manejarClicModal);
    elementos.modal.addEventListener('submit', manejarEnvioModal);
    elementos.modal.addEventListener('change', manejarCambioModal);
    document.addEventListener('keydown', manejarTeclaDocumento);
}

/**
 * Solicita los grupos a la API y actualiza todo el panel principal.
 *
 * También sincroniza el estado de los desplegables y muestra mensajes
 * adecuados cuando la carga falla o no existen registros.
 *
 * @param {{mostrarCarga?: boolean}} [opciones] Configuración visual de la carga.
 * @returns {Promise<void>} No retorna datos, actualiza directamente la vista.
 */
async function cargarGrupos({ mostrarCarga = true } = {}) {
    if (mostrarCarga) {
        mostrarCajaEstado('loading-state', 'Cargando grupos...');
    }

    try {
        const datos = await hacerPeticionApi('api/list_groups.php');
        estadoAplicacion.grupos = Array.isArray(datos.grupos) ? datos.grupos : [];
        sincronizarGruposExpandidos();
        mostrarPanel();
    } catch (error) {
        estadoAplicacion.grupos = [];
        mostrarCajaEstado('empty-state', error.message);
        mostrarMensaje(elementos.mensajePagina, error.message, 'error');
        cerrarModal();
    }
}

/**
 * Refresca las secciones dependientes del estado actual de la aplicación.
 *
 * @returns {void} No retorna datos.
 */
function mostrarPanel() {
    mostrarGrupos();
    sincronizarModalConEstado();
}

/**
 * Calcula y muestra el resumen general de grupos y tareas.
 *
 * @returns {void} No retorna datos.
 */
function mostrarResumen() {
    if (!elementos.resumenGrupos) {
        return;
    }

    const totalGrupos = estadoAplicacion.grupos.length;
    const totalTareas = estadoAplicacion.grupos.reduce((suma, grupo) => suma + Number(grupo.total_tareas || 0), 0);
    const gruposCompletados = estadoAplicacion.grupos.filter((grupo) => grupo.estado === 'completado').length;
    const tareasPendientes = estadoAplicacion.grupos.reduce((suma, grupo) => suma + Number(grupo.tareas_pendientes || 0), 0);

    elementos.resumenGrupos.textContent = String(totalGrupos);
    elementos.resumenTareas.textContent = String(totalTareas);
    elementos.resumenCompletados.textContent = String(gruposCompletados);
    elementos.resumenPendientes.textContent = String(tareasPendientes);
}

/**
 * Renderiza el bloque lateral con la actividad reciente.
 *
 * @returns {void} No retorna datos.
 */
function mostrarActividad() {
    if (!elementos.listaActividad) {
        return;
    }

    elementos.listaActividad.replaceChildren();

    if (estadoAplicacion.grupos.length === 0) {
        elementos.listaActividad.appendChild(
            crearElemento('div', 'activity-empty', 'Aún no hay grupos recientes.')
        );
        elementos.contadorActividad.textContent = '0 grupos';
        return;
    }

    const fragmento = document.createDocumentFragment();
    const gruposRecientes = estadoAplicacion.grupos.slice(0, 4);

    gruposRecientes.forEach((grupo) => {
        fragmento.appendChild(crearElementoActividad(grupo));
    });

    elementos.listaActividad.appendChild(fragmento);
    elementos.contadorActividad.textContent = `${gruposRecientes.length} recientes`;
}

/**
 * Construye el acceso rápido de un grupo dentro de la lista de actividad.
 *
 * @param {Object} grupo Datos del grupo que se mostrará en el resumen lateral.
 * @returns {HTMLButtonElement} Botón listo para abrir el grupo en el modal.
 */
function crearElementoActividad(grupo) {
    const elemento = crearElemento('button', 'activity-item');
    elemento.type = 'button';
    elemento.dataset.action = 'abrir-grupo';
    elemento.dataset.id = String(grupo.id);

    const marcador = crearElemento('span', `activity-item__marker activity-item__marker--${obtenerClaseEstado(grupo.estado)}`);
    const texto = crearElemento('div', 'activity-item__copy');
    texto.append(
        crearElemento('strong', '', grupo.titulo),
        crearElemento('span', '', `${grupo.tareas_completadas}/${grupo.total_tareas} tareas · ${formatearFecha(grupo.fecha_actualizacion)}`)
    );

    const estado = crearElemento('span', 'activity-item__status', obtenerEtiquetaEstado(grupo.estado));

    elemento.append(marcador, texto, estado);

    return elemento;
}

/**
 * Renderiza el listado principal de grupos según el filtro activo.
 *
 * @returns {void} No retorna datos.
 */
function mostrarGrupos() {
    elementos.listaGrupos.replaceChildren();

    if (estadoAplicacion.grupos.length === 0) {
        mostrarCajaEstado('empty-state', 'Todavía no hay grupos. Crea el primero desde el formulario.');
        return;
    }

    const gruposFiltrados = obtenerGruposFiltrados();

    if (gruposFiltrados.length === 0) {
        mostrarCajaEstado('empty-state', 'No hay grupos para el filtro seleccionado.');
        return;
    }

    const fragmento = document.createDocumentFragment();

    gruposFiltrados.forEach((grupo) => {
        fragmento.appendChild(crearTarjetaGrupo(grupo));
    });

    elementos.listaGrupos.appendChild(fragmento);
}

/**
 * Filtra los grupos cargados según el estado seleccionado por el usuario.
 *
 * @returns {Array<Object>} Colección de grupos visibles en el panel principal.
 */
function obtenerGruposFiltrados() {
    return estadoAplicacion.grupos;
}

/**
 * Genera la tarjeta principal de un grupo con sus acciones y métricas.
 *
 * @param {Object} grupo Datos del grupo a renderizar.
 * @returns {HTMLElement} Tarjeta completa lista para insertarse en el listado.
 */
function crearTarjetaGrupo(grupo) {
    const estaExpandido = estadoAplicacion.idsGruposExpandidos.has(grupo.id);
    const tarjeta = crearElemento('article', `group-card group-card--${obtenerClaseEstado(grupo.estado)}`);
    tarjeta.dataset.idGrupo = String(grupo.id);

    if (estadoAplicacion.idGrupoResaltado === grupo.id) {
        tarjeta.classList.add('group-card--flash');
    }

    const encabezado = crearElemento('div', 'group-card__header');
    const bloqueTitulo = crearElemento('div', 'group-card__title-block');
    const filaTitulo = crearElemento('div', 'group-card__title-row');
    filaTitulo.append(
        crearElemento('h3', 'group-card__title', grupo.titulo),
        crearBotonControlTarjeta({
            icon: '✎',
            action: 'editar-grupo',
            id: grupo.id,
            className: 'group-card__edit-trigger',
            label: 'Editar grupo',
        })
    );
    bloqueTitulo.append(
        filaTitulo,
        crearElemento(
            'p',
            grupo.descripcion ? 'group-card__description' : 'group-card__description group-card__description--muted',
            grupo.descripcion || 'Sin descripción por ahora.'
        )
    );

    encabezado.append(bloqueTitulo, crearInsigniaEstado(grupo.estado));

    const metadatos = crearElemento('div', 'group-card__meta');
    metadatos.append(
        crearPildoraMeta('Estado', obtenerEtiquetaEstado(grupo.estado)),
        crearPildoraMeta('Tareas', String(grupo.total_tareas)),
        crearPildoraMeta('Completadas', `${grupo.tareas_completadas}/${grupo.total_tareas}`)
    );

    const pie = crearElemento('div', 'group-card__footer');
    const metaPie = crearElemento('div', 'group-card__footer-meta');
    metaPie.append(
        crearElemento(
            'span',
            'group-card__footer-note',
            grupo.tareas_pendientes > 0
                ? `${grupo.tareas_pendientes} tareas pendientes`
                : grupo.estado === 'completado'
                    ? 'Todas las tareas del grupo están completas'
                    : 'Aún no hay tareas registradas'
        ),
        crearElemento('span', 'group-card__footer-note', `Actualizado ${formatearFecha(grupo.fecha_actualizacion)}`)
    );

    const acciones = crearElemento('div', 'group-card__actions');
    acciones.append(
        crearBotonAccion('Editar tareas', 'editar-tareas', grupo.id, 'button--ghost button--small'),
        crearBotonAccion('Eliminar grupo', 'eliminar-grupo', grupo.id, 'button--danger button--small')
    );
    const controlesPie = crearElemento('div', 'group-card__footer-controls');
    controlesPie.append(
        acciones,
        crearBotonAlternarTareasGrupo(grupo, estaExpandido)
    );

    pie.append(metaPie, controlesPie);

    tarjeta.append(encabezado, metadatos, crearSeccionProgreso(grupo), pie);

    if (estaExpandido) {
        tarjeta.appendChild(crearDesplegableTareasGrupo(grupo));
    }

    return tarjeta;
}

/**
 * Crea el botón que expande o colapsa las tareas visibles de un grupo.
 *
 * @param {Object} grupo Grupo al que pertenece el control.
 * @param {boolean} estaExpandido Indica si el bloque de tareas está visible.
 * @returns {HTMLButtonElement} Botón configurado con el estado actual.
 */
function crearBotonAlternarTareasGrupo(grupo, estaExpandido) {
    return crearBotonControlTarjeta({
        icon: estaExpandido ? '▴' : '▾',
        action: 'alternar-tareas-grupo',
        id: grupo.id,
        className: 'group-card__toggle-trigger',
        label: estaExpandido ? 'Ocultar tareas' : 'Ver tareas',
        expanded: estaExpandido,
    });
}

/**
 * Construye el desplegable con las tareas resumidas de un grupo.
 *
 * @param {Object} grupo Grupo cuyas tareas se mostrarán en la tarjeta.
 * @returns {HTMLElement} Sección con el detalle breve de tareas.
 */
function crearDesplegableTareasGrupo(grupo) {
    const seccion = crearElemento('section', 'group-card__dropdown');
    const encabezado = crearElemento('div', 'group-card__dropdown-header');
    encabezado.append(
        crearElemento('h4', 'group-card__dropdown-title', 'Tareas del grupo'),
        crearElemento(
            'span',
            'group-card__dropdown-caption',
            grupo.tareas_pendientes > 0
                ? `${grupo.tareas_pendientes} pendientes por completar`
                : grupo.total_tareas > 0
                    ? 'Todas las tareas están completas'
                    : 'Sin tareas registradas'
        )
    );
    seccion.appendChild(encabezado);

    if (!Array.isArray(grupo.tareas) || grupo.tareas.length === 0) {
        seccion.appendChild(
            crearElemento(
                'div',
                'group-card__dropdown-empty',
                'Este grupo aún no tiene tareas registradas.'
            )
        );

        return seccion;
    }

    const lista = crearElemento('ul', 'group-card__dropdown-list');
    const tareasOrdenadas = [...grupo.tareas].sort((tareaIzquierda, tareaDerecha) => {
        const diferenciaCompletadas = Number(tareaIzquierda.completada) - Number(tareaDerecha.completada);

        if (diferenciaCompletadas !== 0) {
            return diferenciaCompletadas;
        }

        return Number(tareaIzquierda.posicion || 0) - Number(tareaDerecha.posicion || 0);
    });

    tareasOrdenadas.forEach((tarea) => {
        lista.appendChild(crearElementoTareaDesplegable(tarea));
    });
    seccion.appendChild(lista);

    return seccion;
}

/**
 * Genera un elemento compacto para mostrar una tarea dentro del desplegable.
 *
 * @param {Object} tarea Datos de la tarea a representar.
 * @returns {HTMLLIElement} Elemento de lista con estado y descripción breve.
 */
function crearElementoTareaDesplegable(tarea) {
    const elemento = crearElemento(
        'li',
        tarea.completada
            ? 'group-card-task group-card-task--completed'
            : 'group-card-task'
    );
    elemento.dataset.idTarea = String(tarea.id);

    const alternador = crearElemento('label', 'group-card-task__toggle');
    const casilla = document.createElement('input');
    casilla.type = 'checkbox';
    casilla.checked = Boolean(tarea.completada);
    casilla.dataset.action = 'alternar-tarea';
    casilla.dataset.idTarea = String(tarea.id);

    const texto = crearElemento('div', 'group-card-task__copy');
    texto.appendChild(crearElemento('span', 'group-card-task__title', tarea.titulo));

    if (tarea.descripcion) {
        texto.appendChild(crearElemento('span', 'group-card-task__description', tarea.descripcion));
    }

    alternador.append(casilla, texto);

    const estado = crearElemento(
        'span',
        tarea.completada
            ? 'group-card-task__status group-card-task__status--completed'
            : 'group-card-task__status group-card-task__status--pending',
        tarea.completada ? 'Completada' : 'Pendiente'
    );

    elemento.append(alternador, estado);

    return elemento;
}

/**
 * Crea la insignia visual que representa el estado actual de un grupo.
 *
 * @param {string} estado Estado calculado del grupo.
 * @returns {HTMLSpanElement} Insignia con texto y clase visual correspondiente.
 */
function crearInsigniaEstado(estado) {
    return crearElemento('span', `status-badge status-badge--${obtenerClaseEstado(estado)}`, obtenerEtiquetaEstado(estado));
}

/**
 * Genera una pildora de metadatos para mostrar información resumida.
 *
 * @param {string} label Etiqueta descriptiva del dato.
 * @param {string} value Valor que se mostrará en la pildora.
 * @returns {HTMLDivElement} Bloque de metadatos listo para la interfaz.
 */
function crearPildoraMeta(label, value) {
    const pill = crearElemento('div', 'meta-pill');
    pill.append(
        crearElemento('span', 'meta-pill__label', label),
        crearElemento('strong', 'meta-pill__value', value)
    );

    return pill;
}

/**
 * Crea la barra de progreso de un grupo según sus tareas completadas.
 *
 * @param {Object} grupo Datos del grupo que se desea resumir.
 * @returns {HTMLDivElement} Contenedor visual con porcentaje y barra.
 */
function crearSeccionProgreso(grupo) {
    const contenedor = crearElemento('div', 'progress-block');
    const filaTexto = crearElemento('div', 'progress-block__text');
    const porcentaje = calcularProgreso(grupo);

    filaTexto.append(
        crearElemento('span', 'progress-block__label', 'Progreso del grupo'),
        crearElemento('strong', 'progress-block__value', `${porcentaje}%`)
    );

    const pista = crearElemento('div', 'progress-track');
    const relleno = crearElemento('div', 'progress-fill');
    relleno.style.width = `${porcentaje}%`;
    pista.appendChild(relleno);
    contenedor.append(filaTexto, pista);

    return contenedor;
}

/**
 * Construye el formulario usado para editar la información del grupo.
 *
 * @param {Object} grupo Datos actuales del grupo.
 * @returns {HTMLFormElement} Formulario listo para enviarse desde el modal.
 */
function crearFormularioEdicionGrupo(grupo) {
    const formulario = crearElemento('form', 'inline-form');
    formulario.dataset.action = 'actualizar-grupo';
    formulario.dataset.idGrupo = String(grupo.id);

    formulario.append(
        crearCampoTexto({
            id: `edit-group-title-${grupo.id}`,
            label: 'Editar nombre del grupo',
            name: 'titulo',
            maxLength: 120,
            value: grupo.titulo,
            placeholder: 'Nombre del grupo',
            required: true,
        }),
        crearCampoTexto({
            id: `edit-group-description-${grupo.id}`,
            label: 'Editar descripción',
            name: 'descripcion',
            maxLength: 2000,
            value: grupo.descripcion || '',
            placeholder: 'Descripción del grupo',
            rows: 3,
        })
    );

    const acciones = crearElemento('div', 'inline-form__actions');
    const botonGuardar = crearElemento('button', 'button button--primary button--small', 'Guardar cambios');
    botonGuardar.type = 'submit';
    acciones.append(
        botonGuardar,
        crearBotonAccion('Volver', 'cancelar-edicion-grupo', grupo.id, 'button--ghost button--small')
    );

    formulario.appendChild(acciones);

    return formulario;
}

/**
 * Construye el formulario para crear una tarea dentro de un grupo.
 *
 * @param {number|string} idGrupo Identificador del grupo destino.
 * @returns {HTMLFormElement} Formulario configurado para la creación.
 */
function crearFormularioCrearTarea(idGrupo) {
    const formulario = crearElemento('form', 'inline-form inline-form--task-create');
    formulario.dataset.action = 'crear-tarea';
    formulario.dataset.idGrupo = String(idGrupo);

    const encabezado = crearElemento('div', 'inline-form__heading');
    encabezado.append(
        crearElemento('h4', 'inline-form__title', 'Agregar tarea'),
        crearElemento('p', 'inline-form__description', 'Crea una tarea dentro de este grupo.')
    );

    formulario.append(
        encabezado,
        crearCampoTexto({
            id: `task-title-${idGrupo}`,
            label: 'Título de la tarea',
            name: 'titulo',
            maxLength: 160,
            placeholder: 'Ejemplo: Preparar portada',
            required: true,
            compact: true,
        }),
        crearCampoTexto({
            id: `task-description-${idGrupo}`,
            label: 'Descripción de la tarea',
            name: 'descripcion',
            maxLength: 2000,
            placeholder: 'Notas opcionales para esta tarea',
            rows: 2,
            compact: true,
        })
    );

    const acciones = crearElemento('div', 'inline-form__actions');
    const botonGuardar = crearElemento('button', 'button button--primary button--small', 'Agregar tarea');
    botonGuardar.type = 'submit';
    acciones.appendChild(botonGuardar);
    formulario.appendChild(acciones);

    return formulario;
}

/**
 * Genera la sección completa de tareas para vista o edición.
 *
 * @param {Object} grupo Grupo cuyas tareas se mostrarán.
 * @param {{editable?: boolean}} [opciones] Define si la lista permite acciones directas.
 * @returns {HTMLElement} Sección con listado de tareas o estado vacío.
 */
function crearSeccionTareas(grupo, { editable = false } = {}) {
    const seccion = crearElemento('section', 'tasks-section');
    const encabezado = crearElemento('div', 'tasks-section__header');
    encabezado.append(
        crearElemento(
            'h4',
            'tasks-section__title',
            editable ? 'Editar tareas del grupo' : 'Tareas del grupo'
        ),
        crearElemento(
            'span',
            'tasks-section__caption',
            grupo.total_tareas > 0 ? `${grupo.total_tareas} registradas` : 'Sin tareas todavía'
        )
    );
    seccion.appendChild(encabezado);

    if (!Array.isArray(grupo.tareas) || grupo.tareas.length === 0) {
        seccion.appendChild(
            crearElemento(
                'div',
                'task-empty-state',
                'Este grupo aún no tiene tareas. Agrega la primera desde el formulario superior.'
            )
        );
        return seccion;
    }

    const lista = crearElemento('ul', 'task-list');
    grupo.tareas.forEach((tarea) => {
        lista.appendChild(crearElementoTarea(tarea, { editable }));
    });
    seccion.appendChild(lista);

    return seccion;
}

/**
 * Construye el bloque detallado de una tarea dentro del modal.
 *
 * @param {Object} tarea Datos de la tarea a renderizar.
 * @param {{editable?: boolean}} [opciones] Indica si la tarea mostrará controles de edición.
 * @returns {HTMLLIElement} Elemento de lista con información y acciones.
 */
function crearElementoTarea(tarea, { editable = false } = {}) {
    const elemento = crearElemento('li', tarea.completada ? 'task-item is-completed' : 'task-item');
    elemento.dataset.idTarea = String(tarea.id);

    const encabezado = crearElemento('div', 'task-item__header');
    const alternador = crearElemento('label', 'task-toggle');
    const casilla = document.createElement('input');
    casilla.type = 'checkbox';
    casilla.checked = Boolean(tarea.completada);
    casilla.disabled = !editable;

    if (editable) {
        casilla.dataset.action = 'alternar-tarea';
        casilla.dataset.idTarea = String(tarea.id);
    }

    alternador.append(
        casilla,
        crearElemento('span', 'task-toggle__text', tarea.completada ? 'Completada' : 'Pendiente')
    );

    encabezado.appendChild(alternador);

    if (editable) {
        const acciones = crearElemento('div', 'task-item__actions');
        acciones.append(
            crearBotonAccion('Editar', 'alternar-editor-tarea', tarea.id, 'button--ghost button--small'),
            crearBotonAccion('Eliminar', 'eliminar-tarea', tarea.id, 'button--danger button--small')
        );
        encabezado.appendChild(acciones);
    }

    const contenido = crearElemento('div', 'task-item__content');
    contenido.append(
        crearElemento('h5', 'task-item__title', tarea.titulo),
        crearElemento(
            'p',
            tarea.descripcion ? 'task-item__description' : 'task-item__description task-item__description--muted',
            tarea.descripcion || 'Sin descripción adicional.'
        )
    );

    const metadatos = crearElemento('div', 'task-item__meta');
    metadatos.append(
        crearElemento('span', 'task-item__meta-text', `Creada ${formatearFecha(tarea.fecha_creacion)}`),
        crearElemento('span', 'task-item__meta-text', `Actualizada ${formatearFecha(tarea.fecha_actualizacion)}`)
    );

    elemento.append(encabezado, contenido, metadatos);

    if (editable) {
        elemento.appendChild(crearFormularioEdicionTarea(tarea));
    }

    return elemento;
}

/**
 * Genera el formulario embebido para editar una tarea existente.
 *
 * @param {Object} tarea Datos actuales de la tarea.
 * @returns {HTMLFormElement} Formulario oculto que se despliega bajo la tarea.
 */
function crearFormularioEdicionTarea(tarea) {
    const formulario = crearElemento('form', 'inline-form inline-form--task-edit hidden');
    formulario.dataset.action = 'actualizar-tarea';
    formulario.dataset.idTarea = String(tarea.id);

    formulario.append(
        crearCampoTexto({
            id: `edit-task-title-${tarea.id}`,
            label: 'Editar título',
            name: 'titulo',
            maxLength: 160,
            value: tarea.titulo,
            placeholder: 'Título de la tarea',
            required: true,
            compact: true,
        }),
        crearCampoTexto({
            id: `edit-task-description-${tarea.id}`,
            label: 'Editar descripción',
            name: 'descripcion',
            maxLength: 2000,
            value: tarea.descripcion || '',
            placeholder: 'Descripción opcional',
            rows: 2,
            compact: true,
        })
    );

    const acciones = crearElemento('div', 'inline-form__actions');
    const botonGuardar = crearElemento('button', 'button button--primary button--small', 'Guardar tarea');
    botonGuardar.type = 'submit';
    acciones.append(
        botonGuardar,
        crearBotonAccion('Cancelar', 'cancelar-edicion-tarea', tarea.id, 'button--ghost button--small')
    );
    formulario.appendChild(acciones);

    return formulario;
}

/**
 * Construye un campo de texto reutilizable para formularios dinámicos.
 *
 * @param {Object} configuracion Propiedades visuales y funcionales del campo.
 * @param {string} configuracion.id Identificador único del control.
 * @param {string} configuracion.label Texto asociado a la etiqueta.
 * @param {string} configuracion.name Nombre enviado en el formulario.
 * @param {number} configuracion.maxLength Límite máximo de caracteres.
 * @param {string} [configuracion.value] Valor inicial del control.
 * @param {string} [configuracion.placeholder] Texto guía para el usuario.
 * @param {boolean} [configuracion.required] Indica si el campo es obligatorio.
 * @param {number} [configuracion.rows] Cantidad de filas cuando se genera un textarea.
 * @param {boolean} [configuracion.compact] Define si usa la variante compacta.
 * @returns {HTMLDivElement} Contenedor con etiqueta y control asociado.
 */
function crearCampoTexto({
    id,
    label,
    name,
    maxLength,
    value = '',
    placeholder = '',
    required = false,
    rows = 0,
    compact = false,
}) {
    const wrapper = crearElemento('div', compact ? 'field field--compact' : 'field');
    const labelElement = crearElemento('label', '', label);
    labelElement.setAttribute('for', id);

    let control;

    if (rows > 0) {
        control = document.createElement('textarea');
        control.rows = rows;
        control.value = value;
    } else {
        control = document.createElement('input');
        control.type = 'text';
        control.value = value;
    }

    control.id = id;
    control.name = name;
    control.maxLength = maxLength;
    control.placeholder = placeholder;
    control.required = required;

    wrapper.append(labelElement, control);

    return wrapper;
}

/**
 * Genera un botón de acción con la metadata necesaria para delegar eventos.
 *
 * @param {string} label Texto visible del botón.
 * @param {string} action Acción que se almacenará en `data-action`.
 * @param {number|string} id Identificador asociado a la acción.
 * @param {string} [className] Clases adicionales para su estilo.
 * @returns {HTMLButtonElement} Botón listo para insertarse en la interfaz.
 */
function crearBotonAccion(label, action, id, className = '') {
    const boton = crearElemento('button', `button ${className}`.trim(), label);
    boton.type = 'button';
    boton.dataset.action = action;

    if (typeof id !== 'undefined' && id !== null) {
        boton.dataset.id = String(id);
    }

    return boton;
}

/**
 * Genera un botón compacto para controles de tarjeta y modal.
 *
 * @param {Object} configuracion Datos necesarios para construir el control.
 * @param {string} configuracion.icon Icono o texto visible del botón.
 * @param {string} configuracion.action Acción delegada en `data-action`.
 * @param {number|string} configuracion.id Identificador asociado al botón.
 * @param {string} configuracion.className Clase CSS aplicada al elemento.
 * @param {string} configuracion.label Texto accesible para el usuario.
 * @param {boolean|null} [configuracion.expanded] Estado expandido para controles desplegables.
 * @returns {HTMLButtonElement} Botón con atributos de accesibilidad y acción.
 */
function crearBotonControlTarjeta({ icon, action, id, className, label, expanded = null }) {
    const boton = crearElemento('button', className, icon);
    boton.type = 'button';
    boton.dataset.action = action;
    boton.dataset.id = String(id);
    boton.setAttribute('aria-label', label);
    boton.setAttribute('title', label);

    if (expanded !== null) {
        boton.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    }

    return boton;
}

// Manejadores de eventos delegados para las tarjetas, filtros y modal.

/**
 * Atiende los clics sobre las tarjetas de grupos y sus acciones principales.
 *
 * @param {Event} event Evento de clic delegado desde el listado de grupos.
 * @returns {void} No retorna datos.
 */
function manejarClicGrupos(event) {
    const boton = event.target.closest('button[data-action]');

    if (!boton) {
        return;
    }

    if (boton.dataset.action === 'alternar-tareas-grupo') {
        alternarTareasGrupo(Number(boton.dataset.id));
        return;
    }

    if (boton.dataset.action === 'editar-grupo') {
        abrirModalGrupo(Number(boton.dataset.id), 'edicion-grupo');
        return;
    }

    if (boton.dataset.action === 'editar-tareas') {
        abrirModalGrupo(Number(boton.dataset.id), 'edicion-tareas');
        return;
    }

    if (boton.dataset.action === 'eliminar-grupo') {
        eliminarGrupo(boton);
    }
}

/**
 * Detecta cambios en los controles del listado de grupos.
 *
 * Actualmente se utiliza para alternar el estado de las tareas desde las
 * tarjetas expandidas del panel principal.
 *
 * @param {Event} event Evento change emitido por el contenedor de grupos.
 * @returns {void} No retorna datos.
 */
function manejarCambioGrupos(event) {
    const target = event.target;

    if (!(target instanceof HTMLInputElement) || target.dataset.action !== 'alternar-tarea') {
        return;
    }

    alternarTarea(target);
}

/**
 * Atiende los clics sobre la lista de actividad reciente.
 *
 * @param {Event} event Evento de clic delegado desde la actividad lateral.
 * @returns {void} No retorna datos.
 */
function manejarClicActividad(event) {
    const boton = event.target.closest('button[data-action="abrir-grupo"]');

    if (!boton) {
        return;
    }

    abrirModalGrupo(Number(boton.dataset.id), 'vista');
}

/**
 * Cambia el filtro de grupos visible en la página principal.
 *
 * @param {Event} event Evento de clic originado en la fila de filtros.
 * @returns {void} No retorna datos.
 */
function manejarClicFiltro(event) {
    const boton = event.target.closest('button[data-filter]');

    if (!boton) {
        return;
    }

    estadoAplicacion.filtroEstado = boton.dataset.filter || 'todos';
    mostrarEstadoFiltro();
    mostrarGrupos();
}

/**
 * Refleja visualmente cuál es el filtro de estado activo.
 *
 * @returns {void} No retorna datos.
 */
function mostrarEstadoFiltro() {
    if (!elementos.filaFiltros) {
        return;
    }

    const botones = elementos.filaFiltros.querySelectorAll('button[data-filter]');

    botones.forEach((boton) => {
        boton.classList.toggle('is-active', boton.dataset.filter === estadoAplicacion.filtroEstado);
    });
}

/**
 * Expande o contrae la lista breve de tareas de una tarjeta de grupo.
 *
 * @param {number|string} idGrupo Identificador del grupo afectado.
 * @returns {void} No retorna datos.
 */
function alternarTareasGrupo(idGrupo) {
    if (estadoAplicacion.idsGruposExpandidos.has(idGrupo)) {
        estadoAplicacion.idsGruposExpandidos.delete(idGrupo);
    } else {
        estadoAplicacion.idsGruposExpandidos.add(idGrupo);
    }

    mostrarGrupos();
}

/**
 * Gestiona las acciones disponibles dentro del modal de grupo.
 *
 * @param {Event} event Evento de clic delegado desde el modal.
 * @returns {void} No retorna datos.
 */
function manejarClicModal(event) {
    if (event.target.closest('[data-close-modal]')) {
        cerrarModal();
        return;
    }

    const boton = event.target.closest('button[data-action]');

    if (!boton) {
        return;
    }

    const accion = boton.dataset.action;

    if (accion === 'cambiar-a-edicion-grupo') {
        abrirModalGrupo(Number(boton.dataset.id), 'edicion-grupo');
        return;
    }

    if (accion === 'cambiar-a-edicion-tareas') {
        abrirModalGrupo(Number(boton.dataset.id), 'edicion-tareas');
        return;
    }

    if (accion === 'cambiar-a-vista' || accion === 'cancelar-edicion-grupo') {
        abrirModalGrupo(Number(boton.dataset.id), 'vista');
        return;
    }

    if (accion === 'eliminar-grupo') {
        eliminarGrupo(boton);
        return;
    }

    if (accion === 'eliminar-tarea') {
        eliminarTarea(boton);
        return;
    }

    if (accion === 'alternar-editor-tarea') {
        const formulario = boton.closest('.task-item').querySelector('form[data-action="actualizar-tarea"]');
        formulario.classList.toggle('hidden');
        return;
    }

    if (accion === 'cancelar-edicion-tarea') {
        const formulario = boton.closest('form[data-action="actualizar-tarea"]');
        formulario.classList.add('hidden');
        formulario.reset();
    }
}

/**
 * Procesa los formularios enviados desde el modal según su acción.
 *
 * @param {Event} event Evento submit emitido por el modal.
 * @returns {Promise<void>} Ejecuta la operación correspondiente sin retornar datos.
 */
async function manejarEnvioModal(event) {
    const formulario = event.target;

    if (!(formulario instanceof HTMLFormElement) || !formulario.dataset.action) {
        return;
    }

    event.preventDefault();

    if (formulario.dataset.action === 'actualizar-grupo') {
        await enviarActualizacionGrupo(formulario);
        return;
    }

    if (formulario.dataset.action === 'crear-tarea') {
        await enviarCreacionTarea(formulario);
        return;
    }

    if (formulario.dataset.action === 'actualizar-tarea') {
        await enviarActualizacionTarea(formulario);
    }
}

/**
 * Atiende cambios en los controles del modal, como el estado de una tarea.
 *
 * @param {Event} event Evento change delegado desde el modal.
 * @returns {void} No retorna datos.
 */
function manejarCambioModal(event) {
    const target = event.target;

    if (!(target instanceof HTMLInputElement) || target.dataset.action !== 'alternar-tarea') {
        return;
    }

    alternarTarea(target);
}

/**
 * Permite cerrar el modal con la tecla Escape.
 *
 * @param {KeyboardEvent} event Evento de teclado escuchado en el documento.
 * @returns {void} No retorna datos.
 */
function manejarTeclaDocumento(event) {
    if (event.key === 'Escape' && !elementos.modal.classList.contains('hidden')) {
        cerrarModal();
    }
}

// Operaciones CRUD y sincronización con los endpoints de la API.

/**
 * Envía el formulario de creación de grupos al backend.
 *
 * @param {Event} event Evento submit del formulario principal.
 * @returns {Promise<void>} No retorna datos, actualiza la interfaz y los mensajes.
 */
async function manejarCreacionGrupo(event) {
    event.preventDefault();

    const formulario = event.currentTarget;
    cambiarEstadoFormulario(formulario, true);
    mostrarMensaje(elementos.mensajeFormularioGrupo, 'Creando grupo...');

    try {
        const datos = await hacerPeticionApi('api/create_group.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                titulo: obtenerValorCampo(formulario, 'titulo'),
                descripcion: obtenerValorCampo(formulario, 'descripcion'),
            }),
        });

        formulario.reset();
        mostrarMensaje(elementos.mensajeFormularioGrupo, datos.mensaje || 'Grupo creado correctamente.', 'exito');
        await cargarGrupos({ mostrarCarga: false });
        mostrarMensaje(elementos.mensajePagina, datos.mensaje || 'Grupo creado correctamente.', 'exito');
        resaltarTarjetaGrupo(datos.id_grupo);
    } catch (error) {
        mostrarMensaje(elementos.mensajeFormularioGrupo, error.message, 'error');
    } finally {
        cambiarEstadoFormulario(formulario, false);
    }
}

/**
 * Envía al backend los cambios realizados sobre un grupo.
 *
 * @param {HTMLFormElement} formulario Formulario de edición del grupo.
 * @returns {Promise<void>} No retorna datos, refresca el estado de la vista.
 */
async function enviarActualizacionGrupo(formulario) {
    cambiarEstadoFormulario(formulario, true);

    try {
        const datos = await hacerPeticionApi('api/update_group.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: Number(formulario.dataset.idGrupo),
                titulo: obtenerValorCampo(formulario, 'titulo'),
                descripcion: obtenerValorCampo(formulario, 'descripcion'),
            }),
        });

        await cargarGrupos({ mostrarCarga: false });
        mostrarMensaje(elementos.mensajePagina, datos.mensaje || 'Grupo actualizado correctamente.', 'exito');
        mostrarMensaje(elementos.mensajeModal, datos.mensaje || 'Grupo actualizado correctamente.', 'exito');
    } catch (error) {
        mostrarMensaje(elementos.mensajePagina, error.message, 'error');
        mostrarMensaje(elementos.mensajeModal, error.message, 'error');
    } finally {
        cambiarEstadoFormulario(formulario, false);
    }
}

/**
 * Elimina un grupo completo después de la confirmación del usuario.
 *
 * @param {HTMLButtonElement} boton Botón que dispara la eliminación.
 * @returns {Promise<void>} No retorna datos, actualiza la lista de grupos.
 */
async function eliminarGrupo(boton) {
    const idGrupo = Number(boton.dataset.id);

    if (!window.confirm('Se eliminará el grupo completo con todas sus tareas. ¿Deseas continuar?')) {
        return;
    }

    boton.disabled = true;

    try {
        const datos = await hacerPeticionApi('api/delete_group.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: idGrupo }),
        });

        if (estadoAplicacion.idGrupoActivo === idGrupo) {
            cerrarModal();
        }

        estadoAplicacion.idsGruposExpandidos.delete(idGrupo);

        await cargarGrupos({ mostrarCarga: false });
        mostrarMensaje(elementos.mensajePagina, datos.mensaje || 'Grupo eliminado correctamente.', 'exito');
    } catch (error) {
        mostrarMensaje(elementos.mensajePagina, error.message, 'error');
        mostrarMensaje(elementos.mensajeModal, error.message, 'error');
    } finally {
        boton.disabled = false;
    }
}

/**
 * Registra una nueva tarea dentro del grupo activo.
 *
 * @param {HTMLFormElement} formulario Formulario de creación de tareas.
 * @returns {Promise<void>} No retorna datos, recarga el contenido actualizado.
 */
async function enviarCreacionTarea(formulario) {
    cambiarEstadoFormulario(formulario, true);

    try {
        const datos = await hacerPeticionApi('api/create_task.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id_grupo: Number(formulario.dataset.idGrupo),
                titulo: obtenerValorCampo(formulario, 'titulo'),
                descripcion: obtenerValorCampo(formulario, 'descripcion'),
            }),
        });

        formulario.reset();
        await cargarGrupos({ mostrarCarga: false });
        mostrarMensaje(elementos.mensajePagina, datos.mensaje || 'Tarea creada correctamente.', 'exito');
        mostrarMensaje(elementos.mensajeModal, datos.mensaje || 'Tarea creada correctamente.', 'exito');
    } catch (error) {
        mostrarMensaje(elementos.mensajePagina, error.message, 'error');
        mostrarMensaje(elementos.mensajeModal, error.message, 'error');
    } finally {
        cambiarEstadoFormulario(formulario, false);
    }
}

/**
 * Guarda en la API los cambios realizados sobre una tarea.
 *
 * @param {HTMLFormElement} formulario Formulario de edición de la tarea.
 * @returns {Promise<void>} No retorna datos, sincroniza el modal y el panel.
 */
async function enviarActualizacionTarea(formulario) {
    cambiarEstadoFormulario(formulario, true);

    try {
        const datos = await hacerPeticionApi('api/update_task.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: Number(formulario.dataset.idTarea),
                titulo: obtenerValorCampo(formulario, 'titulo'),
                descripcion: obtenerValorCampo(formulario, 'descripcion'),
            }),
        });

        await cargarGrupos({ mostrarCarga: false });
        mostrarMensaje(elementos.mensajePagina, datos.mensaje || 'Tarea actualizada correctamente.', 'exito');
        mostrarMensaje(elementos.mensajeModal, datos.mensaje || 'Tarea actualizada correctamente.', 'exito');
    } catch (error) {
        mostrarMensaje(elementos.mensajePagina, error.message, 'error');
        mostrarMensaje(elementos.mensajeModal, error.message, 'error');
    } finally {
        cambiarEstadoFormulario(formulario, false);
    }
}

/**
 * Elimina una tarea luego de confirmar la acción con el usuario.
 *
 * @param {HTMLButtonElement} boton Botón asociado a la tarea a eliminar.
 * @returns {Promise<void>} No retorna datos, recarga los grupos actualizados.
 */
async function eliminarTarea(boton) {
    const idTarea = Number(boton.dataset.id);

    if (!window.confirm('Se eliminará esta tarea. ¿Deseas continuar?')) {
        return;
    }

    boton.disabled = true;

    try {
        const datos = await hacerPeticionApi('api/delete_task.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: idTarea }),
        });

        await cargarGrupos({ mostrarCarga: false });
        mostrarMensaje(elementos.mensajePagina, datos.mensaje || 'Tarea eliminada correctamente.', 'exito');
        mostrarMensaje(elementos.mensajeModal, datos.mensaje || 'Tarea eliminada correctamente.', 'exito');
    } catch (error) {
        mostrarMensaje(elementos.mensajePagina, error.message, 'error');
        mostrarMensaje(elementos.mensajeModal, error.message, 'error');
    } finally {
        boton.disabled = false;
    }
}

/**
 * Cambia el estado de completada o pendiente de una tarea.
 *
 * Si la petición falla, revierte la casilla para mantener la interfaz
 * alineada con el estado real almacenado en la base de datos.
 *
 * @param {HTMLInputElement} casilla Casilla que representa el estado de la tarea.
 * @returns {Promise<void>} No retorna datos, sincroniza la vista con la API.
 */
async function alternarTarea(casilla) {
    const completada = casilla.checked;
    casilla.disabled = true;

    try {
        const datos = await hacerPeticionApi('api/toggle_task.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                id: Number(casilla.dataset.idTarea),
                completada,
            }),
        });

        await cargarGrupos({ mostrarCarga: false });
        mostrarMensaje(elementos.mensajePagina, datos.mensaje || 'Estado de la tarea actualizado.', 'exito');
        mostrarMensaje(elementos.mensajeModal, datos.mensaje || 'Estado de la tarea actualizado.', 'exito');
    } catch (error) {
        casilla.checked = !completada;
        mostrarMensaje(elementos.mensajePagina, error.message, 'error');
        mostrarMensaje(elementos.mensajeModal, error.message, 'error');
    } finally {
        casilla.disabled = false;
    }
}

// Gestión del modal principal de detalle y edición de grupos.

/**
 * Abre el modal del grupo solicitado en el modo indicado.
 *
 * @param {number|string} idGrupo Identificador del grupo a mostrar.
 * @param {string} [modo='vista'] Vista del modal que se debe renderizar.
 * @returns {void} No retorna datos.
 */
function abrirModalGrupo(idGrupo, modo = 'vista') {
    const grupo = buscarGrupoPorId(idGrupo);

    if (!grupo) {
        mostrarMensaje(elementos.mensajePagina, 'No se pudo abrir el grupo solicitado.', 'error');
        return;
    }

    estadoAplicacion.idGrupoActivo = idGrupo;
    estadoAplicacion.modoModal = modo;
    mostrarMensaje(elementos.mensajeModal, '');
    mostrarModal(grupo);
    elementos.modal.classList.remove('hidden');
    elementos.modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
}

/**
 * Cierra el modal y limpia su estado visual y de aplicación.
 *
 * @returns {void} No retorna datos.
 */
function cerrarModal() {
    elementos.modal.classList.add('hidden');
    elementos.modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    elementos.cuerpoModal.replaceChildren();
    elementos.insigniaModal.replaceChildren();
    mostrarMensaje(elementos.mensajeModal, '');
    estadoAplicacion.idGrupoActivo = null;
    estadoAplicacion.modoModal = 'vista';
}

/**
 * Mantiene el contenido del modal alineado con el estado más reciente.
 *
 * @returns {void} No retorna datos.
 */
function sincronizarModalConEstado() {
    if (elementos.modal.classList.contains('hidden') || estadoAplicacion.idGrupoActivo === null) {
        return;
    }

    const grupo = buscarGrupoPorId(estadoAplicacion.idGrupoActivo);

    if (!grupo) {
        cerrarModal();
        return;
    }

    mostrarModal(grupo);
}

/**
 * Renderiza el encabezado y el cuerpo del modal para un grupo específico.
 *
 * @param {Object} grupo Grupo que se mostrará en el modal.
 * @returns {void} No retorna datos.
 */
function mostrarModal(grupo) {
    elementos.tituloModal.textContent = grupo.titulo;
    elementos.subtituloModal.textContent = obtenerSubtituloModal();

    elementos.insigniaModal.replaceChildren(crearInsigniaEstado(grupo.estado));
    elementos.cuerpoModal.replaceChildren(crearContenidoModal(grupo));
}

/**
 * Construye el contenido interno del modal según el modo activo.
 *
 * @param {Object} grupo Datos del grupo activo.
 * @returns {DocumentFragment} Fragmento con el resumen y la vista correspondiente.
 */
function crearContenidoModal(grupo) {
    const fragmento = document.createDocumentFragment();
    const resumen = crearElemento('section', 'modal-summary');
    resumen.append(
        crearElemento(
            'p',
            grupo.descripcion ? 'modal-summary__description' : 'modal-summary__description modal-summary__description--muted',
            grupo.descripcion || 'Sin descripción por ahora.'
        ),
        crearMetaModal(grupo),
        crearSeccionProgreso(grupo)
    );

    const acciones = crearElemento('div', 'modal-summary__actions');
    if (estadoAplicacion.modoModal === 'edicion-grupo' || estadoAplicacion.modoModal === 'edicion-tareas') {
        acciones.append(
            crearBotonAccion('Ver resumen', 'cambiar-a-vista', grupo.id, 'button--ghost button--small'),
            crearBotonAccion('Eliminar grupo', 'eliminar-grupo', grupo.id, 'button--danger button--small')
        );
    } else {
        acciones.append(
            crearBotonAccion('Editar grupo', 'cambiar-a-edicion-grupo', grupo.id, 'button--soft button--small'),
            crearBotonAccion('Editar tareas', 'cambiar-a-edicion-tareas', grupo.id, 'button--ghost button--small'),
            crearBotonAccion('Eliminar grupo', 'eliminar-grupo', grupo.id, 'button--danger button--small')
        );
    }
    resumen.appendChild(acciones);
    fragmento.appendChild(resumen);

    if (estadoAplicacion.modoModal === 'edicion-grupo') {
        fragmento.appendChild(crearFormularioEdicionGrupo(grupo));
        return fragmento;
    }

    if (estadoAplicacion.modoModal === 'edicion-tareas') {
        fragmento.append(crearFormularioCrearTarea(grupo.id), crearSeccionTareas(grupo, { editable: true }));
        return fragmento;
    }

    fragmento.appendChild(crearSeccionTareas(grupo, { editable: false }));

    return fragmento;
}

/**
 * Devuelve el subtítulo contextual que acompaña al modal.
 *
 * @returns {string} Texto descriptivo según el modo actual del modal.
 */
function obtenerSubtituloModal() {
    if (estadoAplicacion.modoModal === 'edicion-grupo') {
        return 'Edita el nombre y la descripción del grupo.';
    }

    if (estadoAplicacion.modoModal === 'edicion-tareas') {
        return 'Agrega, edita o elimina tareas de este grupo.';
    }

    return 'Revisa el progreso y el detalle de las tareas de este grupo.';
}

/**
 * Genera el bloque de metadatos visibles en el resumen del modal.
 *
 * @param {Object} grupo Grupo activo del modal.
 * @returns {HTMLDivElement} Contenedor con datos rápidos del grupo.
 */
function crearMetaModal(grupo) {
    const metadatos = crearElemento('div', 'group-card__meta');
    metadatos.append(
        crearPildoraMeta('Estado', obtenerEtiquetaEstado(grupo.estado)),
        crearPildoraMeta('Pendientes', String(grupo.tareas_pendientes)),
        crearPildoraMeta('Actualizado', formatearFecha(grupo.fecha_actualizacion))
    );

    return metadatos;
}

/**
 * Busca un grupo dentro del estado local por su identificador.
 *
 * @param {number|string} idGrupo Identificador del grupo buscado.
 * @returns {Object|null} Grupo encontrado o `null` si no existe.
 */
function buscarGrupoPorId(idGrupo) {
    return estadoAplicacion.grupos.find((grupo) => grupo.id === idGrupo) || null;
}

/**
 * Elimina del estado local los grupos expandidos que ya no existen.
 *
 * @returns {void} No retorna datos.
 */
function sincronizarGruposExpandidos() {
    const idsValidos = new Set(estadoAplicacion.grupos.map((grupo) => grupo.id));

    estadoAplicacion.idsGruposExpandidos.forEach((idGrupo) => {
        if (!idsValidos.has(idGrupo)) {
            estadoAplicacion.idsGruposExpandidos.delete(idGrupo);
        }
    });
}

/**
 * Resalta temporalmente una tarjeta recién creada o actualizada.
 *
 * @param {number|string} idGrupo Identificador del grupo a destacar.
 * @returns {void} No retorna datos.
 */
function resaltarTarjetaGrupo(idGrupo) {
    estadoAplicacion.idGrupoResaltado = idGrupo;
    mostrarGrupos();

    const tarjeta = elementos.listaGrupos.querySelector(`[data-id-grupo="${idGrupo}"]`);

    if (tarjeta) {
        tarjeta.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    window.setTimeout(() => {
        estadoAplicacion.idGrupoResaltado = null;
        mostrarGrupos();
    }, 1800);
}

// Utilidades generales de comunicación, formato y estado visual.

/**
 * Realiza una petición a la API y valida la estructura de la respuesta.
 *
 * Convierte los errores de red o de formato en mensajes consistentes para
 * el resto de la interfaz.
 *
 * @param {string} url Ruta del endpoint a consumir.
 * @param {RequestInit} [options] Opciones nativas de `fetch`.
 * @returns {Promise<Object>} Datos validados devueltos por la API.
 */
async function hacerPeticionApi(url, options = {}) {
    let respuesta;

    try {
        respuesta = await fetch(url, options);
    } catch (error) {
        throw new Error('No se pudo conectar con el servidor.');
    }

    let datos;

    try {
        datos = await respuesta.json();
    } catch (error) {
        throw new Error('La respuesta del servidor no es válida.');
    }

    if (!respuesta.ok || !datos.exito) {
        throw new Error(datos.mensaje || 'Ocurrió un error al procesar la solicitud.');
    }

    return datos;
}

/**
 * Muestra una caja de estado dentro del listado principal de grupos.
 *
 * @param {string} className Clase visual aplicada al mensaje.
 * @param {string} mensaje Texto que se mostrará al usuario.
 * @returns {void} No retorna datos.
 */
function mostrarCajaEstado(className, mensaje) {
    const caja = crearElemento('div', `state-box ${className}`.trim());
    caja.append(
        crearElemento('strong', 'state-box__title', className === 'loading-state' ? 'Cargando' : 'Sin resultados'),
        crearElemento('p', 'state-box__body', mensaje)
    );

    elementos.listaGrupos.replaceChildren(caja);
}

/**
 * Crea un elemento HTML simple con clase y texto opcionales.
 *
 * @param {string} tagName Etiqueta HTML que se creará.
 * @param {string} [className=''] Clases CSS que se asignarán al elemento.
 * @param {string|null} [text=null] Texto que se insertará en el contenido.
 * @returns {HTMLElement} Elemento HTML recién creado.
 */
function crearElemento(tagName, className = '', text = null) {
    const elemento = document.createElement(tagName);

    if (className) {
        elemento.className = className;
    }

    if (text !== null) {
        elemento.textContent = text;
    }

    return elemento;
}

/**
 * Obtiene el valor de un campo de formulario y elimina espacios externos.
 *
 * @param {HTMLFormElement} formulario Formulario del que se leerá el campo.
 * @param {string} name Nombre del control a recuperar.
 * @returns {string} Valor normalizado del campo o cadena vacía.
 */
function obtenerValorCampo(formulario, name) {
    const campo = formulario.elements.namedItem(name);

    if (campo instanceof HTMLInputElement || campo instanceof HTMLTextAreaElement) {
        return campo.value.trim();
    }

    return '';
}

/**
 * Calcula el porcentaje de avance de un grupo según sus tareas completadas.
 *
 * @param {Object} grupo Grupo del que se calculará el progreso.
 * @returns {number} Porcentaje entero entre 0 y 100.
 */
function calcularProgreso(grupo) {
    const totalTareas = Number(grupo.total_tareas || 0);

    if (totalTareas <= 0) {
        return 0;
    }

    return Math.round((Number(grupo.tareas_completadas || 0) / totalTareas) * 100);
}

/**
 * Traduce el estado interno del grupo a una etiqueta legible.
 *
 * @param {string} estado Estado técnico almacenado en la aplicación.
 * @returns {string} Texto listo para mostrar al usuario.
 */
function obtenerEtiquetaEstado(estado) {
    const etiquetas = {
        vacio: 'Vacío',
        en_progreso: 'En progreso',
        completado: 'Completado',
    };

    return etiquetas[estado] || 'Sin estado';
}

/**
 * Obtiene la clase CSS asociada a un estado lógico del grupo.
 *
 * @param {string} estado Estado técnico del grupo.
 * @returns {string} Sufijo de clase usado por la interfaz.
 */
function obtenerClaseEstado(estado) {
    const clases = {
        vacio: 'empty',
        en_progreso: 'in_progress',
        completado: 'completed',
    };

    return clases[estado] || 'empty';
}

/**
 * Formatea una fecha para mostrarla con una salida legible en español.
 *
 * Si el valor no puede convertirse en fecha válida, se devuelve tal como llega.
 *
 * @param {string} valor Fecha original recibida desde la API.
 * @returns {string} Fecha formateada para la interfaz.
 */
function formatearFecha(valor) {
    const fecha = new Date(valor);

    if (Number.isNaN(fecha.getTime())) {
        return valor;
    }

    return new Intl.DateTimeFormat('es-CL', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(fecha);
}

/**
 * Actualiza el texto y el estilo de un mensaje dentro de la interfaz.
 *
 * @param {HTMLElement} elemento Contenedor donde se mostrará el mensaje.
 * @param {string} mensaje Texto que se desea mostrar.
 * @param {string} [tipo=''] Variante visual del mensaje.
 * @returns {void} No retorna datos.
 */
function mostrarMensaje(elemento, mensaje, tipo = '') {
    elemento.textContent = mensaje;
    elemento.classList.remove('is-success', 'is-error');

    if (tipo === 'exito') {
        elemento.classList.add('is-success');
    }

    if (tipo === 'error') {
        elemento.classList.add('is-error');
    }
}

/**
 * Habilita o deshabilita todos los controles de un formulario.
 *
 * @param {HTMLFormElement} formulario Formulario cuyos controles se actualizarán.
 * @param {boolean} estaOcupado Indica si el formulario debe quedar bloqueado.
 * @returns {void} No retorna datos.
 */
function cambiarEstadoFormulario(formulario, estaOcupado) {
    const controles = formulario.querySelectorAll('input, textarea, button');

    controles.forEach((control) => {
        control.disabled = estaOcupado;
    });
}
