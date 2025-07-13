// --- LANGUAGE & CHART SCRIPT ---
        const username = "<%= username %>"; // Make username available to JS

        const translations = {
            en: {
                htmlLang: "en",
                titlePrefix: "Performance Jordi Dashboard",
                dashboardHeaderPrefix: "Performance Dashboard",
                summaryTitle: "General Summary",
                messagesSent: "Messages Sent",
                likesReceived: "\"Likes\" Received",
                likeRateProxy: "Like Rate (Proxy)",
                likeRateNote: "Based on Likes / Messages Sent",
                lastMessageSimple: "Last Message",
                toRecipient: "To",
                filtersTitle: "Filters",
                campanasTitle:'Active Campaigns',
                activeBadge: 'Active',
                seeAllBadge: 'All',
                noCampaignBadge:'No active Campaigns',
                accountLabel: "Account:",
                allAccountsOption: "All Accounts",
                fromLabel: "From:",
                toLabel: "To:",
                filterButton: "Filter",
                activityChartTitle: "Activity per Day",
                chartLabelMessages: "Messages Sent",
                chartLabelLikes: "Likes",
                chartAxisX: "Date",
                chartAxisY: "Count",
                lastMessageContentTitle: "Last Message Content",
                noLastMessage: "No last message to display.",
                messagesByTypeTitle: "Messages by Type",
                messageTypeCom: "Communication:",
                messageTypeSale: "Sale:",
                messageTypeImp: "Imperative:",
                recentMessagesTitle: "Recent Messages Sent",
                noRecentMessages: "No recent messages to display.",
                selectDateRangePrompt: "Select a date range to view the chart.",
                loadingErrorPrompt: "Could not load chart data.",
                dateFilterAlert: "Please select both dates to filter.",
                canvasNotFoundWarn: "Canvas 'graficoMensajes' not found.",
                dataLoadErrorConsole: "Error loading chart data:",
            },
            es: {
                htmlLang: "es",
                titlePrefix: "Panel de Rendimiento",
                dashboardHeaderPrefix: "Panel de Rendimiento",
                summaryTitle: "Resumen General",
                messagesSent: "Mensajes Enviados",
                likesReceived: "\"Me Gusta\" Recibidos",
                likeRateProxy: "Tasa de Likes (Proxy)",
                likeRateNote: "Basado en Likes / Mensajes Enviados",
                lastMessageSimple: "Último Mensaje",
                toRecipient: "A",
                filtersTitle: "Filtros",
                campanasTitle:'Campañas Activas',
                activeBadge: 'Activa',
                noCampaignBadge:'No hay campañas activas',
                seeAllBadge:'Ver Todas',
                accountLabel: "Cuenta:",
                allAccountsOption: "Todas las Cuentas",
                fromLabel: "Desde:",
                toLabel: "Hasta:",
                filterButton: "Filtrar",
                activityChartTitle: "Actividad por Día",
                chartLabelMessages: "Mensajes Enviados",
                chartLabelLikes: "Me Gusta",
                chartAxisX: "Fecha",
                chartAxisY: "Cantidad",
                lastMessageContentTitle: "Contenido del Último Mensaje",
                noLastMessage: "No hay último mensaje para mostrar.",
                messagesByTypeTitle: "Mensajes por Tipo",
                messageTypeCom: "Comunicación:",
                messageTypeSale: "Venta:",
                messageTypeImp: "Imperativo:",
                recentMessagesTitle: "Últimos Mensajes Enviados",
                noRecentMessages: "No hay mensajes recientes para mostrar.",
                selectDateRangePrompt: "Selecciona un rango de fechas para ver el gráfico.",
                loadingErrorPrompt: "No se pudieron cargar los datos del gráfico.",
                dateFilterAlert: "Por favor, selecciona ambas fechas para filtrar.",
                canvasNotFoundWarn: "Canvas 'graficoMensajes' no encontrado.",
                dataLoadErrorConsole: "Error al cargar los datos del gráfico:",
            }
        };

        let currentLanguage = localStorage.getItem('preferredLanguage') || 'en'; // Default to English
        let chartInstance; // Keep track of the chart instance

        function setLanguage(lang) {
            if (!translations[lang]) lang = 'en'; // Fallback to English
            currentLanguage = lang;
            localStorage.setItem('preferredLanguage', lang);
            const langData = translations[lang];

            // Update HTML lang attribute
            document.documentElement.lang = langData.htmlLang;

            // Update Title
            document.title = `${langData.titlePrefix} - ${username}`;

            // Update all elements with data-translate-key
            document.querySelectorAll('[data-translate-key]').forEach(el => {
                const key = el.getAttribute('data-translate-key');
                if (langData[key]) {
                    // Use innerHTML if the element might contain other nodes (like icons), otherwise textContent is safer
                    if (el.children.length > 0 && !el.matches('option, button span')) { // Adjust selector if needed
                         // Find the text node to update, be careful not to overwrite icons etc.
                         // This simple approach assumes the text is the main content.
                         // A more robust solution might involve specific spans for text.
                         // For now, let's find the first text node or update textContent for simple cases.
                         let textNode = Array.from(el.childNodes).find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== '');
                         if(textNode) {
                            textNode.textContent = langData[key];
                         } else if (el.tagName === 'SPAN' || el.tagName === 'LABEL' || el.tagName === 'H3' || el.tagName === 'H2' || el.tagName === 'P' || el.tagName === 'BUTTON') {
                            // For simpler elements, try setting textContent directly
                            // Check if the button has an icon before the span
                            if (el.tagName === 'BUTTON' && el.querySelector('i') && el.querySelector('span')) {
                                el.querySelector('span').textContent = langData[key];
                            } else {
                                el.textContent = langData[key]; // Might overwrite icons if not handled carefully above
                            }
                         } else if (el.tagName === 'OPTION') {
                            el.textContent = langData[key];
                         }
                    } else {
                        el.textContent = langData[key];
                    }
                 } else {
                     console.warn(`Translation key "${key}" not found for language "${lang}".`);
                 }
             });

             // Special handling for header which includes dynamic username
             const headerPrefixSpan = document.querySelector('[data-translate-key="dashboardHeaderPrefix"]');
             if (headerPrefixSpan && langData.dashboardHeaderPrefix) {
                headerPrefixSpan.textContent = langData.dashboardHeaderPrefix;
             }

             // Update Chart if it exists
             if (chartInstance) {
                try {
                    chartInstance.options.plugins.legend.labels.text = langData.chartLabelMessages; // Assuming you want this? Usually the dataset label is enough.
                    chartInstance.options.scales.x.title.text = langData.chartAxisX;
                    chartInstance.options.scales.y.title.text = langData.chartAxisY;
                    // Update dataset labels
                    chartInstance.data.datasets[0].label = langData.chartLabelMessages;
                    chartInstance.data.datasets[1].label = langData.chartLabelLikes;
                    chartInstance.update();
                } catch (error) {
                    console.error("Error updating chart language:", error);
                }
            } else {
                // If chart doesn't exist yet, update the placeholder text
                updateChartPlaceholder();
            }
        }

        function updateChartPlaceholder() {
             const chartContainer = document.querySelector('.chart-container');
             if (chartContainer && !chartInstance) { // Only update if no chart
                 const canvas = chartContainer.querySelector('canvas');
                 const currentParams = new URLSearchParams(window.location.search);
                 const initialFrom = document.getElementById("fromDate").value;
                 const initialTo = document.getElementById("toDate").value;

                 if (canvas && (!initialFrom || !initialTo)) {
                     chartContainer.innerHTML = `<canvas id="graficoMensajes"></canvas><p style="text-align: center; color: #9ca3af; padding: 2rem;">${translations[currentLanguage].selectDateRangePrompt}</p>`;
                 } else if (!canvas) {
                    // If canvas was missing entirely (maybe error during init)
                    // chartContainer.innerHTML = `<p style="text-align: center; color: #f87171; padding: 2rem;">${translations[currentLanguage].canvasNotFoundWarn}</p>`; // Or a generic error
                 }
                 // If dates ARE selected but chartInstance is null, it might be loading or failed
             }
        }


        document.addEventListener("DOMContentLoaded", function () {
            const ctx = document.getElementById("graficoMensajes")?.getContext("2d");
            const messagesColor = '#2dd4bf'; // Teal
            const likesColor = '#60a5fa';   // Blue

            async function cargarDatosGrafico(from, to, account) {
                let fetchUrl = `/resumen/data?from=${from}&to=${to}`;
                if (account) fetchUrl += `&account=${account}`;

                const chartContainer = document.querySelector('.chart-container');
                 // Ensure canvas exists before proceeding
                if (!ctx) {
                    console.warn(translations[currentLanguage].canvasNotFoundWarn);
                    if (chartContainer) chartContainer.innerHTML = `<p style="text-align: center; color: #9ca3af; padding: 2rem;">${translations[currentLanguage].selectDateRangePrompt}</p>`; // Use translated message
                    return;
                }


                try {
                    const response = await fetch(fetchUrl);
                    if (!response.ok) throw new Error(`Error ${response.status}: ${response.statusText}`);
                    const data = await response.json();
                    const datosGrafico = data.datosGrafico || [];
                    const labels = datosGrafico.map(d => d.fecha);
                    const mensajes = datosGrafico.map(d => d.mensajes);
                    const likes = datosGrafico.map(d => d.likes);

                    if (chartInstance) chartInstance.destroy(); // Use chartInstance variable

                    // Get translated labels for the chart
                    const currentLangData = translations[currentLanguage];

                    chartInstance = new Chart(ctx, { // Assign to chartInstance
                        type: 'line',
                        data: { labels, datasets: [
                                { label: currentLangData.chartLabelMessages, data: mensajes, borderColor: messagesColor, backgroundColor: messagesColor + '33', fill: true, tension: 0.3, pointRadius: 3, pointBackgroundColor: messagesColor },
                                { label: currentLangData.chartLabelLikes, data: likes, borderColor: likesColor, backgroundColor: likesColor + '33', fill: true, tension: 0.3, pointRadius: 3, pointBackgroundColor: likesColor }
                            ] },
                        options: {
                            responsive: true, maintainAspectRatio: false,
                            plugins: {
                                legend: { position: 'top', labels: { color: '#e0e0e0', usePointStyle: true } },
                                tooltip: { mode: 'index', intersect: false, backgroundColor: 'rgba(0, 0, 0, 0.8)', titleFont: { size: 14 }, bodyFont: { size: 12 }, padding: 10, boxPadding: 4 }
                            },
                            scales: {
                                x: { type: 'time', time: { unit: 'day', tooltipFormat: 'PPP', displayFormats: { day: 'MMM d' } }, title: { display: true, text: currentLangData.chartAxisX, color: '#9ca3af' }, ticks: { color: '#9ca3af', maxRotation: 0, autoSkip: true, maxTicksLimit: 10 }, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                                y: { beginAtZero: true, title: { display: true, text: currentLangData.chartAxisY, color: '#9ca3af' }, ticks: { color: '#9ca3af' }, grid: { color: 'rgba(255, 255, 255, 0.05)' } }
                            },
                            interaction: { mode: 'nearest', axis: 'x', intersect: false }
                        }
                    });
                    
                                        // Ensure chart container doesn't show placeholder text if chart loads successfully
                    const existingPlaceholder = chartContainer.querySelector('p');
                    if (existingPlaceholder) existingPlaceholder.remove();

                } catch (error) {
                    console.error(translations[currentLanguage].dataLoadErrorConsole, error);
                    if (chartContainer) {
                       // Make sure canvas is still there before adding the error message
                       if (!chartContainer.querySelector('canvas')) {
                           chartContainer.innerHTML = '<canvas id="graficoMensajes"></canvas>';
                       }
                       // Add error message after the canvas
                       const errorP = document.createElement('p');
                       errorP.className = "error-message";
                       errorP.style = "color: #f87171; text-align: center; padding: 2rem;";
                       errorP.textContent = translations[currentLanguage].loadingErrorPrompt;
                       // Remove old error message if present
                       const oldError = chartContainer.querySelector('.error-message');
                       if(oldError) oldError.remove();
                       chartContainer.appendChild(errorP);
                    }
                    chartInstance = null; // Reset instance on error
                }
            }

            const accountSelector = document.getElementById("accountSelector");
            const fromInput = document.getElementById("fromDate");
            const toInput = document.getElementById("toDate");
            const btnFiltrar = document.getElementById("btnFiltrar");
            const langSwitchBtn = document.getElementById("langSwitchBtn");

            function aplicarFiltrosYRecargar(event) { // Pass event object
                const selectedAccount = accountSelector.value;
                const from = fromInput.value;
                const to = toInput.value;

                // Check if the event target is the filter button AND either date is missing
                // Use the specific ID 'btnFiltrar'
                if (event && event.target.closest('#btnFiltrar') && (!from || !to)) {
                    alert(translations[currentLanguage].dateFilterAlert); // Use translated alert
                    return; // Stop execution
                }

                const url = new URL(window.location.origin + window.location.pathname);
                if (selectedAccount) url.searchParams.set('account', selectedAccount);
                if (from) url.searchParams.set('from', from);
                if (to) url.searchParams.set('to', to);

                window.location.href = url.toString();
            }

            btnFiltrar.addEventListener("click", aplicarFiltrosYRecargar);
            accountSelector.addEventListener("change", aplicarFiltrosYRecargar); // Keep immediate reload on account change


            // Language Switcher Logic
            langSwitchBtn.addEventListener('click', () => {
                const newLang = currentLanguage === 'en' ? 'es' : 'en';
                setLanguage(newLang);
                // Optional: If chart exists, reload its data *if needed* or just update labels (already done in setLanguage)
                // If you want to force a reload (e.g., if data fetching depended on lang):
                // const initialFrom = fromInput.value;
                // const initialTo = toInput.value;
                // if (chartInstance && initialFrom && initialTo) {
                //     cargarDatosGrafico(initialFrom, initialTo, accountSelector.value);
                // }
            });

            // --- Initial Setup ---

            // 1. Set initial language based on localStorage or default
            setLanguage(currentLanguage); // Apply translations on load

            // 2. Load initial chart data if dates are present
            const currentParams = new URLSearchParams(window.location.search);
            const initialAccount = currentParams.get('account') || '';
            const initialFrom = fromInput.value; // Get value from input field
            const initialTo = toInput.value;   // Get value from input field

            if (initialFrom && initialTo) {
                 cargarDatosGrafico(initialFrom, initialTo, initialAccount);
            } else {
                 console.warn("Initial dates not set. Chart not loaded initially.");
                 updateChartPlaceholder(); // Show translated placeholder text
            }
        });

        let isActive = false;
        let startTime = null;
        let timerInterval = null;
        const totalMensajes = 34;

        function formatTime(seconds) {
            const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
            const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
            const s = String(seconds % 60).padStart(2, '0');
            return `${h}:${m}:${s}`;
        }

        function calcularRendimiento(segundos) {
            const ratio = totalMensajes / (segundos / 600);
            return Math.min(100, ratio * 100).toFixed(1);
        }

        function actualizarUI(tiempoSegundos) {
            document.getElementById('metric-time').textContent = formatTime(tiempoSegundos);
            document.getElementById('metric-efficiency').textContent = calcularRendimiento(tiempoSegundos) + '%';
            document.getElementById('metric-tasks').textContent = totalMensajes;
        }

        document.getElementById('startBtn').addEventListener('click', () => {
            
            window.location.href = '/campaigns';
            // isActive = true;
            // startTime = Date.now();
            // document.getElementById('startBtn').disabled = true;
            // document.getElementById('stopBtn').disabled = false;

            // // Cambiar estado visual
            // document.getElementById('rpanel-circle').classList.replace('inactive', 'active');
            // document.getElementById('rpanel-status-text').classList.replace('inactive', 'active');
            // document.getElementById('rpanel-status-text').textContent = 'ACTIVO';

            // // Activar animaciones orbitadoras
            // document.getElementById('orbit1').classList.add('active');
            // document.getElementById('orbit2').classList.add('active');

            // // Iniciar reloj
            // timerInterval = setInterval(() => {
            // const now = Date.now();
            // const tiempoTranscurrido = Math.floor((now - startTime) / 1000);
            // actualizarUI(tiempoTranscurrido);
            // }, 1000);
        });

        document.getElementById('stopBtn').addEventListener('click', () => {
            isActive = false;
            clearInterval(timerInterval);
            document.getElementById('startBtn').disabled = false;
            document.getElementById('stopBtn').disabled = true;

            // Estado visual OFF
            document.getElementById('rpanel-circle').classList.replace('active', 'inactive');
            document.getElementById('rpanel-status-text').classList.replace('active', 'inactive');
            document.getElementById('rpanel-status-text').textContent = 'INACTIVO';

            // Detener animaciones
            document.getElementById('orbit1').classList.remove('active');
            document.getElementById('orbit2').classList.remove('active');
        });

        document.getElementById('viewDetailsLink').addEventListener('click', (e) => {
            e.preventDefault();
            alert('Detalle del sistema (simulado)');
        });