#!/bin/bash

# Load environment variables from .env file
# Usage: source load-env.sh

ENV_FILE=".env"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create .env file first"
    exit 1
fi

echo "📦 Loading environment variables from $ENV_FILE..."

# Load .env file
set -a
source "$ENV_FILE"
set +a

# Verify required variables
if [ -z "$CLOUDFLARE_API_TOKEN" ]; then
    echo "⚠️  Warning: CLOUDFLARE_API_TOKEN is not set!"
    echo "Please add your Cloudflare API token to .env file"
else
    echo "✅ CLOUDFLARE_API_TOKEN loaded"
fi

if [ -z "$JWT_SECRET" ]; then
    echo "⚠️  Warning: JWT_SECRET is not set!"
    echo "Generate one with: openssl rand -base64 32"
else
    echo "✅ JWT_SECRET loaded"
fi

# Optional variables
[ -n "$GOOGLE_CLIENT_ID" ] && echo "✅ GOOGLE_CLIENT_ID loaded" || echo "ℹ️  GOOGLE_CLIENT_ID not set (optional)"
[ -n "$GOOGLE_CLIENT_SECRET" ] && echo "✅ GOOGLE_CLIENT_SECRET loaded" || echo "ℹ️  GOOGLE_CLIENT_SECRET not set (optional)"
[ -n "$STREAM_ACCOUNT_ID" ] && echo "✅ STREAM_ACCOUNT_ID loaded" || echo "ℹ️  STREAM_ACCOUNT_ID not set (optional)"
[ -n "$STREAM_API_KEY" ] && echo "✅ STREAM_API_KEY loaded" || echo "ℹ️  STREAM_API_KEY not set (optional)"

echo ""
echo "🎉 Environment loaded! You can now run:"
echo "   npx wrangler whoami"
echo "   npx wrangler d1 create travel-db"
