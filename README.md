# Backend propio (servidor Express + MongoDB)

Ademas de FakeStoreAPI, el proyecto incluye un backend propio en server/ (Express + MongoDB Atlas) que replica exactamente la misma forma de datos y el mismo path (/users), para que el frontend no necesite ningun cambio de codigo.

## Instalacion

cd server
npm install

Copia server/.env.example a server/.env y completa MONGODB_URI con la cadena de conexion real de tu cluster de MongoDB Atlas (este archivo nunca se commitea).

npm run dev

El servidor levanta en http://localhost:3001.

## Conectar el frontend al backend propio

En client/, copia .env.example a .env y cambia:

VITE_API_URL=http://localhost:3001

Reinicia npm run dev del cliente.

A diferencia de FakeStoreAPI, con el backend propio los POST y DELETE si persisten de verdad en la base de datos.

## Levantar client y server en paralelo

Se necesitan dos terminales abiertas al mismo tiempo:

Terminal 1 - Backend: cd server && npm run dev (Puerto 3001)
Terminal 2 - Frontend: cd client && npm run dev (Puerto 5173)

Nota: si no se configura server/ ni se cambia VITE_API_URL, la app sigue funcionando igual que siempre contra FakeStoreAPI. El backend propio es opcional para quien solo quiera correr el frontend.