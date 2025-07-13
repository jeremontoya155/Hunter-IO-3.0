document.addEventListener('DOMContentLoaded', function () {
        // ============================================
        //   TEXTOS (Ajustados para listas sin HTML interno)
        // ============================================
        const spanishElements = {
          title: 'HUNTER - Bienvenida y Primeros Pasos',
          // HTML ajustado para la nueva estructura del encabezado
          mainHeadingHTML: `<span class='intro-text'>Bienvenido a</span> <span class='highlight'>HUNTER</span><span class='slogan'>Donde no esperamos oportunidades — las creamos y las cazamos</span>`,
          step1Title: 'Inicia Sesión y Desbloquea el Poder',
          step1Intro:
            'Para comenzar tu cacería de resultados, completa estas tareas:',
          step1List: [
            // Solo texto, el HTML (checkbox + label) se genera en JS
            'Accede a Instagram: Introduce tus credenciales de forma segura.',
            'Mensajes Personalizados: Sube tu archivo con mensajes irresistibles.',
            'Preguntas Clave: Define las preguntas que activarán tu estrategia.',
            'Lista de Objetivos: Carga tu archivo con las cuentas a contactar.',
            '¡Inicia Sesión!: Presiona el botón y deja que HUNTER haga su magia.',
          ],
          step1TutorialLinkText: 'Ver Tutorial Paso 1',
          step2Title: 'Explora tu Centro de Mando: El Dashboard',
          step2Intro:
            'Una vez dentro, el <strong>DASHBOARD</strong> será tu torre de control. Revisa estos puntos:',
          step2List: [
            // Solo texto
            'Métricas Clave: Visualiza mensajes enviados y rendimiento al instante.',
            'Estadísticas Precisas: Entiende qué funciona y optimiza tu enfoque.',
            'Actividad y Crecimiento: Observa el impacto directo en tu perfil.',
          ],
          step2TutorialLinkText: 'Ver Tutorial Paso 2',
          step3Title: 'Navega con Agilidad: Panel Lateral',
          step3Intro:
            'El panel lateral izquierdo es tu arsenal de herramientas. Familiarízate con:',
          step3List: [
            // Solo texto
            'Dashboard: Tu vista principal, siempre accesible.',
            'Perfil y Análisis: Profundiza en el crecimiento y la interacción.',
            'Configuración: Personaliza HUNTER a tu medida.',
          ],
          step3TutorialLinkText: 'Ver Tutorial Paso 3',
          footerCta: ' Tus metas son nuestro blanco ', // Solo CTA
          contactLinkText: 'Contáctanos', // Texto para el enlace de contacto
        };
        const englishElements = {
          title: 'HUNTER - Welcome and First Steps',
          // HTML ajustado para la nueva estructura del encabezado
          mainHeadingHTML: `<span class='intro-text'>Welcome to</span> <span class='highlight'>HUNTER</span><span class='slogan'>Where we don't wait for opportunities  we create and hunt them</span>`,
          step1Title: 'Log In and Unlock the Power',
          step1Intro: 'To start your results hunt, complete these tasks:',
          step1List: [
            // Just text
            'Access Instagram: Enter your credentials securely.',
            'Customized Messages: Upload your file with irresistible messages.',
            'Key Questions: Define the questions that will activate your strategy.',
            'Target List: Load your file with accounts to contact.',
            'Log In!: Press the button and let HUNTER work its magic.',
          ],
          step1TutorialLinkText: 'Watch Step 1 Tutorial',
          step2Title: 'Explore your Command Center: The Dashboard',
          step2Intro:
            'Once inside, the <strong>DASHBOARD</strong> will be your control tower. Review these points:',
          step2List: [
            // Just text
            'Key Metrics: Visualize sent messages and performance instantly.',
            'Precise Statistics: Understand what works and optimize your approach.',
            'Activity and Growth: Observe the direct impact on your profile.',
          ],
          step2TutorialLinkText: 'Watch Step 2 Tutorial',
          step3Title: 'Navigate with Agility: Side Panel',
          step3Intro:
            'The left side panel is your toolkit arsenal. Familiarize yourself with:',
          step3List: [
            // Just text
            'Dashboard: Your main view, always accessible.',
            'Profile and Analysis: Dive deep into growth and interaction.',
            'Settings: Customize HUNTER to your measure.',
          ],
          step3TutorialLinkText: 'Watch Step 3 Tutorial',
          footerCta: 'Your goals are our target', // Just CTA (removed icons for simplicity)
          contactLinkText: 'Contact Us', // Text for the contact link
        };

        // ============================================
        //   MANEJO DEL ESTADO (localStorage)
        // ============================================
        const storageKeys = {
          expanded: 'hunterOnboardingExpandedSteps',
          // NUEVO: Estado de completado por tarea
          tasksCompleted: 'hunterOnboardingTasksCompleted',
          language: 'preferredLanguage',
        };

        function getStoredState(key, defaultValue) {
          try {
            const stored = localStorage.getItem(key);
            // Si no hay nada guardado o es inválido, devuelve el valor por defecto
            if (stored === null || stored === undefined) return defaultValue;
            // Intenta parsear, si falla, devuelve el valor por defecto
            try {
              return JSON.parse(stored);
            } catch (parseError) {
              console.warn(
                `Invalid JSON in localStorage for key ${key}, returning default.`
              );
              return defaultValue;
            }
          } catch (e) {
            console.error(`Error reading state (${key}):`, e);
            return defaultValue;
          }
        }

        function saveState(key, state) {
          try {
            localStorage.setItem(key, JSON.stringify(state));
          } catch (e) {
            console.error(`Error saving state (${key}):`, e);
          }
        }

        // Estado inicial (o cargado desde localStorage)
        let expandedState = getStoredState(storageKeys.expanded, {});
        // NUEVO: tasksCompleted guarda arrays de booleanos por paso
        // Ejemplo: { "1": [false, false, true], "2": [false, true], "3": [] }
        // Se inicializará dinámicamente basado en los textos
        let tasksCompletedState = getStoredState(
          storageKeys.tasksCompleted,
          {}
        );

        // ============================================
        //   REFERENCIAS A ELEMENTOS DEL DOM
        // ============================================
        const steps = document.querySelectorAll('.onboarding-step');
        const stepElements = {
          1: {
            section: document.getElementById('step-1-section'),
            header: document.querySelector('#step-1-section .step-header'),
            body: document.querySelector('#step-1-section .step-body'),
            list: document.getElementById('step1-list'),
            intro: document.getElementById('step1-intro'),
            title: document.getElementById('step1-title'),
            tutorialLink: document.getElementById('tutorial-link-1'),
          },
          2: {
            section: document.getElementById('step-2-section'),
            header: document.querySelector('#step-2-section .step-header'),
            body: document.querySelector('#step-2-section .step-body'),
            list: document.getElementById('step2-list'),
            intro: document.getElementById('step2-intro'),
            title: document.getElementById('step2-title'),
            tutorialLink: document.getElementById('tutorial-link-2'),
          },
          3: {
            section: document.getElementById('step-3-section'),
            header: document.querySelector('#step-3-section .step-header'),
            body: document.querySelector('#step-3-section .step-body'),
            list: document.getElementById('step3-list'),
            intro: document.getElementById('step3-intro'),
            title: document.getElementById('step3-title'),
            tutorialLink: document.getElementById('tutorial-link-3'),
          },
        };

        // ============================================
        //   LÓGICA DE HABILITACIÓN/DESHABILITACIÓN DE PASOS
        // ============================================
        function isStepComplete(stepNumber) {
          const tasks = tasksCompletedState[stepNumber] || [];
          // Un paso está completo si tiene tareas Y todas están marcadas como true
          return tasks.length > 0 && tasks.every((task) => task === true);
        }

        function updateStepStates() {
          const isStep1Complete = isStepComplete('1');
          const isStep2Complete = isStepComplete('2');

          // Habilitar/Deshabilitar Paso 2
          const step2Section = stepElements['2'].section;
          if (isStep1Complete) {
            step2Section.classList.remove('disabled');
            // Asegurar que los elementos internos sean interactivos (por si acaso)
            // step2Section.style.pointerEvents = ''; // Esto ya se maneja en CSS con .disabled
          } else {
            step2Section.classList.add('disabled');
            // step2Section.style.pointerEvents = 'none'; // Redundante con CSS
            // Si se deshabilita, colapsarlo si estaba expandido
            if (stepElements['2'].body.classList.contains('expanded')) {
              stepElements['2'].body.classList.remove('expanded');
              stepElements['2'].header
                .querySelector('.step-icon')
                ?.classList.remove('expanded-icon');
              expandedState['2'] = false;
              saveState(storageKeys.expanded, expandedState); // Guardar estado colapsado
            }
          }

          // Habilitar/Deshabilitar Paso 3
          const step3Section = stepElements['3'].section;
          if (isStep1Complete && isStep2Complete) {
            step3Section.classList.remove('disabled');
            // step3Section.style.pointerEvents = ''; // Esto ya se maneja en CSS con .disabled
          } else {
            step3Section.classList.add('disabled');
            //  step3Section.style.pointerEvents = 'none'; // Redundante con CSS
            // Si se deshabilita, colapsarlo si estaba expandido
            if (stepElements['3'].body.classList.contains('expanded')) {
              stepElements['3'].body.classList.remove('expanded');
              stepElements['3'].header
                .querySelector('.step-icon')
                ?.classList.remove('expanded-icon');
              expandedState['3'] = false;
              saveState(storageKeys.expanded, expandedState); // Guardar estado colapsado
            }
          }

          // (Opcional) Marcar visualmente el número del paso si está completo
          Object.keys(stepElements).forEach((num) => {
            const stepHeader = stepElements[num].header;
            const stepNumberEl = stepHeader?.querySelector('.step-number');
            if (stepNumberEl) {
              if (isStepComplete(num)) {
                stepNumberEl.style.backgroundColor = '#2ecc71'; // Verde completado
              } else {
                // Volver al color original (o gris si está deshabilitado)
                // El color gris para deshabilitado está en el CSS, solo volvemos al color original si no está deshabilitado
                if (!stepElements[num].section.classList.contains('disabled')) {
                  stepNumberEl.style.backgroundColor = '#3498db'; // Color original
                }
              }
            }
          });
        }

        // ============================================
        //   FUNCIÓN PARA CAMBIAR IDIOMA (MODIFICADA)
        // ============================================
        window.changeLanguage = function (lang) {
          if (lang !== 'es' && lang !== 'en') {
            return;
          }
          const elements = lang === 'es' ? spanishElements : englishElements;

          // --- Actualizar Textos Generales ---
          document.title = elements.title;
          document.documentElement.setAttribute('lang', lang);
          // Usar mainHeadingHTML para el contenido del h1
          document.getElementById('main-heading').innerHTML =
            elements.mainHeadingHTML;

          // --- Actualizar Contenido de los Pasos ---
          ['1', '2', '3'].forEach((num) => {
            const stepData = stepElements[num];
            if (!stepData) return;

            // Título e Introducción
            if (stepData.title)
              stepData.title.textContent = elements[`step${num}Title`];
            if (stepData.intro)
              stepData.intro.innerHTML = elements[`step${num}Intro`]; // Usar innerHTML para <strong>

            // Lista de Tareas (Reconstruir con Checkboxes)
            const listEl = stepData.list;
            const newListData = elements[`step${num}List`];
            if (listEl) {
              listEl.innerHTML = ''; // Limpiar lista existente

              // Asegurar que el array de estado exista para este paso y tenga la longitud correcta
              if (
                !tasksCompletedState[num] ||
                tasksCompletedState[num].length !== newListData.length
              ) {
                // Si no existe o la longitud no coincide, inicializa/resetea este paso
                tasksCompletedState[num] = Array(newListData.length).fill(
                  false
                );
                console.warn(
                  `Reinitializing task state for step ${num} due to language change or inconsistency.`
                );
                // No guardar inmediatamente, updateStepStates() al final guardará si el paso se completa
              }
              const currentStepTasks = tasksCompletedState[num];

              newListData.forEach((itemText, index) => {
                const li = document.createElement('li');
                const checkboxId = `step-${num}-task-${index}`;
                const isChecked = currentStepTasks[index] === true; // Comprobar estado

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = checkboxId;
                checkbox.checked = isChecked;
                checkbox.dataset.step = num; // Guardar a qué paso pertenece
                checkbox.dataset.index = index; // Guardar índice de la tarea

                const label = document.createElement('label');
                label.htmlFor = checkboxId;
                label.innerHTML = itemText; // Usar innerHTML por si el texto tiene <strong> etc.

                li.appendChild(checkbox);
                li.appendChild(label);

                if (isChecked) {
                  li.classList.add('completed'); // Aplicar estilo si está completada
                }

                // Añadir Event Listener al Checkbox NUEVO
                checkbox.addEventListener('change', handleTaskCheckboxChange);

                listEl.appendChild(li);
              });
            }

            // Enlace Tutorial
            if (stepData.tutorialLink) {
              stepData.tutorialLink.innerHTML = `<i class="fas fa-video"></i> ${
                elements[`step${num}TutorialLinkText`]
              }`;
              // Asegurarse de que la URL base sea correcta (si cambia por idioma, ajusta aquí)
              // stepData.tutorialLink.href = ...;
            }
          });

          // --- Actualizar Footer ---
          const footerCtaEl = document.getElementById('footer-cta');
          if (footerCtaEl) {
            footerCtaEl.innerHTML = elements.footerCta;
          }

          // NUEVO: Actualizar texto del enlace de contacto
          const contactLinkEl = document.getElementById('contact-link');
          if (contactLinkEl) {
            contactLinkEl.textContent = elements.contactLinkText;
          }

          // --- Actualizar Botones Idioma ---
          const btnEs = document.getElementById('btn-es');
          const btnEn = document.getElementById('btn-en');
          if (btnEs && btnEn) {
            btnEs.classList.toggle('active', lang === 'es');
            btnEn.classList.toggle('active', lang === 'en');
          }

          // --- Guardar Idioma ---
          localStorage.setItem(storageKeys.language, lang);

          // --- Re-aplicar estado de habilitación/deshabilitación y expandido ---
          // Esto es crucial después de reconstruir el DOM y actualizar el estado de tareas
          applyInitialStates();
        };

        // ============================================
        //   MANEJADOR DE EVENTOS PARA CHECKBOX DE TAREAS
        // ============================================
        function handleTaskCheckboxChange(event) {
          const checkbox = event.target;
          const stepNumber = checkbox.dataset.step;
          const taskIndex = parseInt(checkbox.dataset.index, 10);
          const isChecked = checkbox.checked;
          const listItem = checkbox.closest('li');

          // Actualizar el estado guardado
          if (
            tasksCompletedState[stepNumber] &&
            tasksCompletedState[stepNumber][taskIndex] !== undefined
          ) {
            tasksCompletedState[stepNumber][taskIndex] = isChecked;
            saveState(storageKeys.tasksCompleted, tasksCompletedState); // Guardar cambio
          } else {
            console.error(
              'State array mismatch for task:',
              stepNumber,
              taskIndex
            );
          }

          // Actualizar estilo visual del item li
          listItem.classList.toggle('completed', isChecked);

          // Re-evaluar y actualizar qué pasos deben estar habilitados/deshabilitados
          updateStepStates();
        }

        // ============================================
        //   CONFIGURACIÓN INICIAL Y EVENT LISTENERS
        // ============================================
        function applyInitialStates() {
          // 1. Aplicar estado expandido/colapsado
          steps.forEach((step) => {
            const header = step.querySelector('.step-header');
            const body = step.querySelector('.step-body');
            const stepNumber = header?.dataset.step;
            const arrowIcon = header?.querySelector('.step-icon i'); // Asegurarse de seleccionar el <i>

            if (!header || !body || !stepNumber) return;

            // Remover listener existente antes de añadir uno nuevo para evitar duplicados
            // Esto es importante si applyInitialStates se llama múltiples veces (como en changeLanguage)
            // Clonar y reemplazar es una forma segura de remover todos los listeners
            const oldHeader = header;
            const newHeader = oldHeader.cloneNode(true);
            oldHeader.parentNode.replaceChild(newHeader, oldHeader);
            
            stepElements[stepNumber].header = newHeader;
            stepElements[stepNumber].title = newHeader.querySelector('.step-title');
            // Actualizar la referencia en stepElements si es necesario, o asegurarse de usar newHeader
            // Simplificamos usando newHeader para el listener y re-obteniendo arrowIcon
            const currentHeader = newHeader;
            const currentArrowIcon =
              currentHeader.querySelector('.step-icon i');

            // Aplicar estado expandido desde localStorage
            if (expandedState[stepNumber]) {
              body.classList.add('expanded');
              if (currentArrowIcon)
                currentArrowIcon.classList.add('expanded-icon');
            } else {
              body.classList.remove('expanded');
              if (currentArrowIcon)
                currentArrowIcon.classList.remove('expanded-icon');
            }

            // Añadir listener para expandir/colapsar (solo si no está deshabilitado)
            currentHeader.addEventListener('click', () => {
              // Prevenir si el paso está deshabilitado (se comprueba en el manejador)
              // Usamos el manejador separado para poder checkear la clase 'disabled'
            });

            // Añadir el manejador real de click que incluye la lógica disabled
            currentHeader.addEventListener('click', handleStepHeaderClick);
          });

          // 2. Aplicar estado completado a tareas y añadir listeners
          // Esto ya se hace en changeLanguage al crear los checkboxes,
          // pero re-aseguramos que los listeners estén presentes si el DOM no fue reconstruido
          document
            .querySelectorAll('.feature-list input[type="checkbox"]')
            .forEach((cb) => {
              // Remover listener existente antes de añadir
              cb.removeEventListener('change', handleTaskCheckboxChange);
              // Añadir listener
              cb.addEventListener('change', handleTaskCheckboxChange);
              // Asegurar que la clase completed en el <li> sea correcta
              const listItem = cb.closest('li');
              if (listItem) listItem.classList.toggle('completed', cb.checked);
            });

          // 3. Aplicar estado habilitado/deshabilitado INICIAL y actualizar números
          updateStepStates();
        }

        // NUEVO: Manejador separado para el click del header del paso
        function handleStepHeaderClick() {
          const header = this; // 'this' es el elemento header que fue clickeado
          const stepSection = header.closest('.onboarding-step');
          const body = stepSection.querySelector('.step-body');
          const stepNumber = header.dataset.step;
          const arrowIcon = header.querySelector('.step-icon i');

          // Prevenir si el paso está deshabilitado
          if (stepSection.classList.contains('disabled')) {
            return; // Salir de la función si está deshabilitado
          }

          // Si no está deshabilitado, proceder con la lógica de expandir/colapsar
          const isExpanded = body.classList.toggle('expanded');
          if (arrowIcon)
            arrowIcon.classList.toggle('expanded-icon', isExpanded);
          expandedState[stepNumber] = isExpanded;
          saveState(storageKeys.expanded, expandedState);
        }

        // ============================================
        //   INICIALIZACIÓN AL CARGAR LA PÁGINA
        // ============================================
        const savedLanguage = localStorage.getItem(storageKeys.language);
        const initialLang =
          savedLanguage === 'es' || savedLanguage === 'en'
            ? savedLanguage
            : 'en'; // Default a 'en'
        window.changeLanguage(initialLang); // Esto carga textos, crea listas con checkboxes, aplica estados

        // Nota: applyInitialStates() es llamado dentro de changeLanguage ahora
        // para asegurar que los listeners y estados se apliquen al DOM recién creado.
      });
    