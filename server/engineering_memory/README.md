# Engineering Memory System

Automatically track and restore engineering context across coding sessions.

## Features

- **Session Tracking** — Start/stop work sessions with automatic git state capture
- **TODO Management** — Keep track of tasks within each session
- **Git Integration** — Tracks branch, commits, uncommitted changes, unpushed commits
- **Unfinished Work Detection** — Automatically detects open TODOs, uncommitted changes, and unpushed commits
- **Resume Summaries** — Generate "resume from here" summaries to quickly get back into context

## Quick Start

```bash
# Start a work session
python3 memory_cli.py start

# Add TODOs
python3 memory_cli.py todo add "Implement user authentication"
python3 memory_cli.py todo add "Write tests for API endpoints"

# Check status
python3 memory_cli.py status

# End session (generates summary)
python3 memory_cli.py stop

# Resume from where you left off
python3 memory_cli.py resume

# Detect unfinished work
python3 memory_cli.py detect
```

## Commands

| Command | Description |
|---------|-------------|
| `start` | Begin a new work session |
| `stop` | End current session with summary |
| `status` | Show active session status |
| `resume` | Show resume-from-here summary |
| `todo add <text>` | Add a TODO to active session |
| `todo list` | List all TODOs |
| `todo done <id>` | Mark TODO as done |
| `todo cancel <id>` | Cancel a TODO |
| `detect` | Detect unfinished work |
| `log` | Show session history |

## Installation

```bash
# Add alias to your shell profile (optional)
echo 'alias memory="python3 /path/to/engineering_memory/memory_cli.py"' >> ~/.bashrc
```

## Data Storage

Sessions are stored as JSON files:
- Global: `~/.engineering_memory/session_<uuid>.json`
- Project-local: `<project>/.memory/session_<uuid>.json`

## Architecture

See `ARCHITECTURE.md` for design decisions and data model.
