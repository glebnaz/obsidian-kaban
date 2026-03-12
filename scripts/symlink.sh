#!/bin/bash
# Creates a symlink from the plugin build output to an Obsidian vault's plugins directory.
# Usage: ./scripts/symlink.sh /path/to/your/vault
#
# After running, enable "Kanban Board" in Obsidian Settings > Community Plugins.

set -e

VAULT_PATH="${1:?Usage: $0 /path/to/your/vault}"
PLUGIN_DIR="$VAULT_PATH/.obsidian/plugins/kanban-board"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

if [ -e "$PLUGIN_DIR" ]; then
  echo "Plugin directory already exists at $PLUGIN_DIR"
  echo "Remove it first if you want to re-link."
  exit 1
fi

mkdir -p "$(dirname "$PLUGIN_DIR")"
ln -s "$PROJECT_DIR" "$PLUGIN_DIR"
echo "Symlinked $PROJECT_DIR -> $PLUGIN_DIR"
echo "Build the plugin with 'npm run build' then enable it in Obsidian."
