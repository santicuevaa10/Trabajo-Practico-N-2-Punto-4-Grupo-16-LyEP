export const manejadorErrores = (err, req, res, next) => {
  console.error(err);
  // Errores de validacion de Mongoose (min, max, enum, required...) e IDs
  // con formato invalido son errores del cliente, no del servidor.
  if (err.name === 'ValidationError' || err.name === 'CastError') {
    return res.status(400).json({ error: err.message });
  }
  // Errores de subida de archivos (multer).
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'El archivo supera el máximo de 2 MB' });
    }
    return res.status(400).json({ error: `Error al subir el archivo: ${err.message}` });
  }
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Error interno del servidor' });
};
