# VPS Optimization Startup Script
# Minimizes memory usage and handles Standalone mode automatically.

# 1. Memory Optimization (Adjust based on VPS size)
# For 1GB VPS -> 512MB limit
export NODE_OPTIONS="--max-old-space-size=512"

# 2. Environment
export NODE_ENV=production
export PORT=3000
export HOSTNAME="0.0.0.0"
export AUTH_TRUST_HOST=true # Fix for NextAuth behind proxy/VPS

echo ">>> Starting CRM in Production Mode (VPS Optimized)..."
echo ">>> Memory Limit: 512MB"

# 3. Execution Strategy
if [ -f ".next/standalone/server.js" ]; then
    echo ">>> Found Standalone Build. Using efficient Node execution."
    
    # Critical: Copy static assets to standalone directory
    # Next.js does not include these by default in standalone output
    
    # 1. Copy Public folder
    if [ -d "public" ]; then
        cp -r public .next/standalone/public
    fi

    # 2. Copy Static folder
    if [ -d ".next/static" ]; then
        mkdir -p .next/standalone/.next/static
        cp -r .next/static .next/standalone/.next/static
    fi

    echo ">>> Static assets copied to standalone directory."
    
    # Run the standalone server
    # Important: Change directory to where server.js is located so it finds relative assets
    cd .next/standalone
    node server.js
else
    echo ">>> Standalone build not found. Falling back to 'next start'."
    # Note: 'next start' uses more memory than standalone 'node server.js'
    npm start
fi
