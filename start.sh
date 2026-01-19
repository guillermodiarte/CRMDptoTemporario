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

# Critical: Generate a secret if not provided (prevents crash on first run)
if [ -z "$NEXTAUTH_SECRET" ]; then
  echo ">>> WARNING: NEXTAUTH_SECRET not set. Generating a temporary random secret..."
  export NEXTAUTH_SECRET=$(openssl rand -base64 32)
  echo ">>> Generated temporary secret (Sessions will reset on restart). Please set NEXTAUTH_SECRET in your VPS settings for persistence."
else
fi

# Critical: Check for Persistence
if [[ "$DATABASE_URL" == *"dummy.db"* ]]; then
  echo ">>> [WARNING] DATABASE_URL is pointing to 'dummy.db'."
  echo ">>> [WARNING] DATA WILL BE LOST on redeployment."
  echo ">>> [ACTION REQUIRED] Please configure a Volume in Dokploy and set DATABASE_URL to a persistent path (e.g., file:/etc/dokploy/data/prod.db)."
else
   echo ">>> DATABASE_URL check: Seems configured."
fi

echo ">>> Starting CRM in Production Mode (VPS Optimized)..."
echo ">>> PWD: $(pwd)"
echo ">>> Listing .next directory:"
ls -F .next || echo ".next not found"

# 3. Execution Strategy
if [ -f ".next/standalone/server.js" ]; then
    echo ">>> Found Standalone Build. Using efficient Node execution."
    
    echo ">>> Copying static assets..."
    # 1. Copy Public folder
    if [ -d "public" ]; then
        cp -r public .next/standalone/public
        echo ">>> Copied public -> .next/standalone/public"
    else
        echo ">>> WARNING: public directory not found"
    fi

    # 2. Copy Static folder
    if [ -d ".next/static" ]; then
        mkdir -p .next/standalone/.next/static
        cp -r .next/static/* .next/standalone/.next/static/
        echo ">>> Copied .next/static -> .next/standalone/.next/static"
    else
        echo ">>> WARNING: .next/static directory not found"
    fi
    
    # 3. Copy Prisma folder (Schema)
    if [ -d "prisma" ]; then
        cp -r prisma .next/standalone/prisma
        echo ">>> Copied prisma -> .next/standalone/prisma"
    fi

    # 4. Copy Scripts folder (Seeding)
    if [ -d "scripts" ]; then
        cp -r scripts .next/standalone/scripts
        echo ">>> Copied scripts -> .next/standalone/scripts"
    fi
    
    # Run the standalone server
    echo ">>> Entering standalone directory..."
    cd .next/standalone
    
    echo ">>> Applying Database Migrations..."
    # We use 'npx prisma db push' because it's robust for SQLite and creates the file if missing.
    # It works with the schema copied to ./prisma/schema.prisma
    npx prisma db push --accept-data-loss
    
    echo ">>> Seeding Admin User..."
    if [ -f "scripts/seed-admin.js" ]; then
        node scripts/seed-admin.js
    else
        echo ">>> WARNING: Seed script not found."
    fi
    
    echo ">>> Starting Server..."
    exec node server.js
else
    echo ">>> Standalone build not found. Falling back to 'next start'."
    # Note: 'next start' uses more memory than standalone 'node server.js'
    npm start
fi
