#!/usr/bin/env bash
# ============================================================
# Conferência Relevante 2026 — Contador de downloads do PDF
# ------------------------------------------------------------
# Conta quantas vezes o resumo em PDF foi baixado, lendo o log
# dedicado que o nginx grava em /var/log/nginx/downloads.log
# (configurado em nginx/default.conf).
#
# USO:
#   ./contar-downloads.sh                      # container padrão "conferencia"
#   ./contar-downloads.sh NOME_DO_CONTAINER    # outro nome/ID de container
#   ./contar-downloads.sh --file caminho.log   # ler um arquivo de log local
#
# Cada download concluído (HTTP 200) conta como 1.
# ============================================================
set -euo pipefail

CONTAINER="conferencia"
LOGFILE="/var/log/nginx/downloads.log"
LOCAL_FILE=""

# ---- argumentos ----
if [[ "${1:-}" == "--file" ]]; then
  LOCAL_FILE="${2:-}"
  [[ -z "$LOCAL_FILE" ]] && { echo "Informe o caminho do arquivo após --file"; exit 1; }
elif [[ -n "${1:-}" ]]; then
  CONTAINER="$1"
fi

# ---- obtém o conteúdo do log ----
get_log() {
  if [[ -n "$LOCAL_FILE" ]]; then
    cat "$LOCAL_FILE"
  elif command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
    # lê o log de dentro do container
    docker exec "$CONTAINER" sh -c "cat $LOGFILE 2>/dev/null" || true
  elif [[ -f "$LOGFILE" ]]; then
    cat "$LOGFILE"
  else
    echo "__NO_LOG__"
  fi
}

LOG="$(get_log)"

if [[ "$LOG" == "__NO_LOG__" ]]; then
  echo "⚠  Não encontrei o log de downloads."
  echo "   Verifique se o container \"$CONTAINER\" está rodando (docker ps)"
  echo "   ou rode:  ./contar-downloads.sh --file /caminho/para/downloads.log"
  exit 1
fi

if [[ -z "${LOG//[$'\n\t ']/}" ]]; then
  echo "Nenhum download registrado ainda. 🟡"
  exit 0
fi

# ---- métricas ----
# status HTTP fica logo após a requisição entre aspas: "...GET ... HTTP/1.1" 200 ...
TOTAL_200=$(printf '%s\n' "$LOG" | grep -c '" 200 ' || true)
TOTAL_HITS=$(printf '%s\n' "$LOG" | grep -cE '" (200|206) ' || true)
UNIQUE_IPS=$(printf '%s\n' "$LOG" | awk '{print $1}' | sort -u | grep -c . || true)

echo "============================================="
echo "  DOWNLOADS — Resumo Conferência 2026"
echo "============================================="
echo "  Downloads concluídos (HTTP 200): $TOTAL_200"
echo "  Visitantes únicos (IPs):         $UNIQUE_IPS"
echo "  Total de requisições (200+206):  $TOTAL_HITS"
echo "---------------------------------------------"
echo "  Downloads por dia:"
printf '%s\n' "$LOG" \
  | grep '" 200 ' \
  | sed -E 's/.*\[([0-9]{2})\/([A-Za-z]{3})\/([0-9]{4}):.*/\3-\2-\1/' \
  | sort | uniq -c \
  | awk '{printf "    %s : %s\n", $2, $1}'
echo "============================================="
