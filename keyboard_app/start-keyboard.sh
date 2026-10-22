#!/bin/sh
cd "$(dirname "$0")" || exit 1
if ! python3 -c "import pynput" 2>/dev/null; then
  python3 -m pip install --user -r requirements.txt || exit 1
fi
exec python3 app.py
