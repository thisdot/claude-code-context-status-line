# Claude Code Context Status Line for AWS Bedrock Users

A minimal, self-contained JavaScript script for displaying context window usage in Claude Code's status line. **Specifically designed for AWS Bedrock users who have lost access to the `/context` command** in Claude Code and need to restore visibility into their context window usage.

## What It Does

Displays your current context window usage in a clean, minimal format directly in your status line:

```
Context: 125.4k
```

## Installation

### Method 1: NPX (Recommended)

Add this to your Claude Code settings to use the package directly:

```json
{
  "statusLine": {
    "type": "command",
    "command": "npx @thisdot/claude-code-context-status-line"
  }
}
```

This runs the script directly from npm each time without creating local files.

### Method 2: Manual Installation

1. Download the script directly:

```bash
curl -o context-status.js https://raw.githubusercontent.com/thisdot/claude-code-context-status-line/main/src/context-status.js
```

2. Add to your `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "node /full/path/to/src/context-status.js"
  }
}
```

## Requirements

- **Node.js**: Version 18 or higher (same as Claude Code)
- **Claude Code**: Any version supporting status line configuration

## License

MIT License - see [LICENSE](LICENSE) file for details.
