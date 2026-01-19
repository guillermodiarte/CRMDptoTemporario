#!/bin/bash

# VPS Optimization Startup Script
# Minimizes memory usage and handles Standalone mode automatically.

# 1. Memory Optimization (Adjust based on VPS size)
# For 1GB VPS -> 512MB limit
# For 512MB VPS -> 256MB limit
export NODE_OPTIONS="--max-old-space-size=512"

# 2. Environment
export NODE_ENV=production
export PORT=3000
export HOSTNAME="0.0.0.0"

echo ">>> Starting CRM in Production Mode (VPS Optimized)..."
echo ">>> Memory Limit: 512MB"

# 3. Execution Strategy
if [ -f ".next/standalone/server.js" ]; then
    echo ">>> Found Standalone Build. Using efficient Node execution."
    # Copy public and static files if not linked (Standalone quirk requiring static file copy typically done in Dockerfile but useful here)
    # Usually 'server.js' expects specific structure. 
    # Just running it is often enough if deploy structure is correct.
    
    node .next/standalone/server.js
else
    echo ">>> Standalone build not found. Falling back to 'next start'."
    # Note: 'next start' uses more memory than standalone 'node server.js'
    npm start
fi
