# Guía de Despliegue Definitiva en Dokploy (Probada)

Esta guía documenta la configuración exacta que logró estabilizar la aplicación, asegurando persistencia de datos (base de datos eterna) sin errores de permisos ni caídas.

## ✅ Configuración Ganadora (Método Recomendado)
Usa esta configuración para tener un sistema rápido y con base de datos persistente.

### 1. General (Build Settings)
- **Build Type (Provider):** `Nixpacks`
  *(El sistema automático de Dokploy)*.
- **Base Directory:** `/` (Raíz).

### 2. Variables de Entorno (Environment)
Asegúrate de tener estas variables:

```env
# Ruta interna donde la app guardará los datos
DATABASE_URL="file:/app/database/prod.db"

# Clave de seguridad (importante para que no se cierren las sesiones)
AUTH_SECRET="tu_clave_secreta_larga_aqui"

# Necesario para logins tras proxy (Dokploy)
AUTH_TRUST_HOST=true
```

### 3. Persistencia (Volúmenes) - ¡La Clave!
Para evitar errores de permisos ("No such container") y que la base de datos no se borre, usaremos **Volúmenes Nombrados** (Docker gestiona los permisos por nosotros).

Ve a la pestaña **Volumes** y agrega:

| Configuración | Valor | Nota |
| :--- | :--- | :--- |
| **Mount Type** | `VOLUME` | **Importante**: NO usar "BIND". Usar "VOLUME". |
| **Name (Host Path)** | `crm_data` | Solo el nombre. Sin barras `/` al inicio. |
| **Mount Path** | `/app/database` | Debe coincidir con la ruta de tu `DATABASE_URL`. |

---

## 🚀 Optimizaciones Aplicadas
El código actual incluye una optimización crítica en `start.sh`:
- **Salto de `prisma generate`**: Se desactivó la regeneración de Prisma al arrancar. Esto evita que la aplicación consuma toda la memoria y crashee (`SIGTERM`) durante el inicio. La aplicación arranca usando los archivos generados durante la construcción (Build).

---

## Solución de Problemas (Troubleshooting)

### Error: "No such container" (Crash al inicio)
- **Causa probable:** Permisos incorrectos en el volumen o falta de memoria.
- **Solución:**
  1. Verifica que estés usando **Mount Type: VOLUME** y no BIND.
  2. Si usas BIND, el usuario del servidor (host) debe tener permisos 777 en la carpeta.

### La base de datos se borra al actualizar
- **Causa:** No hay volumen configurado o la `DATABASE_URL` no apunta a la carpeta del volumen.
- **Verificación:** Asegúrate que `DATABASE_URL` empiece por `file:/app/database/...` y que el volumen esté montado en `/app/database`.

---

## 🔒 Dominio y SSL (HTTPS)
Dokploy maneja los certificados SSL automáticamente (usando Traefik y Let's Encrypt). No necesitas instalar nada en tu código.

1. **DNS**: Asegúrate de que tu dominio (ej: `app.midominio.com`) apunte a la IP de tu servidor VPS.
2. **Dokploy UI**:
   - Ve a la pestaña **Domains** de tu aplicación.
   - Escribe tu dominio (ej: `app.midominio.com`).
   - Asegúrate de que el puerto sea `3000` (el puerto interno de nuestra App).
   - Haz click en "Add Domain" (o Save).
   - **Activa "Enable HTTPS"** (generalmente es automático, pero verifícalo).
3. **Certificado Automático**:
   - Dokploy detectará el dominio y generará el certificado SSL automáticamente en unos segundos.
   - Ya podrás entrar por `https://app.midominio.com`.

**Nota Importante:** Nuestra configuración ya incluye `AUTH_TRUST_HOST=true`, lo cual es vital para que NextAuth entienda que está seguro detrás del HTTPS de Dokploy y no falle el login.
