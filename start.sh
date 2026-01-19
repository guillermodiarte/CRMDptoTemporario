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
export NEXTAUTH_URL="http://0.0.0.0:3000" # Fallback internal URL

# Critical: Generate a secret if not provided (prevents crash on first run)
if [ -z "$NEXTAUTH_SECRET" ]; then
  echo ">>> WARNING: NEXTAUTH_SECRET not set. Generating a temporary random secret..."
  export NEXTAUTH_SECRET=$(openssl rand -base64 32)
  echo ">>> Generated temporary secret (Sessions will reset on restart). Please set NEXTAUTH_SECRET in your VPS settings for persistence."
else
  echo ">>> NEXTAUTH_SECRET is set."
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
    
    # Run the standalone server
    echo ">>> Entering standalone directory..."
    cd .next/standalone
    
    echo ">>> Starting Server..."
    exec node server.js
else
    echo ">>> Standalone build not found. Falling back to 'next start'."
    # Note: 'next start' uses more memory than standalone 'node server.js'
    npm start
fi
