# pos-suite

Monorepo base para una suite POS con:

- `backend/` - API REST en Node.js + Express
- `web/` - Frontend SSR con Vue
- `mobile/` - App móvil con Flutter

## Estructura

```text
pos-suite/
├── backend/
├── web/
├── mobile/
└── README.md
```

## Prerrequisitos

- Node.js 20+ (recomendado LTS) y npm
- Flutter SDK (estable) y Android Studio / Xcode (según plataforma)
- Git

Verificar versiones:

### PowerShell

```powershell
node -v
npm -v
flutter --version
```

### Bash

```bash
node -v
npm -v
flutter --version
```

## Instalación de dependencias

> Sugerencia de arquitectura: manejar `backend` y `web` como proyectos Node independientes y `mobile` como proyecto Flutter.

### Backend (Node.js + Express)

### PowerShell

```powershell
cd .\pos-suite\backend
npm install
```

### Bash

```bash
cd ./pos-suite/backend
npm install
```

### Web (Nuxt 3 SSR)

### PowerShell

```powershell
cd .\pos-suite\web
npm install
```

### Bash

```bash
cd ./pos-suite/web
npm install
```

### Mobile (Flutter)

### PowerShell

```powershell
cd .\pos-suite\mobile
flutter pub get
```

### Bash

```bash
cd ./pos-suite/mobile
flutter pub get
```

## Correr los servicios

Los comandos exactos dependen del framework SSR elegido para Vue (por ejemplo Nuxt o Vite SSR). A continuación se define una convención recomendada.

### Backend (Express)

Convención recomendada en `backend/package.json`:

- `npm run dev` -> servidor en modo desarrollo (por ejemplo con `nodemon`)
- `npm start` -> servidor en producción
- `npm run db:sync` -> sincroniza tablas MySQL (desarrollo)
- `npm run seed:products` -> inserta productos de prueba (desarrollo)

Preparación inicial de BD (primero sync, luego seed):

### PowerShell

```powershell
cd .\pos-suite\backend
npm run db:sync
npm run seed:products
```

### Bash

```bash
cd ./pos-suite/backend
npm run db:sync
npm run seed:products
```

### PowerShell

```powershell
cd .\pos-suite\backend
npm run dev
```

### Bash

```bash
cd ./pos-suite/backend
npm run dev
```

### Web (Nuxt 3 SSR)

Scripts en `web/package.json`:

- `npm run dev` -> SSR en desarrollo (Nuxt dev server)
- `npm run build` -> build de producción
- `npm run preview` -> previsualizar build de producción

### PowerShell

```powershell
cd .\pos-suite\web
npm run dev
```

### Bash

```bash
cd ./pos-suite/web
npm run dev
```

### Mobile (Flutter)

Primero listar dispositivos/emuladores y luego ejecutar:

### PowerShell

```powershell
cd .\pos-suite\mobile
flutter devices
flutter run
```

### Bash

```bash
cd ./pos-suite/mobile
flutter devices
flutter run
```

## Variables de entorno

Se recomienda usar archivos `.env` por proyecto y **no** versionar secretos.

### Backend (`pos-suite/backend/.env`)

Ejemplo:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgres://user:password@localhost:5432/posdb
JWT_SECRET=replace_me
CORS_ORIGIN=http://localhost:5173
```

### Web (`pos-suite/web/.env`)

Nuxt 3 usa variables públicas con prefijo `NUXT_PUBLIC_`.

Ejemplo:

```env
NUXT_PUBLIC_API_BASE_URL=http://localhost:3000/api
```

### Mobile (`pos-suite/mobile/.env` o `--dart-define`)

Flutter normalmente usa `--dart-define` o paquetes como `flutter_dotenv`.

Ejemplo con `--dart-define`:

### PowerShell

```powershell
cd .\pos-suite\mobile
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000
```

### Bash

```bash
cd ./pos-suite/mobile
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000
```

## Recomendación de siguiente paso

Inicializar cada subproyecto con sus CLI oficiales:

- Backend: `npm init -y` + `npm i express`
- Web SSR (Nuxt 3): `npx nuxi@latest init .` + `npm i` + `npm i axios @nuxtjs/tailwindcss`
- Mobile: `flutter create .`
