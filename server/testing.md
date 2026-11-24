# Checklist de pruebas manuales — API de clientes

- [ ] GET /users devuelve la lista de clientes (seed cargado)
- [ ] GET /users/:id devuelve un cliente puntual
- [ ] POST /users crea un cliente nuevo y lo persiste
- [ ] DELETE /users/:id elimina el cliente
- [ ] El frontend (client/) lista, crea y elimina clientes sin errores en consola
- [ ] Reiniciar el servidor y verificar que los datos persisten en MongoDB Atlas
## Documentación de clientes

- [ ] POST /users/:id/documentos con `{ "tipo": "habilitacion", "numero": "H-123", "vencimiento": "2026-12-01" }` devuelve 201 y el cliente con el documento agregado
- [ ] POST /users/:id/documentos con un `tipo` fuera del enum o sin `vencimiento` devuelve 400
- [ ] DELETE /users/:id/documentos/:docId quita el documento y devuelve el cliente actualizado
- [ ] GET /users/:id incluye `estadoDocumental`: "ok" sin documentos o todos vigentes, "por_vencer" si alguno vence en 30 días o menos, "vencido" si alguno ya venció
- [ ] GET /alertas?tipo=documentos&dias=30 devuelve `vencidos` y `porVencer`, ordenados por urgencia
- [ ] GET /alertas sin `tipo=documentos` o con `dias` negativo devuelve 400
- [ ] En la ficha de un cliente con un documento vencido aparece el banner rojo "no habilitado para venta"
- [ ] El formulario de alta y el botón "Quitar" solo aparecen con sector Gerencia
- [ ] La lista de clientes muestra el ícono de estado documental de cada cliente

## Condiciones comerciales (append-only)

- [ ] POST /users/:id/condiciones con header `X-Usuario: jimena@gmail.com` y `{ "descuento": 10, "limiteCredito": 500000, "motivo": "Alta de cuenta" }` devuelve 201 con `autorizadoPor` = el header
- [ ] El mismo POST sin header `X-Usuario` devuelve 400
- [ ] `descuento` fuera de 0-100 o `limiteCredito` negativo devuelve 400
- [ ] Un `autorizadoPor` enviado en el body se ignora (manda el header)
- [ ] GET /users/:id/condiciones devuelve el historial del más nuevo al más viejo
- [ ] No existe PUT ni DELETE sobre condiciones; el modelo además bloquea updates/deletes (405)
- [ ] En la ficha, pestaña "Condiciones comerciales": la condición vigente aparece destacada y el historial como línea de tiempo
- [ ] Con sector Soporte la pestaña se ve en modo lectura (sin formulario)

## Visitas (registro rápido)

- [ ] POST /users/:id/visitas con header `X-Usuario` y `{ "resultado": "sin_pedido" }` devuelve 201 con `{ visita, cliente }` y actualiza `cliente.ultimaVisita`
- [ ] Con `"resultado": "pedido"` actualiza también `cliente.ultimaCompra`
- [ ] Sin header `X-Usuario`, con `resultado` fuera del enum o con `nota` de más de 280 caracteres devuelve 400
- [ ] Con un cliente inexistente devuelve 404 y no queda ninguna visita guardada (transacción)
- [ ] GET /users/:id/visitas devuelve como máximo 20, de la más reciente a la más vieja
- [ ] GET /metricas/vendedores-activos?semana=2026-W48 devuelve la cantidad de vendedores distintos con visitas esa semana (sin `semana` usa la actual; formato inválido -> 400)
- [ ] En ListaClientes y en la ficha, "Registrar visita" abre el modal; un clic en un resultado guarda, cierra y muestra el toast

## Importación de clientes desde CSV del ERP

- [ ] En /importar (solo Gerencia), subir `server/documents/ejemplo-tango.csv` con el seed cargado: la simulación muestra 2 a crear, 1 a actualizar y 2 errores (email inválido en la fila 5, falta LOCALIDAD en la fila 6)
- [ ] La simulación no escribe nada en la base
- [ ] Confirmar crea/actualiza esas filas y saltea las inválidas; reimportar el mismo archivo da 0 creados y 0 actualizados
- [ ] Un archivo de más de 2 MB devuelve 413; uno que no es .csv o sin columna E_MAIL devuelve 400
- [ ] Con sector Soporte no aparece el link "Importar" y /importar muestra que no tiene permiso
