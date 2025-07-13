function filterCampaigns() {
        const searchValue = document.querySelector('.search-input').value.toLowerCase();
        const selectedDate = document.getElementById('filter-date').value;

        document.querySelectorAll('.campaign-row').forEach(row => {
          const name = row.querySelector('td:nth-child(1) strong')?.textContent.toLowerCase() || '';
          const account = row.querySelector('td:nth-child(2)')?.textContent.toLowerCase() || '';
          const startDate = row.querySelector('td:nth-child(3)')?.textContent;

          const matchText = name.includes(searchValue) || account.includes(searchValue);
          const matchDate = !selectedDate || startDate === new Date(selectedDate).toLocaleDateString();

          if (matchText && matchDate) {
            row.style.display = '';
          } else {
            row.style.display = 'none';
          }
        });
      }
      // Funciones para manejar modales
      function openModal(modalId) {
          document.getElementById(modalId).classList.add('show');
      }

      function closeModal(modalId) {
          document.getElementById(modalId).classList.remove('show');
      }

      // Cerrar modal al hacer clic fuera
      document.querySelectorAll('.modal').forEach(modal => {
          modal.addEventListener('click', (e) => {
              if (e.target === modal) {
                  modal.classList.remove('show');
              }
          });
      });

      // Configurar fecha mínima para los inputs de fecha (hoy)
      const today = new Date().toISOString().split('T')[0];
      document.querySelector('input[name="start_date"]').min = today;
      document.querySelector('input[name="end_date"]').min = today;

      // Guardar nueva campaña
      document.getElementById('saveCampaignBtn').addEventListener('click', async () => {
          const form = document.getElementById('newCampaignForm');
          const formData = new FormData(form);

          try {
              const response = await fetch('/campaigns', {
                  method: 'POST',
                  headers: {
                      'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(Object.fromEntries(formData))
              });

              if (response.ok) {
                  window.location.reload();
              } else {
                  alert('Error al crear la campaña');
              }
          } catch (error) {
              console.error('Error:', error);
              alert('Error al crear la campaña');
          }
      });

      // Pausar/reanudar campaña
      document.querySelectorAll('.pause-campaign, .resume-campaign').forEach(btn => {
          btn.addEventListener('click', async () => {
              const campaignId = btn.dataset.id;
              const newStatus = btn.classList.contains('pause-campaign') ? 'paused' : 'active';

              try {
                  const response = await fetch(`/campaigns/${campaignId}`, {
                      method: 'PUT',
                      headers: {
                          'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({
                          status: newStatus
                      })
                  });

                  if (response.ok) {
                      window.location.reload();
                  } else {
                      alert('Error al actualizar la campaña');
                  }
              } catch (error) {
                  console.error('Error:', error);
                  alert('Error al actualizar la campaña');
              }
          });
      });

      // Ver estadísticas
      // document.querySelectorAll('.view-stats').forEach(btn => {
      //     btn.addEventListener('click', async () => {
      //         const campaignId = btn.dataset.id;

      //         try {
      //             const response = await fetch(`/campaigns/${campaignId}/stats`);
      //             const data = await response.json();

      //             if (response.ok) {
      //                 // Mostrar estadísticas en el modal
      //                 const statsContent = document.getElementById('statsContent');
      //                 statsContent.innerHTML = `
      //                     <div class="campaign-header">
      //                         <h4>${data.campaign.name}</h4>
      //                         <p>${data.campaign.description}</p>
      //                     </div>

      //                     <div class="stats-grid">
      //                         <div class="stats-card">
      //                             <div class="icon"><i class="fas fa-paper-plane"></i></div>
      //                             <h5>Mensajes Enviados</h5>
      //                             <h3>${data.stats.total_messages}</h3>
      //                         </div>
      //                         <div class="stats-card">
      //                             <div class="icon"><i class="fas fa-reply"></i></div>
      //                             <h5>Respuestas Recibidas</h5>
      //                             <h3>${data.stats.total_replies}</h3>
      //                         </div>
      //                         <div class="stats-card">
      //                             <div class="icon"><i class="fas fa-percentage"></i></div>
      //                             <h5>Tasa de Respuesta</h5>
      //                             <h3>${data.stats.reply_rate}%</h3>
      //                         </div>
      //                     </div>

      //                     <div class="chart-container" style="height: 300px; margin-top: 2rem;">
      //                         <canvas id="statsChart"></canvas>
      //                     </div>
      //                 `;

      //                 // Mostrar gráfico
      //                 const ctx = document.getElementById('statsChart').getContext('2d');
      //                 new Chart(ctx, {
      //                     type: 'bar',
      //                     data: {
      //                         labels: data.stats.messages_by_day.map(item => item.date),
      //                         datasets: [{
      //                             label: 'Mensajes por día',
      //                             data: data.stats.messages_by_day.map(item => item.count),
      //                             backgroundColor: 'rgba(102, 126, 234, 0.8)',
      //                             borderColor: 'rgba(102, 126, 234, 1)',
      //                             borderWidth: 2,
      //                             borderRadius: 8,
      //                             borderSkipped: false,
      //                         }]
      //                     },
      //                     options: {
      //                         responsive: true,
      //                         maintainAspectRatio: false,
      //                         plugins: {
      //                             legend: {
      //                                 display: false
      //                             }
      //                         },
      //                         scales: {
      //                             y: {
      //                                 beginAtZero: true,
      //                                 grid: {
      //                                     color: 'rgba(0,0,0,0.1)'
      //                                 }
      //                             },
      //                             x: {
      //                                 grid: {
      //                                     display: false
      //                                 }
      //                             }
      //                         }
      //                     }
      //                 });
      //                 console.log('Se abriría un modal si tuviese datos')

      //                 // Mostrar modal
      //               //   openModal('statsModal');
      //               //en vez de modal vamos a redireccionar por ahora
      //               window.location.href = '/resumen';
      //             } else {
      //                 alert('Error al obtener estadísticas');
      //             }
      //         } catch (error) {
      //             console.error('Error:', error);
      //             alert('Error al obtener estadísticas');
      //         }
      //     });
      // });

      // Inicializar gráficos de campañas
      document.addEventListener('DOMContentLoaded', () => {
          <% campaigns.forEach(campaign => { %>
              const ctx<%= campaign.id %> = document.getElementById('chart-<%= campaign.id %>').getContext('2d');
              // Gráfico de ejemplo para cada campaña
              new Chart(ctx<%= campaign.id %>, {
                  type: 'line',
                  data: {
                      labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
                      datasets: [{
                          label: 'Mensajes enviados',
                          data: [12, 19, 3, 5, 2, 3, 8],
                          borderColor: 'rgba(102, 126, 234, 1)',
                          backgroundColor: 'rgba(102, 126, 234, 0.1)',
                          borderWidth: 2,
                          fill: true,
                          tension: 0.4
                      }]
                  },
                  options: {
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                          legend: {
                              display: false
                          }
                      },
                      scales: {
                          y: {
                              beginAtZero: true,
                              display: false
                          },
                          x: {
                              display: false
                          }
                      },
                      elements: {
                          point: {
                              radius: 0
                          }
                      }
                  }
              });
          <% }); %>
      });

      // Validación del formulario
      document.getElementById('newCampaignForm').addEventListener('submit', (e) => {
          e.preventDefault();
      });

      // Validar fechas
      document.querySelector('input[name="start_date"]').addEventListener('change', (e) => {
          const startDate = e.target.value;
          const endDateInput = document.querySelector('input[name="end_date"]');
          endDateInput.min = startDate;

          if (endDateInput.value && endDateInput.value < startDate) {
              endDateInput.value = startDate;
          }
      });