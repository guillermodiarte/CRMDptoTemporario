# Guía de Despliegue en Hostinger (Node.js/VPS)

Esta guía detalla los pasos para desplegar la aplicación "Alojamientos Di'Arte" en un entorno de hosting (Hostinger VPS o Cloud/Shared con soporte Node.js).

## 1. Preparación del Build (Local)

Antes de subir nada, debemos generar una versión optimizada de la aplicación.

1.  **Configuración**: Asegúrate de que `next.config.ts` tiene `output: "standalone"`.
2.  **Generar Build**:
    Abre tu terminal en la carpeta del proyecto y ejecuta:
    ```bash
    npm run build
    ```

3.  **Preparar Archivos para Subir**:
    Al finalizar, se creará una carpeta `.next/standalone`. Esta carpeta contiene *casi* todo lo necesario, pero faltan los archivos estáticos.
    
    Debes hacer lo siguiente manualmente (o crear un script):
    *   Copia la carpeta `public` y pégala DENTRO de `.next/standalone/public`.
    *   Copia la carpeta `.next/static` y pégala DENTRO de `.next/standalone/.next/static`.
    *   **¡MUY IMPORTANTE!** Copia tu archivo `package.json` (el de la raíz) y pégalo DENTRO de `.next/standalone/package.json` (Reemplaza el archivo pequeño que se genera solo).

    **Tu carpeta para subir (`standalone`) debe verse así:**
    ```text
    standalone/
    ├── .next/
    │   ├── static/    <-- (Copiado manual)
    │   └── server/
    ├── public/        <-- (Copiado manual)
    ├── node_modules/
    ├── package.json   <-- (¡EL TUYO ORIGINAL, NO EL DE 20 BYTES!)
    └── server.js      <-- Archivo de inicio
    ```

## 2. Configuración en Hostinger (VPS - Recomendado)

Si tienes un VPS (Ubuntu/Debian):

1.  **Conexión**: Conéctate por SSH a tu servidor.
2.  **Instalar Node.js y PM2**:
    ```bash
    # Instalar Node.js 18+
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs

    # Instalar PM2 (Gestor de procesos)
    sudo npm install -g pm2
    ```
3.  **Subir Archivos**:
    Sube el **contenido** de tu carpeta `standalone` preparada (paso 1) a una carpeta en el servidor, ej: `/var/www/crm-app`.
4.  **Variables de Entorno**:
    Crea un archivo `.env` en esa misma carpeta (`/var/www/crm-app/.env`) con tus claves de producción:
    ```env
    DATABASE_URL="file:./prod.db"
    AUTH_SECRET="tu-clave-super-secreta-generada"
    ```
5.  **Base de Datos**:
    Ejecuta las migraciones en el servidor:
    ```bash
    cd /var/www/crm-app
    # Nota: Es posible que necesites copiar la carpeta 'prisma' también si usas npx prisma db push,
    # O simplemente asegura que el archivo dev.db (o prod.db) exista y tenga permisos.
    # Recomendado: Ejecuta esto localmente contra la DB de producción o sube tu dev.db vacía.
    ```
6.  **Iniciar Aplicación**:
    ```bash
    pm2 start server.js --name "crm-app" -- -p 3000
    pm2 save
    pm2 startup
    ```
7.  **Reverse Proxy (Nginx)**:
    Configura Nginx para redirigir el tráfico del dominio al puerto 3000.

## 3. Hostinger Shared (Hosting Compartido Node.js)

Si usas el plan Cloud o Business con selector de Node.js:

1.  **Subir Archivos**: Sube el contenido de `standalone` a `public_html` (o una subcarpeta).
2.  **Configurar Node.js App**:
    *   **Application Root**: La ruta donde subiste los archivos.
    *   **Application Startup File**: `server.js`.
    *   **Node.js Version**: 18 o superior.
3.  **Instalar Dependencias**: Normalmente no hace falta hacer `npm install` porque la carpeta `standalone` ya incluye `node_modules` necesarios, pero si Hostinger lo pide, dale al botón "Install NPM".
4.  **Environment Variables**: Configúralas en el panel de Hostinger.

## ✅ Resumen de Archivos a Subir

Solo sube lo que está dentro de la carpeta `standalone` (luego de copiar `public` y `static` dentro de ella).

**NO SUBAS:**
*   La carpeta `node_modules` de la raíz de tu proyecto (pesa mucho y no sirve).
*   La carpeta `.git`.
*   Archivos fuente `.ts` o `src` (ya están compilados).

## ⚠️ Errores Comunes / Troubleshooting

### Error: "Couldn't find any `pages` or `app` directory"
**Causa:** Este error ocurre porque el servidor está intentando ejecutar `npm run build` (o similar) dentro de la carpeta `standalone`. Como esta carpeta ya está compilada y no tiene el código fuente (`app/` o `pages/`), el comando falla.

**Solución:**
1.  **NO EJECUTES** el comando de build en Hostinger si usas el método `standalone`.
2.  Asegúrate de que el **Archivo de Inicio (Startup File)** esté configurado explícitamente como `server.js`.
3.  Si estás usando el panel "Node.js App" en Hostinger Shared:
    - **No presiones** botones como "Build" o "Deploy".
    - Si hay un campo "Build Command", intenta dejarlo vacío o escribe `echo "Skipping build"`.
    - Solo asegúrate de darle al botón o comando para **Iniciar** (restart/start) la aplicación.

### Error: "EADDRINUSE: address already in use :::3000"
**Causa:** El puerto 3000 ya está ocupado. Esto significa que la aplicación **ya está corriendo** en segundo plano o se quedó "colgada" de un intento anterior.

**Solución:**
*   **En Panel Hostinger (Shared):** En lugar de darle a "Start", busca el botón **"Restart"** (Reiniciar). Forcea al servidor a matar el proceso anterior.
*   **En VPS (SSH):**
    1.  Busca el proceso: `lsof -i :3000` o `netstat -nlp | grep :3000`
    2.  Mátalo: `kill -9 <PID>` (reemplaza <PID> por el número que salga).
    3.  O si usas PM2: `pm2 delete crm-app` y luego inícialo de nuevo.

### Error: "ENOENT: no such file or directory ... .next/static"
**Causa:** Falta la carpeta `static` dentro de tu subida. La compilación `standalone` NO incluye automáticamente los archivos estáticos (JS, CSS, imágenes).

**Solución:**
Debes copiar manualmente la carpeta `.next/static` de tu entorno local y pegarla dentro de `standalone/.next/static` antes de subirlo.
Estructura correcta:
```
standalone/
  .next/
    static/  <-- ¡Esta es la que falta!
    server/
    server/
```

### Error: "403 Forbidden" (Pantalla negra)
**Causa:** El servidor web (Apache/LiteSpeed) no está redirigiendo el tráfico a tu aplicación Node.js, y trata de listar archivos.

**Solución:**
Crea un archivo `.htaccess` en `public_html`:
```apache
RewriteEngine On
RewriteRule ^$ http://127.0.0.1:3000/ [P,L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ http://127.0.0.1:3000/$1 [P,L]
```

### Error: "503 Service Unavailable"
**Causa:** El proxy `.htaccess` intenta conectar al puerto 3000, pero la aplicación no responde.

**Solución:**
1.  **Dale tiempo:** Espera 1 minuto tras desplegar.
2.  **Reinicia:** En el panel Hostinger, busca el botón **"Restart"** (o cambia una variable de entorno y guarda para forzar reinicio).
3.  **Verifica el puerto:** Si los logs dicen "Ready on port X", cambia el 3000 por X en el `.htaccess`.

## Conexión a Base de Datos (MySQL)

**Datos de Conexión:**
*   **Host:** `localhost` (Generalmente en Hostinger)
*   **Port:** `3306`
*   **Database:** `u946625231_dptosdiarte`
*   **User:** `u946625231_guillermo`
*   **Password:** `Gad33224122#`

**Connection String para `.env` (Hostinger):**
```env
DATABASE_URL="mysql://u946625231_guillermo:Gad33224122%23@localhost:3306/u946625231_dptosdiarte"
```
*Nota: El `#` en la contraseña se codifica como `%23` en la URL.*

**Inicialización:**
1.  Abre **phpMyAdmin** en Hostinger.
2.  Selecciona tu base de datos `u946625231_dptosdiarte`.
3.  Ve a la pestaña **Importar**.
4.  Sube el archivo `mysql_init.sql` que se encuentra en la raíz de tu proyecto.
5.  Esto creará todas las tablas y el usuario administrador.

## 🛠️ Debugging / Ver Errores
Si la aplicación falla y no sabes por qué, hemos activado un registro de errores en archivo.

1.  **En Hostinger Admin de Archivos:**
    Ve a la carpeta de tu aplicación.
2.  **Busca el archivo:** `app.log`
    Este archivo se creará automáticamente cuando la app intente arrancar.
3.  **Léelo:** Descárgalo o edítalo para ver los últimos mensajes de error (Base de datos, variables faltantes, etc).

*Nota: Hemos modificado el comando `start` en `package.json` para que guarde todo en `app.log`.*
