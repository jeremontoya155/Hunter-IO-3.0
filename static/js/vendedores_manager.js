document.addEventListener('DOMContentLoaded', () => {
    // --- Referencias a los Elementos del DOM ---
    const vendedorModalOverlay = document.getElementById('vendedorModalOverlay');
    const vendedorForm = document.getElementById('vendedor-form');
    const vendedorModalLabel = document.getElementById('vendedorModalLabel');
    const vendedorIdInput = document.getElementById('vendedor_id');

    const desempenoModalOverlay = document.getElementById('desempenoModalOverlay');
    const desempenoForm = document.getElementById('desempeno-form');
    const desempenoVendedorIdInput = document.getElementById('desempeno_vendedor_id');
    const desempenoAccountsContainer = document.getElementById('desempeno-accounts-container');
    const desempenoModalLabel = document.getElementById('desempenoModalLabel');
    const desempenoFeedback = document.getElementById('desempeno-feedback');

    // --- Funciones para Controlar Modales ---

    // Muestra un modal específico añadiendo la clase 'modal-visible'
    const showModal = (overlayElement) => {
        if (overlayElement) {
            overlayElement.classList.add('modal-visible');
        }
    };

    // Oculta un modal específico quitando la clase 'modal-visible'
    const hideModal = (overlayElement) => {
        if (overlayElement) {
            overlayElement.classList.remove('modal-visible');
        }
    };

    // Función para abrir el Modal de Agregar/Editar Vendedor
    window.openVendedorModal = (vendedorId = null) => {
        vendedorForm.reset(); // Limpia campos previos
        desempenoFeedback.textContent = ''; // Limpia feedback si estaba abierto
        desempenoFeedback.className = 'feedback-message';

        if (vendedorId) {
            // --- MODO EDITAR ---
            const card = document.getElementById(`vendedor-card-${vendedorId}`);
            if (!card || !card.dataset.vendedor) {
                console.error("No se encontraron datos para editar el vendedor:", vendedorId);
                alert("Error: No se pudieron cargar los datos del vendedor.");
                return;
            }
            try {
                const data = JSON.parse(card.dataset.vendedor);
                vendedorModalLabel.textContent = `Editar Vendedor: ${data.nombre}`;
                vendedorIdInput.value = data.id; // Poner el ID en el input oculto

                // Llenar el formulario (asegúrate que los IDs coincidan)
                document.getElementById('modal_nombre').value = data.nombre || '';
                document.getElementById('modal_manager_asignado').value = data.manager_asignado || '';
                document.getElementById('modal_cuentas_asignadas').value = (data.cuentas_asignadas || []).join(', ');
                document.getElementById('modal_porcentaje_cumplimiento').value = data.porcentaje_cumplimiento || 0;
                document.getElementById('modal_objetivo_mensual').value = data.objetivo_mensual || 0;
                document.getElementById('modal_fecha_ingreso').value = data.fecha_ingreso ? data.fecha_ingreso.split('T')[0] : '';
                document.getElementById('modal_estado').value = data.estado || 'activo';
                document.getElementById('modal_notas_auditoria').value = data.notas_auditoria || '';

            } catch (e) {
                console.error("Error parseando datos del vendedor para editar:", e);
                alert("Error al cargar datos para editar.");
                return; // No mostrar modal si hay error
            }
        } else {
            // --- MODO AGREGAR ---
            vendedorModalLabel.textContent = 'Agregar Nuevo Vendedor';
            vendedorIdInput.value = ''; // Borrar ID por si acaso
        }
        showModal(vendedorModalOverlay); // Muestra el modal de agregar/editar
    };

    // Función para cerrar el Modal de Agregar/Editar Vendedor
    window.closeVendedorModal = () => {
        hideModal(vendedorModalOverlay);
    };

    // Función para abrir el Modal de Registrar Desempeño
    window.openDesempenoModal = (vendedorId) => {
        const card = document.getElementById(`vendedor-card-${vendedorId}`);
         if (!card || !card.dataset.vendedor) {
            console.error("No se encontraron datos para el vendedor (desempeño):", vendedorId);
             alert("Error: No se pudieron cargar los datos del vendedor.");
            return;
         }
         try {
            const data = JSON.parse(card.dataset.vendedor);
            desempenoVendedorIdInput.value = vendedorId;
            desempenoModalLabel.textContent = `Registrar Desempeño - ${data.nombre}`;
            desempenoFeedback.textContent = ''; // Limpiar feedback
            desempenoFeedback.className = 'feedback-message';
            // Poner fecha actual por defecto (ya se hace desde EJS con today)
            // document.getElementById('desempeno_fecha').valueAsDate = new Date();

            // Generar inputs dinámicamente
            desempenoAccountsContainer.innerHTML = ''; // Limpiar contenedor
            if (data.cuentas_asignadas && data.cuentas_asignadas.length > 0) {
                 data.cuentas_asignadas.forEach(cuenta => {
                    const cuentaId = cuenta.replace(/[^a-zA-Z0-9]/g, '_'); // Crear ID seguro para inputs
                    const group = document.createElement('div');
                    group.className = 'account-input-group';
                    // Guardar el nombre original de la cuenta en un atributo data-*
                    group.innerHTML = `
                        <span class="account-name" data-account-name="${cuenta}" title="${cuenta}">${cuenta}</span>
                        <label for="msg_${cuentaId}">Msgs:</label>
                        <input type="number" id="msg_${cuentaId}" name="mensajes" min="0" value="0" placeholder="Msgs">
                        <label for="rpt_${cuentaId}">Rpts:</label>
                        <input type="number" id="rpt_${cuentaId}" name="respuestas" min="0" value="0" placeholder="Rpts">
                    `;
                    desempenoAccountsContainer.appendChild(group);
                 });
            } else {
                desempenoAccountsContainer.innerHTML = '<p>Este vendedor no tiene cuentas asignadas.</p>';
            }

            showModal(desempenoModalOverlay); // Muestra el modal de desempeño

         } catch(e) {
            console.error("Error preparando modal de desempeño:", e);
            alert("Error al preparar el registro de desempeño.");
         }
    };

     // Función para cerrar el Modal de Desempeño
    window.closeDesempenoModal = () => {
        hideModal(desempenoModalOverlay);
    };


    // Función para enviar el formulario de desempeño (AJAX)
    window.submitDesempeno = async (event) => {
        event.preventDefault();
        const vendedorId = desempenoVendedorIdInput.value;
        const fecha = document.getElementById('desempeno_fecha').value;
        const accountGroups = desempenoAccountsContainer.querySelectorAll('.account-input-group');
        desempenoFeedback.textContent = 'Guardando...';
        desempenoFeedback.className = 'feedback-message';

        const desempenoData = [];
        accountGroups.forEach(group => {
            const accountNameElement = group.querySelector('.account-name');
            const mensajesInput = group.querySelector('input[name="mensajes"]');
            const respuestasInput = group.querySelector('input[name="respuestas"]');

            // Obtener el nombre de la cuenta desde el atributo data-*
            const cuentaNombre = accountNameElement ? accountNameElement.dataset.accountName : null;

            if (cuentaNombre && mensajesInput && respuestasInput) {
                 desempenoData.push({
                    cuenta: cuentaNombre,
                    mensajes: mensajesInput.value || 0,
                    respuestas: respuestasInput.value || 0
                 });
            }
        });

        if (!vendedorId || !fecha) {
             desempenoFeedback.textContent = 'Error: Falta ID de vendedor o fecha.';
             desempenoFeedback.className = 'feedback-message error';
             return;
        }
        if (desempenoData.length === 0 && accountGroups.length > 0) {
            // Si hay grupos de cuentas pero no se pudieron leer datos, puede ser un error
             console.warn("No se recopilaron datos de desempeño, aunque existen grupos de cuentas.");
            // Decide si quieres enviar un array vacío o mostrar un error
            // return; // O enviar vacío si eso es válido
        }
         if (accountGroups.length === 0) {
            desempenoFeedback.textContent = 'No hay cuentas asignadas para registrar.';
            desempenoFeedback.className = 'feedback-message error';
            return; // No enviar si no hay cuentas
        }


        try {
            const response = await fetch('/vendedores/desempeno', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vendedor_id: vendedorId, fecha: fecha, desempeno: desempenoData })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                desempenoFeedback.textContent = result.message || '¡Guardado correctamente!';
                desempenoFeedback.className = 'feedback-message success';
                setTimeout(() => {
                     closeDesempenoModal();
                     location.reload(); // Recargar la página para ver cambios (más simple)
                     // Alternativa avanzada: actualizar solo la card afectada sin recargar
                }, 1500);
            } else {
                throw new Error(result.message || 'Error desconocido del servidor');
            }
        } catch (error) {
            console.error('Error al enviar desempeño:', error);
            desempenoFeedback.textContent = `Error: ${error.message}`;
            desempenoFeedback.className = 'feedback-message error';
        }
    };

    // --- Event Listener para cerrar modales si se hace clic fuera ---
    [vendedorModalOverlay, desempenoModalOverlay].forEach(overlay => {
        if(overlay) {
            overlay.addEventListener('click', (event) => {
                // Si se hace clic directamente en el overlay (fondo)
                if (event.target === overlay) {
                    hideModal(overlay);
                }
            });
        }
    });

}); // Fin DOMContentLoaded