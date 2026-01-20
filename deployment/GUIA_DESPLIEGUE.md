# Guía de Despliegue en VPS (Docker)

Esta guía detalla cómo desplegar la aplicación en un servidor VPS asegurando que la base de datos no se pierda entre actualizaciones.

## 1. Requisitos Previos en el VPS

Asegúrate de tener Docker y Docker Compose instalados en tu servidor.
```bash
# Ejemplo en Ubuntu
sudo apt-get update
sudo apt-get install docker.io docker-compose-v2
```

## 2. Estructura de Carpetas

En tu VPS, crea una carpeta para el proyecto (ej: `my-crm`).
Dentro de esa carpeta, necesitarás los siguientes archivos del repositorio:

- `deployment/docker-compose.yml` (Muévelo a la raíz de tu carpeta en el VPS o úsalo desde deployment, ajustando rutas).
- `.env` (Variables de entorno).
- La carpeta `crm_data` (Se creará sola, aquí vivirá la Base de Datos).

### Recomendación de Estructura en VPS:
```
/home/usuario/crm/
  ├── docker-compose.yml  (Copiado de deployment/docker-compose.yml)
  ├── .env                (Tus secretos)
  └── crm_data/           (Volumen persistente de BD)
```

**Nota:** Si usas el `docker-compose.yml` tal cual está en `deployment/`, asegúrate de ejecutarlo desde la raíz del proyecto si clonas todo el repo, o ajusta la ruta `run: build: context: .`.
*Si vas a clonar el repo entero en el VPS:*
1. Navega a `CRM Dpto temporario`.
2. Ejecuta docker compose indicando el archivo: `docker compose -f deployment/docker-compose.yml up -d`.

## 3. Configuración del Archivo .env

Crea un archivo `.env` en el mismo lugar donde ejecutes docker-compose:

```env
# Clave generada con: openssl rand -base64 32
AUTH_SECRET="tu_clave_super_secreta_aqui"

# URL interna para Prisma (apunta al volumen montado)
DATABASE_URL="file:/app/database/prod.db"
```

## 4. Base de Datos Externa (Persistencia)

Para que la base de datos NO se borre al actualizar, usamos un **Volumen** (`./crm_data` mapeado a `/app/database`).

### Primera Vez (Inicialización):
Si ya tienes datos en tu local (`prisma/dev.db`) y quieres subirlos:
1. Renombra tu `dev.db` a `prod.db`.
2. Súbelo al VPS a la carpeta `crm_data/` (ej: `/home/usuario/crm/crm_data/prod.db`).
   - Si la carpeta no existe, créala.

Si prefieres empezar de cero:
1. El sistema creará los archivos, pero necesitarás correr las migraciones (ver sección Mantenimiento).

## 5. Iniciar el Servidor

Desde la carpeta donde está tu `docker-compose.yml` (y teniendo el repo clonado si usas build local):

```bash
docker compose -f deployment/docker-compose.yml up -d --build
```
*El flag `--build` fuerza a reconstruir la imagen con los últimos cambios.*

## 6. Mantenimiento y Actualizaciones

### Actualizar Código (Git Pull)
Cada vez que hagas cambios en el código y quieras actualizar el VPS:

1. Baja los cambios:
   ```bash
   git pull origin main
   ```
2. Reconstruye y reinicia (La BD NO se borrará):
   ```bash
   docker compose -f deployment/docker-compose.yml up -d --build
   ```

### Actualizar Base de Datos (Migraciones)
Si cambiaste el esquema (`schema.prisma`), necesitas aplicar los cambios a la BD de producción:

1. Asegúrate que el contenedor está corriendo.
2. Ejecuta el comando de migración DENTRO del contenedor:
   ```bash
   docker compose -f deployment/docker-compose.yml exec app prisma migrate deploy
   ```
   *Esto aplicará los cambios pendientes a `prod.db` guardado en el volumen.*

## Resumen de Comandos Útiles

- **Ver logs:** `docker compose -f deployment/docker-compose.yml logs -f`
- **Reiniciar:** `docker compose -f deployment/docker-compose.yml restart`
- **Entrar a la consola:** `docker compose -f deployment/docker-compose.yml exec app sh`
