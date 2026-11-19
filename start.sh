#!/usr/bin/env sh
# Agency PWA — تشغيل على ماك / لينكس:  ./start.sh
set -e
cd "$(dirname "$0")"
node scripts/build-data.mjs
exec node server.mjs
