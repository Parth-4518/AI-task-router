"""Detect unfinished work across sessions and git state."""

from typing import Any, Dict, List, Optional

from . import git_tracker, storage


def detect_unfinished(project_path: Optional[str] = None) -> Dict[str, Any]:
    """Detect all unfinished work in the current project."""
    resolved_path = project_path or "."
    result = {
        "has_unfinished_work": False,
        "open_todos": [],
        "uncommitted_changes": [],
        "unpushed_commits": [],
        "active_session": None,
        "recommendations": [],
    }

    # Check active session
    active = storage.get_active_session(resolved_path)
    if active:
        result["active_session"] = {
            "id": active["id"][:8],
            "started_at": active["started_at"],
            "branch": active.get("git_branch"),
        }
        open_todos = [t for t in active.get("todos", []) if t["status"] == "active"]
        if open_todos:
            result["open_todos"] = open_todos
            result["has_unfinished_work"] = True

    # Check git state
    if git_tracker.is_git_repo(resolved_path):
        changes = git_tracker.uncommitted_changes(resolved_path)
        if changes:
            result["uncommitted_changes"] = changes
            result["has_unfinished_work"] = True

        branch = git_tracker.current_branch(resolved_path)
        if branch:
            unpushed = git_tracker.unpushed_commits(resolved_path, branch)
            if unpushed:
                result["unpushed_commits"] = unpushed
                result["has_unfinished_work"] = True

    # Generate recommendations
    recs = result["recommendations"]
    if result["uncommitted_changes"]:
        recs.append("You have uncommitted changes. Consider committing or stashing before switching tasks.")
    if result["unpushed_commits"]:
        recs.append(f"You have {len(result['unpushed_commits'])} unpushed commits. Push when ready.")
    if result["open_todos"]:
        recs.append(f"You have {len(result['open_todos'])} open TODOs in your active session.")
    if not result["has_unfinished_work"]:
        recs.append("No unfinished work detected. You're all clear!")

    return result
