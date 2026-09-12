#!/bin/bash
# Media Pulse - WSL Native Run (بدون Docker)
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== Media Pulse - WSL Native (بدون Docker) ==="
echo "Dir: $SCRIPT_DIR"
echo ""

# 1. Check Python
if ! command -v python3 &>/dev/null; then
  echo "❌ python3 غير مثبت. ثبته:"
  echo "  sudo apt update && sudo apt install -y python3 python3-pip python3-venv"
  exit 1
fi
echo "✅ python3: $(python3 --version)"

# 2. Check pip
if ! python3 -m pip --version &>/dev/null; then
  echo "⚠️ pip غير مثبت، جاري التثبيت..."
  sudo apt update && sudo apt install -y python3-pip python3-venv
fi
echo "✅ pip: $(python3 -m pip --version | head -n1)"

# 3. Check Node
if ! command -v node &>/dev/null; then
  echo "⚠️ Node غير مثبت، جاري التثبيت..."
  sudo apt update && sudo apt install -y nodejs npm
  # For Ubuntu 26.04, nodejs may be old, try nodesource if needed
  if ! command -v node &>/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs
  fi
fi
echo "✅ node: $(node --version)"
echo "✅ npm: $(npm --version)"

# 4. Backend venv
echo ""
echo "--- Backend Setup ---"
cd "$SCRIPT_DIR/backend"
if [ ! -d "venv" ]; then
  echo "إنشاء venv..."
  python3 -m venv venv
fi
source venv/bin/activate
echo "تثبيت requirements..."
pip install -q -r requirements.txt
echo "✅ Backend deps installed"

# Test Supabase connection (optional)
if grep -q "postgresql" .env; then
  echo "اختبار اتصال Supabase..."
  python test_supabase.py 2>&1 | head -n 20 || echo "⚠️ فشل اختبار Supabase (سيعمل fallback على SQLite)"
fi

echo ""
echo "تشغيل Backend على http://localhost:8000/docs ..."
echo "في Terminal جديد شغّل:"
echo "  cd $SCRIPT_DIR/frontend && npm install && npm run dev"
echo ""
echo "ثم افتح: http://localhost:5173  Login: admin1 / Admin123!"
echo ""
# Run backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
