#!/bin/bash
# Frontend only for WSL (شغّله في Terminal ثاني)
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/frontend"

if ! command -v node &>/dev/null; then
  echo "❌ node غير مثبت"
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "تثبيت frontend deps..."
  npm install
fi

echo "تشغيل Frontend على http://localhost:5173 ..."
npm run dev
