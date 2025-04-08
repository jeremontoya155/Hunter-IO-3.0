const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const nichosController = require('./controllers/nichosController');

const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // Configure the destination folder for uploads




const session = require('express-session');
// Importa MongoClient para conectarte a MongoDB
const { MongoClient } = require('mongodb');
require('dotenv').config(); // Carga las variables desde .env

// Cadena de conexión a MongoDB y nombre de la base de datos
const mongoUri = process.env.MONGO_URI;
const mongoDbName = 'instagram_bot';

const app = express();
const port = process.env.PORT || 3000;


// Configuración de la conexión a PostgreSQL
const pool = new Pool({
  connectionString: process.env.POSTGRES_URI,
});

// Configuración del motor de plantillas EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware para servir archivos estáticos
app.use('/static', express.static(path.join(__dirname, 'static')));

// Middleware para parsear datos de formularios y JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuración de sesiones
app.use(
  session({
    secret: 'clave_secreta_para_la_sesion', // Usa una clave segura en producción
    resave: false,
    saveUninitialized: false,
  })
);

app.use((req, res, next) => {
  res.locals.user = req.session.user || null; // Se asigna a todas las vistas
  next();
});

// Middleware para proteger rutas
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  } else {
    res.redirect('/login');
  }
}

// Rutas públicas
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const queryText =
      'SELECT * FROM users WHERE username = $1 AND password = $2';
    const { rows } = await pool.query(queryText, [username, password]);

    if (rows.length > 0) {
      req.session.user = rows[0];
      res.redirect('/onboarding');
    } else {
      res.render('login', {
        error: 'Credenciales inválidas. Intente nuevamente.',
      });
    }
  } catch (error) {
    console.error('Error en la autenticación:', error);
    res.render('login', { error: 'Error en el servidor. Intente más tarde.' });
  }
});

// Ruta para cerrar sesión
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// Endpoint PUT para agregar/actualizar cuenta de Instagram en el JSON del usuario
app.put('/account', isAuthenticated, async (req, res) => {
  // Se espera que el usuario tenga un campo 'id' y un campo 'accounts' en la BD.
  const { insta_username, insta_password } = req.body;
  const userId = req.session.user.id; // Asegúrate de que en el login guardes el id

  try {
    // Obtenemos el campo accounts actual; se asume que es un arreglo JSON.
    const result = await pool.query(
      'SELECT accounts FROM users WHERE id = $1',
      [userId]
    );
    let accounts = result.rows[0].accounts;
    if (!accounts) {
      accounts = [];
    }
    // Si accounts no es un arreglo, lo convertimos (esto depende de tu modelo)
    if (!Array.isArray(accounts)) {
      accounts = [];
    }
    // Se agrega la nueva cuenta
    accounts.push({ insta_username, insta_password });

    // Se actualiza el registro en la BD
    await pool.query('UPDATE users SET accounts = $1 WHERE id = $2', [
      JSON.stringify(accounts),
      userId,
    ]);

    // Actualizamos la sesión, si es necesario, para reflejar el cambio
    req.session.user.accounts = accounts;

    res
      .status(200)
      .json({ message: 'Cuenta actualizada correctamente', accounts });
  } catch (error) {
    console.error('Error al actualizar la cuenta:', error);
    res.status(500).json({ error: 'Error al actualizar la cuenta' });
  }
});

// Rutas protegidas
app.get('/', (req, res) => {
  res.redirect('/index');
});

app.get('/index', isAuthenticated, (req, res) => {
  res.render('index', {
    messages: [], // Puedes enviar mensajes de estado o notificaciones
  });
});

app.get('/resumen', isAuthenticated, async (req, res) => {
  try {
    const userAccounts = req.session.user.accounts || [];
    const instaUsernames = userAccounts.map((ac) => ac.insta_username);

    // ⚙️ Filtros por cuenta y fechas
    const selectedAccount = req.query.account || null;
    const fromDate = req.query.from || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
    const toDate = req.query.to || new Date().toISOString().slice(0, 10);

    // 📦 Conectar a MongoDB
    const client = new MongoClient(mongoUri, { useUnifiedTopology: true });
    await client.connect();
    const db = client.db(mongoDbName);
    const collection = db.collection('historial_acciones');

    const filter = {
      username: selectedAccount ? selectedAccount : { $in: instaUsernames },
      fecha: {
        $gte: `${fromDate} 00:00:00`,
        $lte: `${toDate} 23:59:59`
      }
    };

    const historial = await collection.find(filter).toArray();
    await client.close();

    // 📊 Métricas
    let totalMensajesEnviados = 0;
    let totalLikes = 0;
    let fechaUltimoMensaje = 'N/A';
    let destinatarioUltimo = 'N/A';
    let ultimoMensaje = 'N/A';
    let fechaPrimerMensaje = 'N/A';
    let diaMasMensajes = 'N/A';
    let mensajesPorTipo = { comunicacion: 0, venta: 0, imperativo: 0 };
    let mensajesPorDia = {};

    if (historial.length > 0) {
      const parseFecha = (str) => new Date(str.replace(' ', 'T'));
      const sorted = historial.slice().sort((a, b) => parseFecha(a.fecha) - parseFecha(b.fecha));

      fechaPrimerMensaje = sorted[0].fecha;
      fechaUltimoMensaje = sorted[sorted.length - 1].fecha;
      destinatarioUltimo = sorted[sorted.length - 1].destinatario;
      ultimoMensaje = sorted[sorted.length - 1].mensaje;

      historial.forEach(({ fecha, tipo_mensaje, accion }) => {
        const dia = fecha.substring(0, 10);
        if (accion && accion.toLowerCase().includes('mensaje')) {
          totalMensajesEnviados++;
          mensajesPorTipo[tipo_mensaje] = (mensajesPorTipo[tipo_mensaje] || 0) + 1;
          mensajesPorDia[dia] = (mensajesPorDia[dia] || 0) + 1;
        } else if (accion && accion.toLowerCase().includes('gusta')) {
          totalLikes++;
        }
      });

      const dayArray = Object.entries(mensajesPorDia).sort((a, b) => b[1] - a[1]);
      if (dayArray.length > 0) {
        diaMasMensajes = `${dayArray[0][0]} (Total: ${dayArray[0][1]})`;
      }
    }

    const fechasOrdenadas = Object.keys(mensajesPorDia).sort();
    const datosGrafico = fechasOrdenadas.map(fecha => ({
      fecha,
      cantidad: mensajesPorDia[fecha]
    }));

    res.render('resumen', {
      username: req.session.user.username,
      total_mensajes_enviados: totalMensajesEnviados,
      total_likes: totalLikes,
      ultimos_mensajes: historial,
      fechaPrimerMensaje,
      fechaUltimoMensaje,
      destinatarioUltimo,
      ultimoMensaje,
      diaMasMensajes,
      mensajesPorTipo,
      datosGrafico,
      userAccounts,
      selectedAccount,
      fromDate,
      toDate,
    });

  } catch (error) {
    console.error('Error al obtener el historial desde MongoDB:', error);
    res.render('resumen', {
      username: req.session.user.username,
      total_mensajes_enviados: 0,
      total_likes: 0,
      ultimos_mensajes: [],
      fechaPrimerMensaje: 'N/A',
      fechaUltimoMensaje: 'N/A',
      destinatarioUltimo: 'N/A',
      ultimoMensaje: 'N/A',
      diaMasMensajes: 'N/A',
      mensajesPorTipo: { comunicacion: 0, venta: 0, imperativo: 0 },
      datosGrafico: [],
      userAccounts: req.session.user.accounts || [],
      selectedAccount: null,
      fromDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
      toDate: new Date().toISOString().slice(0, 10),
    });
  }
});

app.get('/vendedores', isAuthenticated, async (req, res) => {
  const userRole = req.session.user.role; // Obtener rol para pasarlo a la vista

  try {
      // 1. Obtener vendedores desde PostgreSQL
      const vendedoresResult = await pool.query('SELECT * FROM vendedores ORDER BY nombre ASC');
      const vendedores = vendedoresResult.rows;

      // 2. Obtener todos los usernames asignados únicos para la consulta a MongoDB
      let allAssignedUsernames = [];
      vendedores.forEach(v => {
          // Asegurarse que cuentas_asignadas es un array antes de intentar acceder
          if (v.cuentas_asignadas && Array.isArray(v.cuentas_asignadas)) {
              allAssignedUsernames.push(...v.cuentas_asignadas);
          }
      });
      allAssignedUsernames = [...new Set(allAssignedUsernames)]; // Eliminar duplicados

      // 3. Consultar MongoDB para obtener recuentos de mensajes por cuenta
      let messageCounts = {}; // { 'username1': count, 'username2': count }
      if (allAssignedUsernames.length > 0) {
          const client = new MongoClient(mongoUri, { useUnifiedTopology: true });
          try {
              await client.connect();
              const db = client.db(mongoDbName);
              const collection = db.collection('historial_acciones');

              const pipeline = [
                  {
                      $match: {
                          username: { $in: allAssignedUsernames },
                          accion: { $regex: /mensaje/i } // Busca acciones que contengan 'mensaje'
                          // Podrías añadir filtros de fecha si son relevantes aquí
                      }
                  },
                  {
                      $group: {
                          _id: "$username", // Agrupa por username
                          count: { $sum: 1 }   // Cuenta las ocurrencias
                      }
                  },
                  { $project: { _id: 0, username: "$_id", count: 1 } }
              ];

              const results = await collection.aggregate(pipeline).toArray();
              results.forEach(item => {
                  messageCounts[item.username] = item.count;
              });
          } finally {
              await client.close(); // Asegura que el cliente se cierre
          }
      }

      // 4. Renderizar la vista pasando todos los datos necesarios
      res.render('vendedores', { // Usaremos una única vista 'vendedores.ejs'
          vendedores: vendedores,
          messageCounts: messageCounts,
          user: req.session.user, // Pasamos el objeto user completo (incluye rol)
          success: req.query.success, // Para mensajes de feedback
          error: req.query.error     // Para mensajes de feedback
      });

  } catch (error) {
      console.error("Error al obtener datos de vendedores:", error);
      res.status(500).render('error', { // Una vista genérica de error
          message: 'Error al cargar la página de vendedores',
          error: error,
          user: req.session.user // Pasa el usuario también a la vista de error
      });
  }
});

// --- Endpoint POST para Crear/Actualizar Vendedor ---
// Protegido para que solo admin y auditoria puedan enviar datos.
// Usaremos el middleware checkRole aquí, ya que es una acción de escritura.

// --- Endpoint POST para Crear/Actualizar Vendedor ---
// La autenticación general se hace con isAuthenticated
// La verificación de ROL se hace DENTRO de la función
app.post('/vendedores', isAuthenticated, async (req, res) => { // Quitamos checkRole de aquí

  // ---> INICIO: Verificación de Rol Interna <---
  const userRole = req.session.user.role;
  if (userRole !== 'admin' && userRole !== 'auditoria') {
      // Si el rol NO es admin NI auditoria, no permitir la acción
      console.warn(`Intento no autorizado de POST /vendedores por usuario ${req.session.user.username} con rol ${userRole}`);
      // Puedes enviar un error 403 (Prohibido) o redirigir
      // Opción 1: Enviar 403
       return res.status(403).render('error', {
           message: 'Acceso Denegado',
           error: { status: 403, stack: 'No tienes permiso para realizar esta acción.'},
           user: req.session.user // Pasa el usuario a la vista de error
       });
      // Opción 2: Redirigir con mensaje de error (menos informativo sobre el porqué)
      // return res.redirect('/vendedores?error=No tienes permiso para realizar esta acción');
  }
  // ---> FIN: Verificación de Rol Interna <---

  // El resto de tu código para manejar el POST sigue aquí...
  const {
      vendedor_id,
      nombre,
      // ... otros campos ...
      manager_asignado
  } = req.body;

  if (!nombre) {
    return res.redirect('/vendedores?error=El nombre del vendedor es obligatorio');
  }

  // ... (lógica para procesar cuentas_asignadas) ...
  let cuentasArray = [];
  const cuentas_asignadas = req.body.cuentas_asignadas; // Asegúrate de obtenerlo del body
   if (cuentas_asignadas && typeof cuentas_asignadas === 'string') {
        cuentasArray = cuentas_asignadas.split(',')
                                     .map(cuenta => cuenta.trim().toLowerCase())
                                     .filter(cuenta => cuenta !== '');
   } else if (Array.isArray(cuentas_asignadas)) {
        cuentasArray = cuentas_asignadas.filter(cuenta => typeof cuenta === 'string' && cuenta.trim() !== '').map(c => c.toLowerCase());
   }
  const cuentasJson = JSON.stringify(cuentasArray);

  // ... (lógica para convertir otros campos: cumplimiento, objetivo, ingreso) ...
  const cumplimiento = parseFloat(req.body.porcentaje_cumplimiento) || 0.00;
  const objetivo = parseInt(req.body.objetivo_mensual, 10) || 0;
  const ingreso = req.body.fecha_ingreso || null;
  const estado = req.body.estado || 'activo';
  const notas_auditoria = req.body.notas_auditoria || null;


  try {
      if (vendedor_id) {
          // Actualizar
           const queryText = `
              UPDATE vendedores SET
                  nombre = $1, cuentas_asignadas = $2, porcentaje_cumplimiento = $3, fecha_ingreso = $4,
                  estado = $5, notas_auditoria = $6, objetivo_mensual = $7, manager_asignado = $8,
                  ultimo_seguimiento = CURRENT_TIMESTAMP
              WHERE id = $9;
          `;
          await pool.query(queryText, [
              nombre, cuentasJson, cumplimiento, ingreso, estado, notas_auditoria,
              objetivo, manager_asignado, vendedor_id
          ]);
          res.redirect('/vendedores?success=Vendedor actualizado correctamente');
      } else {
          // Crear
          const queryText = `
              INSERT INTO vendedores (
                  nombre, cuentas_asignadas, porcentaje_cumplimiento, fecha_ingreso,
                  estado, notas_auditoria, objetivo_mensual, manager_asignado
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id;
          `;
           await pool.query(queryText, [
              nombre, cuentasJson, cumplimiento, ingreso, estado, notas_auditoria,
              objetivo, manager_asignado
           ]);
           res.redirect('/vendedores?success=Vendedor agregado correctamente');
      }
  } catch (error) {
      console.error("Error al guardar vendedor:", error);
      res.redirect(`/vendedores?error=Error al guardar los datos: ${error.message}`);
  }
});


// Endpoint para obtener datos del gráfico
app.get('/resumen/data', isAuthenticated, async (req, res) => {
  const { from, to } = req.query;
  const userAccounts = req.session.user.accounts || [];
  const instaUsernames = userAccounts.map((ac) => ac.insta_username);

  try {
    const client = new MongoClient(mongoUri, { useUnifiedTopology: true });
    await client.connect();
    const db = client.db(mongoDbName);
    const collection = db.collection('historial_acciones');

    const filtro = {
      username: { $in: instaUsernames },
      fecha: {
        $gte: `${from} 00:00:00`,
        $lte: `${to} 23:59:59`,
      }
    };

    const historial = await collection.find(filtro).toArray();
    await client.close();

    let mensajesPorDia = {};
    let likesPorDia = {};

    historial.forEach(({ fecha, accion }) => {
      const dia = fecha.substring(0, 10);
      if (accion && accion.toLowerCase().includes('mensaje')) {
        mensajesPorDia[dia] = (mensajesPorDia[dia] || 0) + 1;
      } else if (accion && accion.toLowerCase().includes('gusta')) {
        likesPorDia[dia] = (likesPorDia[dia] || 0) + 1;
      }
    });

    const fechasUnicas = Array.from(new Set([
      ...Object.keys(mensajesPorDia),
      ...Object.keys(likesPorDia),
    ])).sort();

    const datosGrafico = fechasUnicas.map(fecha => ({
      fecha,
      mensajes: mensajesPorDia[fecha] || 0,
      likes: likesPorDia[fecha] || 0,
    }));

    res.status(200).json({ datosGrafico });

  } catch (error) {
    console.error('Error al obtener los datos del gráfico:', error);
    res.status(500).json({ error: 'Error al obtener los datos del gráfico' });
  }
});



app.get('/onboarding', isAuthenticated, (req, res) => {
  res.render('onboarding');
});



app.get('/nicho', isAuthenticated, (req, res) => {
  res.render('nicho');
});



app.get('/flujo', isAuthenticated, (req, res) => {
  res.render('flujo');
});

app.get('/nicho', isAuthenticated, nichosController.getNichoForm);
app.post('/nicho', isAuthenticated, upload.single('archivo_pdf'), nichosController.postNicho);
app.get('/nicho/asignar', isAuthenticated, nichosController.getNichosAsignar);
app.post('/nicho/asignar', isAuthenticated, nichosController.postAsignarNicho);





app.post('/flujo/save', isAuthenticated, async (req, res) => {
  const { nombre, nodes } = req.body;
  const userId = req.session.user.id;

  try {
    const queryText = `
      INSERT INTO flujos (user_id, nombre, flujo)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const { rows } = await pool.query(queryText, [userId, nombre, JSON.stringify(nodes)]);

    res.status(200).json({ message: 'Flujo guardado correctamente', flujo: rows[0] });
  } catch (error) {
    console.error('Error al guardar el flujo:', error);
    res.status(500).json({ error: 'Error al guardar el flujo' });
  }
});

app.get('/flujo/list', isAuthenticated, async (req, res) => {
  const userId = req.session.user.id;

  try {
    const queryText = 'SELECT * FROM flujos WHERE user_id = $1';
    const { rows } = await pool.query(queryText, [userId]);

    res.status(200).json({ flujos: rows });
  } catch (error) {
    console.error('Error al obtener los flujos:', error);
    res.status(500).json({ error: 'Error al obtener los flujos' });
  }
});


app.get('/flujo/load', isAuthenticated, async (req, res) => {
  const { nombre } = req.query;
  const userId = req.session.user.id;

  try {
    const queryText = 'SELECT * FROM flujos WHERE user_id = $1 AND nombre = $2';
    const { rows } = await pool.query(queryText, [userId, nombre]);

    if (rows.length > 0) {
      // Devuelve directamente el array de nodos
      const flujo = rows[0].flujo; // flujo es un array de nodos
      res.status(200).json(flujo);
    } else {
      res.status(404).json({ error: 'Flujo no encontrado' });
    }
  } catch (error) {
    console.error('Error al cargar el flujo:', error);
    res.status(500).json({ error: 'Error al cargar el flujo' });
  }
});
app.get('/leads', isAuthenticated, (req, res) => {
  res.render('leads');
});

// Endpoint para obtener los leads calientes desde MongoDB
app.get('/leads/data', isAuthenticated, async (req, res) => {
  try {
      const client = new MongoClient(mongoUri, { useUnifiedTopology: true });
      await client.connect();
      const db = client.db(mongoDbName);
      const collection = db.collection('leads_calientes');

      // Obtener todos los leads calientes
      const leads = await collection.find({}).toArray();
      await client.close();

      res.status(200).json(leads);
  } catch (error) {
      console.error('Error al obtener los leads:', error);
      res.status(500).json({ error: 'Error al obtener los leads' });
  }
});

// Endpoint para agregar un historial a un lead
app.post('/leads/historial', isAuthenticated, async (req, res) => {
  const { username, mensaje } = req.body;

  try {
      const client = new MongoClient(mongoUri, { useUnifiedTopology: true });
      await client.connect();
      const db = client.db(mongoDbName);
      const collection = db.collection('leads_calientes');

      // Agregar el historial al lead
      await collection.updateOne(
          { username: username },
          {
              $push: {
                  historial: {
                      mensaje: mensaje,
                      fecha: new Date().toISOString(),
                  },
              },
          }
      );

      await client.close();
      res.status(200).json({ message: 'Historial agregado correctamente' });
  } catch (error) {
      console.error('Error al agregar historial:', error);
      res.status(500).json({ error: 'Error al agregar historial' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
