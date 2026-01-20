# Guía de Despliegue en Dokploy

Dokploy facilita el despliegue usando Docker, pero debido a que usamos una base de datos SQLite (archivo local), es **CRÍTICO** configurar un volumen persistente para no perder los datos en cada despliegue.

## 1. Configuración Básica

1.  En tu Dashboard de Dokploy, crea una nueva **Application**.
2.  Selecciona tu repositorio (GitHub/GitLab) y la rama (`main`).
3.  **Build Path**: `/` (Raíz).
4.  **Dockerfile Path**: `./deployment/Dockerfile` (Asegúrate de poner esta ruta exacta).
5.  **Publish Directory**: Déjalo vacío o por defecto (Docker se encarga de servir).

## 2. Variables de Entorno (Environment)

Ve a la pestaña **Environment** y agrega:

```env
DATABASE_URL="file:/app/database/prod.db"
AUTH_SECRET="...tu clave secreta..."
AUTH_TRUST_HOST=true
```

## 3. Persistencia de Datos (¡MUY IMPORTANTE!)

Para que la base de datos `prod.db` no se borre cuando Dokploy reconstruya la imagen, necesitas montar un volumen ("Mounts" o "Volumes" en Dokploy).

Ve a la pestaña **Volumes** (o **Mounts**) y agrega:

-   **Type**: Bind Mount (o Local Volume)
-   **Host Path**: `/etc/dokploy/tus_datos/crm_database` (O cualquier ruta en tu servidor VPS donde quieras guardar la BD).
-   **Container Path**: `/app/database`

> **Nota**: Asegúrate de que la carpeta `/etc/dokploy/tus_datos/crm_database` (o la que elijas) tenga permisos de escritura en el servidor.
> Si usas un Volumen de Docker (Docker Volume), simplemente ponle un nombre (ej: `crm_data_vol`) y úsalo en Container Path: `/app/database`.

## 4. Despliegue

1.  Haz clic en **Deploy**.
2.  Dokploy construirá la imagen usando el `Dockerfile` de la carpeta `deployment`.
3.  Al finalizar, tu app estará corriendo en el puerto 3000 (interno). Dokploy debería exponértelo automáticamente vía Traefik/Nginx si configuras el dominio.

## 5. Mantenimiento y Migraciones

Si cambias el esquema de la base de datos (`prisma/schema.prisma`):

1.  Usa la terminal de Dokploy (Pestaña "Console" o "Terminal" de la aplicación).
2.  Ejecuta:
    ```bash
    npx prisma migrate deploy
    ```
    (O `prisma migrate deploy`, ya que instalamos prisma globalmente en el Dockerfile).

Esto actualizará la estructura de `prod.db` que reside en tu volumen persistente.
