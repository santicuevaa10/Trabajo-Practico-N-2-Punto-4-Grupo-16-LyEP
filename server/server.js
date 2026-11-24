import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import clientesRoutes from './routes/ClientesRoutes.js';
import alertasRoutes from './routes/alertasRoutes.js';
import metricasRoutes from './routes/MetricasRoutes.js';
import importacionesRoutes from './routes/ImportacionesRoutes.js';
import exportacionesRoutes from './routes/ExportacionesRoutes.js';
import { manejadorErrores } from './middleware/errorHandler.js';
import { headersSeguridad, corsRestringido, limitarEscrituras } from './middleware/seguridad.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(headersSeguridad());
app.use(corsRestringido());
app.use(express.json());
// Despues de CORS: un 429 tambien lleva los headers CORS y el frontend puede leer el error.
app.use(limitarEscrituras());

app.get('/', (req, res) => {
  res.json({ status: 'ok', servicio: 'ClientFlow API' });
});

app.use('/users', clientesRoutes);
app.use('/alertas', alertasRoutes);
app.use('/metricas', metricasRoutes);
app.use('/importaciones', importacionesRoutes);
app.use('/exportaciones', exportacionesRoutes);

app.use(manejadorErrores);

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Conectado a MongoDB Atlas');
    app.listen(PORT, () =>
      console.log(`Servidor escuchando en http://localhost:${PORT}`)
    );
  })
  .catch((error) => {
    console.error('Error al conectar a MongoDB', error);
    process.exit(1);
  });