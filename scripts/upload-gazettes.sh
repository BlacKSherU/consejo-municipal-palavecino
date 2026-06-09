#!/usr/bin/env bash
# Sube los PDFs de apps/web/public/Fwd_/ al panel admin como gacetas.
# Uso:
#   ./scripts/upload-gazettes.sh
#
# Variables (opcional):
#   API_URL    URL del Worker (default: producción alcaldía)
#   EMAIL      admin (default: admin@demo.cmp.test)
#   PASSWORD   clave admin (default: admin)
#   FOLDER     carpeta con los PDFs (default: apps/web/public/Fwd_)

set -euo pipefail

API_URL="${API_URL:-https://cmp-api.informatica-cmbp.workers.dev}"
EMAIL="${EMAIL:-admin@demo.cmp.test}"
PASSWORD="${PASSWORD:-admin}"
FOLDER="${FOLDER:-apps/web/public/Fwd_}"
TODAY=$(date +%Y-%m-%d)

if [ ! -d "$FOLDER" ]; then
  echo "❌ Carpeta no encontrada: $FOLDER" >&2
  exit 1
fi

echo "▶ Login en $API_URL …"
LOGIN_RESPONSE=$(curl -sS -X POST \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" \
  "$API_URL/api/auth/login")

TOKEN=$(printf '%s' "$LOGIN_RESPONSE" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

if [ -z "$TOKEN" ]; then
  echo "❌ No se pudo obtener token. Respuesta:" >&2
  echo "$LOGIN_RESPONSE" >&2
  exit 1
fi
echo "✅ Token obtenido."

OK=0
FAIL=0
shopt -s nullglob
for f in "$FOLDER"/*.pdf "$FOLDER"/*.PDF; do
  filename=$(basename "$f")
  # Título: nombre del archivo sin .pdf
  title="${filename%.[pP][dD][fF]}"
  size=$(wc -c < "$f" | tr -d ' ')

  printf "→ Subiendo (%s bytes): %s\n" "$size" "$filename"
  HTTP=$(curl -sS -o /tmp/upload-gazette.out -w "%{http_code}" \
    -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -F "title=$title" \
    -F "published_at=$TODAY" \
    -F "file=@$f;type=application/pdf" \
    "$API_URL/api/admin/gazettes")

  if [ "$HTTP" = "200" ]; then
    echo "   ✅ OK"
    OK=$((OK + 1))
  else
    echo "   ❌ HTTP $HTTP — $(cat /tmp/upload-gazette.out)"
    FAIL=$((FAIL + 1))
  fi
done
shopt -u nullglob

echo
echo "═══════════════════════════════"
echo "✅ Subidas correctas: $OK"
echo "❌ Fallidas:          $FAIL"
echo "═══════════════════════════════"
