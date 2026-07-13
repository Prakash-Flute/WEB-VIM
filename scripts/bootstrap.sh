#!/data/data/com.termux/files/usr/bin/bash
set -e

PROJECT="/storage/emulated/0/WEB-VIM"

echo "========================================="
echo "        ASTRO BOOTSTRAP"
echo "========================================="

cd "$PROJECT"

echo "[1/6] Fetching latest changes..."
git fetch --all

echo "[2/6] Pulling latest code..."
git pull --ff-only

if [ -f requirements.txt ]; then
    echo "[3/6] Installing Python requirements..."
    pip install -r requirements.txt
else
    echo "[3/6] No requirements.txt found. Skipping."
fi

echo "[4/6] Checking server..."

if [ ! -f server/app.py ]; then
    echo "server/app.py not found."
    exit 1
fi

echo "[5/6] Starting server..."

exec python3 server/app.py
