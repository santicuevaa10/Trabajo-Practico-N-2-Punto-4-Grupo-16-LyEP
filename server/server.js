import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { manejadorErrores } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok', servicio: 'ClientFlow API' });
});

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

  import clientesRoutes from './routes/clientesRoutes.js';
// ...
app.use('/users', clientesRoutes);
