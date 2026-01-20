# Guía de Despliegue en Dokploy

Esta guía documenta cómo desplegar la aplicación CRM en Dokploy, basándonos en la configuración que funcionó correctamente.

## Opción 1: Despliegue Rápido (Nixpacks)
Esta opción es la más sencilla y usa la configuración automática de Dokploy. Funciona inmediatamente, pero **NO tiene persistencia garantizada** (si se reinicia el contenedor, podrías perder datos si no configuras volúmenes con cuidado).

### 1. Configuración General
- **Build Type (Provider):** `Nixpacks`
- **Base Directory:** `/` (Raíz)
- **Install Command:** (Vacío / Default)
- **Start Command:** (Vacío / Default)

### 2. Variables de Entorno (Environment)
Agrega estas variables en la pestaña **Environment**:

```env
DATABASE_URL="file:/app/database/prod.db"
AUTH_SECRET="tu_clave_secreta_aqui"
AUTH_TRUST_HOST=true
```

## Opción 2: Despliegue Robusto (Docker) - Recomendada
Esta opción usa un `Dockerfile` personalizado que hemos blindado para evitar errores de permisos y caídas. Es la mejor opción si quieres conectar un **Volumen** para que la base de datos sea eterna.

### 1. Archivos Necesarios
Asegúrate de que la carpeta `deployment/` contenga el archivo `Dockerfile`.

### 2. Configuración General
- **Build Type (Provider):** `Docker`
- **Dockerfile Path:** `./deployment/Dockerfile`
- **Context Path:** `/` (o `.`)

### 3. Persistencia (Volúmenes)
Para que la base de datos NO se borre al actualizar, debes conectar un volumen.

**¡ADVERTENCIA CRÍTICA!**: Si agregas un volumen y la app crashea ("No such container"), es por **permisos**.
**Solución:**
1. Crea la carpeta en tu servidor (ej: `/etc/dokploy/crm_data`).
2. Dale permisos totales (solo una vez):
   ```bash
   chmod 777 /etc/dokploy/crm_data
   ```
3. Ahora sí, configura el volumen en Dokploy:
   - **Host Path:** `/etc/dokploy/crm_data`
   - **Container Path:** `/app/database`

### Resumen de Solución de Problemas
- **Error "No such container"**: Significa que la app murió al iniciar. Generalmente es porque no puede escribir en la DB.
  - *Solución Rápida:* Borra el Volumen y haz Redeploy.
  - *Solución Real:* Arregla los permisos de la carpeta del servidor (chmod 777).
