#!/usr/bin/env bash
set -euo pipefail
plugin_dir="$(cd "$(dirname "$0")/.." && pwd)"
nvim --headless -n -u NONE -i NONE \
  -l "$plugin_dir/test/highlight_spec.lua" "$plugin_dir"
