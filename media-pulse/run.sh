#!/bin/bash
# Media Pulse - Run Script (Docker)
# يحل مشكلة backend: No such file or directory عبر التأكد من المسار

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Media Pulse - Media Buying Intelligence ==="
echo "Dir: $SCRIPT_DIR"
echo "Supabase: https://rpbybnbrcyfrqjgqpkxi.supabase.co"
echo ""

if [ ! -d "backend" ]; then
  echo "❌ خطأ: مجلد backend غير موجود في $SCRIPT_DIR"
  echo "تأكد أنك تشغل من داخل media-pulse:"
  echo "  cd /home/safyeldin/.opencode/media-pulse && bash run.sh"
  exit 1
fi

if [ ! -f "backend/.env" ]; then
  echo "❌ backend/.env غير موجود!"
  exit 1
fi

if ! command -v docker &> /dev/null; then
  echo "❌ Docker غير مثبت. ثبته:"
  echo "  sudo apt update && sudo apt install -y docker.io docker-compose-plugin"
  exit 1
fi

# Try to start docker daemon if not running
if ! docker ps &>/dev/null; then
  echo "جاري تشغيل Docker daemon..."
  sudo service docker start 2>&1 || sudo systemctl start docker 2>&1 || echo "حاول: sudo dockerd &"
  sleep 3
fi

echo "✅ Backend موجود: $(ls -lh backend/main.py | awk '{print $9, $5}')"
echo "✅ Frontend موجود: $(ls -lh frontend/package.json | awk '{print $9, $5}')"
echo ""
echo "Building & Starting (قد يستغرق دقيقة أول مرة)..."
docker compose up --build
