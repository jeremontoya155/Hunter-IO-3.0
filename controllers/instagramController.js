const { IgApiClient } = require('instagram-private-api');
const uuid = require('uuid');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Configuración de PostgreSQL
const pool = new Pool({
  connectionString: process.env.POSTGRES_URI,
});

// Función para obtener mensajes del usuario
async function getUserMessages(userId) {
  try {
    const queryText = 'SELECT mensajes_flecha FROM users WHERE id = $1';
    const { rows } = await pool.query(queryText, [userId]);
    return rows[0]?.mensajes_flecha || [];
  } catch (error) {
    console.error('Error al obtener mensajes del usuario:', error);
    return [];
  }
}

// Función para obtener un mensaje aleatorio
function getRandomMessage(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return "¡Hola! ¿Estás disponible para una conversación rápida?";
  }
  const randomIndex = Math.floor(Math.random() * messages.length);
  return messages[randomIndex];
}

module.exports = {
  // Mostrar formulario de envío
  showForm: async (req, res) => {
    try {
      const userMessages = await getUserMessages(req.session.user.id);
      
      res.render('instagram/send', { 
        defaultMessage: "¡Hola! ¿Estás disponible para una conversación rápida?",
        userMessages: userMessages,
        user: req.session.user
      });
    } catch (error) {
      console.error('Error en showForm:', error);
      res.status(500).render('error', { 
        message: 'Error al cargar el formulario',
        error: error,
        user: req.session.user
      });
    }
  },

  // Procesar envío de mensajes
  sendMessages: async (req, res) => {
    const { sessionid, users, message, use_saved_messages } = req.body;
    const userId = req.session.user.id;
    
    // Validaciones básicas
    if (!sessionid || !users) {
      return res.status(400).render('instagram/results', { 
        error: 'Faltan campos requeridos',
        user: req.session.user
      });
    }

    const targetAccounts = users.split('\n')
      .map(user => user.trim().replace('@', ''))
      .filter(user => user.length > 0 && user !== '');

    if (targetAccounts.length === 0 || targetAccounts.length > 50) {
      return res.status(400).render('instagram/results', { 
        error: 'Debes ingresar entre 1 y 50 cuentas',
        user: req.session.user
      });
    }

    // Obtener mensajes guardados si se seleccionó esa opción
    let messagesToUse = [];
    if (use_saved_messages === 'true') {
      messagesToUse = await getUserMessages(userId);
      if (messagesToUse.length === 0) {
        return res.status(400).render('instagram/results', { 
          error: 'No tienes mensajes guardados para usar',
          user: req.session.user
        });
      }
    } else if (!message) {
      return res.status(400).render('instagram/results', { 
        error: 'Debes escribir un mensaje para enviar',
        user: req.session.user
      });
    }

    // Crear instancia única para este usuario
    const ig = new IgApiClient();
    const sessionFile = path.join(__dirname, `../sessions/session_${uuid.v4()}.json`);

    try {
      // Configurar dispositivo y sesión
      ig.state.generateDevice(sessionid);
      await ig.state.deserializeCookieJar(JSON.stringify({
        cookies: [{
          key: 'sessionid',
          value: sessionid,
          domain: 'instagram.com',
          secure: true,
          path: '/'
        }]
      }));

      // Verificar sesión
      const currentUser = await ig.account.currentUser();
      const results = [];

      // Procesar cada cuenta
      for (const [index, user] of targetAccounts.entries()) {
        try {
          const userId = await ig.user.getIdByUsername(user);
          
          // Seleccionar mensaje
          const finalMessage = use_saved_messages === 'true' ? 
            getRandomMessage(messagesToUse) : 
            message;
          
          await ig.entity.directThread([userId]).broadcastText(finalMessage);
          results.push({ 
            user, 
            status: 'success', 
            message: 'Mensaje enviado',
            sentMessage: finalMessage
          });
          
          // Delay progresivo
          const baseDelay = 60000; // 1 minuto base
          const progressiveDelay = index * 30000; // 30 segundos adicionales por cuenta
          const randomDelay = Math.random() * 60000; // hasta 1 minuto aleatorio
          
          const totalDelay = baseDelay + progressiveDelay + randomDelay;
          
          console.log(`Enviado a ${user}. Esperando ${Math.round(totalDelay/1000)} segundos...`);
          await new Promise(resolve => setTimeout(resolve, totalDelay));
          
        } catch (error) {
          results.push({ 
            user, 
            status: 'error', 
            message: error.message,
            sentMessage: ''
          });
          
          // Delay de seguridad incluso en errores
          await new Promise(resolve => setTimeout(resolve, 30000));
        }
      }

      // Renderizar resultados
      res.render('instagram/results', { 
        username: currentUser.username,
        results,
        messageSource: use_saved_messages === 'true' ? 'mensajes guardados' : 'mensaje único',
        user: req.session.user
      });

    } catch (error) {
      console.error('Error general:', error);
      res.status(500).render('instagram/results', { 
        error: `Error al procesar la solicitud: ${error.message}`,
        user: req.session.user
      });
    } finally {
      // Limpiar archivo de sesión si existe
      if (fs.existsSync(sessionFile)) {
        fs.unlinkSync(sessionFile);
      }
    }
  }
};