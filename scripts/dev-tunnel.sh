#!/bin/bash
# 로컬 개발 서버를 Cloudflare 고정 주소로 노출한다.
#
#   ./scripts/dev-tunnel.sh          이미 떠 있는 서버를 그대로 쓰고 터널만 연결
#   ./scripts/dev-tunnel.sh --start  꺼져 있는 서버(백엔드/프론트)도 함께 띄운다
#
# emoselfie-INFRA 의 도커 스택(nginx :8080)이 떠 있으면 그쪽을 노출한다. 없으면
# 네이티브 개발 구성(vite :5173 + uvicorn :8000)을 쓴다.
#
# 이 스크립트가 직접 띄운 프로세스만 Ctrl+C 때 정리한다. 사용자가 따로 띄워 둔
# 서버는 건드리지 않는다.
set -e

FE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKSPACE_DIR="$(cd "$FE_DIR/.." && pwd)"
BE_DIR="$WORKSPACE_DIR/emoselfie-BE"
REDIRECT_DIR="$WORKSPACE_DIR/emoselfie-redirect"

BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
DOCKER_PORT="${DOCKER_PORT:-8080}"
WORKER_URL="${WORKER_URL:-https://emoselfie-redirect.emoselfie.workers.dev}"

TUNNEL_LOG=/tmp/emoselfie-cloudflared.log
BACKEND_LOG=/tmp/emoselfie-backend.log
FRONTEND_LOG=/tmp/emoselfie-frontend.log

START_SERVERS=false
[ "$1" = "--start" ] && START_SERVERS=true

BACKEND_PID=""
FRONTEND_PID=""
TUNNEL_PID=""

cleanup() {
  echo ""
  echo "정리 중..."
  # 이 스크립트가 띄운 것만 내린다.
  for pid in "$TUNNEL_PID" "$FRONTEND_PID" "$BACKEND_PID"; do
    [ -n "$pid" ] && kill "$pid" 2>/dev/null || true
  done
  echo "종료했습니다."
}
trap cleanup EXIT INT TERM

listening() { lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }

wait_for_port() {
  local port="$1" label="$2" pid="$3"
  for _ in $(seq 1 40); do
    listening "$port" && { echo "      $label 준비됨 (:$port)"; return 0; }
    if [ -n "$pid" ] && ! kill -0 "$pid" 2>/dev/null; then
      echo "ERROR: $label 이 예기치 않게 종료됐습니다."
      return 1
    fi
    sleep 1
  done
  echo "ERROR: $label 이 :$port 에서 응답하지 않습니다."
  return 1
}

command -v cloudflared >/dev/null 2>&1 || { echo "ERROR: cloudflared 가 설치돼 있지 않습니다 (brew install cloudflared)."; exit 1; }

echo ""
echo "=========================================="
echo " emoselfie 개발 환경 공개"
echo "=========================================="

# 도커 스택은 nginx 하나가 정적 자산과 /api 를 같은 오리진으로 서빙한다.
DOCKER_MODE=false
listening "$DOCKER_PORT" && DOCKER_MODE=true

# ------------------------------------------------------------
# 1. 백엔드
# ------------------------------------------------------------
echo ""
if $DOCKER_MODE; then
  echo "[1/4] 도커 스택 :$DOCKER_PORT (emoselfie-INFRA)"
  echo "      nginx 가 정적 자산과 API 를 같은 오리진으로 서빙합니다."
  HEALTH_URL="http://localhost:$DOCKER_PORT/health/ready"
  TARGET_PORT="$DOCKER_PORT"
else
  HEALTH_URL="http://localhost:$BACKEND_PORT/health/ready"
  TARGET_PORT="$FRONTEND_PORT"
fi

if ! $DOCKER_MODE; then
echo "[1/4] 백엔드 :$BACKEND_PORT"
if listening "$BACKEND_PORT"; then
  echo "      이미 떠 있어서 그대로 씁니다."
else
  if [ "$START_SERVERS" != true ]; then
    echo "ERROR: 백엔드가 꺼져 있습니다. --start 로 함께 띄우거나 직접 실행해 주세요."
    exit 1
  fi
  ( cd "$BE_DIR" && .venv/bin/uvicorn app.main:create_app --factory \
      --host 127.0.0.1 --port "$BACKEND_PORT" --reload > "$BACKEND_LOG" 2>&1 ) &
  BACKEND_PID=$!
  wait_for_port "$BACKEND_PORT" "백엔드" "$BACKEND_PID" || { cat "$BACKEND_LOG"; exit 1; }
fi
fi
# 추론 엔진이 fake 면 모든 점수가 0 또는 100 이 된다. 조용히 넘어가지 않는다.
BACKEND_MODE="$(curl -sS "$HEALTH_URL" 2>/dev/null || true)"
case "$BACKEND_MODE" in
  *'"inferenceBackend":"real"'*) echo "      추론 엔진: real" ;;
  *'"inferenceBackend":"fake"'*) echo "      주의: 추론 엔진이 fake 입니다. 점수가 0 또는 100 으로만 나옵니다." ;;
  *) echo "      주의: /health/ready 를 읽지 못했습니다." ;;
esac

# ------------------------------------------------------------
# 2. 프론트엔드
# ------------------------------------------------------------
if ! $DOCKER_MODE; then
echo ""
echo "[2/4] 프론트엔드 :$FRONTEND_PORT"
if listening "$FRONTEND_PORT"; then
  echo "      이미 떠 있어서 그대로 씁니다."
else
  if [ "$START_SERVERS" != true ]; then
    echo "ERROR: 프론트엔드가 꺼져 있습니다. --start 로 함께 띄우거나 직접 실행해 주세요."
    exit 1
  fi
  ( cd "$FE_DIR" && pnpm dev --port "$FRONTEND_PORT" --strictPort > "$FRONTEND_LOG" 2>&1 ) &
  FRONTEND_PID=$!
  wait_for_port "$FRONTEND_PORT" "프론트엔드" "$FRONTEND_PID" || { cat "$FRONTEND_LOG"; exit 1; }
fi
fi

# ------------------------------------------------------------
# 3. Quick Tunnel
# ------------------------------------------------------------
echo ""
echo "[3/4] Cloudflare Quick Tunnel"
: > "$TUNNEL_LOG"
cloudflared tunnel --url "http://localhost:$TARGET_PORT" > "$TUNNEL_LOG" 2>&1 &
TUNNEL_PID=$!

TUNNEL_URL=""
for _ in $(seq 1 60); do
  TUNNEL_URL="$(grep -oE 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com' "$TUNNEL_LOG" | head -1 || true)"
  [ -n "$TUNNEL_URL" ] && break
  kill -0 "$TUNNEL_PID" 2>/dev/null || { echo "ERROR: cloudflared 가 종료됐습니다."; cat "$TUNNEL_LOG"; exit 1; }
  sleep 1
done
[ -n "$TUNNEL_URL" ] || { echo "ERROR: 터널 주소를 찾지 못했습니다."; cat "$TUNNEL_LOG"; exit 1; }
echo "      $TUNNEL_URL"

# 연결 등록은 로그로 확인한다. 호스트명이 게시되기 전에 DNS 를 두드리면 이 머신에
# NXDOMAIN 네거티브 캐시가 남아, 정작 터널이 살아난 뒤에도 로컬에서만 안 열린다.
for _ in $(seq 1 30); do
  grep -q "Registered tunnel connection" "$TUNNEL_LOG" && break
  sleep 1
done
grep -q "Registered tunnel connection" "$TUNNEL_LOG" \
  && echo "      연결 등록됨" \
  || echo "      주의: 연결 등록 로그를 못 찾았습니다. $TUNNEL_LOG 를 확인해 주세요."
# DNS 전파 여유를 준 뒤 가볍게 한두 번만 확인한다.
sleep 10
TUNNEL_READY=false
for _ in 1 2 3; do
  [ "$(curl -sS -o /dev/null -w '%{http_code}' "$TUNNEL_URL/" 2>/dev/null || true)" = "200" ] && { TUNNEL_READY=true; break; }
  sleep 10
done
$TUNNEL_READY || echo "      참고: 이 머신에서 아직 터널 주소가 안 열립니다. 보통 로컬 DNS 캐시 문제이며 휴대폰·다른 회선에서는 정상입니다."

# ------------------------------------------------------------
# 4. KV 갱신과 반영 확인
# ------------------------------------------------------------
echo ""
echo "[4/4] 고정 주소 KV 갱신"
( cd "$REDIRECT_DIR" && npx wrangler kv key put --binding=TUNNEL_CONFIG \
    CURRENT_TUNNEL_URL "$TUNNEL_URL" --remote >/dev/null )

# KV 는 최종 일관성이라 전파에 시간이 걸린다. 옛 주소를 안내하지 않도록 확인될 때까지 기다린다.
echo "      전파 대기..."
SYNCED=false
for _ in $(seq 1 24); do
  CURRENT="$(curl -sS "$WORKER_URL/__status" 2>/dev/null \
    | python3 -c 'import sys,json;print(json.load(sys.stdin).get("target",""))' 2>/dev/null || true)"
  [ "$CURRENT" = "$TUNNEL_URL" ] && { SYNCED=true; break; }
  sleep 5
done
$SYNCED && echo "      반영 완료" || echo "      주의: 아직 옛 주소가 보입니다. $WORKER_URL/__status 로 확인해 주세요."

echo ""
echo "=========================================="
echo " 공유 주소 (QR 은 이 주소로)"
echo "   $WORKER_URL"
echo ""
echo " 현재 터널 : $TUNNEL_URL"
echo " 로컬      : http://localhost:$TARGET_PORT"
echo " 로그      : $TUNNEL_LOG"
echo "=========================================="
echo ""
echo "Ctrl+C 로 이 스크립트가 띄운 것만 정리합니다."
wait "$TUNNEL_PID"
