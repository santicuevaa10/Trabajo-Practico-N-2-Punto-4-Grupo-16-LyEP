import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import clientesRoutes from './routes/ClientesRoutes.js';
import alertasRoutes from './routes/AlertasRoutes.js';
import metricasRoutes from './routes/MetricasRoutes.js';
import importacionesRoutes from './routes/ImportacionesRoutes.js';
import { manejadorErrores } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok', servicio: 'ClientFlow API' });
});

app.use('/users', clientesRoutes);
app.use('/alertas', alertasRoutes);
app.use('/metricas', metricasRoutes);
app.use('/importaciones', importacionesRoutes);

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