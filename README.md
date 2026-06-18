# LaravelGen AI — Generador de Proyectos Laravel con IA

LaravelGen AI es una aplicación web que permite a los desarrolladores generar proyectos Laravel completos y funcionales a partir de la importación de scripts SQL / MySQL dumps. El sistema interpreta el modelo de datos y construye automáticamente todo el código base necesario, reduciendo significativamente el tiempo de desarrollo inicial.

---

## 🚀 Objetivo del Proyecto
El objetivo principal de LaravelGen AI es automatizar tareas repetitivas de desarrollo al iniciar un nuevo proyecto. A partir de una estructura SQL, el sistema genera de forma automática:
*   **Modelos Eloquent** (con fillables, casts y relaciones hasOne, hasMany, belongsTo, belongsToMany).
*   **Migraciones** con tipos de datos correctos, claves primarias, foráneas e índices.
*   **Factories y Seeders** con datos de prueba realistas mediante Faker.
*   **Controladores Resource** con lógica CRUD básica.
*   **Form Requests** para la validación de peticiones (Store/Update).
*   **API Resources** para estandarizar respuestas.
*   **Rutas API REST** completas.
*   **Documentación** técnica del proyecto generada por IA (`README.md` y `DATABASE.md`).

---

## 🛠️ Tecnologías Usadas
### Frontend
*   **Next.js 14** (App Router) y React.
*   **TypeScript** para el tipado estático y robustez.
*   **Tailwind CSS** y **Shadcn/UI** para una interfaz moderna y pulida.
*   **Lucide Icons** para iconografía.

### Backend
*   **Laravel 12** y Laravel Sanctum (Gestión de usuarios y tokens API).
*   **Laravel Queues** y **Redis** para el procesamiento asíncrono en segundo plano (análisis SQL, inyección IA y compresión ZIP).

### Base de datos y Servicios
*   **MySQL / PostgreSQL** para persistir los proyectos y el historial de usuarios.
*   **MinIO** (local) o **Supabase Storage** (nube) para el almacenamiento de plantillas y ZIPs generados (S3-compatible).
*   **OpenRouter API** (DeepSeek, Claude, OpenAI) u **Ollama** (IA local) para la normalización inteligente y detección de relaciones implícitas.

---

## 🌐 Despliegue de la Aplicación

### Despliegue Local
El entorno local se levanta y expone en las siguientes direcciones de tu máquina:
*   **Frontend**: `http://localhost:3000`
*   **Backend / API**: `http://localhost:8000`
*   **MinIO Console** (Gestión de Archivos): `http://localhost:9001` (Puerto API S3: `9000`)
*   **Ollama API** (IA local): `http://localhost:11434`

### Despliegue en la Nube
Para producción, el proyecto está estructurado para alojarse en las siguientes plataformas:
*   **Frontend**: Desplegado en **Vercel** (óptimo para Next.js).
*   **Backend y Colas**: Alojado en **Render** (servicios de Web Service para la API de Laravel y Background Worker para el procesamiento de colas con Redis).
*   **Base de datos**: **Supabase** (PostgreSQL gestionado en la nube).
*   **Almacenamiento**: **Supabase Storage** (almacenamiento compatible con la API de Amazon S3).

---

## 🔑 Credenciales Necesarias para Desplegar en la Nube
Si deseas desplegar tu propia instancia de LaravelGen AI en la nube, debes configurar las siguientes variables de entorno en tus plataformas de hosting (Vercel y Render):

### En el Servidor de Backend (Render / Larvel)
*   **`APP_KEY`**: Clave de cifrado generada con `php artisan key:generate`.
*   **Conexión a la Base de Datos (Supabase PostgreSQL)**:
    ```env
    DB_CONNECTION=mysql # o pgsql si se conecta de forma nativa a postgres
    DB_HOST=aws-0-us-east-1.pooler.supabase.com # Tu host de Supabase
    DB_PORT=6543
    DB_DATABASE=postgres
    DB_USERNAME=postgres.tu_id_proyecto
    DB_PASSWORD=tu_contraseña_segura
    ```
*   **Conexión a Storage compatible con S3 (Supabase Storage)**:
    ```env
    AWS_ACCESS_KEY_ID=tu_clave_s3_supabase
    AWS_SECRET_ACCESS_KEY=tu_clave_secreta_s3_supabase
    AWS_DEFAULT_REGION=us-east-1
    AWS_BUCKET=generations # Nombre del bucket creado en Supabase
    AWS_ENDPOINT=https://tu_id.storage.supabase.co/storage/v1/s3
    AWS_USE_PATH_STYLE_ENDPOINT=true
    ```
*   **Conexión con la IA (OpenRouter)**:
    ```env
    OPENROUTER_API_KEY=sk-or-v1-tu_clave_de_openrouter
    OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free # Modelo a usar
    ```
*   **Conexión con la cola y caché (Redis)**:
    ```env
    REDIS_HOST=tu_host_redis_en_render
    REDIS_PASSWORD=tu_contraseña_redis
    REDIS_PORT=6379
    ```

### En el Servidor de Frontend (Vercel / Next.js)
*   **`NEXT_PUBLIC_API_URL`**: La URL de tu backend desplegado en Render (ej: `https://laravel-builder-api.onrender.com/api/v1`).

---

## 💻 Instalación en Ambiente Local

### Opción A: Despliegue Rápido con Docker (Recomendado)
1. Asegúrate de tener instalado **Docker** y **Docker Desktop**.
2. Corre el siguiente comando en la raíz del proyecto para descargar e iniciar toda la infraestructura (MySQL, Redis, MinIO, Ollama, Backend y Frontend):
   ```bash
   docker compose up -d
   ```
3. Accede a [http://localhost:3000](http://localhost:3000).

---

### Opción B: Instalación Manual

#### 1. Configuración del Backend (`/backend`)
1. Ingresa a la carpeta del backend:
   ```bash
   cd backend
   ```
2. Instala las dependencias:
   ```bash
   composer install
   ```
3. Crea tu archivo de entorno:
   ```bash
   cp .env.example .env
   ```
4. Genera la clave de aplicación:
   ```bash
   php artisan key:generate
   ```
5. Abre el archivo `.env` y configura tus credenciales locales de base de datos MySQL, almacenamiento S3 (MinIO) y tu API Key de OpenRouter.
6. Corre las migraciones de base de datos:
   ```bash
   php artisan migrate
   ```
7. Pre-compila las plantillas del framework que se usarán para construir los proyectos:
   ```bash
   php artisan templates:compile 10 default
   php artisan templates:compile 11 default
   php artisan templates:compile 12 default
   ```
8. Inicia el servidor de desarrollo y el worker de colas:
   ```bash
   # Terminal 1
   php artisan serve
   
   # Terminal 2
   php artisan queue:work
   ```

#### 2. Configuración del Frontend (`/frontend`)
1. Ingresa a la carpeta del frontend:
   ```bash
   cd ../frontend
   ```
2. Instala las dependencias de Node.js:
   ```bash
   npm install
   ```
3. Configura las variables de entorno locales:
   * Crea un archivo `.env.local` en la raíz de esta carpeta.
   * Añade la URL del backend local:
     ```env
     NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
     ```
4. Inicia el servidor de desarrollo:
   ```bash
   npm run dev
   ```
5. Abre [http://localhost:3000](http://localhost:3000) en tu navegador.
