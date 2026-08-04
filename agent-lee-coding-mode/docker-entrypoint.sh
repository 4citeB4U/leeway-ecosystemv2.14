#!/bin/sh
set -e

# Create symlink so absolute imports to '/Leeway Runtime Fabric' resolve
if [ -d "/leeway/Leeway Runtime Fabric" ]; then
  if [ ! -L "/Leeway Runtime Fabric" ]; then
    rm -rf "/Leeway Runtime Fabric" 2>/dev/null || true
    ln -s "/leeway/Leeway Runtime Fabric" "/Leeway Runtime Fabric" || true
  fi
fi

# Configuration
OLLAMA_HOST=${OLLAMA_HOST:-http://ollama:11434}
RUNTIME_HOST=${LEEWAY_MANAGEMENT_API_HOST:-http://runtime-fabric:4001}
# Default warm models only when variable is UNSET. If the user sets
# WARM_MODELS to an empty string in compose, treat that as an explicit
# request to skip warming (useful for faster startup during debug).
if [ -z "${WARM_MODELS+x}" ]; then
  WARM_MODELS="qwen3,qwen2.5-coder"
fi

echo "Waiting for Ollama at $OLLAMA_HOST..."
until curl -fsS "$OLLAMA_HOST/api/tags" >/dev/null 2>&1; do
  echo "  Ollama not ready yet. Retrying in 1s..."
  sleep 1
done
echo "Ollama is reachable. Warming models: $WARM_MODELS"
for m in $(echo $WARM_MODELS | tr ',' ' '); do
  echo "  Warming $m"
  curl -sS -X POST -H "Content-Type: application/json" -d "{\"model\":\"$m\",\"prompt\":\"warm\",\"max_tokens\":1}" "$OLLAMA_HOST/api/generate" >/dev/null 2>&1 || true
done

echo "Waiting for Runtime Fabric at $RUNTIME_HOST..."
until curl -fsS "$RUNTIME_HOST/runtime/health" >/dev/null 2>&1; do
  echo "  Runtime Fabric not ready yet. Retrying in 1s..."
  sleep 1
done

echo "All dependencies ready — starting Agent Lee router"
exec node router/server-brainfix.mjs
