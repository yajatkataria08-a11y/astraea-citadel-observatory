#!/usr/bin/env bash
# Creates a venv on first run, installs deps, starts the API on http://127.0.0.1:8000
set -e
cd "$(dirname "$0")/backend"
[ -d .venv ] || python3 -m venv .venv
. .venv/bin/activate
pip install -q -r requirements.txt
python run.py
