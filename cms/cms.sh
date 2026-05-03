#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

PID_FILE=".cms.pid"
LOG_FILE="cms.log"
PORT="${PORT:-3000}"

is_running() {
  [[ -f "$PID_FILE" ]] || return 1
  local pid
  pid=$(cat "$PID_FILE")
  kill -0 "$pid" 2>/dev/null
}

start() {
  if is_running; then
    echo "Already running (pid $(cat "$PID_FILE")) on :$PORT"
    return 0
  fi
  rm -f "$PID_FILE"
  echo "Starting dev server on :$PORT..."
  nohup npm run dev >"$LOG_FILE" 2>&1 &
  echo $! >"$PID_FILE"
  for _ in $(seq 1 40); do
    if curl -s -o /dev/null "http://localhost:$PORT/admin"; then
      echo "Ready → http://localhost:$PORT/admin (pid $(cat "$PID_FILE"), logs: $LOG_FILE)"
      return 0
    fi
    sleep 0.5
  done
  echo "Server did not respond within 20s. Check $LOG_FILE"
  return 1
}

stop() {
  if ! is_running; then
    echo "Not running"
    # best-effort cleanup in case something's squatting the port
    lsof -ti:"$PORT" 2>/dev/null | xargs -r kill -TERM 2>/dev/null || true
    rm -f "$PID_FILE"
    return 0
  fi
  local pid
  pid=$(cat "$PID_FILE")
  echo "Stopping pid $pid..."
  pkill -TERM -P "$pid" 2>/dev/null || true
  kill -TERM "$pid" 2>/dev/null || true
  for _ in $(seq 1 20); do
    kill -0 "$pid" 2>/dev/null || break
    sleep 0.25
  done
  if kill -0 "$pid" 2>/dev/null; then
    echo "Force killing..."
    pkill -KILL -P "$pid" 2>/dev/null || true
    kill -KILL "$pid" 2>/dev/null || true
  fi
  lsof -ti:"$PORT" 2>/dev/null | xargs -r kill -KILL 2>/dev/null || true
  rm -f "$PID_FILE"
  echo "Stopped"
}

status() {
  if is_running; then
    echo "Running (pid $(cat "$PID_FILE")) on :$PORT"
  else
    echo "Not running"
    return 1
  fi
}

logs() {
  [[ -f "$LOG_FILE" ]] || { echo "No log file yet"; return 1; }
  tail -n 50 -f "$LOG_FILE"
}

case "${1:-}" in
  start)   start ;;
  stop)    stop ;;
  restart) stop; start ;;
  status)  status ;;
  logs)    logs ;;
  *)
    echo "Usage: $0 {start|stop|restart|status|logs}"
    exit 1
    ;;
esac
