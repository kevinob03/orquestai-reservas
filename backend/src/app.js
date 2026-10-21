const express = require('express'); const cors = require('cors');
const catalogo = require('./routes/catalogoRoutes'); const reservas = require('./routes/reservaRoutes');
const app = express(); app.use(cors()); app.use(express.json());
app.get('/api/health', (_req,res) => res.json({ ok: true })); app.use('/api', catalogo); app.use('/api', reservas);
app.use((_req,res) => res.status(404).json({ error: 'Ruta no existe' }));
app.use((err,_req,res,_next) => { console.error(err); res.status(err.status || 500).json({ error: err.status ? err.message : 'Error interno del servidor' }); });
module.exports = app;
