"""Generate summaries of sessions and coding activity."""

from datetime import datetime
from typing import Any, Dict, List, Optional

from . import storage


def summarize_session(session: Dict[str, Any]) -> str:
    """Generate a human-readable summary of a session."""
    started = session.get("started_at", "unknown")
    ended = session.get("ended_at", "unknown")
    branch = session.get("git_branch", "unknown")
    todos = session.get("todos", [])
    activities = session.get("activities", [])

    done_count = sum(1 for t in todos if t["status"] == "done")
    total_count = len(todos)

    lines = [
        f"Session on branch '{branch}'",
        f"Started: {started}",
        f"Ended: {ended}",
        f"TODOs: {done_count}/{total_count} completed",
        f"Activities: {len(activities)} logged",
    ]

    if activities:
        lines.append("\nKey activities:")
        for act in activities[-5:]:
            lines.append(f"  - [{act['type']}] {act['description']}")

    open_todos = [t for t in todos if t["status"] == "active"]
    if open_todos:
        lines.append("\nOpen TODOs:")
        for t in open_todos:
            lines.append(f"  - {t['text']}")

    return "\n".join(lines)


def resume_summary(project_path: Optional[str] = None) -> str:
    """Generate a 'resume from here' summary for the developer."""
    sessions = storage.list_sessions(project_path)[:3]
    if not sessions:
        return "No previous sessions found. Start one with 'memory start'."

    lines = ["=" * 50, "  RESUME FROM HERE", "=" * 50, ""]

    # Current git state
    from . import git_tracker
    resolved_path = project_path or "."
    if git_tracker.is_git_repo(resolved_path):
        branch = git_tracker.current_branch(resolved_path)
        commit = git_tracker.current_commit(resolved_path)
        lines.append(f"Current branch: {branch}")
        lines.append(f"Current commit: {commit}")
        changes = git_tracker.uncommitted_changes(resolved_path)
        if changes:
            lines.append(f"Uncommitted changes: {len(changes)} files")
        lines.append("")

    # Last session
    last = sessions[0]
    lines.append(f"Last session: {last['id'][:8]} on '{last.get('git_branch', 'unknown')}'")
    lines.append(f"Started: {last['started_at']}")
    if last.get("ended_at"):
        lines.append(f"Ended: {last['ended_at']}")
    else:
        lines.append("Status: STILL ACTIVE")
    lines.append("")

    # Open TODOs from last session
    todos = last.get("todos", [])
    open_todos = [t for t in todos if t["status"] == "active"]
    if open_todos:
        lines.append(f"Open TODOs from last session ({len(open_todos)}):")
        for t in open_todos:
            lines.append(f"  - [{t['id']}] {t['text']}")
        lines.append("")

    # Recent sessions overview
    if len(sessions) > 1:
        lines.append("Recent sessions:")
        for s in sessions[1:]:
            status = "active" if not s.get("ended_at") else "done"
            lines.append(f"  - {s['id'][:8]} [{status}] {s.get('git_branch', 'unknown')} — {s.get('started_at', '')[:10]}")
        lines.append("")

    lines.append("Commands:")
    lines.append("  memory start    — begin a new session")
    lines.append("  memory stop     — end current session")
    lines.append("  memory todo add 'task' — add a TODO")
    lines.append("  memory status   — show current session")

    return "\n".join(lines)
