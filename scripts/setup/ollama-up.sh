#!/usr/bin/env sh
# Starts the Ollama service with the best acceleration this machine offers.
#   sh scripts/setup/ollama-up.sh            auto-detect (NVIDIA -> AMD -> CPU)
#   OLLAMA_ACCEL=cpu|nvidia|amd sh ...       force a mode
# Apple Silicon / Intel GPUs cannot be used from Docker: run Ollama on the host instead.
set -eu
cd "$(dirname "$0")/../.."

accel="${OLLAMA_ACCEL:-}"
if [ -z "$accel" ]; then
  if command -v nvidia-smi >/dev/null 2>&1 && nvidia-smi -L >/dev/null 2>&1 \
     && docker info --format '{{json .Runtimes}}' 2>/dev/null | grep -q nvidia; then
    accel=nvidia
  elif [ -e /dev/kfd ] && [ -e /dev/dri ]; then
    accel=amd
  else
    accel=cpu
  fi
fi

case "$accel" in
  nvidia) files="-f docker-compose.yml -f docker-compose.ai.yml -f docker-compose.nvidia.yml" ;;
  amd)    files="-f docker-compose.yml -f docker-compose.ai.yml -f docker-compose.amd.yml" ;;
  cpu)    files="-f docker-compose.yml -f docker-compose.ai.yml" ;;
  *) echo "Unknown OLLAMA_ACCEL '$accel' (use cpu, nvidia or amd)" >&2; exit 2 ;;
esac

echo "Ollama acceleration: $accel"
# shellcheck disable=SC2086
docker compose $files up -d
