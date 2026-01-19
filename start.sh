# VPS Optimization Startup Script
# Minimizes memory usage and handles Standalone mode automatically.

# 1. Memory Optimization (Adjust based on VPS size)
# For 1GB VPS -> 512MB limit
export NODE_OPTIONS="--max-old-space-size=512"

# 2. Environment
export NODE_ENV=production
export PORT=3000
export HOSTNAME="0.0.0.0"

# Explicitly trust proxy for NextAuth
export AUTH_TRUST_HOST=true

# Debug Helper
log() {
    echo "[start.sh] $1"
}

log "Starting CRM in Production Mode..."
log "User: $(whoami)"
log "PWD: $(pwd)"

# Debug Persistence
log "Checking DATABASE_URL: $DATABASE_URL"
if [ -n "$DATABASE_URL" ]; then
    # Extract path assuming file: prefix
    DB_PATH=$(echo "$DATABASE_URL" | sed 's/file://')
    DB_DIR=$(dirname "$DB_PATH")
    
    log "Database Directory: $DB_DIR"
    if [ -d "$DB_DIR" ]; then
        log "Directory exists. Permissions:"
        ls -ld "$DB_DIR"
        
        # Test write permission
        if touch "$DB_DIR/.write_test" 2>/dev/null; then
            log "SUCCESS: Directory is writable."
            rm "$DB_DIR/.write_test"
        else
            log "ERROR: Directory is NOT writable."
            log "Attempting to fix permissions (chmod 777)..."
            chmod 777 "$DB_DIR" 2>/dev/null || log "Failed to chmod $DB_DIR"
        fi
    else
        log "Warning: Database directory $DB_DIR does not exist."
    fi
fi

# Critical: Load Environment Variables from file if present
if [ -f .env ]; then
  log "Loading configuration from .env..."
  export $(cat .env | xargs)
fi

if [ -f .env.production ]; then
  log "Loading configuration from .env.production..."
  export $(cat .env.production | xargs)
fi

# Ensure Secret Consistency
if [ -z "$AUTH_SECRET" ] && [ -z "$NEXTAUTH_SECRET" ]; then
  log "WARNING: neither AUTH_SECRET nor NEXTAUTH_SECRET is set."
  log "Generating a TEMPORARY random secret. Sessions will be invalidated on restart."
  export AUTH_SECRET=$(openssl rand -base64 32)
  # Keep legacy compatibility just in case
  export NEXTAUTH_SECRET=$AUTH_SECRET
else
  log "Secret is set. Sessions will persist."
  if [ -n "$AUTH_SECRET" ] && [ -z "$NEXTAUTH_SECRET" ]; then
     export NEXTAUTH_SECRET=$AUTH_SECRET
  fi
fi

log "Listing .next directory:"
ls -F .next || echo ".next not found"

# 3. Execution Strategy
if [ -f ".next/standalone/server.js" ]; then
    log "Found Standalone Build. Using efficient Node execution."
    
    log "Copying static assets..."
    # 1. Copy Public folder
    if [ -d "public" ]; then
        cp -r public .next/standalone/public
        log "Copied public -> .next/standalone/public"
    else
        log "WARNING: public directory not found"
    fi

    # 2. Copy Static folder
    if [ -d ".next/static" ]; then
        mkdir -p .next/standalone/.next/static
        cp -r .next/static/* .next/standalone/.next/static/
        log "Copied .next/static -> .next/standalone/.next/static"
    else
        log "WARNING: .next/static directory not found"
    fi
    
    # 3. Copy Prisma folder (Schema)
    if [ -d "prisma" ]; then
        cp -r prisma .next/standalone/prisma
        log "Copied prisma -> .next/standalone/prisma"
    fi

    # 4. Copy Scripts folder (Seeding)
    if [ -d "scripts" ]; then
        cp -r scripts .next/standalone/scripts
        log "Copied scripts -> .next/standalone/scripts"
    fi
    
    # Run the standalone server
    log "Entering standalone directory..."
    cd .next/standalone
    
    log "Generating Prisma Client..."
    # Ensure the client is generated for the current platform (Linux)
    npx prisma generate || log "WARNING: Prisma generate failed. specific binaries might be missing."

    log "Applying Database Migrations..."
    # Capture db push output and log it. Do not exit on fail, but verify.
    if npx prisma db push --accept-data-loss; then
        log "Migrations successful."
    else
        log "ERROR: Prisma db push failed. Likely permission issues."
        log "Sleeping 60s to allow log inspection..."
        sleep 60
    fi
    
    log "Seeding Admin User..."
    if [ -f "scripts/seed-admin.js" ]; then
        node scripts/seed-admin.js || log "Seeding failed."
    else
        log "WARNING: Seed script not found."
    fi
    
    log "Starting Server..."
    exec node server.js
else
    log "Standalone build not found. Falling back to 'next start'."
    npm start
fi
