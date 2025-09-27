# Claude Code Status Line Integration

## Status Line Hook Data Structure

When Claude Code calls status line scripts, it provides the following JSON data structure via stdin:

```json
{
  "hook_event_name": "Status",
  "session_id": "abc123...",
  "transcript_path": "/path/to/transcript.json",
  "cwd": "/current/working/directory",
  "model": {
    "id": "claude-opus-4-1",
    "display_name": "Opus"
  },
  "workspace": {
    "current_dir": "/current/working/directory",
    "project_dir": "/original/project/directory"
  },
  "version": "1.0.80",
  "output_style": {
    "name": "default"
  },
  "cost": {
    "total_cost_usd": 0.01234,
    "total_duration_ms": 45000,
    "total_api_duration_ms": 2300,
    "total_lines_added": 156,
    "total_lines_removed": 23
  }
}
```

## Key Fields for Context Status

- **`transcript_path`**: Path to the JSONL transcript file containing conversation data
- **`model.display_name`**: Human-readable model name (e.g., "Opus", "Sonnet 4")
- **`model.id`**: Full model identifier (e.g., "claude-opus-4-1")
- **`cost`**: Usage metrics including duration and line counts

## Implementation Notes

Our status line script processes:
1. The `transcript_path` to read conversation history
2. The `model.display_name` for user-friendly model identification
3. Parses the JSONL transcript to extract token usage from the latest entry

## Official Documentation

For complete Claude Code status line documentation, see:
https://docs.claude.com/en/docs/claude-code/statusline.md