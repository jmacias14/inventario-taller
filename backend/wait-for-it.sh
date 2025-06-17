#!/usr/bin/env bash
# wait-for-it.sh

set -e

host=$(echo "$1" | cut -d: -f1)
port=$(echo "$1" | cut -d: -f2)
shift

echo "⌛ Esperando a que $host:$port esté disponible..."

while ! nc -z "$host" "$port"; do
  sleep 1
done

echo "✅ $host:$port disponible. Aplicando migraciones y arrancando servidor..."

npx prisma migrate deploy

echo "🚀 Migraciones aplicadas. Iniciando servidor..."
exec npm run start
