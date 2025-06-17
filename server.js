const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const nichosController = require('./controllers/nichosController');

const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // Configure the destination folder for uploads

const instagramController = require('./controllers/instagramController');
const { IgApiClient } = require('instagram-private-api');


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
app.get('/auditoria/patrimonio', isAuthenticated, async (req, res) => {
  // Verificación de Rol
  const userRole = req.session.user.role;
  if (userRole !== 'admin' && userRole !== 'auditoria') {
    return res.status(403).render('error', { 
      message: 'Acceso Denegado', 
      error: { status: 403 }, 
      user: req.session.user 
    });
  }

  try {
    const result = await pool.query(`
      SELECT 
        id, nombre_cliente, usuario, link, tipo_cuenta, correo, contrasena,
        verificacion, celu_abierto, autentificador, codigos_respaldo,
        codigos_actualizados_en, codigos_validez_dias, created_at, updated_at,
        celular, ultima_carga_celular, contrasena_mail, dispositivo,
        vendedor, autentificador_cuenta, duracion_numero, link_original
      FROM patrimonio_cuentas 
      ORDER BY tipo_cuenta, nombre_cliente, usuario
    `);
    
    const cuentas = result.rows;
    const today = new Date();

    // Calcular días restantes para códigos de respaldo
    const cuentasConDiasRestantes = cuentas.map(cuenta => {
      let dias_restantes = null;
      if (cuenta.codigos_actualizados_en && cuenta.codigos_validez_dias > 0) {
        try {
          const fechaActualizacion = new Date(cuenta.codigos_actualizados_en);
          if (!isNaN(fechaActualizacion.getTime())) {
            const fechaExpiracion = new Date(fechaActualizacion.getTime());
            fechaExpiracion.setDate(fechaActualizacion.getDate() + cuenta.codigos_validez_dias);
            const diffTime = fechaExpiracion.getTime() - today.getTime();
            dias_restantes = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
          }
        } catch (dateError) {
          console.error(`Error calculando días restantes para ${cuenta.usuario}:`, dateError);
        }
      }
      return {
        ...cuenta,
        dias_restantes_codigos: dias_restantes
      };
    });

    res.render('auditoria_patrimonio', {
      cuentas: cuentasConDiasRestantes,
      user: req.session.user,
      success: req.query.success,
      error: req.query.error
    });

  } catch (error) {
    console.error("Error en GET /auditoria/patrimonio:", error);
    res.status(500).render('error', { 
      message: 'Error al cargar el patrimonio de cuentas', 
      error, 
      user: req.session.user 
    });
  }
});

app.post('/auditoria/patrimonio', isAuthenticated, async (req, res) => {
  // Verificación de Rol
  const userRole = req.session.user.role;
  if (userRole !== 'admin' && userRole !== 'auditoria') {
    return res.status(403).redirect('/auditoria/patrimonio?error=Acción no permitida');
  }

  // Extraer todos los campos del formulario
  const {
    cuenta_id,
    nombre_cliente,
    usuario,
    link,
    tipo_cuenta,
    correo,
    contrasena,
    verificacion,
    celu_abierto,
    autentificador,
    codigos_respaldo,
    codigos_actualizados_en,
    codigos_validez_dias,
    celular,
    ultima_carga_celular,
    contrasena_mail,
    dispositivo,
    vendedor,
    autentificador_cuenta,
    duracion_numero,
    link_original
  } = req.body;

  // Validación básica
  if (!usuario || !tipo_cuenta) {
    return res.redirect('/auditoria/patrimonio?error=Usuario y Tipo de Cuenta son obligatorios');
  }

  // Convertir valores
  const esVerificado = verificacion === 'on';
  const tieneCeluAbierto = celu_abierto === 'on';
  const tieneAutentificador = autentificador === 'on';
  const validezDias = parseInt(codigos_validez_dias, 10) || 7;
  const fechaActualizacionCodigos = codigos_actualizados_en || null;
  const fechaUltimaCargaCelular = ultima_carga_celular || null;

  try {
    if (cuenta_id) {
      // --- Modo Edición ---
      const queryText = `
        UPDATE patrimonio_cuentas SET
          nombre_cliente = $1, usuario = $2, link = $3, tipo_cuenta = $4,
          correo = $5, contrasena = $6, verificacion = $7, celu_abierto = $8,
          autentificador = $9, codigos_respaldo = $10, codigos_actualizados_en = $11,
          codigos_validez_dias = $12, celular = $13, ultima_carga_celular = $14,
          contrasena_mail = $15, dispositivo = $16, vendedor = $17,
          autentificador_cuenta = $18, duracion_numero = $19, link_original = $20,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $21;
      `;
      await pool.query(queryText, [
        nombre_cliente || null, usuario, link || null, tipo_cuenta,
        correo || null, contrasena || null, esVerificado, tieneCeluAbierto,
        tieneAutentificador, codigos_respaldo || null, fechaActualizacionCodigos,
        validezDias, celular || null, fechaUltimaCargaCelular,
        contrasena_mail || null, dispositivo || null, vendedor || null,
        autentificador_cuenta || null, duracion_numero || null, link_original || null,
        cuenta_id
      ]);
      res.redirect('/auditoria/patrimonio?success=Cuenta actualizada correctamente');
    } else {
      // --- Modo Agregar ---
      const queryText = `
        INSERT INTO patrimonio_cuentas (
          nombre_cliente, usuario, link, tipo_cuenta, correo, contrasena,
          verificacion, celu_abierto, autentificador, codigos_respaldo,
          codigos_actualizados_en, codigos_validez_dias, celular,
          ultima_carga_celular, contrasena_mail, dispositivo, vendedor,
          autentificador_cuenta, duracion_numero, link_original
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
        ) RETURNING id;
      `;
      await pool.query(queryText, [
        nombre_cliente || null, usuario, link || null, tipo_cuenta,
        correo || null, contrasena || null, esVerificado, tieneCeluAbierto,
        tieneAutentificador, codigos_respaldo || null, fechaActualizacionCodigos,
        validezDias, celular || null, fechaUltimaCargaCelular,
        contrasena_mail || null, dispositivo || null, vendedor || null,
        autentificador_cuenta || null, duracion_numero || null, link_original || null
      ]);
      res.redirect('/auditoria/patrimonio?success=Cuenta agregada correctamente');
    }
  } catch (error) {
    console.error("Error en POST /auditoria/patrimonio:", error);
    if (error.code === '23505' && error.constraint === 'patrimonio_cuentas_usuario_key') {
      res.redirect('/auditoria/patrimonio?error=El nombre de usuario de Instagram ya existe');
    } else {
      res.redirect(`/auditoria/patrimonio?error=Error al guardar la cuenta: ${error.message}`);
    }
  }
});

// --- GET /vendedores (Modificada para Cards y Datos Agregados) ---
async function getDashboardData(startDate, endDate) {
  let totalMensajes = 0;
  let mensajesPorDia = {};
  let error = null;
  let chartData = []; // Definir chartData fuera del try para que siempre exista

  try {
      // 1. Obtener cuentas asignadas (Optimizacion: Podria cachearse si no cambia mucho)
      const vendedoresResult = await pool.query('SELECT cuentas_asignadas FROM vendedores');
      let allAssignedUsernames = [];
      vendedoresResult.rows.forEach(v => {
          if (v.cuentas_asignadas && Array.isArray(v.cuentas_asignadas)) {
              allAssignedUsernames.push(...v.cuentas_asignadas);
          }
      });
      allAssignedUsernames = [...new Set(allAssignedUsernames.map(u => u.toLowerCase()))];

      if (allAssignedUsernames.length > 0) {
          // 2. Consultar MongoDB
          const client = new MongoClient(mongoUri, { useUnifiedTopology: true });
          await client.connect();
          const db = client.db(mongoDbName);
          const collection = db.collection('historial_acciones');

          const filter = {
              username: { $in: allAssignedUsernames },
              accion: { $regex: /mensaje/i },
              fecha: { $gte: `${startDate} 00:00:00`, $lte: `${endDate} 23:59:59` }
          };

          const pipeline = [
              { $match: filter },
              { $project: { fechaDia: { $substrCP: ["$fecha", 0, 10] } } },
              { $group: { _id: "$fechaDia", count: { $sum: 1 } } },
              { $sort: { _id: 1 } },
              { $project: { _id: 0, fecha: "$_id", cantidad: "$count" } }
          ];
          const dailyCounts = await collection.aggregate(pipeline).toArray();

          dailyCounts.forEach(item => {
              mensajesPorDia[item.fecha] = item.cantidad;
              totalMensajes += item.cantidad;
          });
          await client.close();
      }

      // 3. Asegurar datos para cada día en el rango
      let currentDate = new Date(startDate + 'T00:00:00');
      const finalDate = new Date(endDate + 'T00:00:00');
      while (currentDate <= finalDate) {
          const dateString = currentDate.toISOString().slice(0, 10);
          chartData.push({
              fecha: dateString,
              cantidad: mensajesPorDia[dateString] || 0
          });
          currentDate.setDate(currentDate.getDate() + 1);
      }

  } catch (err) {
      console.error("Error al obtener datos del dashboard:", err);
      error = err.message;
      // En caso de error, devolver un array vacío para el gráfico
      chartData = [];
      totalMensajes = 0;
  }

  return { totalMensajes, chartData, error };
}


// --- GET /vendedores (COMPLETO Y CORREGIDO) ---
app.get('/vendedores', isAuthenticated, async (req, res) => {
  // Define fechas por defecto para el dashboard inicial (ej: último mes)
  const defaultEndDate = new Date();
  const defaultStartDate = new Date();
  defaultStartDate.setDate(defaultEndDate.getDate() - 29); // 30 días incluyendo hoy
  const initialStartDate = defaultStartDate.toISOString().slice(0, 10);
  const initialEndDate = defaultEndDate.toISOString().slice(0, 10);
  const hoy = new Date().toISOString().slice(0, 10); // Definir 'hoy' aquí

  try {
      // 1. Obtener datos del dashboard inicial
      // Se llama a getDashboardData ANTES de cualquier posible error en las queries de vendedor
      const initialDashboardData = await getDashboardData(initialStartDate, initialEndDate);

      // 2. Obtener datos de vendedores
      const sqlQueryVendedores = `
          SELECT v.*,
                 COALESCE(jsonb_array_length(v.cuentas_asignadas), 0) as num_cuentas
          FROM vendedores v ORDER BY v.nombre ASC
      `;
      // console.log('DEBUG: Query Vendedores SQL:', sqlQueryVendedores);
      const vendedoresResult = await pool.query(sqlQueryVendedores);
      const vendedores = vendedoresResult.rows;
      const vendedorIds = vendedores.map(v => v.id);

      // 3. Calcular fechas y desempeño MENSUAL
      const nowForMonth = new Date(); // Usar una nueva instancia por claridad
      const year = nowForMonth.getFullYear();
      const month = nowForMonth.getMonth();
      const firstDayOfMonth = new Date(year, month, 1).toISOString().slice(0, 10);
      const lastDayOfMonth = new Date(year, month + 1, 0).toISOString().slice(0, 10);

      let desempenoMesMap = {};
      if (vendedorIds.length > 0) {
          const sqlQueryMes = `
              SELECT
                  vendedor_id,
                  SUM(mensajes_enviados) as total_mensajes_mes,
                  SUM(respuestas_recibidas) as total_respuestas_mes
              FROM vendedor_desempeno_diario
              WHERE vendedor_id = ANY($1::int[]) AND fecha >= $2 AND fecha <= $3
              GROUP BY vendedor_id;
          `;
          const desempenoMesResult = await pool.query(sqlQueryMes, [vendedorIds, firstDayOfMonth, lastDayOfMonth]);
          desempenoMesResult.rows.forEach(item => {
               desempenoMesMap[item.vendedor_id] = {
                   mensajes: parseInt(item.total_mensajes_mes, 10) || 0,
                   respuestas: parseInt(item.total_respuestas_mes, 10) || 0
               };
          });
      }

      // 4. Obtener desempeño de HOY
      const sqlQueryHoy = `
          SELECT vendedor_id, insta_username, mensajes_enviados, respuestas_recibidas
          FROM vendedor_desempeno_diario
          WHERE fecha = $1
      `;
      const desempenoHoyResult = await pool.query(sqlQueryHoy, [hoy]);
      const desempenoHoyMap = desempenoHoyResult.rows.reduce((map, item) => {
           if (!map[item.vendedor_id]) map[item.vendedor_id] = {};
           map[item.vendedor_id][item.insta_username.toLowerCase()] = {
               mensajes: item.mensajes_enviados,
               respuestas: item.respuestas_recibidas
           };
           return map;
       }, {});

      // 5. Obtener totales de MongoDB
      let allAssignedUsernames = [];
       vendedores.forEach(v => {
          if (v.cuentas_asignadas && Array.isArray(v.cuentas_asignadas)) {
               allAssignedUsernames.push(...v.cuentas_asignadas);
           }
       });
      allAssignedUsernames = [...new Set(allAssignedUsernames.map(u => u.toLowerCase()))];
      let mongoMessageCounts = {};
      if (allAssignedUsernames.length > 0) {
          const client = new MongoClient(mongoUri, { useUnifiedTopology: true });
           try {
               await client.connect();
               const db = client.db(mongoDbName);
               const collection = db.collection('historial_acciones');
               const pipeline = [
                  { $match: { username: { $in: allAssignedUsernames }, accion: { $regex: /mensaje/i } } },
                  { $group: { _id: { $toLower: "$username" }, count: { $sum: 1 } } },
                  { $project: { _id: 0, username: "$_id", count: 1 } }
               ];
               const results = await collection.aggregate(pipeline).toArray();
               results.forEach(item => { mongoMessageCounts[item.username] = item.count; });
            } finally { await client.close(); }
      }

      // 6. Combinar datos para la vista
      const vendedoresParaVista = vendedores.map(vendedor => {
           let cuentasConDatos = [];
           let totalMensajesHoy = 0;
           let totalRespuestasHoy = 0;
           let totalMensajesMongo = 0;
           if (vendedor.cuentas_asignadas && Array.isArray(vendedor.cuentas_asignadas)) {
              cuentasConDatos = vendedor.cuentas_asignadas.map(cuenta => {
                  const cuentaLower = cuenta.toLowerCase();
                  const desempenoCuentaHoy = desempenoHoyMap[vendedor.id]?.[cuentaLower] || { mensajes: 0, respuestas: 0 };
                  const mensajesMongo = mongoMessageCounts[cuentaLower] || 0;
                  totalMensajesHoy += desempenoCuentaHoy.mensajes;
                  totalRespuestasHoy += desempenoCuentaHoy.respuestas;
                  totalMensajesMongo += mensajesMongo;
                  return { nombre: cuenta, mensajesHoy: desempenoCuentaHoy.mensajes, respuestasHoy: desempenoCuentaHoy.respuestas, mensajesMongoTotal: mensajesMongo };
              });
          }

           const objetivoMensual = vendedor.objetivo_mensual || 0;
           const mensajesEsteMes = desempenoMesMap[vendedor.id]?.mensajes || 0;
           let progresoMensualPct = 0;
           if (objetivoMensual > 0) {
               progresoMensualPct = Math.min(100, Math.max(0, (mensajesEsteMes / objetivoMensual) * 100));
           }
           return {
               ...vendedor,
               num_cuentas: vendedor.num_cuentas || 0,
               cuentasDetalle: cuentasConDatos,
               totalMensajesHoy, totalRespuestasHoy, totalMensajesMongo,
               total_mensajes_mes: mensajesEsteMes,
               progreso_mensajes_mes_pct: progresoMensualPct,
           };
      });

      // 7. Renderizar vista pasando TODAS las variables necesarias
      res.render('vendedores', {
          vendedores: vendedoresParaVista,
          user: req.session.user,
          success: req.query.success,
          // Pasar el error específico del dashboard si existe, sino el query param
          error: initialDashboardData.error ? `Error al cargar datos del dashboard: ${initialDashboardData.error}` : req.query.error,
          today: hoy,
          initialDashboard: initialDashboardData, // Objeto { totalMensajes, chartData, error }
          initialStartDate: initialStartDate,     // String YYYY-MM-DD
          initialEndDate: initialEndDate          // String YYYY-MM-DD
      });

  } catch (error) {
      // Captura errores de las queries de vendedor o cualquier otro error inesperado
      console.error("Error severo en GET /vendedores:", error);
      res.status(500).render('error', {
           message: 'Error al cargar la página de vendedores',
           error: error, // Pasar el error para depuración (si error.ejs lo maneja)
           user: req.session.user
         });
  }
});
// --- NUEVO ENDPOINT: GET /vendedores/dashboard-data (para AJAX) ---
app.get('/vendedores/dashboard-data', isAuthenticated, async (req, res) => {
  const { from, to } = req.query;

  // Validar fechas (básico)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!from || !to || !dateRegex.test(from) || !dateRegex.test(to)) {
      return res.status(400).json({ error: 'Fechas inválidas o faltantes (YYYY-MM-DD)' });
  }

  const dashboardData = await getDashboardData(from, to);

  if (dashboardData.error) {
      return res.status(500).json({ error: `Error al obtener datos del dashboard: ${dashboardData.error}` });
  }

  res.json(dashboardData); // Devuelve { totalMensajes, chartData }
});


// --- POST /vendedores (Para Crear/Editar Vendedor - Desde Modal) ---
app.post('/vendedores', isAuthenticated, async (req, res) => {
  // Verificación de Rol Interna (Admin/Auditoría)
  const userRole = req.session.user.role;
  if (userRole !== 'admin' && userRole !== 'auditoria') {
      return res.status(403).send('Acción no permitida para tu rol.'); // O redirigir con error
  }

  // Extraer datos del body (del modal)
  const {
      vendedor_id, nombre, cuentas_asignadas, porcentaje_cumplimiento, fecha_ingreso,
      estado, notas_auditoria, objetivo_mensual, manager_asignado
  } = req.body;

  // ... (Validación y procesamiento de datos igual que antes) ...
  if (!nombre) return res.redirect('/vendedores?error=El nombre es obligatorio');
  let cuentasArray = [];
  // ... (procesar cuentas_asignadas a cuentasJson) ...
   if (cuentas_asignadas && typeof cuentas_asignadas === 'string') {
        cuentasArray = cuentas_asignadas.split(',').map(c => c.trim().toLowerCase()).filter(c => c !== '');
   }
  const cuentasJson = JSON.stringify(cuentasArray);
  const cumplimiento = parseFloat(porcentaje_cumplimiento) || 0.00;
  const objetivo = parseInt(objetivo_mensual, 10) || 0;
  const ingreso = fecha_ingreso || null;

  try {
      if (vendedor_id) { // Actualizar
          const queryText = `
              UPDATE vendedores SET nombre = $1, cuentas_asignadas = $2, porcentaje_cumplimiento = $3, fecha_ingreso = $4,
              estado = $5, notas_auditoria = $6, objetivo_mensual = $7, manager_asignado = $8, updated_at = CURRENT_TIMESTAMP
              WHERE id = $9;
          `;
          await pool.query(queryText, [
              nombre, cuentasJson, cumplimiento, ingreso, estado, notas_auditoria,
              objetivo, manager_asignado, vendedor_id
          ]);
          res.redirect('/vendedores?success=Vendedor actualizado');
      } else { // Crear
          const queryText = `
              INSERT INTO vendedores (nombre, cuentas_asignadas, porcentaje_cumplimiento, fecha_ingreso, estado, notas_auditoria, objetivo_mensual, manager_asignado)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id;
          `;
          await pool.query(queryText, [
              nombre, cuentasJson, cumplimiento, ingreso, estado, notas_auditoria, objetivo, manager_asignado
          ]);
          res.redirect('/vendedores?success=Vendedor agregado');
      }
  } catch (error) {
      console.error("Error en POST /vendedores:", error);
      res.redirect(`/vendedores?error=Error al guardar: ${error.message}`);
  }
});

// --- NUEVO: POST /vendedores/desempeno (Para Registrar Desempeño Diario) ---
app.post('/vendedores/desempeno', isAuthenticated, async (req, res) => {
  // Verificación de Rol (Admin/Auditoría pueden registrar)
  const userRole = req.session.user.role;
  if (userRole !== 'admin' && userRole !== 'auditoria') {
      // Podrías devolver un JSON si lo llamas con AJAX
      return res.status(403).json({ success: false, message: 'Acción no permitida.' });
  }

  const { vendedor_id, fecha, desempeno } = req.body; // 'desempeno' será un array de objetos: [{cuenta: 'user1', mensajes: 10, respuestas: 2}, ...]

  if (!vendedor_id || !fecha || !Array.isArray(desempeno) || desempeno.length === 0) {
      return res.status(400).json({ success: false, message: 'Datos incompletos.' });
  }

  const client = await pool.connect(); // Usar transacción
  try {
      await client.query('BEGIN'); // Iniciar transacción

      for (const item of desempeno) {
          const cuenta = item.cuenta?.trim().toLowerCase();
          const mensajes = parseInt(item.mensajes, 10) || 0;
          const respuestas = parseInt(item.respuestas, 10) || 0;

          if (!cuenta) continue; // Saltar si no hay nombre de cuenta

          const queryText = `
              INSERT INTO vendedor_desempeno_diario (vendedor_id, fecha, insta_username, mensajes_enviados, respuestas_recibidas)
              VALUES ($1, $2, $3, $4, $5)
              ON CONFLICT (vendedor_id, fecha, insta_username) DO UPDATE SET
                  mensajes_enviados = vendedor_desempeno_diario.mensajes_enviados + EXCLUDED.mensajes_enviados, -- O simplemente = EXCLUDED.mensajes_enviados si quieres sobreescribir
                  respuestas_recibidas = vendedor_desempeno_diario.respuestas_recibidas + EXCLUDED.respuestas_recibidas, -- O = EXCLUDED.respuestas_recibidas
                  updated_at = CURRENT_TIMESTAMP;
          `;
          // OJO: Aquí estoy SUMANDO los valores enviados a los existentes. Si quieres SOBREESCRIBIR, usa:
          // mensajes_enviados = EXCLUDED.mensajes_enviados,
          // respuestas_recibidas = EXCLUDED.respuestas_recibidas,
          await client.query(queryText, [vendedor_id, fecha, cuenta, mensajes, respuestas]);
      }

      await client.query('COMMIT'); // Confirmar transacción
      // Si usas AJAX, devuelve JSON. Si no, redirige.
      res.json({ success: true, message: 'Desempeño registrado/actualizado.' });
      // O redirigir: res.redirect('/vendedores?success=Desempeño registrado');

  } catch (error) {
      await client.query('ROLLBACK'); // Revertir en caso de error
      console.error("Error en POST /vendedores/desempeno:", error);
      res.status(500).json({ success: false, message: `Error al registrar desempeño: ${error.message}` });
      // O redirigir: res.redirect(`/vendedores?error=Error al registrar desempeño`);
  } finally {
      client.release(); // Liberar cliente de la pool
  }
});


// --- NUEVO: GET /vendedores/:id/historial ---
app.get('/vendedores/:id/historial', isAuthenticated, async (req, res) => {
  const vendedorId = req.params.id;
  // Opcional: Verificar rol si solo admin/auditoria pueden ver historial
  // const userRole = req.session.user.role;
  // if (userRole !== 'admin' && userRole !== 'auditoria') {
  //     return res.status(403).render('error', {message: 'Acceso denegado', error: {}, user: req.session.user});
  // }

  try {
      // 1. Obtener datos del vendedor
      const vendedorResult = await pool.query('SELECT * FROM vendedores WHERE id = $1', [vendedorId]);
      if (vendedorResult.rows.length === 0) {
          return res.status(404).render('error', {message: 'Vendedor no encontrado', error: {}, user: req.session.user});
      }
      const vendedor = vendedorResult.rows[0];

      // 2. Obtener historial de desempeño ordenado
      const historialResult = await pool.query(`
          SELECT fecha, insta_username, mensajes_enviados, respuestas_recibidas
          FROM vendedor_desempeno_diario
          WHERE vendedor_id = $1
          ORDER BY fecha DESC, insta_username ASC
      `, [vendedorId]);
      const historial = historialResult.rows;

      // 3. (Opcional) Agrupar por fecha para la vista
      const historialAgrupado = historial.reduce((acc, item) => {
          const fechaStr = item.fecha.toISOString().slice(0, 10);
          if (!acc[fechaStr]) {
              acc[fechaStr] = { fecha: fechaStr, entradas: [] };
          }
          acc[fechaStr].entradas.push(item);
          return acc;
      }, {});


      res.render('vendedor_historial', {
          vendedor: vendedor,
          historial: Object.values(historialAgrupado).sort((a,b) => b.fecha.localeCompare(a.fecha)), // Ordena por fecha descendente
          user: req.session.user
          // Puedes pasar datos para gráficos aquí si los implementas
      });

  } catch (error) {
      console.error(`Error en GET /vendedores/${vendedorId}/historial:`, error);
      res.status(500).render('error', { message: 'Error al cargar historial', error, user: req.session.user });
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
// PUT /api/flecha/mensajes
  app.put('/api/flecha/mensajes', isAuthenticated, async (req, res) => {
    const { mensajes } = req.body;
    const userId = req.session.user.id;

    try {
      // Validar que mensajes sea un array
      if (!Array.isArray(mensajes)) {
        return res.status(400).json({ error: 'Formato inválido, se espera array de mensajes' });
      }

      const queryText = 'UPDATE users SET mensajes_flecha = $1 WHERE id = $2 RETURNING mensajes_flecha';
      const { rows } = await pool.query(queryText, [JSON.stringify(mensajes), userId]);
      
      // Actualizar sesión si es necesario
      req.session.user.mensajes_flecha = rows[0].mensajes_flecha;

      res.json({ 
        success: true,
        mensajes: rows[0].mensajes_flecha
      });
    } catch (error) {
      console.error('Error al guardar mensajes:', error);
      res.status(500).json({ error: 'Error al guardar mensajes' });
    }
  });


// GET /api/flecha/mensajes
app.get('/api/flecha/mensajes', isAuthenticated, async (req, res) => {
  const userId = req.session.user.id;

  try {
    const queryText = 'SELECT mensajes_flecha FROM users WHERE id = $1';
    const { rows } = await pool.query(queryText, [userId]);
    
    res.json({
      mensajes: rows[0].mensajes_flecha || []
    });
  } catch (error) {
    console.error('Error al obtener mensajes:', error);
    res.status(500).json({ error: 'Error al obtener mensajes' });
  }
});

// Agrega estas nuevas rutas
app.get('/api/blancos/cuentas', isAuthenticated, nichosController.getCuentasBlancos);
app.post('/api/blancos/cuentas', isAuthenticated, nichosController.postCuentasBlancos);


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
// Agrega al inicio con los otros requires

// Agrega después de las otras rutas
// Rutas para Instagram
app.get('/instagram', isAuthenticated, instagramController.showForm);
app.post('/instagram/send', isAuthenticated, instagramController.sendMessages);

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


// Agrega esto con las otras rutas en server.js

// Rutas para Campañas


// Rutas para Carga de Cuentas Objetivo
app.get('/targets', isAuthenticated, async (req, res) => {
    let currentList = null;
    try {
        // Optional: Fetch and display the user's current list if it exists
        const client = new MongoClient(mongoUri, { useUnifiedTopology: true });
        await client.connect();
        const db = client.db(mongoDbName);
        const collection = db.collection('user_target_lists'); // New collection name

        const existingList = await collection.findOne({ userId: req.session.user.id });
        if (existingList) {
            currentList = existingList;
        }
        await client.close();
    } catch (error) {
        console.error('Error fetching current target list:', error);
        // Proceed without the current list data
    }

    res.render('targets', {
        user: req.session.user,
        currentList: currentList,
        success: req.query.success, // For displaying success/error messages after redirect
        error: req.query.error
    });
});

app.post('/targets', isAuthenticated, async (req, res) => {
    const { base_account, target_accounts_list } = req.body;
    const userId = req.session.user.id; // Get user ID from the session

    // Basic validation
    if (!base_account || !target_accounts_list) {
        return res.redirect('/targets?error=Cuenta base y lista de cuentas objetivo son obligatorios.');
    }

    let targetAccountsArray = [];
    try {
        // Process the target accounts list
        // Split by newline or comma, trim whitespace, and filter out empty lines
        targetAccountsArray = target_accounts_list
            .split(/[\n,]+/) // Split by newline or comma
            .map(account => account.trim()) // Remove leading/trailing whitespace
            .filter(account => account !== ''); // Remove empty strings
        
        if (targetAccountsArray.length === 0) {
             return res.redirect('/targets?error=La lista de cuentas objetivo está vacía.');
        }

    } catch (processError) {
        console.error('Error processing target accounts list:', processError);
         return res.redirect('/targets?error=Error procesando la lista de cuentas objetivo.');
    }


    let client;
    try {
        client = new MongoClient(mongoUri, { useUnifiedTopology: true });
        await client.connect();
        const db = client.db(mongoDbName);
        const collection = db.collection('user_target_lists'); // Use the new collection

        // Data to be saved
        const targetListData = {
            userId: userId, // Link to the user
            baseAccount: base_account.trim(), // Trim base account too
            targetAccounts: targetAccountsArray,
            updatedAt: new Date(), // Timestamp for the last update
            // Maybe add createdAt only on first insert? UpdateOne with $set handles this.
        };

        // Use updateOne with upsert: true to create or replace the list for this user
        const result = await collection.updateOne(
            { userId: userId }, // Find document by user ID
            { $set: targetListData }, // Set or replace the data
            { upsert: true } // Create if no document matches userId
        );

        console.log(`Targets saved for user ${userId}: ${result.upsertedCount} inserted, ${result.modifiedCount} modified`);

        res.redirect('/targets?success=Lista de cuentas objetivo guardada correctamente.');

    } catch (error) {
        console.error('Error saving target list to MongoDB:', error);
        res.redirect(`/targets?error=Error al guardar la lista: ${error.message}`);
    } finally {
        if (client) {
            await client.close(); // Ensure connection is closed
        }
    }
});

// Obtener estadísticas de campaña
// Asegúrate de tener esta ruta para mostrar el formulario de campañas
app.get('/campaigns', isAuthenticated, async (req, res) => {
  try {
    // Obtener todas las campañas del usuario actual
    const campaignsQuery = await pool.query(
      'SELECT * FROM campaigns WHERE created_by = $1 ORDER BY start_date DESC', 
      [req.session.user.id]
    );
    const campaigns = campaignsQuery.rows;

    // Obtener estadísticas para las cards
    const statsQuery = await pool.query(`
      SELECT 
        COUNT(*) as total_campaigns,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_campaigns,
        SUM(CASE WHEN status = 'paused' THEN 1 ELSE 0 END) as paused_campaigns,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_campaigns
      FROM campaigns
      WHERE created_by = $1
    `, [req.session.user.id]);
    
    const stats = statsQuery.rows[0];

    res.render('campaigns', {
      user: req.session.user,
      campaigns: campaigns,
      stats: stats,
      success: req.query.success,
      error: req.query.error
    });
  } catch (error) {
    console.error('Error al obtener campañas:', error);
    res.status(500).render('error', {
      message: 'Error al cargar las campañas',
      error: error,
      user: req.session.user
    });
  }
});

// Crear nueva campaña
app.post('/campaigns', isAuthenticated, async (req, res) => {
  const {
    name,
    description,
    insta_account,
    start_date,
    end_date,
    daily_messages_limit,
    status
  } = req.body;

  // Validación básica
  if (!name || !insta_account || !start_date || !end_date || !daily_messages_limit) {
    return res.redirect('/campaigns?error=Todos los campos son obligatorios');
  }

  try {
    const queryText = `
      INSERT INTO campaigns (
        name, description, insta_account, start_date, end_date, 
        daily_messages_limit, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;
    const { rows } = await pool.query(queryText, [
      name, 
      description, 
      insta_account,
      start_date, 
      end_date, 
      daily_messages_limit, 
      status || 'active',
      req.session.user.id
    ]);

    // Actualizar el estado de campaña en el usuario
    await pool.query(
      'UPDATE users SET campaign_status = jsonb_set(campaign_status, $1, $2) WHERE id = $3',
      [`{${rows[0].id}}`, JSON.stringify({ active: status === 'active' }), req.session.user.id]
    );

    res.redirect('/campaigns?success=Campaña creada correctamente');
  } catch (error) {
    console.error('Error al crear campaña:', error);
    res.redirect('/campaigns?error=Error al crear campaña');
  }
});

// Actualizar campaña (para pausar/reanudar)
app.put('/campaigns/:id', isAuthenticated, async (req, res) => {
  const campaignId = req.params.id;
  const { status } = req.body;

  try {
    // Verificar que la campaña pertenece al usuario
    const verifyQuery = await pool.query(
      'SELECT id FROM campaigns WHERE id = $1 AND created_by = $2',
      [campaignId, req.session.user.id]
    );
    
    if (verifyQuery.rows.length === 0) {
      return res.status(403).json({ error: 'No tienes permiso para modificar esta campaña' });
    }

    const queryText = `
      UPDATE campaigns SET
        status = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING *;
    `;
    const { rows } = await pool.query(queryText, [status, campaignId]);

    // Actualizar el estado de campaña en el usuario
    await pool.query(
      'UPDATE users SET campaign_status = jsonb_set(campaign_status, $1, $2) WHERE id = $3',
      [`{${campaignId}}`, JSON.stringify({ active: status === 'active' }), req.session.user.id]
    );

    res.json({ success: true, campaign: rows[0] });
  } catch (error) {
    console.error('Error al actualizar campaña:', error);
    res.status(500).json({ error: 'Error al actualizar campaña' });
  }
});

// Obtener estadísticas de campaña
app.get('/campaigns/:id/stats', isAuthenticated, async (req, res) => {
  const campaignId = req.params.id;

  try {
    // Verificar que la campaña pertenece al usuario
    const campaignQuery = await pool.query(
      'SELECT * FROM campaigns WHERE id = $1 AND created_by = $2',
      [campaignId, req.session.user.id]
    );
    
    if (campaignQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Campaña no encontrada o no tienes acceso' });
    }

    const campaign = campaignQuery.rows[0];

    // Obtener estadísticas de mensajes desde MongoDB
    const client = new MongoClient(mongoUri, { useUnifiedTopology: true });
    await client.connect();
    const db = client.db(mongoDbName);
    const collection = db.collection('historial_acciones');

    const filter = {
      campaign_id: campaignId,
      fecha: {
        $gte: `${new Date(campaign.start_date).toISOString().split('T')[0]} 00:00:00`,
        $lte: `${new Date(campaign.end_date).toISOString().split('T')[0]} 23:59:59`
      }
    };

    // Mensajes totales
    const totalMessages = await collection.countDocuments({
      ...filter,
      accion: { $regex: /mensaje/i }
    });

    // Respuestas totales
    const totalReplies = await collection.countDocuments({
      ...filter,
      accion: { $regex: /respuesta/i }
    });

    // Mensajes por día
    const messagesByDay = await collection.aggregate([
      { $match: { ...filter, accion: { $regex: /mensaje/i } } },
      { $project: { fechaDia: { $substr: ["$fecha", 0, 10] } } },
      { $group: { _id: "$fechaDia", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).toArray();

    await client.close();

    res.json({
      campaign: campaign,
      stats: {
        total_messages: totalMessages,
        total_replies: totalReplies,
        reply_rate: totalMessages > 0 ? (totalReplies / totalMessages * 100).toFixed(1) : 0,
        messages_by_day: messagesByDay.map(item => ({
          date: item._id,
          count: item.count
        }))
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
