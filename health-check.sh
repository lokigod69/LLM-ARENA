#!/bin/bash
# Health check script for post-deployment verification
# Usage: ./health-check.sh https://your-vercel-domain.com

DOMAIN=$1

if [ -z "$DOMAIN" ]; then
    echo "Usage: ./health-check.sh https://your-vercel-domain.com"
    exit 1
fi

echo "🔍 Running health checks on $DOMAIN..."

# Test 1: Admin login
echo "1. Testing admin login..."
ADMIN_RESPONSE=$(curl -s -X POST "$DOMAIN/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"code":"6969"}')

if echo "$ADMIN_RESPONSE" | grep -q '"mode":"admin"'; then
    echo "✅ Admin login works"
else
    echo "❌ Admin login failed: $ADMIN_RESPONSE"
fi

# Test 2: Token generation
echo "2. Testing token generation..."
TOKEN_RESPONSE=$(curl -s -X POST "$DOMAIN/api/admin/generate-codes" \
  -H "Content-Type: application/json" \
  -d '{"adminCode":"6969","count":1,"queries":3}')

if echo "$TOKEN_RESPONSE" | grep -q '"codes"'; then
    echo "✅ Token generation works"
    # Extract token for next test
    TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"test-[^"]*"' | head -1 | tr -d '"')
    echo "   Generated token: $TOKEN"
else
    echo "❌ Token generation failed: $TOKEN_RESPONSE"
fi

# Test 3: Token login (if we got a token)
if [ ! -z "$TOKEN" ]; then
    echo "3. Testing token login..."
    TOKEN_LOGIN_RESPONSE=$(curl -s -X POST "$DOMAIN/api/auth/login" \
      -H "Content-Type: application/json" \
      -d "{\"code\":\"$TOKEN\"}")
    
    if echo "$TOKEN_LOGIN_RESPONSE" | grep -q '"mode":"token"'; then
        echo "✅ Token login works"
    else
        echo "❌ Token login failed: $TOKEN_LOGIN_RESPONSE"
    fi
fi

# Test 4: Logout
echo "4. Testing logout..."
LOGOUT_RESPONSE=$(curl -s -X POST "$DOMAIN/api/auth/logout")

if echo "$LOGOUT_RESPONSE" | grep -q '"ok":true'; then
    echo "✅ Logout works"
else
    echo "❌ Logout failed: $LOGOUT_RESPONSE"
fi

echo "🏁 Health check complete!"
