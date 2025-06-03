#!/usr/bin/env sh
# wait-for-it.sh -- waits until a TCP host:port are accepting connections
# Simplified version of the original from https://github.com/vishnubob/wait-for-it (MIT License)

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

printf "Waiting for %s:%s (timeout: %ss)...\n" "$HOST" "$PORT" "$TIMEOUT"

for i in $(seq "$TIMEOUT"); do
  if nc -z "$HOST" "$PORT" 2>/dev/null; then
    echo "Host $HOST:$PORT is up!"
    exec "$@"
    exit 0
  fi
  sleep 1
done

echo "Timeout reached: $HOST:$PORT still not reachable." >&2
exit 1
