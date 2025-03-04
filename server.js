const express = require('express');
const path = require('path');
const { Pool } = require('pg');
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
      res.redirect('/index');
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
    // 1. Extraer las cuentas de Instagram del usuario (campo 'accounts' en PostgreSQL)
    const userAccounts = req.session.user.accounts || [];
    const instaUsernames = userAccounts.map((ac) => ac.insta_username);

    // 2. Revisar si se recibió un parámetro 'account' para filtrar
    const selectedAccount = req.query.account; // Ej: 'bichobarber1'

    // 3. Conectarse a MongoDB y obtener los documentos de 'historial_acciones'
    const client = new MongoClient(mongoUri, { useUnifiedTopology: true });
    await client.connect();
    const db = client.db(mongoDbName);
    const collection = db.collection('historial_acciones');

    // Si se seleccionó una cuenta, filtrar solo por esa, de lo contrario, usar todas las asociadas
    const filter = selectedAccount
      ? { username: selectedAccount }
      : { username: { $in: instaUsernames } };

    const historial = await collection.find(filter).toArray();
    await client.close();

    // 4. Calcular métricas básicas a partir del historial filtrado
    let totalMensajesEnviados = historial.length;
    let fechaUltimoMensaje = 'N/A';
    let destinatarioUltimo = 'N/A';
    let ultimoMensaje = 'N/A';
    let fechaPrimerMensaje = 'N/A';
    let diaMasMensajes = 'N/A';

    if (historial.length > 0) {
      // Función para convertir la fecha (formato "YYYY-MM-DD HH:mm:ss")
      const parseFecha = (str) => new Date(str.replace(' ', 'T'));

      // Ordenar los documentos por fecha ascendente
      const sorted = historial
        .slice()
        .sort((a, b) => parseFecha(a.fecha) - parseFecha(b.fecha));

      fechaPrimerMensaje = sorted[0].fecha;
      fechaUltimoMensaje = sorted[sorted.length - 1].fecha;
      destinatarioUltimo = sorted[sorted.length - 1].destinatario;
      ultimoMensaje = sorted[sorted.length - 1].mensaje;

      // Calcular el día con más mensajes
      const dayCounts = {};
      historial.forEach((item) => {
        const day = item.fecha.substring(0, 10);
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      });
      const dayArray = Object.entries(dayCounts);
      dayArray.sort((a, b) => b[1] - a[1]);
      if (dayArray.length > 0) {
        diaMasMensajes = `${dayArray[0][0]} (Total: ${dayArray[0][1]})`;
      }
    }

    // 5. Renderizar la vista 'resumen.ejs' pasando todas las métricas, el historial y la cuenta seleccionada
    res.render('resumen', {
      username: req.session.user.username,
      total_mensajes_enviados: totalMensajesEnviados,
      ultimos_mensajes: historial, // PASAR TODO EL HISTORIAL AQUÍ
      historial,
      fechaPrimerMensaje,
      diaMasMensajes,
      userAccounts, // Lista de todas las cuentas asociadas
      selectedAccount, // Cuenta actualmente filtrada (si la hay)
    });
  } catch (error) {
    console.error('Error al obtener el historial desde MongoDB:', error);
    res.render('resumen', {
      username: req.session.user.username,
      total_mensajes_enviados: 0,
      ultimos_mensajes: [
        {
          fecha: 'N/A',
          destinatario: 'N/A',
          mensaje: 'N/A',
        },
      ],
      historial: [],
      fechaPrimerMensaje: 'N/A',
      diaMasMensajes: 'N/A',
      userAccounts: req.session.user.accounts || [],
      selectedAccount: null,
    });
  }
});

app.get('/onboarding', isAuthenticated, (req, res) => {
  res.render('onboarding');
});

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
