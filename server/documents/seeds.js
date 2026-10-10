import 'dotenv/config';
import mongoose from 'mongoose';
import Cliente from '../models/Cliente.js';
import clientesSemilla from './clientes.seed.json' with { type: 'json' };
await mongoose.connect(process.env.MONGODB_URI);
await Cliente.deleteMany({});
await Cliente.insertMany(clientesSemilla);
console.log(`${clientesSemilla.length} clientes insertados`);
process.exit(0);
