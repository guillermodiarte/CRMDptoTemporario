#!/bin/sh
set -e

echo ">>> [ENTRYPOINT] Starting CRM App..."
echo ">>> [ENTRYPOINT] User: $(whoami)"
echo ">>> [ENTRYPOINT] PWD: $(pwd)"

# 1. Directory Checks
if [ ! -d "/app/database" ]; then
    echo ">>> [ENTRYPOINT] Creating /app/database directory..."
    mkdir -p /app/database
fi

# 2. Environment Checks
if [ -z "$AUTH_SECRET" ]; then
    echo ">>> [WARNING] AUTH_SECRET is missing!"
    echo ">>> [ENTRYPOINT] Generating temporary secret to prevent crash..."
    export AUTH_SECRET=$(openssl rand -base64 32)
else
    echo ">>> [ENTRYPOINT] AUTH_SECRET is set."
fi

if [ -z "$DATABASE_URL" ]; then
    echo ">>> [ERROR] DATABASE_URL is missing!"
    # We don't sleep here, we let it crash? No, better to sleep so user sees log.
    echo ">>> [DEBUG] Waiting 30s before exit to allow log capture..."
    sleep 30
    exit 1
fi

# 3. Database Migration (Safe Attempt)
# Since we have persistent volume, we might want to ensure structure exists.
# We'll try to push schema if DB file doesn't exist? 
# Or just rely on user manual command as per guide.
# Let's skip auto-migrate to prevent accidental overwrites or locks, stick to guide.

# 4. Start Application
echo ">>> [ENTRYPOINT] Launching server.js..."
exec node server.js
