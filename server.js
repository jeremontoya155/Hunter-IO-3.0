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
      res.redirect('/resumen');
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
    // 1️⃣ Extraer las cuentas de Instagram del usuario desde PostgreSQL
    const userAccounts = req.session.user.accounts || [];
    const instaUsernames = userAccounts.map((ac) => ac.insta_username);

    // 2️⃣ Revisar si se recibió un parámetro 'account' para filtrar
    const selectedAccount = req.query.account || null; // Ejemplo: 'bichobarber1'
    const selectedMonth = req.query.month || new Date().toISOString().slice(0, 7); // Formato YYYY-MM

    // 3️⃣ Conectarse a MongoDB y obtener los documentos de 'historial_acciones'
    const client = new MongoClient(mongoUri, { useUnifiedTopology: true });
    await client.connect();
    const db = client.db(mongoDbName);
    const collection = db.collection('historial_acciones');

    // Construcción del filtro
    const filter = {
      username: selectedAccount ? selectedAccount : { $in: instaUsernames },
      fecha: { $regex: `^${selectedMonth}` } // Filtrar por mes en formato "YYYY-MM"
    };

    const historial = await collection.find(filter).toArray();
    await client.close();

    // 4️⃣ Calcular métricas básicas del historial
    let totalMensajesEnviados = historial.length;
    let fechaUltimoMensaje = 'N/A';
    let destinatarioUltimo = 'N/A';
    let ultimoMensaje = 'N/A';
    let fechaPrimerMensaje = 'N/A';
    let diaMasMensajes = 'N/A';
    let mensajesPorTipo = { comunicacion: 0, venta: 0, imperativo: 0 };
    let mensajesPorDia = {};

    if (historial.length > 0) {
      // Función para convertir la fecha correctamente
      const parseFecha = (str) => new Date(str.replace(' ', 'T'));

      // Ordenar mensajes por fecha ascendente
      const sorted = historial.slice().sort((a, b) => parseFecha(a.fecha) - parseFecha(b.fecha));

      fechaPrimerMensaje = sorted[0].fecha;
      fechaUltimoMensaje = sorted[sorted.length - 1].fecha;
      destinatarioUltimo = sorted[sorted.length - 1].destinatario;
      ultimoMensaje = sorted[sorted.length - 1].mensaje;

      // Calcular el día con más mensajes
      historial.forEach(({ fecha, tipo_mensaje }) => {
        const dia = fecha.substring(0, 10); // Extraer solo la fecha sin hora
        mensajesPorDia[dia] = (mensajesPorDia[dia] || 0) + 1;
        mensajesPorTipo[tipo_mensaje] = (mensajesPorTipo[tipo_mensaje] || 0) + 1;
      });

      const dayArray = Object.entries(mensajesPorDia).sort((a, b) => b[1] - a[1]);
      if (dayArray.length > 0) {
        diaMasMensajes = `${dayArray[0][0]} (Total: ${dayArray[0][1]})`;
      }
    }

    // 5️⃣ Formatear los datos del gráfico para la línea de tiempo
    const fechasOrdenadas = Object.keys(mensajesPorDia).sort();
    const datosGrafico = fechasOrdenadas.map(fecha => ({
      fecha,
      cantidad: mensajesPorDia[fecha]
    }));

    // 6️⃣ Renderizar la vista 'resumen.ejs'
    res.render('resumen', {
      username: req.session.user.username,
      total_mensajes_enviados: totalMensajesEnviados,
      ultimos_mensajes: historial,
      fechaPrimerMensaje,
      fechaUltimoMensaje,
      destinatarioUltimo,
      ultimoMensaje,
      diaMasMensajes,
      mensajesPorTipo,
      datosGrafico,
      userAccounts, // Lista de todas las cuentas asociadas
      selectedAccount, // Cuenta actualmente filtrada
      selectedMonth, // Mes seleccionado en el filtro
    });

  } catch (error) {
    console.error('Error al obtener el historial desde MongoDB:', error);
    res.render('resumen', {
      username: req.session.user.username,
      total_mensajes_enviados: 0,
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
      selectedMonth: new Date().toISOString().slice(0, 7),
    });
  }
});

// Endpoint para obtener datos del gráfico
app.get('/resumen/data', isAuthenticated, async (req, res) => {
  const selectedMonth = req.query.month || new Date().toISOString().slice(0, 7); // Formato YYYY-MM
  const userAccounts = req.session.user.accounts || [];
  const instaUsernames = userAccounts.map((ac) => ac.insta_username);

  try {
    const client = new MongoClient(mongoUri, { useUnifiedTopology: true });
    await client.connect();
    const db = client.db(mongoDbName);
    const collection = db.collection('historial_acciones');

    // Construcción del filtro
    const filter = {
      username: { $in: instaUsernames },
      fecha: { $regex: `^${selectedMonth}` } // Filtrar por mes en formato "YYYY-MM"
    };

    const historial = await collection.find(filter).toArray();
    await client.close();

    // Calcular métricas básicas del historial
    let mensajesPorDia = {};
    historial.forEach(({ fecha }) => {
      const dia = fecha.substring(0, 10); // Extraer solo la fecha sin hora
      mensajesPorDia[dia] = (mensajesPorDia[dia] || 0) + 1;
    });

    // Formatear los datos del gráfico
    const fechasOrdenadas = Object.keys(mensajesPorDia).sort();
    const datosGrafico = fechasOrdenadas.map(fecha => ({
      fecha,
      cantidad: mensajesPorDia[fecha]
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
