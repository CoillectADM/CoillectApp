#!/usr/bin/env sh
# wait-for-it.sh -- waits for PostgreSQL container to be ready (db:5432)

set -e

usage() {
  echo "Usage: $0 host:port [-- command args...]"
  exit 1
}

[ $# -ge 1 ] || usage

HOSTPORT=$1
shift

HOST=$(printf "%s" "$HOSTPORT" | cut -d: -f1)
PORT=$(printf "%s" "$HOSTPORT" | cut -d: -f2)
TIMEOUT=${TIMEOUT:-30}

echo "Waiting for $HOST:$PORT (timeout: ${TIMEOUT}s)..."

for i in $(seq "$TIMEOUT"); do
  if nc -z "$HOST" "$PORT" 2>/dev/null; then
    echo "$HOST:$PORT is up!"
    exec "$@"
    exit 0
  fi
  sleep 1
done

echo "Timeout reached: $HOST:$PORT still not reachable." >&2
exit 1
