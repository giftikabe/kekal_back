#!/bin/bash

BASE="http://127.0.0.1:8787"

# ─── Login ────────────────────────────────────────────────────────────────────
echo "── LOGIN ──"
LOGIN=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"owner@kekalstudio.com\", \"password\": \"owner@pass.1\"}")
echo $LOGIN

TOKEN=$(echo $LOGIN | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
echo "Token: $TOKEN"

# ─── Public routes ────────────────────────────────────────────────────────────
echo -e "\n── PUBLIC: collections ──"
curl -s $BASE/collections | head -c 100

echo -e "\n── PUBLIC: no auth on admin (should 401) ──"
curl -s $BASE/admin/collections

# ─── Admin read routes ────────────────────────────────────────────────────────
echo -e "\n── ADMIN: collections ──"
curl -s $BASE/admin/collections -H "Authorization: Bearer $TOKEN" | head -c 100

echo -e "\n── ADMIN: brand-identity ──"
curl -s $BASE/admin/brand-identity -H "Authorization: Bearer $TOKEN" | head -c 100

echo -e "\n── ADMIN: users ──"
curl -s $BASE/admin/users -H "Authorization: Bearer $TOKEN" | head -c 100

# ─── Create user ──────────────────────────────────────────────────────────────
echo -e "\n── CREATE USER ──"
curl -s -X POST $BASE/admin/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
-d "{\"email\": \"editor2@kekalstudio.com\", \"password\": \"editor@pass.1\", \"name\": \"Test Editor\"}"

# ─── Change password ──────────────────────────────────────────────────────────
echo -e "\n── CHANGE PASSWORD ──"
curl -s -X PATCH $BASE/admin/users/me/password \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"currentPassword\": \"owner@pass.1\", \"newPassword\": \"owner@pass.2\"}"

# ─── Login with new password ──────────────────────────────────────────────────
echo -e "\n── LOGIN WITH NEW PASSWORD ──"
curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"owner@kekalstudio.com\", \"password\": \"owner@pass.2\"}"

# ─── Logout ───────────────────────────────────────────────────────────────────
echo -e "\n── LOGOUT ──"
REFRESH=$(echo $LOGIN | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4)
curl -s -X POST $BASE/auth/logout \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH\"}"

echo -e "\n── DONE ──"