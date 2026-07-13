#!/data/data/com.termux/files/usr/bin/bash

set -e

echo "======================================"
echo "      ASTRO INSTALLER"
echo "======================================"

pkg update -y
pkg install -y git python nano curl

termux-setup-storage

mkdir -p ~/.local/bin

chmod +x /data/data/com.termux/files/usr/bin/astro 2>/dev/null || true
chmod +x /data/data/com.termux/files/usr/bin/u 2>/dev/null || true
chmod +x /data/data/com.termux/files/usr/bin/astro6 2>/dev/null || true

echo ""
echo "Installation Complete."
echo ""
echo "Commands:"
echo "astro"
echo "u astro"
echo "astro doctor"
echo ""
