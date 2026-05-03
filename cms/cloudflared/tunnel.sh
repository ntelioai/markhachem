#!/usr/bin/env bash
set -euo pipefail

TUNNEL_NAME="mark-hachem"
HOSTNAME="mh.ntelio.ai"
CONFIG_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_FILE="$CONFIG_DIR/config.yml"
CREDS_FILE="$HOME/.cloudflared/${TUNNEL_NAME}.json"
PID_FILE="$CONFIG_DIR/cloudflared.pid"
LOG_FILE="$CONFIG_DIR/cloudflared.log"

ensure_installed() {
  if ! command -v cloudflared &>/dev/null; then
    echo "Error: cloudflared is not installed. Run: brew install cloudflared"
    exit 1
  fi
}

ensure_tunnel() {
  if [[ ! -f "$CREDS_FILE" ]]; then
    echo "Credentials file not found at $CREDS_FILE"
    echo "Setting up tunnel..."

    # Delete stale tunnel if it exists without credentials
    if cloudflared tunnel list 2>/dev/null | grep -q "$TUNNEL_NAME"; then
      echo "Removing stale tunnel '$TUNNEL_NAME'..."
      cloudflared tunnel delete "$TUNNEL_NAME" 2>/dev/null || true
    fi

    echo "Creating tunnel '$TUNNEL_NAME'..."
    cloudflared tunnel create "$TUNNEL_NAME"

    # cloudflared creates creds as <UUID>.json — symlink to our expected name
    TUNNEL_ID=$(cloudflared tunnel list 2>/dev/null | grep "$TUNNEL_NAME" | awk '{print $1}')
    UUID_CREDS="$HOME/.cloudflared/${TUNNEL_ID}.json"
    if [[ -f "$UUID_CREDS" && ! -f "$CREDS_FILE" ]]; then
      ln -s "$UUID_CREDS" "$CREDS_FILE"
    fi

    echo "Routing DNS: $HOSTNAME -> $TUNNEL_NAME"
    cloudflared tunnel route dns "$TUNNEL_NAME" "$HOSTNAME"
    echo "Tunnel setup complete."
  fi
}

start() {
  ensure_installed
  ensure_tunnel

  if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "Tunnel is already running (PID $(cat "$PID_FILE"))"
    exit 0
  fi

  echo "Starting tunnel..."
  nohup cloudflared tunnel --config "$CONFIG_FILE" run "$TUNNEL_NAME" \
    > "$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"
  echo "Tunnel started (PID $!). Logs: $LOG_FILE"
}

stop() {
  if [[ ! -f "$PID_FILE" ]]; then
    echo "Tunnel is not running (no PID file)"
    exit 0
  fi

  PID=$(cat "$PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    echo "Stopping tunnel (PID $PID)..."
    kill "$PID"
    rm -f "$PID_FILE"
    echo "Tunnel stopped."
  else
    echo "Tunnel process $PID is not running. Cleaning up PID file."
    rm -f "$PID_FILE"
  fi
}

status() {
  ensure_installed

  echo "=== Tunnel Info ==="
  cloudflared tunnel info "$TUNNEL_NAME" 2>&1 || echo "Tunnel '$TUNNEL_NAME' not found."

  echo ""
  if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "Local process: running (PID $(cat "$PID_FILE"))"
  else
    echo "Local process: not running"
    rm -f "$PID_FILE" 2>/dev/null
  fi

  echo ""
  echo "Credentials: $([ -f "$CREDS_FILE" ] && echo "OK ($CREDS_FILE)" || echo "MISSING")"
  echo "Config:      $CONFIG_FILE"
}

logs() {
  if [[ -f "$LOG_FILE" ]]; then
    tail -f "$LOG_FILE"
  else
    echo "No log file found at $LOG_FILE"
  fi
}

restart() {
  stop
  sleep 1
  start
}

case "${1:-help}" in
  start)   start   ;;
  stop)    stop    ;;
  restart) restart ;;
  status)  status  ;;
  logs)    logs    ;;
  setup)   ensure_installed; ensure_tunnel ;;
  *)
    echo "Usage: $0 {start|stop|restart|status|logs|setup}"
    echo ""
    echo "  start    Start the Cloudflare tunnel in the background"
    echo "  stop     Stop the running tunnel"
    echo "  restart  Restart the tunnel"
    echo "  status   Show tunnel and process status"
    echo "  logs     Tail the tunnel log file"
    echo "  setup    Create tunnel and DNS route (run once)"
    ;;
esac
